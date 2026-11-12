# make-commits

A Make.com automation that posts every GitHub push to a Facebook Page as a digest — instantly, via webhooks.

Built and running on the **Make.com Free plan** (1,000 ops/month).

> **Status: live (as of 2026-09-21).** Wired to all 10 public repos; private repos are deliberately excluded. The original webhook hook was deleted on Make's side and every GitHub delivery started returning `410 Gone` — it was recreated and all repo hooks re-pointed. The hook URL lives only in each repo's GitHub webhook config, never in this repo.

## Architecture

```
git push ──▶ GitHub webhook ──▶ Make Custom Webhook ──▶ Facebook Pages: Create a Post
             (push event only)       (instant trigger)          (digest message)
```

- **2 operations per push** — even at 10 pushes/day that's ~600 ops/month, well inside the free quota.
- No polling, no delay. The Facebook post lands seconds after `git push`.
- One post **per push** (not per commit): all commit messages of the push are listed as bullets.

## The post format

```
🚀 3 new commit(s) in my-repo by inodepi

• fix login bug
• update README
• add tests

🔗 https://github.com/inodepi/my-repo/compare/abc123..def456
```

Built with a single IML expression — no extra modules:

```
🚀 {{length(commits)}} new commit(s) in {{repository.name}} by {{pusher.name}}

{{join(map(commits; "message"); "
")}}

🔗 {{compare}}
```

## Setup guide

### 1. Make.com side

1. Create a **Custom webhook** (Webhooks app) → copy its URL.
2. Create a scenario: `Custom webhook` → `Facebook Pages > Create a Post`.
3. Connect your Facebook account. Required scopes:
   - `pages_manage_posts`
   - `pages_read_engagement`
   - `pages_manage_engagement`
   - `pages_read_user_content`
   - `pages_show_list`
   - `business_management`
4. Pick your Page, paste the message template above, activate the scenario.

> Re-import shortcut: load [`scenario/blueprint.json`](scenario/blueprint.json) as a scenario blueprint, then select your own webhook + connection + page.

### 2. GitHub side

Repo → **Settings → Webhooks → Add webhook**:

| Field | Value |
|---|---|
| Payload URL | *(your Make webhook URL — keep it secret)* |
| Content type | `application/json` |
| Trigger on | **Just the push event** |

> ⚠️ The webhook URL is an unauthenticated endpoint. Anyone who has it can POST fake payloads to your Page — never commit it publicly.

### 3. Verify

Push a test commit. First delivery may need one retry while Make learns the payload structure (`Webhook details → Run once` or redeliver from GitHub's webhook log).

### 4. Already-wired repos

The webhook (**push** events only, `application/json`) is currently configured on:

> `rss-news`, `inodepi.github.io`, `Alamat-Automated-Shorts`, `signal-checker`, `inodepi`, `money-generator`, `voice-receptionist`, `make-commits`, `dead-lead-retrieval`, `job-scrapper`

To wire a new repo (or re-point existing hooks after recreating the Make webhook) without opening the browser:

```bash
# new repo
gh api repos/inodepi/<repo>/hooks \
  --input - --method POST \
  -f name=web -f 'events[]=push' \
  -f 'config[url]=<your-make-webhook-url>' \
  -f 'config[content_type]=json'

# re-point an existing hook
gh api repos/inodepi/<repo>/hooks/<hook-id> \
  --input - --method POST \
  -f 'config[url]=<your-make-webhook-url>'
```

Private repos (`dotfiles`, `outreach`, `ai-folklore`, `n8n-workflow`) are intentionally **not** hooked — a push webhook publishes their commit messages to a public Facebook page.

## Notes & gotchas

- **HTTP 410 Gone on a delivery** means the Custom Webhook was deleted (or recreated) on Make's side — GitHub-side config is fine, the endpoint is gone. Recreate the hook in the scenario, re-point every repo's webhook URL, then verify with a ping. Inspect recent deliveries with `gh api repos/<owner>/<repo>/hooks/<hook-id>/deliveries` (`.status_code`).
- **Free plan limits**: min scheduling interval is 15 min for *polling* triggers (≈2,880+ ops/month — over quota). Webhooks avoid this entirely.
- **Make Code module is paid-only** — transform data with built-in functions instead.
- **GitHub's public events API no longer returns commit payloads** (`/users/{u}/events` PushEvents arrive with empty `commits`). For backfilling history, use `/repos/{o}/{r}/commits` per repo and post per-commit digests instead.
- Facebook rate-limits rapid page posting — keep backfills small or batched.

## Files

```
scenario/blueprint.json   # sanitized Make scenario export (placeholders for IDs)
```
