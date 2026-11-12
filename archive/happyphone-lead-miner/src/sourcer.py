import os
import re
import csv
import json
import html
import time
import sys
import datetime
from urllib.parse import urlparse

import requests

CONFIG_FILE = "config/sourcing.json"
STATE_FILE = "sourcing_state.json"
TRACKER_FILE = "processed_domains.csv"
INPUT_FILE = "incoming_targets.json"

UA = "happyphone-lead-miner/1.0 (GitHub Actions; contact via repo owner)"
S = requests.Session()
S.headers.update({"User-Agent": UA, "Accept-Language": "en-US,en;q=0.9"})

CATEGORY_PATTERNS = {
    "plumber": "plumb",
    "electrician": "electric",
    "roofing": "roof",
    "hvac": "hvac|heating|air conditioning",
    "dentist": "dentist|dental",
    "landscaping": "landscap|lawn",
    "auto repair": "auto repair|automotive|mechanic",
    "salon": "salon|hair",
}

SKIP_DOMAINS = {
    "facebook.com", "instagram.com", "twitter.com", "x.com", "linkedin.com",
    "youtube.com", "tiktok.com", "yelp.com", "yellowpages.com", "google.com",
    "angi.com", "bbb.org", "mapquest.com", "foursquare.com", "tripadvisor.com",
    "nextdoor.com", "wikipedia.org", "localsearch.com", "superpages.com",
    "dexknows.com", "citysearch.com", "chamberofcommerce.com", "hotfrog.com",
    "manta.com", "cylex.us.com", "yellowbot.com", "merchantcircle.com",
}


def normalize_domain(href):
    if not href:
        return None
    href = html.unescape(href.strip())
    if href.startswith("//"):
        href = "https:" + href
    elif not re.match(r"^https?://", href, re.I):
        href = "http://" + href
    try:
        host = urlparse(href).netloc.lower().split(":")[0]
    except Exception:
        return None
    if host.startswith("www."):
        host = host[4:]
    if "." not in host or " " in host:
        return None
    for bad in SKIP_DOMAINS:
        if host == bad or host.endswith("." + bad):
            return None
    return host


def load_seen():
    seen = set()
    if os.path.exists(TRACKER_FILE):
        with open(TRACKER_FILE, "r", encoding="utf-8", errors="replace") as f:
            for line in f.readlines()[1:]:
                cell = line.split(",")[0].strip().lower()
                if cell:
                    seen.add(cell)
    if os.path.exists(INPUT_FILE):
        try:
            with open(INPUT_FILE, "r") as f:
                queued = json.load(f)
            for item in queued if isinstance(queued, list) else []:
                d = item.get("domain") if isinstance(item, dict) else item
                if d:
                    seen.add(str(d).strip().lower())
        except Exception:
            pass
    return seen


def load_state():
    try:
        with open(STATE_FILE, "r") as f:
            state = json.load(f)
        return {
            "pair_index": int(state.get("pair_index", 0)),
            "page": max(1, int(state.get("page", 1))),
            "cycle": int(state.get("cycle", 1)),
        }
    except Exception:
        return {"pair_index": 0, "page": 1, "cycle": 1}


def save_state(state):
    with open(STATE_FILE, "w") as f:
        json.dump(state, f, indent=1)


def fetch_yellowpages_page(term, city, page, timeout):
    """Returns (listings, has_more). YP pages hold ~30 businesses."""
    out = []
    try:
        r = S.get(
            "https://www.yellowpages.com/search",
            params={"search_terms": term, "geo_location_terms": city, "page": page},
            timeout=timeout,
            headers={"Accept": "text/html,application/xhtml+xml"},
        )
        if r.status_code != 200:
            print(f"  yp {term}/{city} p{page}: HTTP {r.status_code}")
            return out, False
    except requests.RequestException as e:
        print(f"  yp {term}/{city} p{page}: {e.__class__.__name__}")
        return out, False

    for block in r.text.split('class="result"')[1:]:
        site = re.search(r'<a[^>]*class="track-visit-website"[^>]*href="([^"]+)"', block)
        if not site:
            site = re.search(r'<a[^>]*href="([^"]+)"[^>]*class="track-visit-website"', block)
        if not site:
            continue
        href = site.group(1)
        if "yellowpages.com" in href:
            continue
        domain = normalize_domain(href)
        if not domain:
            continue
        name_m = re.search(r'class="business-name"[^>]*>([^<]+)<', block)
        phone_m = re.search(r'class="phones phone primary">([^<]+)<', block)
        out.append({
            "domain": domain,
            "company_name": html.unescape(name_m.group(1)).strip() if name_m else "",
            "listing_phone": html.unescape(phone_m.group(1)).strip() if phone_m else "",
            "city": city,
            "category": term,
            "source": "yellowpages",
        })
    return out, len(out) > 0


def geocode(city, timeout):
    q = city if "usa" in city.lower() else f"{city}, USA"
    try:
        r = S.get(
            "https://nominatim.openstreetmap.org/search",
            params={"q": q, "format": "json", "limit": 1},
            timeout=timeout,
        )
        if r.status_code != 200 or not r.json():
            return None
        south, north, west, east = r.json()[0]["boundingbox"]
        return f"{south},{west},{north},{east}"
    except Exception as e:
        print(f"  geocode {city}: {e.__class__.__name__}")
        return None


