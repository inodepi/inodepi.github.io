/** Shared, style-independent content for the three preview pages. */

export const capabilities = [
  {
    title: 'Multi-workflow systems',
    body: 'Chained workflows, sub-workflows, and shared state. Built to survive production traffic, not just the demo.',
  },
  {
    title: 'API & webhook integrations',
    body: 'REST and GraphQL clients, inbound webhooks, auth, pagination, retries, and rate limits handled at the edge.',
  },
  {
    title: 'AI pipelines',
    body: 'Classification, extraction, retrieval, and agent steps grounded in your own data — with fallbacks when a model is unsure.',
  },
  {
    title: 'Data sync & enrichment',
    body: 'Keep CRM, sheets, and databases aligned. Deduplicate, normalize, and enrich records while they move.',
  },
  {
    title: 'Lead routing & CRM ops',
    body: 'Capture, score, route, and follow up. The CRM is updated before a human opens the lead.',
  },
  {
    title: 'Observability & error handling',
    body: 'Structured logs, alerts, idempotent retries, and dead-letter paths, so failures surface instead of vanishing.',
  },
];

export const processSteps = [
  {
    number: '01',
    title: 'Systems audit',
    body: 'We map where work enters, where it stalls, and which tool owns the truth. You leave with a written system diagram and a scoped build plan — whether or not we build together.',
  },
  {
    number: '02',
    title: 'Design the graph',
    body: 'I sketch the workflow architecture: triggers, data contracts, sub-workflows, fallbacks, and the order things fail in. Nothing is built until the plan is approved.',
  },
  {
    number: '03',
    title: 'Build & hand over',
    body: 'Workflows are built and tested against real payloads, documented, and deployed with monitoring in place. You keep ownership of every account and credential.',
  },
];
