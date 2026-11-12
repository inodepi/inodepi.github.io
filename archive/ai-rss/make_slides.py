#!/usr/bin/env python3
"""Generate one AI "slide" image per story topic — for the news-video slideshow.

Runs as a BACKGROUND PROCESS (started by render_server.py) while voicebox TTS
synthesizes the voiceover, so the slide generation adds ~no wall-clock time.
Each topic gets one SD-Turbo image (single step, half-resolution, lanczos
upscale — same recipe as comfy_img2img.py --fast, ~40s per slide on CPU).

Topics are mapped to segment indexes: render_video.py shows slide N while the
Nth story segment's audio plays, then returns to the mascot photo.

Output: slides.json next to the voice file:
  {"slides": {"1": "slide_01.png", ...}}   # key = payload segment index
Files are 1080x1920 PNGs in the same directory; missing topics = no entry.

Usage:  make_slides.py <voice-out.mp3> --payload payload.json
Env:    COMFY_BASE_URL   (default http://127.0.0.1:8188)
        COMFY_CHECKPOINT (default sd_turbo.safetensors)
        AI_RSS_SLIDES    "0" disables slide generation entirely
        AI_RSS_SLIDE_CACHE reuse identical topics for this many seconds
Stdlib-only (Pillow NOT required — ComfyUI does the compositing).

Never exits non-zero: prints SLIDES=ok or SLIDES=failed so the caller can
fall back to the plain mascot background.
"""
import argparse
import json
import os
import sys
import time
import urllib.parse
import urllib.request

BASE = os.environ.get("COMFY_BASE_URL", "http://127.0.0.1:8188").rstrip("/")
CHECKPOINT = os.environ.get("COMFY_CHECKPOINT", "sd_turbo.safetensors")
SLIDE_W, SLIDE_H = 1080, 1920
HALF_W, HALF_H = 540, 960  # SD-Turbo samples at half size, lanczos-upscales
MAX_CONCURRENT = 2        # queued jobs at once (CPU bound: more just thrashes)
JOB_TIMEOUT = 900         # seconds per slide before giving up on it

# Topic prompt template: dark vertical newsroom style, safe for burned-in subs.
PROMPT_TMPL = (
    "{topic}, vertical dark tech newsroom background, glowing cyan and purple "
    "circuit patterns, cinematic lighting, clean composition, lower third dark "
    "and empty for subtitles, high detail digital art, no text"
)


def build_workflow(topic: str, seed: int) -> dict:
    """txt2img workflow: SD-Turbo 1 step at half res, lanczos upscale, save."""
    return {
        "1": {"class_type": "CheckpointLoaderSimple", "inputs": {"ckpt_name": CHECKPOINT}},
        "2": {"class_type": "CLIPTextEncode", "inputs": {
            "text": PROMPT_TMPL.format(topic=topic), "clip": ["1", 1]}},
        "3": {"class_type": "CLIPTextEncode", "inputs": {"text": "", "clip": ["1", 1]}},
        "4": {"class_type": "EmptyLatentImage", "inputs": {
            "width": HALF_W, "height": HALF_H, "batch_size": 1}},
        "5": {"class_type": "KSampler", "inputs": {
            "seed": seed, "steps": 1, "cfg": 1.0,
            "sampler_name": "euler", "scheduler": "simple", "denoise": 1.0,
            "model": ["1", 0], "positive": ["2", 0], "negative": ["3", 0],
            "latent_image": ["4", 0],
        }},
        "6": {"class_type": "VAEDecode", "inputs": {"samples": ["5", 0], "vae": ["1", 2]}},
        "7": {"class_type": "ImageScale", "inputs": {
            "image": ["6", 0], "upscale_method": "lanczos",
            "width": SLIDE_W, "height": SLIDE_H, "crop": "center"}},
        "8": {"class_type": "SaveImage", "inputs": {
            "filename_prefix": "ai_rss_slide", "images": ["7", 0]}},
    }


def queue_slide(topic: str, seed: int) -> str:
    """Queue one slide generation, return the ComfyUI prompt_id."""
    req = urllib.request.Request(
        f"{BASE}/prompt",
        data=json.dumps({"prompt": build_workflow(topic, seed), "client_id": "ai-rss-slides"}).encode("utf-8"),
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read())["prompt_id"]


