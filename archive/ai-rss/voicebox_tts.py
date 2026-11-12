#!/usr/bin/env python3
"""Generate a voiceover MP3 via a local voicebox server — with exact timings.

Each segment is synthesized SEPARATELY and the durations are measured with
ffprobe, so subtitles can be timed to the real audio instead of a word-count
guess. Outputs:
  <out>        the full voiceover (all segments concatenated, 0.55s gaps)
  <out>.json   [{"text", "start", "end"}, ...] segment timings in seconds

voicebox exposes an async job API:
  POST /speak  -> {"id": ...}  (status "generating")
  GET  /generate/{id}/status -> poll until done
  GET  /audio/{id}           -> the audio file

Usage: voicebox_tts.py <out.mp3> --payload payload.json
Env: VOICEBOX_BASE_URL (default http://127.0.0.1:17493)
     VOICEBOX_PROFILE  (voice profile name; empty = server default)
     VOICEBOX_ENGINE   (default kokoro — the CPU-friendly engine)

Never hard-fails the pipeline: prints VOICE=ok or VOICE=failed and exits 0,
so the caller can render a silent video when voicebox is unavailable.
Stdlib-only (ffprobe/ffmpeg are on PATH).
"""
import argparse
import json
import os
import re
import subprocess
import sys
import time
import urllib.request

BASE = os.environ.get("VOICEBOX_BASE_URL", "http://127.0.0.1:17493").rstrip("/")
PROFILE = os.environ.get("VOICEBOX_PROFILE", "potaterrr") or None
ENGINE = os.environ.get("VOICEBOX_ENGINE", "kokoro")
GAP = 0.55  # seconds of silence between segments

DONE_STATES = {"completed", "complete", "success", "done"}
FAIL_STATES = {"failed", "error", "cancelled", "canceled"}

# Words kokoro should punch: uppercase cues emphasis/pitch movement, which
# fights the flat monotone delivery. AI_RSS_FLAT_VOICE=1 restores raw text.
EMPHASIS_WORDS = [
    "massive", "huge", "insane", "wild", "crazy", "incredible", "unbelievable",
    "bananas", "ridiculous", "free", "banned", "exploded", "soared", "plummeted",
    "crashed", "shut", "launches", "launched", "unveiled", "breaks", "broke",
    "record", "first", "never", "everyone", "nobody", "instantly", "finally",
    "stunning", "shocking", "jaw-dropping", "game-changing", "booms", "spiked",
]
_EMP_RE = re.compile(r"\b(" + "|".join(EMPHASIS_WORDS) + r")\b", re.IGNORECASE)


def expressive(text: str) -> str:
    """Punch up TTS input: uppercase emphasis words so kokoro's intonation
    actually moves. Applies to synthesis only — subtitle text is untouched."""
    if os.environ.get("AI_RSS_FLAT_VOICE", "") == "1":
        return text
    return _EMP_RE.sub(lambda m: m.group(1).upper(), text)


def request_json(url: str, payload: dict | None = None, timeout: int = 30) -> dict:
    data = json.dumps(payload).encode() if payload is not None else None
    req = urllib.request.Request(
        url, data=data, headers={"Content-Type": "application/json"} if data else {}
    )
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        body = resp.read().decode("utf-8", errors="replace").strip()
    # /status returns SSE ("data: {...}" lines) — extract the last JSON payload.
    if body.startswith("data:"):
        for line in reversed(body.splitlines()):
            line = line.strip()
            if line.startswith("data:"):
                chunk = line[5:].strip()
                if chunk and chunk != "[DONE]":
                    return json.loads(chunk)
        return {}
    return json.loads(body) if body else {}


