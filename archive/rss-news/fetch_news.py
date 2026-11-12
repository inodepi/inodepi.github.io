import feedparser
import requests
import os
import json
import logging
import random
import re

# --- LOGGING CONFIGURATION ---
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler("rss_fetcher.log", encoding="utf-8"),
        logging.StreamHandler()
    ]
)

# --- CONFIGURATION ---
WEBHOOK_URL = os.getenv("MAKE_WEBHOOK_URL")

FEED_URLS = [
    "https://news.ycombinator.com/rss",
    "https://www.phoronix.com/rss.php",
    "https://www.theverge.com/rss/index.xml",
    "https://hnrss.org/ai",
    "https://9to5google.com/feed/"
]

# Daily trending repos on GitHub (static feed hosted on GitHub Pages, very reliable).
# We only take the single top repo of the day.
TRENDING_REPO_FEED = "https://mshibanami.github.io/GitHubTrendingRSS/daily/all.xml"
TRENDING_REPO_TITLE = "GitHub Trending Repo of the Day"

KEYWORDS = [
    "linux", "ubuntu", "debian", "windows", 
    "ai model", "llm", "openai", "deepseek", "anthropic", 
    "smartphone", "pixel", "galaxy", "gpu"
]

SEEN_FILE = "seen_articles.json"

def load_seen():
    if os.path.exists(SEEN_FILE):
        try:
            with open(SEEN_FILE, "r", encoding="utf-8") as f:
                return set(json.load(f))
        except Exception:
            return set()
    return set()

def save_seen(seen_set):
    try:
        seen_list = list(seen_set)[-1000:]
        with open(SEEN_FILE, "w", encoding="utf-8") as f:
            json.dump(seen_list, f)
    except Exception as e:
        logging.error(f"Failed to save seen cache: {e}")

def match_keywords(text, keywords):
    text_lower = text.lower()
    return any(kw in text_lower for kw in keywords)

def get_random_local_image():
    """Scans the local images/ directory securely and returns a random raw GitHub image URL."""
    images_dir = os.path.join(os.getcwd(), "images")
    
    if not os.path.exists(images_dir):
        raise FileNotFoundError(f"Critical Error: 'images' directory not found at path: {images_dir}")

    valid_extensions = (".jpg", ".jpeg", ".png", ".webp")
    images = [f for f in os.listdir(images_dir) if f.lower().endswith(valid_extensions)]

    logging.info(f"Found local images in repo: {images}")

    if not images:
        raise ValueError(f"Critical Error: The 'images/' folder at {images_dir} contains no valid image files!")

    chosen_image = random.choice(images)
    
    repo = os.getenv("GITHUB_REPOSITORY", "inodepi/rss-news")
    branch = os.getenv("GITHUB_REF_NAME", "main")
    
    direct_url = f"https://raw.githubusercontent.com/{repo}/{branch}/images/{chosen_image}"
    logging.info(f"Randomly selected image: {chosen_image} -> URL: {direct_url}")
    return direct_url

def get_top_trending_repo():
    """Fetches the #1 daily trending GitHub repo. Returns (repo_title, repo_url, description) or None."""
    try:
        feed = feedparser.parse(TRENDING_REPO_FEED)
        entry = feed.entries[0] if feed.entries else None
        if not entry:
            logging.warning("Trending repo feed returned no entries.")
            return None

        repo_title = getattr(entry, "title", "").strip()
        repo_url = getattr(entry, "link", "").strip()
        raw_description = getattr(entry, "summary", getattr(entry, "description", ""))
        # Strip HTML tags from the description so Gemini gets clean text to work with
        description = re.sub(r"<[^>]+>", " ", raw_description)
        description = re.sub(r"\s+", " ", description).strip()

        logging.info(f"Top trending repo: {repo_title} ({repo_url})")
        return repo_title, repo_url, description
    except Exception as e:
        logging.error(f"Error fetching trending repo feed: {e}")
        return None

def main():
    if not WEBHOOK_URL:
        logging.error("MAKE_WEBHOOK_URL environment variable is not set!")
        return

    logging.info("Starting RSS digest run...")
    seen_articles = load_seen()
    digest_items = []
    newly_seen_ids = set()

    # 1. Gather matching items
    for url in FEED_URLS:
        try:
            feed = feedparser.parse(url)
            for entry in feed.entries:
                entry_id = getattr(entry, "id", getattr(entry, "link", None))
                if not entry_id or entry_id in seen_articles:
                    continue
                    
                title = getattr(entry, "title", "No Title")
                summary = getattr(entry, "summary", getattr(entry, "description", ""))
                
                if match_keywords(f"{title} {summary}", KEYWORDS):
                    # Keep a plain-text snippet of the summary so Gemini can actually
                    # summarize instead of only having a link to work with.
                    snippet = re.sub(r"<[^>]+>", " ", summary)
                    snippet = re.sub(r"\s+", " ", snippet).strip()
                    if len(snippet) > 300:
                        snippet = snippet[:300].rsplit(" ", 1)[0] + "..."
                    item_text = f"• **{title}**\n  Source: {feed.feed.get('title', url)}\n  Link: {entry.link}\n  Snippet: {snippet or '(no summary available)'}"
                    digest_items.append(item_text)
                    newly_seen_ids.add(entry_id)
        except Exception as e:
            logging.error(f"Error parsing feed {url}: {e}")

    # 1b. Add the #1 trending GitHub repo (always included when found)
    top_repo = get_top_trending_repo()
    if top_repo:
        repo_title, repo_url, repo_description = top_repo
        repo_snippet = repo_description[:300] + ("..." if len(repo_description) > 300 else "")
        digest_items.append(
            f"• **{repo_title}**\n"
            f"  Source: {TRENDING_REPO_TITLE}\n"
            f"  Link: {repo_url}\n"
            f"  Snippet: {repo_snippet or '(no description available)'}"
        )
        logging.info("Added top trending GitHub repo to digest.")

    # 2. Build digest, pick a random local image, and send payload
    if digest_items:
        logging.info(f"Found {len(digest_items)} new matching articles. Preparing payload...")
        
        combined_digest = "\n\n".join(digest_items)
        random_banner = get_random_local_image()  # Will throw a clear error if no images are tracked
        
        payload_data = {
            "digest_title": f"Tech & AI Digest ({len(digest_items)} items)",
            "total_items": len(digest_items),
            "content": combined_digest,
            "banner_image": random_banner
        }
        
        try:
            response = requests.post(WEBHOOK_URL, json=payload_data, timeout=15)
            if response.status_code in [200, 201, 204]:
                logging.info("Successfully delivered digest and random image to Make.com.")
                seen_articles.update(newly_seen_ids)
                save_seen(seen_articles)
            else:
                logging.error(f"Webhook rejected payload. Status: {response.status_code}")
        except requests.exceptions.RequestException as e:
            logging.error(f"Network error: {e}")
    else:
        logging.info("No new matching articles found.")

if __name__ == "__main__":
    main()
