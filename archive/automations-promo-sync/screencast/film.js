// film.js — the seven Living Screencast days (2, 3, 8, 9, 11, 12, 13)
import * as B from './brand.js';
import * as UI from './ui.js';
import { potato, spark, bang, dust, trail, icon, POTATO } from './sprite.js';
import { DAYS, WORKFLOWS } from './timeline.js';

const { W, H, PAL, ACCENT, GREEN, clamp, lerp, seg, eo, eio, back, spring, hash, TAU, rgba, text, mono, caption, desktop, vignette, menuBar, cursor: cur, liveDot, chip, font } = B;

export const DAY_NUMBERS = [2, 3, 8, 9, 11, 12, 13];

/* ── camera ──────────────────────────────────────────────── */
function camAt(bt, body) {
  const K = body.cam;
  let x = 540, y = 960, z = 1;
  if (bt <= K[0][0]) { [, x, y, z] = K[0]; }
  else if (bt >= K[K.length - 1][0]) { [, x, y, z] = K[K.length - 1]; }
  else for (let i = 1; i < K.length; i++) {
    if (bt <= K[i][0]) {
      const u = eio(seg(bt, K[i - 1][0], K[i][0])), a = K[i - 1], b = K[i];
      x = lerp(a[1], b[1], u); y = lerp(a[2], b[2], u); z = Math.exp(lerp(Math.log(a[3]), Math.log(b[3]), u));
      break;
    }
  }
  // keep the app window from sliding off into empty wallpaper (screen-recorder framing)
  if (z > 1.08 && z <= 1.45) {
    const xMin = 48 + 500 / z, xMax = 1032 - 500 / z;
    x = xMin <= xMax ? clamp(x, xMin, xMax) : 540;
    const yMin = 196 + 240 / z, yMax = 1676 - 860 / z;
    y = yMin <= yMax ? clamp(y, yMin, yMax) : 936;
  }
  return { x, y, z };
}
function applyCam(g, c, drift = 0) {
  const dx = drift ? Math.sin(drift * .62) * 3.2 : 0, dy = drift ? Math.cos(drift * .51) * 2.4 : 0;
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.translate(W / 2, H / 2); g.scale(c.z, c.z); g.translate(-(c.x + dx), -(c.y + dy));
}
const toScreen = (p, c) => ({ x: (p.x - c.x) * c.z + W / 2, y: (p.y - c.y) * c.z + H / 2 });

