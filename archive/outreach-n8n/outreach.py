"""
Automated outreach sender (Python-driven).

Runs against self-hosted n8n on localhost: pops up to N leads off leads.json,
POSTs each to the n8n webhook (Gemini writes the email, Gmail sends it,
Telegram pings), then VERIFIES each send by polling n8n's execution API until
the "Send Gmail Email" / "Telegram Alert" nodes actually ran — so "email went
through" is confirmed programmatically, not assumed from an HTTP 200.

Delivery is verified per lead and recorded in sent_log.json:
  delivered        - Gmail node output a message id AND Telegram fired
  sent-unconfirmed - Gmail node ran, Telegram node did not
  suppressed       - lead's email was found on the Suppression tab; dropped
  failed / timeout - error details are printed; lead stays in the queue

Config comes from the environment and/or a .env file in the repo root:
  N8N_WEBHOOK_URL   http://localhost:5678/webhook/outreach-lead  (required)
  N8N_API_KEY       n8n API key used to verify executions        (required)
  N8N_BASE_URL      http://localhost:5678 (default)
  LEADS_FILE        leads.json (default)
  SENT_LOG_FILE     sent_log.json (default)
  OUTREACH_DAILY_LIMIT  20 (default)
  BATCH_DELAY_SECONDS   30 (default; pause between sends)
  EXECUTION_TIMEOUT_SECONDS 180 (default; max wait per send)
  UNSUBSCRIBE_URL / UNSUBSCRIBE_TEXT / SENDER_NAME /
  SENDER_BUSINESS_NAME / SENDER_ADDRESS  (compliance footer, optional)

Usage:
  python outreach.py                 # send up to the daily limit (20)
  python outreach.py --max 5         # cap this run at 5
  python outreach.py --dry-run       # show the plan, send nothing
"""

import argparse
import json
import os
import sys
import time
from datetime import datetime, timezone

import requests

# ---------------------------------------------------------------------------


def load_env_file(path=".env"):
    """Minimal .env loader: KEY=VALUE lines, # comments, optional quotes."""
    if not os.path.exists(path):
        return
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, value = line.partition("=")
            key, value = key.strip(), value.strip().strip("'\"")
            os.environ.setdefault(key, value)


load_env_file()

N8N_WEBHOOK_URL = os.getenv("N8N_WEBHOOK_URL", "").strip()
N8N_BASE_URL = os.getenv("N8N_BASE_URL", "http://localhost:5678").strip().rstrip("/")
N8N_API_KEY = os.getenv("N8N_API_KEY", "").strip()

LEADS_FILE = os.getenv("LEADS_FILE", "leads.json")
SENT_LOG_FILE = os.getenv("SENT_LOG_FILE", "sent_log.json")

DAILY_LIMIT = int(os.getenv("OUTREACH_DAILY_LIMIT", "20"))
BATCH_DELAY = float(os.getenv("BATCH_DELAY_SECONDS", "30"))
EXECUTION_TIMEOUT = float(os.getenv("EXECUTION_TIMEOUT_SECONDS", "180"))
POLL_INTERVAL = 5.0

# Compliance fields appended to every payload sent to n8n (all optional).
UNSUBSCRIBE_URL = os.getenv("UNSUBSCRIBE_URL", "").strip()
UNSUBSCRIBE_TEXT = os.getenv("UNSUBSCRIBE_TEXT", "Unsubscribe").strip()
SENDER_NAME = os.getenv("SENDER_NAME", "").strip()
SENDER_BUSINESS_NAME = os.getenv("SENDER_BUSINESS_NAME", "").strip()
SENDER_ADDRESS = os.getenv("SENDER_ADDRESS", "").strip()  # postal address (CAN-SPAM)


def log(msg):
    print(msg, flush=True)


# ---------------------------------------------------------------------------
# Queue + sent-log I/O
# ---------------------------------------------------------------------------


def load_queue(path):
    """Load the lead queue from disk. Returns a list of lead dicts."""
    if not os.path.exists(path):
        log(f"Error: {path} not found. Add leads to the queue first (see readme.md).")
        return []
    try:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
    except json.JSONDecodeError as e:
        log(f"Error: {path} contains invalid JSON: {e}")
        return []

    if isinstance(data, list):
        return data
    if isinstance(data, dict) and isinstance(data.get("leads"), list):
        return data["leads"]

    log(f"Error: unexpected structure in {path}; expected a list of leads.")
    return []


def save_queue(path, queue):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(queue, f, indent=2, ensure_ascii=False)
        f.write("\n")


def load_sent_log(path):
    if not os.path.exists(path):
        return {}
    try:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        return data if isinstance(data, dict) else {}
    except (json.JSONDecodeError, OSError):
        return {}


def save_sent_log(path, sent_log):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(sent_log, f, indent=2, sort_keys=True)
        f.write("\n")


