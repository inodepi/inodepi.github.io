#!/usr/bin/env python3
"""Render an LTT-style news video: background + title + burned-in subtitles + voiceover.

Usage:
  python3 render_video.py payload.json --voice voice.mp3 [--bg background.jpg] [--out out]
      [--slides slides.json]

payload.json format:
  {"title": "Video title", "segments": ["sentence one.", "sentence two.", ...]}

With --slides (a make_slides.py manifest), the video becomes a slideshow: it
opens on the background photo (the dated intro plays over it), crossfades to
an AI slide while each story segment plays, and returns to the photo for the
closer. Without it, the background is static like before.

Requirements: ffmpeg + ffprobe on PATH. Python stdlib only.
The --voice file is optional; without it you get a silent render (handy for testing).
On success prints lines like VIDEO_PATH=/abs/path/out.mp4 for the caller to consume.
"""
import argparse
import json
import os
import shutil
import subprocess
import sys
import tempfile
from datetime import datetime
from pathlib import Path

W, H = 1080, 1920
FPS = 30
ASS_STYLE_NAME = "NewsCap"

ASS_HEADER = """[Script Info]
ScriptType: v4.00+
PlayResX: {w}
PlayResY: {h}
WrapStyle: 0
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: {style},DejaVu Sans,58,&H00FFFFFF,&H000000FF,&HC8101010,&H64000000,-1,0,0,0,100,100,0,0,1,4,2,2,70,70,320,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""


def die(msg: str) -> None:
    print(f"ERROR: {msg}", file=sys.stderr)
    sys.exit(1)


def check_ffmpeg() -> None:
    for tool in ("ffmpeg", "ffprobe"):
        if shutil.which(tool) is None:
            die(f"{tool} not found on PATH — install ffmpeg first")


def ffprobe_duration(path: Path) -> float:
    """Duration of an audio file in seconds, or 0.0 when unknown."""
    try:
        out = subprocess.run(
            ["ffprobe", "-v", "error", "-show_entries", "format=duration",
             "-of", "default=noprint_wrappers=1:nokey=1", str(path)],
            capture_output=True, text=True, timeout=60,
        )
        return max(0.0, float(out.stdout.strip()))
    except Exception:
        return 0.0


def words(text: str) -> int:
    return max(1, len(text.split()))


def split_cue(text: str, limit: int = 42) -> list[str]:
    """Split a long segment into <=42-word caption chunks (2 lines max each)."""
    parts = text.split()
    if len(parts) <= limit:
        return [text]
    chunks, cur = [], []
    for p in parts:
        cur.append(p)
        if len(cur) >= limit:
            chunks.append(" ".join(cur))
            cur = []
    if cur:
        chunks.append(" ".join(cur))
    return chunks


def ass_time(seconds: float) -> str:
    seconds = max(0.0, seconds)
    h = int(seconds // 3600)
    m = int(seconds % 3600 // 60)
    s = seconds % 60
    return f"{h:d}:{m:02d}:{s:05.2f}"


def build_cues(segments: list[str], total_audio: float,
               timings: list[dict] | None = None) -> list[tuple[float, float, str]]:
    """Assign start/end times to caption chunks.

    When per-segment `timings` (from voicebox_tts.py) are available, cues use
    the REAL synthesized audio windows — true subtitle/audio sync. Otherwise
    fall back to the word-count estimate.
    """
    if timings:
        cues = []
        for t in timings:
            text = str(t.get("text", "")).strip()
            start, end = float(t.get("start", 0)), float(t.get("end", 0))
            if not text or end <= start:
                continue
            chunks = split_cue(text)
            span = (end - start) / len(chunks)
            for i, chunk in enumerate(chunks):
                cues.append((start + i * span, start + (i + 1) * span, chunk))
        if cues:
            return cues

    speaking = max(total_audio, words(" ".join(segments)) / 2.8)  # fallback: ~168 wpm
    per_word = speaking / max(1, words(" ".join(segments)))

    cues, t = [], 0.0
    for seg in segments:
        for chunk in split_cue(seg):
            dur = max(0.8, words(chunk) * per_word)
            cues.append((t, t + dur, chunk))
            t += dur
    # Stretch or squeeze cue timing so the last subtitle ends with the real audio.
    if cues and total_audio > 0:
        span = cues[-1][1]
        if span > 0:
            k = total_audio / span
            cues = [(s * k, e * k, txt) for s, e, txt in cues]
    return cues


def ass_escape(text: str) -> str:
    return text.replace("\\", "\\\\") \
               .replace("{", "\\{") \
               .replace("}", "\\}") \
               .replace("\n", "\\N")


def write_ass(path: Path, cues: list[tuple[float, float, str]]) -> None:
    lines = [ASS_HEADER.format(w=W, h=H, style=ASS_STYLE_NAME)]
    for start, end, text in cues:
        lines.append(f"Dialogue: 0,{ass_time(start)},{ass_time(end)},{ASS_STYLE_NAME},,0,0,0,,{ass_escape(text)}")
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def write_title_ass(path: Path, title: str, end: float) -> None:
    body = ASS_HEADER.format(w=W, h=H, style="NewsTitle")
    body = body.replace(f"Style: {ASS_STYLE_NAME},", "Style: NewsTitle,")
    # Title styling: bigger, yellow, top position (alignment 8), shown for `end` seconds.
    body = body.replace(
        f"Style: NewsTitle,DejaVu Sans,58,&H00FFFFFF",
        f"Style: NewsTitle,DejaVu Sans,72,&H0000E5FF",
    ).replace(",1,4,2,2,70,70,320,1", ",1,4,2,8,70,70,140,1")
    lines = [body,
             f"Dialogue: 1,0:00:00.00,{ass_time(end)},NewsTitle,,0,0,0,,{ass_escape(title)}"]
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def segment_windows(segments: list[str], cues: list[tuple[float, float, str]]) -> list[tuple[float, float]]:
    """Per-segment [start, end] windows derived from the (ordered) cue list."""
    wins, ptr = [], 0
    for seg in segments:
        n = len(split_cue(seg))
        group = cues[ptr:ptr + n]
        if not group:
            break
        wins.append((group[0][0], group[-1][1]))
        ptr += n
    return wins


def build_bgtimeline(work: Path, photo: str, slide_for: dict[int, str],
                     windows: list[tuple[float, float]], total: float) -> str | None:
    """Build the slideshow background track: photo -> slides -> photo.

    One silent video (video_dur long) assembled with xfade crossfades between
    per-segment slide windows; the mascot photo holds before the first slide,
    after the last one, and whenever a segment has no slide. Returns the mp4
    path, or None when there is nothing to show (no usable slides/windows).
    """
    XF = 0.4  # crossfade seconds
    PAD = 0.35  # slide lingers this long past the segment's last word

    events = []
    for idx in sorted(slide_for):
        if idx < len(windows):
            s, e = windows[idx]
            events.append([max(0.0, s - PAD), min(total, e + PAD), idx])
    events.sort(key=lambda ev: ev[0])
    for i in range(1, len(events)):  # resolve overlaps by clipping
        if events[i][0] < events[i - 1][1]:
            events[i][0] = events[i - 1][1]
    events = [ev for ev in events if ev[1] - ev[0] > 0.6]
    if not events:
        return None

    inputs = ["-loop", "1", "-i", photo, "-loop", "1", "-i", photo]
    for _, _, idx in events:
        inputs += ["-i", str(slide_for[idx])]

    fit = f"scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},setsar=1,fps={FPS},format=yuv420p"
    parts = [
        f"[0:v]{fit},eq=brightness=-0.25[pre]",  # dimmed photo under the title card
        f"[1:v]{fit}[post]",
    ]
    for k in range(len(events)):
        parts.append(f"[{k + 2}:v]{fit}[s{k}]")

    track = "pre"
    for k, (s, _e, _idx) in enumerate(events):
        out = f"x{k}"
        parts.append(f"[{track}][s{k}]xfade=transition=fade:duration={XF}:offset={s + XF * k:.3f}[{out}]")
        track = out
    if total - events[-1][1] - XF * len(events) >= 0.3:
        parts.append(f"[{track}][post]xfade=transition=fade:duration={XF}:"
                     f"offset={events[-1][1] + XF * len(events):.3f}[vbg]")
    else:
        parts.append(f"[{track}]null[vbg]")

    timeline = work / "bgtimeline.mp4"
    cmd = ["ffmpeg", "-y", *inputs, "-filter_complex", ";".join(parts),
           "-map", "[vbg]", "-t", f"{total:.2f}", "-r", str(FPS),
           "-c:v", "libx264", "-preset", "veryfast", "-crf", "20",
           "-pix_fmt", "yuv420p", str(timeline)]
    proc = subprocess.run(cmd, capture_output=True, text=True, timeout=1200)
    if proc.returncode != 0 or not timeline.is_file():
        print(f"WARN: slideshow timeline failed: {(proc.stderr or '')[-300:]} — using static background",
              file=sys.stderr)
        return None
    print(f"Slideshow: {len(events)} slide(s) crossfaded over the mascot photo")
    return str(timeline)


def make_background(workdir: Path) -> str:
    """Background priority: AI_RSS_BG image > ComfyUI AI image (AI_RSS_COMFY=1) > gradient."""
    bg_path = Path(os.environ.get("AI_RSS_BG", ""))
    if bg_path and bg_path.is_file():
        return str(bg_path)

    if os.environ.get("AI_RSS_COMFY", "") == "1":
        try:
            comfy = workdir / "comfy_bg.png"
            script_dir = Path(__file__).resolve().parent
            proc = subprocess.run(
                [sys.executable, str(script_dir / "comfy_bg.py"), str(comfy)],
                capture_output=True, text=True, timeout=600,
            )
            if proc.returncode == 0 and comfy.is_file():
                print(f"Background: ComfyUI AI image ({comfy})")
                return str(comfy)
            print(f"WARN: ComfyUI background failed (rc={proc.returncode}) — falling back to gradient", file=sys.stderr)
        except Exception as e:
            print(f"WARN: ComfyUI background error: {e} — falling back to gradient", file=sys.stderr)

    # Generate a dark vertical gradient (navy -> purple) once and reuse it.
    grad = workdir / "background.png"
    subprocess.run(
        ["ffmpeg", "-y", "-f", "lavfi",
         "-i", f"gradients=s={W}x{H}:c0=0x1a1a2e:c1=0x4a1e6e:x0=0:y0=0:x1=0:y1={H}",
         "-frames:v", "1", str(grad)],
        capture_output=True, timeout=120, check=True,
    )
    return str(grad)


def load_slides(slides_path: Path | None) -> dict[int, str]:
    """Read a make_slides.py manifest: {"slides": {"<segment idx>": "slide_XX.png"}}."""
    if not slides_path or not slides_path.is_file():
        return {}
    try:
        data = json.loads(slides_path.read_text(encoding="utf-8"))
        base = slides_path.resolve().parent
        out = {}
        for k, v in (data.get("slides") or {}).items():
            p = base / str(v)
            if int(k) >= 0 and p.is_file():
                out[int(k)] = str(p)
        return out
    except Exception as e:
        print(f"WARN: cannot read slides manifest {slides_path}: {e}", file=sys.stderr)
        return {}


def render(payload_path: Path, voice: Path | None, bg: Path | None, outdir: Path,
           base_video: Path | None = None, timings_path: Path | None = None,
           slides_path: Path | None = None) -> Path:
    check_ffmpeg()

    try:
        payload = json.loads(payload_path.read_text(encoding="utf-8"))
    except Exception as e:
        die(f"cannot read payload {payload_path}: {e}")

    title = str(payload.get("title") or "Python News Roundup")[:80]
    segments = [str(s).strip() for s in (payload.get("segments") or []) if str(s).strip()]
    if not segments:
        die("payload has no segments")

    timings = None
    if timings_path and timings_path.is_file():
        try:
            timings = json.loads(timings_path.read_text(encoding="utf-8"))
            print(f"Subtitles: using real per-segment audio timings ({len(timings)} segments)")
        except Exception as e:
            print(f"WARN: cannot read timings {timings_path}: {e} — falling back to estimate", file=sys.stderr)

    outdir.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="ai_rss_") as td:
        work = Path(td)

        total_audio = ffprobe_duration(voice) if voice and voice.is_file() else 0.0
        cues = build_cues(segments, total_audio, timings)
        video_dur = max(cues[-1][1], total_audio, 2.0) + 0.6

        # Slideshow timeline: only for the static-background path (never on top
        # of a lip-synced talking video), and only with usable slide images.
        slideshow = None
        slide_for = load_slides(slides_path)
        if slide_for and not (base_video and base_video.is_file()):
            if timings and len(timings) == len(segments):
                windows = [(float(t.get("start", 0)), float(t.get("end", 0))) for t in timings]
            else:
                windows = segment_windows(segments, cues)
            photo = make_background(work) if bg is None else str(bg)
            slideshow = build_bgtimeline(work, photo, slide_for, windows, video_dur)

        subs = work / "subs.ass"
        write_ass(subs, cues)
        titl = work / "title.ass"
        write_title_ass(titl, title, min(4.0, video_dur))

        vf = (
            f"subtitles={subs}:force_style='Outline=4',"
            f"subtitles={titl},"
            f"drawbox=x=0:y={H - 40}:w={W}:h=40:color=0x4a1e6e@0.55:t=fill"
        )

        out_path = outdir / f"ai_rss_{datetime.now():%Y%m%d_%H%M%S}.mp4"
        fit = f"scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H}"
        if base_video and base_video.is_file():
            # Lip-synced talking-potato video: burn subtitles onto it, keep its audio.
            print(f"Base video: {base_video}")
            cmd = ["ffmpeg", "-y", "-i", str(base_video)]
            if voice and voice.is_file():
                cmd += ["-i", str(voice)]
            cmd += ["-vf", fit + "," + vf]
            if voice and voice.is_file():
                cmd += ["-map", "0:v:0", "-map", "1:a:0", "-c:a", "aac", "-b:a", "160k", "-shortest"]
            cmd += ["-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-pix_fmt", "yuv420p", str(out_path)]
        else:
            if slideshow:
                cmd = ["ffmpeg", "-y", "-i", slideshow]
            else:
                background = make_background(work) if bg is None else str(bg)
                cmd = ["ffmpeg", "-y", "-loop", "1", "-i", background]
            if voice and voice.is_file():
                cmd += ["-i", str(voice)]
            cmd += [
                "-vf", fit + "," + vf,
                "-t", f"{video_dur:.2f}",
                "-r", str(FPS),
                "-c:v", "libx264", "-preset", "veryfast", "-crf", "20",
                "-pix_fmt", "yuv420p",
            ]
            if voice and voice.is_file():
                cmd += ["-c:a", "aac", "-b:a", "160k", "-shortest"]
            cmd += [str(out_path)]

        proc = subprocess.run(cmd, capture_output=True, text=True, timeout=1800)
        if proc.returncode != 0:
            die("ffmpeg failed:\n" + (proc.stderr[-2000:] if proc.stderr else "(no stderr)"))

    print(f"TITLE={title}")
    print(f"SEGMENTS={len(segments)}")
    print(f"VIDEO_PATH={out_path.resolve()}")
    return out_path


def main() -> None:
    ap = argparse.ArgumentParser(description="Render an AI-RSS news video")
    ap.add_argument("payload", type=Path, help="JSON file: {title, segments[]}")
    ap.add_argument("--voice", type=Path, default=None, help="voiceover audio (mp3/wav); optional for a silent test render")
    ap.add_argument("--bg", type=Path, default=None, help="background image; default is a generated gradient")
    ap.add_argument("--base-video", type=Path, default=None,
                    help="pre-rendered talking-head video (from lip_sync.py) — subtitles are burned onto it")
    ap.add_argument("--timings", type=Path, default=None,
                    help="voicebox_tts.py timings JSON (<voice>.json) for exact subtitle sync")
    ap.add_argument("--slides", type=Path, default=None,
                    help="make_slides.py manifest (slides.json) for the topic slideshow")
    ap.add_argument("--out", type=Path, default=Path("out"), help="output directory (default ./out)")
    args = ap.parse_args()

    render(args.payload, args.voice, args.bg, args.out, args.base_video, args.timings, args.slides)


if __name__ == "__main__":
    main()
