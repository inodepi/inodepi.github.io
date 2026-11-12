# Job Scrapper → n8n Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace in-script Gemini + Discord delivery with an n8n webhook that dedupes, summarizes, and posts each job to Discord.

**Architecture:** GitHub Actions runs the existing polite scraper every 4 hours, then POSTs one JSON batch to an n8n webhook. The n8n workflow filters URLs already present in a `job_scrapper_seen` data table, summarizes with Gemini, posts a Discord embed per job, and records each URL only after Discord accepts it.

**Tech Stack:** Python 3.11 + `requests`; GitHub Actions; n8n (self-hosted, Webhook + Data Table + Basic LLM Chain/Gemini + Discord nodes).

**Spec:** `docs/superpowers/specs/2026-11-11-job-scrapper-n8n-design.md`

## Global Constraints

- Scraping stays in Python; no scraping node in n8n.
- Exactly one webhook POST per Actions run.
- Webhook auth header: `x-webhook-token`.
- Do not add a webhook retry in `main.py`.
- Dedupe table name: `job_scrapper_seen`, columns `url` (string), `postedAt` (string).
- Never post a job URL that is already in the table, except jobs with `kind: "fallback"`.

## Review Focus

- **Empty scrape result:** a run where no listings parse must still produce one fallback embed, every run — not be deduped into silence.
- **All URLs already posted:** payload non-empty but every URL filtered must send the "No new job listings this run." notice, not nothing.
- **Gemini failure on one job:** that job still posts with its raw description instead of aborting the batch.
- **Discord failure on one job:** batch continues, response is 502, Actions run goes red, and that URL is not marked seen.
- **Webhook auth:** a request without the correct `x-webhook-token` must be rejected, not processed.

---

### Task 1: Split `main.py` into scraper + webhook sender

**Files:**
- Modify: `main.py`
- Create: `tests/test_pipeline.py`
- Create: `tests/__init__.py`

**Interfaces:**
- Consumes: existing `fetch_jobs(categories)`, `build_job(...)`.
- Produces:
  - `build_payload(jobs: list[dict], run_id: str) -> dict` → `{"runId": str, "jobs": list[dict]}`
  - `send_to_n8n(url: str, token: str, payload: dict) -> int` → HTTP status; raises `WebhookError` on non-2xx
  - `class WebhookError(RuntimeError)`

- [ ] **Step 1: Write the failing tests**

```python
# tests/test_pipeline.py
from unittest.mock import patch, Mock
import pytest
import main


def test_build_payload_wraps_jobs_with_run_id():
    jobs = [{"url": "https://example.com/job/1", "jobTitle": "Bot Dev"}]
    payload = main.build_payload(jobs, "run-123")
    assert payload == {"runId": "run-123", "jobs": jobs}


def test_build_payload_marks_fallback_jobs():
    job = {"url": "https://example.com/search", "jobTitle": "Job Scraper Fallback"}
    payload = main.build_payload([job], "run-1", fallback=True)
    assert payload["jobs"][0]["kind"] == "fallback"


def test_build_payload_marks_normal_jobs():
    payload = main.build_payload([{"url": "https://example.com/job/1"}], "run-1")
    assert payload["jobs"][0]["kind"] == "job"


def test_send_to_n8n_posts_json_with_token_header():
    with patch("main.requests.post") as post:
        post.return_value = Mock(status_code=200, text="ok")
        status = main.send_to_n8n("https://n8n.example/webhook/x", "tok", {"jobs": []})
    assert status == 200
    _, kwargs = post.call_args
    assert kwargs["headers"]["x-webhook-token"] == "tok"
    assert kwargs["json"] == {"jobs": []}


def test_send_to_n8n_raises_on_502():
    with patch("main.requests.post") as post:
        post.return_value = Mock(status_code=502, text='{"ok":false,"failed":["u"]}')
        with pytest.raises(main.WebhookError):
            main.send_to_n8n("https://n8n.example/webhook/x", "tok", {"jobs": []})


def test_main_with_dry_run_does_not_send(monkeypatch, capsys):
    monkeypatch.setenv("DRY_RUN", "1")
    monkeypatch.setattr(main, "fetch_jobs", lambda categories: [{"url": "u", "jobTitle": "T"}])
    with patch("main.requests.post") as post:
        main.main()
    post.assert_not_called()
    assert '"jobs"' in capsys.readouterr().out
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `python -m pytest tests/test_pipeline.py -v`
Expected: FAIL — `AttributeError: module 'main' has no attribute 'build_payload'` (install pytest first if missing).

- [ ] **Step 3: Rewrite `main.py` delivery path**

Remove `DISCORD_WEBHOOK_URL`, `GEMINI_API_KEY`, `GEMINI_MODEL`, `summarize_job`, `send_discord`, `load_seen`, `save_seen`, `SEEN_FILE`, and the `seen_jobs.json` bookkeeping. Keep every parsing/politeness function untouched.

Add:

```python
class WebhookError(RuntimeError):
    pass


def build_payload(jobs, run_id, fallback=False):
    tagged = [dict(job, kind="fallback" if fallback else "job") for job in jobs]
    return {"runId": run_id, "jobs": tagged}


