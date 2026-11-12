#!/bin/sh
# build.sh <dayNN> — one keynote day: events → audio mix → video → mux
set -e
HERE=$(cd "$(dirname "$0")" && pwd)
LIB=${LIB:-$HOME/lemo-opuscar}; export LIB
DAY=${1:-01}; DAYNUM=$(printf "%d" "$DAY")
cd "$LIB"
node core/render/events.mjs "$HERE/keynote" --q "day=$DAYNUM" --size 1080x1920 --out "$HERE/keynote/events_day$DAY.json" >/dev/null
node core/render/readcheck.mjs "$HERE/keynote" --q "day=$DAYNUM" --size 1080x1920 >/dev/null || echo "readcheck: see output"
"$LIB/.venv/bin/python" "$HERE/audio.py" "$DAY"
LINES=$(grep -c '"id"' "$HERE/keynote/voices/timeline_day$DAY.json" 2>/dev/null || echo 0)
if [ "${LINES:-0}" -gt 0 ]; then
  node "$HERE/tools/export_cues.mjs" "$HERE/keynote" "$HERE/out/cues_day$DAY.json" --q "day=$DAYNUM" --size 1080x1920 >/dev/null
  "$LIB/.venv/bin/python" "$LIB/core/render/srt.py" "$HERE/out/cues_day$DAY.json" "$HERE/out/day$DAY.srt"
fi
node core/render/video.mjs "$HERE/keynote" --fps 24 --size 1080x1920 --q "day=$DAYNUM" --workers 4 --out "$HERE/out/video_day$DAY.mp4"
sh core/render/mux.sh "$HERE/out/video_day$DAY.mp4" "$HERE/out/mix_day$DAY.wav" "$HERE/out/day$DAY.mp4" 24
POSTER=${2:-16}
node core/render/still.mjs "$HERE/keynote" "$POSTER" --size 1080x1920 --q "day=$DAYNUM" --out "$HERE/out/poster$DAY" >/dev/null
mv "$HERE/out/poster$DAY/t_$POSTER.jpg" "$HERE/out/poster_day$DAY.jpg" 2>/dev/null || true
