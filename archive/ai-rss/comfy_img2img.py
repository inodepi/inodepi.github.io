#!/usr/bin/env python3
"""Generate an img2img image via a local ComfyUI server (character/style transfer).

Turns a source image (e.g. the Potaterrr pfp) into a new render: the image is
padded onto the target canvas, re-encoded by the VAE, then re-sampled with
partial denoise so the original stays recognizable while the prompt steers
pose/expression/scene.

Usage:
  comfy_img2img.py <output.png> [prompt]
  comfy_img2img.py out.png "talking potato mascot, mouth open" --image ~/Downloads/pfp.jpeg --denoise 0.6

Options:
  --image PATH    source image (default: ~/Downloads/pfp.jpeg)
  --denoise F     0.0-1.0; lower = closer to source (default 0.55)
  --steps N       sampler steps (default 4; SD-Turbo likes 1-4)
  --width/--height  output canvas (default 1080x1920 vertical)
  --fit MODE      pad | cover | stretch  (how the source fills the canvas)

Env: COMFY_BASE_URL  (default http://127.0.0.1:8188)
     COMFY_CHECKPOINT (default sd_turbo.safetensors)

Prints IMAGE_PATH=<out> on success, exits 0. Any failure exits 1.
Needs Pillow for canvas fitting (present in the ComfyUI venv); everything else is stdlib.
"""
import argparse
import io
import json
import os
import sys
import time
import urllib.parse
import urllib.request
import uuid
from pathlib import Path

BASE = os.environ.get("COMFY_BASE_URL", "http://127.0.0.1:8188").rstrip("/")
CHECKPOINT = os.environ.get("COMFY_CHECKPOINT", "sd_turbo.safetensors")

DEFAULT_PROMPT = (
    "cute cartoon potato mascot character wearing teal headphones, mouth open talking "
    "enthusiastically mid-speech, big expressive eyes, one robotic arm raised gesturing, "
    "holding a white mug, glowing cyan circuit board newsroom background, vibrant 3D "
    "cartoon render, vertical composition, character centered"
)

PAD_COLOR = (10, 25, 35)  # dark navy, blends with the tech-newsroom look


