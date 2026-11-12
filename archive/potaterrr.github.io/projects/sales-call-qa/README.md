# Sales Call QA & Coaching

Score every sales call against the same five-part rubric, quote the line behind every score, and only ask a manager to look when the call is actually risky.

- **Project page:** <https://potaterrr.github.io/projects/sales-call-qa/>
- **Interactive demo:** <https://potaterrr.github.io/projects/sales-call-qa/demo/>
- **Workflow JSON:** [`workflow.json`](workflow.json)
- **Build notes:** [The call is the evidence](https://potaterrr.github.io/blog/sales-call-qa.html)

This folder is the portfolio copy of the build: the importable n8n workflow, a self-contained browser simulation, and the notes needed to run it.

## What it does

1. **Receives a call.** Retell posts the finished call to `POST /webhook/sales-call-qa`. A paste-a-transcript form at `/form/sales-call-qa-form` is the same path for testing.
2. **Normalizes it.** A Code node pulls out the rep, transcript, call date and duration. A call without a usable transcript is logged as `needs_transcript` — no score is invented.
3. **Scores it.** Gemini 3 Flash fills a structured JSON schema with five dimensions and an exact quote for each.
4. **Verifies it.** A second Code node clamps the scores, recomputes the weighted overall, checks every quote against the transcript, redacts emails and phone numbers, and decides whether a human is needed.
5. **Stores it.** Clean calls go to the `Sales Call QA` data table. Risky calls also become a Gmail draft for a manager.
6. **Coaches weekly.** Every Monday at 08:00, a digest aggregates the last week per rep and files one coaching draft.

Nothing is sent automatically. The Gmail nodes only create drafts.

## Rubric

| Dimension | Weight | What it checks |
| --- | --- | --- |
| Opening | 15% | Name, company, permission to continue, a clear reason for the call without dumping the pitch |
| Discovery | 30% | Situation, pain, impact, decision process and timeline; confirms understanding |
| Objection handling | 25% | Acknowledge, explore, answer with proof, confirm it landed |
| Next step | 20% | A specific date and owner, confirmed before the call ends |
| Compliance | 10% | Recording disclosure, no guarantees, accurate pricing, do-not-call |

If the prospect raises no objection, objection handling scores **3** with `no objection in transcript`. An easy call is not punished.

## The evidence rule

The model must quote the transcript for every dimension. The validation node verifies each quote after normalizing case and punctuation. Gemini often quotes two lines and joins them with `...`, so the check splits the evidence on ellipses and newlines and verifies each segment separately.

If fewer than three quotes verify, confidence drops by 0.15 and the call is forced into review. A score without a quote is just a vibe with a number.

## Review gate

A call needs a human when any of these is true:

- confidence is below `0.75`,
- the model raised any red flag,
- compliance scored below `3`, or
- fewer than three quotes verified.

Clean calls are silent rows. Risky calls create a Gmail draft with the red flag, the evidence and one coaching sentence. A manager reads the call, adjusts anything that looks off, and sends the note themselves.

## Import

1. In n8n, import `workflow.json`.
2. Create a data table named `Sales Call QA` with these columns:

   `call_id` (string), `rep` (string), `source` (string), `call_date` (date), `duration_seconds` (number), `overall` (number), `opening` (number), `discovery` (number), `objection_handling` (number), `next_step` (number), `compliance` (number), `confidence` (number), `status` (string), `red_flags` (string), `coaching_tip` (string), `summary` (string), `evidence` (string), `evidence_verified` (boolean), `created_at` (date).

3. Reconnect the Google Gemini and Gmail credentials.
4. Set the manager email in the Gmail nodes.
5. Publish the workflow so the production webhook and form are live.

The exported workflow has credentials removed and the manager email replaced with `sales-manager@example.com`.

## Positions

- **Gemini model:** `models/gemini-3-flash-preview`
- **Output budget:** `8192` tokens. Four thousand was consumed by reasoning and returned an empty structured response.
- **Retell webhook:** `POST /webhook/sales-call-qa`
- **Form path:** `/form/sales-call-qa-form`
- **Digest schedule:** Monday 08:00

## Tested

| Test | Result |
| --- | --- |
| Clean discovery + booked Thursday slot | 84/100, `scored`, evidence verified |
| Dismissive security objection + vague follow-up | 25/100, `needs_review`, multiple red flags |
| Weekly digest | 5 calls across 3 reps with per-dimension averages |

The demo runs on synthetic calls. The Retell webhook is wired, but live telephony needs a real Retell agent and a public n8n URL.

## Files

```
workflow.json      the n8n workflow, ready to import
demo/index.html    the browser simulation, no network calls
README.md          this file
```

## Demo

Open `demo/index.html` directly, or serve the portfolio folder:

```bash
python3 -m http.server 8000
# http://localhost:8000/projects/sales-call-qa/demo/
```

The demo uses a deterministic heuristic, not Gemini. It is there to show the shape of the product: the rubric, the quote check, the review gate and the Monday digest.
