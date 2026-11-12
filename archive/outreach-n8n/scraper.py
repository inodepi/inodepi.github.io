"""
Real-lead scraper for the outreach pipeline.

Finds actual local businesses via the OpenStreetMap Overpass API (free, no API
key), enriches them with emails published on the businesses' own public
websites, validates everything, and prepends fresh leads to the top of
leads.json. The outreach script (outreach.py) still sends only one lead per
run, so your n8n automation isn't triggered by scraping.

Data sources & etiquette:
  - OpenStreetMap: Open Database License (ODbL). Attribution required if you
    republish the data.
  - Nominatim: public geocoder, requires a descriptive User-Agent (set
    SCRAPER_USER_AGENT with your contact info).
  - Business websites: only public pages, only self-published contact emails,
    polite delay between requests, hard cap on fetches per run.

Only public, self-published business contact info is collected. You are
responsible for complying with anti-spam law in your jurisdiction
(CAN-SPAM/GDPR/etc.) — always include an unsubscribe option in your templates.
"""

import argparse
import json
import os
import re
import socket
import sys
import time
from datetime import datetime, timezone
from urllib.parse import urlparse, urljoin

import requests
from bs4 import BeautifulSoup

try:
    import dns.resolver  # dnspython — MX lookups (bounce prevention)
except ImportError:
    dns = None

from outreach import load_queue, save_queue  # reuse the same queue I/O logic

LEADS_FILE = os.getenv("LEADS_FILE", "leads.json")
SEEN_FILE = os.getenv("SEEN_FILE", "seen_leads.json")

# Google Sheet mirror of the queue (optional). When SHEET_ID is set and the
# service account can reach it, every scraped lead is appended as a row so the
# sheet stays in sync with leads.json.
SHEET_ID = (os.getenv("LEADS_SHEET_ID") or "").strip()
GOOGLE_SA_FILE = (os.getenv("GOOGLE_APPLICATION_CREDENTIALS") or "").strip()
GOOGLE_SA_INFO = (os.getenv("GOOGLE_SERVICE_ACCOUNT_INFO") or "").strip()
SHEET_GID = (os.getenv("LEADS_SHEET_GID") or "").strip()
def _num_env(name, default, cast):
    """Env var as a number; empty/invalid values fall back to the default.
    (GitHub Actions sets vars to "" when an input is blank on scheduled runs.)
    """
    raw = (os.getenv(name) or "").strip()
    if not raw:
        return default
    try:
        return cast(raw)
    except ValueError:
        print(f"Warning: {name}={raw!r} is not a valid number; using {default}.")
        return default


# NB: `or` (not a getenv default) so an EMPTY-STRING env var still yields the fallback.
DEFAULT_CITY = os.getenv("TARGET_CITY") or "Austin, Texas"
MAX_NEW_LEADS = _num_env("MAX_NEW_LEADS", 5, int)
MAX_SITE_FETCHES = _num_env("MAX_SITE_FETCHES", 15, int)
REQUEST_DELAY = _num_env("SCRAPE_DELAY_SECONDS", 1.0, float)

# ---------------------------------------------------------------------------
# Target industries — only businesses in these verticals are scraped.
# (Highest cold-outreach response rates; no more dentists/salons/funeral homes.)
# Override with the TARGET_INDUSTRIES env var / repo variable (comma-separated).
# ---------------------------------------------------------------------------
TARGET_INDUSTRIES = [
    "B2B Tech & Software (SaaS)",
    "Marketing, PR, & Growth Agencies",
    "Professional Services (Consulting & Corporate Training)",
    "E-commerce & D2C Brands",
    "Recruitment, Staffing, & HR Services",
    "Commercial Real Estate (CRE)",
    "Logistics, Supply Chain, & Freight",
]

