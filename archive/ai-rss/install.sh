#!/usr/bin/env bash
# ai-rss full-stack installer — run once on a fresh machine (any distro).
#
#   ./install.sh                 everything: system packages, venvs, clones,
#                                builds, model downloads, systemd user units
#   ./install.sh --no-system     skip the system package step
#   ./install.sh --no-models     skip the ~10GB model downloads
#   ./install.sh --units-only    only (re)install the systemd user units
#
# Idempotent: existing clones, venvs, builds and models are detected and
# skipped, so it is safe to re-run (e.g. after pulling new code, or after
# another distro hop).
#
# Configuration (environment variables):
#   CLONES_DIR      where ComfyUI / llama.cpp / voicebox live
#                   (default: ~/git-clones — matches the systemd units)
#   VOICEBOX_REPO   git URL of your (private) voicebox repo; if unset you get
#                   clone instructions instead and the rest still installs.
#
# What ends up where (matches the .service units):
#   repo venv:          <repo>/.venv               (render server: pillow)
#   ComfyUI:            $CLONES_DIR/ComfyUI        (venv inside, CPU torch)
#   SD-Turbo:           $CLONES_DIR/ComfyUI/models/checkpoints/sd_turbo.safetensors
#   voicebox:           $CLONES_DIR/voicebox       (venv at backend/venv)
#   systemd user units: ~/.config/systemd/user/*.service (paths rewritten to this checkout)

set -euo pipefail

REPO_DIR="$(cd "$(dirname "$(readlink -f "$0")")" && pwd)"
CLONES_DIR="${CLONES_DIR:-$HOME/git-clones}"
BIN_DIR="$HOME/.local/bin"
UNITS=(ai-rss-render comfyui voicebox)

# Models (skipped automatically when already downloaded)
SD_TURBO_URL="https://huggingface.co/stabilityai/sd-turbo/resolve/main/sd_turbo.safetensors"        # ~5.2GB

# ---------------------------------------------------------------- flags ----
DO_SYSTEM=1 DO_MODELS=1 ONLY_UNITS=0
for arg in "$@"; do
  case "$arg" in
    --no-system)  DO_SYSTEM=0 ;;
    --no-models)  DO_MODELS=0 ;;
    --units-only) ONLY_UNITS=1 ;;
    -h|--help) awk 'NR>1 && !/^#/ {exit} NR>1 {sub(/^# ?/,""); print}' "$0"; exit 0 ;;
    *) echo "usage: $0 [--no-system] [--no-models] [--units-only]"; exit 1 ;;
  esac
done

# ---------------------------------------------------------------- helpers ---
step() { printf '\n==> %s\n' "$*"; }
say()  { printf '    %s\n' "$*"; }
warn() { printf '    ⚠ %s\n' "$*" >&2; }
die()  { printf '    ✗ %s\n' "$*" >&2; exit 1; }
have() { command -v "$1" >/dev/null 2>&1; }

SUDO=""
if [ "$(id -u)" -ne 0 ] && have sudo; then SUDO="sudo"; fi

# fetch_model <url> <dest> <min_bytes> <label> — resume + skip-if-complete
fetch_model() {
  local url="$1" dest="$2" min="$3" label="$4" size
  if [ -f "$dest" ]; then
    size=$(( $(wc -c <"$dest") ))
    if [ "$size" -ge "$min" ]; then say "✓ $label already at $dest"; return 0; fi
    warn "$label exists but is only $size bytes — re-downloading"
    rm -f "$dest"
  fi
  mkdir -p "$(dirname "$dest")"
  say "downloading $label → $dest"
  curl --fail --location --retry 3 -C - --progress-bar -o "$dest.part" "$url" \
    || die "download failed: $url (grab it manually into $(dirname "$dest"))"
  mv "$dest.part" "$dest"
  say "✓ $label"
}

# ------------------------------------------------------- 1. system packages -
step "1/7 system packages (git curl ffmpeg python3 build tools)"
if [ "$DO_SYSTEM" -eq 0 ]; then
  say "skipped (--no-system)"
elif have git && have curl && have ffmpeg && have python3 && have cmake; then
  say "✓ git / curl / ffmpeg / python3 / cmake already present"
else
  if have apt-get; then
    $SUDO apt-get update -y
    $SUDO apt-get install -y git curl ffmpeg python3 python3-venv python3-pip build-essential cmake pkg-config
  elif have dnf; then
    $SUDO dnf install -y git curl ffmpeg python3-pip gcc-c++ make cmake pkgconf-pkg-config \
      || warn "dnf failed — on Fedora, ffmpeg needs RPM Fusion (https://rpmfusion.org)"
  elif have pacman; then
    $SUDO pacman -Sy --needed --noconfirm git curl ffmpeg python python-pip base-devel cmake
  elif have zypper; then
    $SUDO zypper install -y git curl ffmpeg python3-pip gcc-c++ make cmake
  else
    die "unknown package manager — install git, curl, ffmpeg, python3-venv, cmake yourself, then re-run with --no-system"
  fi
  have ffmpeg || warn "ffmpeg is STILL missing — the pipeline cannot render without it"
fi

# ------------------------------------------------------------ 2. repo venv --
step "2/7 repo venv (.venv: pillow + opencv for the render server)"
if [ "$ONLY_UNITS" -eq 0 ]; then
  [ -x "$REPO_DIR/.venv/bin/python" ] || python3 -m venv "$REPO_DIR/.venv"
  "$REPO_DIR/.venv/bin/pip" install --quiet --upgrade pip
  "$REPO_DIR/.venv/bin/pip" install --quiet -r "$REPO_DIR/requirements.txt"
  say "✓ $REPO_DIR/.venv ready"
