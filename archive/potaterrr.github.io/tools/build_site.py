#!/usr/bin/env python3
"""Static site builder for potaterrr.github.io.

Generates the /projects pages, refreshes the blog posts/archive, per-post OG
cards, sitemap and feeds from data/projects.json + data/posts.json.

Run from anywhere:  python3 tools/build_site.py
"""
from __future__ import annotations

import json
import re
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from email.utils import format_datetime
from html import escape as esc, unescape
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
BLOG = ROOT / "blog"
PROJECTS_DIR = ROOT / "projects"
SITE = "https://potaterrr.github.io"
GOOGLE_VERIFICATION = [
    "QNQfraP7HxAO29cnHiJCMXKcEWGMC1i9ZpVe2efekuY",
    "BHAxusjIlUmU4TL4ARcXEBX5Dl-WmESC4wgenC5SOeo",
]
GOOGLE_VERIFICATION_META = "\n".join(
    f'  <meta name="google-site-verification" content="{value}" />'
    for value in GOOGLE_VERIFICATION
)
OG_DEFAULT = f"{SITE}/assets/og-image.png"
TODAY = datetime.now().strftime("%Y-%m-%d")

PROJECT_DATA = json.loads((ROOT / "data/projects.json").read_text(encoding="utf-8"))
POST_DATA = json.loads((ROOT / "data/posts.json").read_text(encoding="utf-8"))
TAG_LABELS = POST_DATA["tag_labels"]
CATEGORIES = {c["id"]: c for c in PROJECT_DATA["categories"]}
PROJECTS = PROJECT_DATA["projects"]
PROJECT_BY_SLUG = {p["slug"]: p for p in PROJECTS}

# Posts that document a build: post slug -> project slug.
POST_PROJECT = {
    "ai-receptionist-answers-missed-calls": "ai-voice-receptionist",
    "ai-receptionist-small-clinic": "ai-voice-receptionist",
    "one-receptionist-three-engines": "ai-voice-receptionist",
    "sales-call-qa": "sales-call-qa",
    "ar-invoice-agent-challenges": "ar-invoice-reminder",
    "why-my-ai-never-sends-emails": "dead-lead-retrieval",
    "job-scrapper-discord-gemini": "job-scrapper",
}


# ---------------------------------------------------------------- shared markup

FOOTER = """  <footer class="footer">
    <div class="container footer-inner">
      <p><em>"Mashing the boring stuff so you don't have to."</em></p>
      <p>© <span id="year"></span> Christian John</p>
    </div>
  </footer>"""

NOSCRIPT = """  <noscript><style>
    .reveal{opacity:1;transform:none}
    .intro,.post-toc,.a11y-trigger,.theme-toggle{display:none!important}
  </style></noscript>"""

ICONS = """  <link rel="icon" href="/assets/favicon.ico" sizes="any" />
  <link rel="icon" type="image/png" sizes="32x32" href="/assets/favicon-32.png" />
  <link rel="apple-touch-icon" href="/assets/favicon-180.png" />"""

A11Y_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="5.5" r="1.8" /><path d="M5 9.5c2.2.8 4.6 1.2 7 1.2s4.8-.4 7-1.2M12 10.7V15m0 0-2.5 5m2.5-5 2.5 5" /></svg>'

RAIL_ITEMS = [
    ("home", "/", "Home", '<path d="M3 11.5 12 4l9 7.5M5.5 10v9.5h13V10" />'),
    ("projects", "/projects/", "Projects", '<path d="M3.5 7.5a2 2 0 0 1 2-2h4l2 2.5h7a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z" />'),
    ("skills", "/skills/", "Skills", '<path d="M14.5 6.5a4 4 0 0 0-5.6 4.9L4 16.3V20h3.7l4.9-4.9a4 4 0 0 0 4.9-5.6l-2.8 2.8-2.4-2.4z" />'),
    ("work", "/work-with-me/", "Work with me", '<path d="M4.5 6.5h15v13h-15zM8 4v4M16 4v4M8.5 13l2.5 2.5 4.5-4.5" />'),
    ("timeline", "/timeline/", "Timeline", '<circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" />'),
    ("blog", "/blog/", "Blog", '<path d="M6 4.5h9.5L19 8v11.5H6zM9 9h6M9 12.5h6M9 16h4" />'),
    ("contact", "/contact/", "Contact", '<path d="M4.5 6a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H9l-4.5 3.5z" />'),
]


def rail(active: str = "") -> str:
    items = []
    for key, href, label, icon in RAIL_ITEMS:
        on = key == active
        cls = ' class="active"' if on else ""
        current = ' aria-current="page"' if on else ""
        items.append(f'<li><a href="{href}"{cls}{current}><svg viewBox="0 0 24 24" aria-hidden="true">{icon}</svg>{label}</a></li>')
    return f"""  <aside class="rail" id="rail" aria-label="Profile and site navigation">
      <a href="/" class="rail-id" aria-label="potaterrr — home">
        <span class="rail-avatar"><picture><source srcset="/assets/avatar-192.webp" type="image/webp" /><img src="/assets/avatar-192.jpg" alt="" width="84" height="84" decoding="async" /></picture></span>
        <span class="rail-name">Christian John Vallejos</span>
        <span class="rail-handle">🥔 potaterrr</span>
      </a>

      <ul class="rail-socials" aria-label="Contact profiles">
        <li><a href="https://cal.com/christian-john-vallejos-adws8d/60min" target="_blank" rel="noopener" aria-label="Book a fit call" title="Cal.com — book a 60-min call">📅</a></li>
        <li><a href="https://github.com/potaterrr" target="_blank" rel="noopener" aria-label="GitHub" title="GitHub">🐙</a></li>
        <li><a href="mailto:kristiandyanbusiness@gmail.com" aria-label="Email" title="Email">📧</a></li>
      </ul>

      <a class="rail-cta" href="https://cal.com/christian-john-vallejos-adws8d/60min" target="_blank" rel="noopener">Book a fit call</a>

      <nav class="rail-nav" aria-label="Sections">
        <ul>
          {"".join(items)}
        </ul>
      </nav>

      <div class="rail-foot">
        <button type="button" class="theme-toggle" aria-label="Switch theme">☀️</button>
        <button type="button" class="a11y-trigger" aria-expanded="false" aria-controls="a11y-menu" aria-label="Accessibility options">
          {A11Y_SVG}
        </button>
      </div>
    </aside>"""


def tabbar(active: str = "") -> str:
    entries = [
        ("home", "/", "Home", '<path d="M3 11.5 12 4l9 7.5M5.5 10v9.5h13V10" />'),
        ("projects", "/projects/", "Projects", '<path d="M3.5 7.5a2 2 0 0 1 2-2h4l2 2.5h7a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z" />'),
        ("work", "/work-with-me/", "Work with me", '<path d="M4.5 6.5h15v13h-15zM8 4v4M16 4v4M8.5 13l2.5 2.5 4.5-4.5" />'),
        ("contact", "/contact/", "Contact", '<path d="M4.5 6a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H9l-4.5 3.5z" />'),
    ]
    links = []
    for key, href, label, icon in entries:
        cls = ' class="active"' if key == active else ""
        links.append(f'<a href="{href}"{cls}><svg viewBox="0 0 24 24" aria-hidden="true">{icon}</svg><span>{label}</span></a>')
    return f"""  <nav class="tabbar" aria-label="Quick navigation">
    {"".join(links)}
    <button type="button" class="tabbar-a11y a11y-trigger" aria-expanded="false" aria-controls="a11y-menu" aria-label="Accessibility options">
      {A11Y_SVG}<span>A11y</span>
    </button>
  </nav>"""


