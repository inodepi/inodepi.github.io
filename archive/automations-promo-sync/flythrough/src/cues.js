// Cue sheet shared by the page (burned captions) and the .srt export (tools/cues.mjs).
// One cue per line, bottom centre. Hold >= max(1.8 s, speech + 0.6 s) and long enough to read.
export const CUES7 = [
  { t0: 0.40, t1: 4.40, text: 'One record. Three tools.' },
  { t0: 4.80, t1: 8.60, text: 'Copy. Paste. Retype.' },
  { t0: 9.00, t1: 12.60, text: 'Same record. Every stop.' },
  { t0: 12.90, t1: 15.90, text: 'Then the pile lands.' },
  { t0: 16.15, t1: 20.00, text: 'Tomorrow: the same job, one hop.' },
];

// Day 10: held against the measured voice (voices/dur_day10.json).
export const CUES10 = [
  { t0: 0.90, t1: 4.00, text: 'One record. Three tools.' },
  { t0: 4.20, t1: 6.50, text: 'Copy. Paste. Retype.' },
  { t0: 6.60, t1: 10.10, text: "By hand, that's a morning gone." },
  { t0: 10.55, t1: 14.20, text: 'One automated handoff. Seconds.' },
  { t0: 14.30, t1: 17.80, text: 'Built in n8n. Your own stack.' },
  { t0: 19.00, t1: 23.00, text: 'Delivered in two to three weeks.' },
  { t0: 24.80, t1: 30.00, text: 'Book a fit call at inodepi.github.io.', cta: true },
];