/* ── the potato actor ────────────────────────────────────── */
const cardAt = bt => {
  const u = eio(seg(bt, 28.1, 30.3));
  return { cx: lerp(700, 1320, u), cy: lerp(960, 600, u) - Math.sin(u * Math.PI) * 40, u };
};
function mascotAt(bt, b, t) {
  const m0 = mascotBase(bt, b, t);
  if (!m0) return null;
  // while a node detail view is open, the potato stands on the panel's top edge
  const p = b.panels?.find(p => bt >= p.t0 && bt <= p.t1);
  if (!p || (b.climb && bt >= b.climb.t0 - .2) || (b.ride && bt >= b.ride.t0 - .45)) return m0;
  const u = eio(seg(bt, p.t0, p.t0 + .34)) * (1 - eio(seg(bt, p.t1 - .26, p.t1)));
  if (u > .001) {
    const pm = {
      ...m0, x: lerp(m0.x, UI.PANEL.x + 132, u), y: lerp(m0.y, UI.PANEL.y, u) - Math.sin(Math.PI * u) * 46,
      sq: u < .97 ? -.04 : 0, air: u > .03 && u < .97, eyes: 'd', legs: u > .1 && u < .9 ? 'tuck' : 'stand',
    };
    return statLift(pm, bt, b);
  }
  return statLift(m0, bt, b);
}
// when the run-summary card lands over the potato's perch, it hops up onto the card's top edge
function statLift(m, bt, b) {
  if (b.stat == null || bt < b.stat - .45) return m;
  if (b.ride && bt >= b.ride.t0 - .45) return m;
  const cardTop = 900 - 280, cardX = 540 + 420 - 84;
  if (!(m.y > cardTop + 30 && m.y < 1220)) return m;    // only when the card covers its perch
  const u = eio(seg(bt, b.stat - .45, b.stat + .02));
  return {
    ...m, x: lerp(m.x, cardX, u), y: lerp(m.y, cardTop, u) - Math.sin(Math.PI * u) * 70,
    sq: u < .96 ? -.05 : 0, air: u > .03 && u < .96, eyes: 'n', legs: u > .05 && u < .95 ? 'tuck' : 'stand',
  };
}
function mascotBase(bt, b, t) {
  const P = b.mascot; if (!P) return null;
  if (b.ride && bt >= b.ride.t0 - .38) {
    const c = cardAt(Math.max(28.1, bt));
    const on = { x: c.cx - 118, y: c.cy - 44 };
    if (bt < b.ride.t0) {
      const u = eio(seg(bt, b.ride.t0 - .42, b.ride.t0));
      const a = { x: 660, y: UI.PANEL.y };
      return { x: lerp(a.x, on.x, u), y: lerp(a.y, on.y, u) - Math.sin(Math.PI * u) * 150, sq: -.08, air: u < 1, arms: 'up', eyes: 'u', legs: 'tuck' };
    }
    return { x: on.x, y: on.y, sq: 0, air: false, arms: 'up', eyes: 'happy', riding: true };
  }
  if (b.climb && bt >= b.climb.t0) {
    const bars = UI.scoreLayout();
    const k = Math.min(bars.length - 1, Math.floor((bt - b.climb.t0) / b.climb.step));
    const p = bars[k], u = seg(bt, b.climb.t0 + k * b.climb.step, b.climb.t0 + k * b.climb.step + .4);
    const prev = bars[Math.max(0, k - 1)];
    const x = k === 0 ? p.x + p.w / 2 : lerp(prev.x + prev.w / 2, p.x + p.w / 2, eio(u));
    const y = k === 0 ? p.base - p.h : lerp(prev.base - prev.h, p.base - p.h, eio(u)) - Math.sin(eio(u) * Math.PI) * 46;
    return { x, y, sq: u < 1 ? -.06 : (bt - (b.climb.t0 + k * b.climb.step + .4) < .18 ? .16 : 0), air: u < 1, arms: k === bars.length - 1 ? 'up' : 'down', eyes: 'u' };
  }
  if (bt < P[0][0] - .34) return null;
  if (bt < P[0][0]) {
    const u = eio(seg(bt, P[0][0] - .32, P[0][0]));
    return { x: P[0][1], y: lerp(P[0][2] - 250, P[0][2], u), sq: -.1, air: true, eyes: 'd' };
  }
  for (let i = 0; i < P.length; i++) {
    if (i === P.length - 1 || bt < P[i + 1][0]) {
      const a = P[i], nx = P[i + 1];
      const rest = !nx || bt < nx[0] - .34;
      if (rest) return { x: a[1], y: a[2], sq: 0, eyes: 'n', legs: 'stand', idleT: bt - a[0] };
      const u = seg(bt, nx[0] - .34, nx[0] - .04);
      const e = eio(u), dx = nx[1] - a[1], dy = nx[2] - a[2];
      const hop = Math.min(150, Math.hypot(dx, dy) * .4);
      return {
        x: lerp(a[1], nx[1], e), y: lerp(a[2], nx[2], e) - Math.sin(Math.PI * e) * hop,
        sq: u < .18 ? -.12 : u > .82 ? .1 : 0, air: u > .15 && u < .88,
        dir: dx, legs: u > .15 && u < .88 ? 'tuck' : 'walk', eyes: 'd',
        land: bt > nx[0] - .14 && bt < nx[0] + .12 ? .26 : 0,
      };
    }
  }
  return { x: P[P.length - 1][1], y: P[P.length - 1][2], sq: 0, eyes: 'n' };
}