A11Y_MENU = """  <div class="a11y-menu" id="a11y-menu" hidden>
    <h3>Accessibility</h3>
    <div class="a11y-row">
      <span id="a11y-theme-label">Theme</span>
      <button type="button" class="theme-toggle" aria-label="Switch theme">☀️</button>
    </div>
    <div class="a11y-row">
      <span id="a11y-motion-label">Reduce motion</span>
      <button type="button" class="a11y-switch" id="a11y-motion" role="switch" aria-checked="false" aria-labelledby="a11y-motion-label"><span class="a11y-knob"></span></button>
    </div>
    <div class="a11y-row">
      <span id="a11y-font-label">Text size</span>
      <div class="a11y-stepper" role="group" aria-labelledby="a11y-font-label">
        <button type="button" id="a11y-font-minus" aria-label="Decrease text size">−</button>
        <span id="a11y-font-value">100%</span>
        <button type="button" id="a11y-font-plus" aria-label="Increase text size">+</button>
      </div>
    </div>
  </div>"""


NAV_PAGES = [
    ("home", "/", "Home", "Want to read more about me?"),
    ("projects", "/projects/", "Projects", "Wanna see what I'm up to?"),
    ("skills", "/skills/", "Skills", "See the tools I build with"),
    ("work", "/work-with-me/", "Work with me", "Let's work together"),
    ("timeline", "/timeline/", "Timeline", "See what I've shipped"),
    ("blog", "/blog/", "Blog", "Read the field notes"),
    ("contact", "/contact/", "Contact", "Let's talk"),
]


def page_nav(active: str = "") -> str:
    keys = [p[0] for p in NAV_PAGES]
    if active not in keys:
        return ""
    i = keys.index(active)

    def button(item, direction):
        key, href, label, line = item
        cls = "is-prev" if direction == "previous" else "is-next"
        arrow = "←" if direction == "previous" else "→"
        dir_label = "Previous" if direction == "previous" else "Next"
        return (
            f'<a class="page-nav-btn {cls}" href="{href}">'
            f'<span class="page-nav-dir">{dir_label} {arrow}</span>'
            f'<span class="page-nav-title">{line}</span>'
            "</a>"
        )

    tiles = []
    if i > 0:
        tiles.append(button(NAV_PAGES[i - 1], "previous"))
    if i + 1 < len(NAV_PAGES):
        tiles.append(button(NAV_PAGES[i + 1], "next"))

    return f"""    <section class="page-nav-wrap">
      <div class="container">
        <p class="page-nav-kicker">$ cd ../{keys[i + 1] if i + 1 < len(keys) else "~"}</p>
        <nav class="page-nav" aria-label="Previous and next page">
          {"".join(tiles)}
        </nav>
      </div>
    </section>"""


def simple_page(key: str, title: str, kicker: str, lead: str, partial: str,
                desc: str, og: str, head_cta: str = "", extra_jsonld: str = "") -> str:
    content = (ROOT / "partials" / partial).read_text(encoding="utf-8")
    href = next((p[1] for p in NAV_PAGES if p[0] == key), f"/{key}/")
    canonical = f"{SITE}{href}"
    head_cta_block = f"\n        {head_cta}" if head_cta else ""
    jsonld = ld({
        "@context": "https://schema.org",
        "@type": "WebPage",
        "name": f"{title} — potaterrr",
        "url": canonical,
        "description": desc,
        "author": {"@type": "Person", "name": "Christian John", "url": SITE + "/"},
    })
    return f"""{head(f"{title} — potaterrr", desc, canonical, active=key,
             image=f"{SITE}/assets/og/{og}.png", jsonld=jsonld + extra_jsonld)}
{shell_open(key)}

    <section class="page-head">
      <div class="container">
        <p class="hero-kicker">{kicker}</p>
        <h1 class="page-title">{title}</h1>
        <p class="page-lead">{lead}</p>{head_cta_block}
      </div>
    </section>

    <section class="section">
      <div class="container">
{content}
      </div>
    </section>

{page_nav(key)}
{FOOTER}
{shell_close()}

  <script src="/js/main.js" defer></script>
</body>
</html>
"""


def skills_page() -> str:
    return simple_page(
        "skills", "Skills", "$ ls ~/skills",
        "n8n is the default stack. Python, webhooks, LLM pipelines and CI/CD fill in when the job needs them — Make or Zapier only when your tools demand it.",
        "skills.html",
        "n8n is the default stack. Python, webhooks, LLM pipelines and CI/CD fill in when the job needs them — and Make or Zapier only when your tools demand it.",
        "skills",
    )


def work_page() -> str:
    head_cta = (
        '<div class="cta-row reveal page-head-cta">\n'
        '          <a class="btn btn-primary" href="https://cal.com/christian-john-vallejos-adws8d/60min" target="_blank" rel="noopener">Book a fit call</a>\n'
        '          <a class="btn btn-ghost" href="mailto:kristiandyanbusiness@gmail.com">Email me instead</a>\n'
        "        </div>"
    )
    service_ld = ld({
        "@context": "https://schema.org",
        "@type": "Service",
        "name": "n8n automation and AI voice receptionist builds",
        "serviceType": "Workflow automation, AI voice receptionist setup and HIPAA-compliant builds",
        "provider": {"@type": "Person", "name": "Christian John", "url": SITE + "/"},
        "areaServed": "Worldwide",
        "hasOfferCatalog": {
            "@type": "OfferCatalog",
            "name": "Engagement options",
            "itemListElement": [
                {"@type": "Offer", "itemOffered": {"@type": "Service", "name": "Automation Sprint", "description": "One workflow on n8n, delivered in 1–2 weeks with handover notes."}},
                {"@type": "Offer", "itemOffered": {"@type": "Service", "name": "Workflows", "description": "Multi-step n8n workflows across CRM, sheets, inbox and calendar."}},
                {"@type": "Offer", "itemOffered": {"@type": "Service", "name": "Automation Partner", "description": "Ongoing monitoring, fixes and new steps for live pipelines."}},
                {"@type": "Offer", "itemOffered": {"@type": "Service", "name": "HIPAA-compliant build", "description": "Clinic voice receptionist with human checkpoints, audit trail and data kept inside the client's accounts."}},
            ],
        },
    })
    return simple_page(
        "work", "Work with me", "$ cat packages.md",
        "Automation for any business, not one niche. Bring a process that eats your week — I map it, build the smallest pipeline that removes the loop, and hand it over with monitoring. Builds default to n8n; Make, Zapier or Python only when your tools demand it.",
        "work-with-me.html",
        "Automation Sprint, Workflows and Automation Partner — fixed-scope starting points for any team with a repetitive process.",
        "work-with-me",
        head_cta,
        service_ld,
    )


def privacy_page() -> str:
    return simple_page(
        "privacy", "Privacy", "$ cat privacy.md",
        "The short version: this site collects visit analytics, and nothing you send me is sold, shared or used for ads.",
        "privacy.html",
        "What the potaterrr site collects, how Microsoft Clarity analytics and email work, and how to have your data removed.",
        "contact",
    )


def contact_page() -> str:
    return simple_page(
        "contact", "Contact", "$ ping potaterrr",
        "Book a fit call about your phones or any workflow you want off your plate — or email me.",
        "contact.html",
        "Book a fit call with Christian John (potaterrr), or reach out on Cal.com, Facebook or email.",
        "contact",
    )


