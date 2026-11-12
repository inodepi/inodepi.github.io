#!/usr/bin/env python3
"""One-command news video: scrape HN -> local LLM script -> render -> Telegram.

The daily pipeline — same stages, same prompt:

  1. Fetch https://hnrss.org/newest?q=python&count=30
  2. Build a story digest (title + snippet + link)
  3. Ask llama-server (:1234) to write the video script (prompt from channel_style.py)
  4. POST {title, segments} to the render server (:8777), which does
     voicebox TTS -> ComfyUI background -> ffmpeg -> Telegram sendVideo

Usage:
  generate_news.py             # full run, ends with the video in ~/Downloads/generated
  generate_news.py --dry-run   # scrape + write the script, print it, skip the render
  generate_news.py --story ai  # filter query, e.g. "ai" (default: python)

Env: HN_FEED_URL (default https://hnrss.org/newest?q=python&count=30)
     LLM_BASE_URL (default http://127.0.0.1:1234)
     LLM_MODEL    (default local-model)
     RENDER_SERVER_URL (default http://127.0.0.1:8777)

Stdlib-only. Telegram creds come from the render server's environment
(ai-rss-render.service loads the project .env) — nothing to configure here.
"""
import argparse
import json
import os
import random
import re
import sys
import time
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path

from channel_style import SIGNOFF, SYSTEM_PROMPT, intro_segment

# General tech coverage: one hnrss query per topic, merged round-robin so
# every topic is represented in the digest. Core topics first = higher
# priority for the LLM's pick. Tune freely.
TOPIC_QUERIES = [
    # core
    "linux", "windows", "android", "iphone", "xiaomi", "smartphone",
    "gaming", "artificial intelligence", "openai", "nvidia", "GPU", "hardware",
    # gaming platforms
    "playstation", "nintendo", "steam",
    # AI assistants
    "google", "gemini", "chatgpt",
    # hardware
    "cpu", "laptop", "macbook", "chip",
    # security & privacy
    "security", "privacy", "hacker",
    # programming
    "programming", "rust", "python",
    # big tech & social
    "samsung", "youtube", "tesla",
    # everyday gadgets
    "bluetooth", "battery", "smartwatch",
]
HN_FEED_URL = os.environ.get("HN_FEED_URL", "")  # optional single-feed override
# Last-resort feed when every topic query fails (502s happen).
BACKUP_FEEDS = [
    "https://news.ycombinator.com/rss",
]
LLM_BASE = os.environ.get("LLM_BASE_URL", "http://127.0.0.1:1234").rstrip("/")
LLM_MODEL = os.environ.get("LLM_MODEL", "local-model")
RENDER_URL = os.environ.get("RENDER_SERVER_URL", "http://127.0.0.1:8777").rstrip("/")

TAG_RE = re.compile(r"<[^>]+>")
ENTITY_RE = re.compile(r"&\w+;")


def http_json(url: str, payload: dict | None = None, timeout: int = 30) -> dict:
    data = json.dumps(payload).encode() if payload is not None else None
    req = urllib.request.Request(
        url, data=data,
        headers={"Content-Type": "application/json"} if data else {},
    )
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read().decode("utf-8", errors="replace"))


STORIES: list[dict] = []  # populated by fetch_digest, used for the Telegram links message


