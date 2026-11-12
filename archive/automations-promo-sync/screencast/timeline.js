// timeline.js — one source of truth for the seven Living Screencast days (picture, voice, sound, captions)
// Beats land on the 120 BPM / 16th grid.
export const BPM = 120, BEAT = 0.5, BAR = 2, S16 = 0.125;

export const WORKFLOWS = {
  invoice: {
    file: 'invoice-chasing.json', name: 'invoice chasing', total: 47, unit: 'invoices chased',
    stat: ['47', 'invoices chased'], statSub: 'this week · 0 manual steps',
    nodes: [
      { title: 'Invoice due today', sub: 'trigger · 07:00 daily', icon: 'clock', val: '47' },
      { title: 'Match open invoice', sub: 'sheets · ar_open', icon: 'search', val: '47' },
      { title: 'Draft follow-up', sub: 'openai · tone: firm', icon: 'pen', val: '47' },
      { title: 'Send from inbox', sub: 'gmail · thread reply', icon: 'mail', val: '47' },
      { title: 'Log the thread', sub: 'sheets · ar_log', icon: 'sheet', val: '47' },
    ],
  },
  leads: {
    file: 'dead-lead-retrieval.json', name: 'dead lead retrieval', total: 64, unit: 'dead leads revived',
    stat: ['64', 'dead leads revived'], statSub: 'cold list · first touch sent',
    nodes: [
      { title: 'Stale lead list', sub: 'crm · 64 cold', icon: 'sheet', val: '64' },
      { title: 'Enrich the record', sub: 'web · company, role', icon: 'globe', val: '64' },
      { title: 'Score the fit', sub: 'rubric · best customers', icon: 'score', val: '64' },
      { title: 'Write first touch', sub: 'openai · their problem', icon: 'pen', val: '24' },
      { title: 'Classify reply', sub: 'inbox · yes / later / no', icon: 'mail', val: '11' },
    ],
  },
  qa: {
    file: 'sales-call-qa.json', name: 'sales call QA', total: 128, unit: 'calls scored / week',
    stat: ['128', 'calls scored / week'], statSub: 'every call · same rubric',
    nodes: [
      { title: 'Call recording in', sub: 'drive · 128 / week', icon: 'wave', val: '128' },
      { title: 'Transcribe', sub: 'whisper · speaker turns', icon: 'mic', val: '128' },
      { title: 'Score the rubric', sub: 'openai · 6 criteria', icon: 'score', val: '128' },
      { title: 'CRM note + alert', sub: 'hubspot · rep ping', icon: 'bell', val: '128' },
    ],
  },
  ops: {
    file: 'lead-gen-crm-ops.json', name: 'lead gen & CRM ops', total: 24, unit: 'leads routed today',
    stat: null, statSub: '',
    nodes: [
      { title: 'Form webhook', sub: 'site · 24/7', icon: 'webhook', val: '24' },
      { title: 'Enrich the lead', sub: 'web · company, size', icon: 'globe', val: '24' },
      { title: 'Dedupe', sub: 'crm · match on email', icon: 'search', val: '24' },
      { title: 'Route to a rep', sub: 'rules · territory', icon: 'tag', val: '24' },
      { title: 'Update the CRM', sub: 'hubspot · deal created', icon: 'crm', val: '24' },
      { title: 'Send the digest', sub: 'email · 07:00', icon: 'digest', val: '24' },
    ],
  },
};