function drawMascot(g, t, bt, b, cam) {
  const m = mascotAt(bt, b, t); if (!m) return;
  const blink = (bt + hash(Math.floor(bt * .7) * 3) * 2) % 3.1 < .1;
  const cheer = b.stat != null && bt > b.stat + .5;
  const eyes = m.eyes && m.eyes !== 'n' ? m.eyes : cheer ? 'happy' : blink ? 'blink' : 'n';
  const arms = m.arms || (cheer ? 'up' : 'down');
  const bob = m.air ? 0 : Math.sin(bt * Math.PI * 2 * 1.05) * .012;
  const sq = (m.sq || 0) + bob;
  const px = 9;
  const legs = m.legs === 'walk' ? (Math.floor(bt * 9) % 2 ? 'walkA' : 'walkB') : (m.legs || 'stand');
  potato(g, { x: m.x, y: m.y, px, sq, eyes, arms, legs, flip: (m.dir || 0) < -40 });
  // landing dust + take-off trail
  b.mascot.forEach((p, i) => { if (i && bt > p[0] && bt < p[0] + .32) dust(g, p[1], p[2], seg(bt, p[0], p[0] + .32), 4.5, 6, i); });
  if (m.air) trail(g, m.x, m.y, 1, seg(bt % 1, 0, .5), 3.5);
  if (m.riding) { /* the message does the moving */ }
  if (m.x && b.stat != null && bt > b.stat + .45 && bt < b.stat + 1.1) {
    const k = seg(bt, b.stat + .45, b.stat + 1.1);
    spark(g, m.x + 92 + k * 20, m.y - 120 - k * 26, 5.5, ACCENT, 1 - k);
    spark(g, m.x - 92 - k * 16, m.y - 130 - k * 20, 4.5, ACCENT, 1 - k);
  }
}

/* ── running window ──────────────────────────────────────── */
function drawRun(g, t, bt, D) {
  const wf = WORKFLOWS[D.body.wf], b = D.body;
  const rects = UI.nodeRects(wf.nodes.length);
  const doneT = b.nodes.map((n, i) => (b.nodes[i + 1] ?? n + 2.4) - .35);
  const state = b.nodes.map((n, i) => bt >= doneT[i] ? 'done' : bt >= n ? 'run' : 'idle');
  const lastDone = doneT[doneT.length - 1];
  const prog = clamp((bt - b.nodes[0]) / Math.max(.1, lastDone - b.nodes[0])) * (bt >= b.nodes[0] ? 1 : 0);
  const running = bt >= b.nodes[0] - .1 && bt < lastDone + .2;

  UI.windowFrame(g, t, {
    file: wf.file, running: running ? 1 : 0, done: bt >= lastDone + .2 ? 1 : 0,
    counter: bt > b.nodes[0] - .2 ? `${Math.round(wf.total * prog)} / ${wf.total}` : `0 / ${wf.total}`,
    progress: prog,
  });

  UI.drawWires(g, bt, { rects, state, activeT: b.nodes, gap: doneT.map((d, i) => d - b.nodes[i]) });
  rects.forEach((r, i) => UI.drawNode(g, bt, r, wf.nodes[i], state[i]));

  // detail panel
  if (b.panels) b.panels.forEach(p => { if (bt >= p.t0 - .01 && bt <= p.t1 + .01) UI.detailPanel(g, bt, p, wf.nodes[p.node], { approve: b.approve }); });
  // toasts
  if (b.toasts) b.toasts.forEach(p => {
    const a = Math.min(eo(seg(bt, p.t0, p.t0 + .22)), 1 - eio(seg(bt, p.t1 - .25, p.t1)));
    UI.toast(g, bt, p.node, rects[p.node], p.text, a);
  });
  // sent message (day 13) — the mascot rides it out
  if (b.ride && bt >= 28.1) {
    const c = cardAt(bt);
    const cx = c.cx, cy = c.cy, u = c.u;
    const w = 470, h = 78;
    g.save(); g.globalAlpha = 1 - eio(seg(bt, 30.0, 30.35));
    g.translate(cx, cy); g.rotate(-.06 - u * .1);
    g.shadowColor = 'rgba(0,0,0,.6)'; g.shadowBlur = 34; g.shadowOffsetY = 14;
    g.fillStyle = '#1d2634'; B.rr(g, -w / 2, -h / 2, w, h, 10); g.fill(); g.shadowColor = 'transparent';
    g.strokeStyle = rgba(ACCENT, .55); g.lineWidth = 1.2; B.rr(g, -w / 2 + .5, -h / 2 + .5, w - 1, h - 1, 10); g.stroke();
    icon(g, 'send', -w / 2 + 30, 0, 22, ACCENT);
    text(g, 'digest · 24 leads · 07:00', -w / 2 + 58, 7, { px: 19, fam: 'mono', color: PAL.text });
    liveDot(g, w / 2 - 60, 0, t, .7, 'sent', GREEN);
    g.restore();
  }
  // totals
  if (b.stat != null && bt >= b.stat - .5) UI.statPlate(g, bt, wf, b.stat);
}