FAB = """  <a href="/contact/" class="potato-fab" aria-label="Got questions? Let’s get farming — open the contact page">

    <div class="circular-text">
      <svg viewBox="0 0 100 100" width="100" height="100">
        <path id="textPath" d="M 50, 50 m -37, 0 a 37,37 0 1,1 74,0 a 37,37 0 1,1 -74,0" fill="none" />
        <text fill="#d97706" font-size="9" font-weight="700" letter-spacing="1">
          <textPath href="#textPath" startOffset="0%">
            GOT QUESTIONS? LET'S GET FARMING 🥔
          </textPath>
        </text>
      </svg>
    </div>

    <div class="potato-body">
      <picture><source srcset="/assets/pfp-192.webp" type="image/webp" /><img src="/assets/pfp-192.jpg" alt="" width="48" height="48" decoding="async" /></picture>
    </div>

  </a>"""


_ACTIVE = {"key": ""}


def shell_open(active: str = "") -> str:
    _ACTIVE["key"] = active
    return """  <main id="main-content" class="page-content">"""


def shell_close(active: str = "") -> str:
    active = active or _ACTIVE["key"]
    return f"""  </main>

{FAB}"""



def head(title: str, desc: str, canonical: str, *, kind="website", image=OG_DEFAULT,
         extra="", jsonld="", active="") -> str:
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{esc(title)}</title>
  <meta name="description" content="{esc(desc)}" />
  <meta name="author" content="Christian John" />
{GOOGLE_VERIFICATION_META}
  <link rel="canonical" href="{canonical}" />
  <meta name="color-scheme" content="dark light" />
  <meta name="theme-color" content="#0d1117" media="(prefers-color-scheme: dark)" />
  <meta name="theme-color" content="#faf7f0" media="(prefers-color-scheme: light)" />
  <meta property="og:type" content="{kind}" />
  <meta property="og:site_name" content="potaterrr" />
  <meta property="og:locale" content="en_US" />
  <meta property="og:title" content="{esc(title)}" />
  <meta property="og:description" content="{esc(desc)}" />
  <meta property="og:url" content="{canonical}" />
  <meta property="og:image" content="{image}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:image:alt" content="{esc(title)}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="{esc(title)}" />
  <meta name="twitter:description" content="{esc(desc)}" />
  <meta name="twitter:image" content="{image}" />
{extra}{ICONS}
  <link rel="alternate" type="application/rss+xml" title="potaterrr — posts" href="{SITE}/feed.xml" />
  <link rel="alternate" type="application/feed+json" title="potaterrr — posts (JSON)" href="{SITE}/feed.json" />
  <link rel="stylesheet" href="/css/style.css" />
  <script>(function(){{var m=window.matchMedia&&window.matchMedia("(prefers-color-scheme: light)");function set(){{if(m&&m.matches)document.documentElement.setAttribute("data-theme","light");else document.documentElement.removeAttribute("data-theme")}}set();if(m&&m.addEventListener)m.addEventListener("change",set)}})();</script>
{NOSCRIPT}
{jsonld}</head>
<body>
  <a href="#main-content" class="skip-to-content">Skip to main content</a>
"""


def ld(data: dict) -> str:
    return '  <script type="application/ld+json">\n' + json.dumps(data, indent=2) + "\n  </script>\n"


def version(p: dict) -> str:
    if p.get("version"):
        return f'v{p["version"]} · {p.get("channel", "")}'.strip(" ·")
    return ""


def project_card(p: dict) -> str:
    cat = CATEGORIES[p["category"]]
    badge = ""
    if p.get("version"):
        badge = f'<span class="proj-version">{esc(version(p))}</span>'
    tags = "".join(f'<span class="proj-tech">{esc(t)}</span>' for t in p.get("tech", [])[:4])
    return f"""        <a class="proj-card" href="/projects/{p["slug"]}/">
          <div class="proj-card-top">
            <span class="proj-cat">{esc(cat["kicker"])}</span>
            {badge}
          </div>
          <h3>{esc(p["title"])}</h3>
          <p>{esc(p["summary"])}</p>
          <div class="proj-card-foot">
            <span class="proj-tech-row">{tags}</span>
            <span class="proj-arrow" aria-hidden="true">↗</span>
          </div>
        </a>"""


def project_index() -> str:
    sections = []
    nav_links = []
    for cat in PROJECT_DATA["categories"]:
        items = [p for p in PROJECTS if p["category"] == cat["id"]]
        if not items:
            continue
        nav_links.append(
            f'<a href="#{cat["id"]}" data-section="{cat["id"]}">{esc(cat["title"])}</a>'
        )
        cards = "\n".join(project_card(p) for p in items)
        single = " is-single" if len(items) == 1 else ""
        sections.append(f"""      <section class="proj-section" id="{cat["id"]}" aria-labelledby="{cat["id"]}-title">
        <div class="proj-section-head">
          <p class="proj-kicker">{esc(cat["kicker"])}</p>
          <h2 id="{cat["id"]}-title"><span class="hash">#</span> {esc(cat["title"])}</h2>
          <p>{esc(cat["blurb"])}</p>
        </div>
        <div class="proj-grid{single}">
{cards}
        </div>
      </section>""")

    count = len(PROJECTS)
    jsonld = ld({
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        "name": "Projects — potaterrr",
        "url": f"{SITE}/projects/",
        "description": "Automation builds, the HappyPhone softphone, web UI prototypes and small games.",
        "mainEntity": {
            "@type": "ItemList",
            "itemListElement": [
                {"@type": "ListItem", "position": i + 1, "url": f"{SITE}/projects/{p['slug']}/", "name": p["title"]}
                for i, p in enumerate(PROJECTS)
            ],
        },
    })
    return f"""{head("Projects — automation, softphone and games · potaterrr",
             "The builds: the HappyPhone internal softphone, AI voice receptionists, LLM agents, scrapers, ops pipelines and small games.",
             f"{SITE}/projects/", active="projects",
             image=f"{SITE}/assets/og/projects/index.png", jsonld=jsonld)}
{shell_open("projects")}

    <section class="page-head">
      <div class="container">
        <p class="hero-kicker">$ ls ~/projects</p>
        <h1 class="page-title">Projects</h1>
        <p class="page-lead">The startup I'm part of, the prototypes behind it, and the automation builds that pay the bills. {count} projects, grouped by what they do — no pricing, no fluff.</p>
      </div>
    </section>

    <nav class="section-nav" aria-label="On this page">
      <div class="container section-nav-inner">
        {"".join(nav_links)}
      </div>
    </nav>
    <div class="container">
{chr(10).join(sections)}
    </div>

{page_nav("projects")}

{FOOTER}
{shell_close()}

  <script src="/js/section-nav.js" defer></script>
  <script src="/js/main.js" defer></script>