/* ── shared bodies (footage). Times are relative to the body start. ── */
const INV_CUT = {
  wf: 'invoice', len: 32, click: 3.5,
  nodes: [4.2, 7.4, 10.8, 15.0, 18.6],
  panels: [{ node: 2, t0: 10.6, t1: 14.0, kind: 'email' }, { node: 4, t0: 18.8, t1: 21.2, kind: 'log' }],
  toasts: [{ t0: 18.8, t1: 21.0, node: 3, text: 'sent · gmail thread' }],
  cam: [[0, 540, 960, 1.0], [3.6, 540, 960, 1.0], [4.7, 576, 470, 1.26], [7.0, 576, 730, 1.3], [10.3, 764, 695, 1.9], [14.2, 764, 695, 1.9], [15.0, 576, 1240, 1.3], [17.4, 576, 1520, 1.28], [19.1, 764, 680, 1.9], [21.4, 764, 680, 1.9], [22.0, 540, 960, 1.0], [22.7, 576, 905, 1.06], [26.2, 540, 960, 1.0], [32, 540, 960, 1.0]],
  stat: 22.7,
  mascot: [[3.4, 800, 344], [5.6, 800, 614], [8.8, 800, 884], [12.9, 800, 1154], [16.6, 800, 1424], [22.9, 800, 1424]],
  cursor: [[0.6, 860, 1500, 0], [1.2, 840, 1440, 0.9], [2.8, 986, 238, 1], [3.5, 986, 238, 1, 1], [4.6, 900, 660, 0.9], [6.4, 890, 700, 0.0],
    [19.4, 900, 1580, 0], [20.4, 900, 1580, 0.9], [21.6, 900, 300, 1], [22.2, 900, 300, 1, 1], [23.6, 880, 700, 0.0]],
};

const INV_WALK = {
  wf: 'invoice', len: 32, click: 3.5,
  nodes: [4.2, 8.0, 12.6, 17.6, 21.6],
  panels: [{ node: 2, t0: 12.4, t1: 16.6, kind: 'email' }, { node: 4, t0: 21.8, t1: 25.0, kind: 'log' }],
  toasts: [{ t0: 8.2, t1: 11.6, node: 1, text: 'inv-2041 · matched' }, { t0: 17.8, t1: 21.0, node: 3, text: 'sent 07:14 · thread' }],
  cam: [[0, 540, 960, 1.0], [3.4, 540, 960, 1.0], [4.6, 576, 470, 1.26], [7.6, 576, 730, 1.3], [12.2, 764, 695, 1.9], [16.8, 764, 695, 1.9], [17.4, 576, 1240, 1.3], [20.4, 576, 1520, 1.28], [21.7, 764, 680, 1.9], [25.0, 764, 680, 1.9], [25.6, 540, 960, 1.0], [26.8, 576, 905, 1.06], [29.6, 540, 960, 1.0], [32, 540, 960, 1.0]],
  stat: 26.8,
  mascot: [[3.4, 800, 344], [5.8, 800, 614], [9.6, 800, 884], [14.6, 800, 1154], [19.4, 800, 1424], [27.0, 800, 1424]],
  cursor: [[0.6, 860, 1500, 0], [1.2, 840, 1440, 0.9], [3.0, 986, 238, 1], [3.5, 986, 238, 1, 1], [4.6, 900, 700, 0.9], [6.2, 890, 740, 0.0],
    [22.6, 900, 1600, 0], [23.4, 900, 1600, 0.9], [24.4, 700, 1240, 1], [25.2, 690, 1250, 0.9, 1], [26.4, 880, 700, 0.0]],
};

const LEADS_CUT = {
  wf: 'leads', len: 32, click: 3.5,
  nodes: [4.2, 7.4, 11.0, 15.2, 19.0],
  panels: [{ node: 1, t0: 11.0, t1: 14.4, kind: 'enrich' }, { node: 4, t0: 19.2, t1: 21.8, kind: 'reply' }],
  toasts: [],
  cam: [[0, 540, 960, 1.0], [3.6, 540, 960, 1.0], [4.7, 576, 470, 1.26], [7.0, 576, 730, 1.3], [10.7, 764, 695, 1.9], [14.6, 764, 695, 1.9], [15.2, 576, 1240, 1.3], [18.0, 576, 1520, 1.28], [19.1, 764, 675, 1.9], [22.0, 764, 675, 1.9], [22.6, 540, 960, 1.0], [23.2, 576, 905, 1.06], [26.6, 540, 960, 1.0], [32, 540, 960, 1.0]],
  stat: 23.2,
  mascot: [[3.4, 800, 344], [5.6, 800, 614], [8.8, 800, 884], [13.0, 800, 1154], [17.0, 800, 1424], [23.4, 800, 1424]],
  cursor: [[0.6, 860, 1500, 0], [1.2, 840, 1440, 0.9], [3.0, 986, 238, 1], [3.5, 986, 238, 1, 1], [4.6, 900, 680, 0.9], [6.4, 890, 720, 0.0],
    [20.0, 900, 1560, 0], [20.8, 900, 1560, 0.9], [21.8, 700, 1560, 1], [22.0, 700, 1560, 1, 1], [23.2, 880, 700, 0.0]],
};

