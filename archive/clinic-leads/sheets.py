"""Google Sheets I/O. The Sheet is the database and the CRM.

Columns A:I are owned by this script. Columns J:P are yours — the script never
writes or clears them. Never reorder the columns; append new ones at the right.
"""

from __future__ import annotations

import json
import os
import time
from datetime import datetime, timezone

import gspread
from google.oauth2.service_account import Credentials

SCOPES = ["https://www.googleapis.com/auth/spreadsheets"]

LEADS_TAB = os.getenv("LEADS_TAB") or "Leads"
RUNS_TAB = os.getenv("RUNS_TAB") or "Runs"

# A:I are machine-owned. J:P are manual.
HEADERS = [
    "Clinic", "City", "Phone", "Website", "Email", "Email status",
    "Source", "OSM ID", "Added",
    "Review quote", "Audit note", "Contacted", "Reply",
    "Call booked", "Pilot", "Notes",
]
SCRIPT_COLUMNS = 9

RUN_HEADERS = [
    "Run at", "Cities", "Found", "Kept", "Added",
    "Known", "No email", "Bad MX", "Seconds",
]


def client():
    raw = (os.environ.get("GOOGLE_SERVICE_ACCOUNT_JSON") or "").strip()
    if not raw:
        raise SystemExit(
            "GOOGLE_SERVICE_ACCOUNT_JSON is empty.\n"
            "Set it to the service-account key JSON, or run with --dry-run."
        )
    try:
        info = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise SystemExit(f"GOOGLE_SERVICE_ACCOUNT_JSON is not valid JSON: {exc}")

    creds = Credentials.from_service_account_info(info, scopes=SCOPES)
    return gspread.authorize(creds), info.get("client_email", "")


def open_spreadsheet(sh, sheet_id: str):
    if not sheet_id:
        raise SystemExit("SHEET_ID is empty. Copy it from the Sheet URL.")
    try:
        return sh.open_by_key(sheet_id)
    except gspread.SpreadsheetNotFound:
        raise SystemExit(
            f"Sheet {sheet_id} not found.\n"
            "Share it with the service account (paste client_email as Editor),\n"
            "and check that the Sheets API is enabled in the Google Cloud project."
        )


def _tab(spreadsheet, title: str, headers: list[str]):
    try:
        ws = spreadsheet.worksheet(title)
    except gspread.WorksheetNotFound:
        ws = spreadsheet.add_worksheet(
            title=title, rows=1000, cols=max(len(headers), 16)
        )
        ws.update(values=[headers], range_name="A1", value_input_option="RAW")
        try:
            ws.format(
                f"{_col(len(headers))}1",
                {"textFormat": {"bold": True}},
            )
            ws.freeze(rows=1)
        except Exception:
            pass  # cosmetic only
    return ws


def _col(index: int) -> str:
    """1-based column index -> letter."""
    out = ""
    while index > 0:
        index, rem = divmod(index - 1, 26)
        out = chr(65 + rem) + out
    return out


def ensure_sheet(spreadsheet):
    leads = _tab(spreadsheet, LEADS_TAB, HEADERS)
    runs = _tab(spreadsheet, RUNS_TAB, RUN_HEADERS)
    return leads, runs


def load_known(leads_ws) -> set[str]:
    """Read the Sheet and rebuild the dedupe key set."""
    known: set[str] = set()
    for row in leads_ws.get_all_values()[1:]:
        row = row + [""] * (len(HEADERS) - len(row))
        clinic, city, website, email, osm_id = row[0], row[1], row[3], row[4], row[7]
        if osm_id:
            known.add(f"osm:{osm_id}")
        if email:
            known.add(f"email:{email.lower().strip()}")
        if website:
            host = website.lower().replace("https://", "").replace("http://", "")
            host = host.split("/")[0]
            if host.startswith("www."):
                host = host[4:]
            if host:
                known.add(f"domain:{host}")
        if clinic:
            known.add(f"name:{clinic.lower().strip()}|{city.lower().strip()}")
    return known


def append_leads(leads_ws, rows: list[list[str]]) -> int:
    if not rows:
        return 0
    for attempt in range(3):
        try:
            leads_ws.append_rows(rows, value_input_option="RAW", table_range="A1")
            return len(rows)
        except gspread.exceptions.APIError as exc:
            if attempt == 2:
                raise
            print(f"Sheets API error ({exc}); retrying in 5s...")
            time.sleep(5)
    return 0


def log_run(runs_ws, cities: list[str], totals: dict, seconds: float) -> None:
    row = [
        datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC"),
        "; ".join(cities),
        totals.get("found", 0),
        totals.get("kept", 0),
        totals.get("added", 0),
        totals.get("skipped_known", 0),
        totals.get("skipped_no_email", 0),
        totals.get("skipped_bad_mx", 0),
        f"{seconds:.0f}",
    ]
    try:
        runs_ws.append_rows([row], value_input_option="RAW", table_range="A1")
    except Exception as exc:
        print(f"Could not write run log: {exc}")
