"""Find dental clinics via OpenStreetMap and enrich them with public contact emails.

Only public, self-published business contact info is collected. No sending, no
calling, no paid APIs. OpenStreetMap data is ODbL; attribution is in the README.
"""

from __future__ import annotations

import os
import re
import socket
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from urllib.parse import urljoin, urlparse

import requests
from bs4 import BeautifulSoup

try:
    import dns.resolver  # optional: MX check
except ImportError:  # pragma: no cover
    dns = None


USER_AGENT = os.getenv("SCRAPER_USER_AGENT") or (
    "clinic-leads/1.0 (+https://github.com/inodepi/clinic-leads)"
)

NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
PHOTON_URL = "https://photon.komoot.io/api/"
OVERPASS_ENDPOINTS = (
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass.private.coffee/api/interpreter",
)

REQUEST_DELAY = float(os.getenv("SCRAPE_DELAY_SECONDS") or "1.0")

EMAIL_REGEX = re.compile(r"[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}")

BAD_EMAIL_EXTENSIONS = {
    "png", "jpg", "jpeg", "gif", "webp", "svg", "css", "js", "ico",
    "woff", "woff2", "ttf", "eot", "mp4", "pdf",
}
BAD_EMAIL_SUBSTRINGS = (
    "example.com", "sentry.io", "wixpress.com", "yourdomain", "domain.com",
    "email.com", "sentry-next", "@2x", "u003e",
)
RESERVED_DOMAIN_SUFFIXES = (".invalid", ".test", ".example", ".localhost")
GENERIC_PREFIXES = {
    "info", "contact", "hello", "office", "admin", "frontdesk", "front-desk",
    "reception", "appointments", "scheduling", "team", "support", "hi", "mail",
    "enquiries", "inquiries", "newpatients", "patients",
}
SOCIAL_HOSTS = (
    "facebook.", "instagram.", "twitter.", "x.com", "linkedin.", "youtube.",
    "tiktok.", "yelp.", "google.", "goo.gl", "linktr.ee", "nextdoor.",
)
CONTACT_LINK_HINTS = (
    "contact", "about", "team", "reach", "connect", "staff", "location",
)

# Corporate dental groups answer their own phones. Excluding them keeps the
# list to owner-operated practices, which is where a pilot can actually close.
CHAIN_NAMES = (
    "aspen dental", "western dental", "smile brands", "heartland dental",
    "pacific dental", "gentle dental", "bright now", "affordable dentures",
    "midwest dental", "great expressions", "dental works", "dentalworks",
    "perfect teeth", "sonrisas", "smile direct", "castle dental",
    "coast dental", "kool smiles", "my kids dentist", "children's dental fun zone",
)


@dataclass
class Lead:
    clinic: str
    city: str
    phone: str
    website: str
    email: str
    email_status: str
    source: str
    osm_id: str

    def row(self) -> list[str]:
        return [
            self.clinic,
            self.city,
            self.phone,
            self.website,
            self.email,
            self.email_status,
            self.source,
            self.osm_id,
            datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        ]


def log(msg: str) -> None:
    print(msg, flush=True)


# ---------------------------------------------------------------------------
# Geocoding
# ---------------------------------------------------------------------------

def _bbox_from_nominatim(city: str) -> str | None:
    try:
        resp = requests.get(
            NOMINATIM_URL,
            params={"q": city, "format": "json", "limit": 1},
            headers={"User-Agent": USER_AGENT},
            timeout=20,
        )
        resp.raise_for_status()
        results = resp.json()
    except Exception as exc:
        log(f"Nominatim failed ({exc}); trying Photon...")
        return None
    if not results:
        return None
    south, north, west, east = results[0]["boundingbox"]
    return f"({south},{west},{north},{east})"


def _bbox_from_photon(city: str) -> str | None:
    try:
        resp = requests.get(
            PHOTON_URL,
            params={"q": city, "limit": 1},
            headers={"User-Agent": USER_AGENT},
            timeout=20,
        )
        resp.raise_for_status()
        features = resp.json().get("features", [])
    except Exception as exc:
        log(f"Photon failed: {exc}")
        return None
    if not features:
        return None
    # Photon's extent order is not reliable across versions: normalise with min/max.
    west, east = sorted((features[0]["properties"]["extent"][0], features[0]["properties"]["extent"][2]))
    south, north = sorted((features[0]["properties"]["extent"][1], features[0]["properties"]["extent"][3]))
    return f"({south},{west},{north},{east})"


