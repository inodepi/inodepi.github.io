export interface AgentSkill {
  id: string;
  title: string;
  tagline: string;
  summary: string;
  category: string;
  price: string;
  priceNote?: string;
  agensiUrl: string;
  repoUrl: string;
  hue: 'teal' | 'amber' | 'rose' | 'violet';
  featured: boolean;
}

export const agentSkills: AgentSkill[] = [
  {
    id: 'n8n-workflow-engineer',
    title: 'n8n Workflow Engineer',
    tagline: 'Build n8n workflows that survive the second run.',
    summary:
      'Explicit node discriminators, normalization in code, structured AI output with deterministic fallbacks, idempotency and cooldowns, wired error paths, and a workflow JSON validator.',
    category: 'Prompt & skill engineering',
    price: 'Free',
    priceNote: 'Launch price',
    agensiUrl: 'https://www.agensi.io/skills/n8n-workflow-engineer',
    repoUrl: 'https://github.com/inodepi/n8n-workflow-engineer-skill',
    hue: 'teal',
    featured: true,
  },
  {
    id: 'lead-reactivation-agent',
    title: 'Lead Reactivation Agent',
    tagline: 'Revive the leads you already paid for — without sounding like a campaign.',
    summary:
      'Reads a lead tracker, ranks dormant leads by recency, writes a short personal win-back email, sends the safe ones and queues the high-value ones for approval.',
    category: 'Sales & lead gen',
    price: 'Free',
    priceNote: 'Launch price',
    agensiUrl: 'https://www.agensi.io/skills/lead-reactivation-agent',
    repoUrl: 'https://github.com/inodepi/lead-reactivation-agent-skill',
    hue: 'amber',
    featured: true,
  },
  {
    id: 'collections-agent',
    title: 'AR Collections Agent',
    tagline: 'Clear your receivables queue without writing a single reminder.',
    summary:
      'Reads overdue invoices, computes days past due, writes a tone-matched reminder, sends the low-risk ones automatically and queues the rest for one-click approval.',
    category: 'Finance & accounting',
    price: 'Free',
    priceNote: 'Launch price',
    agensiUrl: 'https://www.agensi.io/skills/collections-agent',
    repoUrl: 'https://github.com/inodepi/ar-invoice-reminder-agent-skill',
    hue: 'rose',
    featured: true,
  },
  {
    id: 'client-proposal-agent',
    title: 'Client Proposal Agent',
    tagline: 'Turn a messy brief into a three option proposal that closes.',
    summary:
      'Restates the problem, scopes inclusions and exclusions, prices three options with a timeline and terms, and adds the internal objection notes a client should never see.',
    category: 'Sales & lead gen',
    price: '$12',
    agensiUrl: 'https://www.agensi.io/skills/client-proposal-agent',
    repoUrl: 'https://github.com/inodepi/client-proposal-agent-skill',
    hue: 'violet',
    featured: true,
  },
  {
    id: 'contract-review-agent',
    title: 'Contract Review Agent',
    tagline: 'Find the clauses that will cost you money — before you sign.',
    summary:
      'Ranks each clause in plain English — IP grabs, unlimited liability, payment traps, auto renewal, termination lock in, broad non competes — and drafts the negotiation email.',
    category: 'Legal & compliance',
    price: '$19',
    agensiUrl: 'https://www.agensi.io/skills/contract-review-agent',
    repoUrl: 'https://github.com/inodepi/contract-review-agent-skill',
    hue: 'teal',
    featured: true,
  },
];

export const featuredAgentSkills = agentSkills.filter((skill) => skill.featured);

export const agensiProfileUrl = 'https://www.agensi.io/creators/potaterrr';
