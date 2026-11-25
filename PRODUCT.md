# Product

<!-- impeccable:product-schema 1 -->

> Facts below were read from the repository (README, `src/data/projects.ts`, `src/data/skills.ts`, page copy, deploy config). Items marked **(inferred)** were not confirmed by the owner in an interview — the interview probe failed in this session, so confirm or correct them before treating them as binding.

## Platform

web

## Users

**(inferred)** Owners and operations leads at small businesses (roughly 5–100 staff) whose revenue-critical work runs on manual handoffs between tools: unanswered calls, unqualified lead lists, dormant CRM records, unpaid invoices. They are evaluating whether to hire an automation builder, usually while still doing that work by hand.

Secondary audience: AI builders and developers who buy or read the published agent skills on Agensi (n8n Workflow Engineer, Lead Reactivation, AR Collections, Client Proposal, Contract Review).

## Product Purpose

The site is a portfolio and client-acquisition surface for a solo n8n automation architect. Success is a booked 15-minute discovery call from someone who recognises their own bottleneck in the copy — not a browse, not a newsletter signup. It also acts as the public catalogue of shipped builds and published skills.

## Positioning

Systems, not one-off scripts: the work is multi-workflow architecture designed for the seams where two tools disagree — validation, retries, sub-workflows, and a named owner for every record. The pitch is organised around one revenue loop in four stages — **catch** (omnichannel receptionist), **enrich** (lead research and scoring), **revive** (dormant leads), **remind** (overdue invoices) — so the offer reads as one system rather than a menu of Zaps.

Supporting differentiators: nine years in high-volume BPO operations (where the manual work hides), human-in-the-loop by design for anything sensitive (drafts filed for a human to send), and the client keeps ownership of every account and credential.

## Operating Context

- Entry point is a 15-minute Cal.com discovery call; the contact section renders a custom two-week calendar and deep-links into the Cal.com event.
- Direct contact is email and WhatsApp; response promise is one business day.
- Every featured build has its own page on this site with an overview video, and most have a playable in-browser demo or a linked public repo.
- Buyer-side proof is the shipped build itself: the demos run in the page.
- Scope and price are agreed before a build starts; the audit says so when automation is not worth it.
- **(inferred)** The architect works alone and sells architecture, build, and handover as one engagement.

## Capabilities and Constraints

- Static Astro site (Astro 7, Tailwind CSS 4 via Vite plugin, `@fontsource-variable` Bricolage Grotesque + Inter), deployed to GitHub Pages by GitHub Actions on push to `main`.
- All editable content lives in `src/data/projects.ts` (site config, featured repos, side projects) and `src/data/skills.ts` (agent skills); design tokens live in the `:root` and `[data-theme='light']` blocks of `src/styles/global.css`.
- The site ships dark by default with a complete light theme available by adding `data-theme="light"` to `<html>`.
- Embedded artifacts live as static HTML under `public/` (games, agent console, demo pipelines) and are linked or iframed rather than bundled into the Astro build.
- SEO is already wired: sitemap, robots.txt, canonical URLs, OG/Twitter cards, `og.png`, and JSON-LD (`ProfessionalService` on home, `CreativeWork` + breadcrumbs on build pages).
- No pricing, no testimonials, no client names, no measured outcomes are published. Future work must not invent them.
- Videos are pre-rendered mp4/jpg pairs under `public/videos/`; there is no runtime video pipeline.

## Brand Commitments

- Name: **inodepi**, read as "I · node · Pi"; wordmark is `inode` plus the π glyph.
- Mark: a π drawn as a node graph — two legs ending in nodes, one filled and one outlined (`public/logo.svg`, `public/favicon.svg`, `BrandMark.astro`, `PiGlyph.astro`).
- Voice: blunt, concrete, anti-hype. Short declaratives that name the pain and refuse theatre — "No discovery theatre", "No pitch deck. Bring the process that hurts", "If it isn't, I will say so".
- Colour semantics: four workflow-node hues (teal, violet, rose, amber) carry meaning across cards, pipeline stages, and build pages; amber is the primary action accent.

## Evidence on Hand

- Six automation builds with pages: Omnichannel AI Receptionist, AI Lead Enrichment, Dead Lead Retrieval, AR Invoice Reminder, HR Onboarding, Sales Call QA (built, currently unfeatured), plus an AI Voice Receptionist page.
- Three side projects with playable builds: HappyFone WebUI (`public/happyfone-webui/app/`), AdBlock Island (`public/adblock-island/game/`), Tippy Card Monte (`public/tippy-card-monte/game/`).
- Five published agent skills with Agensi listings and public source repos (`src/data/skills.ts`).
- Per-build overview videos and posters under `public/videos/`, plus changelogs in `src/data/changelogs/`.
- Absent, and not to be fabricated: client logos, named case studies, testimonials, quantified results, pricing.

## Product Principles

1. **Sell the closed loop, not the tool.** Every claim routes back to one of the four revenue stages, and every stage links to a build that proves it.
2. **Show the running thing.** A build page carries a playable demo or a video of the real system; description alone does not count as proof.
3. **A human decides anything sensitive.** Drafts, approvals, and ownership stay with the client; the site says so plainly rather than hiding the limit.
4. **Name the pain before the solution.** Headlines are written from the operator's week, not from the stack.
5. **Refuse theatre.** No pitch-deck language, no inflated metrics, no discovery ritual that produces nothing readable.

## Accessibility & Inclusion

**(inferred)** No formal conformance target was recorded. The site targets WCAG 2.1 AA in practice: semantic landmarks, skip link, keyboard-reachable calendar and rotator controls, `aria-label` on icon buttons, and reduced-motion handling. Confirm the target before any accessibility audit is treated as pass/fail.