def geocode_city(city: str) -> str | None:
    log(f"Geocoding: {city}")
    return _bbox_from_nominatim(city) or _bbox_from_photon(city)


# ---------------------------------------------------------------------------
# Overpass
# ---------------------------------------------------------------------------

def overpass_dentists(bbox: str, limit: int) -> list[dict]:
    query = f"""[out:json][timeout:90];
(
  nwr["amenity"="dentist"]["name"]{bbox};
  nwr["healthcare"="dentist"]["name"]{bbox};
  nwr["healthcare:speciality"~"dentistry|orthodont"]({bbox[1:-1]});
);
out center tags;"""

    for endpoint in OVERPASS_ENDPOINTS:
        try:
            log(f"Overpass: {urlparse(endpoint).netloc}")
            resp = requests.post(
                endpoint,
                data={"data": query},
                headers={"User-Agent": USER_AGENT},
                timeout=120,
            )
            resp.raise_for_status()
            elements = resp.json().get("elements", [])
            log(f"Overpass returned {len(elements)} elements.")
            return elements[:limit]
        except Exception as exc:
            log(f"Overpass endpoint failed ({exc}); trying next...")
    return []


def normalize_url(url: str) -> str:
    url = (url or "").strip()
    if not url:
        return ""
    if not url.startswith(("http://", "https://")):
        url = "https://" + url
    return url.rstrip("/")


def site_host(url: str) -> str:
    host = urlparse(normalize_url(url)).netloc.lower()
    return host[4:] if host.startswith("www.") else host


def is_social_url(url: str) -> bool:
    host = urlparse(normalize_url(url)).netloc.lower()
    return any(social in host for social in SOCIAL_HOSTS)


def is_chain(name: str) -> bool:
    lowered = f" {name.lower()} "
    return any(chain in lowered for chain in CHAIN_NAMES)


def build_businesses(elements: list[dict], city: str) -> list[dict]:
    seen: dict[str, dict] = {}
    for el in elements:
        tags = el.get("tags") or {}
        name = (tags.get("name") or "").strip()
        if not name or is_chain(name):
            continue

        osm_id = f"{el.get('type')}/{el.get('id')}"
        if osm_id in seen:
            continue

        website = normalize_url(
            tags.get("website") or tags.get("contact:website") or tags.get("url") or ""
        )
        email = (tags.get("contact:email") or tags.get("email") or "").strip().lower()
        seen[osm_id] = {
            "osm_id": osm_id,
            "clinic": name,
            "city": tags.get("addr:city") or city,
            "phone": tags.get("phone") or tags.get("contact:phone") or "",
            "website": website,
            "email": email,
        }
    return list(seen.values())


# ---------------------------------------------------------------------------
# Email extraction + validation
# ---------------------------------------------------------------------------

def clean_email(raw: str) -> str:
    return (raw or "").strip().lower().strip(".,;:<>\"'")


def valid_email(email: str) -> bool:
    email = clean_email(email)
    if not email or EMAIL_REGEX.fullmatch(email) is None:
        return False
    local, _, domain = email.partition("@")
    ext = domain.rsplit(".", 1)[-1]
    if ext in BAD_EMAIL_EXTENSIONS:
        return False
    if re.search(r"\.(png|jpe?g|gif|webp|svg|css|js)$", local):
        return False
    if domain == "example.com" or domain.endswith(RESERVED_DOMAIN_SUFFIXES):
        return False
    if any(bad in email for bad in BAD_EMAIL_SUBSTRINGS):
        return False
    return "." in domain and len(ext) >= 2


def rank_emails(emails: set[str], host: str) -> list[str]:
    def score(email: str) -> tuple[int, int]:
        domain = email.partition("@")[2]
        same_domain = int(bool(host and (host == domain or domain.endswith("." + host))))
        generic = int(email.partition("@")[0] in GENERIC_PREFIXES)
        return (same_domain, 1 - generic)

    return sorted(emails, key=score, reverse=True)