def synth_one(text: str, out_path: str) -> bool:
    """Synthesize one segment to out_path. Returns True on success."""
    body = {"text": text}
    if PROFILE:
        body["profile"] = PROFILE
    if ENGINE:
        body["engine"] = ENGINE
    try:
        resp = request_json(f"{BASE}/speak", body, timeout=30)
        gen_id = resp.get("id")
        if not gen_id:
            raise ValueError(f"no job id in response: {str(resp)[:200]}")
    except Exception as e:
        print(f"VOICE=failed reason=speak_submit ({e})")
        return False

    deadline = time.time() + 900
    while time.time() < deadline:
        try:
            status = request_json(f"{BASE}/generate/{gen_id}/status", timeout=15)
            state = str(status.get("status", "")).lower()
            if state in DONE_STATES:
                try:
                    req = urllib.request.Request(f"{BASE}/audio/{gen_id}")
                    with urllib.request.urlopen(req, timeout=120) as r:
                        data = r.read()
                    with open(out_path, "wb") as f:
                        f.write(data)
                    return True
                except Exception as e:
                    print(f"VOICE=failed reason=audio_download ({e})")
                    return False
            if state in FAIL_STATES:
                print(f"VOICE=failed reason=job_{state} detail={str(status)[:200]}")
                return False
        except Exception:
            pass  # transient network hiccup — keep polling
        time.sleep(2)
    print("VOICE=failed reason=timeout")
    return False


def probe_duration(path: str) -> float:
    try:
        out = subprocess.run(
            ["ffprobe", "-v", "error", "-show_entries", "format=duration",
             "-of", "default=noprint_wrappers=1:nokey=1", path],
            capture_output=True, text=True, timeout=60,
        )
        return max(0.0, float(out.stdout.strip()))
    except Exception:
        return 0.0


def main() -> None:
    ap = argparse.ArgumentParser(description="Voicebox TTS for ai-rss (per-segment + timings)")
    ap.add_argument("out", help="output mp3 path")
    ap.add_argument("--payload", required=True, help="ai-rss payload JSON with title+segments")
    args = ap.parse_args()

    try:
        payload = json.loads(open(args.payload, encoding="utf-8").read())
        segments = [str(s).strip() for s in payload.get("segments", []) if str(s).strip()]
        if not segments:
            raise ValueError("payload has no segments")
    except Exception as e:
        print(f"VOICE=failed reason=bad_payload ({e})")
        sys.exit(0)

    tmp_dir = os.path.dirname(os.path.abspath(args.out))
    parts, timings, t = [], [], 0.0
    for i, seg in enumerate(segments):
        part_path = os.path.join(tmp_dir, f"seg_{i:03d}.mp3")
        if not synth_one(expressive(seg), part_path) or not os.path.isfile(part_path):
            sys.exit(0)  # synth_one already printed the reason
        dur = probe_duration(part_path)
        if dur <= 0:
            print(f"VOICE=failed reason=probe seg={i}")
            sys.exit(0)
        parts.append(part_path)
        timings.append({"text": seg, "start": round(t, 3), "end": round(t + dur, 3)})
        t += dur + GAP
        print(f"  seg {i + 1}/{len(segments)}: {dur:.1f}s", flush=True)

    # Concatenate with silence gaps via ffmpeg filter_complex.
    inputs = []
    for p in parts:
        inputs += ["-i", p]
    if len(parts) > 1:
        gap_tail = ";".join(f"aevalsrc=0:d={GAP}:s=24000[g{i}]" for i in range(len(parts) - 1))
        pieces = []
        for i in range(len(parts)):
            pieces.append(f"[{i}:a]")
            if i < len(parts) - 1:
                pieces.append(f"[g{i}]")
        filter_complex = f"{gap_tail};{''.join(pieces)}concat=n={len(parts) * 2 - 1}:v=0:a=1[out]"
    else:
        filter_complex = "[0:a]anull[out]"

    cmd = ["ffmpeg", "-y", *inputs, "-filter_complex", filter_complex, "-map", "[out]",
           "-c:a", "libmp3lame", "-b:a", "192k", args.out]
    proc = subprocess.run(cmd, capture_output=True, text=True, timeout=600)
    if proc.returncode != 0 or not os.path.isfile(args.out):
        print(f"VOICE=failed reason=concat ({proc.stderr[-200:] if proc.stderr else 'no output'})")
        sys.exit(0)

    for p in parts:
        try:
            os.remove(p)
        except OSError:
            pass

    timings_path = args.out + ".json"
    with open(timings_path, "w", encoding="utf-8") as f:
        json.dump(timings, f, ensure_ascii=False, indent=1)
    total = probe_duration(args.out)
    print(f"VOICE=ok path={args.out} bytes={os.path.getsize(args.out)} segments={len(segments)} total={total:.1f}s timings={timings_path}")


if __name__ == "__main__":
    main()
