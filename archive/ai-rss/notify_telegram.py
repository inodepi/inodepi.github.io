#!/usr/bin/env python3
"""Send a Telegram notification, optionally with the rendered video attached.

Usage:
  notify_telegram.py --text "message"
  notify_telegram.py --text "message" --video /path/to/file.mp4

Env: TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID (required).
Stdlib-only. Exits 0 on success (or when Telegram is not configured — non-fatal),
1 on a hard failure.
"""
import argparse
import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "")
CHAT_ID = os.environ.get("TELEGRAM_CHAT_ID", "")
API = f"https://api.telegram.org/bot{TOKEN}"


def not_configured() -> bool:
    if not TOKEN or not CHAT_ID or TOKEN.startswith("placeholder"):
        print("Telegram not configured (TELEGRAM_BOT_TOKEN/TELEGRAM_CHAT_ID) — skipping notification.")
        return True
    return False


def post(url: str, data: bytes, content_type: str, timeout: int = 60) -> dict:
    req = urllib.request.Request(url, data=data, headers={"Content-Type": content_type})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read())


import json  # noqa: E402


def send_message(text: str, parse_mode: str = "") -> None:
    data = {"chat_id": CHAT_ID, "text": text}
    if parse_mode:
        data["parse_mode"] = parse_mode
    body = urllib.parse.urlencode(data).encode()
    post(f"{API}/sendMessage", body, "application/x-www-form-urlencoded")


def send_video(video_path: str, caption: str, parse_mode: str = "", button_url: str = "", button_text: str = "", button_callback: str = "") -> None:
    boundary = "ai_rss_boundary_7f3d9b2c"
    with open(video_path, "rb") as f:
        video_bytes = f.read()

    def field(name: str, value: str) -> bytes:
        return (
            f"--{boundary}\r\n"
            f'Content-Disposition: form-data; name="{name}"\r\n\r\n'
            f"{value}\r\n"
        ).encode()

    head = field("chat_id", CHAT_ID) + field("caption", caption[:1024])
    if parse_mode:
        head += field("parse_mode", parse_mode)
    if button_callback:
        # Callback button: the press is handled INSIDE Telegram (no browser
        # prompt) and delivered to the bot's webhook as a callback_query.
        keyboard = json.dumps({"inline_keyboard": [[{"text": button_text or "Publish", "callback_data": button_callback[:64]}]]})
        head += field("reply_markup", keyboard)
    elif button_url:
        keyboard = json.dumps({"inline_keyboard": [[{"text": button_text or "Open", "url": button_url}]]})
        head += field("reply_markup", keyboard)
    file_part = (
        f"--{boundary}\r\n"
        f'Content-Disposition: form-data; name="video"; filename="{os.path.basename(video_path)}"\r\n'
        f"Content-Type: video/mp4\r\n\r\n"
    ).encode()
    tail = f"\r\n--{boundary}--\r\n".encode()

    body = head + file_part + video_bytes + tail
    post(
        f"{API}/sendVideo",
        body,
        f"multipart/form-data; boundary={boundary}",
        timeout=300,
    )


def main() -> None:
    ap = argparse.ArgumentParser(description="Telegram notification for ai-rss renders")
    ap.add_argument("--text", required=True, help="message text (used as caption when --video is set)")
    ap.add_argument("--html", action="store_true", help="send text/caption with HTML parse mode")
    ap.add_argument("--button-url", default="", help="add an inline button linking to this URL (opens the browser)")
    ap.add_argument("--button-callback", default="", help="add a callback button with this callback_data (press handled inside Telegram)")
    ap.add_argument("--button-text", default="", help="inline button label (default: Open)")
    ap.add_argument("--bot-token", default="", help="bot token for answering the callback press (shows a spinner, not a clock)")
    ap.add_argument("--video", help="path to an mp4 to attach")
    args = ap.parse_args()
    parse_mode = "HTML" if args.html else ""

    if not_configured():
        sys.exit(0)

    try:
        if args.video and os.path.isfile(args.video):
            size = os.path.getsize(args.video)
            if size <= 50 * 1024 * 1024:
                last_err: Exception | None = None
                for attempt in range(3):  # big uploads over flaky links can drop mid-flight
                    try:
                        send_video(args.video, args.text, parse_mode, args.button_url, args.button_text, args.button_callback)
                        print(f"Telegram: video sent ({size / 1e6:.1f} MB)")
                        if args.button_callback:
                            # The press is delivered to the bot's webhook as a
                            # callback_query with this data; Make.com publishes.
                            print(f"Callback button armed: data={args.button_callback}")
                        break
                    except Exception as e:
                        last_err = e
                        print(f"Telegram: upload attempt {attempt + 1}/3 failed ({e})", file=sys.stderr)
                        time.sleep(5 * (attempt + 1))
                else:
                    print(f"ERROR: Telegram video upload failed after 3 attempts: {last_err}", file=sys.stderr)
                    sys.exit(1)
            else:
                send_message(args.text + f"\n\n(video too large for Telegram: {size / 1e6:.1f} MB — {args.video})", parse_mode)
                print("Telegram: text sent (video over 50 MB limit)")
        else:
            send_message(args.text, parse_mode)
            print("Telegram: message sent")
    except urllib.error.HTTPError as e:
        print(f"ERROR: Telegram API {e.code}: {e.read().decode(errors='replace')[:300]}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"ERROR: Telegram send failed: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
