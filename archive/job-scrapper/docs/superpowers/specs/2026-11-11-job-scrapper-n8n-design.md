# Job Scrapper → n8n: Design

**Date:** 2026-11-11
**Status:** awaiting approval

## Intent

Move AI summarization and Discord delivery out of the Python script and into an
n8n workflow. GitHub Actions keeps the cron and the scraping (politeness rules,
rate limits, bot-check retries live there), then calls an n8n webhook. n8n owns
dedupe state, writes the AI summary, and posts the Discord embed.

Why: the summarization/delivery logic becomes editable in the n8n UI without a
commit, dedupe state is inspectable, and other workflows can reuse the same
webhook shape.

## Goals

- One webhook POST per Actions run, carrying all newly scraped jobs.
- n8n dedupes by URL against a data table and posts one Discord embed per job,
  summarized by Gemini.
- Repo becomes stateless: no `seen_jobs.json`, no auto-commit step.
- Existing behavior preserved: same categories, same embed fields, same
  "no new listings" notice, same fallback when Gemini is unavailable.

## Non-goals

- Scraping inside n8n. The polite scraping loop stays in Python.
- Changing the OnlineJobs.ph parsing, category config, or rate limits.
- Changing the AI provider (Gemini stays).
- Multi-channel delivery (Telegram, Slack, etc.).

## Anti-goals (failure even if it works)

- Duplicate Discord posts across runs.
- A failed n8n run that still reports green in Actions.
- Scraping harder or faster to compensate for the new hop.

## Approaches considered

1. **Keep `seen_jobs.json` in the repo**, n8n stateless. Simple, but Actions
   keeps committing state back and n8n can't see what was already sent.
2. **Move dedupe into an n8n data table** *(chosen)*. Repo becomes stateless,
   state is visible and editable in n8n, failures are retriable because a URL is
   only recorded after a successful Discord post.

## Design

### GitHub Actions (`scrape.yml`)

1. cron `0 */4 * * *` + `workflow_dispatch` (unchanged).
2. checkout, Python 3.11, `pip install requests` (unchanged).
3. run `python main.py` with:
   - `N8N_WEBHOOK_URL` (secret)
   - `N8N_WEBHOOK_TOKEN` (secret, sent as `x-webhook-token`)
   - `CATEGORIES`, `MAX_PER_CATEGORY` (vars, unchanged)
   - `DRY_RUN` optional
4. No auto-commit step.

The run goes red if the webhook call fails or n8n returns non-2xx, so Actions is
the run log and the alert.

### `main.py`

- Keeps: search, card parsing, full-description fetch, how-to-apply split,
  truncation, retry/backoff, category handling, no-jobs fallback job.
- Removes: `seen_jobs.json` load/save, Gemini call, Discord embed + send.
- Adds `send_to_n8n(jobs)`: POST
  `{"runId": "<timestamp>", "jobs": [ ...same job fields as today... ]}`
  with `x-webhook-token`; raise on non-2xx so the Action fails.
- `DRY_RUN=1` prints the exact JSON payload and sends nothing.

### n8n workflow: `Job Scrapper — Summarize & Post`

1. **Webhook** — POST `/webhook/job-scrapper`, header auth
   `x-webhook-token`, response mode `responseNode` (Actions waits, so failures
   surface).
2. **Split Out** — split `jobs` into items.
3. **Data Table: rowNotExists** on table `job_scrapper_seen`, column `url` —
   drop URLs already posted. Fallback jobs (`kind: "fallback"`) bypass this
   check and are always posted, preserving today's "scraper found nothing"
   signal.
4. **IF no items remain** → Discord "No new job listings this run." → respond
   `200 {"ok": true, "posted": 0}`. Fires for both an empty payload and a
   payload fully filtered by dedupe.
5. **Basic LLM Chain + Google Gemini Chat Model** (reuse existing Gemini
   credential). Prompt is the current summarize prompt verbatim; on error,
   `continueRegularOutput` with the raw description.
6. **Discord** — send embed (title, url, description = summary, fields: Category,
   Rate, Type, Posted, How to apply) using the existing Discord Webhook
   credential. `retryOnFail`, 3 tries, `onError: continueErrorOutput`.
7. **Data Table: insert** `{url, postedAt}` after a successful send only.
8. **Collect failures** — the error output gathers failed URLs.
9. **Respond to Webhook** —
   - all posted: `200 {"ok": true, "posted": n}`
   - any failed: `502 {"ok": false, "posted": n, "failed": [urls]}`

The batch continues past a failed item, then reports failure; Actions goes red
on non-2xx, so a red run means "some jobs posted, some did not" and the body
names which. `main.py` does **not** retry the webhook (a retry would also re-post
the jobs that already succeeded); a whole-run failure loses that window's
listings because the scraper only picks the newest listing per keyword.

Data table `job_scrapper_seen`: `url` (string), `postedAt` (string).
Chosen over repo state because it survives runner resets, is editable, and keeps
the repo diff-clean.

### Secrets/config

| Where | Name | Purpose |
| --- | --- | --- |
| GitHub secret | `N8N_WEBHOOK_URL` | n8n production webhook URL |
| GitHub secret | `N8N_WEBHOOK_TOKEN` | shared header token |
| n8n | Webhook header auth | validates the token |
| n8n | Discord Webhook credential | existing |
| n8n | Google Gemini API credential | existing |

## Calls I made (builder may settle these)

- Batch one POST per run, not one per job.
- Respond only after processing so Actions reflects n8n failures.
- Keep the "No new job listings this run." Discord notice, sent from n8n.
- Keep the synthetic fallback job, but let it bypass dedupe and post every run —
  otherwise a constant fallback URL is deduped on the second run and
  "scraper broken" becomes indistinguishable from "nothing new".
- Continue past a failed item, then answer 502 with the failed URLs.
- Record a URL in the seen table only after Discord accepts the message.
- Retry Discord 3×; Gemini failure falls back to the raw description.
- No webhook retry in `main.py`; a failed run loses that window's listings.

## Open (needs the owner)

- **Public reachability of n8n.** n8n runs self-hosted on `localhost:5678`
  behind a running Cloudflare tunnel. GitHub-hosted runners cannot reach
  localhost, so a public HTTPS hostname for the webhook is required.
- **Secrets.** `inodepi/job-scrapper` currently has only `SCRAPE_HOOK` (Make
  era) and no variables; the last several scheduled runs failed. First live run
  starts with an empty seen table and may re-post listings already in the
  channel.