</body>
</html>
"""


def link_item(link: dict) -> str:
    ext = ' target="_blank" rel="noopener"' if link.get("external") else ""
    arrow = " ↗" if link.get("external") else ""
    return f'<li><a href="{link["href"]}"{ext}>{esc(link["label"])}{arrow}</a></li>'


def render_sections(sections, extra_after_first="") -> str:
    out = []
    for idx, s in enumerate(sections):
        body = "".join(f"<p>{esc_or_html(x)}</p>" for x in s.get("body", []))
        bullets = ""
        if s.get("bullets"):
            items = "".join(f"<li>{esc_or_html(x)}</li>" for x in s["bullets"])
            bullets = f'<ul class="project-list">{items}</ul>'
        out.append(f"""        <section class="project-block">
          <h2>{esc(s["title"])}</h2>
          {body}
          {bullets}
        </section>""")
        if idx == 0 and extra_after_first:
            out.append(extra_after_first)
    return "\n".join(out)


def render_use_cases(items) -> str:
    if not items:
        return ""
    cards = "".join(
        f'<article class="use-case-card"><h3>{esc(u["title"])}</h3><p>{esc(u["body"])}</p></article>'
        for u in items
    )
    return f"""        <section class="project-block" id="use-cases">
          <h2>Use cases</h2>
          <div class="use-case-grid">{cards}</div>
        </section>"""


def esc_or_html(text: str) -> str:
    """Escape text but keep a tiny allow-list of inline HTML from the JSON copy."""
    out = esc(text)
    for tag in ("code", "strong", "em", "a"):
        out = out.replace(f"&lt;{tag}&gt;", f"<{tag}>").replace(f"&lt;/{tag}&gt;", f"</{tag}>")
    return out


def md_inline(text: str) -> str:
    t = esc(text)
    t = re.sub(r"`([^`]+)`", r"<code>\1</code>", t)
    t = re.sub(r"\*\*([^*]+)\*\*", r"<strong>\1</strong>", t)
    t = re.sub(r"(?<!\*)\*([^*]+)\*(?!\*)", r"<em>\1</em>", t)
    t = re.sub(r"\[([^\]]+)\]\(([^)]+)\)", r'<a href="\2" target="_blank" rel="noopener">\1</a>', t)
    return t


def slugify(text: str) -> str:
    text = unescape(re.sub(r"<[^>]+>", "", text)).lower()
    text = re.sub(r"[^\w\s-]", "", text)
    return re.sub(r"[\s_-]+", "-", text).strip("-")


def md_blocks(lines) -> str:
    out = []
    i = 0
    n = len(lines)
    while i < n:
        line = lines[i]
        if not line.strip():
            i += 1
            continue
        if line.startswith("|"):
            rows = []
            while i < n and lines[i].startswith("|"):
                rows.append(lines[i])
                i += 1
            cells = [r.strip().strip("|").split("|") for r in rows]
            header, body = cells[0], cells[2:]
            th = "".join(f"<th>{md_inline(c.strip())}</th>" for c in header)
            trs = "".join(
                "<tr>" + "".join(f"<td>{md_inline(c.strip())}</td>" for c in row) + "</tr>"
                for row in body
            )
            out.append(f'<div class="patch-table-wrap"><table><thead><tr>{th}</tr></thead><tbody>{trs}</tbody></table></div>')
            continue
        if line.startswith("### "):
            heading = md_inline(line[4:])
            out.append(f'<h3 id="{slugify(heading)}">{heading}</h3>')
            i += 1
            continue
        if line.startswith("#### "):
            heading = md_inline(line[5:])
            out.append(f'<h4 id="{slugify(heading)}">{heading}</h4>')
            i += 1
            continue
        if line.startswith(">"):
            quote = []
            while i < n and lines[i].startswith(">"):
                quote.append(lines[i].lstrip("> ").strip())
                i += 1
            out.append(f"<blockquote>{md_inline(' '.join(quote))}</blockquote>")
            continue
        if re.match(r"^\s*[-*]\s+", line):
            items = []
            while i < n and re.match(r"^\s*[-*]\s+", lines[i]):
                items.append(md_inline(re.sub(r"^\s*[-*]\s+", "", lines[i])))
                i += 1
            out.append("<ul>" + "".join(f"<li>{x}</li>" for x in items) + "</ul>")
            continue
        if re.match(r"^\s*\d+\.\s+", line):
            items = []
            while i < n and re.match(r"^\s*\d+\.\s+", lines[i]):
                items.append(md_inline(re.sub(r"^\s*\d+\.\s+", "", lines[i])))
                i += 1
            out.append("<ol>" + "".join(f"<li>{x}</li>" for x in items) + "</ol>")
            continue
        if line.strip() == "---":
            out.append("<hr />")
            i += 1
            continue
        para = [line.strip()]
        i += 1
        while i < n and lines[i].strip() and not re.match(r"^(#|\||- |\* |\d+\. |>|---)", lines[i].strip()):
            para.append(lines[i].strip())
            i += 1
        out.append(f"<p>{md_inline(' '.join(para))}</p>")
    return "\n".join(out)


def render_patch_notes(
    filename: str = "adblock-changelog.md",
    source_url: str = "https://github.com/potaterrr/adblock-island/blob/main/CHANGELOG.md",
    default_channel: str = "beta",
    title: str = "Patch notes",
    section_id: str = "patch-notes",
    cta_html: str = "",
) -> str:
    md = (ROOT / "data" / filename).read_text(encoding="utf-8")
    lines = md.splitlines()
    if lines and lines[0].startswith("# "):
        lines = lines[1:]

    intro = []
    i = 0
    while i < len(lines) and not lines[i].startswith("## "):
        intro.append(lines[i])
        i += 1

    parts = []
    pending_body = []
    first_release = True
    while i < len(lines):
        heading = lines[i][3:].strip()
        i += 1
        body = []
        while i < len(lines) and not lines[i].startswith("## "):
            body.append(lines[i])
            i += 1

        if heading.lower().startswith("still pending"):
            pending_body = body
            continue

        ver, channel, date = heading, "", ""
        m = re.match(r"^(\[?[vV]?[\d.]+\]?)\s*—\s*(.+)$", heading)
        if m:
            ver = m.group(1).strip("[]")
            rest = m.group(2).strip()
            dm = re.search(r"\((\d{4}-\d{2}-\d{2})\)$", rest)
            if dm:
                date = dm.group(1)
                channel = rest[: dm.start()].strip()
            else:
                date = rest

        if not ver.lower().startswith("v"):
            ver = "v" + ver
        if not channel:
            channel = default_channel
        display = ""
        if date:
            try:
                display = datetime.strptime(date, "%Y-%m-%d").strftime("%b %-d, %Y")
            except ValueError:
                display = date

        channel_html = f'<span class="patch-channel">{esc(channel)}</span>' if channel else ""
        date_html = f'<time class="patch-date" datetime="{date}">{display}</time>' if date else ""
        open_attr = " open" if first_release else ""
        parts.append(f"""<details class="patch-release"{open_attr}>
  <summary>
    <span class="patch-version">{esc(ver)}</span>
    {channel_html}
    {date_html}
    <span class="patch-plus" aria-hidden="true">+</span>
  </summary>
  <div class="patch-body">
{md_blocks(body)}
  </div>
