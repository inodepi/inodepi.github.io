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
  /** Optional pricing or scope note shown under the summary */
  note?: string;
  /** Optional link for a word inside the note */
  noteLink?: { text: string; href: string };
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
    id: 'lead-intake',
    title: 'Lead Intake',
    problem: 'A form that only collects goes cold — the visitor waits and books with whoever replies first.',
    stack: ['n8n', 'Google Sheets', 'Discord', 'Gmail'],
    summary:
      'One submit writes the row, posts a Discord alert and emails the lead a confirmation, with contact windows in their own timezone. Live on this site.',
    note: 'Single channel and omnichannel (voice + SMS + chat) are both possible. They are priced separately because they are different builds.',
    noteLink: { text: 'omnichannel', href: '/omnichannel-receptionist/' },
    repoUrl: '/lead-intake/',
    linkLabel: 'View the build',
    featured: true,
    hue: 'violet',
  },
  {
    id: 'omnichannel-receptionist',
    title: 'Omnichannel AI Receptionist',
    problem: 'Missed calls and chats walk to the next contractor — 2–4 jobs/month and 5–8 hrs of call-backs.',
    stack: ['n8n', 'Telegram', 'WhatsApp', 'Email', 'Calendar'],
    summary:
      'One n8n receptionist answers voice, SMS and chat, books real calendar slots and logs every thread. Flat setup fee; your accounts.',
    repoUrl: '/omnichannel-receptionist/',
    linkLabel: 'View the build',
    featured: false,
    hue: 'teal',
  },
  {
    id: 'ai-lead-enrichment',
    title: 'AI Lead Enrichment',
    problem: 'Blind blasts burn the domain — 18% bounce, one follow-up, no send window.',
    stack: ['n8n', 'Google Sheets', 'Jina', 'AI model', 'Gmail'],
    summary:
      'Three n8n workflows enrich each lead from its own site, send 15 researched emails a day at 09:30 local, and follow up three times until someone replies. Your accounts, flat setup fee.',
    repoUrl: '/lead-enrichment/',
    linkLabel: 'View the build',
    featured: true,
    hue: 'blue',
  },
  {
    id: 'dead-lead-retrieval',
    title: 'Dead Lead Retrieval',
    problem: 'Dormant leads die in the sheet — $600–$1,800/month left untouched.',
    stack: ['n8n', 'Google Sheets', 'OpenAI', 'Gmail', 'Discord'],
    summary:
      'A daily n8n run sends context-aware check-ins to dormant leads, flips the row to Sent and pings Discord with “{name} is haunting you”. A reply marks the row Replied. Your accounts, flat setup fee.',
    repoUrl: '/dead-lead-retrieval/',
    linkLabel: 'View the build',
    featured: true,
    hue: 'rose',
  },
  {
    id: 'ar-invoice-reminder-agent',
    title: 'AR Invoice Reminder',
    problem: 'Late invoices sit unchased — $3K+ tied up and 2 hrs/week of admin.',
    stack: ['n8n', 'OpenAI', 'Google Sheets', 'Gmail', 'Discord'],
    summary:
      'A daily n8n run computes days overdue, sends a tone-matched reminder signed from your inbox, writes the follow-up back to the row and pings Discord with the client, invoice and amount. Your accounts, flat setup fee.',
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
