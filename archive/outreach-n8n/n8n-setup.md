# 🛠️ n8n (localhost) Setup Guide

This guide replaces the old Make.com scenario. The pipeline's webhook payload now
lands in **self-hosted n8n**, which generates the personalized cold email with
**Gemini** and sends it directly via **Gmail**, with a Telegram notification once the email is out.

```
GitHub Actions (cron) ──POST──> tunnel ──> n8n on localhost ──> Gemini ──> Gmail send ──> Telegram ping
```

> ⚠️ **Why a tunnel?** GitHub Actions runners live in the cloud and cannot reach
> `http://localhost:5678` on your machine. You need either a tunnel (ngrok /
> Cloudflare), or to run `outreach.py` locally on the same machine as n8n.

The payload sent by `outreach.py → build_payload` looks like this:

```json
{
  "business_name": "KC Dental",
  "website": "https://www.kcdentalaustin.com",
  "email": "info@kcdentalaustin.com",
  "niche": "Healthcare & Wellness",
  "category": "amenity=dentist, healthcare=dentist",
  "source": "OpenStreetMap",
  "phone": "+1-512-918-0888",
  "address": "6301 West Parmer Lane, Austin",
  "unsubscribe_url": "https://yoursite.com/unsubscribe",
  "unsubscribe_text": "Unsubscribe",
  "sender_name": "Alex Rivera",
  "sender_address": "123 Congress Ave, Austin, TX 78701",
  "unsubscribe": { "url": "...", "text": "...", "sender_name": "...", "sender_business_name": "...", "postal_address": "..." }
}
```

---

## 1. Run n8n locally

Either option:

```bash
# Node.js
npx n8n

# or Docker
docker run -it --rm -p 5678:5678 -v n8n_data:/home/node/.n8n docker.n8n.io/n8nio/n8n
```

Open `http://localhost:5678` and create your local owner account.

> 🔐 **`outreach.py` needs two values from this n8n** in your local `.env`
> (gitignored): `N8N_WEBHOOK_URL=http://localhost:5678/webhook/outreach-lead`
> and `N8N_API_KEY=<n8n API key from Settings → n8n API>` — the key lets the
> script **verify each send** by polling the execution API before counting a
> lead as sent.

### 1b. Let the scraper write to your leads Google Sheet

The scraper appends every new lead to your tracking sheet (the same spreadsheet
the **Check Suppression List** node reads). It authenticates with the same
Google Service Account credential n8n uses:

1. Locate the service-account JSON key (the one shared on the sheet — the
   `papay-501404` key n8n uses works).
2. Local runs: point env vars at them:

   ```bash
   export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
   export LEADS_SHEET_ID=1cv3REiDJ1MDyr4DTE0mCy0BYDd4WrtCf5HeltW8aMnA
   ```

3. GitHub Actions: add repo secrets `GOOGLE_SA_KEY_B64` (base64 of the JSON:
   `base64 -w0 service-account.json`) and `LEADS_SHEET_ID`. The workflow decodes
   it at runtime — the key file itself never lands in git.
4. The sheet's headers are `business_name, wbsite, niche, contact name, email,
   scapped date` — keep them as-is; the scraper writes in that column order.

## 2. Expose n8n to GitHub Actions (pick one)

**Option A — ngrok (quick):**

```bash
ngrok http 5678
```

Note the HTTPS forwarding URL, e.g. `https://abc123.ngrok-free.app`.
(ngrok free tier shows a browser interstitial but API/webhook POSTs pass through.)

**Option B — Cloudflare Tunnel (free, stable):**

```bash
cloudflared tunnel --url http://localhost:5678
```

**Option C — n8n's built-in dev tunnel** (fine for testing, not for production):
`n8n start --tunnel` — then use the printed `https://<id>.hooks.n8n.cloud` URL.

Whichever you choose, the tunnel must be **running whenever the cron fires**
(weekdays 09:00 UTC). Keep `ngrok`/`cloudflared` running in the background.

## 3. Import the workflow

