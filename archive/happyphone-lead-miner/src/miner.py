import os
import json
import re
import datetime
import requests
import pandas as pd
import whois

from push import COLUMNS, send_leads

DISCORD_WEBHOOK_URL = os.getenv("DISCORD_WEBHOOK_URL")
TRACKER_FILE = "processed_domains.csv"
INPUT_FILE = "incoming_targets.json"

TRACKER_COLUMNS = COLUMNS + ["checked_at"]
TODAY = datetime.datetime.now(datetime.timezone.utc).date().isoformat()

BROWSER_UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
)
BROWSER_HEADERS = {
    "User-Agent": BROWSER_UA,
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
}

# WHOIS frequently returns the registrar's own abuse/privacy desk, not the owner.
BAD_EMAIL_LOCALPARTS = ("abuse", "hostmaster", "whois", "domainadmin", "dns", "privacy", "redacted")
BAD_EMAIL_DOMAINS = (
    "godaddy.com", "namecheap.com", "domainsbyproxy.com", "registrar-servers.com",
    "enom.com", "tucows.com", "publicdomainregistry.com", "wildwestdomains.com",
    "gname.com", "dynadot.com", "networksolutions.com", "ionos.com", "register.com",
)
PRIVACY_MARKERS = (
    "redacted", "privacy", "domains by proxy", "whoisguard", "withheld",
    "not disclosed", "statutory masking", "data protected",
)

if os.path.exists(TRACKER_FILE):
    df_existing = pd.read_csv(TRACKER_FILE)
    for col in TRACKER_COLUMNS:
        if col not in df_existing.columns:
            df_existing[col] = ""
    already_processed = set(df_existing['domain'].astype(str).str.lower())
else:
    df_existing = pd.DataFrame(columns=TRACKER_COLUMNS)
    already_processed = set()

raw_targets = []
if os.path.exists(INPUT_FILE):
    try:
        with open(INPUT_FILE, "r") as f:
            loaded = json.load(f)
        raw_targets = loaded if isinstance(loaded, list) else []
    except Exception as e:
        print(f"Queue read failed, starting empty: {e}")
        raw_targets = []


def normalize_target(entry):
    if isinstance(entry, str):
        return {
            "domain": entry.strip(), "company_name": "", "city": "",
            "category": "", "source": "manual", "listing_phone": "",
        }
    if isinstance(entry, dict):
        return {
            "domain": str(entry.get("domain", "")).strip(),
            "company_name": str(entry.get("company_name") or ""),
            "city": str(entry.get("city") or ""),
            "category": str(entry.get("category") or ""),
            "source": str(entry.get("source") or "manual"),
            "listing_phone": str(entry.get("listing_phone") or ""),
        }
    return None


def clean_registrar_name(value):
    if not value:
        return ""
    value = str(value).strip()
    low = value.lower()
    if any(marker in low for marker in PRIVACY_MARKERS):
        return ""
    return value


def clean_email(value):
    if not value:
        return ""
    value = str(value).strip()
    low = value.lower()
    m = re.search(r"@([\w.-]+)$", low)
    if not m:
        return ""
    local = low.split("@")[0]
    domain = m.group(1)
    if any(marker in local for marker in BAD_EMAIL_LOCALPARTS):
        return ""
    if any(domain == bad or domain.endswith("." + bad) for bad in BAD_EMAIL_DOMAINS):
        return ""
    return value


def check_website(domain):
    for scheme in ("https://", "http://"):
        try:
            response = requests.get(
                f"{scheme}{domain}", timeout=8, headers=BROWSER_HEADERS, allow_redirects=True
            )
            if response.status_code >= 400:
                return True, f"HTTP Error {response.status_code}"
            return False, "Active"
        except requests.RequestException:
            continue
    return True, "Connection/DNS Failure"


def enrich_for_free(domain):
    contact = {"name": "Unknown Owner", "email": "No Email", "phone": "No Phone", "company": ""}
    try:
        w = whois.whois(domain)
    except Exception:
        return contact

    def first(value):
        if isinstance(value, list):
            return value[0] if value else None
        return value

    name = clean_registrar_name(first(w.name))
    email = clean_email(first(w.emails))
    phone = first(w.phone)
    org = clean_registrar_name(first(w.org))

    if name:
        contact["name"] = str(name)
    if email:
        contact["email"] = str(email)
    if org:
        contact["company"] = str(org)

    # A redacted name plus a registrar email means the whole block is the
    # registrar's placeholder, so the phone is junk too.
    if name and email and phone:
        contact["phone"] = str(phone)
    return contact


new_records = []
verified_broken_leads = []

for entry in raw_targets:
    target = normalize_target(entry)
    if not target or not target["domain"]:
        continue
    domain = target["domain"]
    if domain.lower() in already_processed:
        continue

    is_broken, error_label = check_website(domain)
    if is_broken:
        contact = enrich_for_free(domain)
        company = target["company_name"] or contact["company"] or domain
        owner_phone = contact["phone"]
        if owner_phone in ("", "No Phone") and target["listing_phone"]:
            owner_phone = target["listing_phone"]
        lead_data = {
            "domain": domain,
            "company_name": company,
            "owner_name": contact["name"],
            "owner_phone": owner_phone,
            "owner_email": contact["email"],
            "error_type": error_label,
            "city": target["city"],
            "category": target["category"],
            "source": target["source"],
            "listing_phone": target["listing_phone"],
            "checked_at": TODAY,
        }
        new_records.append(lead_data)
        verified_broken_leads.append(lead_data)
    else:
        new_records.append({
            "domain": domain,
            "company_name": target["company_name"] or "N/A",
            "owner_name": "N/A",
            "owner_phone": "N/A",
            "owner_email": "N/A",
            "error_type": "Healthy",
            "city": target["city"],
            "category": target["category"],
            "source": target["source"],
            "listing_phone": target["listing_phone"],
            "checked_at": TODAY,
        })

if new_records:
    df_new = pd.DataFrame(new_records)[TRACKER_COLUMNS]
    df_combined = pd.concat([df_existing, df_new], ignore_index=True)
    df_combined.to_csv(TRACKER_FILE, index=False)

if verified_broken_leads:
    send_leads(DISCORD_WEBHOOK_URL, verified_broken_leads)

# Drain the queue only after every step above completed. If anything raised,
# the queue survives for the next run instead of being silently lost.
try:
    with open(INPUT_FILE, "w") as f:
        json.dump([], f)
    print(f"Queue drained ({len(raw_targets)} read, {len(new_records)} new records).")
except Exception as e:
    print(f"Queue clear failed: {e}")
