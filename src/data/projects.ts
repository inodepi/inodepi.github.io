/**
 * Single source of truth for the site's editable content.
 *
 * Repos and side projects are real builds. Toggle `featured` to control
 * what appears; the layout adapts to the number of featured entries.
 */

export type NodeHue = 'teal' | 'violet' | 'rose' | 'amber';

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
  /** `large` renders as the feature card above the grid */
  size?: 'large' | 'small';
  featured: boolean;
  hue: NodeHue;
}

export interface SiteConfig {
  name: string;
  role: string;
  email: string;
  calendarUrl: string;
  githubUrl: string;
  linkedinUrl: string;
  responseTime: string;
}

export const siteConfig: SiteConfig = {
  name: 'inodepi',
  role: 'n8n automation architect',
  email: 'kristiandyanbusiness@gmail.com',
  calendarUrl: 'https://cal.com/christian-john-vallejos-adws8d/discovery',
  githubUrl: 'https://github.com/inodepi',
  linkedinUrl: '#',
  responseTime: 'Replies within one business day',
};

export const automationRepos: AutomationRepo[] = [
  {
    id: 'voice-receptionist',
    title: 'AI Voice Receptionist',
    problem: 'Missed calls cost appointment-based businesses real revenue.',
    stack: ['n8n', 'Retell'],
    summary:
      'Answers missed and after-hours calls, captures structured intake, books appointments and logs every call — built on n8n over a shared Retell voice layer. HIPAA-compliant build available.',
    repoUrl: '/voice-receptionist/',
    linkLabel: 'View the build',
    featured: true,
    hue: 'teal',
  },
  {
    id: 'ar-invoice-reminder-agent',
    title: 'AR Invoice Reminder',
    problem: 'Overdue invoices slip when chasing them is manual.',
    stack: ['n8n', 'Gemini', 'Google Sheets'],
    summary:
      'Reads the invoice tracker, computes days past due and files a tone-matched reminder as a Gmail draft — a human still presses send.',
    repoUrl: 'https://github.com/inodepi/ar-invoice-reminder-agent',
    featured: true,
    hue: 'amber',
  },
  {
    id: 'dead-lead-retrieval',
    title: 'Dead Lead Retrieval',
    problem: 'Stale leads die quietly in the CRM.',
    stack: ['n8n', 'OpenRouter', 'CRM'],
    summary:
      'Drafts personalised check-ins for dormant leads, files them as Gmail drafts and tracks every lead — human-in-the-loop by design.',
    repoUrl: 'https://github.com/inodepi/dead-lead-retrieval',
    featured: true,
    hue: 'rose',
  },
  {
    id: 'sales-call-qa',
    title: 'Sales Call QA & Coaching',
    problem: 'Sales calls go unreviewed and coaching stays manual.',
    stack: ['n8n', 'Gemini', 'Retell'],
    summary:
      'Scores every sales call with Gemini, verifies quotes against the transcript and sends a weekly coaching digest to the team.',
    repoUrl:
      'https://inodepi.github.io/potaterrr.github.io/projects/sales-call-qa/demo/',
    linkLabel: 'View the build',
    featured: true,
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
    demoUrl: 'https://inodepi.github.io/happyfone-webui/',
    repoUrl: 'https://github.com/inodepi/happyfone-webui',
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
    demoUrl: 'https://inodepi.github.io/adblock-island/',
    repoUrl: 'https://github.com/inodepi/adblock-island',
    featured: true,
    hue: 'amber',
  },
  {
    id: 'tippy-card-monte',
    title: 'Tippy Card Monte',
    summary:
      'Follow the shuffle. Six modes, 15 medals and one very smug coin — a pixel-art card monte in a single page, no build and no backend.',
    stack: ['Canvas', 'Vanilla JS'],
    demoUrl:
      'https://inodepi.github.io/potaterrr.github.io/projects/tippy-card-monte/',
    featured: true,
    hue: 'violet',
  },
];

/** Featured automation repos. */
export const featuredAutomationRepos = automationRepos.filter((repo) => repo.featured);

/** Featured side projects; one may be marked `size: 'large'`. */
export const featuredSideProjects = sideProjects.filter((project) => project.featured);
