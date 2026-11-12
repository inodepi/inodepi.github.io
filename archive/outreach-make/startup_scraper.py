"""Scrape startup leads from the public YC company directory.

Sources a recent batch, filters for B2B/SaaS/AI-style companies that look
like they have manual operations, then looks for a business email published
on the company's own website. Everything is deduped against the queue and
seen_leads.json; nothing is guessed or pattern-matched.
"""

from __future__ import annotations

import argparse
import os
import re
import sys
import time
from datetime import datetime, timezone
from urllib.parse import urlparse

import requests
from bs4 import BeautifulSoup
from langdetect import DetectorFactory, detect

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import scraper  # reuse email discovery/validation + queue helpers
from outreach import load_queue, save_queue

DetectorFactory.seed = 0

YC_API = "https://api.ycombinator.com/v0.1/companies"
DEFAULT_BATCHES = os.getenv("YC_BATCHES", "W26,S26,W25,S25,W24,S24")
MAX_LEADS = int(os.getenv("MAX_NEW_LEADS", "3"))
MAX_SITE_FETCHES = int(os.getenv("MAX_SITE_FETCHES", "4"))

TARGET_INDUSTRIES = {
    "b2b", "saas", "ai", "developer tools", "fintech", "healthcare",
    "marketplaces", "productivity", "enterprise", "hr", "legal",
    "real estate", "logistics", "consumer", "education",
}

# Countries whose ePrivacy rules normally require prior opt-in. Scraped
# leads have no consent, so they are skipped.
CONSENT_REQUIRED = {
    "germany", "austria", "italy", "spain", "portugal", "poland",
    "belgium", "greece", "croatia", "cyprus", "czechia", "hungary",
    "lithuania", "luxembourg", "malta", "romania", "slovakia", "slovenia",
    "bulgaria", "estonia", "latvia",
}

FREE_MAIL = {"gmail.com", "googlemail.com", "outlook.com", "hotmail.com", "yahoo.com",
             "icloud.com", "proton.me", "protonmail.com", "aol.com", "mail.com"}


def get_json(url: str, params: dict):
    resp = requests.get(url, params=params, headers={"User-Agent": scraper.USER_AGENT}, timeout=25)
    resp.raise_for_status()
    return resp.json()


def country_and_priority(company: dict) -> tuple[str, int]:
    regions = " ".join(company.get("regions") or []).lower()
    locations = " ".join(company.get("locations") or []).lower()
    haystack = regions + " " + locations

    if "united states" in haystack or "america / canada" in haystack and "canada" not in haystack:
        return "United States", 3
    if "united kingdom" in haystack or "london" in haystack:
        return "United Kingdom", 2
    for name in ("canada", "australia", "ireland", "new zealand", "singapore", "india", "philippines", "south africa"):
        if name in haystack:
            return name.title(), 1
    for name in CONSENT_REQUIRED:
        if name in haystack:
            return name.title(), -1
    return "", 0


def is_english(website: str) -> bool:
    try:
        resp = requests.get(website, headers={"User-Agent": scraper.USER_AGENT}, timeout=15)
        soup = BeautifulSoup(resp.text, "html.parser")
        lang = (soup.html.get("lang") if soup.html else "") or ""
        text = " ".join(soup.get_text(" ", strip=True).split())[:3000]
        if len(text) < 120:
            return lang.lower().startswith("en")
        return detect(text) == "en"
    except Exception:
        return False


def business_email(website: str) -> str:
    host = urlparse(website).netloc.lower().removeprefix("www.")
    if not host or scraper.is_social_url(website):
        return ""
    emails, _ = scraper.fetch_emails_from_site(website, MAX_SITE_FETCHES)
    usable = []
    for email in emails:
        if not scraper.valid_email(email):
            continue
        domain = email.partition("@")[2]
        if domain in FREE_MAIL:
            continue
        if domain == host or domain.endswith("." + host) or host.endswith("." + domain):
            usable.append(email)
    for email in scraper.rank_emails(usable, host):
        if scraper.mx_deliverable(email.partition("@")[2]):
            return email
    return ""


def load_batch(batch: str) -> list[dict]:
    out = []
    page = 1
    while page <= 3:
        try:
            data = get_json(YC_API, {"batch": batch, "page": page})
        except Exception as exc:  # noqa: BLE001
            print(f"YC batch {batch} page {page} failed: {exc}")
            break
        companies = data.get("companies") or []
        out.extend(companies)
        if page >= int(data.get("totalPages") or 1):
            break
        page += 1
    return out


def qualifies(company: dict) -> bool:
    if (company.get("status") or "").lower() != "active":
        return False
    size = int(company.get("teamSize") or 0)
    if size and size > 80:
        return False
    industries = {str(i).lower() for i in company.get("industries") or []}
    return bool(industries & TARGET_INDUSTRIES)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--max-leads", type=int, default=MAX_LEADS)
    parser.add_argument("--batches", default=DEFAULT_BATCHES)
    args = parser.parse_args(argv)

    batches = [b.strip() for b in args.batches.split(",") if b.strip()]
    candidates = []
    for batch in batches:
        companies = load_batch(batch)
        print(f"{batch}: {len(companies)} companies")
        for company in companies:
            if qualifies(company):
                country, priority = country_and_priority(company)
                if priority < 0:
                    continue
                candidates.append((priority, company, country))

    candidates.sort(key=lambda row: row[0], reverse=True)
    print(f"{len(candidates)} startup candidates after industry/size filter")

    queue = load_queue()
    seen = scraper.load_seen()
    added = []
    fetches = 0

    for priority, company, country in candidates:
        if len(added) >= args.max_leads or fetches >= args.max_leads * MAX_SITE_FETCHES:
            break
        website = scraper.normalize_url(company.get("website") or "")
        if not website or scraper.is_social_url(website):
            continue
        if not is_english(website):
            continue
        email = business_email(website)
        fetches += 1
        if not email:
            continue

        lead = {
            "business_name": company.get("name"),
            "website": website,
            "email": email,
            "contact_name": "",
            "niche": ", ".join(company.get("industries") or []),
            "one_liner": company.get("oneLiner") or "",
            "source": "Y Combinator",
            "yc_batch": company.get("batch"),
            "yc_url": company.get("url"),
            "country": country,
            "priority": priority,
            "signal": "hiring" if "isHiring" in (company.get("badges") or []) else "launch",
            "email_source_url": website,
            "scraped_at": datetime.now(timezone.utc).isoformat(),
        }
        if scraper.already_known(lead, seen, queue + added):
            continue
        added.append(lead)
        for key in scraper.lead_keys(lead):
            seen[key] = datetime.now(timezone.utc).isoformat()
        print(f"+ {lead['business_name']} <{email}> [{country or 'unscored'}, {lead['signal']}]")
        time.sleep(scraper.REQUEST_DELAY)

    if args.dry_run:
        print(f"Dry run — {len(added)} lead(s) found, nothing written.")
        return 0

    if added:
        save_queue(queue + added if isinstance(queue, list) else added)
        scraper.save_seen(seen)
        print(f"Added {len(added)} startup lead(s) to {scraper.LEADS_FILE}.")
    else:
        print("No new startup leads found.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
