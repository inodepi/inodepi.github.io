#!/usr/bin/env bash
# ai-rss — local Python news-video pipeline (pure Python, end to end)
#
#   ./start.sh           start services, then scrape HN + render a news video
#   ./start.sh up        just start the services
#   ./start.sh news      generate a news video now (services must be up)
#   ./start.sh video     render a test video with a fixed script (no scraping)
#   ./start.sh status    show what's running
#   ./start.sh stop      stop everything
#
# Pipeline (all Python):
#   scrape HN -> llama-server writes the script -> voicebox TTS (per-segment
#   timings) -> ComfyUI renders the Potaterrr potato mascot -> ffmpeg burns
#   synced subtitles -> Telegram sendVideo.
#
# Services:
#   llama-server    :1234   LLM that writes the script (Qwen2.5 7B, local GGUF)
#   comfyui         :8188   SD-Turbo backgrounds + mascot img2img (CPU)
#   voicebox        :17493  kokoro TTS voiceover (CPU)
#   ai-rss-render   :8777   render pipeline (Python HTTP server)

set -u

UNITS=(llama-server comfyui voicebox ai-rss-render)
SCRIPT_DIR="$(dirname "$(readlink -f "$0")")"

is_up() { curl -s --max-time 3 -o /dev/null -w '%{http_code}' "$1" 2>/dev/null | grep -q 200; }

wait_for() { # wait_for <name> <url> <tries>
  local name="$1" url="$2" tries="${3:-30}"
  for _ in $(seq 1 "$tries"); do
    is_up "$url" && { echo "  ✓ $name is up ($url)"; return 0; }
    sleep 2
  done
  echo "  ✗ $name did not come up at $url" >&2
  return 1
}

start_units() {
  echo "Starting ai-rss services..."
  for u in "${UNITS[@]}"; do
    systemctl --user enable --now "$u.service" >/dev/null 2>&1
    systemctl --user start "$u.service" 2>/dev/null
  done
  wait_for "llama-server"  "http://127.0.0.1:1234/health"
  wait_for "comfyui"       "http://127.0.0.1:8188/system_stats"
  wait_for "voicebox"      "http://127.0.0.1:17493/health"
  wait_for "render server" "http://127.0.0.1:8777/health"
}

cmd_start() {
  start_units
  echo ""
  echo "Stack ready — generating today's news video..."
  echo ""
  news
}

cmd_up() {
  start_units
  echo ""
  echo "Stack ready."
  echo "  - Generate news video:  ./start.sh news"
  echo "  - Fixed-script render:  ./start.sh video"
}

stop() {
  echo "Stopping ai-rss services..."
  for u in "${UNITS[@]}"; do systemctl --user stop "$u.service" 2>/dev/null; done
  echo "  ✓ all stopped"
}

status() {
  printf "%-14s %-8s %s\n" "SERVICE" "STATE" "ENDPOINT"
  for u in "${UNITS[@]}"; do
    printf "%-14s %-8s %s\n" "$u" "$(systemctl --user is-active "$u.service" 2>/dev/null || echo '?')"
  done
  echo ""
  is_up "http://127.0.0.1:1234/health"          && echo "  ✓ LLM responding"
  is_up "http://127.0.0.1:8188/system_stats"    && echo "  ✓ ComfyUI responding"
  is_up "http://127.0.0.1:17493/health"         && echo "  ✓ voicebox responding"
  is_up "http://127.0.0.1:8777/health"          && echo "  ✓ render server responding"
}

video() {
  echo "Rendering a test video via the render server (fixed script, no scraping)..."
  curl -s --max-time 1800 -X POST http://127.0.0.1:8777/render \
    -H 'Content-Type: application/json' \
    -d '{
      "title": "Manual Test Video",
      "segments": [
        "Spuds, this is a manual render straight from start.sh.",
        "The potato mascot fronts the news while subtitles follow the real audio.",
        "Drop a comment if this is crisp enough. This is Potaterrr - stay crispy."
      ]
    }'
  echo
}

news() {
  echo "Generating a news video (pure Python: scrape -> LLM -> TTS -> potato mascot -> Telegram)..."
  echo "This can take 10-20 minutes on CPU. Patience, spud."
  python3 "$SCRIPT_DIR/generate_news.py"
}

case "${1:-start}" in
  start)  cmd_start ;;
  up)     cmd_up ;;
  stop)   stop ;;
  status) status ;;
  video)  video ;;
  news)   news ;;
  *) echo "usage: $0 {start|up|news|video|status|stop}"; exit 1 ;;
esac
