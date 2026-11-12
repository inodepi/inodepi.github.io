import { createFilm, DAY_NUMBERS } from './film.js';
import { DAYS } from './timeline.js';

const cv = document.getElementById('c');
cv.width = innerWidth; cv.height = innerHeight;
const g = cv.getContext('2d');

await Promise.all([300, 400, 500, 600, 700].flatMap(w =>
  [`${w} 40px Inter`, `${w} 40px InterTight`, `${w} 40px JBMono`].map(f => document.fonts.load(f))
));

const Q = new URLSearchParams(location.search);
const day = clampDay(parseInt(Q.get('day') || '1', 10));
const D = DAYS[day];
const get = async (u, d) => { try { const r = await fetch(u); return r.ok ? await r.json() : d; } catch { return d; } };
const durs = await get(`voices/dur_day${String(day).padStart(2, '0')}.json`, {});

const film = createFilm(day, durs);
window.DUR = film.dur;
window.EV = D.ev;
window.SUBS = film.cues;
window.TEXTS = film.texts;
window.render = t => film.render(g, t);
window.READY = true;

function clampDay(d) { return DAY_NUMBERS.includes(d) ? d : 1; }
