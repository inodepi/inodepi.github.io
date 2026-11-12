# Living Screencast — inodepi automations (days 2, 3, 8, 9, 11, 12, 13)

One page runs all seven films: `index.html?day=N` → `main.js` → `film.js` (scenes) driven by `timeline.js` (the single source of truth for picture, voice, sound and captions).

| Day | Length | Film | Body |
|---|---|---|---|
| 2 | 45 s | hook C “You hired a person to be a cable.” → invoice chasing mid-run | `INV_CUT` |
| 3 | 45 s | “The copy-paste morning.” → 6 s of manual relay, then the same run | `INV_CUT` |
| 8 | 40 s | invoice chasing, full walkthrough | `INV_WALK` |
| 9 | 45 s | hook B “Your best employee is copy-pasting.” → dead-lead retrieval | `LEADS_CUT` |
| 11 | 40 s | dead-lead retrieval, full walkthrough | `LEADS_WALK` |
| 12 | 40 s | sales-call QA: recording → transcript → rubric → CRM note + alert | `QA` |
| 13 | 40 s | lead-gen & CRM ops: webhook → … → digest; the cursor approves, the mascot rides the message out | `OPS` |

Day 2 and Day 3 are the same 32 s body (`INV_CUT`) at different offsets: only the opening and the caption timings change.

## Build one day

```sh
sh screencast/build.sh 02        # events → readcheck → audio → video → mux → srt → poster
```

Outputs: `out/dayNN.mp4`, `out/dayNN.srt`, `out/poster_dayNN.jpg` (plus `out/video_dayNN.mp4`, `out/mix_dayNN.wav`, `out/cues_dayNN.json`).
The voice is generated once per day: `screencast/voices/lines_dayNN.json` → `core/tts/tts.py` → `voices/dayNN/` → `asr_check.py`, then `voices/dur_dayNN.json` is written for caption timing.

## Files

- `brand.js` — palette, type, the desktop, caption pill, cursor.
- `sprite.js` — the pixel potato (16×15 grid) and the node icons.
- `ui.js` — the workflow window: chrome, nodes, wires, node-detail panels, run summary, intros, end card.
- `film.js` — camera (spring-eased pushes, whip blur on the offscreen layer), the actor, the cursor, captions, and the `window.TEXTS` reading-time map.
- `tools/export_day.mjs` — writes `voices/lines_dayNN.json` and `voices/timeline_dayNN.json`.
- `tools/poster_t.mjs` — the signature frame time for each poster.

Brand: bg `#0d1117`, surface `#161d28`, border `#232c3a`, text `#e6edf3`, dim `#94a3b8`, accent `#f0b429`, status green `#2ea886`, mascot cream `#fef3c7`. Inter / Inter Tight / JetBrains Mono (`fonts/`).
