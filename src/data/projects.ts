/**
 * Single source of truth for the site's editable content.
 *
 * Every repo below is a generic placeholder. Replace the fields with real
 * projects and toggle `featured` to decide what appears on the page —
 * no component edits required.
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
  /** GitHub URL — placeholder until a real repo is chosen */
  repoUrl: string;
  /** Set to false to hide from the featured section */
  featured: boolean;
  /** Chip colour used on the card's node header */
  hue: NodeHue;
}

export interface SideProject {
  id: string;
  title: string;
  /** What the project is and who it is for */
  summary: string;
  stack: string[];
  repoUrl: string;
  featured: boolean;
  hue: NodeHue;
}

export interface SiteConfig {
  name: string;
  role: string;
  email: string;
  calendarUrl: string;
  /** Point this at your form backend (Formspree, Netlify Forms, etc.) */
  formAction: string;
  githubUrl: string;
  linkedinUrl: string;
  responseTime: string;
}

export const siteConfig: SiteConfig = {
  name: 'inodepi',
  role: 'n8n automation architect',
  email: 'hello@inodepi.com',
  calendarUrl: '#',
  formAction: '#',
  githubUrl: 'https://github.com/inodepi',
  linkedinUrl: '#',
  responseTime: 'Replies within one business day',
};

export const automationRepos: AutomationRepo[] = [
  {
    id: 'automation-placeholder-01',
    title: 'Automation placeholder 01',
    problem: 'Replace with the manual process this system eliminates.',
    stack: ['n8n', 'Webhook', 'PostgreSQL'],
    summary:
      'Two sentences on the workflow graph: what triggers it, which services it touches, and what the output looks like. Keep it concrete and outcome-oriented.',
    repoUrl: '#',
    featured: true,
    hue: 'teal',
  },
  {
    id: 'automation-placeholder-02',
    title: 'Automation placeholder 02',
    problem: 'Replace with the bottleneck this system removes.',
    stack: ['n8n', 'OpenAI', 'Slack'],
    summary:
      'Describe the multi-step chain here — intake, validation, enrichment, delivery — and note any sub-workflows or error branches that keep it reliable.',
    repoUrl: '#',
    featured: true,
    hue: 'violet',
  },
  {
    id: 'automation-placeholder-03',
    title: 'Automation placeholder 03',
    problem: 'Replace with the handoff this system takes over.',
    stack: ['n8n', 'REST API', 'CRM'],
    summary:
      'Explain the integration surface: which APIs, which direction data flows, and how the workflow handles retries and rate limits in production.',
    repoUrl: '#',
    featured: true,
    hue: 'rose',
  },
  {
    id: 'automation-placeholder-04',
    title: 'Automation placeholder 04',
    problem: 'Replace with the recurring task this system retires.',
    stack: ['n8n', 'AI Agent', 'Google Sheets'],
    summary:
      'Summarise the system end to end and the measurable result it produced. This is the card a prospective client will read first — make the outcome obvious.',
    repoUrl: '#',
    featured: true,
    hue: 'amber',
  },
];

export const sideProjects: SideProject[] = [
  {
    id: 'side-placeholder-01',
    title: 'Side project placeholder 01',
    summary:
      'One or two sentences on what this project is and why it exists. Replace from src/data/projects.ts.',
    stack: ['Astro', 'TypeScript'],
    repoUrl: '#',
    featured: true,
    hue: 'violet',
  },
  {
    id: 'side-placeholder-02',
    title: 'Side project placeholder 02',
    summary:
      'Describe the problem the project pokes at, and who it is useful for. Keep it short — this section is support, not the main pitch.',
    stack: ['Python', 'CLI'],
    repoUrl: '#',
    featured: true,
    hue: 'teal',
  },
  {
    id: 'side-placeholder-03',
    title: 'Side project placeholder 03',
    summary:
      'A tool, experiment, or write-up. If it shipped something real, say what changed because of it.',
    stack: ['n8n', 'Node.js'],
    repoUrl: '#',
    featured: true,
    hue: 'rose',
  },
  {
    id: 'side-placeholder-04',
    title: 'Side project placeholder 04',
    summary:
      'Last card. Swap or delete entries freely — the layout reflows with however many featured items remain.',
    stack: ['Rust', 'API'],
    repoUrl: '#',
    featured: true,
    hue: 'amber',
  },
];

/** Featured automation repos, capped at the four the layout is designed for. */
export const featuredAutomationRepos = automationRepos
  .filter((repo) => repo.featured)
  .slice(0, 4);

/** Featured side projects, capped at four. */
export const featuredSideProjects = sideProjects
  .filter((project) => project.featured)
  .slice(0, 4);