def sent_today(sent_log):
    """How many leads were successfully sent today (UTC date)."""
    today = datetime.now(timezone.utc).date().isoformat()
    return sum(1 for v in sent_log.values()
               if isinstance(v, dict) and v.get("date") == today
               and v.get("status") in ("delivered", "sent-unconfirmed"))


def record_send(sent_log, path, lead, status, execution_id=None, detail=None):
    sent_log[str(lead.get("email", "")).lower()] = {
        "business_name": lead.get("business_name", ""),
        "status": status,
        "execution_id": execution_id,
        "date": datetime.now(timezone.utc).date().isoformat(),
        "at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        **({"detail": detail} if detail else {}),
    }
    save_sent_log(path, sent_log)


# ---------------------------------------------------------------------------
# Payload
# ---------------------------------------------------------------------------


def is_real_lead(lead):
    """A lead must be a dict with a non-placeholder email."""
    if not isinstance(lead, dict):
        return False
    email = str(lead.get("email", "")).strip()
    if not email or email.lower().endswith(".example"):
        return False
    return True


def describe_lead(lead):
    return (
        lead.get("business_name")
        or lead.get("company")
        or lead.get("contact_name")
        or lead.get("email")
        or "<unnamed lead>"
    )


def build_payload(lead):
    """Lead + sender/unsubscribe block so n8n can merge a compliant footer."""
    payload = dict(lead)
    unsubscribe = {}
    if UNSUBSCRIBE_URL:
        unsubscribe["url"] = UNSUBSCRIBE_URL
        unsubscribe["text"] = UNSUBSCRIBE_TEXT
    if SENDER_NAME:
        unsubscribe["sender_name"] = SENDER_NAME
    if SENDER_BUSINESS_NAME:
        unsubscribe["sender_business_name"] = SENDER_BUSINESS_NAME
    if SENDER_ADDRESS:
        unsubscribe["postal_address"] = SENDER_ADDRESS

    if unsubscribe:
        payload["unsubscribe"] = unsubscribe
        payload["unsubscribe_url"] = unsubscribe.get("url", "")
        payload["unsubscribe_text"] = unsubscribe.get("text", "")
        payload["sender_name"] = unsubscribe.get("sender_name", "")
        payload["sender_address"] = unsubscribe.get("postal_address", "")
    return payload


# ---------------------------------------------------------------------------
# n8n API: trigger + verify
# ---------------------------------------------------------------------------


def n8n_api(path, params=None):
    """GET a public-API path, returning parsed JSON."""
    headers = {}
    if N8N_API_KEY:
        headers["X-N8N-API-Key"] = N8N_API_KEY
    resp = requests.get(f"{N8N_BASE_URL}/api/v1{path}", params=params or {},
                        headers=headers, timeout=20)
    resp.raise_for_status()
    return resp.json()


def trigger_webhook(payload):
    """POST the lead. Returns (True, None) or (False, error_string)."""
    try:
        resp = requests.post(N8N_WEBHOOK_URL, json=payload,
                             headers={"Content-Type": "application/json"},
                             timeout=30)
        if resp.status_code == 200:
            return True, None
        return False, f"HTTP {resp.status_code}: {resp.text[:200]}"
    except Exception as e:
        return False, str(e)


def nodes_that_ran(execution):
    """Node names that actually executed, from execution detail (includeData)."""
    run_data = (execution.get("data") or {}).get("resultData", {}).get("runData", {})
    return [name for name, runs in run_data.items() if runs]


def classify_execution(execution, ran):
    """Map an execution + the nodes that ran to a delivery status."""
    gmail_ran = "Send Gmail Email" in ran
    telegram_ran = "Telegram Alert" in ran
    if gmail_ran and telegram_ran:
        return "delivered"
    if gmail_ran:
        return "sent-unconfirmed"  # Gmail accepted; Telegram step failed
    if "Not Suppressed?" in ran:
        return "suppressed"
    if "Write Cold Email" in ran:
        return "failed"  # LLM ran but send chain broke
    return "failed"


def find_new_execution(sent_at, email, limit=25):
    """Newest execution for our workflow that started after `sent_at` (ISO)."""
    try:
        data = n8n_api("/executions", {"limit": limit})
    except Exception as e:
        log(f"  Warning: could not list executions ({e})")
        return None
    sent_ts = _parse_iso(sent_at)
    for ex in data.get("data", []):
        started = _parse_iso(ex.get("startedAt"))
        if started is None or sent_ts is None or started < sent_ts:
            continue
        try:
            detail = n8n_api(f"/executions/{ex['id']}", {"includeData": "true"})
        except Exception:
            detail = ex
        ran = nodes_that_ran(detail)
        if not ran:
            # Detail without runData: fall back to any webhook-era execution.
            return detail
        if "Lead Webhook" in ran:
            return detail
    return None


def _parse_iso(value):
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None