/* ── cursor from the body script ─────────────────────────── */
function cursorAt(g, bt, b, cam, t) {
  const K = b.cursor; if (!K) return;
  let x = K[0][1], y = K[0][2], op = K[0][3] || 0;
  if (bt <= K[0][0]) { op = 0; }
  else for (let i = 1; i < K.length; i++) {
    if (bt <= K[i][0]) {
      const u = eio(seg(bt, K[i - 1][0], K[i][0]));
      x = lerp(K[i - 1][1], K[i][1], u); y = lerp(K[i - 1][2], K[i][2], u);
      op = lerp(K[i - 1][3] || 0, K[i][3] || 0, eio(seg(bt, K[i - 1][0], K[i][0])));
      break;
    }
    x = K[i][1]; y = K[i][2]; op = K[i][3] || 0;
  }
  if (bt < .2) op = 0;
  const s = toScreen({ x, y }, cam);
  let ring = 0;
  for (const k of K) if (k[4] && bt >= k[0] && bt < k[0] + .34) ring = Math.max(ring, (bt - k[0]) / .34);
  if (op > .01) cur(g, s.x, s.y, { op, ring, sc: 1.3 });
}

/* ── intro scenes ────────────────────────────────────────── */
function drawIntro(g, t, D) {
  if (D.intro === 'hookC') UI.hookTyped(g, t, .25);
  else if (D.intro === 'relay') UI.relay(g, t, 0);
  else if (D.intro === 'hookB') {
    UI.backlog(g, t, 0);
    mono(g, '06:40 · monday', 986, 254, { px: 17, color: PAL.mute, align: 'right', track: .1 });
  }
}

/* ── end card ────────────────────────────────────────────── */
function drawEnd(g, t, D) {
  const cta = D.cta;
  // amber bloom behind the card
  const a = eo(seg(t, cta, cta + .8));
  const gr = g.createRadialGradient(W / 2, 900, 0, W / 2, 900, 620);
  gr.addColorStop(0, rgba(ACCENT, .07 * a)); gr.addColorStop(1, rgba(ACCENT, 0));
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  UI.endCard(g, t, cta);
  if (t > cta + 4.0) {
    const u = eo(seg(t, cta + 4.0, cta + 4.4));
    g.save(); g.globalAlpha = u;
    potato(g, { x: 818, y: 1140, px: 9, sq: Math.sin(t * 6.2) * .03, eyes: (t * .7) % 3.1 < .1 ? 'blink' : 'happy', arms: Math.floor(t * 3) % 2 ? 'wave' : 'up' });
    g.restore();
    if (Math.floor(t * 2) % 3 === 0) spark(g, 878, 1012, 4.5, ACCENT, .7);
  }
}