# OSM `office=*` values that map to each target industry. OSM has no
# "e-commerce" tag — D2C brands usually appear as generic offices, so they
# ride on `office=company`.
INDUSTRY_OFFICE_VALUES = {
    "B2B Tech & Software (SaaS)": ("it", "computer", "software", "web_design", "consulting", "company"),
    "Marketing, PR, & Growth Agencies": ("advertising_agency", "marketing", "public_relations", "media", "web_design", "publishing", "event_management"),
    "Professional Services (Consulting & Corporate Training)": ("consulting", "lawyer", "accountant", "tax_advisor", "financial", "insurance", "architect", "educational_institution", "research"),
    "E-commerce & D2C Brands": ("company",),
    "Recruitment, Staffing, & HR Services": ("employment_agency",),
    "Commercial Real Estate (CRE)": ("estate_agent", "property_management"),
    "Logistics, Supply Chain, & Freight": ("logistics", "forwarding", "moving_company"),
}

_raw_industries = (os.getenv("TARGET_INDUSTRIES") or "").strip()
if _raw_industries:
    _requested = [s.strip() for s in _raw_industries.replace(";", ",").split(",") if s.strip()]
    _unknown = [s for s in _requested if s not in INDUSTRY_OFFICE_VALUES]
    if _unknown:
        print(f"Warning: unknown TARGET_INDUSTRIES value(s): {_unknown}. Valid: {list(INDUSTRY_OFFICE_VALUES)}")
    _mapped = [s for s in _requested if s in INDUSTRY_OFFICE_VALUES]
    if _mapped:
        TARGET_INDUSTRIES = _mapped

# NB: `or` (not a getenv default) so an EMPTY-STRING env var still yields the
# fallback — GitHub Actions passes "" when the SCRAPER_USER_AGENT secret is
# unset, and Nominatim 403s empty User-Agents.
USER_AGENT = (
    (os.getenv("SCRAPER_USER_AGENT") or "").strip()
    or "inodepi-leadbot/1.0 (automated B2B lead research; github contact available on request)"
)

OVERPASS_ENDPOINTS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass.private.coffee/api/interpreter",
    "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
    "https://overpass.osm.jp/api/interpreter",
    "https://overpass.openstreetmap.ru/api/interpreter",
]
# Full pass over all mirrors; repeated this many times before giving up.
OVERPASS_ROUNDS = 3
# Pause between endpoint attempts; lets an overloaded mirror recover.
OVERPASS_RETRY_DELAY = 10  # seconds
NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
PHOTON_URL = "https://photon.komoot.io/api/"  # fallback geocoder, no API key

EMAIL_REGEX = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")
BAD_EMAIL_EXTENSIONS = {"png", "jpg", "jpeg", "gif", "webp", "svg", "js", "css", "woff", "woff2", "ttf"}
RESERVED_DOMAIN_SUFFIXES = (".example", ".example.com", ".test", ".invalid", ".localhost")
BAD_EMAIL_SUBSTRINGS = [
    "example@", "sentry", "wixpress", "noreply", "no-reply",
    "donotreply", "yourdomain", "youremail", "your-email", "domain.com",
    "email.com", "test@", "user@", "john.doe", "jane.doe", "name@",
    "godaddy", "squarespace", "@2x", "email@", "you@", "site@",
]
GENERIC_PREFIXES = ("info", "contact", "hello", "office", "admin", "sales", "team", "support")

SOCIAL_HOSTS = (
    "facebook.com", "instagram.com", "linkedin.com", "twitter.com", "x.com",
    "tiktok.com", "yelp.com", "linktr.ee", "google.com", "youtube.com",
    "business.site", "wixsite.com", " squarespace.com", "mailchimp.com",
)

CHAIN_NAMES = (
    "starbucks", "mcdonald", "walmart", "subway", "dunkin", "walgreens",
    "7-eleven", "seven eleven", "chase bank", "bank of america", "wells fargo",
    "shell", "chevron", "cvs ", "cvs/", "target ", "ups store", "fedex office",
    "best buy", "tesla", "staples", "office depot",
)

CONTACT_LINK_HINTS = ("contact", "about", "impressum", "kontakt", "team", "reach", "connect")


def log(msg):
    print(msg, flush=True)


# ---------------------------------------------------------------------------
# Google Sheet sync
# ---------------------------------------------------------------------------