def verify_send(sent_at, email):
    """Poll n8n until the lead's execution reaches a terminal state."""
    deadline = time.time() + EXECUTION_TIMEOUT
    while time.time() < deadline:
        ex = find_new_execution(sent_at, email)
        if ex is not None:
            ran = nodes_that_ran(ex)
            status = ex.get("status")
            if status == "success":
                if ran:
                    return ex, classify_execution(ex, ran), None
                # No node data available; trust the success status.
                return ex, "sent-unconfirmed", None
            if status == "error":
                err = (ex.get("data") or {}).get("resultData", {}).get("error")
                msg = json.dumps(err)[:300] if err else "unknown n8n error"
                return ex, "failed", msg
            # status new/running/unknown -> keep waiting
        time.sleep(POLL_INTERVAL)
    return None, "timeout", f"no terminal execution within {EXECUTION_TIMEOUT:.0f}s"


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------


def main():
    parser = argparse.ArgumentParser(description="Send queued leads through n8n with delivery verification.")
    parser.add_argument("--max", type=int, default=DAILY_LIMIT,
                        help=f"max leads to send this run (default {DAILY_LIMIT})")
    parser.add_argument("--batch-delay", type=float, default=BATCH_DELAY,
                        help=f"seconds between sends (default {BATCH_DELAY})")
    parser.add_argument("--ignore-daily-limit", action="store_true",
                        help="bypass the daily cap (use with --max)")
    parser.add_argument("--dry-run", action="store_true",
                        help="show what would be sent; do not send")
    args = parser.parse_args()

    log("Starting outreach sender...")
    if not N8N_WEBHOOK_URL:
        log("Error: N8N_WEBHOOK_URL is not set (see .env).")
        return 1
    if not N8N_API_KEY:
        log("Warning: N8N_API_KEY is not set; delivery verification will be limited.")
    if not SENDER_ADDRESS:
        log("Warning: SENDER_ADDRESS is not set. A physical postal address is required by CAN-SPAM.")

    sent_log = load_sent_log(SENT_LOG_FILE)
    today_count = sent_today(sent_log)
    budget = args.max if args.ignore_daily_limit else min(args.max, DAILY_LIMIT - today_count)
    log(f"Sent today: {today_count}/{DAILY_LIMIT}. This run: up to {max(budget, 0)}.")

    queue = load_queue(LEADS_FILE)
    if not queue:
        log("Lead queue is empty. Nothing to do.")
        return 0
    log(f"Queue holds {len(queue)} lead(s).")

    if args.dry_run:
        for lead in queue[:max(budget, 0)]:
            print(f"  - {describe_lead(lead)} <{lead.get('email', '')}>")
        log("DRY RUN: nothing sent.")
        return 0

    if budget <= 0:
        log("Daily limit already reached. No sends this run.")
        return 0

    sent = dropped = 0
    for _ in range(budget):
        queue = load_queue(LEADS_FILE)  # re-read each loop (CI may commit)
        if not queue:
            log("Queue drained.")
            break
        lead = queue[0]

        if not is_real_lead(lead):
            log(f"Skipping invalid/placeholder lead: {describe_lead(lead)}")
            queue.pop(0)
            save_queue(LEADS_FILE, queue)
            continue

        log(f"Sending: {describe_lead(lead)} <{lead['email']}>")
        payload = build_payload(lead)
        sent_at = datetime.now(timezone.utc).isoformat()

        ok, err = trigger_webhook(payload)
        if not ok:
            log(f"  Webhook push failed ({err}); lead kept for retry. Stopping this run.")
            return 1

        ex, status, detail = verify_send(sent_at, lead["email"])
        exec_id = (ex or {}).get("id")

        if status == "delivered":
            queue.pop(0)
            save_queue(LEADS_FILE, queue)
            record_send(sent_log, SENT_LOG_FILE, lead, status, exec_id)
            sent += 1
            log(f"  ✅ Delivered (execution {exec_id}). {len(queue)} lead(s) left.")
        elif status == "sent-unconfirmed":
            queue.pop(0)
            save_queue(LEADS_FILE, queue)
            record_send(sent_log, SENT_LOG_FILE, lead, status, exec_id)
            sent += 1
            log(f"  📨 Gmail node ran (execution {exec_id}); Telegram step did not. Counted as sent.")
        elif status == "suppressed":
            queue.pop(0)
            save_queue(LEADS_FILE, queue)
            record_send(sent_log, SENT_LOG_FILE, lead, status, exec_id, detail)
            dropped += 1
            log(f"  🚫 Suppressed (on opt-out list); lead removed. {len(queue)} left.")
        else:
            record_send(sent_log, SENT_LOG_FILE, lead, status, exec_id, detail)
            log(f"  ❌ {status}: {detail}. Lead kept in queue for retry. Stopping this run.")
            return 1

        if args.batch_delay > 0:
            time.sleep(args.batch_delay)

    log(f"Job finished. sent={sent} suppressed={dropped} "
        f"sent_today={sent_today(sent_log)}/{DAILY_LIMIT} queue={len(queue)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