const LEADS_WALK = {
  wf: 'leads', len: 32, click: 3.5,
  nodes: [4.2, 8.2, 12.8, 17.4, 21.2],
  panels: [{ node: 1, t0: 8.0, t1: 11.6, kind: 'enrich' }, { node: 2, t0: 12.6, t1: 16.8, kind: 'score' }, { node: 4, t0: 21.4, t1: 24.4, kind: 'reply' }],
  toasts: [],
  cam: [[0, 540, 960, 1.0], [3.4, 540, 960, 1.0], [4.6, 576, 470, 1.26], [7.6, 576, 730, 1.3], [8.4, 764, 695, 1.9], [11.6, 764, 695, 1.9], [12.2, 764, 890, 1.5], [17.0, 764, 890, 1.5], [17.6, 576, 1240, 1.3], [20.6, 576, 1520, 1.28], [21.5, 764, 675, 1.9], [24.6, 764, 675, 1.9], [25.2, 540, 960, 1.0], [25.8, 576, 905, 1.06], [29.0, 540, 960, 1.0], [32, 540, 960, 1.0]],
  stat: 25.8,
  mascot: [[3.4, 800, 344], [5.8, 800, 614], [9.8, 800, 884], [13.4, 800, 1154], [18.4, 800, 1424], [26.0, 800, 1424]],
  cursor: [[0.6, 860, 1500, 0], [1.2, 840, 1440, 0.9], [3.0, 986, 238, 1], [3.5, 986, 238, 1, 1], [4.6, 900, 700, 0.9], [6.2, 890, 740, 0.0],
    [22.4, 900, 1600, 0], [23.2, 900, 1600, 0.9], [24.2, 700, 1300, 1], [25.0, 690, 1300, 0.9, 1], [26.2, 880, 700, 0.0]],
};

const QA = {
  wf: 'qa', len: 32, click: 3.5,
  nodes: [4.2, 9.2, 15.4, 20.6],
  panels: [{ node: 1, t0: 9.4, t1: 13.8, kind: 'transcript' }, { node: 2, t0: 15.2, t1: 21.2, kind: 'score' }],
  toasts: [{ t0: 21.7, t1: 24.2, node: 3, text: 'alert · rep + manager' }],
  cam: [[0, 540, 960, 1.0], [3.4, 540, 960, 1.0], [4.6, 576, 470, 1.26], [8.8, 576, 730, 1.3], [9.6, 764, 820, 1.6], [13.4, 764, 820, 1.6], [13.9, 764, 680, 1.75], [15.2, 764, 890, 1.5], [20.8, 764, 890, 1.5], [21.4, 576, 1400, 1.28], [22.8, 540, 960, 1.0], [24.4, 576, 905, 1.06], [27.4, 540, 960, 1.0], [32, 540, 960, 1.0]],
  stat: 24.4, climb: { t0: 18.2, step: .62 },
  mascot: [[3.4, 800, 344], [6.4, 800, 614], [11.6, 800, 884], [17.4, 800, 1154], [24.6, 800, 1154]],
  cursor: [[0.6, 860, 1500, 0], [1.2, 840, 1440, 0.9], [3.0, 986, 238, 1], [3.5, 986, 238, 1, 1], [4.6, 900, 680, 0.9], [6.4, 890, 720, 0.0],
    [20.0, 900, 1600, 0], [20.8, 900, 1600, 0.9], [21.8, 860, 1420, 1], [23.4, 880, 700, 0.0]],
};