def send_to_n8n(url, token, payload):
    resp = requests.post(
        url,
        json=payload,
        headers={"x-webhook-token": token},
        timeout=120,
    )
    if resp.status_code not in (200, 201, 204):
        raise WebhookError(f"n8n returned {resp.status_code}: {resp.text[:500]}")
    return resp.status_code
```

`main()` keeps: category loading, `fetch_jobs`, the no-jobs fallback job, and `DRY_RUN` printing. Replace the send block with a single call:

```python
run_id = datetime.utcnow().strftime("%Y%m%dT%H%M%SZ")
payload = build_payload(jobs, run_id, fallback=used_fallback)
if dry_run:
    print(json.dumps(payload, indent=2))
    return
url = os.environ.get("N8N_WEBHOOK_URL")
token = os.environ.get("N8N_WEBHOOK_TOKEN")
if not url or not token:
    print("Error: N8N_WEBHOOK_URL and N8N_WEBHOOK_TOKEN must be set.")
    sys.exit(1)
send_to_n8n(url, token, payload)
print(f"Sent {len(payload['jobs'])} jobs to n8n ({run_id}).")
```

`used_fallback` is a local flag set where the fallback job is appended. Jobs are sent even when the list is only the fallback; if `fetch_jobs` returns `[]` under `DRY_RUN`, still print the payload.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `python -m pytest tests/test_pipeline.py -v`
Expected: 6 passed.

- [ ] **Step 5: Commit**

```bash
git add main.py tests/
git commit -m "refactor: send scraped jobs to n8n webhook instead of Discord"
```

---

### Task 2: Point the Actions workflow at n8n

**Files:**
- Modify: `.github/workflows/scrape.yml`
- Modify: `Makefile`

**Interfaces:**
- Consumes: `main.py` env contract from Task 1 (`N8N_WEBHOOK_URL`, `N8N_WEBHOOK_TOKEN`, `DRY_RUN`, `CATEGORIES`, `MAX_PER_CATEGORY`).
- Produces: a scheduled workflow that fails on a non-2xx webhook response.

- [ ] **Step 1: Replace the run step env**

```yaml
      - name: Run Scraper Script
        env:
          N8N_WEBHOOK_URL: ${{ secrets.N8N_WEBHOOK_URL }}
          N8N_WEBHOOK_TOKEN: ${{ secrets.N8N_WEBHOOK_TOKEN }}
          CATEGORIES: ${{ vars.CATEGORIES || 'automation;n8n;make.com;zapier|python|customer support;email support;chat support|virtual assistant' }}
          MAX_PER_CATEGORY: ${{ vars.MAX_PER_CATEGORY || '1' }}
        run: |
          python main.py