def fetch_digest(query: str | None) -> tuple[str, int]:
    """Fetch HN across general-tech topics and build the story digest."""
    def clean(v: str) -> str:
        v = TAG_RE.sub(" ", v or "")
        v = ENTITY_RE.sub(" ", v)
        return re.sub(r"\s+", " ", v).strip()

    def fetch_feed(feed_url: str, cap: int, retries: int = 2) -> list[dict]:
        """Fetch one RSS feed, return up to cap cleaned stories ([] when down)."""
        for attempt in range(retries):
            try:
                with urllib.request.urlopen(feed_url, timeout=20) as resp:
                    root = ET.fromstring(resp.read())
                out = []
                for item in root.iter("item"):
                    title = clean(item.findtext("title") or "")
                    link = clean(item.findtext("link") or "")
                    if not title or not link:
                        continue
                    out.append({
                        "title": title,
                        "link": link,
                        "snippet": clean(item.findtext("description") or "")[:320],
                    })
                    if len(out) >= cap:
                        break
                return out
            except Exception as e:
                print(f"     fetch failed ({e}), retry {attempt + 1}/{retries}...", flush=True)
                time.sleep(6)
        print(f"     feed down: {feed_url}", flush=True)
        return []

    merged: list[dict] = []
    seen: set[str] = set()

    def absorb(stories: list[dict]) -> None:
        for s in stories:
            if s["link"] in seen:
                continue
            seen.add(s["link"])
            merged.append(s)

    if query is not None:
        # --story override: single-topic search as before.
        absorb(fetch_feed(f"https://hnrss.org/newest?q={urllib.parse.quote(query)}&count=30", 20))
    elif HN_FEED_URL:
        absorb(fetch_feed(HN_FEED_URL, 25))
    else:
        # General tech: one query per topic, round-robin merged so every
        # topic contributes to the 10-story digest (not just the first few).
        per_topic: list[list[dict]] = []
        for q in TOPIC_QUERIES:
            got = fetch_feed(f"https://hnrss.org/newest?q={urllib.parse.quote(q)}&count=6", 3)
            if got:
                per_topic.append(got)
        changed = True
        # Shuffle topic order before the merge so the digest cut samples a
        # different mix of topics each day (core topics still lead the list,
        # but 33 topics can't all fit in 16 digest slots).
        random.shuffle(per_topic)
        while changed and len(merged) < 64:
            changed = False
            for batch in per_topic:
                if batch:
                    s = batch.pop(0)
                    if s["link"] not in seen:
                        seen.add(s["link"])
                        merged.append(s)
                        changed = True

    if not merged:
        print("     all topic feeds down — trying backup...", flush=True)
        for feed_url in BACKUP_FEEDS:
            absorb(fetch_feed(feed_url, 25))
            if merged:
                break
    if not merged:
        raise RuntimeError("Could not fetch any HN feed (topics + backups all failed).")

    stories = merged[:16]
    STORIES[:] = stories  # keep for the render payload (Telegram links message)
    if not stories:
        raise RuntimeError("No stories found in the feed.")
    digest = "\n\n".join(
        f"{i + 1}. {s['title']} - {s['snippet'] or '(no summary)'} ({s['link']})"
        for i, s in enumerate(stories)
    )
    return digest, len(stories)