const OPS = {
  wf: 'ops', len: 32, click: 3.5,
  nodes: [4.2, 8.0, 11.6, 15.0, 18.4, 21.8],
  panels: [{ node: 5, t0: 24.4, t1: 31.2, kind: 'digest' }],
  toasts: [],
  cam: [[0, 540, 960, 1.0], [3.4, 540, 960, 1.0], [4.6, 576, 470, 1.24], [7.6, 576, 700, 1.28], [11.2, 576, 900, 1.24], [14.6, 576, 1130, 1.26], [18.0, 576, 1360, 1.26], [23.4, 540, 960, 1.0], [24.6, 764, 745, 1.9], [31.2, 764, 745, 1.9], [32, 540, 960, 1.0]],
  stat: null, ride: { t0: 28.5, t1: 31.0 }, approve: 27.7,
  mascot: [[3.4, 800, 344], [5.8, 800, 566], [9.0, 800, 788], [12.8, 800, 1010], [16.6, 800, 1232], [20.2, 800, 1454], [23.0, 700, 1454]],
  cursor: [[0.6, 860, 1500, 0], [1.2, 840, 1440, 0.9], [3.0, 986, 238, 1], [3.5, 986, 238, 1, 1], [4.6, 900, 680, 0.9], [6.4, 890, 720, 0.0],
    [25.0, 900, 1250, 0], [25.6, 900, 1250, 0.9], [27.2, 760, 960, 1], [27.7, 665, 940, 1, 1], [29.2, 690, 948, 0.0]],
};

/* ── body scripts: [body-relative time, caption] ───────────────── */
const SCRIPT_INV = [
  [0.9, 'This job used to take a morning.'],
  [4.1, 'Now it runs before you sit down.'],
  [7.3, 'It pulls every invoice that is due today.'],
  [10.5, 'Drafts the follow-up in your voice.'],
  [13.7, 'Sends it from your own inbox.'],
  [16.9, 'Then logs the thread back to the sheet.'],
  [20.1, 'Forty-seven invoices chased.'],
  [23.1, 'No spreadsheet. No copy-paste.'],
  [26.1, 'A whole morning back, every week.'],
  [29.1, 'Two to three weeks to build.'],
];
const SCRIPT_INV_WALK = [
  [0.9, 'This is the whole build. Nothing hidden.'],
  [3.9, 'A trigger reads the invoice sheet at seven.'],
  [7.4, 'Anything due today gets pulled in.'],
  [10.6, 'It matches the open invoice in the CRM.'],
  [14.0, 'Then drafts a follow-up in your tone.'],
  [17.2, 'You can read it. Or let it send.'],
  [20.4, 'It sends from your own inbox.'],
  [23.4, 'And logs the thread back to the sheet.'],
  [26.6, 'Forty-seven invoices chased.'],
  [29.4, 'A morning back, every week.'],
];
const SCRIPT_LEADS = [
  [0.9, 'Nobody had time to touch them.'],
  [4.1, 'So the workflow does.'],
  [7.4, 'It enriches each lead from the web.'],
  [10.6, 'Then scores the fit against your best customers.'],
  [13.8, 'Writes a first touch that names their problem.'],
  [17.0, 'Sends it, then watches for a reply.'],
  [20.2, 'When a reply lands, it sorts it.'],
  [23.2, 'Sixty-four dead leads revived.'],
  [26.4, 'All of it in your CRM by lunch.'],
  [29.4, 'Two to three weeks to build.'],
];
const SCRIPT_LEADS_WALK = [
  [0.9, 'Sixty-four leads, cold for months.'],
  [3.9, 'The workflow starts with the stale list.'],
  [7.4, 'It enriches every record: company, role, news.'],
  [10.6, 'Then scores the fit against your best deals.'],
  [13.8, 'Only the top of the list gets a touch.'],
  [17.0, 'A short message that names their problem.'],
  [20.2, 'Sent from your inbox, not a blast tool.'],
  [23.2, 'When a reply lands, it reads it and routes it.'],
  [26.4, 'Sixty-four dead leads revived.'],
  [29.4, 'Two to three weeks to build.'],
];
const SCRIPT_QA = [
  [0.9, 'Every sales call, scored.'],
  [3.9, 'The recording lands. The transcript follows.'],
  [7.4, 'It scores the call against your rubric.'],
  [10.6, 'Did they ask about budget? Next step?'],
  [13.8, 'One hundred and twenty-eight calls a week.', 'A hundred and twenty-eight calls a week.'],
  [17.2, 'The score card lands on the CRM record.'],
  [20.4, 'A weak call alerts the rep the same day.'],
  [23.4, 'Coaching, not a spreadsheet review.'],
  [26.6, 'A hundred and twenty-eight every week.', '128 every week.'],
  [29.4, 'Two to three weeks to build.'],
];
const SCRIPT_OPS = [
  [0.9, 'A lead comes in at two a.m.'],
  [3.9, 'The form hits a webhook.'],
  [6.9, 'Enriched, deduped, and routed.'],
  [9.9, 'The right rep owns it before nine.'],
  [12.9, 'The CRM updates itself.'],
  [15.9, 'A digest lands in your inbox at seven.'],
  [19.1, 'New leads, what moved, what stalled.'],
  [22.1, 'You read it and press approve.'],
  [25.1, 'That is the whole morning stand-up.'],
  [28.1, 'No one typing. Nothing stale.'],
];