```

- [ ] **Step 2: Delete the auto-commit step**

Remove the whole `Commit Updated Seen Cache` step. Rename the workflow to `Run Job Scraper (GitHub Actions → n8n → Discord)`.

- [ ] **Step 3: Update `Makefile`**

`make s` runs `python3 main.py` with `N8N_WEBHOOK_URL`/`N8N_WEBHOOK_TOKEN` from the shell; `make dry` keeps `DRY_RUN=1`. Update the help text to say "sends to \$N8N_WEBHOOK_URL".

- [ ] **Step 4: Verify the YAML parses**

Run: `python -c "import yaml,sys; yaml.safe_load(open('.github/workflows/scrape.yml')); print('ok')"`
Expected: `ok`

- [ ] **Step 5: Commit**

```bash
git add .github/workflows/scrape.yml Makefile
git commit -m "ci: call n8n webhook, drop seen-cache commit-back"
```

---

### Task 3: Create the n8n data table and workflow

**Files:**
- External: n8n data table `job_scrapper_seen`; workflow `Job Scrapper — Summarize & Post`.

**Interfaces:**
- Consumes: payload `{"runId": str, "jobs": [{jobTitle, company, category, rate, salary, employmentType, url, datePosted, postedAt, description, howToApply, kind}]}` at `POST /webhook/job-scrapper` with `x-webhook-token`.
- Produces: `200 {"ok": true, "posted": n}` or `502 {"ok": false, "posted": n, "failed": [urls]}`.

- [ ] **Step 1: Read the n8n build references**

Call `get_workflow_sdk_reference`, then `get_workflow_best_practices` for `technique="webhook"` (and `"scheduling"` if offered). Do not write node code before this.

- [ ] **Step 2: Create the data table**

Create table `job_scrapper_seen` with columns `url` (string) and `postedAt` (string).

- [ ] **Step 3: Get node types for every node**

`get_node_types` for the Webhook, Split Out, IF, Data Table (`rowNotExists`, `insert`), Basic LLM Chain, Google Gemini Chat Model, Discord (`sendLegacy`), Respond to Webhook, and Code node IDs. Use the returned discriminators exactly.

- [ ] **Step 4: Build and validate the workflow**

Nodes in order: Webhook (`responseMode: responseNode`, header auth) → Split Out (`jobs`) → IF `kind === "fallback"` (true branch goes straight to the LLM node; false branch goes to Data Table `rowNotExists` on `url`) → Basic LLM Chain + Gemini (`continueRegularOutput` on error) → Discord send (`retryOnFail`, 3 tries, `onError: continueErrorOutput`) → Data Table `insert` → Respond `200`; error output → Code node collecting failed URLs → Respond `502`.

The fallback branch must not touch `rowNotExists`, otherwise the constant fallback URL is deduped on the second run and the "scraper found nothing" signal disappears.

Prompt text: the verbatim prompt from the old `summarize_job` (2–4 sentences, role, key skills, one-line hook, no invented details).

Call `validate_workflow` and fix every error before creating.

- [ ] **Step 5: Create, then test with a hand-made payload**

Create the workflow from validated code. POST a payload with one obviously-fake job (`"url": "https://example.com/test-job-<timestamp>"`) using `curl` against the local webhook URL and the configured token.
Expected: Discord receives one embed; the data table gains the URL; response is `200`.
Repeat the same POST.
Expected: `200 {"ok": true, "posted": 0}` and **no** second Discord post.

- [ ] **Step 6: Test auth rejection**

POST without `x-webhook-token`.
Expected: non-2xx, workflow not executed.

- [ ] **Step 7: Verify the failure paths in the editor**

Confirm: Gemini node has `onError: continueRegularOutput`; Discord node has `onError: continueErrorOutput` + `retryOnFail`; error output connects to the failure collector and the `502` Respond node; success path connects to the `200` Respond node.

- [ ] **Step 8: Activate the workflow and record its ID**

Activate it, then paste the workflow ID and webhook path into the README in Task 5.

---

### Task 4: Set repo secrets and remove the dead one

**Files:**
- External: `inodepi/job-scrapper` secrets.

- [ ] **Step 1: Generate the token**

`opencode` shell: `python3 -c "import secrets; print(secrets.token_urlsafe(32))"` — store it in a shell variable, never in a file.

- [ ] **Step 2: Configure the n8n webhook to expect it**

Set the Webhook node's header auth to accept exactly `x-webhook-token: <token>`.

- [ ] **Step 3: Set the two secrets**

```bash
gh secret set N8N_WEBHOOK_TOKEN --repo inodepi/job-scrapper --body "$TOKEN"
gh secret set N8N_WEBHOOK_URL --repo inodepi/job-scrapper --body "https://<public-host>/webhook/job-scrapper"
```

`<public-host>` is the Cloudflare-tunnel hostname for the local n8n. If it is not known yet, set only the token, leave the URL for the owner, and mark the pipeline "not live" in the README.

- [ ] **Step 4: Delete the Make-era secret**

`gh secret delete SCRAPE_HOOK --repo inodepi/job-scrapper`

- [ ] **Step 5: Verify**

`gh secret list --repo inodepi/job-scrapper`
Expected: `N8N_WEBHOOK_TOKEN` and (once wired) `N8N_WEBHOOK_URL`; no `SCRAPE_HOOK`.

---

### Task 5: Rewrite the README for the new pipeline

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Replace "How It Works" with the three-stage flow**

GitHub Actions (cron + polite scrape) → n8n webhook (dedupe + Gemini summary) → Discord embed per job. State that dedupe lives in the n8n data table `job_scrapper_seen`, and that the repo is stateless.

- [ ] **Step 2: Update setup sections**

Secrets: `N8N_WEBHOOK_URL`, `N8N_WEBHOOK_TOKEN`. Remove `DISCORD_WEBHOOK_URL`/`GEMINI_API_KEY` from the repo secrets list (they now live in n8n). Add the n8n workflow ID and webhook path. Add a local-testing note: `DRY_RUN=1 python main.py` prints the exact payload.

- [ ] **Step 3: Commit**

```bash
git add README.md docs/
git commit -m "docs: document GitHub Actions → n8n → Discord pipeline"
```

---

### Task 6: End-to-end verification

**Files:** none.

- [ ] **Step 1: Local dry run**

`DRY_RUN=1 python3 main.py` → prints `{"runId": ..., "jobs": [...]}` with `kind` on every job.

- [ ] **Step 2: Manual Actions run**

`gh workflow run "Run Job Scraper (GitHub Actions → n8n → Discord)" --repo inodepi/job-scrapper`, then `gh run watch`.
Expected: green run, Discord embeds appear, n8n execution shows the same items.

- [ ] **Step 3: Confirm dedupe across two runs**

Trigger the workflow twice within one cron window.
Expected: second run posts nothing new (or only genuinely new listings) and does not repeat embeds.

- [ ] **Step 4: Confirm failure surface**

Temporarily point `N8N_WEBHOOK_URL` at a 404 path, run the workflow, confirm the run is red, then restore the secret.

- [ ] **Step 5: Report**

Summarize: workflow ID, webhook URL configured or pending, secrets set, and what the first live run posted.

## Out of scope

The earlier request to reset `job-scrapper` to an older commit is superseded by this rewiring; no history rewrite is performed. If a reset is still wanted, it must be requested separately before Task 5's commit lands.