def fetch_overpass(term, city, timeout):
    out = []
    bbox = geocode(city, timeout)
    if not bbox:
        print(f"  osm {term}/{city}: no bbox")
        return out
    pattern = CATEGORY_PATTERNS.get(term.lower(), term.split()[0])
    query = (
        f'[out:json][timeout:45];'
        f'nwr["website"]["name"~"{pattern}",i]({bbox});'
        f'out tags 80;'
    )
    data = None
    for attempt in range(3):
        try:
            r = S.post(
                "https://overpass-api.de/api/interpreter",
                data={"data": query},
                timeout=max(timeout, 45),
            )
            if r.status_code == 200:
                data = r.json()
                break
            print(f"  osm {term}/{city}: HTTP {r.status_code} (try {attempt + 1})")
        except requests.RequestException as e:
            print(f"  osm {term}/{city}: {e.__class__.__name__} (try {attempt + 1})")
        time.sleep(5)
    if data is None:
        return out

    for el in data.get("elements", []):
        tags = el.get("tags") or {}
        website = tags.get("website") or tags.get("contact:website")
        domain = normalize_domain(website) if website else None
        if not domain:
            continue
        out.append({
            "domain": domain,
            "company_name": tags.get("name", ""),
            "listing_phone": tags.get("phone") or tags.get("contact:phone") or "",
            "city": city,
            "category": term,
            "source": "overpass",
        })
    return out


def prune_healthy(days):
    """Drop Healthy rows older than the re-check window so they get re-scanned.
    Broken leads are never pruned."""
    if not os.path.exists(TRACKER_FILE):
        return 0
    with open(TRACKER_FILE, "r", encoding="utf-8", errors="replace", newline="") as f:
        reader = csv.DictReader(f)
        fieldnames = reader.fieldnames or []
        rows = list(reader)
    if not rows:
        return 0
    cutoff = (datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=days)).date().isoformat()

    def keep(row):
        if row.get("error_type") != "Healthy":
            return True
        checked = (row.get("checked_at") or "").strip()
        return bool(checked) and checked >= cutoff

    kept = [r for r in rows if keep(r)]
    pruned = len(rows) - len(kept)
    if pruned:
        with open(TRACKER_FILE, "w", encoding="utf-8", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(kept)
    return pruned


def main():
    with open(CONFIG_FILE, "r") as f:
        cfg = json.load(f)

    cities = cfg.get("cities") or []
    categories = cfg.get("categories") or []
    sources = cfg.get("sources") or ["overpass", "yellowpages"]
    pages_per_run = int(cfg.get("pages_per_run", 6))
    max_new = int(cfg.get("max_new_per_run", 60))
    timeout = int(cfg.get("timeout_seconds", 20))
    recheck_days = int(cfg.get("healthy_recheck_days", 7))

    pairs = [(city, term) for city in cities for term in categories]
    if not pairs:
        print("No city/category pairs configured. Nothing to source.")
        return

    state = load_state()
    pair_i = state["pair_index"] % len(pairs)
    page = state["page"]
    start_cycle = state["cycle"]
    cycle_completed = False

    seen = load_seen()
    found = []
    pages_used = 0

    print(f"Cursor: pair {pair_i + 1}/{len(pairs)}, page {page}, cycle {state['cycle']}")

    while pages_used < pages_per_run and len(found) < max_new:
        city, term = pairs[pair_i]
        if "yellowpages" in sources:
            batch, has_more = fetch_yellowpages_page(term, city, page, timeout)
            added = 0
            for item in batch:
                d = item["domain"].lower()
                if d in seen:
                    continue
                seen.add(d)
                found.append(item)
                added += 1
            pages_used += 1
            print(f"  yp {city}/{term} p{page}: {len(batch)} listings, +{added} new")
            if not has_more or added == 0:
                # Pair walked dry (or fully known): advance the cursor.
                pair_i += 1
                page = 1
                if pair_i >= len(pairs):
                    pair_i = 0
                    cycle_completed = True
                time.sleep(2)
                continue
            page += 1
            time.sleep(2)

        if "overpass" in sources and len(found) < max_new:
            batch = fetch_overpass(term, city, timeout)
            for item in batch:
                d = item["domain"].lower()
                if d in seen:
                    continue
                seen.add(d)
                found.append(item)
            print(f"  osm {city}/{term}: +{len(batch)} candidates")

    save_state({"pair_index": pair_i, "page": page, "cycle": start_cycle + (1 if cycle_completed else 0)})

    if not found:
        print("No new targets found this run.")
    else:
        existing = []
        if os.path.exists(INPUT_FILE):
            try:
                with open(INPUT_FILE, "r") as f:
                    existing = json.load(f)
                if not isinstance(existing, list):
                    existing = []
            except Exception:
                existing = []
        merged = existing + found[:max_new]
        with open(INPUT_FILE, "w") as f:
            json.dump(merged, f, indent=1)
        print(f"Queue now holds {len(merged)} targets (+{min(len(found), max_new)} new).")

    if cycle_completed:
        pruned = prune_healthy(recheck_days)
        print(f"Cycle {start_cycle} complete -> pruned {pruned} Healthy rows older than {recheck_days}d for re-check.")


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        # Sourcing is best-effort: never block the miner.
        print(f"Sourcer failed, continuing with existing queue: {e}")
        sys.exit(0)
