#!/usr/bin/env python3
"""Local render server for ai-rss — HTTP bridge into the render pipeline.

generate_news.py calls POST http://127.0.0.1:8777/render with:
  {"title": "...", "segments": ["...", ...], "topics": [...], "smoke": false}

The server runs, in order:
  1. voicebox TTS        (skipped when smoke=true, non-fatal on failure)
  2. ComfyUI AI background (skipped when smoke=true, non-fatal on failure)
  3. ffmpeg render with subtitles
  4. Telegram notify with the video attached (skipped when not configured)

Response: {"video_path": ..., "voice": ok|failed|skipped, "background": comfy|gradient,
           "telegram": sent|skipped|failed:..., "title": ...}

Stdlib-only. Run: RENDER_SERVER_PORT=8777 python3 render_server.py
"""
import json
import os
import re
import subprocess
import sys
import tempfile
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

RENDER_DIR = Path(os.environ.get("RENDER_DIR", str(Path(__file__).resolve().parent)))
OUT_DIR = Path(os.environ.get("OUTPUT_DIR", str(RENDER_DIR / "out"))).expanduser()
# If OUTPUT_DIR exists but isn't writable (e.g. root-owned from Docker auto-create),
# degrade to a user-writable fallback instead of failing every render.
if OUT_DIR.exists() and not os.access(OUT_DIR, os.W_OK):
    FALLBACK_DIR = Path.home() / ".cache" / "ai-rss" / "generated"
    OUT_DIR = FALLBACK_DIR
else:
    FALLBACK_DIR = None
PORT = int(os.environ.get("RENDER_SERVER_PORT", "8777"))

PY = sys.executable


def run(cmd: list[str], timeout: int, env: dict | None = None) -> tuple[int, str, str]:
    p = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout, env=env)
    return p.returncode, p.stdout, p.stderr


def run_with_env(cmd: list[str], timeout: int, env: dict) -> tuple[int, str, str]:
    return run(cmd, timeout, env=env)


def build_caption(title: str, segments: list[str]) -> str:
    """Telegram HTML caption: bold title, one emoji bullet per segment with the
    first sentence bolded (Potaterrr channel-post style).

    Telegram caps video captions at 1024 chars and REJECTS malformed HTML, so
    when the full version doesn't fit we drop the detail text first, then cut
    safely (closing any open <b> tag) — never mid-tag."""
    import html as html_mod
    import re as re_mod

    def esc(v: str) -> str:
        return html_mod.escape(str(v))

    def line_for(seg: str, detail: bool) -> str:
        s = esc(seg)
        m = re_mod.match(r"^(.{10,90}?[.!?])(\s+|$)", s)
        if m and detail:
            return "🤖 <b>" + m.group(1) + "</b> " + s[len(m.group(1)):].strip()
        if m:
            return "🤖 <b>" + m.group(1) + "</b>"
        return "🤖 " + s

    def assemble(detail: bool) -> str:
        lines = [f"📺 <b>{esc(title)}</b>", ""]
        lines += [line_for(seg, detail) for seg in segments]
        return "\n".join(lines)

    LIMIT = 1024
    caption = assemble(True)
    if len(caption) <= LIMIT:
        return caption
    caption = assemble(False)
    if len(caption) <= LIMIT:
        return caption
    # Last resort: hard cut, then close any tag we sliced open.
    caption = caption[:LIMIT - 4].rstrip()
    if caption.count("<b>") > caption.count("</b>"):
        caption += "...</b>"
    else:
        caption += "..."
    return caption


