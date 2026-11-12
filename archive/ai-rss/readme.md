# AI-RSS — Potaterrr Python News Video Generator

A pure-Python pipeline that turns **Hacker News Python stories** into a **Potaterrr-style news video** — the potato mascot on an AI-generated background, API voiceover, perfectly synced burned-in subtitles, and an API-generated video b-roll clip that crossfades in for each story's topic — saved to `~/Downloads/generated` and pushed to Telegram.

Everything generative runs through one API key (Agnes AI, OpenAI-compatible): the script LLM and the video b-roll. The voiceover runs on the local voicebox (the Agnes hub hosts no TTS models — verified live); ComfyUI remains an optional extra.

Pure Python, no orchestrators. One command does everything:

```
./start.sh
```

```
HN Python feed → Agnes chat API writes the script + a topic per story
  (agnes-2.5-flash, your prompt)
  → auto intro segment: "Here's your tech news this Thursday, October 1!" (auto-dated)
  → voicebox TTS, one clip per segment (exact timings measured) while the
    Agnes Video API generates a b-roll clip per story topic IN PARALLEL
    (agnes_tts.py wraps voicebox; agnes_broll.py does the b-roll)
  → the pfp IS the background: the intro plays over it, each story crossfades
    to its topic b-roll, the closer returns to the pfp
  → ffmpeg burns subtitles timed to the real audio
  → saved to ~/Downloads/generated → Telegram: video + caption, then a
    separate message with all story links
```

## 🧩 Architecture

```
┌────────────────────── Host (all Python) ─────────────────────────────┐
│  generate_news.py  (./start.sh news)                                 │
│    1. scrape HN RSS (hnrss.org, with backup feeds)                   │
│    2. Agnes chat API → writes {title, segments} script               │
│       (channel_style.py)   │
│  render_server.py  :8777  (systemd: ai-rss-render)                   │
│    3. agnes_tts.py   → voice per segment (voicebox :17493) →         │
│       voice.mp3 + exact timings                                      │
│    3b. agnes_broll.py → Agnes Video clip per story topic, in         │
│        parallel with TTS (slides.json manifest of broll_XX.mp4)      │
│    4. comfy_bg.py     → background: the raw pfp on a blurred zoom    │
│    5. render_video.py → ffmpeg: mascot + b-roll + synced ASS subs    │
│    6. notify_telegram.py → sendVideo + 🤖 bold-headline caption      │
│  Output: ~/Downloads/generated/                                      │
└──────────────────────────────────────────────────────────────────────┘
```

Failures degrade gracefully: LLM JSON broken → retries → digest fallback, voicebox down → silent video, Agnes b-roll down (or video queue full) → plain mascot background, ComfyUI down → gradient background, hnrss down → official HN RSS, Telegram hiccup → upload retried.

## 🚀 Usage

```bash
./start.sh          # start services, then scrape HN and render today's video
./start.sh news     # generate a news video now (services must be up)
./start.sh video    # render with a fixed test script (no scraping)
./start.sh up       # just start the services
./start.sh status   # what's running
./start.sh stop     # stop everything
```

Useful variations:
```bash
python3 generate_news.py --dry-run    # scrape + script preview, no render
python3 generate_news.py --story ai   # different HN search term
systemd-run --user --unit=ai-rss-news --collect bash -c "cd '$(pwd)' && python3 generate_news.py"
journalctl --user -u ai-rss-news -f   # watch a run in progress
```

## 📥 Setup (fresh machine / new distro)

One command:

```bash
./install.sh
```

It detects your package manager (apt / dnf / pacman / zypper) and is **idempotent** — safe to re-run after a distro hop:

1. system packages — git, curl, ffmpeg, python3 + venv, cmake, build tools
2. repo venv `.venv` (pillow + opencv-python-headless) — runs the render server
3. clones ComfyUI into `~/git-clones/` (optional background img2img / mascot mode)
4. downloads the model — SD-Turbo (~5.2GB, optional background img2img), skipped when already present
5. installs the 3 systemd user units with paths rewritten to this checkout
6. creates `.env` from `.env.example`

Flags: `--no-system` (skip packages), `--no-models` (skip the ~10GB), `--units-only` (just reinstall the units).

voicebox is private — install it with `VOICEBOX_REPO=<git-url> ./install.sh`. It IS the voice: without it you get a silent video (every other failure also degrades gracefully).

Finish by hand:
```bash
$EDITOR .env                                    # AGNES_API_KEY + TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID
cp ~/somewhere/mascot.jpeg ~/Downloads/pfp.jpeg  # the intro/outro background
./start.sh up
```

### Services (systemd user units, auto-start on boot)
- **Render server**: `ai-rss-render.service` — HTTP pipeline on :8777.
- **ComfyUI**: `comfyui.service` — `--cpu`, :8188, model `sd_turbo.safetensors` (optional background img2img / mascot mode).
- **voicebox**: `voicebox.service` — :17493, engine kokoro (CPU-friendly), profile `inodepi` (voice `am_fenrir`) — the voiceover engine.

