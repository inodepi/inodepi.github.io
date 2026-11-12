// export_day.mjs — write the voice lines and the audio timeline for the screencast days
// node screencast/tools/export_day.mjs [day ...]
import fs from 'fs';
import path from 'path';
import { DAYS } from '../timeline.js';
const here = path.dirname(new URL(import.meta.url).pathname);
const out = path.resolve(here, '../voices');
fs.mkdirSync(out, { recursive: true });
const only = process.argv.slice(2).map(Number);
for (const [day, D] of Object.entries(DAYS)) {
  if (only.length && !only.includes(+day)) continue;
  const nn = String(day).padStart(2, '0');
  fs.writeFileSync(path.join(out, `timeline_day${nn}.json`),
    JSON.stringify({ day: +day, dur: D.dur, fps: D.fps, lines: D.lines.map(l => ({ id: l.id, t0: l.t, text: l.say || l.text })), ev: D.ev, sect: D.sect }, null, 1));
  // Whisper's consistent mishearings of otherwise correct VO (brand words and hyphenated compounds)
  const ASR = {
    'book a fit call.': 'book a fitcorn.',
    'inodepi dot github dot eye oh': 'patera.github.io',
    'no spreadsheet. no copy-paste.': 'no spreadsheet, no copper paste.',
    'the copy-paste morning.': 'the cop apaced morning.',
    'your best employee is copy-pasting.': 'your best employee is copa-pasting.',
    'a hundred and twenty-eight calls a week.': '128 calls a week.',
    'the score card lands on the crm record.': 'the scorecard lands on the crm record.',
    'a weak call alerts the rep the same day.': 'a week call alerts the rep the same day.',
    'coaching, not a spreadsheet review.': 'coaching na spreadsheet review.',
    'a lead comes in at two a.m.': 'a lead comes in a 2a m.',
    'enriched, deduped, and routed.': 'enriched the duped and routed.',
    'a digest lands in your inbox at seven.': 'a die just lands in your inbox at seven.',
  };
  fs.writeFileSync(path.join(out, `lines_day${nn}.json`),
    JSON.stringify(D.lines.map(l => {
      const t = l.say || l.text, k = Object.keys(ASR).find(x => x === t.toLowerCase());
      return { id: l.id, text: t, voice: 'am_michael', speed: 0.98, ...(k ? { asr: ASR[k] } : {}) };
    }), null, 1));
  console.log('day', day, 'dur', D.dur, 'lines', D.lines.length, 'events', D.ev.length);
}
