#!/bin/sh
# build.sh <dayNN> — one Living Screencast day: events → readcheck → audio → video → mux → srt → poster
# optional: WITH_POSTER=0 to skip the poster still
set -e
HERE=$(cd "$(dirname "$0")/.." && pwd)          # project root
LIB=${LIB:-$HOME/lemo-opuscar}; export LIB
DAY=${1:-02}; DAYNUM=$(expr "$DAY" + 0)
cd "$LIB"
mkdir -p "$HERE/out" "$HERE/screencast/stills"
node core/render/events.mjs "$HERE/screencast" --q "day=$DAYNUM" --size 1080x1920 --out "$HERE/screencast/events_day$DAY.json" >/dev/null
node core/render/readcheck.mjs "$HERE/screencast" --q "day=$DAYNUM" --size 1080x1920 || echo "readcheck: see output above"
"$LIB/.venv/bin/python" "$HERE/audio.py" "$DAY" screencast
node core/render/video.mjs "$HERE/screencast" --fps 30 --size 1080x1920 --q "day=$DAYNUM" --workers 2 --out "$HERE/out/video_day$DAY.mp4"
sh core/render/mux.sh "$HERE/out/video_day$DAY.mp4" "$HERE/out/mix_day$DAY.wav" "$HERE/out/day$DAY.mp4" 30
# subtitles from the page's cue list (identical timings to the burned captions)
node "$HERE/tools/export_cues.mjs" "$HERE/screencast" "$HERE/out/cues_day$DAY.json" --q "day=$DAYNUM" --size 1080x1920 >/dev/null
"$LIB/.venv/bin/python" core/render/srt.py "$HERE/out/cues_day$DAY.json" "$HERE/out/day$DAY.srt"
# poster: the frame that holds the promise (stat / digest / CTA)
POSTER_T=$(node "$HERE/screencast/tools/poster_t.mjs" "$DAYNUM")
node core/render/still.mjs "$HERE/screencast" "$POSTER_T" --q "day=$DAYNUM" --size 1080x1920 --out "$HERE/screencast/stills" --prefix "poster_day$DAY" >/dev/null
cp "$HERE/screencast/stills/poster_day$DAY$POSTER_T.jpg" "$HERE/out/poster_day$DAY.jpg"
echo "done: out/day$DAY.mp4  out/poster_day$DAY.jpg  out/day$DAY.srt"