const CTA_LINES = (t0) => [
  { t: t0, text: 'Book a fit call.' },
  { t: t0 + 3.2, text: 'inodepi.github.io', say: 'inodepi dot github dot eye oh' },
];

function bodyLines(script, off) {
  return script.map(([t, text, say]) => ({ t: off + t, text, ...(say ? { say } : {}) }));
}

const HOOK_C = { t: 0.7, text: 'You hired a person to be a cable.' };
const HOOK_B = { t: 0.6, text: 'Your best employee is copy-pasting.' };

/* ── events derived from a body, so sound and picture never drift ── */
function bodyEv(b, off) {
  const e = [];
  e.push({ t: off + b.click - 0.02, type: 'pop' });
  b.nodes.forEach((t, i) => e.push({ t: off + t, type: 'tick' }));
  if (b.stat != null) e.push({ t: off + b.stat + 0.15, type: 'lock' }, { t: off + b.stat + 0.5, type: 'ding' });
  b.panels?.forEach(p => e.push({ t: off + p.t0 + 0.05, type: 'pop' }));
  b.toasts?.forEach(p => e.push({ t: off + p.t0 + 0.05, type: 'tick' }));
  b.cam.forEach(([t], i) => { if (i && t - b.cam[i - 1][0] < 1.15) e.push({ t: off + t - 0.1, type: 'whoosh' }); });
  b.mascot?.forEach(([t], i) => { if (i) e.push({ t: off + t - 0.06, type: 'tick' }); });
  return e;
}
const merge = (...arrs) => arrs.flat().sort((a, b) => a.t - b.t);

