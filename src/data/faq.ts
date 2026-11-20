/**
 * Static FAQ content for the site's FAQ floating panel.
 *
 * Answers are pre-written by design: the panel never generates text and
 * has no input field. Edit entries here to change what visitors can read.
 */

export interface FaqItem {
  /** Stable id used for the accordion/list wiring. */
  id: string;
  /** Group label shown above the question chips. */
  group: string;
  question: string;
  answer: string;
}

export const faqGreeting = {
  body: "Hi! I'm Pip — the site's FAQ apprentice. I'm a bit limited, more cheat sheet than chatbot. For anything about your own service, my master would rather you talked to a real person:",
  cta: 'Book a 15-minute call',
};

export const faqFooter = {
  lead: 'Not what you meant?',
  cta: 'Book a call',
};

export const faqItems: FaqItem[] = [
  // About the work
  {
    id: 'what-i-build',
    group: 'About the work',
    question: 'What do you actually build?',
    answer:
      'Multi-workflow n8n systems that connect APIs, webhooks, AI pipelines, CRM and ops tooling — plus the websites those loops start on. Booking, reminders, invoicing, follow-ups.',
  },
  {
    id: 'tools',
    group: 'About the work',
    question: 'What tools can you connect?',
    answer:
      'Anything with an API or webhook: Notion, Gmail, Google Sheets, CRMs, Cal.com, Telegram, WhatsApp, Gemini/OpenRouter, Telnyx, and more.',
  },
  {
    id: 'no-api',
    group: 'About the work',
    question: 'What if my tools have no API?',
    answer:
      "That's exactly what the audit is for. It'll say when automation isn't worth it.",
  },

  // Services
  {
    id: 'systems-built',
    group: 'Services',
    question: 'What kinds of systems have you built?',
    answer:
      'AI receptionists across voice, chat and email; lead enrichment and scoring agents (Notion → Gemini → CRM); AR invoice reminders with tone-matched drafts; HR onboarding pipelines; dead-lead revival campaigns; websites with the automation behind them — one build, one handover.',
  },
  {
    id: 'industry',
    group: 'Services',
    question: 'Do you work with my industry?',
    answer:
      'Nine years in high-volume BPO operations; built for towing, dental, glamping, and e-commerce leads. If a process repeats and touches software, it can be automated.',
  },
  {
    id: 'one-off',
    group: 'Services',
    question: 'Do you do one-off fixes?',
    answer:
      'Yes: a single broken webhook, a workflow that keeps failing, a Zapier/Make migration to n8n. Small jobs welcome.',
  },

  // Process & pricing
  {
    id: 'start',
    group: 'Process & pricing',
    question: 'How does it start?',
    answer:
      'A free 15-minute discovery call. We map the process, count the hours it eats, and decide together whether automation is worth it.',
  },
  {
    id: 'process',
    group: 'Process & pricing',
    question: "What's the process?",
    answer:
      'Three steps: systems audit → design the graph → build & hand over. Nothing is built until the plan is approved.',
  },
  {
    id: 'cost',
    group: 'Process & pricing',
    question: 'What does it cost?',
    answer:
      'Pricing is scoped per build, so it depends on what your process needs. The discovery call maps the work, and you get a fixed scope and price before anything is built. No hourly surprises.',
  },
  {
    id: 'before-committing',
    group: 'Process & pricing',
    question: 'What do I get before committing?',
    answer:
      'The discovery call is free. If we proceed, the systems audit produces a written system diagram and a scoped build plan — you know exactly what you are buying before saying yes.',
  },
  {
    id: 'maintenance',
    group: 'Process & pricing',
    question: 'Do you offer maintenance?',
    answer:
      'Yes, optional. After handover you own everything and can run it yourself; if you would rather not, we scope a care plan (monitoring, error triage, small adjustments) — agreed before it starts.',
  },
  {
    id: 'not-n8n',
    group: 'Process & pricing',
    question: "What if n8n isn't the right fit?",
    answer:
      "The audit will say so. I'd rather tell you that than sell you a build that doesn't hold.",
  },

  // Ownership & practical
  {
    id: 'ownership',
    group: 'Ownership & practical',
    question: 'Who owns the workflows and accounts?',
    answer:
      'You do. Every account and credential stays yours; everything is documented and deployed with monitoring.',
  },
  {
    id: 'timezone',
    group: 'Ownership & practical',
    question: 'Do you work with my timezone?',
    answer:
      'Worldwide, times shown in yours. Replies within one business day.',
  },
];

/** Group labels in first-seen order, for rendering the chip list. */
export const faqGroups: string[] = faqItems.reduce<string[]>((groups, item) => {
  if (!groups.includes(item.group)) groups.push(item.group);
  return groups;
}, []);
