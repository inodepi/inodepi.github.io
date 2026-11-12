# 🛠️ Make.com Scenario Setup Guide

This guide wires the pipeline's webhook payload into a Make.com scenario that
generates a personalized cold email with **Gemini** and delivers it as a Gmail
draft or direct send — including the **unsubscribe footer**.

The payload your repo sends (see `outreach.py → build_payload`) looks like this:

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
  "unsubscribe": {
    "url": "https://yoursite.com/unsubscribe",
    "text": "Unsubscribe",
    "sender_name": "Alex Rivera",
    "sender_business_name": "Potaterrr",
    "postal_address": "123 Congress Ave, Austin, TX 78701"
  }
}
```

> ℹ️ `unsubscribe_*` / `sender_*` keys only appear if you set the corresponding
> repo secrets (`UNSUBSCRIBE_URL`, `SENDER_NAME`, `SENDER_ADDRESS`, …).

---

## 1. Create the scenario skeleton

1. In Make.com: **Scenarios → Create a new scenario**.
2. Add the three modules in order:
   1. **Webhooks → Custom webhook**
   2. **Google Gemini AI → Create a Completion** (or "Generate Content")
   3. **Email / Gmail → Send an email** (or **Create a draft**)

---

## 2. Module 1 — Custom webhook

1. Click the webhook module → **Add** → name it e.g. `outreach-lead`.
2. Copy the generated **HTTPS URL**.
3. In GitHub: **Settings → Secrets and variables → Actions → New repository secret**
   → name it `MAKE_WEBHOOK_URL`, paste the URL.
4. **Register the data structure** so mappings are easy later:
   - Trigger the pipeline once manually (GitHub → Actions → *Daily Outreach
     Pipeline* → **Run workflow**, with `dry_run=false` and the queue holding
     at least one lead), **or** click *Run once* here after sending a sample
     payload with curl:
     ```bash
     curl -X POST "<your-webhook-url>" -H "Content-Type: application/json" \
       -d '{"business_name":"Test Biz","website":"https://testbiz.com","email":"owner@testbiz.com","niche":"Home Services & Trades"}'
     ```
   - Back in Make: open the webhook → **Determining data structure** → it
     captures the sample → save as e.g. `LeadPayload`.

> 💸 **Budget tip:** every webhook acceptance = 1 Make operation, and each
> Gemini call + email is 1+ more. Your pipeline sends **1 lead/day**, so a
> single scenario run ≈ 3–4 operations/day. Keep it to one run per day and
> don't add extra polling modules that consume operations on schedule.

---

## 3. Module 2 — Gemini (generate the personalized hook)

Add **Google Gemini AI → Create a Completion** (make sure the webhook module
runs first, connected by a line).

**Model:** `gemini-2.0-flash` or newer (cheap + fast).

**System/role message** (paste as-is):

```text
You are an expert B2B cold-email copywriter. You write ONE short, specific,
human-sounding email. Rules:
- 90–120 words max, 4th-grade reading level, no jargon or hype.
- Reference something concrete about the business from the fields provided.
- One clear, low-friction call to action (a question, not a meeting link).
- No subject line inside the body, no placeholders like [Name], no signatures.
- Output plain text only.
```

**User prompt** (paste and map the purple webhook fields where marked):

```text
Write a cold email to a local business.

Business: {{business_name}}
What they do: {{category}} ({{niche}})
Website: {{website}}
Location: {{address}}

My offer: <one sentence: e.g. "I build fast, mobile-friendly websites for
local service businesses that are losing mobile visitors">

Write a subject line on the first line prefixed with "Subject: ", then a
blank line, then the email body addressed to the team at {{business_name}}.
```

> 🧠 If you registered the webhook data structure in step 2, every
> `{{business_name}}` style tag maps by clicking the field → selecting the
> webhook module → the field name.

---

## 4. Module 3 — Gmail (send or draft)

Use **Gmail → Create a draft** while testing; switch to **Send an email** once
you're happy with quality.

**To:** `{{email}}` (webhook field)

**Subject:** strip the `Subject: ` prefix Gemini produced — either with a
**Text parser → Match pattern** module between Gemini and Gmail:
- Pattern: `^Subject:\s*(.*)$` (case-insensitive, dot-all off) on Gemini's output
- Then map the captured group, e.g. `{{1.[1]}}`

…or let Gemini output only the subject into a separate field and map that.

**Body:**

```text
{{2.result}}

— {{sender_name}}
{{sender_business_name}}

{{sender_address}}

{{unsubscribe_text}}: {{unsubscribe_url}}
```

*(Numbers depend on your module order — `2.result` = Gemini output,
`{{email}}` / `{{sender_name}}` etc. come from the webhook module.)*

- **Sender name:** map `{{sender_name}}` in Gmail's "From name" too.
- If you didn't set the sender secrets, delete those lines from the template.

---

## 5. Test end-to-end

1. Add a safe test lead to the **top** of `leads.json` (an address you own):
   ```json
   {
     "business_name": "My Own Test Inbox",
     "website": "https://example.org",
     "email": "you+test@gmail.com",
     "niche": "Test"
   }
   ```
2. Commit + push, then run the workflow manually (**Run workflow**, `dry_run` = `false`).
3. Confirm: GitHub job green → webhook "Received data" in Make history →
   Gemini output looks human → draft/sent email has the footer.
4. Delete the test lead from the queue if it failed (the pipeline only pops
   leads after a `200` from the webhook).

---

## 6. Suppression list (recommended next step)

Opt-outs only work if you check them. Minimal pattern:

1. **Webhooks → Custom webhook #2** (`unsubscribe-click`) + **Google Sheets →
   Add a row** — point `UNSUBSCRIBE_URL` at a tiny form/redirect that hits
   this webhook with the opted-out email.
2. In the main scenario, add **Google Sheets → Search rows** between the
   webhook and Gemini; map `{{email}}`.
3. Add a **filter** on that link: only continue if "email NOT found" —
   opted-out addresses never reach Gemini or Gmail.

---

## Cost checklist

- [x] One run/day (cron already does this) → ~3–4 ops/day
- [x] `MAX_NEW_LEADS` caps scraping, not sends — sending stays at 1/day
- [ ] Delete any scheduled "watch email / watch sheet" modules you don't need
- [ ] Set Make scenario **scheduling = inactive** for the scenario trigger;
      the webhook only needs to listen, not poll