export const DAYS = {
  2: {
    dur: 45, fps: 30, body: INV_CUT, bodyStart: 3.8, cta: 35.8, intro: 'hookC',
    lines: [HOOK_C, ...bodyLines(SCRIPT_INV, 3.8), ...CTA_LINES(35.8)],
    sect: [[0, 3.8, 'problem'], [3.8, 22.6, 'proof'], [22.6, 34.8, 'proof'], [34.8, 45, 'cta']],
  },
  3: {
    dur: 45, fps: 30, body: INV_CUT, bodyStart: 6.0, cta: 35.8, intro: 'relay',
    lines: [{ t: 0.6, text: 'The copy-paste morning.' }, { t: 3.0, text: 'Same record. Carried by hand.' }, ...bodyLines(SCRIPT_INV, 6.0), ...CTA_LINES(35.8)],
    sect: [[0, 6, 'problem'], [6, 22.6, 'proof'], [22.6, 34.8, 'proof'], [34.8, 45, 'cta']],
  },
  8: {
    dur: 40, fps: 30, body: INV_WALK, bodyStart: 0, cta: 32.4, intro: 'none',
    lines: [...bodyLines(SCRIPT_INV_WALK, 0), ...CTA_LINES(32.4)],
    sect: [[0, 12, 'proof'], [12, 24, 'proof'], [24, 32, 'offer'], [32, 40, 'cta']],
  },
  9: {
    dur: 45, fps: 30, body: LEADS_CUT, bodyStart: 4.5, cta: 36.8, intro: 'hookB',
    lines: [HOOK_B, { t: 3.5, text: 'Sixty-four good leads went cold.' }, ...bodyLines(SCRIPT_LEADS, 4.5), ...CTA_LINES(36.8)],
    sect: [[0, 4.5, 'problem'], [4.5, 22.6, 'proof'], [22.6, 34.8, 'proof'], [34.8, 45, 'cta']],
  },
  11: {
    dur: 40, fps: 30, body: LEADS_WALK, bodyStart: 0, cta: 32.4, intro: 'none',
    lines: [...bodyLines(SCRIPT_LEADS_WALK, 0), ...CTA_LINES(32.4)],
    sect: [[0, 12, 'proof'], [12, 24, 'proof'], [24, 32, 'offer'], [32, 40, 'cta']],
  },
  12: {
    dur: 40, fps: 30, body: QA, bodyStart: 0, cta: 32.4, intro: 'none',
    lines: [...bodyLines(SCRIPT_QA, 0), ...CTA_LINES(32.4)],
    sect: [[0, 12, 'proof'], [12, 24, 'proof'], [24, 32, 'offer'], [32, 40, 'cta']],
  },
  13: {
    dur: 40, fps: 30, body: OPS, bodyStart: 0, cta: 32.4, intro: 'none',
    lines: [...bodyLines(SCRIPT_OPS, 0), ...CTA_LINES(32.4)],
    sect: [[0, 12, 'proof'], [12, 24, 'proof'], [24, 32, 'offer'], [32, 40, 'cta']],
  },
};

// ids and event lists (ids keep .srt / asr / dur.json in sync)
for (const [day, D] of Object.entries(DAYS)) {
  D.lines = D.lines.map((l, i) => ({ id: 'l' + (i + 1), ...l }));
  const off = D.bodyStart;
  const introEv = D.intro === 'relay'
    ? [{ t: 0.8, type: 'pop' }, { t: 2.2, type: 'pop' }, { t: 3.6, type: 'pop' }, { t: 4.9, type: 'pop' }, { t: 6.0, type: 'whoosh' }]
    : D.intro === 'hookC' ? [{ t: 0.7, type: 'tick' }, { t: 1.4, type: 'tick' }, { t: 2.2, type: 'tick' }, { t: 3.0, type: 'tick' }, { t: 3.8, type: 'whoosh' }]
    : D.intro === 'hookB' ? [{ t: 0.6, type: 'tick' }, { t: 1.5, type: 'tick' }, { t: 2.4, type: 'tick' }, { t: 3.4, type: 'tick' }, { t: 4.5, type: 'whoosh' }]
    : [];
  const ctaEv = [{ t: D.cta - 0.55, type: 'whoosh' }, { t: D.cta - 0.25, type: 'chime' }, { t: D.cta + 3.1, type: 'tick' }];
  D.ev = merge(introEv, bodyEv(D.body, off), ctaEv);
}