</details>""")
        first_release = False

    cta_line = f"\n            {cta_html}" if cta_html.strip() else ""
    patch_html = f"""        <section class="project-block patch-notes" id="{esc(section_id)}">
          <div class="patch-head">
            <h2>{esc(title)}</h2>{cta_line}
            <a class="patch-full" href="{esc(source_url)}" target="_blank" rel="noopener">Full changelog ↗</a>
          </div>
          <div class="patch-intro">
{md_blocks(intro)}
          </div>
          <div class="patch-list">
{chr(10).join(parts)}
          </div>
        </section>"""

    pending_html = ""
    if pending_body:
        pending_html = f"""        <section class="project-block patch-pending" id="pending">
          <h2>Still pending</h2>
{md_blocks(pending_body)}
        </section>"""

    return patch_html, pending_html


def project_page(p: dict) -> str:
    cat = CATEGORIES[p["category"]]
    badges = "".join(f'<span class="project-badge">{esc(b)}</span>' for b in p.get("badges", []))
    actions = []
    for link in p.get("links", []):
        cls = "btn btn-primary" if link.get("primary") else "btn btn-ghost"
        ext = ' target="_blank" rel="noopener"' if link.get("external") else ""
        actions.append(f'<a class="{cls}" href="{link["href"]}"{ext}>{esc(link["label"])}</a>')

    metrics = "".join(
        f'<div class="project-metric"><span>{esc(m["label"])}</span><strong>{esc(m["value"])}</strong></div>'
        for m in p.get("metrics", [])
    )
    tech = "".join(f'<span class="proj-tech">{esc(t)}</span>' for t in p.get("tech", []))

    gallery = ""
    if p.get("gallery"):
        shots = "".join(
            f'<figure class="project-shot"><img src="{g["src"]}" alt="{esc(g["alt"])}" loading="lazy" decoding="async" /><figcaption>{esc(g["alt"])}</figcaption></figure>'
            for g in p["gallery"]
        )
        gallery = f"""        <section class="project-block">
          <h2>Screenshots</h2>
          <div class="project-gallery">{shots}</div>
        </section>"""

    patch_html, pending_html = ("", "")
    if p.get("patch_notes"):
        patch_html, pending_html = render_patch_notes(
            p.get("changelog", "adblock-changelog.md"),
            p.get("changelog_url", "https://github.com/potaterrr/adblock-island/blob/main/CHANGELOG.md"),
            p.get("patch_default_channel", "beta"),
        )
    for branch in p.get("patch_branches", []):
        cta = ""
        if branch.get("cta"):
            c = branch["cta"]
            ext = ' target="_blank" rel="noopener"' if c.get("external") else ""
            cta = f'<a class="patch-branch-cta" href="{c["href"]}"{ext}>{esc(c["label"])}</a>'
        branch_html, _ = render_patch_notes(
            branch.get("filename", "adblock-online-changelog.md"),
            branch.get("source_url", ""),
            branch.get("default_channel", "online beta"),
            title=branch.get("title", "Patch notes · online beta"),
            section_id=branch.get("id", "patch-notes-online"),
            cta_html=cta,
        )
        patch_html += "\n" + branch_html

    use_cases_html = render_use_cases(p.get("use_cases", []))

    is_film = bool(p.get("demo_url"))
    hero_extra = ""
    if not is_film:
        hero_extra = f"""
        <div class="project-metrics">{metrics}</div>
        <div class="cta-row project-actions">{"".join(actions)}</div>"""

    sections = p.get("sections", [])
    if is_film:
        duration = p.get("film_duration", "")
        film_html = f"""        <section class="project-block">
          <h2>Overview</h2>
          <div class="project-video">
            <video controls preload="metadata" playsinline poster="/assets/videos/{p['slug']}.jpg" width="1280" height="720">
              <source src="/assets/videos/{p['slug']}.mp4" type="video/mp4">
              Your browser cannot play this film. <a href="/assets/videos/{p['slug']}.mp4">Download it</a>.
            </video>
          </div>
          <p class="project-video-note">Narrated build overview · {duration} · Dark Tech Keynote</p>
          <button class="btn btn-ghost project-backend-toggle" type="button" aria-expanded="false" aria-controls="backend-{p['slug']}">Show the backend</button>
          <div class="project-backend" id="backend-{p['slug']}" hidden>
            <div class="project-embed">
              <div class="project-embed-bar">
                <span class="project-embed-dots" aria-hidden="true"><i></i><i></i><i></i></span>
                <span class="project-embed-url">{esc(p["demo_url"].replace("https://", ""))}</span>
                <a href="{p["demo_url"]}" target="_blank" rel="noopener">Open full screen ↗</a>
              </div>
              <iframe data-src="{p["demo_url"]}" title="{esc(p["title"])} — interactive workflow" loading="lazy" referrerpolicy="strict-origin-when-cross-origin"></iframe>
              <p class="project-embed-note">Runs in your browser. If the frame doesn't load, open the demo directly.</p>
            </div>
          </div>
        </section>"""
        main_html = "\n".join(
            part for part in (film_html, use_cases_html, render_sections(sections[1:])) if part
        )
    else:
        after_overview = "\n".join(part for part in (use_cases_html, patch_html) if part)
        main_html = render_sections(sections, after_overview)

    related_posts_html = ""
    post_map = {pp["slug"]: pp for pp in load_posts()}
    related_posts = [post_map[s] for s in p.get("related_posts", []) if s in post_map]
    if related_posts:
        cards = "".join(
            f'<a class="related-card" href="/blog/{q["slug"]}.html"><span class="related-meta">{q["display"]} · {esc(q["reading"])}</span><strong>{esc(q["title"])}</strong><span>{esc(q["desc"])}</span></a>'
            for q in related_posts
        )
        related_posts_html = f"""        <section class="project-block">
          <h2>Field notes</h2>
          <div class="related-grid">{cards}</div>
        </section>"""

    # prev/next within the full ordered list
    idx = PROJECTS.index(p)
    prev_p = PROJECTS[idx - 1] if idx > 0 else None
    next_p = PROJECTS[idx + 1] if idx + 1 < len(PROJECTS) else None
    nav_prev = f'<a href="/projects/{prev_p["slug"]}/">&larr; {esc(prev_p["title"])}</a>' if prev_p else "<span></span>"
    nav_next = f'<a href="/projects/{next_p["slug"]}/">{esc(next_p["title"])} &rarr;</a>' if next_p else "<span></span>"

    canonical = f"{SITE}/projects/{p['slug']}/"
    image = f"{SITE}/assets/og/projects/{p['slug']}.png"
    jsonld = ld({
        "@context": "https://schema.org",
        "@type": "CreativeWork",
        "name": p["title"],
        "description": p["summary"],
        "url": canonical,
        "image": image,
        "author": {"@type": "Person", "name": "Christian John", "url": SITE + "/"},
        "keywords": ", ".join(p.get("tech", [])),
    }) + ld({
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "Home", "item": SITE + "/"},
            {"@type": "ListItem", "position": 2, "name": "Projects", "item": SITE + "/projects/"},
            {"@type": "ListItem", "position": 3, "name": p["title"]},
        ],
    })

    backend_script = '\n  <script src="/js/project-backend.js" defer></script>' if is_film else ""
    return f"""{head(f"{p['title']} — {cat['title']} · potaterrr", p["tagline"], canonical,
             image=image, jsonld=jsonld, active="projects")}
{shell_open("projects")}

    <section class="project-hero">
      <div class="container">
        <a class="back-link" href="/projects/">&larr; All projects</a>
        <p class="project-kicker">{esc(cat["kicker"])}</p>
        <h1 class="project-title">{esc(p["title"])}</h1>
        <p class="project-tagline">{esc(p["tagline"])}</p>
        <div class="project-badges">{badges}<span class="project-badge project-badge-status">{esc(p.get("status", ""))}</span></div>{hero_extra}
      </div>
    </section>

    <section class="project-body">
      <div class="container">
        <div class="project-layout">
          <div class="project-main">
{main_html}
{pending_html}
{gallery}
{related_posts_html}
          </div>
          <aside class="project-side" aria-label="Project details">
            <div class="project-side-card">
              <h2>Stack</h2>
              <div class="proj-tech-row">{tech}</div>
            </div>
            <div class="project-side-card">
              <h2>Links</h2>
              <ul class="project-link-list">
                {"".join(link_item(l) for l in p.get("links", []))}
              </ul>
            </div>
            <div class="project-side-card">
              <h2>Category</h2>
              <p><a href="/projects/#{cat["id"]}">{esc(cat["title"])}</a></p>
            </div>
          </aside>
        </div>
        <nav class="post-nav project-nav" aria-label="More projects">
          {nav_prev}
          {nav_next}
        </nav>
      </div>
    </section>

{FOOTER}
{shell_close()}
{backend_script}
  <script src="/js/section-nav.js" defer></script>
  <script src="/js/main.js" defer></script>
