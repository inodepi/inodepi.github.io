// poster_t.mjs <day> — the signature frame for the poster still
import { DAYS } from '../timeline.js';
const day = +process.argv[2];
const D = DAYS[day], b = D.body;
// per-day picks that keep the seven posters distinct
const PICK = { 3: 3.0, 11: 16.0, 13: 27.0 };
const t = PICK[day] ?? (b.ride ? 27.0 : b.stat != null ? D.bodyStart + b.stat + 2.2 : D.cta + 4.3);
process.stdout.write(String(+t.toFixed(2)));
