"""Send one templated cold email per run through the Gmail API.

No Make.com, no n8n. The lead comes from leads.json, the body from
templates/, and the compliance footer is appended here so it can never be
forgotten by a template.
"""

from __future__ import annotations

import base64
import hashlib
import html
import json
import os
import sys
from datetime import datetime, timezone
from email.message import EmailMessage
from email.utils import formataddr
from pathlib import Path
from urllib.parse import urlencode

ROOT = Path(__file__).resolve().parent
LEADS_FILE = Path(os.getenv("LEADS_FILE", ROOT / "leads.json"))
SUPPRESSIONS_FILE = Path(os.getenv("SUPPRESSIONS_FILE", ROOT / "suppressions.json"))
SENT_FILE = Path(os.getenv("SENT_FILE", ROOT / "sent.json"))
TEMPLATES = ROOT / "templates"

GMAIL_SENDER = os.getenv("GMAIL_SENDER", "").strip() or os.getenv("SENDER_EMAIL", "").strip()
GMAIL_FROM_NAME = os.getenv("GMAIL_FROM_NAME", "").strip() or os.getenv("SENDER_NAME", "").strip()
GMAIL_CLIENT_ID = os.getenv("GMAIL_CLIENT_ID", "").strip()
GMAIL_CLIENT_SECRET = os.getenv("GMAIL_CLIENT_SECRET", "").strip()
GMAIL_REFRESH_TOKEN = os.getenv("GMAIL_REFRESH_TOKEN", "").strip()

SENDER_NAME = os.getenv("SENDER_NAME", GMAIL_FROM_NAME).strip()
SENDER_BUSINESS_NAME = os.getenv("SENDER_BUSINESS_NAME", "inodepi").strip()
SENDER_ADDRESS = os.getenv(
    "SENDER_ADDRESS",
    "480 Rubyville St, Baesa, Caloocan City, Philippines",
).strip()
SENDER_URL = os.getenv("SENDER_URL", "https://inodepi.github.io").strip()
UNSUBSCRIBE_EMAIL = os.getenv("UNSUBSCRIBE_EMAIL", "kristiandyanbusiness@gmail.com").strip()
UNSUBSCRIBE_URL = os.getenv(
    "UNSUBSCRIBE_URL", f"mailto:{UNSUBSCRIBE_EMAIL}?subject=unsubscribe"
).strip()
UNSUBSCRIBE_TEXT = os.getenv("UNSUBSCRIBE_TEXT", "Unsubscribe").strip()

SCOPES = ["https://www.googleapis.com/auth/gmail.send"]

# ePrivacy/GDPR countries where prior opt-in is normally required for email
# marketing. Scraped leads never carry consent, so they are skipped here.
CONSENT_REQUIRED = {
    "germany", "austria", "italy", "spain", "portugal", "poland",
    "belgium", "greece", "croatia", "cyprus", "czechia", "hungary",
    "lithuania", "luxembourg", "malta", "romania", "slovakia", "slovenia",
    "bulgaria", "estonia", "latvia",
}

FOOTER_TEXT = """--
{sender_name}
Automation & web development — {sender_url}

This is a commercial outreach message about automation services. You are receiving it because {source_line} and your work looked relevant. It is not a newsletter and there is no list to manage: reply with "unsubscribe" in the subject line, or write to {unsubscribe_url}, and you will not be contacted again.

{sender_address}
"""

FOOTER_HTML = """<hr style="border:0;border-top:1px solid #ddd;margin:22px 0 14px;">
<div style="font-family:Arial,sans-serif;font-size:12px;line-height:1.6;color:#6b6455;">
<p style="margin:0 0 6px;"><strong>{sender_name}</strong> · Automation &amp; web development · <a href="{sender_url}" style="color:#b45309;">{sender_url}</a></p>
<p style="margin:0 0 6px;">This is a commercial outreach message about automation services. You are receiving it because {source_line} and your work looked relevant. It is not a newsletter and there is no list to manage: reply with “unsubscribe” in the subject line, or <a href="{unsubscribe_url}" style="color:#b45309;">{unsubscribe_text}</a>, and you will not be contacted again.</p>
<p style="margin:0;">{sender_address}</p>
</div>
"""


