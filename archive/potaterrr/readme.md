# Hi, I'm **Christian John** — but everybody calls me **inodepi** 🥔

**Missed calls answered. Appointments booked. Boring work automated.** 🥔

I'm Christian John — aka inodepi. I build the automation behind that: AI voice receptionists for clinics, workflow integrations, AI agents, scrapers and ops pipelines — built on **n8n by default**, with Make, Zapier or Python when your stack demands it.

Nine years in high-volume BPO operations taught me where manual work hides. If it's repetitive, I'll automate it.

<p align="left">
  <img src="https://img.shields.io/badge/4_automations-running_in_production-2ea886?style=for-the-badge" alt="4 automations running in production" />
  <img src="https://img.shields.io/badge/default_stack-n8n_·_Make_·_Zapier_·_Python-EA4B71?style=for-the-badge&logo=n8n&logoColor=white" alt="Default stack: n8n, Make, Zapier, Python" />
  <img src="https://img.shields.io/badge/experience-9_yrs_high--volume_ops-6D00CC?style=for-the-badge" alt="9 years in high-volume operations" />
</p>

> **Want to know if one of these fits your business?**
> [Book a fit call →](https://cal.com/christian-john-vallejos-adws8d/60min) · [Email me →](mailto:kristiandyanbusiness@gmail.com)

🌐 Films and write-ups for every build: [inodepi.github.io](https://inodepi.github.io)

## 🧰 What I build

Four automations running in production. Each one has a film on the site that walks through the problem, the build and the branches — hit **▶ film** to watch, or open the repo. Human approval where it matters.

| Build | What it does | Open |
|---|---|---|
| **📞 AI Voice Receptionist** | Answers missed and after-hours calls for appointment-based businesses — salons, clinics, med spas, trades — captures intake, books appointments and logs every call. Built three times over one shared Retell voice layer. **🔒 HIPAA-compliant build available.** | [▶ film](https://inodepi.github.io/projects/ai-voice-receptionist/) · [repo](https://github.com/inodepi/voice-receptionist) |
| **🧾 AR Invoice Reminder** | Reads the invoice tracker, computes days past due, and files a tone-matched reminder as a **Gmail draft** — a human still presses send. | [▶ film](https://inodepi.github.io/projects/ar-invoice-reminder/) · [repo](https://github.com/inodepi/ar-invoice-reminder-agent) |
| **💤 Dead Lead Retrieval** | Drafts personalized check-ins for stale leads, files them as Gmail drafts, and tracks every lead in your CRM — with a human always in the loop. | [▶ film](https://inodepi.github.io/projects/dead-lead-retrieval/) · [repo](https://github.com/inodepi/dead-lead-retrieval) |
| **📊 Sales Call QA & Coaching** | Scores every sales call with Gemini, verifies quotes against the transcript, and sends a weekly coaching digest to the team. | [▶ film & docs](https://inodepi.github.io/projects/sales-call-qa/) |

## 🚀 How it works

Three steps from "we do this by hand" to "it runs itself."

1. **Fit call** — a 60-minute call. We map the process, count the hours it eats, and decide together whether automation is worth it. If it isn't, I say so.
2. **Build the sprint** — fixed scope, 2–3 weeks. You see a working automation in your own stack early, not a proposal deck. Weekly check-ins, no surprises.
3. **Handoff** — documentation, a walkthrough, and a live automation running without me. Need ongoing tuning? The partner retainer covers it.

Engagement options (Automation Sprint · Workflows · Automation Partner) are on the site: [work-with-me](https://inodepi.github.io/work-with-me/). No prices are published anywhere — scope and quote follow the fit call. You own the automation and your data: everything is built in your accounts and stays exportable.

## 📬 Contact

*   **📅 Book a fit call:** [cal.com/christian-john-vallejos-adws8d](https://cal.com/christian-john-vallejos-adws8d/60min)
*   **📘 Facebook:** [Potaterrr](https://www.facebook.com/profile.php?id=61593886946042)
*   **📧 Email:** [kristiandyanbusiness@gmail.com](mailto:kristiandyanbusiness@gmail.com)
*   **💬 Discord:** `inodepi`

<p align="left">
  <a href="https://cal.com/christian-john-vallejos-adws8d/60min">
    <img src="https://img.shields.io/badge/Book_a_fit_call-60_min-6D00CC?style=for-the-badge&logo=googlecalendar&logoColor=white" alt="Book a fit call" />
  </a>
  <a href="https://www.facebook.com/profile.php?id=61593886946042">
    <img src="https://img.shields.io/badge/Facebook-Potaterrr-1877F2?style=for-the-badge&logo=facebook&logoColor=white" alt="Facebook" />
  </a>
  <a href="mailto:kristiandyanbusiness@gmail.com">
    <img src="https://img.shields.io/badge/Email-Say_Hi-EA4335?style=for-the-badge&logo=gmail&logoColor=white" alt="Email" />
  </a>
</p>

Open to new builds, automation strategy, or a retainer for what I hand over. If the boring stuff is eating your week, I know a workflow for that. 🥔

<details>
<summary>🛠️ Dev stuff — other projects, how I work, dotfiles, GitHub stats</summary>

## 🚀 Other Projects

### [job-scrapper](https://github.com/inodepi/job-scrapper)
A Python scraper that searches [OnlineJobs.ph](https://www.onlinejobs.ph) for remote jobs matching automation keywords (`n8n`, `make.com`, `zapier`) and pushes each listing as JSON to a Make.com webhook for downstream automation.

- Extracts title, salary, employment type, and **full job description** per listing
- Keyword dedupe + polite, human-like request delays
- Fallback notifications so downstream automations never stall

### [signal-checker](https://github.com/inodepi/signal-checker)
An automated trading-signal pipeline that evaluates an **SMA crossover strategy** on daily stock prices and dispatches `BUY` / `SELL` / `HOLD` signals as JSON to a Make.com webhook.

- ~400 days of historical closes via **yfinance** (50/200-day defaults)
- Fully configurable through environment variables (symbol, SMA windows, webhook URL)
- Runs automatically on GitHub Actions every weekday at 21:00 UTC

### [ai-folklore](https://github.com/inodepi/ai-folklore) (theory)
The research stage of a folklore-story video pipeline: **research → AI script → (Veo video) → publish**. A zero-dependency Python scraper pulls folklore stories (Philippine mythology front-loaded) from Wikipedia and feeds them to Make.com or n8n — Gemini writes the script, a Gmail draft waits for review.

- **Zero pip dependencies** — stdlib `urllib` + `json`, Python 3.9+ is all it needs
- Built-in dedupe remembers delivered titles, so each run pushes only new stories
- Ships with importable Make.com and n8n blueprints plus a full testing report

### [rss-news](https://github.com/inodepi/rss-news) (personal automation)
An automated news curation pipeline for the **AI Tech & Automation Hub** Facebook page: a Python script fetches tech & AI RSS feeds (Hacker News, Phoronix, The Verge…), filters by keyword, and POSTs a digest to a Make.com webhook that drafts the post with Gemini, generates a graphic with Imagen, and publishes to Facebook Pages.

- **GitHub Actions** cron runs it every Sunday at 6:00 AM PHT
- Keyword filtering + `seen_articles.json` dedupe so nothing posts twice
- A random banner image from the repo rides along with every digest
- Runs on the **Make.com free tier** — a weekly digest uses ~5 ops of the 1,000/month budget

### [make-commits](https://github.com/inodepi/make-commits)
A Make.com automation that posts every GitHub push to a Facebook Page as a digest — instantly, via webhooks. Built and running entirely on the Make.com free tier.

- Instant pipeline: `git push` → Facebook post lands seconds later (webhooks, no polling)
- One post per push listing every commit message as a bullet (~2 ops per push)
- Ships with a sanitized scenario blueprint + step-by-step setup guide

## 🧠 How I Work

I believe understanding *how* systems communicate beats memorizing platform features. Every workflow I design is:

1. **Resilient** — error handling and fallback alerts built in
2. **Scalable** — clean logic, modular design
3. **Optimized** — minimized API calls and data redundancy

When things break, I reach for Postman, developer consoles, and logs to find the bottleneck fast. (The logs are always lying. Check them anyway.)

## 🥔 Dotfiles

System/Hardware:  
💻  20RA004VPH (ThinkPad E14)  
🧠  Intel(R) Core(TM) i7-10510U (8) @ 4.90 GHz  
🎮  AMD Radeon 550X Series [Discrete]  
🐧  Debian GNU/Linux 13 (trixie) x86_64  
⚙️  Linux 6.12.101+deb13-amd64

Install ([dotfiles](https://github.com/inodepi/dotfiles)):

[![Animated terminal: curl -fsSL https://inodepi.github.io/install | sh](assets/install-terminal.svg)](https://inodepi.github.io/install)

## 📊 GitHub Stats

<p align="left">
  <img src="https://github-stats-extended.vercel.app/api?username=inodepi&theme=radical" alt="GitHub stats" height="165" />
  <img src="https://github-stats-extended.vercel.app/api/top-langs/?username=inodepi&layout=compact&theme=radical&hide_border=true" alt="Top languages" height="165" />
</p>

🔎 Searching *potater* lands here too — same potato, fewer letters.

</details>

---
<p align="center"><i>"Mashing the boring stuff so you don't have to."</i></p>
