#!/usr/bin/env python3
"""Lip-sync a still face image to a voiceover track using local Wav2Lip.

Built for the Potaterrr pipeline: the input is a full 1080x1920 canvas
(background + potato pasted in) and the voiceover MP3. Wav2Lip animates the
whole frame (--box mode: the potato's mouth region gets animated; S3FD face
detection cannot find cartoon faces, so we skip it).

Usage: lip_sync.py <face_image> <audio> <out.mp4>

Env: WAV2LIP_DIR (default ~/git-clones/Wav2Lip)
Prints LIPSYNC=ok on success (exit 0), LIPSYNC=failed (exit 1) otherwise.
"""
import os
import subprocess
import sys
from pathlib import Path

WAV2LIP_DIR = Path(os.environ.get("WAV2LIP_DIR", str(Path.home() / "git-clones" / "Wav2Lip")))
INFERENCE = WAV2LIP_DIR / "inference.py"
CHECKPOINT = WAV2LIP_DIR / "checkpoints" / "wav2lip_gan.pth"


def main() -> None:
    if len(sys.argv) != 4:
        print("usage: lip_sync.py <face_image> <audio> <out.mp4>", file=sys.stderr)
        print("LIPSYNC=failed")
        sys.exit(1)
    face, audio, out = (Path(p) for p in sys.argv[1:4])

    for p, label in ((face, "face image"), (audio, "audio"), (INFERENCE, "Wav2Lip inference.py"), (CHECKPOINT, "wav2lip_gan.pth")):
        if not p.is_file():
            print(f"ERROR: {label} not found: {p}", file=sys.stderr)
            print("LIPSYNC=failed")
            sys.exit(1)

    # Frame size drives the --box (order in Wav2Lip: y1 y2 x1 x2).
    import cv2  # ComfyUI venv python has cv2; render server runs with it.

    img = cv2.imread(str(face))
    if img is None:
        print(f"ERROR: cannot read face image: {face}", file=sys.stderr)
        print("LIPSYNC=failed")
        sys.exit(1)
    h, w = img.shape[:2]

    # Wav2Lip writes temp/temp.wav + temp/result.avi relative to its own dir,
    # so it MUST run with cwd=WAV2LIP_DIR.
    cmd = [
        sys.executable, str(INFERENCE),
        "--checkpoint_path", str(CHECKPOINT),
        "--face", str(face),
        "--audio", str(audio),
        "--outfile", str(out),
        "--static", "True",
        "--fps", "25",
        "--box", "0", str(h), "0", str(w),
        "--nosmooth",
    ]
    try:
        proc = subprocess.run(cmd, cwd=str(WAV2LIP_DIR), capture_output=True, text=True, timeout=3600)
    except subprocess.TimeoutExpired:
        print("ERROR: Wav2Lip timed out", file=sys.stderr)
        print("LIPSYNC=failed")
        sys.exit(1)

    if proc.returncode != 0 or not out.is_file():
        tail = (proc.stderr or proc.stdout or "").strip().splitlines()[-3:]
        print("ERROR: Wav2Lip failed: " + " | ".join(tail), file=sys.stderr)
        print("LIPSYNC=failed")
        sys.exit(1)

    print(f"LIPSYNC=ok path={out}")


if __name__ == "__main__":
    main()
