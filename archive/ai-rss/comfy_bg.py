#!/usr/bin/env python3
"""Generate the video background and save it as a 1080x1920 PNG.

Default mode (pfp): use ~/Downloads/pfp.jpeg DIRECTLY — no AI generation.
The pfp is centered on a blurred, darkened zoom of itself so the frame is
full without altering the artwork. This is instant and deterministic.

Other modes (AI_RSS_BG_MODE):
  mascot   — img2img re-render of the pfp via ComfyUI (slower, varies)
  scene    — abstract txt2img newsroom scene (the original behavior)
  gradient — plain navy->purple gradient, no ComfyUI

Usage: comfy_bg.py <output.png> [prompt]

Env: COMFY_BASE_URL   (default http://127.0.0.1:8188, only for mascot/scene)
     COMFY_CHECKPOINT (default sd_turbo.safetensors)
     AI_RSS_BG_MODE   pfp (default) | mascot | scene | gradient
     AI_RSS_PFP       source image (default ~/Downloads/pfp.jpeg)
Stdlib + Pillow (present in the ComfyUI venv the render server runs under).
Exits 0 on success, 1 on failure (caller falls back to the gradient).
"""
import json
import os
import shutil
import subprocess
import sys
import time
from pathlib import Path

BASE = os.environ.get("COMFY_BASE_URL", "http://127.0.0.1:8188").rstrip("/")
CHECKPOINT = os.environ.get("COMFY_CHECKPOINT", "sd_turbo.safetensors")
MODE = os.environ.get("AI_RSS_BG_MODE", "pfp").strip().lower()
PFP = os.environ.get("AI_RSS_PFP", str(Path.home() / "Downloads" / "pfp.jpeg"))
SCRIPT_DIR = Path(__file__).resolve().parent
W, H = 1080, 1920

DEFAULT_PROMPT = (
    "dark futuristic technology newsroom background, glowing circuit patterns, "
    "deep navy and purple gradient lighting, cinematic bokeh, no text, vertical"
)

# Mascot prompt: kept clear of the lower third so burned-in subtitles stay readable.
MASCOT_PROMPT = (
    "cute cartoon potato mascot character wearing teal headphones, mouth open talking "
    "enthusiastically mid-speech, big expressive eyes, one robotic arm raised gesturing, "
    "holding a white mug, glowing cyan circuit board newsroom background, character in "
    "upper half of frame, lower third empty clean dark background, vibrant 3D cartoon "
    "render, vertical composition, character centered"
)