def fit_image(src_path: str, width: int, height: int, mode: str) -> bytes:
    """Fit the source image onto the target canvas, return PNG bytes."""
    from PIL import Image

    img = Image.open(src_path).convert("RGB")
    if mode == "stretch":
        canvas = img.resize((width, height), Image.LANCZOS)
    elif mode == "cover":
        scale = max(width / img.width, height / img.height)
        w, h = round(img.width * scale), round(img.height * scale)
        img = img.resize((w, h), Image.LANCZOS)
        left, top = (w - width) // 2, (h - height) // 2
        canvas = img.crop((left, top, left + width, top + height))
    else:  # pad: fit whole image, letterbox with PAD_COLOR
        canvas = Image.new("RGB", (width, height), PAD_COLOR)
        scale = min(width / img.width, height / img.height)
        w, h = max(1, round(img.width * scale)), max(1, round(img.height * scale))
        side = img.resize((w, h), Image.LANCZOS)
        canvas.paste(side, ((width - w) // 2, (height - h) // 2))
    buf = io.BytesIO()
    canvas.save(buf, format="PNG")
    return buf.getvalue()


def upload(png_bytes: bytes) -> str:
    boundary = uuid.uuid4().hex
    parts = [
        (
            f"--{boundary}\r\nContent-Disposition: form-data; name=\"image\"; "
            f"filename=\"img2img_src.png\"\r\nContent-Type: image/png\r\n\r\n"
        ).encode(),
        png_bytes,
        f"\r\n--{boundary}--\r\n".encode(),
    ]
    req = urllib.request.Request(
        f"{BASE}/upload/image",
        data=b"".join(parts),
        headers={"Content-Type": f"multipart/form-data; boundary={boundary}"},
    )
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.loads(r.read())["name"]


def run(prompt: str, upload_name: str, steps: int, denoise: float, width: int, height: int, fast: bool) -> str:
    """Queue the img2img workflow, return the output filename.

    fast=True saves with a lanczos upscale to the final size after sampling at
    the source-canvas resolution the caller prepared — much faster on CPU when
    the caller fits the source at a smaller working resolution.
    """
    wf = {
        "1": {"class_type": "CheckpointLoaderSimple", "inputs": {"ckpt_name": CHECKPOINT}},
        "2": {"class_type": "CLIPTextEncode", "inputs": {"text": prompt, "clip": ["1", 1]}},
        "3": {"class_type": "LoadImage", "inputs": {"image": upload_name}},
        "4": {"class_type": "VAEEncode", "inputs": {"pixels": ["3", 0], "vae": ["1", 2]}},
        "5": {"class_type": "KSampler", "inputs": {
            "seed": int(time.time()), "steps": steps, "cfg": 1.0,
            "sampler_name": "euler", "scheduler": "simple", "denoise": denoise,
            "model": ["1", 0], "positive": ["2", 0], "negative": ["2", 0],
            "latent_image": ["4", 0],
        }},
        "6": {"class_type": "VAEDecode", "inputs": {"samples": ["5", 0], "vae": ["1", 2]}},
        "7": {"class_type": "SaveImage", "inputs": {"filename_prefix": "img2img", "images": ["6", 0]}},
    }
    if fast:
        # Sampled at the caller's working resolution: upscale the decode to full size.
        wf["7"] = {"class_type": "ImageScale", "inputs": {
            "image": ["6", 0], "upscale_method": "lanczos", "width": width, "height": height, "crop": "center"}}
        wf["8"] = {"class_type": "SaveImage", "inputs": {"filename_prefix": "img2img", "images": ["7", 0]}}
    req = urllib.request.Request(
        f"{BASE}/prompt", data=json.dumps({"prompt": wf}).encode(),
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read())["prompt_id"]


def fetch(prompt_id: str, out_path: str, timeout_s: int) -> None:
    deadline = time.time() + timeout_s
    while time.time() < deadline:
        try:
            with urllib.request.urlopen(f"{BASE}/history/{prompt_id}", timeout=15) as r:
                history = json.loads(r.read())
        except Exception:
            time.sleep(3)
            continue
        entry = history.get(prompt_id)
        if not entry:
            time.sleep(3)
            continue
        for node_out in entry.get("outputs", {}).values():
            for im in node_out.get("images", []):
                url = (
                    f"{BASE}/view?filename={urllib.parse.quote(im['filename'])}"
                    f"&subfolder={urllib.parse.quote(im.get('subfolder', ''))}&type={im.get('type', 'output')}"
                )
                with urllib.request.urlopen(url, timeout=120) as r:
                    data = r.read()
                with open(out_path, "wb") as f:
                    f.write(data)
                print(f"IMAGE_PATH={out_path}")
                return
        status = str(entry.get("status", ""))
        if "error" in status.lower():
            raise RuntimeError(f"ComfyUI workflow failed: {status[:300]}")
        time.sleep(3)
    raise RuntimeError("ComfyUI generation timed out")


def main() -> None:
    ap = argparse.ArgumentParser(description="ComfyUI img2img (character/style transfer)")
    ap.add_argument("out", help="output PNG path")
    ap.add_argument("prompt", nargs="?", default=DEFAULT_PROMPT)
    ap.add_argument("--image", default=str(Path.home() / "Downloads" / "pfp.jpeg"))
    ap.add_argument("--denoise", type=float, default=0.55)
    ap.add_argument("--steps", type=int, default=4)
    ap.add_argument("--width", type=int, default=1080)
    ap.add_argument("--height", type=int, default=1920)
    ap.add_argument("--fit", choices=["pad", "cover", "stretch"], default="pad")
    ap.add_argument("--fast", action="store_true",
                    help="sample at half resolution and lanczos-upscale to the target size (much faster on CPU)")
    ap.add_argument("--timeout", type=int, default=900, help="seconds to wait for ComfyUI")
    args = ap.parse_args()

    if not os.path.isfile(args.image):
        print(f"ERROR: source image not found: {args.image}", file=sys.stderr)
        sys.exit(1)

    work_w, work_h = (args.width // 2, args.height // 2) if args.fast else (args.width, args.height)
    try:
        png = fit_image(args.image, work_w, work_h, args.fit)
        name = upload(png)
        prompt_id = run(args.prompt, name, args.steps, args.denoise, args.width, args.height, args.fast)
        fetch(prompt_id, args.out, args.timeout)
    except Exception as e:
        print(f"ERROR: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
