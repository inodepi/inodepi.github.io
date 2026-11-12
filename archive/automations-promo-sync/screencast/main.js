import { createFilm, DAY_NUMBERS } from './film.js';
import { DAYS } from './timeline.js';

const cv = document.getElementById('c');
cv.width = innerWidth; cv.height = innerHeight;
const g = cv.getContext('2d');

await Promise.all([300, 400, 500, 600, 700].flatMap(w =>
  [`${w} 40px Inter`, `${w} 40px InterTight`, `${w} 40px JBMono`].map(f => document.fonts.load(f))
));

const Q = new URLSearchParams(location.search);
const day = clampDay(parseInt(Q.get('day') || '2', 10));
const D = DAYS[day];
const nn = String(day).padStart(2, '0');
const durs = await (async () => { try { const r = await fetch(`voices/dur_day${nn}.json`); return r.ok ? await r.json() : {}; } catch { return {}; } })();

const film = createFilm(day, durs);
window.DUR = film.dur;
window.EV = D.ev;
window.SUBS = film.cues.map(c => ({ t0: c.t0, t1: c.t1, text: c.text }));
window.TEXTS = film.texts;
window.render = t => film.render(g, t);
window.READY = true;

function clampDay(d) { return DAY_NUMBERS.includes(d) ? d : 2; }