def fetch_emails(website: str, fetch_budget: int) -> tuple[set[str], int]:
    """Collect emails a clinic publishes on its own site. Returns (emails, pages)."""
    emails: set[str] = set()
    pages = 0
    contact_links: list[str] = []

    if not website or is_social_url(website):
        return emails, pages

    try:
        resp = requests.get(website, headers={"User-Agent": USER_AGENT}, timeout=15)
        pages += 1
        soup = BeautifulSoup(resp.text, "html.parser")
    except Exception:
        return emails, pages

    for a in soup.find_all("a", href=True):
        href = a["href"].strip()
        if href.lower().startswith("mailto:"):
            found = clean_email(href.split("mailto:", 1)[1].split("?")[0])
            if valid_email(found):
                emails.add(found)
        elif any(
            hint in href.lower() or hint in a.get_text(strip=True).lower()
            for hint in CONTACT_LINK_HINTS
        ):
            full = urljoin(website + "/", href)
            if urlparse(full).netloc and not is_social_url(full):
                contact_links.append(full)

    for found in EMAIL_REGEX.findall(resp.text):
        found = clean_email(found)
        if valid_email(found):
            emails.add(found)

    seen_pages: set[str] = set()
    for link in contact_links:
        if pages >= fetch_budget or len(seen_pages) >= 2:
            break
        if link in seen_pages:
            continue
        seen_pages.add(link)
        time.sleep(REQUEST_DELAY)
        try:
            resp = requests.get(link, headers={"User-Agent": USER_AGENT}, timeout=15)
            pages += 1
            for found in EMAIL_REGEX.findall(resp.text):
                found = clean_email(found)
                if valid_email(found):
                    emails.add(found)
        except Exception:
            continue

    return emails, pages


_MX_CACHE: dict[str, bool] = {}
_DNS_CACHE: dict[str, bool] = {}


def domain_resolves(domain: str) -> bool:
    if domain not in _DNS_CACHE:
        try:
            socket.getaddrinfo(domain, None)
            _DNS_CACHE[domain] = True
        except OSError:
            _DNS_CACHE[domain] = False
    return _DNS_CACHE[domain]


def mx_deliverable(domain: str) -> bool:
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


def email_status(email: str) -> str:
    domain = email.partition("@")[2]
    return "mx_ok" if mx_deliverable(domain) else "no_mx"


def dedupe_keys(lead: Lead) -> set[str]:
    keys = {f"osm:{lead.osm_id}"} if lead.osm_id else set()
    if lead.email:
        keys.add(f"email:{lead.email.lower()}")
    host = site_host(lead.website)
    if host:
        keys.add(f"domain:{host}")
    if lead.clinic:
        keys.add(f"name:{lead.clinic.lower().strip()}|{lead.city.lower().strip()}")
    return keys


# ---------------------------------------------------------------------------
# City scrape
# ---------------------------------------------------------------------------

@dataclass
class CityStats:
    city: str
    found: int = 0
    kept: int = 0
    skipped_known: int = 0
    skipped_no_email: int = 0
    skipped_chain: int = 0
    skipped_bad_mx: int = 0


def scrape_city(
    city: str,
    known: set[str],
    max_new: int,
    max_fetches: int,
    max_elements: int = 300,
) -> tuple[list[Lead], CityStats]:
    stats = CityStats(city=city)
    bbox = geocode_city(city)
    if not bbox:
        log(f"Error: could not geocode {city}")
        return [], stats

    elements = overpass_dentists(bbox, max_elements)
    stats.found = len(elements)
    businesses = build_businesses(elements, city)

    leads: list[Lead] = []
    fetches = 0

    for biz in businesses:
        if len(leads) >= max_new or fetches >= max_fetches:
            break

        email = clean_email(biz["email"])
        if not valid_email(email) and fetches < max_fetches:
            found, pages = fetch_emails(biz["website"], max_fetches - fetches)
            fetches += pages
            time.sleep(REQUEST_DELAY)
            ranked = rank_emails(found, site_host(biz["website"]))
            email = ranked[0] if ranked else ""

        if not email:
            stats.skipped_no_email += 1
            continue

        lead = Lead(
            clinic=biz["clinic"],
            city=biz["city"],
            phone=biz["phone"],
            website=biz["website"],
            email=email,
            email_status="",
            source="OpenStreetMap",
            osm_id=biz["osm_id"],
        )

        keys = dedupe_keys(lead)
        if keys & known:
            stats.skipped_known += 1
            continue

        lead.email_status = email_status(email)
        if lead.email_status == "no_mx":
            # A dead mailbox is worse than a missing row: it burns the domain.
            stats.skipped_bad_mx += 1
            continue

        known |= keys
        leads.append(lead)
        stats.kept += 1
        log(f"  + {lead.clinic} <{lead.email}>")

    return leads, stats
