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
    problem: 'Customers ask on every channel; only some get answered.',
    stack: ['n8n', 'Telegram', 'WhatsApp', 'Email', 'Calendar'],
    summary:
      'One receptionist brain across voice, chat and email — any model, any channel. Remembers each customer, books real slots, logs every conversation and alerts the team.',
    repoUrl: '/omnichannel-receptionist/',
    linkLabel: 'View the build',
    featured: true,
    hue: 'teal',
  },
  {
    id: 'ai-lead-enrichment',
    title: 'AI Lead Enrichment',
    problem: 'Cold lists get called without knowing why they would buy.',
    stack: ['n8n', 'Notion', 'Gemini', 'Gmail'],
    summary:
      'Polls a Notion lead database, has a Gemini agent research each business and flag likely site issues, scores fit 1–10, writes the research and a draft back to the row, and files the email as a Gmail draft.',
    repoUrl: '/lead-enrichment/',
    linkLabel: 'View the build',
    featured: true,
    hue: 'blue',
  },
  {
    id: 'dead-lead-retrieval',
    title: 'Dead Lead Retrieval',
    problem: 'Stale leads die quietly in the CRM.',
    stack: ['n8n', 'OpenRouter', 'CRM'],
    summary:
      'Drafts personalised check-ins for dormant leads, files them as Gmail drafts and tracks every lead — human-in-the-loop by design.',
    repoUrl: '/dead-lead-retrieval/',
    linkLabel: 'View the build',
    featured: true,
    hue: 'rose',
  },
  {
    id: 'ar-invoice-reminder-agent',
    title: 'AR Invoice Reminder',
    problem: 'Overdue invoices slip when chasing them is manual.',
    stack: ['n8n', 'Gemini', 'Google Sheets'],
    summary:
      'Reads the invoice tracker, computes days past due and files a tone-matched reminder as a Gmail draft — a human still presses send.',
    repoUrl: '/ar-invoice-reminder/',
    linkLabel: 'View the build',
    featured: true,
    hue: 'amber',
  },
  {
    id: 'hr-onboarding',
    title: 'HR Onboarding Workflow',
    problem: 'New hires wait while paperwork, tools and compliance get chased by hand.',
    stack: ['n8n', 'Notion', 'Gmail'],
    summary:
      'One config driven workflow for every market: add a hire to Notion and the welcome email, paperwork list, team brief and status update all move within a minute.',
    repoUrl: '/hr-onboarding/',
    linkLabel: 'View the build',
    featured: false,
    hue: 'violet',
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