1. n8n → **Workflows → Import from File** → select `n8n-workflow.json` from this repo.
2. Connect credentials:
   - **Check Suppression List** node → a *Google Service Account* credential (the node's Authentication must be set to **Service Account**), pointed at your opt-out spreadsheet. The tab needs an `email` column header; one opted-out address per row (empty rows are fine).
   - **AI Model (Gemini)** node → a *Google Gemini (PaLM)* credential with a **valid** API key from [aistudio.google.com](https://aistudio.google.com/apikey). (The workflow originally used OpenRouter; OpenRouter's data policy blocked Gemini, so the workflow now calls Gemini directly. Free tier ≈ 1,500 requests/day — the 20/day pipeline barely dents it.)
   - **Send Gmail Email** node → a *Gmail OAuth2* credential (needs a Google Cloud project with the Gmail API enabled; n8n shows the exact redirect URI to whitelist). If executions fail with “needs to be reconnected”, open the credential in n8n and re-authorize.
   - **Telegram Alert** node → a *Telegram* credential with your bot token (@BotFather); set `chatId` to your chat ID (from @userinfobot). Bots can only message users who have started a chat with them first.
3. Open the **Lead Webhook** node and copy the **Production URL**, e.g.
   `https://abc123.ngrok-free.app/webhook/outreach-lead`
   (test URLs use `/webhook-test/` instead of `/webhook/`).
4. **Activate** the workflow — a production webhook URL only responds when the
   workflow is active.

## 4. Point GitHub at n8n

In your repo: **Settings → Secrets and variables → Actions → New repository secret**

| Secret | Value |
| --- | --- |
| `N8N_WEBHOOK_URL` | your tunnel webhook URL from step 3 |
| `UNSUBSCRIBE_URL` *(optional)* | opt-out link merged into every email |
| `UNSUBSCRIBE_TEXT` *(optional)* | link text (default "Unsubscribe") |
| `SENDER_NAME` *(optional)* | your name used as the human sender |
| `SENDER_BUSINESS_NAME` *(optional)* | your business name in the signature |
| `SENDER_ADDRESS` *(optional)* | your postal address (required by CAN-SPAM if sending) |

The workflow file `.github/workflows/scrape_leads.yml` already passes
`N8N_WEBHOOK_URL` to `outreach.py`.

## 5. Test end-to-end

1. With the workflow **active** and the tunnel running, POST a sample lead
   straight to the tunnel URL:

   ```bash
   curl -X POST "https://abc123.ngrok-free.app/webhook/outreach-lead" \
     -H "Content-Type: application/json" \
     -d '{"business_name":"Test Biz","website":"https://testbiz.com","email":"you+test@gmail.com","niche":"Home Services & Trades","category":"test"}'
   ```

2. n8n → **Executions** → confirm the agent output has a subject + body.
3. Check Gmail: an email addressed to `you+test@gmail.com` should arrive, and your Telegram bot should ping you.
4. Then run the real pipeline: GitHub → Actions → *Daily Outreach Pipeline* →
   **Run workflow** (`dry_run=false`), with a safe test lead at the top of `leads.json`.

> 🔁 `outreach.py` only removes a lead from the queue after a `200` from the
> webhook, and n8n's webhook returns `200` as soon as the payload is received
> (`responseMode: onReceived`) — so a slow Gemini call won't time out GitHub's
> runner, and failed pushes stay in the queue for retry.

## 6. Suppression list (recommended next step)

n8n equivalent of the old Make pattern:

1. Second workflow: **Webhook** (`unsubscribe-click`) → **Google Sheets → Append row**.
   Point `UNSUBSCRIBE_URL` at a tiny form/redirect that hits this webhook with the opted-out email.
2. In the outreach workflow, insert **Google Sheets → Get row(s)** between the
   webhook and the agent and add an **If** node: continue only if the webhook's
   `email` is **not** found in the sheet.
3. Opted-out addresses then never reach Gemini or Gmail.

## 7. Troubleshooting

| Symptom | Fix |
| --- | --- |
| `Failed to push ... 404` from outreach.py | Tunnel down, or workflow not **Active** (you're hitting a dead production URL). |
| `409` / "webhook not registered" | Webhook path was renamed; re-copy the Production URL into `N8N_WEBHOOK_URL`. |
| GitHub job green but no email | Payload was accepted (`onReceived`), check the n8n **Executions** tab for the agent/Gmail error. |
| ngrok "Visit site" interstitial | It only affects browsers; curl/webhook POSTs bypass it. If your plan blocks it, use Cloudflare. |
| Gmail OAuth redirect error | Add n8n's shown OAuth Redirect URL to your Google Cloud OAuth client, then recreate the credential. |