def sheet_append_rows(rows):
    """Append lead rows to the tracking Google Sheet. Returns count written.
    Row shape matches the sheet's header: business_name, wbsite, niche,
    contact name, email, scapped date (typo'd headers are the sheet's own).
    Never raises: sheet sync is best-effort and must not fail the scrape.
    """
    if not rows:
        return 0
    if not SHEET_ID:
        return 0
    try:
        import gspread
    except ImportError:
        log("gspread not installed; skipping Google Sheet sync (pip install gspread google-auth).")
        return 0
    try:
        if GOOGLE_SA_INFO:
            import json as _json
            gc = gspread.service_account_from_dict(_json.loads(GOOGLE_SA_INFO))
        elif GOOGLE_SA_FILE:
            gc = gspread.service_account(filename=GOOGLE_SA_FILE)
        else:
            gc = gspread.service_account()  # default ~/.config/gspread/service_account.json
        sh = gc.open_by_key(SHEET_ID)
        ws = sh.worksheet_by_id(int(SHEET_GID)) if SHEET_GID.isdigit() else sh.sheet1
        from datetime import datetime
        now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        payload = [
            [
                lead.get("business_name", ""),
                lead.get("website", ""),
                lead.get("niche", ""),
                lead.get("contact_name", ""),
                lead.get("email", ""),
                now,
            ]
            for lead in rows
        ]
        ws.append_rows(payload, value_input_option="USER_ENTERED")
        log(f"Appended {len(payload)} row(s) to Google Sheet {SHEET_ID}.")
        return len(payload)
    except Exception as e:
        log(f"Warning: Google Sheet sync failed ({e}); leads.json is still updated.")
        return 0


# ---------------------------------------------------------------------------
# Geo + Overpass
# ---------------------------------------------------------------------------

def _bbox_from_nominatim(city):
    """Geocode via Nominatim; return bbox string '(south,west,north,east)' or None."""
    try:
        resp = requests.get(
            NOMINATIM_URL,
            params={"q": city, "format": "json", "limit": 1},
            headers={"User-Agent": USER_AGENT},
            timeout=20,
        )
        resp.raise_for_status()
        results = resp.json()
    except Exception as e:
        # Nominatim blocks many cloud/datacenter IPs (e.g. GitHub Actions
        # runners) and rejects empty User-Agents — both common in CI.
        log(f"Nominatim geocoding failed ({e}); trying fallback geocoder...")
        return None

    if not results:
        log("Nominatim found no match; trying fallback geocoder...")
        return None

    # Nominatim boundingbox = [south, north, west, east] (strings)
    south, north, west, east = results[0]["boundingbox"]
    return f"({south},{west},{north},{east})"


def _bbox_from_photon(city):
    """Geocode via Photon (komoot) as a Nominatim fallback; same bbox format."""
    try:
        resp = requests.get(
            PHOTON_URL,
            params={"q": city, "limit": 1},
            headers={"User-Agent": USER_AGENT},
            timeout=20,
        )
        resp.raise_for_status()
        features = resp.json().get("features", [])
    except Exception as e:
        log(f"Photon geocoding failed: {e}")
        return None

    if not features:
        log("Photon found no match.")
        return None

    # Photon/GeoJSON extent = [west, south, east, north]
    west, south, east, north = features[0]["properties"]["extent"]
    return f"({south},{west},{north},{east})"


def geocode_city(city):
    """Return an Overpass bbox string '(south,west,north,east)' for a city."""
    log(f"Geocoding city: {city}")
    bbox = _bbox_from_nominatim(city) or _bbox_from_photon(city)
    if not bbox:
        log("Error: geocoding failed (all geocoders).")
        return None
    log(f"Geocoded to bbox: {bbox}")
    return bbox