def load_json(path: Path, default):
    if not path.exists():
        return default
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return default


def save_json(path: Path, data) -> None:
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def load_queue() -> list:
    data = load_json(LEADS_FILE, [])
    if isinstance(data, list):
        return data
    if isinstance(data, dict) and isinstance(data.get("leads"), list):
        return data["leads"]
    return []


def save_queue(queue: list) -> None:
    save_json(LEADS_FILE, queue)


def suppression_list() -> set[str]:
    data = load_json(SUPPRESSIONS_FILE, [])
    if isinstance(data, dict):
        data = data.get("emails", [])
    return {str(e).strip().lower() for e in data if e}


def unsubscribe_link(email: str) -> str:
    """A mailto link is the opt-out: the Action polls the inbox and processes it."""
    if not UNSUBSCRIBE_URL:
        return ""
    if UNSUBSCRIBE_URL.lower().startswith("mailto:"):
        joiner = "&" if "?" in UNSUBSCRIBE_URL else "?"
        params = urlencode({"subject": "unsubscribe", "body": f"Unsubscribe {email}"})
        return UNSUBSCRIBE_URL.split("?")[0] + "?" + params
    joiner = "&" if "?" in UNSUBSCRIBE_URL else "?"
    return UNSUBSCRIBE_URL + joiner + urlencode({"email": email})


def first_name(lead: dict) -> str:
    name = str(lead.get("contact_name", "")).strip()
    if not name or name.lower() in {"owner", "founder", "team"}:
        return "there"
    return name.split()[0]


def pick_template(lead: dict) -> str:
    signal = str(lead.get("signal", "")).lower()
    mapping = {
        "hiring": "startup_ops.txt",
        "launch": "startup_launch.txt",
        "spreadsheet": "startup_spreadsheet.txt",
    }
    return mapping.get(signal, "startup_ops.txt")


def render_body(lead: dict) -> tuple[str, str]:
    template_name = pick_template(lead)
    raw = (TEMPLATES / template_name).read_text(encoding="utf-8")
    values = {
        "first_name": first_name(lead),
        "business_name": lead.get("business_name") or lead.get("company") or "your team",
        "one_liner": lead.get("one_liner") or lead.get("niche") or "your product",
        "website": lead.get("website") or "",
    }
    for key, value in values.items():
        raw = raw.replace("{{" + key + "}}", str(value))

    body = raw.strip()
    link = unsubscribe_link(str(lead.get("email", "")))
    source_line = (
        f"your business publishes a contact address at {values['website']}"
        if values["website"]
        else "your business publishes a public contact address"
    )
    footer_text = FOOTER_TEXT.format(
        sender_name=SENDER_NAME,
        sender_url=SENDER_URL,
        source_line=source_line,
        unsubscribe_url=UNSUBSCRIBE_EMAIL or link or "this email address",
        sender_address=SENDER_ADDRESS,
    )
    text = body + "\n\n" + footer_text

    paragraphs = "".join(
        f"<p>{html.escape(p).replace(chr(10), '<br>')}</p>" for p in body.split("\n\n") if p.strip()
    )
    footer_html = FOOTER_HTML.format(
        sender_name=html.escape(SENDER_NAME),
        sender_url=SENDER_URL,
        source_line=html.escape(source_line),
        unsubscribe_url=html.escape(link),
        unsubscribe_text=html.escape(UNSUBSCRIBE_TEXT),
        sender_address=html.escape(SENDER_ADDRESS),
    )
    html_body = (
        '<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.55;color:#222;">'
        + paragraphs
        + footer_html
        + "</div>"
    )
    return text, html_body


def choose_subject(lead: dict) -> str:
    subjects = load_json(TEMPLATES / "subjects.json", [])
    if not isinstance(subjects, list) or not subjects:
        return "A small automation for " + str(lead.get("business_name", "your team"))
    subject = subjects[int(hashlib.sha256(str(lead.get("email", "")).encode()).hexdigest()[:8], 16) % len(subjects)]
    return (
        subject.replace("{{business_name}}", str(lead.get("business_name", "your team")))
        .replace("{{first_name}}", first_name(lead))
    )


