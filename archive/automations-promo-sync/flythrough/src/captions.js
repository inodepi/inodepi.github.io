// Burned captions: one cue per line, bottom centre, ink bar at 72 %. Cues come from src/cues.js.
// The CTA cue gets the amber bar. There is no sign-off card (the library's credit stays empty).
import { seg, eo } from '/core/lib.js';

export function makeSubs(SUBS, END) {
  const host = document.getElementById('sub'), txt = host.querySelector('.txt'), credit = document.getElementById('credit');
  let cur = null;
  const clean = new URLSearchParams(location.search).has('nosub');
  function render(t) {
    if (clean) { host.style.display = 'none'; credit.style.display = 'none'; return; }
    let i = -1;
    for (let k = 0; k < SUBS.length; k++) if (t >= SUBS[k].t0 && t < SUBS[k].t1) i = k;
    if (i !== cur) {
      cur = i;
      if (i >= 0) { txt.textContent = SUBS[i].text; host.classList.toggle('cta', !!SUBS[i].cta); }
    }
    if (i >= 0) {
      const c = SUBS[i], a = Math.min(eo(seg(t, c.t0, c.t0 + .14)), 1 - seg(t, c.t1 - .12, c.t1));
      host.style.display = 'flex'; host.style.opacity = a;
      host.style.transform = `translate(-50%, ${(1 - a) * 8}px)`;
    } else host.style.display = 'none';
    credit.style.display = 'none';
  }
  function texts() { return []; }   // the subtitle bar's hold is set by the cue sheet, not by readcheck
  return { render, texts };
}