def overpass_query(bbox):
    """Query Overpass for named businesses in the target industries within the bbox."""
    office_values = sorted({v for ind in TARGET_INDUSTRIES for v in INDUSTRY_OFFICE_VALUES.get(ind, ())})
    if not office_values:
        log("Error: none of the configured target industries map to OSM tags.")
        return None
    query = f"""[out:json][timeout:90];
(
  nwr["office"~"^({'|'.join(office_values)})$"]["name"]{bbox};
);
out center tags;"""

    last_error = None
    for round_num in range(1, OVERPASS_ROUNDS + 1):
        for endpoint in OVERPASS_ENDPOINTS:
            try:
                host = endpoint.split("/")[2]
                suffix = f" (round {round_num}/{OVERPASS_ROUNDS})" if round_num > 1 else ""
                log(f"Querying Overpass ({host}){suffix}...")
                resp = requests.post(
                    endpoint,
                    data={"data": query},
                    headers={"User-Agent": USER_AGENT},
                    timeout=120,
                )
                resp.raise_for_status()
                elements = resp.json().get("elements", [])
                log(f"Overpass returned {len(elements)} raw elements.")
                return elements
            except Exception as e:
                last_error = e
                log(f"Overpass endpoint failed ({e}); trying next...")
                time.sleep(OVERPASS_RETRY_DELAY)
    log(f"Error: all Overpass endpoints failed after {OVERPASS_ROUNDS} rounds.")
    return None


def niche_for(tags):
    office = tags.get("office", "")
    for industry in TARGET_INDUSTRIES:
        if office in INDUSTRY_OFFICE_VALUES.get(industry, ()):
            return industry
    return "B2B Professional Services"


def extract_businesses(elements):
    """Turn Overpass elements into normalized business dicts, deduped by OSM id."""
    businesses = {}
    for el in elements:
        tags = el.get("tags", {})
        name = (tags.get("name") or "").strip()
        if not name:
            continue

        osm_id = f"{el.get('type')}/{el.get('id')}"
        if osm_id in businesses:
            continue

        website = tags.get("website") or tags.get("contact:website") or tags.get("url") or ""
        email = (tags.get("contact:email") or tags.get("email") or "").strip().lower()
        center = el.get("center") or {}
        lat, lon = center.get("lat", el.get("lat")), center.get("lon", el.get("lon"))

        street = " ".join(
            filter(None, [tags.get("addr:housenumber"), tags.get("addr:street")])
        )
        city = tags.get("addr:city", "")

        businesses[osm_id] = {
            "osm_id": osm_id,
            "name": name,
            "website": normalize_url(website),
            "email": email,
            "phone": tags.get("phone") or tags.get("contact:phone") or "",
            "address": ", ".join(filter(None, [street, city])),
            "category_tags": {k: v for k, v in tags.items()
                              if k in ("shop", "office", "craft", "amenity", "healthcare")},
            "lat": lat,
            "lon": lon,
            "niche": niche_for(tags),
        }
    return list(businesses.values())


# ---------------------------------------------------------------------------
# URL / email handling
# ---------------------------------------------------------------------------

def normalize_url(url):
    url = (url or "").strip()
    if not url:
        return ""
    if not url.startswith("http://") and not url.startswith("https://"):
        url = "https://" + url
    return url.rstrip("/")


def is_social_url(url):
    host = urlparse(url).netloc.lower()
    return any(social in host for social in SOCIAL_HOSTS)


def is_chain(name):
    lowered = f" {name.lower()} "
    return any(chain in lowered for chain in CHAIN_NAMES)


def valid_email(email):
    email = (email or "").strip().lower().strip(".,;:<>\"'")
    if not email or EMAIL_REGEX.fullmatch(email) is None:
        return False
    local, _, domain = email.partition("@")
    ext = domain.rsplit(".", 1)[-1]
    if ext in BAD_EMAIL_EXTENSIONS:
        return False
    if re.search(r"\.(png|jpe?g|gif|webp|svg|css|js)$", local):
        return False  # scraped asset filename, not a mailbox
    if domain == "example.com" or domain.endswith(RESERVED_DOMAIN_SUFFIXES) or ext in {"example", "test", "invalid", "localhost"}:
        return False  # IANA-reserved documentation/test domains
    if any(bad in email for bad in BAD_EMAIL_SUBSTRINGS):
        return False
    if "." not in domain or len(ext) < 2:
        return False
    return True


def clean_email(raw):
    return (raw or "").strip().lower().strip(".,;:<>\"'")


