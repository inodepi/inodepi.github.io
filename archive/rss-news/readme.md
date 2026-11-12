# AI Tech & Automation Hub — RSS News Automation

Automated news curation pipeline for the **AI Tech & Automation Hub** Facebook page, run by **Potaterrr**. A Python script fetches tech & AI RSS feeds, filters new articles by keyword, and POSTs a digest (plus a random banner image) to a Make.com webhook that drafts the post with Google Gemini, generates the graphic with Google Imagen, and publishes to Facebook Pages.

## 🚀 Tech Stack
* **GitHub Actions** — cron scheduling & execution environment
* **Python 3.10** — core script using `feedparser` + `requests`
* **Make.com** — webhook trigger → Gemini post drafting → Imagen graphic → Facebook Pages publishing

## 🧮 Make.com Free Tier
The Make.com side runs entirely on the **free plan**: 1,000 operations a month is plenty for a weekly digest (one run uses ~5 ops), and the free tier's 15-minute webhook polling interval doesn't matter when the trigger is a Sunday-morning cron. Full arithmetic: [the ops math](https://inodepi.github.io/blog/make-com-free-plan-ops-math.html).

## 📡 Feeds Tracked
* Hacker News front page (`news.ycombinator.com/rss`)
* Phoronix (`phoronix.com/rss.php`)
* The Verge (`theverge.com/rss/index.xml`)
* HN "ai" keyword feed (`hnrss.org/ai`)
* 9to5Google (`9to5google.com/feed/`)
* **GitHub Trending Repo of the Day** — the #1 daily trending repo from `mshibanami/GitHubTrendingRSS` is always added to the digest (not keyword-filtered)

## 🔎 Filtering & Dedupe
* Articles are kept only if the title or summary matches one of the `KEYWORDS` (Linux, Windows, AI/LLM, OpenAI, DeepSeek, Anthropic, smartphones, GPUs, etc.) — see `fetch_news.py` for the current list.
* `seen_articles.json` (created at runtime) remembers already-sent article IDs, capped at 1,000, so nothing gets posted twice.
* `rss_fetcher.log` captures each run's logs.

## 🖼️ Banner Images
Each run picks a random image from `images/` and sends its raw `raw.githubusercontent.com` URL as `banner_image` (repo/branch are detected from `GITHUB_REPOSITORY` / `GITHUB_REF_NAME`). Only `.jpg`, `.jpeg`, `.png`, and `.webp` files count — don't leave other files in `images/`.

## ⚙️ Automation Schedule
Runs automatically **every Sunday at 6:00 AM Philippine Standard Time** (cron `0 22 * * 6` UTC = 6:00 AM Sunday PHT) via GitHub Actions, or can be triggered manually from the Actions tab (*Run workflow*).

## 🔐 Setup
* Required GitHub secret: **`MAKE_WEBHOOK_URL`** — the Make.com webhook that receives the digest payload.
* The workflow also injects `GDRIVE_FOLDER_ID` / `GDRIVE_SERVICE_ACCOUNT_JSON`, but the script no longer uses them (legacy; safe to remove).

## 📦 Webhook Payload
```json
{
  "digest_title": "Tech & AI Digest (N items)",
  "total_items": 3,
  "content": "• **Title**\n  Source: Feed name\n  Link: https://...\n  Snippet: plain-text summary snippet\n\n...",
  "banner_image": "https://raw.githubusercontent.com/<owner>/<repo>/<branch>/images/<file>.jpeg"
}
```