def generate_pfp(out_path: Path) -> int:
    """Use the pfp as-is: sharp, centered, over a blurred zoom of itself."""
    from PIL import Image, ImageFilter, ImageEnhance

    src = Image.open(PFP).convert("RGB")

    # Backdrop: zoom the pfp to cover the frame, blur it, darken a little.
    scale = max(W / src.width, H / src.height)
    bw, bh = round(src.width * scale), round(src.height * scale)
    backdrop = src.resize((bw, bh), Image.LANCZOS)
    left, top = (bw - W) // 2, (bh - H) // 2
    backdrop = backdrop.crop((left, top, left + W, top + H))
    backdrop = backdrop.filter(ImageFilter.GaussianBlur(42))
    backdrop = ImageEnhance.Brightness(backdrop).enhance(0.55)

    # Sharp pfp centered, full width.
    front = src.resize((W, round(src.height * W / src.width)), Image.LANCZOS)
    canvas = backdrop.copy()
    canvas.paste(front, (0, (H - front.height) // 2))
    canvas.save(out_path, "PNG")
    print(f"BG_PATH={out_path}")
    return 0


def generate_gradient(out_path: Path) -> int:
    subprocess.run(
        ["ffmpeg", "-y", "-f", "lavfi",
         "-i", f"gradients=s={W}x{H}:c0=0x1a1a2e:c1=0x4a1e6e:x0=0:y0=0:x1=0:y1={H}",
         "-frames:v", "1", str(out_path)],
        capture_output=True, timeout=120, check=True,
    )
    print(f"BG_PATH={out_path}")
    return 0


def generate_mascot(out_path: Path) -> int:
    """Delegate to comfy_img2img.py (same repo) for the pfp-based render."""
    if not Path(PFP).is_file():
        print(f"WARN: mascot source image not found: {PFP} — falling back to scene", file=sys.stderr)
        return generate_scene(out_path)

    # Optional cache: reuse a recent render instead of burning 5-10 CPU-minutes.
    cache = os.environ.get("AI_RSS_PFP_CACHE")
    if cache and out_path.is_file() and (time.time() - out_path.stat().st_mtime) < float(cache):
        print(f"Background: cached mascot render ({out_path})")
        return 0

    img2img = SCRIPT_DIR / "comfy_img2img.py"
    proc = subprocess.run(
        [sys.executable, str(img2img), str(out_path), MASCOT_PROMPT,
         "--image", PFP, "--denoise", "0.55", "--fast"],
        capture_output=True, text=True, timeout=900,
    )
    if proc.returncode != 0 or not out_path.is_file():
        print(f"WARN: mascot img2img failed: {(proc.stderr or proc.stdout or '')[-300:]} — falling back to scene",
              file=sys.stderr)
        return generate_scene(out_path)
    print(f"Background: Potaterrr mascot img2img ({out_path})")
    return 0


def generate_scene(out_path: Path) -> int:
    """Original behavior: abstract txt2img newsroom scene via SD-Turbo (1 step)."""
    prompt = sys.argv[2] if len(sys.argv) > 2 else DEFAULT_PROMPT
    workflow = {
        "1": {"class_type": "CheckpointLoaderSimple", "inputs": {"ckpt_name": CHECKPOINT}},
        "2": {"class_type": "CLIPTextEncode", "inputs": {"text": prompt, "clip": ["1", 1]}},
        "3": {"class_type": "CLIPTextEncode", "inputs": {"text": "", "clip": ["1", 1]}},
        "4": {"class_type": "EmptyLatentImage", "inputs": {"width": 1080, "height": 1920, "batch_size": 1}},
        "5": {"class_type": "KSampler", "inputs": {
            "seed": int(time.time()),
            "steps": 1,
            "cfg": 1.0,
            "sampler_name": "euler",
            "scheduler": "simple",
            "denoise": 1.0,
            "model": ["1", 0],
            "positive": ["2", 0],
            "negative": ["3", 0],
            "latent_image": ["4", 0],
        }},
        "6": {"class_type": "VAEDecode", "inputs": {"samples": ["5", 0], "vae": ["1", 2]}},
        "7": {"class_type": "SaveImage", "inputs": {"filename_prefix": "ai_rss_bg", "images": ["6", 0]}},
    }

    import urllib.parse
    import urllib.request

    try:
        req = urllib.request.Request(
            f"{BASE}/prompt",
            data=json.dumps({"prompt": workflow}).encode("utf-8"),
            headers={"Content-Type": "application/json"},
        )
        with urllib.request.urlopen(req, timeout=30) as resp:
            prompt_id = json.loads(resp.read())["prompt_id"]
    except Exception as e:
        print(f"ERROR: cannot reach ComfyUI at {BASE}: {e}", file=sys.stderr)
        return 1

    deadline = time.time() + 600
    while time.time() < deadline:
        try:
            with urllib.request.urlopen(f"{BASE}/history/{prompt_id}", timeout=15) as resp:
                history = json.loads(resp.read())
        except Exception:
            time.sleep(2)
            continue
        entry = history.get(prompt_id)
        if not entry:
            time.sleep(2)
            continue
        for node_out in entry.get("outputs", {}).values():
            for img in node_out.get("images", []):
                url = (f"{BASE}/view?filename={urllib.parse.quote(img['filename'])}"
                       f"&subfolder={urllib.parse.quote(img.get('subfolder', ''))}&type={img.get('type', 'output')}")
                try:
                    with urllib.request.urlopen(url, timeout=60) as r:
                        data = r.read()
                    with open(out_path, "wb") as f:
                        f.write(data)
                    print(f"BG_PATH={out_path}")
                    return 0
                except Exception as e:
                    print(f"ERROR: image download failed: {e}", file=sys.stderr)
                    return 1
        time.sleep(2)
    print("ERROR: ComfyUI generation timed out", file=sys.stderr)
    return 1


def main() -> None:
    if len(sys.argv) < 2:
        print("usage: comfy_bg.py <output.png> [prompt]", file=sys.stderr)
        sys.exit(1)
    out_path = Path(sys.argv[1])
    if MODE == "pfp":
        if Path(PFP).is_file():
            sys.exit(generate_pfp(out_path))
        print(f"WARN: pfp not found: {PFP} — falling back to gradient", file=sys.stderr)
        sys.exit(generate_gradient(out_path))
    if MODE == "gradient":
        sys.exit(generate_gradient(out_path))
    if MODE == "mascot":
        sys.exit(generate_mascot(out_path))
    sys.exit(generate_scene(out_path))


if __name__ == "__main__":
    main()
