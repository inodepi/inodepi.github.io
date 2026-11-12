"""Daily clinic lead run.

Usage:
    python main.py --dry-run
    python main.py --city "Austin, Texas" --max-per-city 10
    python main.py --init-sheet

Environment:
    SHEET_ID                     Google Sheet ID (from the URL)
    GOOGLE_SERVICE_ACCOUNT_JSON  service-account key JSON
    TARGET_CITIES                comma-separated, default "Austin, Texas"
    MAX_NEW_PER_CITY             default 15
    MAX_FETCHES                  default 40 (website page fetches per city)
"""

from __future__ import annotations

import argparse
import os
import sys
import time

import scrape
import sheets


def env_int(name: str, default: int) -> int:
    raw = (os.getenv(name) or "").strip()
    if not raw:
        return default
    try:
        return int(raw)
    except ValueError:
        print(f"Warning: {name}={raw!r} is not a number; using {default}.")
        return default


def parse_args(argv: list[str]) -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Scrape dental clinics into a Google Sheet.")
    p.add_argument("--dry-run", action="store_true", help="print rows, write nothing")
    p.add_argument("--init-sheet", action="store_true", help="create tabs and headers, then exit")
    p.add_argument("--city", action="append", help='repeatable, e.g. --city "Austin, Texas" --city "Round Rock, Texas"')
    p.add_argument("--max-per-city", type=int, default=None)
    p.add_argument("--max-fetches", type=int, default=None)
    p.add_argument("--max-elements", type=int, default=300)
    p.add_argument("--limit", type=int, default=None, help="stop after N new leads total")
    return p.parse_args(argv)


def main(argv: list[str]) -> int:
    args = parse_args(argv)
    started = time.time()

    # City names contain commas ("Austin, Texas"), so the env list is semicolon separated.
    if args.city:
        cities = [c.strip() for c in args.city if c.strip()]
    else:
        cities = [
            c.strip()
            for c in (os.getenv("TARGET_CITIES") or "Austin, Texas").split(";")
            if c.strip()
        ]
    max_per_city = args.max_per_city or env_int("MAX_NEW_PER_CITY", 15)
    max_fetches = args.max_fetches or env_int("MAX_FETCHES", 40)
    dry_run = args.dry_run or os.getenv("DRY_RUN", "").lower() == "true"
    sheet_id = (os.getenv("SHEET_ID") or "").strip()

    leads_ws = runs_ws = None
    known: set[str] = set()

    if sheet_id and os.getenv("GOOGLE_SERVICE_ACCOUNT_JSON"):
        sh, client_email = sheets.client()
        print(f"Sheet client: {client_email or '(unknown)'}")
        spreadsheet = sheets.open_spreadsheet(sh, sheet_id)
        leads_ws, runs_ws = sheets.ensure_sheet(spreadsheet)
        if args.init_sheet:
            print(f"Tabs ready in '{spreadsheet.title}': {sheets.LEADS_TAB}, {sheets.RUNS_TAB}")
            return 0
        known = sheets.load_known(leads_ws)
        print(f"Loaded {len(known)} dedupe keys from the Sheet.")
    elif args.init_sheet:
        print("--init-sheet needs SHEET_ID and GOOGLE_SERVICE_ACCOUNT_JSON.")
        return 2

    totals = {
        "found": 0, "kept": 0, "skipped_known": 0,
        "skipped_no_email": 0, "skipped_bad_mx": 0,
    }
    new_leads = []
    attempted_cities = 0

    for city in cities:
        if args.limit and len(new_leads) >= args.limit:
            break
        attempted_cities += 1
        remaining = max_per_city
        if args.limit:
            remaining = min(remaining, args.limit - len(new_leads))
        if remaining <= 0:
            break

        leads, stats = scrape.scrape_city(
            city=city,
            known=known,
            max_new=remaining,
            max_fetches=max_fetches,
            max_elements=args.max_elements,
        )
        new_leads.extend(leads)
        totals["found"] += stats.found
        totals["kept"] += stats.kept
        totals["skipped_known"] += stats.skipped_known
        totals["skipped_no_email"] += stats.skipped_no_email
        totals["skipped_bad_mx"] += stats.skipped_bad_mx

        print(
            f"{city}: found={stats.found} kept={stats.kept} "
            f"known={stats.skipped_known} no_email={stats.skipped_no_email} "
            f"bad_mx={stats.skipped_bad_mx}"
        )

    rows = [lead.row() for lead in new_leads]
    totals["added"] = 0

    if dry_run:
        print("\nDRY RUN — nothing written.\n")
        for row in rows:
            print(" | ".join(row[:6]))
        print(f"\n{len(rows)} row(s) would be appended.")
    else:
        totals["added"] = sheets.append_leads(leads_ws, rows)
        sheets.log_run(runs_ws, cities, totals, time.time() - started)
        print(f"Appended {totals['added']} row(s) to '{sheets.LEADS_TAB}'.")

    print(
        f"Done in {time.time() - started:.0f}s — "
        f"found={totals['found']} kept={totals['kept']} added={totals['added']}"
    )

    if attempted_cities and totals["found"] == 0:
        print("Error: every city returned zero clinics (geocoding or Overpass failed).")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
