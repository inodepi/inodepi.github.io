import csv
import io
import datetime

import requests

COLUMNS = [
    "domain", "company_name", "owner_name", "owner_phone", "owner_email",
    "error_type", "city", "category", "source", "listing_phone",
]


def build_csv(leads):
    buf = io.StringIO()
    writer = csv.DictWriter(buf, fieldnames=COLUMNS, extrasaction="ignore")
    writer.writeheader()
    for lead in leads:
        writer.writerow({k: lead.get(k, "") for k in COLUMNS})
    return buf.getvalue()


def send_leads(webhook_url, leads, label="new"):
    if not webhook_url:
        print("DISCORD_WEBHOOK_URL is not set; skipping push.")
        return None
    if not leads:
        print("No leads to push.")
        return None

    stamp = datetime.datetime.now(datetime.timezone.utc).strftime("%Y%m%d-%H%M")
    filename = f"leads-{stamp}.csv"
    content = f"🔧 **{len(leads)}** {label} broken-site lead(s)\n`{filename}`"

    try:
        resp = requests.post(
            webhook_url,
            data={"content": content},
            files={"file": (filename, build_csv(leads).encode("utf-8"), "text/csv")},
            timeout=30,
        )
    except requests.RequestException as e:
        print(f"Discord push failed: {e}")
        return None

    if resp.status_code >= 300:
        print(f"Discord push failed: HTTP {resp.status_code} {resp.text[:200]}")
        return None

    print(f"Pushed {len(leads)} leads to Discord (HTTP {resp.status_code}).")
    return resp