</body>
</html>
"""


# ------------------------------------------------------------------ blog build

def attr(pattern: str, text: str, default: str = "") -> str:
    m = re.search(pattern, text, re.S)
    return m.group(1).strip() if m else default


def clean_text(text: str) -> str:
    """Undo any HTML escaping, including escapes compounded by previous builds."""
    prev = None
    while prev != text:
        prev = text
        text = unescape(text)
    return text


def load_posts() -> list[dict]:
    posts = []
    for path in sorted(BLOG.glob("*.html")):
        if path.name == "index.html":
            continue
        raw = path.read_text(encoding="utf-8")
        title = attr(r'<h1 class="post-title">(.*?)</h1>', raw) or attr(r"<title>(.*?)\s+—\s+potaterrr</title>", raw)
        desc = attr(r'<meta name="description" content="(.*?)"', raw)
        date = attr(r'article:published_time" content="([\d-]+)"', raw, "2026-01-01")
        reading = attr(r'class="reading-time">(.*?)</span>', raw, "5 min read")
        body = attr(r'<div class="post-body">(.*?)\n\s*</div>', raw)
        text_only = re.sub(r"<[^>]+>", " ", body)
        words = len(re.findall(r"\S+", text_only))
        posts.append({
            "file": path,
            "slug": path.stem,
            "title": re.sub(r"\s+", " ", clean_text(title)),
            "desc": clean_text(desc),
            "date": date,
            "display": datetime.strptime(date, "%Y-%m-%d").strftime("%b %-d, %Y"),
            "reading": reading,
            "words": words,
            "tags": POST_DATA["posts"].get(path.stem, []),
            "body": body.strip("\n"),
        })
    posts.sort(key=lambda p: p["date"], reverse=True)
    return posts


def tag_chips(tags, href_prefix="/blog/?tag=") -> str:
    out = []
    for t in tags:
        label = esc(TAG_LABELS.get(t, t))
        if href_prefix is None:
            out.append(f'<span class="tag-chip">{label}</span>')
        else:
            out.append(f'<a class="tag-chip" href="{href_prefix}{t}">{label}</a>')
    return "".join(out)


def related_for(post, posts, limit=2):
    by_slug = {p["slug"]: p for p in posts}
    curated = POST_DATA.get("related", {}).get(post["slug"])
    if curated:
        return [by_slug[s] for s in curated if s in by_slug][:limit]
    scored = []
    for other in posts:
        if other["slug"] == post["slug"]:
            continue
        shared = len(set(post["tags"]) & set(other["tags"]))
        if shared:
            scored.append((shared, other["date"], other))
    scored.sort(key=lambda x: (x[0], x[1]), reverse=True)
    return [x[2] for x in scored][:limit]


def post_page(post, posts) -> str:
    related = related_for(post, posts)
    related_html = "".join(
        f'<a class="related-card" href="/blog/{r["slug"]}.html"><span class="related-meta">{r["display"]} · {esc(r["reading"])}</span><strong>{esc(r["title"])}</strong><span>{esc(r["desc"])}</span></a>'
        for r in related
    )
    related_block = ""
    if related_html:
        related_block = f"""            <div class="related-posts">
              <h2 class="related-title">Related notes</h2>
              <div class="related-grid">{related_html}</div>
            </div>"""

    idx = posts.index(post)
    newer = posts[idx - 1] if idx > 0 else None
    older = posts[idx + 1] if idx + 1 < len(posts) else None
    prev_link = f'<a href="{older["slug"]}.html">&larr; {esc(older["title"])}</a>' if older else "<span></span>"
    next_link = f'<a href="{newer["slug"]}.html">{esc(newer["title"])} &rarr;</a>' if newer else "<span></span>"

    canonical = f"{SITE}/blog/{post['slug']}.html"
    image = f"{SITE}/assets/og/blog/{post['slug']}.png"
    extra = (
        f'  <meta property="article:published_time" content="{post["date"]}" />\n'
        f'  <meta property="article:modified_time" content="{post["date"]}" />\n'
        f'  <meta property="article:author" content="Christian John" />\n'
        f'  <meta property="article:section" content="Automation" />\n'
        + "".join(f'  <meta property="article:tag" content="{esc(TAG_LABELS.get(t, t))}" />\n' for t in post["tags"])
    )
    body_ld = {
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        "headline": post["title"],
        "description": post["desc"],
        "datePublished": post["date"],
        "dateModified": post["date"],
        "inLanguage": "en",
        "wordCount": post["words"],
        "keywords": ", ".join(TAG_LABELS.get(t, t) for t in post["tags"]),
        "author": {"@type": "Person", "name": "Christian John", "url": SITE + "/"},
        "publisher": {"@type": "Person", "name": "Christian John", "url": SITE + "/"},
        "mainEntityOfPage": {"@type": "WebPage", "@id": canonical},
        "image": image,
    }
    crumb = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "Home", "item": SITE + "/"},
            {"@type": "ListItem", "position": 2, "name": "Blog", "item": SITE + "/blog/"},
            {"@type": "ListItem", "position": 3, "name": post["title"]},
        ],
    }
    project_block = ""
    project_slug = POST_PROJECT.get(post["slug"])
    if project_slug and project_slug in PROJECT_BY_SLUG:
        project = PROJECT_BY_SLUG[project_slug]
        project_block = (
            f'            <p class="post-project-link">The build behind this note: '
            f'<a href="/projects/{project_slug}/">{esc(project["title"])} &rarr;</a></p>\n'
        )
    return f"""{head(f"{post['title']} — potaterrr", post["desc"], canonical, kind="article",
             image=image, extra=extra, jsonld=ld(body_ld) + ld(crumb))}
  <div class="post-progress" aria-hidden="true"><span class="post-progress-fill"></span></div>

{shell_open("blog")}

    <section class="post-shell">
      <div class="container">
        <article class="post">
          <a class="back-link" href="/blog/">&larr; All posts</a>
          <header class="post-header">
            <p class="post-kicker">$ cat notes/{post["date"]}.md</p>
            <h1 class="post-title">{post["title"]}</h1>
            <div class="post-meta">
              <time class="timeline-date" datetime="{post["date"]}">{post["display"]}</time>
              <span class="sep" aria-hidden="true">/</span>
              <span class="reading-time">{post["reading"]}</span>
              <span class="sep" aria-hidden="true">/</span>
              <span class="reading-time">{post["words"]:,} words</span>
              <span class="sep" aria-hidden="true">/</span>
              <span class="post-author-inline"><img src="/assets/pfp-192.jpg" alt="" width="22" height="22" loading="lazy" decoding="async" />Christian John</span>
            </div>
            <div class="post-tags">{tag_chips(post["tags"])}</div>
          </header>

          <details class="post-toc" open>
            <summary class="post-toc-title">On this page</summary>
            <ol></ol>
          </details>

          <div class="post-body">
{post["body"]}
          </div>

          <div class="post-foot">
{related_block}
{project_block}
            <div class="author-card">
              <img src="/assets/pfp-192.jpg" alt="" width="52" height="52" loading="lazy" decoding="async" />
              <p><strong>Christian John · potaterrr</strong>Automation developer building AI voice receptionists and n8n workflows, with Python and Make when a stack demands it. If a task is repetitive, I know a workflow for it. <a href="/work-with-me/">Work with me &rarr;</a></p>
            </div>
            <div class="post-cta">
              <p><strong>Have a process like this one eating your week?</strong> I map it, build the pipeline, and hand over the docs plus a way to see when it breaks.</p>
              <a class="btn btn-primary" href="https://cal.com/christian-john-vallejos-adws8d/60min" target="_blank" rel="noopener">Book a fit call</a>
            </div>
            <nav class="post-nav" aria-label="More posts">
              {prev_link}
              {next_link}
            </nav>
          </div>
        </article>
      </div>
    </section>
{FOOTER}
{shell_close()}

  <script src="/js/main.js" defer></script>
