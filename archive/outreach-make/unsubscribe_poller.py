"""Poll the unsubscribe inbox and add opt-outs to suppressions.json.

This runs inside GitHub Actions — no Worker, no external server. Every
unread message with "unsubscribe" in the subject (or sent to
UNSUBSCRIBE_EMAIL) is treated as an opt-out from its From address, replied
to with a canned confirmation, marked read, and recorded in unsubscribes.json.

Environment:
    GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN
    GMAIL_SENDER, GMAIL_FROM_NAME
    UNSUBSCRIBE_EMAIL (optional; defaults to GMAIL_SENDER)
"""

from __future__ import annotations

import base64
import json
import os
import re
import sys
from datetime import datetime, timezone
from email.message import EmailMessage
from email.utils import formataddr, parseaddr
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SUPPRESSIONS_FILE = Path(os.getenv("SUPPRESSIONS_FILE", ROOT / "suppressions.json"))
UNSUBSCRIBES_FILE = Path(os.getenv("UNSUBSCRIBES_FILE", ROOT / "unsubscribes.json"))

GMAIL_SENDER = os.getenv("GMAIL_SENDER", "").strip() or os.getenv("SENDER_EMAIL", "").strip()
GMAIL_FROM_NAME = os.getenv("GMAIL_FROM_NAME", "").strip() or os.getenv("SENDER_NAME", "").strip()
GMAIL_CLIENT_ID = os.getenv("GMAIL_CLIENT_ID", "").strip()
GMAIL_CLIENT_SECRET = os.getenv("GMAIL_CLIENT_SECRET", "").strip()
GMAIL_REFRESH_TOKEN = os.getenv("GMAIL_REFRESH_TOKEN", "").strip()
UNSUBSCRIBE_EMAIL = os.getenv("UNSUBSCRIBE_EMAIL", GMAIL_SENDER).strip()

SCOPES = [
    "https://www.googleapis.com/auth/gmail.send",
    "https://www.googleapis.com/auth/gmail.modify",
]

SENDER_NAME = os.getenv("SENDER_NAME", GMAIL_FROM_NAME or "Christian John Vallejos").strip()
SENDER_ADDRESS = os.getenv(
    "SENDER_ADDRESS", "480 Rubyville St, Baesa, Caloocan City, Philippines"
).strip()

CONFIRMATION = """Hi,

You're unsubscribed.

{email} is on the permanent suppression list for inodepi outreach. You will not receive any more cold emails from me.

If this wasn't you, reply to this email and I'll remove the suppression.

--
{sender_name}
https://inodepi.github.io
{sender_address}
"""

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
# The site form and the outreach footer both send "Unsubscribe <address>".
BODY_RE = re.compile(
    r"unsubscribe\s+([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})", re.I
)


def load_json(path: Path, default):
    if not path.exists():
        return default
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return default


def save_json(path: Path, data) -> None:
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def service():
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


def header(message: dict, name: str) -> str:
    for item in message.get("payload", {}).get("headers", []):
        if item.get("name", "").lower() == name.lower():
            return item.get("value", "")
    return ""


def send_confirmation(gmail, email: str, in_reply_to: str = "") -> str:
    msg = EmailMessage()
    msg["From"] = formataddr((GMAIL_FROM_NAME or SENDER_NAME, GMAIL_SENDER))
    msg["To"] = email
    msg["Subject"] = "You're unsubscribed from inodepi outreach"
    if in_reply_to:
        msg["In-Reply-To"] = in_reply_to
        msg["References"] = in_reply_to
    msg.set_content(
        CONFIRMATION.format(
            email=email, sender_name=SENDER_NAME, sender_address=SENDER_ADDRESS
        )
    )
    raw = base64.urlsafe_b64encode(msg.as_bytes()).decode()
    result = gmail.users().messages().send(userId="me", body={"raw": raw}).execute()
    return result.get("id", "")


def main(argv: list[str]) -> int:
    dry_run = "--dry-run" in argv

    missing = [
        name
        for name, value in (
            ("GMAIL_SENDER", GMAIL_SENDER),
            ("GMAIL_CLIENT_ID", GMAIL_CLIENT_ID),
            ("GMAIL_CLIENT_SECRET", GMAIL_CLIENT_SECRET),
            ("GMAIL_REFRESH_TOKEN", GMAIL_REFRESH_TOKEN),
        )
        if not value
    ]
    if missing and not dry_run:
        print("Missing Gmail configuration: " + ", ".join(missing))
        return 1

    suppressions = load_json(SUPPRESSIONS_FILE, [])
    if isinstance(suppressions, dict):
        suppressions = suppressions.get("emails", [])
    suppressions = [str(e).strip().lower() for e in suppressions if e]
    log = load_json(UNSUBSCRIBES_FILE, [])
    if not isinstance(log, list):
        log = []

    if dry_run:
        print("Dry run — would poll Gmail for unread unsubscribe messages.")
        return 0

    gmail = service()
    # Only subject matches. A `to:` clause would match every unread message in
    # a shared personal inbox and suppress unrelated senders.
    query = "is:unread subject:unsubscribe"

    result = gmail.users().messages().list(
        userId="me", q=query, maxResults=25
    ).execute()
    messages = result.get("messages", [])
    print(f"Found {len(messages)} unread unsubscribe message(s).")

    processed = 0
    for ref in messages:
        message = gmail.users().messages().get(
            userId="me",
            id=ref["id"],
            format="metadata",
            metadataHeaders=["From", "Subject", "Message-ID"],
        ).execute()
        _, email = parseaddr(header(message, "From"))
        email = email.strip().lower()
        if not EMAIL_RE.match(email):
            print(f"Skipping message {ref['id']}: no usable From address.")
            continue
        if email in {GMAIL_SENDER.lower(), UNSUBSCRIBE_EMAIL.lower()}:
            print(f"Skipping message {ref['id']}: sender is this account.")
            continue

        # The request body names the address that should be suppressed. That
        # catches someone who sends from a different mailbox than the one we
        # emailed, while the From address is still the reply target.
        targets = [email]
        body_match = BODY_RE.search(message.get("snippet") or "")
        if body_match:
            body_email = body_match.group(1).strip().lower()
            if (
                EMAIL_RE.match(body_email)
                and body_email not in targets
                and body_email not in {GMAIL_SENDER.lower(), UNSUBSCRIBE_EMAIL.lower()}
            ):
                targets.append(body_email)

        new_targets = [t for t in targets if t not in suppressions]
        if new_targets:
            suppressions.extend(new_targets)
            save_json(SUPPRESSIONS_FILE, suppressions)

        subject = header(message, "Subject")
        print(
            f"{'New' if new_targets else 'Repeat'} opt-out: "
            f"{', '.join(targets)} ({subject})"
        )

        try:
            confirmation_id = send_confirmation(
                gmail, email, header(message, "Message-ID")
            )
        except Exception as exc:  # noqa: BLE001
            print(f"Could not send confirmation to {email}: {exc}")
            continue

        gmail.users().messages().modify(
            userId="me", id=ref["id"], body={"removeLabelIds": ["UNREAD"]}
        ).execute()
        log.append(
            {
                "email": email,
                "emails": targets,
                "message_id": ref["id"],
                "confirmation_id": confirmation_id,
                "processed_at": datetime.now(timezone.utc).isoformat(),
            }
        )
        save_json(UNSUBSCRIBES_FILE, log)
        processed += 1

    print(f"Processed {processed} opt-out(s). {len(suppressions)} suppressed total.")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
