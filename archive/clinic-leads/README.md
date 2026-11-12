# clinic-leads

Scrapes independent dental clinics in a city and appends them to a Google Sheet, once a day, from GitHub Actions.

The Sheet is both the lead list and the CRM. The script owns columns A–I; columns J–P are yours and are never touched.

**It does not send email and it does not place calls.** No paid APIs, no keys except Google.

## What a row looks like

| A | B | C | D | E | F | G | H | I |
|---|---|---|---|---|---|---|---|---|
| Clinic | City | Phone | Website | Email | Email status | Source | OSM ID | Added |

Manual columns, yours to fill: `Review quote`, `Audit note`, `Contacted`, `Reply`, `Call booked`, `Pilot`, `Notes`.

A second tab, `Runs`, logs every execution: cities, found, kept, added, skipped, duration.

## Setup (15 minutes)

1. **Create the Sheet.** New Google Sheet, copy the ID from the URL:
   `docs.google.com/spreadsheets/d/`**`THIS_PART`**`/edit`
2. **Create a service account.** In Google Cloud Console: new project → enable **Google Sheets API** → IAM & Admin → Service Accounts → create → Keys → Add key → JSON. Download it.
3. **Share the Sheet** with the service account's `client_email` (looks like `name@project.iam.gserviceaccount.com`) as **Editor**.
4. **Add the secret and variable** (repo → Settings → Secrets and variables → Actions):
   ```bash
   gh secret set GOOGLE_SERVICE_ACCOUNT_JSON < service-account.json
   gh variable set SHEET_ID --body "1AbC..."
   gh variable set TARGET_CITIES --body "Austin, Texas"
   ```
5. **Initialize the tabs**, then do one dry run:
   ```bash
   SHEET_ID=... GOOGLE_SERVICE_ACCOUNT_JSON="$(cat service-account.json)" python main.py --init-sheet
   python main.py --dry-run
   ```
6. **Run it from GitHub:** Actions → *Daily clinic leads* → Run workflow.

The schedule is 13:00 UTC, Monday–Friday.

## Local use

```bash
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
cp .env.example .env            # fill in
export $(grep -v '^#' .env | xargs)
.venv/bin/python main.py --dry-run
.venv/bin/python main.py --city "Round Rock, Texas" --max-per-city 10
.venv/bin/python main.py --city "Austin, Texas" --city "Round Rock, Texas"
.venv/bin/python -m unittest discover -s tests -t .
```

## Tuning

| Env / input | Default | Notes |
|---|---|---|
| `TARGET_CITIES` | `Austin, Texas` | Semicolon separated: `Austin, Texas; Round Rock, Texas` |
| `MAX_NEW_PER_CITY` | `15` | Stops after N kept leads |
| `MAX_FETCHES` | `40` | Website page fetches per city |
| `MAX_ELEMENTS` | `300` | Overpass results considered per city |
| `SCRAPE_DELAY_SECONDS` | `1.0` | Politeness delay |

Raise volume slowly. 15–25 new clinics per city per day is plenty: 60 emails is the realistic ceiling before Gmail starts throttling you.

## Filters (why the list is short)

Rows are dropped when:

- the clinic is a **chain** (`Aspen Dental`, `Western Dental`, …) — corporate groups answer their own phones
- **no email** was found on the clinic's own site
- the email domain has **no MX record** — a guaranteed bounce that burns your sender reputation
- the clinic is already in the Sheet (matched on OSM ID, email, domain, or name+city)

## Data sources

- **OpenStreetMap / Overpass** — free, no key, ODbL. Attribution required if you republish the data: `© OpenStreetMap contributors`.
- **Nominatim / Photon** — free geocoding. Set `SCRAPER_USER_AGENT` with real contact info.
- **Clinic websites** — only public pages, only emails the clinic publishes itself, 1s delay.

## Compliance

Only public business contact details are collected. Cold email in the US is legal under CAN-SPAM **with** a real physical address and a working opt-out in every message. Do not send from the Sheet until both are in the template. See the sprint note for templates.

## Layout

```
main.py            CLI + orchestration
scrape.py          OSM, email enrichment, MX gate, dedupe keys
sheets.py          Google Sheets client, tabs, append, run log
tests/             pure-function contract tests
.github/workflows/daily.yml
```