</body>
</html>
"""


def archive_page(posts) -> str:
    all_tags = sorted({t for p in posts for t in p["tags"]}, key=lambda t: TAG_LABELS.get(t, t).lower())
    chips = '<button type="button" class="tag-chip is-active" data-tag="all" aria-pressed="true">All<span class="tag-count">%d</span></button>' % len(posts)
    chips += "".join(
        f'<button type="button" class="tag-chip" data-tag="{t}" aria-pressed="false">{esc(TAG_LABELS.get(t, t))}<span class="tag-count">{sum(1 for p in posts if t in p["tags"])}</span></button>'
        for t in all_tags
    )

    years = {}
    for p in posts:
        years.setdefault(p["date"][:4], []).append(p)

    month_nav = []
    seen_months = set()
    groups = []
    for year in sorted(years, reverse=True):
        cards = []
        for p in years[year]:
            month = p["date"][:7]
            anchor = ""
            if month not in seen_months:
                seen_months.add(month)
                month_nav.append(month)
                anchor = f' id="bl-{month}"'
            cards.append(f"""          <a class="archive-card" href="/blog/{p["slug"]}.html" data-tags="{esc(" ".join(p["tags"]))}" data-search="{esc((p["title"] + " " + p["desc"]).lower())}">
            <div class="archive-meta"><time{anchor} datetime="{p["date"]}">{p["display"]}</time><span aria-hidden="true">·</span><span>{esc(p["reading"])}</span><span aria-hidden="true">·</span><span>{p["words"]:,} words</span></div>
            <h2>{esc(p["title"])}</h2>
            <p>{esc(p["desc"])}</p>
            <div class="archive-tags">{tag_chips(p["tags"], None)}</div>
            <span class="archive-more">Read the post &rarr;</span>
          </a>""")
        groups.append(f"""      <section class="archive-group" data-year="{year}">
        <h2 class="archive-year">{year}</h2>
        <div class="archive-grid">
{chr(10).join(cards)}
        </div>
      </section>""")

    nav_html = ""
    if month_nav:
        links = "".join(
            f'<a href="#bl-{m}" data-section="bl-{m}">{datetime.strptime(m, "%Y-%m").strftime("%b")}</a>'
            for m in month_nav
        )
        nav_html = f"""      <nav class="section-nav" aria-label="On this page">
        <div class="container section-nav-inner">
          {links}
        </div>
      </nav>"""

    jsonld = ld({
        "@context": "https://schema.org",
        "@type": "Blog",
        "name": "potaterrr — automation field notes",
        "url": f"{SITE}/blog/",
        "description": "Field notes from building automation: AI voice receptionists, AR invoice agents, lead retrieval pipelines, scrapers and the failures behind them.",
        "author": {"@type": "Person", "name": "Christian John", "url": SITE + "/"},
        "blogPost": [
            {"@type": "BlogPosting", "headline": p["title"], "url": f"{SITE}/blog/{p['slug']}.html", "datePublished": p["date"]}
            for p in posts
        ],
    })
    return f"""{head("Blog — automation field notes · potaterrr",
             "Field notes from building automation: AI voice receptionists, AR invoice agents, lead retrieval pipelines, scrapers — what broke and what it taught me.",
             f"{SITE}/blog/", active="blog", image=f"{SITE}/assets/og/blog/index.png", jsonld=jsonld)}
{shell_open("blog")}

    <section class="page-head">
      <div class="container">
        <p class="hero-kicker">$ ls ~/notes</p>
        <h1 class="page-title">Automation field notes</h1>
        <p class="page-lead">What actually broke while building the pipelines — the quota walls, the parsers that returned nothing, the loop that chased the same invoice twice. Written down so the next build is cheaper.</p>

        <div class="blog-tools">
          <label class="blog-search">
            <span class="visually-hidden">Search posts</span>
            <input type="search" id="blog-search" placeholder="Search posts…" autocomplete="off" />
          </label>
          <div class="blog-tag-filter" id="blog-tags" role="group" aria-label="Filter posts by tag">{chips}</div>
          <p class="blog-count" id="blog-count" aria-live="polite">{len(posts)} posts</p>
        </div>
      </div>
    </section>

{nav_html}

    <div class="container">
{chr(10).join(groups)}
      <p class="archive-empty" id="archive-empty" hidden>No posts match that filter. <button type="button" class="link-button" id="archive-clear">Clear filters</button></p>
    </div>

{page_nav("blog")}

{FOOTER}
{shell_close()}

  <script src="/js/section-nav.js" defer></script>
  <script src="/js/main.js" defer></script>
  <script src="/js/blog.js" defer></script>
</body>
</html>
"""


# ------------------------------------------------------------------ og cards

def og_card(path: Path, kicker: str, title: str, footer: str):
    W, H = 1200, 630
    img = Image.new("RGB", (W, H), "#0d1117")
    d = ImageDraw.Draw(img)
    # subtle top accent + frame
    d.rectangle([0, 0, W, 6], fill="#f0b429")
    d.rectangle([48, 48, W - 48, H - 48], outline="#232c3a", width=2)
    mono = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf", 26)
    mono_sm = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf", 22)
    bold = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 64)

    d.text((90, 92), kicker, font=mono, fill="#2ea886")

    # wrap title
    words = title.split()
    lines, line = [], ""
    for w in words:
        test = (line + " " + w).strip()
        if d.textlength(test, font=bold) > W - 180:
            lines.append(line)
            line = w
        else:
            line = test
    if line:
        lines.append(line)
    lines = lines[:3]
    y = 160
    for ln in lines:
        d.text((90, y), ln, font=bold, fill="#e6edf3")
        y += 82

    d.rectangle([90, H - 150, 90 + 72, H - 146], fill="#f0b429")
    # Keep the footer clear of the domain label on the right.
    available = (W - 320) - 90 - 24
    truncated = False
    while footer and d.textlength(footer, font=mono_sm) > available:
        footer = footer[:-1]
        truncated = True
    if truncated:
        footer = footer.rstrip() + "…"
    d.text((90, H - 118), footer, font=mono_sm, fill="#94a3b8")
    d.text((W - 320, H - 118), "potaterrr.github.io", font=mono_sm, fill="#94a3b8")
    path.parent.mkdir(parents=True, exist_ok=True)
    img.save(path, optimize=True)


# ------------------------------------------------------------------ feeds

def rfc822(date: str) -> str:
    return format_datetime(datetime.strptime(date, "%Y-%m-%d").replace(tzinfo=timezone.utc))


def write_feeds(posts):
    items = []
    for p in posts:
        link = f"{SITE}/blog/{p['slug']}.html"
        items.append(
            "    <item>\n"
            f"      <title>{esc(p['title'])}</title>\n"
            f"      <link>{link}</link>\n"
            f"      <guid isPermaLink=\"true\">{link}</guid>\n"
            f"      <pubDate>{rfc822(p['date'])}</pubDate>\n"
            f"      <author>kristiandyanbusiness@gmail.com (Christian John)</author>\n"
            f"      <description>{esc(p['desc'])}</description>\n"
            f"      <category>{esc(' / '.join(TAG_LABELS.get(t, t) for t in p['tags']))}</category>\n"
            "    </item>"
        )
    rss = f"""<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>potaterrr — automation field notes</title>
    <link>{SITE}/blog/</link>
    <atom:link href="{SITE}/feed.xml" rel="self" type="application/rss+xml" />
    <description>What broke while building AI voice receptionists, invoice agents, lead retrieval pipelines and scrapers — and the rules that came out of it.</description>
    <language>en</language>
    <lastBuildDate>{rfc822(posts[0]["date"] if posts else TODAY)}</lastBuildDate>
    <managingEditor>kristiandyanbusiness@gmail.com (Christian John)</managingEditor>
{chr(10).join(items)}
  </channel>