def write_script(digest: str) -> dict:
    """Ask the local LLM for the video script; returns {title, segments}.

    Retries: small local models sometimes emit malformed JSON. Only after all
    attempts fail do we fall back to headline-only segments from the digest.
    """
    segments: list[str] = []
    topics: list[str] = []
    title = ""
    for attempt in range(3):
        resp = http_json(
            f"{LLM_BASE}/v1/chat/completions",
            {
                "model": LLM_MODEL,
                "temperature": 0.8,
                "max_tokens": 1100,
                "messages": [
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": "Here are today's tech stories:\n\n" + digest + "\n\nWrite the video script now."},
                ],
            },
            timeout=900,  # llama.cpp on CPU: ~3 tok/s, a script takes minutes
        )
        raw = str(((resp.get("choices") or [{}])[0].get("message") or {}).get("content") or "").strip()
        text = re.sub(r"^```(?:json)?", "", raw).replace("```", "").strip()
        script = None
        # strict=False: small local LLMs emit raw newlines/tabs inside JSON strings.
        try:
            script = json.loads(text, strict=False)
        except Exception:
            m = re.search(r"\{[\s\S]*\}", text)
            if m:
                try:
                    script = json.loads(m[0], strict=False)
                except Exception:
                    script = None
        # Segments may be plain strings (old format) or {"text", "topic"}
        # objects — accept both so older/fallback LLM output still renders.
        segs, tops = [], []
        for item in (script or {}).get("segments", []):
            if isinstance(item, dict):
                text = str(item.get("text", "")).strip()
                topic = re.sub(r"\s+", " ", str(item.get("topic", ""))).strip()[:40]
            else:
                text, topic = str(item).strip(), ""
            # The LLM loves adding hashtags despite instructions; TTS would read
            # them aloud ("hash tag Security First"), so strip anything #word-like.
            text = re.sub(r"#[A-Za-z0-9_]+", "", text).strip(" ,.!?" ).strip()
            if text:
                segs.append(text)
                tops.append(topic)
        if segs:
            segments, topics = segs, tops
            title = str((script or {}).get("title") or "")[:80]
            break
        print(f"     LLM attempt {attempt + 1}/3 returned unusable JSON, retrying...", flush=True)

    if not segments:
        # Same fallback as ever: headline-only segments from the digest.
        segments = [
            re.sub(r"\(https?://\S+\)", "", block).split(" - ")[0].strip()
            for block in digest.split("\n\n")
        ]
        segments = [s for s in segments if s][:8]
    if not segments:
        raise RuntimeError("LLM produced no usable segments.")
    if len(topics) != len(segments):
        topics = ["Tech News"] * len(segments)

    # The LLM is told not to write a closer, but if it sneaks one in, drop it —
    # the pipeline appends its own randomized persona closer + sign-off.
    if segments and "stay crispy" in segments[-1].lower():
        segments = segments[:-1]
    segments.append(SIGNOFF)
    # One slide topic per segment (missing ones get a generic "Tech News" slide).
    # "" means "no slide": intro and closer/sign-off stay on the mascot photo.
    topics = ([t if t else "Tech News" for t in topics] + ["Tech News"])[: len(segments)]
    topics[-1] = ""  # closer keeps the mascot photo
    segments.insert(0, intro_segment())
    topics.insert(0, "")  # dated intro keeps the mascot photo
    return {"title": title or "Tech News!", "segments": segments, "topics": topics}


def main() -> None:
    ap = argparse.ArgumentParser(description="HN -> LLM -> video -> Telegram pipeline")
    ap.add_argument("--dry-run", action="store_true", help="scrape + script only, no render/Telegram")
    ap.add_argument("--story", default=None, help="HN search query (default: python)")
    args = ap.parse_args()

    print("1/3  Scraping Hacker News...", flush=True)
    digest, count = fetch_digest(args.story)
    print(f"     got {count} stories", flush=True)

    print("2/3  Writing the script (local LLM, this can take a few minutes on CPU)...", flush=True)
    script = write_script(digest)
    print(f"     title: {script['title']}", flush=True)
    for i, seg in enumerate(script["segments"], 1):
        print(f"     [{i}] {seg}", flush=True)

    out_dir = Path(__file__).resolve().parent / "out"
    out_dir.mkdir(exist_ok=True)
    script_path = out_dir / f"script_{time.strftime('%Y%m%d_%H%M%S')}.json"
    script_path.write_text(json.dumps(script, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"     saved: {script_path}", flush=True)

    if args.dry_run:
        print("DRY-RUN OK (no render)")
        return

    print("3/3  Rendering (TTS -> mascot -> slides -> ffmpeg -> Telegram, ~10-15 min on CPU)...", flush=True)
    # Attach the scraped story links (plus the LLM slide topics) so Telegram
    # can post them as a separate "topic: link" message after the video.
    script["sources"] = [
        {
            "title": s["title"],
            "link": s["link"],
            "topic": (script.get("topics") or [""])[i + 1] if i + 1 < len(script.get("topics") or []) else "",
        }
        for i, s in enumerate(STORIES)
    ]
    result = http_json(f"{RENDER_URL}/render", script, timeout=1800)
    print(json.dumps(result, indent=2))
    if "video_path" not in result:
        sys.exit(1)


if __name__ == "__main__":
    main()
