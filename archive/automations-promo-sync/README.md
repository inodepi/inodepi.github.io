# automations-promo — two weeks of inodepi automation content

14 vertical videos, one per day, same file posted to LinkedIn / Reels / Shorts / TikTok. Copy: `CAPTIONS.md`. Schedule: `POSTING.md`. Direction: `TREATMENT.md`.

## Deliverables (`out/`)
- `day01.mp4` — 60 s Dark Tech Keynote master; `day01-wide.mp4` 16:9 stage version for the website branch; `day01.srt`
- `day02.mp4` … `day13.mp4` — Living Screencast and Desktop Flythrough cuts (see `POSTING.md` for the map)
- `day14.mp4` — 30 s results reel
- `poster_day*.jpg` — thumbnails; `day*.srt` — subtitles where there is narration
- `cues_day*.json` — caption cues used for each `.srt`

## Sources
- `keynote/` — Dark Tech Keynote engine (days 1, 4, 5, 6, 14). `build.sh <dayNN> <posterTime>` renders one day; `build_all.sh` renders all five + the wide master.
- `screencast/` — Living Screencast (days 2, 3, 8, 9, 11, 12, 13), `build.sh <dayNN>`.
- `flythrough/` — Desktop Flythrough (days 7, 10), `build.sh <dayNN>`.
- `audio.py` — shared score + foley + voice mix (family-aware: `python audio.py NN keynote|screencast|flythrough`).
- `tools/export_day.mjs` (keynote timelines), `tools/export_cues.mjs` (caption cues from the page).

Requires the Lemo-Opuscar library at `~/lemo-opuscar` (`LIB` env overrides) and its `.venv`. Rendering uses headless Chromium; 3D styles need `LEMO_ANGLE=swiftshader` on machines without a GPU.

## Brand
`#0d1117` base · `#161d28` surface · `#f0b429` accent · `#2ea886` status · `#e6edf3` text · `#94a3b8` labels · Inter / Inter Tight / JetBrains Mono. One accent element per frame; green only for live status; cream reserved for personality beats.

## Facts
Stats used in the films: 47 invoices chased per week, 64 dead leads revived, 128 calls scored per week — from the four public builds (`ar-invoice-reminder-agent`, `dead-lead-retrieval`, `sales-call-qa`, `lead-gen/CRM ops`). Keep these numbers as the proof; do not enrich them in later edits.

## Discord delivery (private repo)
Repo: `inodepi/automations-promo-sync`. A GitHub Action posts that day's delivery copy + caption + hashtags to Discord every day at 07:30 UTC+8 (and on demand by day). Delivery copies live in `out/discord/` (CRF 28, 0.5–6.7 MB) so they fit Discord's upload ceiling; full-quality masters stay local in `out/` and are not committed. One-time setup: add the `DISCORD_WEBHOOK_URL` repo secret — see `SETUP-DISCORD.md`. The webhook is never stored in code.

## Credits and rights
See `CREDITS`. All pictures, UI and type layouts are drawn in code; no stock or generated imagery. Voice: Kokoro TTS (Apache-2.0). Music/foley: original, synthesised. Third-party names appear only as plain labels; no third-party logos or interfaces are reproduced.
