// tools/export_day.mjs — export the keynote day timelines (for audio build + captions)
import fs from 'fs';
import path from 'path';
import { DAYS } from '../keynote/timeline.js';
const here = path.dirname(new URL(import.meta.url).pathname);
const out = path.resolve(here, "../keynote/voices");
fs.mkdirSync(out, { recursive: true });
for (const [day, D] of Object.entries(DAYS)) {
  const nn = String(day).padStart(2, '0');
  fs.writeFileSync(path.join(out, `timeline_day${nn}.json`), JSON.stringify({ day: +day, dur: D.dur, fps: D.fps, lines: D.lines, ev: D.ev }, null, 1));
  const ASR = {
    'a hundred and twenty-eight calls scored every week.': '128 calls scored every week.',
    'book a fit call.': 'book a fitcorn.',
    'inodepi dot github dot eye oh': 'patera.github.io',
    'pick one process. we automate it in two to three weeks.': 'pick one process. we automated in two to three weeks.',
    'forty-seven invoices. sixty-four leads. a hundred and twenty-eight calls a week.': '47 invoices, 64 leads, 128 calls a week.',
  };
  fs.writeFileSync(path.join(out, `lines_day${nn}.json`), JSON.stringify(D.lines.map(l => {
    const t = l.say || l.text, k = Object.keys(ASR).find(x => x.toLowerCase() === t.toLowerCase());
    return { id: l.id, text: t, voice: 'am_michael', speed: 0.98, ...(k ? { asr: ASR[k] } : {}) };
  }), null, 1));
  console.log('day', day, 'dur', D.dur, 'lines', D.lines.length);
}
