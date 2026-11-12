# inodepi outreach pipeline

Low-volume, compliance-first B2B outreach: scrape startup leads, queue them, and send one templated email per weekday **directly from GitHub Actions via the Gmail API**. No Make.com, no n8n, no LLM in the send path.

## Flow

1. **`startup_scraper.py`** — pulls recent **YC batches** from the public company API, filters for small B2B/SaaS/AI-style startups, checks the company site is English, finds a **business email published on its own site**, and prepends qualified leads to `leads.json`.
2. **`outreach.py`** — pops one lead, renders a template from `templates/`, appends the compliance footer, sends through **Gmail API (OAuth)**, writes `sent.json`, and removes the lead from the queue.
3. **`unsubscribe_poller.py`** — reads unread `unsubscribe` mail from the same Gmail inbox, adds the sender to `suppressions.json`, replies with a canned confirmation, and marks the message read.
4. **`scrape_leads.yml`** — weekday cron: poll unsubscribes, scrape leads, send one email, auto-commit state.
5. **`unsubscribe_poller.yml`** — runs the poller every 15 minutes so opt-outs land quickly.

Everything runs **only inside GitHub Actions** — no Worker, server, Make, or n8n.

```
YC API -> startup_scraper.py -> leads.json -> outreach.py -> Gmail API
                                             |-> sent.json

Gmail inbox (subject: unsubscribe) -> unsubscribe_poller.py -> suppressions.json
```

### How people unsubscribe

Every email links to `https://inodepi.github.io/unsubscribe.html` (a `mailto:`
link with the subject pre-filled). The site form opens the visitor's mail app
with the request addressed to the sender. When it arrives, the poller adds that
From address (and any address named in the request body) to
`suppressions.json`, replies with a confirmation, and marks the mail read.
`outreach.py` checks `suppressions.json` before every send.

## Targets

- Recent YC batches (`YC_BATCHES`, default `W26,S26,W25,S25,W24,S24`).
- B2B / SaaS / AI / fintech / healthcare / marketplaces / dev tools and similar.
- Team size ≤ 80 (0 = unknown, allowed).
- **English-only sites** (`langdetect` + `<html lang>`).
- Country priority: **US (3) > UK (2) > Canada/Australia/Ireland/NZ/Singapore/India/Philippines/South Africa (1) > other English (0)**.
- Explicit-consent countries (Germany, Austria, Italy, Spain, Portugal, Poland, etc.) are skipped unless the lead carries `consent: true` — scraped leads never do.
- A lead needs a **public business email on its own domain**. Personal/free-mail addresses and social profiles are skipped.

## Compliance (CAN-SPAM + per-country)

Every email gets a footer that cannot be omitted by a template:

- Real sender name and business.
- **Physical postal address:** `480 Rubyville St, Baesa, Caloocan City, Philippines` (override with `SENDER_ADDRESS`).
- Clear **“This is a commercial outreach message…”** identification.
- **Opt-out:** reply "unsubscribe" or use the unsubscribe page link (no account or form service required).
- **Why you received this** + the source website.
- Suppression list checked before every send; hard bounces/complaints should be added to it.
- `sent.json` audit trail.

CAN-SPAM applies to US recipients; UK/EU rules are handled conservatively:
- UK/Ireland/Netherlands/Sweden/Finland/Denmark: B2B opt-out with the footer above.
- Countries requiring prior consent are skipped by default.
- This is not legal advice; review the EU approach before scaling.

## Setup

### 1. Gmail API OAuth

1. Create a Google Cloud project, enable **Gmail API**.
2. OAuth consent screen → External → add your Gmail as a test user, then **publish to Production** (otherwise refresh tokens expire every 7 days).
3. Create an OAuth client → **Desktop app**.
4. Generate a refresh token (requests both `gmail.send` and `gmail.modify`, so the poller can read and label mail):

```bash
GMAIL_CLIENT_ID=... GMAIL_CLIENT_SECRET=... python scripts/gmail_auth.py
```

Service accounts cannot send as a personal `@gmail.com` address (that needs Workspace domain-wide delegation), so this uses an OAuth refresh token. The poller needs `gmail.modify`; a token minted with only `gmail.send` cannot read the inbox — re-run the helper if you created one earlier.

### 2. GitHub Actions secrets

| Secret | Purpose |
| --- | --- |
| `GMAIL_SENDER` | The Gmail address that sends and receives opt-outs |
| `GMAIL_FROM_NAME` | Display name (default `Christian John Vallejos`) |
| `GMAIL_CLIENT_ID` | OAuth client id |
| `GMAIL_CLIENT_SECRET` | OAuth client secret |
| `GMAIL_REFRESH_TOKEN` | Long-lived refresh token (must include `gmail.modify`) |
| `UNSUBSCRIBE_EMAIL` | Optional; inbox the poller watches (defaults to `GMAIL_SENDER`) |
| `SENDER_NAME` | Optional; footer name |
| `SENDER_ADDRESS` | Optional override; defaults to the address above |
| `SCRAPER_USER_AGENT` | Identifies the scraper (YC/Nominatim etiquette) |

No `UNSUBSCRIBE_URL`, `UNSUBSCRIBE_SECRET`, `SUPPRESSIONS_URL`, or `SUPPRESSIONS_SECRET` are needed — suppression state lives in `suppressions.json`, committed by the Action.

## Commands

```bash
# Preview leads without writing
python startup_scraper.py --dry-run --max-leads 2 --batches W26

# Fill the queue
python startup_scraper.py --max-leads 3

# Render one email without sending
DRY_RUN=1 python outreach.py --dry-run

# Send one queued lead
python outreach.py

# Process unsubscribes (or validate config without touching Gmail)
python unsubscribe_poller.py --dry-run
```

## Files

- `startup_scraper.py` — YC lead source + qualification.
- `outreach.py` — Gmail API sender, templates, suppression, compliance.
- `unsubscribe_poller.py` — inbox poller, suppression update, confirmation replies.
- `templates/` — three startup variants + subjects.
- `scripts/gmail_auth.py` — one-time OAuth helper (send + modify scopes).
- `leads.json` / `seen_leads.json` / `sent.json` / `suppressions.json` / `unsubscribes.json` — state.
- `scraper.py`, `n8n-*`, `docs/cold-email-prompt.md` — legacy OSM/n8n flow, kept for reference.

## Notes

- Personal Gmail sending: 1/day is low, but unsolicited commercial mail is against Google’s terms and can affect the account. A dedicated Google account is safer.
- Gmail sending limits: ~500 recipients/day; this pipeline sends one.
- Start with a handful of sends, keep the copy specific, and honor every opt-out immediately.