The main path (script + b-roll) needs **no local models** — just `AGNES_API_KEY` in `.env`. Only the voice needs the local voicebox service.

```bash
systemctl --user status ai-rss-render comfyui voicebox
curl localhost:8188/system_stats           # ComfyUI
curl localhost:17493/health                # voicebox
```

### Telegram
Bot values live in the project `.env` (the render service loads this file — `cp .env.example .env` to start):
```
TELEGRAM_BOT_TOKEN=123456:ABC...
TELEGRAM_CHAT_ID=your_numeric_id
```
then `systemctl --user restart ai-rss-render`.

### Firewall (only if you re-add external callers)
The render server listens on `0.0.0.0:8777`. For local-only use, no firewall rules are needed beyond loopback.

## 🎬 What the videos look like

- **Background**: `~/Downloads/pfp.jpeg` used DIRECTLY — sharp, centered full-width, over a blurred darkened zoom of itself (instant, deterministic, no ComfyUI). `AI_RSS_BG_MODE=mascot` re-renders it via img2img, `scene` gives the abstract newsroom, `gradient` needs no ComfyUI.
- **Subtitles**: synced to the real TTS audio per segment (each segment is synthesized separately and timed with ffprobe — no word-count guessing).
- **Intro**: the video opens on the mascot photo with an auto-dated greeting — "Here's your tech news this Thursday, October 1!" — under the title card.
- **B-roll**: while each story is read, the video crossfades (0.4s) to an Agnes-Video-generated clip of that story's topic (generated in parallel with the voice so it adds ~no wall-clock time), then returns to the mascot photo for the closer. `AI_RSS_SLIDES=0` disables it; any b-roll failure silently falls back to the plain mascot background (there is no local slides fallback anymore).
- **Captions**: video caption is a Telegram post — `📺 bold title`, then one `🤖 <b>mini-headline</b> details` line per story (always ≤1024 chars, tags never sliced). A SECOND plain-text message posts each story as `topic: link` (raw URLs — tappable in Telegram AND safe to copy-paste to Facebook, which strips hyperlinks).
- **Lip-sync**: removed. `lip_sync.py` is no longer in the repo. The `AI_RSS_LIPSYNC=1` env var is accepted but does nothing — renders fall back to the static mascot / ComfyUI background.

## 🔥 Smoke test

```bash
./start.sh video
```

Direct render-server call (bypasses everything):
```bash
curl -X POST http://localhost:8777/render -H 'Content-Type: application/json' \
  -d '{"title":"T","segments":["Hello.","Second line."],"smoke":true}'
```

## ✍️ Your prompt

**One place to edit:** `channel_style.py` (`SYSTEM_PROMPT`). The direct pipeline (`generate_news.py`) picks it up on every run — nothing to do. The prompt drives the whole style: hooks, segment length, sign-off.


## 🖼️ Mascot / img2img images

Generate mascot renders via ComfyUI (the `AI_RSS_BG_MODE=mascot` path in `comfy_bg.py`). There is no standalone `comfy_img2img.py` anymore — mascot img2img goes through ComfyUI directly, so this requires ComfyUI running on :8188.

## 📁 Files

| File | Role |
|---|---|
| `generate_news.py` | Main pipeline: scrape HN → LLM script → render server |
| `channel_style.py` | Potaterrr prompt — single source of truth |
| `render_server.py` | HTTP pipeline :8777 — API voice → mascot/b-roll → ffmpeg → Telegram |
| `render_video.py` | ffmpeg renderer — synced ASS subtitles, title card, b-roll crossfades |
| `agnes_broll.py` | Agnes Video API client — one b-roll clip per story topic |
| `comfy_bg.py` | Video background — potato mascot (default) or newsroom scene |
| `agnes_tts.py` | Voiceover wrapper — voicebox TTS (per-segment + exact timing JSON); API TTS only if a hub TTS model ever exists |
| `voicebox_tts.py` | Local voicebox TTS — same contract as agnes_tts.py |
| `notify_telegram.py` | Telegram notifier — sendVideo + HTML caption |
| `ai-rss-render.service` | systemd user unit — render server |
| `comfyui.service` | systemd user unit — ComfyUI (optional background img2img / mascot mode) |
| `voicebox.service` | systemd user unit — voicebox TTS |
| `start.sh` | one command: start services + generate the video |
| `install.sh` | fresh-machine setup: packages, venvs, clones, models, units |
| `requirements.txt` | repo venv deps — pillow (background compositing) + opencv-python-headless (unused — kept for compat) |
| `.env.example` | template for `.env` (Telegram bot values) |
| `out/` | gitignored artifacts |