fi

# --------------------------------------------------------------- 3. ComfyUI -
COMFY_DIR="$CLONES_DIR/ComfyUI"
step "3/7 ComfyUI + CPU torch ($COMFY_DIR)"
if [ "$ONLY_UNITS" -eq 0 ]; then
  mkdir -p "$CLONES_DIR"
  [ -d "$COMFY_DIR/.git" ] && say "✓ already cloned" || git clone --depth 1 https://github.com/comfyanonymous/ComfyUI "$COMFY_DIR"
  [ -x "$COMFY_DIR/venv/bin/python" ] || python3 -m venv "$COMFY_DIR/venv"
  if [ ! -f "$COMFY_DIR/venv/.deps-ok" ]; then
    "$COMFY_DIR/venv/bin/pip" install --quiet --upgrade pip
    # CPU wheel first so requirements.txt doesn't drag in the 2.5GB CUDA torch
    "$COMFY_DIR/venv/bin/pip" install --quiet torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu
    "$COMFY_DIR/venv/bin/pip" install --quiet -r "$COMFY_DIR/requirements.txt"
    touch "$COMFY_DIR/venv/.deps-ok"
  fi
  say "✓ ComfyUI venv ready (CPU torch)"
fi

# ------------------------------------------------------------- 4. llama.cpp -
LLAMA_DIR="$CLONES_DIR/llama.cpp"

# ------------------------------------------------------------- 5. models ----
step "4/7 models (skipped when already downloaded)"
if [ "$ONLY_UNITS" -eq 0 ]; then
  if [ "$DO_MODELS" -eq 0 ]; then
    say "skipped (--no-models)"
  else
    fetch_model "$SD_TURBO_URL" "$COMFY_DIR/models/checkpoints/sd_turbo.safetensors" 4000000000 "SD-Turbo checkpoint"
  fi
fi

# ------------------------------------------------------------- 6. voicebox --
VB_DIR="$CLONES_DIR/voicebox"
step "5/7 voicebox TTS ($VB_DIR)"
if [ "$ONLY_UNITS" -eq 0 ]; then
  if [ -n "${VOICEBOX_REPO:-}" ]; then
    [ -d "$VB_DIR/.git" ] && say "✓ already cloned" || git clone --depth 1 "$VOICEBOX_REPO" "$VB_DIR"
    if [ -x "$VB_DIR/backend/venv/bin/uvicorn" ] || [ -x "$VB_DIR/venv/bin/uvicorn" ]; then
      say "✓ voicebox venv already present"
    else
      # voicebox.service expects uvicorn at backend/venv/bin/uvicorn
      python3 -m venv "$VB_DIR/backend/venv"
      "$VB_DIR/backend/venv/bin/pip" install --quiet --upgrade pip uvicorn fastapi
      for req in "$VB_DIR/requirements.txt" "$VB_DIR/backend/requirements.txt"; do
        if [ -f "$req" ]; then "$VB_DIR/backend/venv/bin/pip" install --quiet -r "$req"; fi
      done
      warn "if voicebox needs more (kokoro engine, model weights), install them into $VB_DIR/backend/venv"
    fi
  else
    warn "VOICEBOX_REPO is not set — voicebox was NOT installed. It is optional:"
    warn "  (without it you get a silent video; without ComfyUI you still get the pfp/gradient background)"
    warn "  to add it later:  VOICEBOX_REPO=<your-voicebox-git-url> ./install.sh"
    warn "  the unit expects uvicorn at: $VB_DIR/backend/venv/bin/uvicorn"
  fi
fi

# ------------------------------------------------------------- 6. units -----
step "6/6 systemd user units → ~/.config/systemd/user/"
# Rewrite the hardcoded repo path (%h/git-projects/ai-rss) to this checkout.
REPO_DIR_ESC="$(printf '%s' "$REPO_DIR" | sed -e 's/[&\\]/\\&/g')"
mkdir -p "$HOME/.config/systemd/user"
for u in "${UNITS[@]}"; do
  sed "s|%h/git-projects/ai-rss|$REPO_DIR_ESC|g" "$REPO_DIR/$u.service" > "$HOME/.config/systemd/user/$u.service"
  say "✓ installed $u.service"
done
systemctl --user daemon-reload 2>/dev/null || warn "systemd user session unavailable — run 'systemctl --user daemon-reload' after your next login"

# ------------------------------------------------------------ finishing -----
if [ ! -f "$REPO_DIR/.env" ]; then
  cp "$REPO_DIR/.env.example" "$REPO_DIR/.env"
  say "✓ created .env from .env.example — fill in TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID"
else
  say "✓ .env present"
fi
if [ -f "$HOME/Downloads/pfp.jpeg" ]; then
  say "✓ mascot found at ~/Downloads/pfp.jpeg"
else
  warn "put your mascot photo at ~/Downloads/pfp.jpeg (intro/outro background)"
fi
case ":$PATH:" in
  *":$BIN_DIR:"*) ;;
  *)  warn "llama-server was removed from this project — if you still need llama.cpp elsewhere, keep $BIN_DIR on your PATH" ;;
esac

step "done"
say "next steps:"
say "  1. edit $REPO_DIR/.env  (Telegram bot token + chat id)"
say "  2. ./start.sh up     # boots ComfyUI, voicebox, render server"
say "  3. ./start.sh        # scrape HN + render today's video"