</rss>
"""
    (ROOT / "feed.xml").write_text(rss, encoding="utf-8")

    json_feed = {
        "version": "https://jsonfeed.org/version/1.1",
        "title": "potaterrr — automation field notes",
        "home_page_url": f"{SITE}/blog/",
        "feed_url": f"{SITE}/feed.json",
        "description": "What broke while building AI voice receptionists, invoice agents, lead retrieval pipelines and scrapers.",
        "language": "en",
        "authors": [{"name": "Christian John", "url": SITE + "/"}],
        "items": [
            {
                "id": f"{SITE}/blog/{p['slug']}.html",
                "url": f"{SITE}/blog/{p['slug']}.html",
                "title": p["title"],
                "summary": p["desc"],
                "date_published": datetime.strptime(p["date"], "%Y-%m-%d").replace(tzinfo=timezone.utc).isoformat(),
                "tags": [TAG_LABELS.get(t, t) for t in p["tags"]],
                "image": f"{SITE}/assets/og/blog/{p['slug']}.png",
            }
            for p in posts
        ],
    }
    (ROOT / "feed.json").write_text(json.dumps(json_feed, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def write_sitemap(posts):
    urls = [
        ("/", TODAY, "1.0"),
        ("/projects/", TODAY, "0.9"),
        ("/timeline/", TODAY, "0.8"),
        ("/skills/", TODAY, "0.7"),
        ("/work-with-me/", TODAY, "0.8"),
        ("/contact/", TODAY, "0.9"),
        ("/privacy/", TODAY, "0.3"),
        ("/blog/", TODAY, "0.9"),
    ]
    urls += [(f"/projects/{p['slug']}/", TODAY, "0.8") for p in PROJECTS]
    urls += [(f"/blog/{p['slug']}.html", p["date"], "0.7") for p in posts]
    chunks = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for loc, lastmod, priority in urls:
        chunks += ["  <url>", f"    <loc>{SITE}{loc}</loc>", f"    <lastmod>{lastmod}</lastmod>", f"    <priority>{priority}</priority>", "  </url>"]
    chunks.append("</urlset>")
    (ROOT / "sitemap.xml").write_text("\n".join(chunks) + "\n", encoding="utf-8")


def write_blog_index_json(posts):
    data = {
        "posts": [
            {
                "slug": p["slug"],
                "title": p["title"],
                "url": f"/blog/{p['slug']}.html",
                "description": p["desc"],
                "date": p["date"],
                "reading": p["reading"],
                "words": p["words"],
                "tags": p["tags"],
            }
            for p in posts
        ]
    }
    (BLOG / "index.json").write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def timeline_page() -> str:
    items = (ROOT / "partials" / "timeline.html").read_text(encoding="utf-8")
    count = items.count('<li class="timeline-item')

    month_nav = []
    seen_months = set()

    def anchor_month(match):
        block = match.group(0)
        date = re.search(r'datetime="(\d{4})-(\d{2})', block)
        if not date:
            return block
        month = f"{date.group(1)}-{date.group(2)}"
        if month in seen_months:
            return block
        seen_months.add(month)
        month_nav.append(month)
        return block.replace("<time ", f'<time id="tl-{month}" ', 1)

    items = re.sub(r'<li class="timeline-item.*?</li>', anchor_month, items, flags=re.S)

    nav_html = ""
    if month_nav:
        links = "".join(
            f'<a href="#tl-{m}" data-section="tl-{m}">{datetime.strptime(m, "%Y-%m").strftime("%b")}</a>'
            for m in month_nav
        )
        nav_html = f"""    <nav class="section-nav" aria-label="On this page">
      <div class="container section-nav-inner">
        {links}
      </div>
    </nav>

"""

    canonical = f"{SITE}/timeline/"
    jsonld = ld({
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        "name": "Timeline — potaterrr",
        "url": canonical,
        "description": "Everything shipped, newest first: automation projects, releases and the notes behind them.",
        "author": {"@type": "Person", "name": "Christian John", "url": SITE + "/"},
    })
    return f"""{head("Timeline — builds and releases · potaterrr",
             "Everything shipped, newest first: voice receptionists, invoice agents, lead retrieval, scrapers, games and the notes behind them.",
             canonical, active="timeline", image=f"{SITE}/assets/og/timeline.png", jsonld=jsonld)}
{shell_open("timeline")}

    <section class="page-head">
      <div class="container">
        <p class="hero-kicker">$ git log --oneline</p>
        <h1 class="page-title">Timeline</h1>
        <p class="page-lead">Everything that shipped, newest first. {count} entries — projects, releases and the notes written after them.</p>
      </div>
    </section>

{nav_html}    <section class="section timeline-page">
      <div class="container">
{items}
      </div>
    </section>

{page_nav("timeline")}

{FOOTER}
{shell_close()}

  <script src="/js/section-nav.js" defer></script>
  <script src="/js/main.js" defer></script>
</body>
</html>
"""


def main():
    posts = load_posts()

    # blog posts
    for p in posts:
        p["file"].write_text(post_page(p, posts), encoding="utf-8")
    (BLOG / "index.html").write_text(archive_page(posts), encoding="utf-8")
    write_blog_index_json(posts)
    write_feeds(posts)
    write_sitemap(posts)

    # projects
    PROJECTS_DIR.mkdir(exist_ok=True)
    (PROJECTS_DIR / "index.html").write_text(project_index(), encoding="utf-8")
    for p in PROJECTS:
        out = PROJECTS_DIR / p["slug"]
        out.mkdir(parents=True, exist_ok=True)
        (out / "index.html").write_text(project_page(p), encoding="utf-8")

    # standalone section pages
    for key, builder in (("skills", skills_page), ("work-with-me", work_page), ("contact", contact_page), ("privacy", privacy_page)):
        out = ROOT / key
        out.mkdir(exist_ok=True)
        (out / "index.html").write_text(builder(), encoding="utf-8")

    # timeline
    tl = ROOT / "timeline"
    tl.mkdir(exist_ok=True)
    (tl / "index.html").write_text(timeline_page(), encoding="utf-8")

    # og cards
    og = ROOT / "assets" / "og"
    for p in PROJECTS:
        cat = CATEGORIES[p["category"]]
        kicker = cat["kicker"] + (f"  ·  {version(p)}" if p.get("version") else "")
        footer = f"{cat['title']}  ·  {p.get('status', '')}".rstrip(" ·")
        og_card(og / "projects" / f"{p['slug']}.png", kicker, p["title"], footer)
    og_card(og / "projects" / "index.png", "$ ls ~/projects", "Projects", f"{len(PROJECTS)} builds: startup, voice, LLM, data, ops, games")
    for p in posts:
        og_card(og / "blog" / f"{p['slug']}.png", f"$ cat notes/{p['date']}.md", p["title"], f"{p['display']}  ·  {p['reading']}")
    og_card(og / "blog" / "index.png", "$ ls ~/notes", "Automation field notes", f"{len(posts)} posts  ·  what broke and what it taught me")
    og_card(og / "timeline.png", "$ git log --oneline", "Timeline", "Everything shipped, newest first")
    og_card(og / "skills.png", "$ ls ~/skills", "Skills", "Python, n8n, Make.com, webhooks, LLM pipelines")
    og_card(og / "work-with-me.png", "$ cat packages.md", "Work with me", "Automation Sprint · Voice Receptionist · HIPAA Build")
    og_card(og / "contact.png", "$ ping potaterrr", "Contact", "Book a fit call or send a message")
    og_card(og / "privacy.png", "$ cat privacy.md", "Privacy", "Analytics, email and data removal — the short version")
    og_card(ROOT / "assets" / "og-image.png", "$ whoami", "Missed calls answered. Appointments booked. Boring work automated.", "AI receptionists · n8n workflows · Python")

    print(f"built {len(PROJECTS)} project pages, {len(posts)} posts, archive, feeds, sitemap")


if __name__ == "__main__":
    main()