def compliance_errors(dry_run: bool) -> list[str]:
    problems = []
    if not SENDER_NAME:
        problems.append("SENDER_NAME is not set.")
    if not SENDER_ADDRESS:
        problems.append("SENDER_ADDRESS is not set (CAN-SPAM physical address).")
    if not UNSUBSCRIBE_URL:
        problems.append("UNSUBSCRIBE_URL is not set (CAN-SPAM opt-out).")
    if not dry_run:
        for name, value in (
            ("GMAIL_SENDER", GMAIL_SENDER),
            ("GMAIL_CLIENT_ID", GMAIL_CLIENT_ID),
            ("GMAIL_CLIENT_SECRET", GMAIL_CLIENT_SECRET),
            ("GMAIL_REFRESH_TOKEN", GMAIL_REFRESH_TOKEN),
        ):
            if not value:
                problems.append(f"{name} is not set.")
    return problems


def gmail_service():
    from google.oauth2.credentials import Credentials
    from googleapiclient.discovery import build

    creds = Credentials(
        None,
        refresh_token=GMAIL_REFRESH_TOKEN,
        token_uri="https://oauth2.googleapis.com/token",
        client_id=GMAIL_CLIENT_ID,
        client_secret=GMAIL_CLIENT_SECRET,
        scopes=SCOPES,
    )
    return build("gmail", "v1", credentials=creds, cache_discovery=False)


def send_email(lead: dict, subject: str, text: str, html_body: str) -> str:
    msg = EmailMessage()
    msg["From"] = formataddr((GMAIL_FROM_NAME or SENDER_NAME, GMAIL_SENDER))
    msg["To"] = str(lead["email"])
    msg["Reply-To"] = GMAIL_SENDER
    msg["Subject"] = subject
    msg.set_content(text)
    msg.add_alternative(html_body, subtype="html")

    service = gmail_service()
    raw = base64.urlsafe_b64encode(msg.as_bytes()).decode()
    sent = service.users().messages().send(userId="me", body={"raw": raw}).execute()
    return sent.get("id", "")


def main(argv: list[str]) -> int:
    dry_run = "--dry-run" in argv or os.getenv("DRY_RUN", "").lower() in {"1", "true", "yes"}

    problems = compliance_errors(dry_run)
    if problems:
        print("Refusing to send — compliance/configuration problems:")
        for problem in problems:
            print("  - " + problem)
        return 1

    queue = load_queue()
    if not queue:
        print("Lead queue is empty.")
        return 0

    lead = queue[0]
    email = str(lead.get("email", "")).strip().lower()
    if not email or not email.count("@") == 1:
        print("Skipping invalid lead:", lead.get("business_name") or email or "<unnamed>")
        queue.pop(0)
        save_queue(queue)
        return 0

    if email in suppression_list():
        print("Skipping suppressed address:", email)
        queue.pop(0)
        save_queue(queue)
        return 0

    country = str(lead.get("country", "")).strip().lower()
    if country in CONSENT_REQUIRED and not lead.get("consent"):
        print(f"Skipping {email}: {country} requires prior consent; no consent on record.")
        queue.pop(0)
        save_queue(queue)
        return 0

    subject = choose_subject(lead)
    text, html_body = render_body(lead)

    if dry_run:
        print("=" * 70)
        print("To:", email)
        print("Subject:", subject)
        print("-" * 70)
        print(text)
        print("=" * 70)
        print("Dry run — nothing sent, queue untouched.")
        return 0

    try:
        message_id = send_email(lead, subject, text, html_body)
    except Exception as exc:  # noqa: BLE001 - keep the lead for a retry
        print("Send failed:", exc)
        print("Lead kept at the top of the queue for the next run.")
        return 1

    sent = load_json(SENT_FILE, [])
    if not isinstance(sent, list):
        sent = []
    sent.append(
        {
            "email": email,
            "business_name": lead.get("business_name") or lead.get("company"),
            "website": lead.get("website"),
            "country": lead.get("country"),
            "signal": lead.get("signal"),
            "template": pick_template(lead),
            "subject": subject,
            "message_id": message_id,
            "sent_at": datetime.now(timezone.utc).isoformat(),
        }
    )
    save_json(SENT_FILE, sent)

    queue.pop(0)
    save_queue(queue)
    print(f"Sent to {email} ({message_id}). {len(queue)} lead(s) remaining.")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
