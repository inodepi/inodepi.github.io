# 🤖 Potaterrr Automated Outreach Pipeline

A hyper-targeted, low-volume B2B cold outreach pipeline that runs on free, self-hosted tooling (n8n on localhost), maximizing personalization and conversion rates.

This repository automates a low-volume drip campaign (default cap: **20 sends/day**), integrating a real-lead scraper, Python, GitHub Actions, a self-hosted n8n webhook, an LLM copywriter (OpenRouter or Gemini), Gmail delivery, and Telegram notifications.

> 💡 **Low-volume by design:** scraping and sending are separate steps. `scraper.py` only *fills* the queue (free sources); `outreach.py` sends up to `OUTREACH_DAILY_LIMIT` leads per run — **and every send is verified** against n8n's executions API before the lead leaves the queue.

---

## 🏗️ Architecture & Flow

1. **Queue Management (`leads.json`)**: Stores your target prospect list locally within the repository.
2. **Lead Scraper (`scraper.py`)**: Finds **real** local businesses via the OpenStreetMap Overpass API (free, no API key), **filtered to your target industries** (B2B tech/SaaS, agencies, professional services, e-commerce/D2C, staffing/HR, CRE, logistics — override via the `TARGET_INDUSTRIES` env var), enriches them with emails the businesses publish on their own websites, validates the emails (including an **MX-record deliverability check** so domains that can't receive mail never enter the queue), dedupes against past runs (`seen_leads.json`), and prepends new leads to the queue. Cities are geocoded via Nominatim with an automatic **Photon (komoot) fallback**. Configured via env vars: `TARGET_CITY`, `TARGET_INDUSTRIES`, `MAX_NEW_LEADS` (default 5), `MAX_SITE_FETCHES`, `SCRAPER_USER_AGENT`.
3. **Automation Engine (`outreach.py`)**: Pops leads off the queue, POSTs each to your self-hosted n8n webhook, then **verifies delivery** by polling n8n's executions API until the Gmail send (and Telegram alert) actually ran. Results are recorded in `sent_log.json`; leads only leave the queue on confirmed delivery.
4. **Scheduler (`scrape_leads.yml`)**: A GitHub Actions workflow (weekday cron at 09:00 UTC + manual trigger) running on a **self-hosted runner** on the same machine as n8n — so `localhost:5678` works with no tunnel.
5. **State Persistence (`git-auto-commit-action`)**: Automatically commits updated `leads.json` and `sent_log.json` back to the repository.
6. **Execution & Delivery**: n8n captures the webhook payload, checks the Google Sheets **suppression list**, generates the email with an LLM, **sends it directly via Gmail**, and pings you on **Telegram**. See **[n8n-setup.md](n8n-setup.md)** for the full walkthrough — import `n8n-workflow.json` into your local n8n.

---

## 📂 Repository Structure

```text
├── .github/
│   └── workflows/
│       └── scrape_leads.yml    # GitHub Actions cron scheduler & runner (self-hosted)
├── scraper.py                  # Real-lead scraper (OpenStreetMap + public site emails)
├── outreach.py                 # Queue sender with per-send delivery verification
├── leads.json                  # Active lead queue database
├── seen_leads.json             # Dedup memory: businesses/emails already scraped
├── sent_log.json               # Per-lead send results (delivered/suppressed/failed)
├── pruned_leads.json           # Audit trail: leads removed by industry/MX pruning
├── prune_queue.py              # Utility: prune non-industry / no-MX leads from the queue
├── .env.example                # Template for local config (copy to .env)
├── n8n-setup.md                # Step-by-step n8n (localhost) setup guide
├── n8n-workflow.json           # Importable n8n workflow (Webhook → Sheets → LLM → Gmail → Telegram)
└── README.md                   # Project documentation
```

---

## 💻 Running it on your laptop

Everything runs on your machine: n8n in Docker, Python in a venv, no tunnels needed.

### 1. Start n8n

```bash
docker run -d --name n8n -p 5678:5678 -v n8n_data:/home/node/.n8n docker.n8n.io/n8nio/n8n
# or your own compose setup; then open http://localhost:5678
```

### 2. Import the workflow

1. n8n → **Workflows → Import from File** → select `n8n-workflow.json` from this repo.
2. Attach credentials to each marked node (details in **[n8n-setup.md](n8n-setup.md)**):
   - **Check Suppression List** → Google Service Account credential + your opt-out spreadsheet (needs an `email` column)
   - **AI Model (OpenRouter)** → OpenRouter credential (or swap in a Gemini node with a valid API key)
   - **Send Gmail Email** → Gmail OAuth2 credential (re-authorize if executions say "needs to be reconnected")
   - **Telegram Alert** → Telegram bot credential + your chat ID
3. Toggle the workflow **Active**.

### 3. Set up Python

```bash
cd ~/git-projects/outreach-n8n
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
```

### 4. Create your `.env`

```bash
cp .env.example .env   # then edit .env
```

Minimum required:

```ini
N8N_BASE_URL=http://localhost:5678
N8N_WEBHOOK_URL=http://localhost:5678/webhook/outreach-lead
N8N_API_KEY=<n8n → Settings → n8n API → Create API key>
```

Optional pacing + compliance (see `.env.example` for the full list): `OUTREACH_DAILY_LIMIT`, `BATCH_DELAY_SECONDS`, `UNSUBSCRIBE_URL`, `SENDER_NAME`, `SENDER_ADDRESS`.

### 5. Run it

```bash
source .venv/bin/activate

# Scrape leads (free) — preview first:
python scraper.py --city "Austin, Texas" --dry-run
python scraper.py --city "Austin, Texas" --max-leads 5

# Send — preview the plan first:
python outreach.py --dry-run

# Send up to 3 leads (each verified as delivered before the next):
python outreach.py --max 3

# Or just run to the daily limit:
python outreach.py
```

What you should see per lead:

```
Sending: Dana Bazaar Indian Supermarket <support@danabazaarsupermarket.com>
  ✅ Delivered (execution 178). 37 lead(s) left.
Job finished. sent=1 suppressed=0 sent_today=8/20 queue=37
```

...plus the email in Gmail and a Telegram ping.

---

## ⚙️ GitHub Actions (optional)

The repo includes a workflow (`.github/workflows/scrape_leads.yml`, weekdays 09:00 UTC) that scrapes, then runs `outreach.py --max 20` — all on a **self-hosted runner** so it can reach `localhost:5678`. Manual triggers from the Actions tab support `city`, `max_leads`, and `dry_run` inputs.

To use it:
1. Install a runner on the same machine as n8n (GitHub → repo → **Settings → Actions → Runners → New self-hosted runner**), then `./run.sh` (or `./svc.sh install && ./svc.sh start` with sudo for a boot-persistent service).
2. Set the repo secrets listed in the table below.
3. Trigger: **Actions → Daily Outreach Pipeline → Run workflow** (`dry_run=true` first).

Local runs and CI runs share the same queue via git: CI commits `leads.json` / `sent_log.json` after each run; `git pull` before working locally.

| Secret | Purpose |
| --- | --- |
| `N8N_WEBHOOK_URL` | Your n8n production webhook URL (`http://localhost:5678/webhook/outreach-lead` on a self-hosted runner) |
| `N8N_BASE_URL` | n8n root URL, for delivery verification (`http://localhost:5678`) |
| `N8N_API_KEY` | n8n API key so `outreach.py` can verify each send via the executions API |
| `UNSUBSCRIBE_URL` | Opt-out link merged into every email |
| `UNSUBSCRIBE_TEXT` | Link text (default "Unsubscribe") |
| `SENDER_NAME` | Your name, used as the human sender |
| `SENDER_BUSINESS_NAME` | Your business name in the signature |
| `SENDER_ADDRESS` | Your physical postal address (required by CAN-SPAM) |
| `GOOGLE_SA_KEY_B64` | Base64 of the Google service-account JSON that can write the leads sheet (optional) |
| `LEADS_SHEET_ID` | Google Sheet ID the scraper appends scraped leads to (optional) |

---

## 🧑‍💼 Adding leads to the queue

`outreach.py` sends **real prospects only** — it no longer generates fake/random data. Add your researched leads to `leads.json` (the script always processes the lead at the top of the list):

```json
[
  {
    "business_name": "Lighthouse Analytics",
    "website": "https://lighthouseanalytics.io",
    "contact_name": "Dana Ruiz",
    "email": "dana@lighthouseanalytics.io",
    "niche": "B2B Tech & Software (SaaS)",
    "source": "Manual research",
    "notes": "Pricing page missing; demo form routes to a generic info@ inbox."
  }
]
```

Stick to the target industries the scraper uses (SaaS, agencies, consulting/training, e-commerce/D2C, staffing/HR, CRE, logistics) — leads outside them get pruned by `prune_queue.py`.

Only `email` is strictly required, but the more context you provide, the better the LLM's hook generation performs.

### Running the scraper yourself

```bash
# Preview without writing anything:
python scraper.py --city "Denver, Colorado" --dry-run

# Scrape up to 10 real leads into leads.json:
python scraper.py --city "Denver, Colorado" --max-leads 10
```

Env vars: `TARGET_CITY` (default Austin), `TARGET_INDUSTRIES` (comma-separated subset of the seven built-in verticals; default = all seven), `MAX_NEW_LEADS` (default 5 per run), `MAX_SITE_FETCHES` (default 15), `SCRAPE_DELAY_SECONDS` (default 1.0), and `SCRAPER_USER_AGENT`.

`SCRAPER_USER_AGENT` should identify the app with a real contact (per the [Nominatim usage policy](https://operations.osmfoundation.org/policies/nominatim/)). If it's unset or empty, the script falls back to a sensible default instead of sending a blank User-Agent (which Nominatim rejects with 403). Geocoding tries Nominatim first and automatically retries with Photon if Nominatim is unreachable or blocked, so both local and CI runs work.

### Data sources & compliance

- **OpenStreetMap** (ODbL) supplies the businesses; **their own public websites** supply self-published contact emails (homepage, contact/about pages, `mailto:` links). Social-network pages are ignored, and chain stores are skipped.
- Validation gates: format checks, junk/spam-trap denylist, dead-domain DNS check, **MX-record deliverability check** (a domain without an MX record cannot receive mail — the #1 silent-bounce cause; e.g. a website can live on a parked domain while its old email is dead), and dedupe via `seen_leads.json`.
- **Industry targeting:** the Overpass query only pulls `office=*` businesses matching the configured verticals, and generic retail storefronts (dentists, salons, cleaners, funeral homes) are no longer scraped. Big-corp store pages (Best Buy, Tesla, etc.) are on the chain-skip list.
- The scraper intentionally caps itself (`MAX_NEW_LEADS`, `MAX_SITE_FETCHES`, request delay) to stay polite.
- ⚖️ You are responsible for anti-spam compliance (CAN-SPAM/GDPR/etc.): keep volume low, personalize, and always include an unsubscribe option.

### Placeholder protection

Leads with a missing email or a `.example`/placeholder-domain email are **skipped and removed** rather than sent, so test data can never leak into a real cold-email campaign.

### Behavior

- ✅ **Delivered** → Gmail node ran and Telegram fired → lead removed from `leads.json`, logged in `sent_log.json`.
- 📨 **Sent-unconfirmed** → Gmail sent but the Telegram step didn't run → counted as sent, logged.
- 🚫 **Suppressed** → lead's email found on the opt-out list → removed from the queue without sending.
- ❌ **Failed/timeout** → error details printed and logged; lead **stays at the top of the queue** and is retried on the next run.
- 🧹 **Invalid/placeholder lead** → removed from the queue without being sent.

---

## 🔓 Unsubscribe & compliance fields

Every payload sent to n8n includes your sender identity plus an unsubscribe block, so the n8n workflow can merge a compliant footer into every email (a nested `unsubscribe` object with the same fields is also included):

```json
{
  "business_name": "KC Dental",
  "email": "info@kcdentalaustin.com",
  "unsubscribe_url": "https://yoursite.com/unsubscribe",
  "unsubscribe_text": "Don't want these emails? Unsubscribe here.",
  "sender_name": "Alex Rivera",
  "sender_address": "123 Congress Ave, Austin, TX 78701"
}
```

Set these via `.env` (local runs) or repository secrets (CI runs) — see the tables above.

In the n8n workflow, `unsubscribe_url` / `unsubscribe_text` are already merged into the Gmail footer, and lead emails are checked against the Google Sheets suppression list before anything is generated.

⚖️ CAN-SPAM essentials: include your physical address, honor opt-outs promptly, and never send to addresses on your suppression list.
