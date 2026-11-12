#!/bin/sh
# build_all.sh — build the five keynote days, then the 16:9 site version of day 1
set -e
HERE=$(cd "$(dirname "$0")" && pwd)
LIB=${LIB:-$HOME/lemo-opuscar}; export LIB
cd "$LIB"

sh "$HERE/build.sh" 01 22.5
sh "$HERE/build.sh" 04 9.0
sh "$HERE/build.sh" 05 15.6
sh "$HERE/build.sh" 06 15.0
sh "$HERE/build.sh" 14 26.0

# 16:9 stage version of the master for the website branch
node "$HERE/tools/export_cues.mjs" "$HERE/keynote" "$HERE/out/cues_day01_wide.json" --q 'day=1' --size 1920x1080 >/dev/null
node core/render/video.mjs "$HERE/keynote" --fps 24 --size 1920x1080 --q 'day=1' --workers 4 --out "$HERE/out/video_day01_wide.mp4"
sh core/render/mux.sh "$HERE/out/video_day01_wide.mp4" "$HERE/out/mix_day01.wav" "$HERE/out/day01-wide.mp4" 24
node core/render/still.mjs "$HERE/keynote" 22.5 --size 1920x1080 --q 'day=1' --out "$HERE/out/poster01w" >/dev/null
mv "$HERE/out/poster01w/t_22.5.jpg" "$HERE/out/poster_day01_wide.jpg" 2>/dev/null || true
echo "keynote days + wide done"
