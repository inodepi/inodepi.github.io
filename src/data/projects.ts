/**
 * Single source of truth for the site's editable content.
 *
 * Repos and side projects are real builds. Toggle `featured` to control
 * what appears; the layout adapts to the number of featured entries.
 */

export type NodeHue = 'teal' | 'violet' | 'rose' | 'amber' | 'blue';

export interface AutomationRepo {
  id: string;
  /** Repo / system name */
  title: string;
  /** One line naming the operational pain this system removes */
  problem: string;
  /** Tools and services the workflow touches */
  stack: string[];
  /** Two or three sentences on what the system does and how it is wired */
  summary: string;
  /** Link to the repo (or live build, when a repo is not public) */
  repoUrl: string;
  /** Override the card's link label */
  linkLabel?: string;
  /** Set to false to hide from the featured section */
  featured: boolean;
  /** Chip colour used on the card's node header */
  hue: NodeHue;
}

export interface SideProject {
  id: string;
  title: string;
  summary: string;
  stack: string[];
  /** Source repository, when public */
  repoUrl?: string;
  /** Live demo or playable build */
  demoUrl?: string;
  /** Project page on this site */
  buildUrl?: string;
  /** `large` renders as the feature card above the grid */
  size?: 'large' | 'small';
  featured: boolean;
  hue: NodeHue;
}

export interface SiteConfig {
  name: string;
  role: string;
  email: string;
  whatsappUrl: string;
  /** Public n8n webhook for the Pip RAG. Empty string keeps the FAQ-only fallback. */
  ragWebhookUrl: string;
  calendarUrl: string;
  calendarEventTypeId: number;
  calendarTimeZone: string;
  githubUrl: string;
  responseTime: string;
}

export const siteConfig: SiteConfig = {
  name: 'inodepi',
  role: 'n8n automation architect',
  email: 'kristiandyanbusiness@gmail.com',
  whatsappUrl: 'https://wa.me/639386042425',
  ragWebhookUrl: import.meta.env.PUBLIC_RAG_WEBHOOK ?? '',
  calendarUrl: 'https://cal.com/christian-john-vallejos-adws8d/discovery',
  calendarEventTypeId: 7623308,
  calendarTimeZone: 'Asia/Manila',
  githubUrl: 'https://github.com/inodepi',
  responseTime: 'Replies within one business day',
};

export const automationRepos: AutomationRepo[] = [
  {
    id: 'omnichannel-receptionist',
    title: 'Omnichannel AI Receptionist',
    problem: 'Missed calls and chats walk to the next contractor — 2–4 jobs/month and 5–8 hrs of call-backs.',
    stack: ['n8n', 'Telegram', 'WhatsApp', 'Email', 'Calendar'],
    summary:
      'One n8n receptionist answers voice, SMS and chat, books real calendar slots and logs every thread. Flat setup fee; your accounts.',
    repoUrl: '/omnichannel-receptionist/',
    linkLabel: 'View the build',
    featured: true,
    hue: 'teal',
  },
  {
    id: 'ai-lead-enrichment',
    title: 'AI Lead Enrichment',
    problem: 'Blind lists burn 3+ hrs/week, and half the dials are poor fit.',
    stack: ['n8n', 'Notion', 'Gemini', 'Gmail'],
    summary:
      'n8n researches each lead, scores fit 1–10 and drafts a specific first email before you call. Flat setup fee; no per-seat tool.',
    repoUrl: '/lead-enrichment/',
    linkLabel: 'View the build',
    featured: true,
    hue: 'blue',
  },
  {
    id: 'dead-lead-retrieval',
    title: 'Dead Lead Retrieval',
    problem: 'Dormant leads die in the CRM — $600–$1,800/month left untouched.',
    stack: ['n8n', 'OpenRouter', 'CRM'],
    summary:
      'n8n reopens quiet leads with context-aware Gmail drafts you approve and send. Your CRM, flat setup fee.',
    repoUrl: '/dead-lead-retrieval/',
    linkLabel: 'View the build',
    featured: true,
    hue: 'rose',
  },
  {
    id: 'ar-invoice-reminder-agent',
    title: 'AR Invoice Reminder',
    problem: 'Late invoices sit unchased — $3K+ tied up and 2 hrs/week of admin.',
    stack: ['n8n', 'Gemini', 'Google Sheets'],
    summary:
      'A daily n8n run computes days overdue and files tone-matched reminders as Gmail drafts. Flat setup fee; you press send.',
    repoUrl: '/ar-invoice-reminder/',
    linkLabel: 'View the build',
    featured: true,
    hue: 'amber',
  },
];

export const sideProjects: SideProject[] = [
  {
    id: 'happyfone-webui',
    title: 'HappyFone WebUI',
    summary:
      'A production, dependency-free agent console for Telnyx WebRTC outbound calling — sign in, place real calls and manage the full call lifecycle from the browser.',
    stack: ['Telnyx WebRTC', 'Vanilla JS', 'Agent console'],
    demoUrl: '/happyfone-webui/app/',
    repoUrl: 'https://github.com/inodepi/happyfone-webui',
    buildUrl: '/happyfone-webui/',
    linkLabel: 'View the build',
    size: 'large',
    featured: true,
    hue: 'teal',
  },
  {
    id: 'adblock-island',
    title: 'AdBlock Island',
    summary:
      'Pick one of nine classes, sweep the static and survive the Algorithm — room-code co-op on a token-guarded Vercel room desk.',
    stack: ['Browser game', 'Co-op'],
    demoUrl: '/adblock-island/game/',
    repoUrl: 'https://github.com/inodepi/adblock-island',
    buildUrl: '/adblock-island/',
    linkLabel: 'View the build',
    featured: true,
    hue: 'amber',
  },
  {
    id: 'tippy-card-monte',
    title: 'Tippy Card Monte',
    summary:
      'Follow the shuffle. Six modes, 15 medals and one very smug coin — a pixel-art card monte in a single page, no build and no backend.',
    stack: ['Canvas', 'Vanilla JS'],
    demoUrl: '/tippy-card-monte/game/',
    buildUrl: '/tippy-card-monte/',
    linkLabel: 'View the build',
    featured: true,
    hue: 'violet',
  },
];

/** Featured automation repos. */
export const featuredAutomationRepos = automationRepos.filter((repo) => repo.featured);

/** Featured side projects; one may be marked `size: 'large'`. */
export const featuredSideProjects = sideProjects.filter((project) => project.featured);