def rank_emails(emails, website_host):
    """Prefer personalized same-domain mailboxes, then generic ones, then others."""
    def score(email):
        domain = email.partition("@")[2]
        same_domain = int(bool(website_host and website_host in domain))
        generic = int(email.partition("@")[0] in GENERIC_PREFIXES)
        return (same_domain, 1 - generic)  # same-domain first; non-generic beats generic

    return sorted(emails, key=score, reverse=True)


_DNS_CACHE = {}


def domain_resolves(domain):
    """Cheap sanity check: does this domain resolve at all? (dead-domain filter)"""
    if domain in _DNS_CACHE:
        return _DNS_CACHE[domain]
    try:
        socket.getaddrinfo(domain, None)
        ok = True
    except OSError:
        ok = False
    _DNS_CACHE[domain] = ok
    return ok


_MX_CACHE = {}


def mx_deliverable(domain):
    """Deliverability gate: the domain must publish an MX record.

    A missing MX record is the top silent-bounce cause (parked domains still
    resolve a website but can't receive mail). Falls back to a plain DNS
    resolve when dnspython isn't installed (weaker, never blocks the run).
    """
    if domain in _MX_CACHE:
        return _MX_CACHE[domain]
    if dns is None:
        ok = domain_resolves(domain)
    else:
        try:
            ok = bool(dns.resolver.resolve(domain, "MX"))
        except Exception:
            ok = False
    _MX_CACHE[domain] = ok
    return ok


def fetch_emails_from_site(website, fetch_budget):
    """Collect emails the business publishes on its own site (homepage + contact pages)."""
    emails = set()
    pages_fetched = 0
    contact_links = []

    try:
        resp = requests.get(website, headers={"User-Agent": USER_AGENT}, timeout=15)
        pages_fetched += 1
        soup = BeautifulSoup(resp.text, "html.parser")
    except Exception:
        return emails, pages_fetched

    # mailto: links first (highest confidence)
    for a in soup.find_all("a", href=True):
        href = a["href"].strip()
        if href.lower().startswith("mailto:"):
            found = clean_email(href.split("mailto:", 1)[1].split("?")[0])
            if valid_email(found):
                emails.add(found)
        elif any(hint in href.lower() or hint in a.get_text(strip=True).lower()
                 for hint in CONTACT_LINK_HINTS):
            full = urljoin(website + "/", href)
            if urlparse(full).netloc and not is_social_url(full):
                contact_links.append(full)

    # plain-text emails in the page source
    for found in EMAIL_REGEX.findall(resp.text):
        found = clean_email(found)
        if valid_email(found):
            emails.add(found)

    # follow up to 2 same-site contact pages within the remaining budget
    seen_pages = set()
    for link in contact_links:
        if pages_fetched >= fetch_budget or len(seen_pages) >= 2:
            break
        if link in seen_pages:
            continue
        seen_pages.add(link)
        time.sleep(REQUEST_DELAY)
        try:
            resp = requests.get(link, headers={"User-Agent": USER_AGENT}, timeout=15)
            pages_fetched += 1
            for found in EMAIL_REGEX.findall(resp.text):
                found = clean_email(found)
                if valid_email(found):
                    emails.add(found)
        except Exception:
            continue

    return emails, pages_fetched


# ---------------------------------------------------------------------------
# Seen-file + queue helpers
# ---------------------------------------------------------------------------