def build_links_message(title: str, sources: list) -> str:
    """Plain-text message with the story links, sent after the video.

    Format is "topic: link" with RAW URLs (no <a> hyperlinks and no HTML
    parse mode) — plain-text URLs render as tappable links everywhere,
    including when the message is copy-pasted to Facebook, which strips
    markup and breaks copy-pasted hyperlinks anyway.
    """
    lines = [f"🔗 {title} — sources:", ""]
    n = 0
    for src in sources:
        topic = str(src.get("topic", "")).strip()
        t = str(src.get("title", "")).strip()
        link = str(src.get("link", "")).strip()
        if not t or not link:
            continue
        n += 1
        # 1. LLM slide topic (2-3 words, newsy)  2. full story headline
        label = topic or t
        lines.append(f"{n}. {label}: {link}")
    if n == 0:
        return ""
    return "\n".join(lines)


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *args):  # quiet
        pass

    def _json(self, code: int, obj: dict) -> None:
        body = json.dumps(obj).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path == "/health":
            self._json(200, {"status": "ok"})
        else:
            self._json(404, {"error": "not found"})

    def do_POST(self):
        if self.path != "/render":
            self._json(404, {"error": "not found"})
            return
        try:
            n = int(self.headers.get("Content-Length", 0))
            req = json.loads(self.rfile.read(n) or b"{}")
        except Exception as e:
            self._json(400, {"error": f"bad json: {e}"})
            return

        title = str(req.get("title", "Python News"))[:80]
        segments = [str(s).strip() for s in req.get("segments", []) if str(s).strip()]
        smoke = bool(req.get("smoke"))
        sources = req.get("sources") or []
        if not segments:
            self._json(400, {"error": "no segments"})
            return

        result = {
            "title": title,
            "voice": "skipped" if smoke else "failed",
            "background": "gradient",
            "telegram": "skipped",
            "slides": "skipped" if smoke else "pending",
        }

        tmpdir = tempfile.mkdtemp(prefix="ai_rss_")
        payload_path = os.path.join(tmpdir, "payload.json")
        with open(payload_path, "w", encoding="utf-8") as f:
            json.dump({"title": title, "segments": segments, "topics": req.get("topics") or []}, f, ensure_ascii=False)

        # 1b. Story-topic slides (AI_RSS_SLIDES=0 disables) — generated by a
        #     BACKGROUND process while voicebox TTS runs, so the SD-Turbo slide
        #     images (~40s each on CPU) cost ~no extra wall-clock time. The
        #     renderer falls back to the plain mascot background if they fail.
        slides_proc = None
        if not smoke and os.environ.get("AI_RSS_SLIDES", "1") != "0":
            try:
                slides_proc = subprocess.Popen(
                    [PY, str(RENDER_DIR / "make_slides.py"), os.path.join(tmpdir, "voice.mp3"),
                     "--payload", payload_path],
                    stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True,
                )
            except Exception as e:
                result["slides"] = f"failed: {str(e)[:150]}"

        # 1. voicebox TTS (non-fatal) — per-segment synthesis + exact timings.
        voice_path = ""
        timings_path = ""
        if not smoke:
            voice_path = os.path.join(tmpdir, "voice.mp3")
            timings_path = voice_path + ".json"
            try:
                rc, out, err = run(
                    [PY, str(RENDER_DIR / "voicebox_tts.py"), voice_path, "--payload", payload_path],
                    1200,
                )
                result["voice"] = "ok" if (rc == 0 and "VOICE=ok" in out) else "failed"
                if result["voice"] == "failed":
                    voice_path = ""
                    timings_path = ""
                    result["voice_detail"] = (out or err).strip().splitlines()[-1][:200] if (out or err).strip() else "unknown"
            except Exception as e:
                result["voice"] = "failed"
                result["voice_detail"] = str(e)[:200]
                voice_path = ""
                timings_path = ""

        # 2. OPTIONAL lip-sync of the pfp to the voiceover (Wav2Lip, CPU).
        #    OFF by default (AI_RSS_LIPSYNC=1 to enable) — the animated mouth
        #    reads as uncanny on the cartoon; the static mascot is the default.
        base_video = ""
        if voice_path and os.path.isfile(voice_path) and not smoke and os.environ.get("AI_RSS_LIPSYNC", "0") == "1":
            try:
                rc, out, err = run(
                    [PY, str(RENDER_DIR / "lip_sync.py"),
                     os.environ.get("AI_RSS_PFP", str(Path.home() / "Downloads" / "pfp.jpeg")),
                     voice_path, os.path.join(tmpdir, "talking.mp4")],
                    3600,
                )
                if rc == 0 and "LIPSYNC=ok" in out and os.path.isfile(os.path.join(tmpdir, "talking.mp4")):
                    base_video = os.path.join(tmpdir, "talking.mp4")
                    result["lipsync"] = "ok"
                else:
                    result["lipsync"] = "failed"
                    result["lipsync_detail"] = (out or err).strip().splitlines()[-1][:200] if (out or err).strip() else "unknown"
            except Exception as e:
                result["lipsync"] = f"failed: {str(e)[:150]}"

        # 3. Background: the mascot img2img (default) unless lip-sync produced
        #    a talking video. Smoke renders force the gradient.
        result["background"] = "pfp-video" if base_video else (
            "comfy" if (os.environ.get("AI_RSS_COMFY") == "1" and not smoke) else "gradient"
        )
        render_env = dict(os.environ)
        if smoke:
            render_env["AI_RSS_COMFY"] = "0"

        # 2b. Collect the background slide process (queued before TTS ran).
        slides_manifest = ""
        if slides_proc is not None:
            try:
                sout, _ = slides_proc.communicate(timeout=1500)
                lines = [ln for ln in (sout or "").strip().splitlines() if ln.strip()]
                detail = lines[-1][:150] if lines else "no output"
                if "SLIDES=ok" in (sout or ""):
                    cand = os.path.join(tmpdir, "slides.json")
                    if os.path.isfile(cand):
                        slides_manifest = cand
                        result["slides"] = "ok"
                    else:
                        result["slides"] = "failed: manifest missing"
                else:
                    result["slides"] = f"failed: {detail}"
            except Exception as e:
                try:
                    slides_proc.kill()
                except Exception:
                    pass
                result["slides"] = f"failed: {str(e)[:150]}"

        # 4. Render — subtitles onto the mascot background (or talking video
        #    when lip-sync is enabled), using the real TTS timings either way.
        #    With --slides, story segments crossfade to their topic slides.
        cmd = [PY, str(RENDER_DIR / "render_video.py"), payload_path, "--out", str(OUT_DIR)]
        if base_video:
            cmd += ["--base-video", base_video]
        if slides_manifest:
            cmd += ["--slides", slides_manifest]
        if voice_path and os.path.isfile(voice_path):
            cmd += ["--voice", voice_path]
        if timings_path and os.path.isfile(timings_path):
            cmd += ["--timings", timings_path]
        try:
            rc, out, err = run_with_env(cmd, 1800, render_env)
        except Exception as e:
            self._json(500, {"error": f"render crashed: {e}", **result})
            return
        if rc != 0:
            self._json(500, {"error": ((err or out) or "renderer failed")[-800:], **result})
            return

        video = ""
        for line in out.splitlines():
            if line.startswith("VIDEO_PATH="):
                video = line.split("=", 1)[1].strip()
        if not video:
            self._json(500, {"error": "no VIDEO_PATH in renderer output", "stdout": out[-400:], **result})
            return
        result["video_path"] = video
        if FALLBACK_DIR:
            result["warning"] = (
                f"OUTPUT_DIR not writable — video saved to {FALLBACK_DIR}. "
                "Fix: sudo chown $USER:$USER ~/Downloads/generated"
            )

        # 5. Telegram (non-fatal, skipped when unconfigured) — rich HTML caption
        #    plus an optional inline button (for Make.com / social publishing).
        try:
            cmd = [
                PY, str(RENDER_DIR / "notify_telegram.py"),
                "--text", str(req.get("caption") or build_caption(title, segments)),
                "--html",
                "--video", video,
            ]
            # Prefer a CALLBACK button (one-tap inside Telegram, no browser
            # prompt); the press arrives at the bot's webhook (Make.com) as a
            # callback_query. --bot-token lets notify_telegram answer the press
            # so the button shows a spinner instead of a clock.
            button_url = os.environ.get("TELEGRAM_BUTTON_URL", "").strip()
            button_callback = ""
            if button_url and "hook." in button_url:
                from datetime import datetime
                # callback_data is capped at 64 bytes by Telegram.
                button_callback = f"publish|{os.path.basename(video)}|{datetime.now().strftime('%Y%m%d')}"[:64]
                button_url = ""  # callback replaces the URL button
            if button_callback:
                cmd += ["--button-callback", button_callback,
                        "--button-text", os.environ.get("TELEGRAM_BUTTON_TEXT", "🚀 Publish"),
                        "--bot-token", os.environ.get("TELEGRAM_BOT_TOKEN", "")]
            elif button_url:
                from urllib.parse import urlencode
                from datetime import datetime
                qs = urlencode({
                    "title": title,
                    "date": datetime.now().strftime("%Y-%m-%d"),
                    "video": os.path.basename(video),
                })
                sep = "&" if "?" in button_url else "?"
                cmd += ["--button-url", button_url + sep + qs,
                        "--button-text", os.environ.get("TELEGRAM_BUTTON_TEXT", "🚀 Publish")]
            rc, tout, terr = run(
                cmd,
                900,  # flaky Telegram CDNs can stall the 3-attempt upload retry loop
            )
            if rc == 0:
                result["telegram"] = "sent" if "message sent" not in tout and "skipping" not in tout else "skipped"
                if "video sent" in tout:
                    result["telegram"] = "sent"
                elif "skipping" in tout or "not configured" in tout:
                    result["telegram"] = "skipped"
            else:
                result["telegram"] = f"failed: {(terr or tout).strip()[-200:]}"
        except Exception as e:
            result["telegram"] = f"failed: {str(e)[:200]}"

        # 5b. Story links as a SEPARATE text message (the video caption stays clean).
        if sources and not smoke:
            try:
                rc, lout, lerr = run(
                    [PY, str(RENDER_DIR / "notify_telegram.py"),
                     "--text", build_links_message(title, sources)],
                    120,
                )
                result["links"] = "sent" if rc == 0 else f"failed: {(lerr or lout).strip()[-150:]}"
            except Exception as e:
                result["links"] = f"failed: {str(e)[:150]}"

        self._json(200, result)


if __name__ == "__main__":
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    # 0.0.0.0 so other machines on the LAN can reach it too, if ever needed
    print(f"ai-rss render server on 0.0.0.0:{PORT} | out={OUT_DIR} | comfy={os.environ.get('AI_RSS_COMFY', '0')}")
    ThreadingHTTPServer(("0.0.0.0", PORT), Handler).serve_forever()
