# automations-promo — Treatment (14-video batch)

**Client:** inodepi — automation services (n8n + AI in the client's existing stack)
**Deliverable:** 14 videos, one posted per day for 14 days, same video across LinkedIn / Reels / Shorts / TikTok. Every video ships with burned captions, an `.srt`, a poster frame, and a same-day post caption.
**Styles:** Dark Tech Keynote (pitch films) · Living Screencast (proof films) · Desktop Flythrough (before/after films)
**Language:** English. **Format:** vertical 1080×1920 master for all; video 1 also rendered 1920×1080 for the website branch embed.
**Date:** 2026-11-09

---

## 1. Brand system (from inodepi.github.io)

| Token | Value | Use |
|---|---|---|
| `--bg` | `#0d1117` | stage / base |
| `--bg-alt` | `#10161f` | secondary stage |
| `--surface` | `#161d28` | cards, panels |
| `--border` | `#232c3a` | hairlines |
| `--text` | `#e6edf3` | primary type |
| `--muted` | `#94a3b8` | labels, secondary type |
| `--accent` | `#f0b429` | the one accent — stats, CTA, the living element. **Never two accent elements per frame.** |
| `--green` | `#2ea886` | status only: `● running now`, success ticks |
| `--cream` | `#fef3c7` | personality beats only (opening/closing potato flashes) |

Type: **Inter** (UI, captions, headlines) · **Inter Tight 600** (giant numbers, tracking −4.5%) · **JetBrains Mono** (labels, filenames, status, keycaps). The potato personality is dry and lowercase — never a cartoon mascot. Tone: confident, specific, faintly wry.

---

## 2. Three candidate structures

1. **Pitch → Proof ladder (chosen).** Week 1 sells the pain and the promise (keynote grammar). Week 2 shows real workflows running (screencast grammar), one per build, then a results reel. Each asset is a self-contained post with its own hook; the arc across 14 days is *claim → evidence*.
2. **Build-in-public diary.** Each day = one process automated that day, chronological, same skin throughout. Honest, but a viewer arriving on day 9 misses the pitch, and every video needs new material.
3. **Question series.** Every video opens with a client question ("Why is my invoice follow-up manual?"), answers it, one CTA. Strong hooks, but 14 distinct questions dilute the single promise and cost the same as #1.

**Why #1:** it matches the approved slate, every video reuses the master's scenes (cutdowns and hook-swaps cost render time, not new material), and the week-1/week-2 rhythm gives the feed a reason to follow through to the proof.

**Logline:** Every repetitive process in your stack can be automated in 2–3 weeks — here it is, actually running.

**Arc of the campaign:** setup = the copy-paste tax, shown in the client's words → turn = the four builds, real footage and real counts → ending = one process, yours, automated; one ask.

---

## 3. Benchmark (grammar only, never content)

- **Linear / Vercel launch cuts**: one accent, typographic confidence, every landing on the beat, generous negative space. *Learn:* restraint and snap-grid rhythm. *Do not take:* their UI, fonts, shots, or names.
- **n8n's own product demos**: the workflow canvas as a real place — nodes, wired connectors, execution ticks. *Learn:* how a live canvas reads at phone size (thick connectors, few nodes, big status). *Do not take:* their footage or scripts.
- **Macro toy photography (flythrough only)**: low warm sun, long soft shadows on paper. *Learn:* light direction and material read. *Do not take:* any actual photo.

---

## 4. Shot lists and beat sheets

Framing: WS wide / MS medium / CU close / INS insert. Camera moves named per style grammar. Every video ends on the single CTA: **Book a fit call · inodepi.github.io**.

### Day 1 — Keynote master · 60 s · Dark Tech Keynote · 24 fps · VO
Hook: *"You hired a person to be a cable."*
1. `0.0–3.0` CU, locked — black stage, one cursor blinking. Caption types the hook. Sound: single felt tick on each word. (3 s to earn the rest.)
2. `3.0–12.0` MS, slow lateral track across a generated UI mess — CSV rows flying into a sheet, sheet into an email, email into a CRM card, a clock counter climbing. Caption: *"Copy. Paste. Repeat. Every morning."* Problem colour (dust grey) only here.
3. `12.0–26.0` MS→WS, continuous pull-back keyed per bar — the four builds as UI cards that dock into a grid, amber counters locking one per 16th: `47 invoices chased · 64 dead leads revived · 128 calls scored / week`. Green `● running now` under each. This is the master's signature shot: pull-back out of one cursor into the whole running system.
4. `26.0–40.0` INS storm on the beat — the "not the list" montage: six categories, one line each (lead-gen & CRM ops / scraping & extraction / AI agents & classifiers / reports & digests / follow-up sequences / file & systems glue). Each line is an insert expanding from its own source; the six snap into a grid on one beat. Stamp: *built in n8n — your stack, your tools.*
5. `40.0–50.0` CU, near-locked — one process card rises: *"Pick the process that eats your week. Automated in 2–3 weeks. You approve what matters."* Voice: short declaratives.
6. `50.0–60.0` WS, put-away — UI dismantles one part per beat, one amber tile left; CTA toast: *Book a fit call* + `inodepi.github.io`. End on the lit tile on an empty grid, quiet room tone.
*Also exported 1920×1080 for the website branch.*

### Day 2 — Screencast cut C · 45 s · Living Screencast · 30 fps · VO
Hook: *"You hired a person to be a cable."* → cut to a real n8n canvas (invoice-chasing workflow) already mid-run. Cursor = the user, pixel mascot = the automation. No chapter pills beyond 01–04. Camera: one continuous take inside the screen; push-in to the trigger node, follow the mascot along the run, pull back to the full window for the totals; captions in bottom pills. Beat: hook (0–3) → the manual relay shown as the canvas before/after (3–14) → the run: 47 invoices chased, follow-ups spaced, replies matched (14–32) → CTA (32–45).

### Day 3 — Hook-A variant · 45 s · Living Screencast · 30 fps · VO
Same footage as Day 2, new opening and re-timed captions: *"The copy-paste morning."* Opens on the manual relay (sheet → email → CRM) for 6 s, then the same run. Variant made by swapping the hook, not reshooting.

### Day 4 — Stat motion · 12 s loop · Dark Tech Keynote · 24 fps · no VO
Three giant numbers in sequence (one per 4 s): `47` invoices chased, `64` dead leads revived, `128` calls scored / week. Native move: **number from glyph noise** — digits scramble and lock one per 16th with a small bounce. No captions over the numbers; mono label below in `#94a3b8`. Sound: digit grains + one tuned mallet note per lock. Loops cleanly.

### Day 5 — "Not the list" montage · 30 s · Dark Tech Keynote · 24 fps · VO
Standalone cut of the master's beat 4, extended: six categories, one insert each, rising tempo (dividing the beat, not changing tempo), grid snap on the last downbeat, stamp in amber-outline. Ends on CTA.

### Day 6 — Offer + CTA cut · 25 s · Dark Tech Keynote · 24 fps · VO
Standalone cut of beats 5–6: the one process card, the 2–3 week promise, the human-approval beat (an amber switch the cursor flips), put-away, CTA. One ask only.

### Day 7 — Flythrough teaser · 20 s · Desktop Flythrough · 30 fps · no VO
Manual-relay pain only, no solution: sunlit desk, paper cards for sheet, inbox, CRM; a voxel courier hops between them carrying the same record, gets squashed by the pile, one card jolts on the beat. Ends mid-hop on a caption: *"Tomorrow: the same job, one hop."* Sets up Day 10.

### Day 8 — Screencast #1: invoice chasing · 40 s · Living Screencast · 30 fps · VO
Full end-to-end walkthrough: trigger → match invoice → draft follow-up → send → log. Mascot rides the execution ticks; one whip-pan per hand-off; spotlight freeze on `47 chased` with the workflow showing green. CTA.

### Day 9 — Hook-B variant · 45 s · Living Screencast · 30 fps · VO
Same canvas as Day 2/8, new hook: *"Your best employee is copy-pasting."* Opens on a dead-lead backlog card, then cuts to the dead-lead-retrieval workflow running. Re-timed captions only.

### Day 10 — Flythrough full · 30 s · Desktop Flythrough · 30 fps · VO
Before/after in one take: same desk, same cards; a courier carries one record manually (hops, waits, drops) — then the camera whips and the same record travels as one data run along a lit route, cards update in sequence, curtain-call pull-back over the whole desk; the title card drops in open space with `2–3 weeks` on it.

### Day 11 — Screencast #2: dead-lead retrieval · 40 s · Living Screencast · 30 fps · VO
Canvas: stale lead list → enrichment → scoring → first-touch sequence → reply classification. Stats: `64 dead leads revived`. One freeze on the reply that comes back.

### Day 12 — Screencast #3: sales-call QA scoring · 40 s · Living Screencast · 30 fps · VO
Canvas: call recording in → transcription → rubric scoring → CRM note + alert. Stats: `128 calls scored / week`. The mascot climbs the score bars; one whip-pan from transcript row to the score card.

### Day 13 — Screencast #4: lead-gen & CRM ops · 40 s · Living Screencast · 30 fps · VO
Canvas: webhook → enrichment → dedupe → routing → CRM update → digest email. Native move: cursor and mascot as characters — the cursor approves the digest, the mascot hops onto the sent message and rides it out of frame (ending of the series' proof week).

### Day 14 — Results reel · 30 s · Dark Tech Keynote · 24 fps · VO
Best-of remix: hook line returns (*"You hired a person to be a cable."*) → the three numbers in one stack → four one-second proof flashes (screencast stills, running ticks) → the grid snap → CTA. Bookends Day 1. Closes the two weeks.

---

## 5. Cue map (global)

- **Tempo:** 120 BPM, 16th grid, one chord per bar. All cuts and locks land on 16ths; big moments on downbeats.
- **Motif:** a three-note mallet figure (A–C–E over the pad), stated Day 1, varied by subtraction through the week, returned whole on Day 14.
- **Process music:** Day 1 additive build (one element per bar to the grid); Day 5 uses beat division to accelerate; Day 6 subtractive (elements removed until one tile remains).
- **Silences:** one near-silence before each turn (Day 1 before the pull-back, Day 8 before the `47`, Day 12 before the score card, Day 14 before the CTA).
- **J/L cuts:** the run's execution ticks arrive one beat before each screencast cut back to the canvas.
- **Ducking:** music −8 dB and foley −4 dB under VO; −14 LUFS master.

## 6. Sound design table (per family)

| Family | Ambience | Main foley | Music state |
|---|---|---|---|
| Keynote (1,4,5,6,14) | quiet room, faint fan, coil whine that tracks pressure | cursor tick, glass notification, stacking thump, light-sweep shimmer, digit grains | tuned mallets + pad, process-driven, digital-zero on every screen pause |
| Screencast (2,3,8,9,11,12,13) | room tone at −60 dB, keyboard world | thock+click, trackpad click, pane swish, popup pop, CI tick; 8-bit steps/lands for the mascot | hi-fi mallet bed vs chiptune mascot voice trading lines |
| Flythrough (7,10) | low room, paper rustle | felt thump landings, marimba pops, stamp thump, whipped whoosh sized by camera speed, data-cube ticks | warm marimba/plucked bass, one chord per bar; full theme in gaps |

## 7. Subtitle & title design

- Captions: bottom-centre toast/pill, dark translucent, 1 px light border, Inter 500 ~40 px at 1080×1920, small amber speaking dot. Enter with a small rise + fade (0.16 s). Hold ≥ max(1.8 s, speech + 0.6 s). Never over a giant number. Lift content while captions are up.
- In-frame words: mono labels in spaced caps (`#94a3b8`), numbers in Inter Tight 600 amber. Max one headline line per screen.
- Titles are diegetic where the style allows (canvas file names, card heads); no logo-first opening.
- Every video exports `.srt` with identical cue times.

## 8. Formats & delivery

- Master: vertical 1080×1920 (24 fps keynote, 30 fps screencast/flythrough). Video 1 also 1920×1080.
- Per video: `<day>-<slug>.mp4`, `poster.jpg`, `.srt`, `build.sh`; shared `CAPTIONS.md` with the 14 post texts (hook line, body 2–3 lines, CTA link in post text, hashtag block), `CREDITS`.
- No git push. Files stay in this folder.
- Self-check: contact sheets, 0.2 s action strips, full-speed viewing with sound, readcheck for every caption, loudness −14 LUFS, no black frames, "not the demo" comparison against each style's poster.