def wait_for(prompt_id: str, out_path: str, deadline: float) -> bool:
    """Poll ComfyUI history until the prompt_id finishes; download to out_path."""
    while time.time() < deadline:
        try:
            with urllib.request.urlopen(f"{BASE}/history/{prompt_id}", timeout=15) as resp:
                entry = json.loads(resp.read()).get(prompt_id)
        except Exception:
            time.sleep(2)
            continue
        if not entry:
            time.sleep(2)
            continue
        for node_out in entry.get("outputs", {}).values():
            for img in node_out.get("images", []):
                url = (
                    f"{BASE}/view?filename={urllib.parse.quote(img['filename'])}"
                    f"&subfolder={urllib.parse.quote(img.get('subfolder', ''))}"
                    f"&type={img.get('type', 'output')}"
                )
                try:
                    with urllib.request.urlopen(url, timeout=120) as r:
                        data = r.read()
                    with open(out_path, "wb") as f:
                        f.write(data)
                    return True
                except Exception:
                    return False
        status = str(entry.get("status", ""))
        if "error" in status.lower():
            return False
        time.sleep(2)
    return False


def main() -> None:
    ap = argparse.ArgumentParser(description="Topic slide generator for ai-rss (background process)")
    ap.add_argument("voice_out", help="voice.mp3 path — slides.json / slide_XX.png go next to it")
    ap.add_argument("--payload", required=True, help="payload JSON with segments+topics")
    args = ap.parse_args()

    try:
        payload = json.loads(open(args.payload, encoding="utf-8").read())
        topics = [str(t).strip() for t in payload.get("topics", [])]
        if not topics:
            raise ValueError("payload has no topics")
    except Exception as e:
        print(f"SLIDES=failed reason=bad_payload ({e})")
        sys.exit(0)

    out_dir = os.path.dirname(os.path.abspath(args.voice_out))
    manifest_path = os.path.join(out_dir, "slides.json")

    # Optional cache: identical topic payloads within N seconds reuse slides.
    cache_s = float(os.environ.get("AI_RSS_SLIDE_CACHE", "0") or 0)
    if cache_s > 0 and os.path.isfile(manifest_path):
        try:
            age = time.time() - os.path.getmtime(manifest_path)
            prev = json.loads(open(manifest_path, encoding="utf-8").read())
            if (age < cache_s and prev.get("topics") == topics
                    and all(os.path.isfile(os.path.join(out_dir, p)) for p in prev.get("slides", {}).values())):
                print(f"SLIDES=ok cached={manifest_path} n={len(prev['slides'])}")
                sys.exit(0)
        except Exception:
            pass

    jobs = [(i, topic) for i, topic in enumerate(topics) if topic]
    if not jobs:
        print("SLIDES=ok n=0 (no topics)")
        sys.exit(0)

    slides: dict[str, str] = {}
    running: dict[str, tuple[int, str, float]] = {}  # prompt_id -> (idx, topic, deadline)
    next_job = 0
    seed_base = int(time.time())

    def drain() -> None:
        """Collect finished jobs."""
        for pid in list(running):
            idx, topic, deadline = running[pid]
            out_path = os.path.join(out_dir, f"slide_{idx:02d}.png")
            if wait_for(pid, out_path, deadline):
                slides[str(idx)] = os.path.basename(out_path)
                print(f"  slide {idx}: '{topic}' ok", flush=True)
            else:
                print(f"  slide {idx}: '{topic}' FAILED", flush=True)
            del running[pid]

    while next_job < len(jobs) or running:
        while next_job < len(jobs) and len(running) < MAX_CONCURRENT:
            idx, topic = jobs[next_job]
            try:
                pid = queue_slide(topic, seed_base + idx)
                running[pid] = (idx, topic, time.time() + JOB_TIMEOUT)
                next_job += 1
            except Exception as e:
                print(f"  slide {idx}: '{topic}' queue failed ({e})", flush=True)
                next_job += 1
        drain()
        time.sleep(2)

    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump({"topics": topics, "slides": slides}, f, ensure_ascii=False, indent=1)
    print(f"SLIDES=ok n={len(slides)}/{len(jobs)} manifest={manifest_path}")


if __name__ == "__main__":
    main()
