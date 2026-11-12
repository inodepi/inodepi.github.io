// timeline.js — single source of truth for the keynote days (picture, voice, sound, checks)
export const BPM = 120, BEAT = 0.5, BAR = 2, S16 = 0.125;

export const DAYS = {
  1: {
    dur: 60, fps: 24,
    lines: [
      { id: 'l1', t0: 0.9, text: 'You hired a person to be a cable.' },
      { id: 'l2', t0: 4.2, text: 'Copy. Paste. Repeat. Every morning.' },
      { id: 'l3', t0: 12.6, text: 'These four builds already run the work.' },
      { id: 'l4', t0: 15.6, text: 'Forty-seven invoices chased.', say: 'Forty-seven invoices chased.' },
      { id: 'l5', t0: 18.2, text: 'Sixty-four dead leads revived.', say: 'Sixty-four dead leads revived.' },
      { id: 'l6', t0: 20.8, text: 'A hundred and twenty-eight calls scored every week.', say: 'A hundred and twenty-eight calls scored every week.' },
      { id: 'l7', t0: 26.6, text: "It's not the list." },
      { id: 'l8', t0: 29.0, text: 'Lead-gen and CRM ops.' },
      { id: 'l9', t0: 31.0, text: 'Scraping and data extraction.' },
      { id: 'l10', t0: 33.0, text: 'AI agents and classifiers.' },
      { id: 'l11', t0: 35.0, text: 'Reports and digests in email.' },
      { id: 'l12', t0: 37.0, text: 'Follow-up sequences.' },
      { id: 'l13', t0: 39.0, text: 'File and systems glue.' },
      { id: 'l14', t0: 41.4, text: 'Built in n8n. Your stack, your tools.' },
      { id: 'l15', t0: 44.9, text: 'Pick the process that eats your week.' },
      { id: 'l16', t0: 47.3, text: 'Automated in two to three weeks.', say: 'Automated in two to three weeks.' },
      { id: 'l17', t0: 49.7, text: 'You approve what matters.' },
      { id: 'l18', t0: 53.4, text: 'Book a fit call.' },
      { id: 'l19', t0: 56.0, text: 'inodepi.github.io', say: 'inodepi dot github dot eye oh' },
    ],
    ev: [
      { t: 0.9, type: 'tick' }, { t: 1.5, type: 'tick' }, { t: 2.2, type: 'tick' }, { t: 2.8, type: 'tick' },
      { t: 4.2, type: 'whoosh' }, { t: 5.4, type: 'pop' }, { t: 6.6, type: 'pop' }, { t: 7.8, type: 'pop' }, { t: 9.0, type: 'pop' },
      { t: 11.4, type: 'thump' }, { t: 12.6, type: 'whoosh' }, { t: 13.4, type: 'lock' }, { t: 15.6, type: 'lock' }, { t: 18.2, type: 'lock' }, { t: 20.8, type: 'lock' },
      { t: 26.6, type: 'thump' }, { t: 29.0, type: 'snap' }, { t: 31.0, type: 'snap' }, { t: 33.0, type: 'snap' }, { t: 35.0, type: 'snap' }, { t: 37.0, type: 'snap' }, { t: 39.0, type: 'snap' },
      { t: 40.2, type: 'ding' }, { t: 41.4, type: 'chime' }, { t: 44.9, type: 'tick' }, { t: 47.3, type: 'tick' }, { t: 49.9, type: 'switch' },
      { t: 53.2, type: 'whoosh' }, { t: 53.4, type: 'chime' }, { t: 56.0, type: 'tick' }, { t: 59.4, type: 'zero' },
    ],
  },
  4: {
    dur: 12, fps: 24,
    lines: [],
    ev: [{ t: 0.2, type: 'whoosh' }, { t: 0.5, type: 'lock' }, { t: 4.2, type: 'whoosh' }, { t: 4.5, type: 'lock' }, { t: 8.2, type: 'whoosh' }, { t: 8.5, type: 'lock' }],
  },
  5: {
    dur: 30, fps: 24,
    lines: [
      { id: 'l1', t0: 0.9, text: "It's not the list." },
      { id: 'l2', t0: 2.6, text: 'Lead-gen and CRM ops.' },
      { id: 'l3', t0: 4.4, text: 'Scraping and data extraction.' },
      { id: 'l4', t0: 6.2, text: 'AI agents and classifiers.' },
      { id: 'l5', t0: 8.0, text: 'Reports and digests in email.' },
      { id: 'l6', t0: 9.8, text: 'Follow-up sequences.' },
      { id: 'l7', t0: 11.6, text: 'File and systems glue.' },
      { id: 'l8', t0: 14.6, text: 'Built in n8n. Your stack, your tools.' },
      { id: 'l9', t0: 18.4, text: 'Pick one process. We automate it in two to three weeks.', say: 'Pick one process. We automate it in two to three weeks.' },
      { id: 'l10', t0: 24.4, text: 'Book a fit call.', },
      { id: 'l11', t0: 27.2, text: 'inodepi.github.io', say: 'inodepi dot github dot eye oh' },
    ],
    ev: [
      { t: 0.9, type: 'thump' }, { t: 1.6, type: 'snap' }, { t: 3.4, type: 'snap' }, { t: 5.2, type: 'snap' }, { t: 7.0, type: 'snap' }, { t: 8.8, type: 'snap' }, { t: 10.6, type: 'snap' }, { t: 13.6, type: 'snap' },
      { t: 14.6, type: 'ding' }, { t: 18.4, type: 'tick' }, { t: 24.2, type: 'whoosh' }, { t: 24.4, type: 'chime' }, { t: 27.2, type: 'tick' },
    ],
  },
  6: {
    dur: 25, fps: 24,
    lines: [
      { id: 'l1', t0: 0.9, text: 'Pick the process that eats your week.' },
      { id: 'l2', t0: 4.0, text: "It doesn't need a new tool." },
      { id: 'l3', t0: 6.4, text: 'It runs in your stack, with your tools.' },
      { id: 'l4', t0: 10.2, text: 'Automated in two to three weeks.', say: 'Automated in two to three weeks.' },
      { id: 'l5', t0: 13.8, text: 'And you approve what matters.' },
      { id: 'l6', t0: 18.2, text: 'Book a fit call.' },
      { id: 'l7', t0: 21.4, text: 'inodepi.github.io', say: 'inodepi dot github dot eye oh' },
    ],
    ev: [
      { t: 0.9, type: 'tick' }, { t: 3.8, type: 'whoosh' }, { t: 4.0, type: 'snap' }, { t: 6.4, type: 'snap' }, { t: 8.8, type: 'snap' }, { t: 10.2, type: 'lock' },
      { t: 13.8, type: 'tick' }, { t: 14.9, type: 'switch' }, { t: 17.4, type: 'whoosh' }, { t: 18.2, type: 'chime' }, { t: 21.4, type: 'tick' },
    ],
  },
  14: {
    dur: 30, fps: 24,
    lines: [
      { id: 'l1', t0: 0.6, text: 'You hired a person to be a cable.' },
      { id: 'l2', t0: 4.4, text: 'Forty-seven invoices. Sixty-four leads. A hundred and twenty-eight calls a week.', say: 'Forty-seven invoices. Sixty-four leads. A hundred and twenty-eight calls a week.' },
      { id: 'l3', t0: 10.3, text: 'All of it, actually running.' },
      { id: 'l4', t0: 13.0, text: 'Pick the process that eats your week. Two to three weeks. You approve what matters.', say: 'Pick the process that eats your week. Two to three weeks. You approve what matters.' },
      { id: 'l5', t0: 22.0, text: 'Book a fit call.' },
      { id: 'l6', t0: 25.4, text: 'inodepi.github.io', say: 'inodepi dot github dot eye oh' },
    ],
    ev: [
      { t: 0.6, type: 'tick' }, { t: 1.2, type: 'tick' }, { t: 1.8, type: 'tick' }, { t: 4.4, type: 'lock' }, { t: 5.2, type: 'lock' }, { t: 6.0, type: 'lock' },
      { t: 8.6, type: 'ding' }, { t: 9.4, type: 'snap' }, { t: 10.2, type: 'snap' }, { t: 11.0, type: 'snap' }, { t: 11.8, type: 'snap' },
      { t: 13.0, type: 'thump' }, { t: 18.4, type: 'switch' }, { t: 21.8, type: 'whoosh' }, { t: 22.0, type: 'chime' }, { t: 25.4, type: 'tick' },
    ],
  },
};

export const CATEGORIES = [
  ['Lead-gen & CRM ops', 'hubspot · pipedrive'],
  ['Scraping & data extraction', 'sites · pdfs · apis'],
  ['AI agents & classifiers', 'llm · rules'],
  ['Reports & digests in email', 'daily · weekly'],
  ['Follow-up sequences', 'email · sms'],
  ['File & systems glue', 'sheets · drives'],
];

export const BUILDS = [
  { title: 'invoice-reminder', value: '47', label: 'invoices chased / week', note: 'ar-invoice-reminder-agent' },
  { title: 'dead-lead-retrieval', value: '64', label: 'dead leads revived', note: 'dead-lead-retrieval' },
  { title: 'sales-call-qa', value: '128', label: 'calls scored / week', note: 'sales-call-qa' },
  { title: 'lead-gen-ops', value: '24/7', label: 'running — no manual steps', note: 'clinic-leads · outreach' },
];
