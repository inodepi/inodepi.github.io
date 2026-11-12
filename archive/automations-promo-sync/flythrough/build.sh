#!/bin/sh
# build.sh <day 7|10> — flythrough: events → audio mix → video (1080×1920, 30 fps) → mux
set -e
HERE=$(cd "$(dirname "$0")" && pwd); ROOT=$(cd "$HERE/.." && pwd)
LIB=${LIB:-$HOME/lemo-opuscar}; export LIB
N=${1:-07}; DAY=$(printf "%02d" "$N")
cd "$LIB"
node core/render/events.mjs "$HERE" --q "day=$N" --size 1080x1920 --out "$HERE/events_day$DAY.json" >/dev/null
"$LIB/.venv/bin/python" "$ROOT/audio.py" "$DAY" flythrough
LEMO_ANGLE=${LEMO_ANGLE:-swiftshader} node "$HERE/tools/render_frames.mjs" "$HERE" "$ROOT/out/video_day$DAY.mp4" "day=$N&dof=0" 2
sh core/render/mux.sh "$ROOT/out/video_day$DAY.mp4" "$ROOT/out/mix_day$DAY.wav" "$ROOT/out/day$DAY.mp4" 30