def load_seen():
    if not os.path.exists(SEEN_FILE):
        return {}
    try:
        with open(SEEN_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
        return data if isinstance(data, dict) else {}
    except (json.JSONDecodeError, OSError):
        return {}


def save_seen(seen):
    with open(SEEN_FILE, "w", encoding="utf-8") as f:
        json.dump(seen, f, indent=2, sort_keys=True)
        f.write("\n")


def lead_keys(lead):
    keys = []
    if lead.get("email"):
        keys.append(f"email:{lead['email'].lower()}")
    host = urlparse(lead.get("website", "")).netloc.lower()
    if host:
        keys.append(f"site:{host}")
    return keys


def already_known(lead, seen, queue):
    queue_emails = {str(l.get("email", "")).lower() for l in queue if isinstance(l, dict)}
    if lead.get("email", "").lower() in queue_emails:
        return True
    return any(k in seen for k in lead_keys(lead))


def build_lead(biz, email):
    lead = {
        "business_name": biz["name"],
        "website": biz["website"],
        "email": email,
        "niche": biz["niche"],
        "category": ", ".join(f"{k}={v}" for k, v in biz["category_tags"].items()),
        "source": "OpenStreetMap",
        "osm_id": biz["osm_id"],
        "scraped_at": datetime.now(timezone.utc).isoformat(),
    }
    if biz.get("phone"):
        lead["phone"] = biz["phone"]
    if biz.get("address"):
        lead["address"] = biz["address"]
    return lead


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def scrape(city, max_new_leads, max_site_fetches, dry_run=False):
    print("Starting real-lead scraper...")

    bbox = geocode_city(city)
    if not bbox:
        sys.exit(1)

    elements = overpass_query(bbox)
    if elements is None:
        log("Error: all Overpass endpoints failed.")
        sys.exit(1)

    businesses = extract_businesses(elements)
    log(f"Extracted {len(businesses)} unique named businesses.")

    seen = load_seen()
    queue = load_queue(LEADS_FILE)

    # Cheapest-first: leads with an OSM email need zero site fetches.
    with_email = [b for b in businesses if b["email"] and valid_email(b["email"])]
    with_site = [b for b in businesses if not b["email"] and b["website"] and not is_social_url(b["website"])]
    candidates = with_email + with_site
    log(f"Candidates: {len(with_email)} with public email, {len(with_site)} needing a site lookup.")

    new_leads = []
    fetches_used = 0

    for biz in candidates:
        if len(new_leads) >= max_new_leads:
            break

        email = biz["email"] if biz["email"] else ""
        website_host = urlparse(biz["website"]).netloc.lower()

        # Site enrichment (only within the fetch budget)
        if not email and biz["website"]:
            if fetches_used >= max_site_fetches:
                continue
            time.sleep(REQUEST_DELAY)
            found, used = fetch_emails_from_site(
                biz["website"], max_site_fetches - fetches_used
            )
            fetches_used += used
            if not found:
                continue
            email = rank_emails(found, website_host)[0]

        if not valid_email(email):
            continue

        email_domain = email.partition("@")[2]
        if not mx_deliverable(email_domain):
            log(f"  Skipping {biz['name']}: no MX record for {email_domain} (mail would bounce)")
            continue

        lead = build_lead(biz, email)
        if already_known(lead, seen, queue + new_leads):
            continue
        if is_chain(lead["business_name"]):
            log(f"  Skipping chain store: {lead['business_name']}")
            continue

        new_leads.append(lead)
        for key in lead_keys(lead):
            seen[key] = datetime.now(timezone.utc).date().isoformat()
        log(f"  + Queued: {lead['business_name']} <{email}>")

    if dry_run:
        print(f"\nDRY RUN: would add {len(new_leads)} lead(s); no files written.")
        for lead in new_leads:
            print(f"  - {lead['business_name']} <{lead['email']}> ({lead['niche']})")
    else:
        if new_leads:
            save_queue(LEADS_FILE, new_leads + queue)
            save_seen(seen)
            log(f"Prepended {len(new_leads)} new lead(s) to {LEADS_FILE}.")
            sheet_append_rows(new_leads)  # best-effort mirror into the Google Sheet
        else:
            log("No new leads found this run; queue unchanged.")

    print(
        f"Scraper finished. new_leads={len(new_leads)} "
        f"site_fetches={fetches_used}/{max_site_fetches} queue_length={len(new_leads) + len(queue)}"
    )
    return 0


def main():
    parser = argparse.ArgumentParser(description="Scrape real business leads into the queue.")
    parser.add_argument("--city", default=DEFAULT_CITY, help="City or area to scrape (default: TARGET_CITY env)")
    parser.add_argument("--max-leads", type=int, default=MAX_NEW_LEADS)
    parser.add_argument("--max-fetches", type=int, default=MAX_SITE_FETCHES)
    parser.add_argument("--dry-run", action="store_true", help="Do not write leads.json / seen_leads.json / the Google Sheet")
    args = parser.parse_args()

    sys.exit(scrape(args.city, args.max_leads, args.max_fetches, args.dry_run))


if __name__ == "__main__":
    main()