/* ── the film ────────────────────────────────────────────── */
export function createFilm(day, durs = {}) {
  const D = DAYS[day], wf = WORKFLOWS[D.body.wf], b = D.body;
  const dur = D.dur;

  const cues = D.lines.map((l, i) => {
    const d = durs[l.id] ?? Math.max(1.8, [...l.text].length / 14);
    const nxt = D.lines[i + 1];
    const t1 = Math.min(dur - .15, Math.max(l.t + 1.8, l.t + d + .6), nxt ? nxt.t - .06 : 99);
    return { id: l.id, t0: l.t, t1, text: l.text };
  }).filter(c => c.t1 > c.t0 + .4);

  function cueAt(t) { for (const c of cues) if (t >= c.t0 - .05 && t <= c.t1) return c; return null; }

  function drawCaptions(g, t) {
    const c = cueAt(t); if (!c) return;
    const a = Math.min(clamp((t - c.t0) / .16), clamp((c.t1 - t) / .2));
    caption(g, c.text, a);
  }

  function render(g, t) {
    g.setTransform(1, 0, 0, 1, 0, 0); g.filter = 'none'; g.globalAlpha = 1;
    const rects = UI.nodeRects(wf.nodes.length);
    const bt = t - D.bodyStart;

    if (t >= D.cta) {
      B.desktop(g, t, { grid: .8 });
      drawEnd(g, t, D);
      drawCaptions(g, t);
      return;
    }

    // background
    B.desktop(g, t, { lift: 1 });
    menuBar(g, t, { clock: D.intro === 'relay' ? '06:12' : D.intro === 'hookB' ? '06:40' : t > D.bodyStart ? '07:14' : '06:12' });
    // chapter pill above the window
    const chap = t < D.bodyStart ? (D.intro === 'relay' ? 'before' : D.intro === 'hookB' ? 'before' : 'before') : 'the run';
    g.save(); g.globalAlpha = .95;
    const cw = 148, cx0 = W - 56 - cw;
    g.fillStyle = 'rgba(255,255,255,.035)'; B.rr(g, cx0, 118, cw, 38, 19); g.fill();
    g.strokeStyle = 'rgba(255,255,255,.10)'; g.lineWidth = 1; B.rr(g, cx0 + .5, 118.5, cw - 1, 37, 19); g.stroke(); g.restore();
    text(g, t < D.bodyStart ? '00 · before' : '01 · the run', cx0 + cw / 2, 143, { px: 14, wt: 500, fam: 'mono', color: PAL.dim, align: 'center', track: .06 });

    // scene: intro or running window
    const inIntro = t < D.bodyStart;
    if (inIntro) {
      g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
      drawIntro(g, t, D);
      g.restore();
    } else {
      const cam = camAt(bt, b);
      const camPrev = camAt(bt - 1 / 30, b);
      const v = Math.hypot((cam.x - camPrev.x) * cam.z, (cam.y - camPrev.y) * cam.z) * 30;
      const blur = v > 1500 ? Math.min(7, (v - 1500) / 420) : 0;
      const closeA = 1 - eio(seg(t, D.cta - .42, D.cta - .02));
      if (blur > .3) {
        // motion blur: render the screen once into an offscreen layer, then composite it with a single
        // anisotropic filter (applying ctx.filter per shape would cost thousands of blur passes)
        const oc = mbCanvas(), og = oc.getContext('2d');
        og.setTransform(1, 0, 0, 1, 0, 0); og.globalAlpha = 1; og.clearRect(0, 0, W, H);
        applyCam(og, cam, bt);
        drawRun(og, t, bt, D);
        drawMascot(og, t, bt, b, cam);
        g.save(); g.globalAlpha = closeA;
        g.setTransform(1, 0, 0, 1, 0, 0);
        g.filter = `blur(${blur.toFixed(2)}px)`;
        g.drawImage(oc, 0, 0);
        g.filter = 'none'; g.restore();
      } else {
        g.save(); g.globalAlpha = closeA;
        applyCam(g, cam, bt);
        drawRun(g, t, bt, D);
        drawMascot(g, t, bt, b, cam);
        g.restore();
      }
      g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = closeA;
      cursorAt(g, bt, b, cam, t);
      g.restore();
      // intro→run cut
      if (t > D.bodyStart - .02 && t < D.bodyStart + .16) {
        const u = seg(t, D.bodyStart - .02, D.bodyStart + .16);
        g.save(); g.globalAlpha = .55 * (1 - u); g.fillStyle = '#ffffff'; g.fillRect(0, 0, W, H); g.restore();
      }
    }
    B.vignette(g, .48);
    drawCaptions(g, t);
  }

  /* ── TEXTS: what the viewer is meant to read ─────────── */
  function texts(t) {
    const out = [];
    const bt = t - D.bodyStart;
    const push = (id, str, wx0, wy0, wx1, wy1, cam, pass = false) => {
      const a = toScreen({ x: wx0, y: wy0 }, cam), b2 = toScreen({ x: wx1, y: wy1 }, cam);
      const x0 = Math.min(a.x, b2.x), y0 = Math.min(a.y, b2.y), x1 = Math.max(a.x, b2.x), y1 = Math.max(a.y, b2.y);
      if (!pass && !(x0 >= 0 && y0 >= 0 && x1 <= W && y1 <= H)) return;
      out.push({ id, text: str, x0, y0, x1, y1, ...(pass ? { pass: true } : {}) });
    };
    if (t < D.cta) {
      if (t < D.bodyStart) {
        if (D.intro === 'hookC') {
          const appear = t > .35 ? 1 : 0;
          if (appear) out.push({ id: 'hook', text: 'You hired a person to be a cable.', x0: 90, y0: 826, x1: 900, y1: 1006 });
        } else if (D.intro === 'hookB') push('bl-title', 'crm · leads (stale)', 174, 328, 600, 360, { x: 540, y: 960, z: 1 });
        else if (D.intro === 'relay') {
          ['invoices.csv', 'Inbox — follow-ups', 'CRM — deals'].forEach((s, i) => push('rel-' + i, s, 156, 348 + i * 440, 520, 376 + i * 440, { x: 540, y: 960, z: 1 }));
        }
      } else {
        const cam = camAt(Math.min(bt, b.len), b);
        const rects = UI.nodeRects(wf.nodes.length);
        wf.nodes.forEach((n, i) => {
          const r = rects[i];
          const w = B.measure(gTmp, n.title, 29, 500);
          push('node-' + i, n.title, r.x + 100, r.y + r.h / 2 - 32, r.x + 100 + w, r.y + r.h / 2 + 8, cam);
          push('sub-' + i, n.sub, r.x + 100, r.y + r.h / 2 + 16, r.x + 100 + 240, r.y + r.h / 2 + 36, cam, true);
        });
        if (b.stat != null && bt > b.stat - .2) {
          push('stat', wf.stat[0] + ' ' + wf.stat[1], 330, 850, 830, 1100, cam);
          push('statsub', wf.statSub, 330, 1100, 830, 1130, cam, true);
        }
      }
    } else {
      if (t > D.cta + .3) out.push({ id: 'cta', text: 'Book a fit call', x0: 180, y0: 892, x1: 900, y1: 982 });
      if (t > D.cta + 3.1) out.push({ id: 'url', text: 'inodepi.github.io', x0: 330, y0: 1048, x1: 730, y1: 1098 });
      if (t > D.cta + 4.0) out.push({ id: 'tag', text: 'one process · two to three weeks · yours', x0: 150, y0: 1190, x1: 930, y1: 1224, pass: true });
    }
    return out;
  }

  return { render, texts, cues, dur };
}

// measuring helper: an offscreen 2d context (deterministic, no DOM layout)
const gTmp = (() => { const c = document.createElement('canvas'); c.width = 8; c.height = 8; return c.getContext('2d'); })();

// one reusable offscreen layer for whip motion blur
let _mb = null;
function mbCanvas() {
  if (!_mb) { _mb = document.createElement('canvas'); _mb.width = W; _mb.height = H; }
  return _mb;
}
