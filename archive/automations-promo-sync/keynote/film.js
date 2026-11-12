// film.js — the five Dark Tech Keynote days (1, 4, 5, 6, 14) for the inodepi automations campaign.
import * as K from './k.js';
import { DAYS, CATEGORIES, BUILDS, S16 } from './timeline.js';

const { E, VW, VH, SAFE, ACCENT, GREEN, CREAM } = K;
const { seg, ss, eo, ei, eio, back, lerp, clamp, hash, TAU, rr, font, rgba } = E;

export const DAY_NUMBERS = [1, 4, 5, 6, 14];

const BOUND = { 1: [3.2, 12, 26, 40, 51.6], 5: [18.0, 24.0], 6: [17.6], 14: [4.2, 10.3, 13, 22] };

function wipe(g, t, b) {
  const u = (t - b) / 0.22;
  if (u <= 0 || u >= 1) return;
  const a = 1 - eo(u);
  g.save(); g.globalAlpha = a;
  const h = lerp(6, VH * 1.05, eo(u)), w = lerp(160, VW * 1.02, eo(u));
  g.fillStyle = E.PAL.surf2; rr(g, VW / 2 - w / 2, VH / 2 - h / 2, w, h, lerp(3, 30, u)); g.fill();
  g.strokeStyle = 'rgba(255,255,255,.12)'; g.lineWidth = 1; g.stroke();
  g.restore();
}
function sectionLabel(g, text, y, a = 1) {
  K.mono(g, text, SAFE, y, { align: 'left', px: 22, color: E.PAL.mute, alpha: a });
}
function chip(g, text, x, y, w, h, a = 1) {
  g.save(); g.globalAlpha *= a;
  E.panel(g, x - w / 2, y - h / 2, w, h, { r: 10, fill: E.PAL.surf3, shadow: 1, cheap: true });
  g.fillStyle = E.PAL.dim; g.font = font(15, 600, 'mono'); g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, x, y + 1); g.restore();
}

/* ─── shared pieces ─────────────────────────────────────── */
function buildCard(g, b, x, y, w, h, t, i, alpha = 1) {
  const tin = 12.6 + i * 0.5;
  if (t < tin) return;
  const u = back(clamp((t - tin) / 0.42, 0, 1), 1.2);
  g.save(); g.globalAlpha *= alpha * clamp(u, 0, 1);
  g.translate(x + w / 2, y + h / 2); g.scale(lerp(0.94, 1, u), lerp(0.94, 1, u)); g.translate(-(x + w / 2), -(y + h / 2));
  E.panel(g, x, y, w, h, { r: 24, fill: E.PAL.surf });
  K.mono(g, b.note, x + 28, y + 46, { align: 'left', px: 16, color: E.PAL.mute });
  K.mono(g, b.title, x + 28, y + 78, { align: 'left', px: 20, color: E.PAL.dim });
  const lockT = [15.6, 18.2, 20.8, 22.6][i];
  K.stat(g, b.value, null, x + 28, y + 186, { px: 92, lockT, t });
  K.mono(g, b.label, x + 28, y + 228, { align: 'left', px: 17, color: E.PAL.mute });
  K.liveDot(g, x + 36, y + h - 34, t, 0.9, 'running now');
  g.restore();
}

/* ─── DAY 1 — master ────────────────────────────────────── */
function day1(g, t, film) {
  K.vbg(g);
  K.vgrid(g, { alpha: t < 12 ? 1 : 0.8 });

  if (t < 3.2) {
    K.mono(g, '// an automation film', VW / 2, 520, { px: 22, color: E.PAL.mute });
    K.typed(g, 'You hired a person', VW / 2 - 430, 780, 78, 0.35, t, { cps: 22, caretOn: t < 1.3 });
    K.typed(g, 'to be a cable.', VW / 2 - 430, 890, 78, 1.35, t, { cps: 22 });
  } else if (t < 12) {
    sectionLabel(g, 'the copy-paste tax', 300);
    K.mono(g, '06:12 AM', VW - SAFE, 300, { align: 'right', px: 26, color: E.PAL.dim });
    const dim = t > 11.2 ? lerp(1, 0.35, seg(t, 11.2, 11.8)) : 1;
    const cards = [
      { y: 420, title: 'clients.csv', kind: 'sheet' },
      { y: 800, title: 'Inbox — follow-ups', kind: 'inbox' },
      { y: 1180, title: 'CRM — deals', kind: 'browser' },
    ];
    cards.forEach((c, ci) => {
      g.save(); g.globalAlpha = dim;
      const r = E.windowBox(g, 110, c.y, 860, 280, { title: c.title, app: 3 + ci });
      E.windowContent(g, r, c.kind, { seed: ci + 3, n: 7, scroll: t * 34 });
      g.restore();
    });
    // chips flying between the cards, every 0.5 s
    for (let k = 0; ; k++) {
      const t0 = 4.0 + k * 0.5; if (t0 > 11.4) break;
      const u = (t - t0) / 0.62;
      if (u < 0 || u > 1.6) continue;
      let x, y;
      if (u <= 1) {
        const e = eio(clamp(u, 0, 1));
        x = lerp(540, 540, e) + 320 * Math.sin(Math.PI * e);
        y = lerp(700, 940, e);
        if (u > 0.55) { const e2 = eio(clamp((u - 0.55) / 0.45, 0, 1)); y = lerp(940, 1320, e2); }
      } else {
        const e = eio(clamp(u - 1, 0, 1));
        x = 540 + 300 * Math.sin(Math.PI * e); y = lerp(1320, 1320, e);
      }
      chip(g, 'client_' + String(210 + (k % 60)).padStart(4, '0'), x, y, 170, 46, dim * (u > 1.45 ? 0.3 : 1));
    }
    if (t > 10.6) {
      g.save(); g.globalAlpha = 0.9;
      E.badge(g, VW - SAFE - 60, 340, '19 manual steps', 1.1);
      g.restore();
    }
    K.mono(g, 'copy → paste → repeat', VW / 2, 1560, { px: 24, color: E.PAL.mute, alpha: 0.9 });
  } else if (t < 26) {
    const u = seg(t, 12, 13.4);
    g.save();
    const s = lerp(1.22, 1, eio(u));
    g.translate(VW / 2, 900); g.scale(s, s); g.translate(-VW / 2, -900);
    sectionLabel(g, 'the proof', 430);
    BUILDS.forEach((b, i) => buildCard(g, b, 70 + (i % 2) * 480, 520 + Math.floor(i / 2) * 410, 460, 380, t, i));
    g.restore();
  } else if (t < 40) {
    K.headline(g, 'Not the list.', VW / 2, 470, { px: 72, maxw: 900 });
    sectionLabel(g, 'anything repetitive that runs on a computer', 560);
    const appear = 28.6;
    CATEGORIES.forEach((c, i) => {
      const t0 = appear + i * 2.0;
      const a = clamp((t - t0) / 0.3, 0, 1);
      if (a <= 0) return;
      const u = back(clamp((t - t0) / 0.42, 0, 1), 1.1);
      const x = lerp(VW, SAFE, u);
      K.categoryRow(g, c[0], c[1], x, 650 + i * 168, 912, a);
    });
  } else if (t < 51.6) {
    K.stamp(g, 'built in n8n — your stack, your tools', VW / 2, 430, clamp((t - 40.3) / 0.3, 0, 1));
    K.typed(g, 'Pick the process', VW / 2 - 420, 680, 64, 43.5, t, { cps: 34 });
    K.typed(g, 'that eats your week.', VW / 2 - 420, 770, 64, 44.35, t, { cps: 34 });
    if (t > 47.1) {
      E.panel(g, 110, 920, 860, 250, { r: 22 });
      K.mono(g, 'process', 142, 980, { align: 'left', px: 17, color: E.PAL.mute });
      g.fillStyle = E.PAL.text; g.font = font(40, 600); g.textAlign = 'left'; g.textBaseline = 'alphabetic';
      g.fillText('invoice follow-up', 142, 1042);
      K.liveDot(g, 150, 1100, t, 0.9, 'automated in 2–3 weeks');
    }
    if (t > 48.6) K.toggleCard(g, 110, 1210, 860, 170, t > 49.9, t);
  } else {
    const u = seg(t, 56.2, 56.8);
    g.save(); g.globalAlpha = 1 - u;
    const tile = lerp(1, 0.2, eio(u));
    if (tile > 0.3) {
      E.litShape(g, (() => { const p = new Path2D(); p.roundRect(VW / 2 - 130, 620 - 130, 260, 260, 44); return p; })(),
        { accent: true, glowR: 46, bbox: [VW / 2 - 130, 490, 260, 260], alpha: tile });
    }
    g.restore();
    if (t > 53.2) K.headline(g, 'Book a fit call', VW / 2, 1000, { px: 84, maxw: 900, alpha: clamp((t - 53.2) / 0.25, 0, 1) });
    if (t > 56.2) K.mono(g, 'inodepi.github.io', VW / 2, 1110, { px: 34, color: ACCENT, track: 0.04, alpha: clamp((t - 56.2) / 0.3, 0, 1) });
    if (t > 57.6) K.mono(g, 'automations · built in n8n', VW / 2, 1220, { px: 19, color: E.PAL.mute, alpha: clamp((t - 57.6) / 0.4, 0, 1) });
    E.caret(g, VW / 2, 1280, 26, { on: (Math.floor(t * 2) % 2 === 0 ? 1 : 0.1), color: ACCENT, glow: 0.3 });
  }

  for (const b of BOUND[1]) wipe(g, t, b);
  K.vvignette(g, 0.5);
  film.drawCaption(g, t);
}

/* ─── DAY 4 — three numbers ─────────────────────────────── */
const NUM3 = [
  { v: '47', label: 'invoices chased / week', note: 'ar-invoice-reminder-agent' },
  { v: '64', label: 'dead leads revived', note: 'dead-lead-retrieval' },
  { v: '128', label: 'calls scored / week', note: 'sales-call-qa' },
];
function day4(g, t, film) {
  K.vbg(g); K.vgrid(g, { alpha: 0.9 });
  const k = clamp(Math.floor(t / 4), 0, 2), s0 = k * 4, d = NUM3[k];
  K.mono(g, '// automations', VW / 2, 420, { px: 22, color: E.PAL.mute });
  K.stat(g, d.v, null, VW / 2, 960, { px: 330, lockT: s0 + 0.8, t, align: 'center' });
  g.save(); g.globalAlpha = clamp((t - s0 - 0.9) / 0.3, 0, 1);
  K.mono(g, d.label, VW / 2, 1070, { px: 32, color: E.PAL.dim, track: 0.03 });
  K.liveDot(g, VW / 2 - 90, 1170, t, 1.1, 'running now');
  K.mono(g, d.note, VW / 2, 1460, { px: 18, color: E.PAL.mute });
  g.restore();
  for (const b of [4, 8]) wipe(g, t, b);
  K.vvignette(g, 0.55);
  film.drawCaption(g, t);
}

/* ─── DAY 5 — the montage ───────────────────────────────── */
function day5(g, t, film) {
  K.vbg(g); K.vgrid(g, { alpha: 0.85 });
  if (t < 18.0) {
    const out = 1 - seg(t, 17.8, 18.2);
    g.save(); g.globalAlpha = out;
    K.typed(g, 'Not the list.', VW / 2 - 400, 470, 64, 1.0, t, { cps: 24 });
    sectionLabel(g, 'six things clients actually hire us for', 540);

    const rows = 650, step = 166, appear = 2.4;
    const snap = 13.6, snapEnd = 14.5;
    const su = eio(clamp((t - snap) / (snapEnd - snap), 0, 1));
    CATEGORIES.forEach((c, i) => {
      const t0 = appear + i * 1.8;
      const a = clamp((t - t0) / 0.25, 0, 1);
      if (a <= 0) return;
      if (su <= 0) {
        const u = back(clamp((t - t0) / 0.4, 0, 1), 1.1);
        K.categoryRow(g, c[0], c[1], lerp(VW, SAFE, u), rows + i * step, 912, a);
      }
    });
    if (su > 0) {
      const tw = 420, th = 250, gx = 90, gy = 640, gx2 = 570, gyStep = 300;
      CATEGORIES.forEach((c, i) => {
        const px = i % 2 === 0 ? gx : gx2, py = gy + Math.floor(i / 2) * gyStep;
        const fromX = SAFE, fromY = rows + i * step;
        const x = lerp(fromX, px, su), y = lerp(fromY, py, su);
        const w = lerp(912, tw, su), h = lerp(124, th, su);
        g.save(); g.globalAlpha = clamp((t - appear - i * 1.8) / 0.25, 0, 1);
        E.panel(g, x, y, w, h, { r: lerp(18, 22, su), fill: E.PAL.surf });
        g.fillStyle = ACCENT; g.beginPath(); g.arc(x + 44, y + 56, 8, 0, TAU); g.fill();
        g.fillStyle = E.PAL.text; g.font = font(lerp(30, 26, su), 500); g.textAlign = 'left'; g.textBaseline = 'middle';
        const label = c[0].length > 26 && su > 0.5 ? c[0].split(' & ')[0] : c[0];
        g.fillText(label, x + 72, y + 56);
        if (su > 0.6) K.mono(g, c[1], x + 72, y + 108, { align: 'left', px: 15, color: E.PAL.mute, alpha: (su - 0.6) / 0.4 });
        g.restore();
      });
    }
    if (t > 15.2) K.stamp(g, 'built in n8n — your stack, your tools', VW / 2, 1560, clamp((t - 15.2) / 0.3, 0, 1));
    g.restore();
  } else if (t < 24.0) {
    K.typed(g, 'Pick one process.', VW / 2 - 380, 720, 58, 18.6, t, { cps: 26 });
    K.mono(g, 'automated in 2–3 weeks', VW / 2, 830, { px: 30, color: ACCENT, alpha: clamp((t - 19.8) / 0.3, 0, 1) });
  } else {
    K.headline(g, 'Book a fit call', VW / 2, 900, { px: 86, maxw: 900, alpha: clamp((t - 24.2) / 0.25, 0, 1) });
    K.mono(g, 'inodepi.github.io', VW / 2, 1010, { px: 34, color: ACCENT, track: 0.04, alpha: clamp((t - 27.2) / 0.3, 0, 1) });
  }
  for (const b of BOUND[5]) wipe(g, t, b);
  K.vvignette(g, 0.55);
  film.drawCaption(g, t);
}

/* ─── DAY 6 — the offer ─────────────────────────────────── */
function day6(g, t, film) {
  K.vbg(g); K.vgrid(g, { alpha: 0.8 });
  if (t < 17.6) {
    const out = 1 - seg(t, 17.3, 17.6);
    g.save(); g.globalAlpha = out;
    sectionLabel(g, 'the offer', 360);
    K.typed(g, 'Pick the process', VW / 2 - 400, 560, 62, 1.0, t, { cps: 24 });
    K.typed(g, 'that eats your week.', VW / 2 - 400, 650, 62, 1.9, t, { cps: 24 });

    if (t > 3.8) {
      E.panel(g, 100, 800, 880, 320, { r: 24 });
      K.mono(g, 'your stack, your tools', 132, 862, { align: 'left', px: 17, color: E.PAL.mute });
      const steps = [['01', 'trigger', '4.0'], ['02', 'draft', '6.4'], ['03', 'send + log', '8.8']];
      steps.forEach((s, i) => {
        const a = clamp((t - parseFloat(s[2]) - 0.2) / 0.3, 0, 1);
        if (a <= 0) return;
        g.save(); g.globalAlpha = a;
        K.mono(g, s[0], 150 + i * 280, 960, { align: 'left', px: 18, color: ACCENT });
        g.fillStyle = E.PAL.text; g.font = font(32, 500); g.textAlign = 'left'; g.textBaseline = 'alphabetic';
        g.fillText(s[1], 150 + i * 280, 1012);
        if (i < 2) { g.fillStyle = E.PAL.mute; g.beginPath(); g.arc(150 + i * 280 + 220, 1000, 4, 0, TAU); g.fill(); }
        g.restore();
      });
      K.mono(g, 'n8n · openai · google · hubspot · sheets', 132, 1090, { align: 'left', px: 16, color: E.PAL.mute });
    }
    if (t > 10.0) {
      g.save(); g.globalAlpha = clamp((t - 10.0) / 0.3, 0, 1);
      K.mono(g, 'automated in', 150, 1400, { align: 'left', px: 22, color: E.PAL.mute });
      K.stat(g, '2–3 weeks', null, 150, 1510, { px: 96, lockT: 10.2, t });
      g.restore();
    }
    if (t > 13.8) K.toggleCard(g, 100, 1180, 880, 170, t > 14.9, t);
    g.restore();
  } else {
    K.headline(g, 'Book a fit call', VW / 2, 900, { px: 86, maxw: 900, alpha: clamp((t - 18.0) / 0.25, 0, 1) });
    K.mono(g, 'inodepi.github.io', VW / 2, 1010, { px: 34, color: ACCENT, track: 0.04, alpha: clamp((t - 21.4) / 0.3, 0, 1) });
  }
  for (const b of BOUND[6]) wipe(g, t, b);
  K.vvignette(g, 0.55);
  film.drawCaption(g, t);
}

/* ─── DAY 14 — results reel ─────────────────────────────── */
function day14(g, t, film) {
  K.vbg(g); K.vgrid(g, { alpha: 0.85 });
  if (t < 4.2) {
    K.typed(g, 'You hired a person', VW / 2 - 430, 780, 78, 0.3, t, { cps: 24 });
    K.typed(g, 'to be a cable.', VW / 2 - 430, 890, 78, 1.2, t, { cps: 24 });
  } else if (t < 10.3) {
    sectionLabel(g, 'two weeks of content', 400);
    const rowsData = [['47', 'invoices chased'], ['64', 'dead leads revived'], ['128', 'calls scored / week']];
    rowsData.forEach((r, i) => {
      const lock = [4.4, 5.2, 6.0][i];
      K.stat(g, r[0], null, 150, 720 + i * 300, { px: 140, lockT: lock, t });
      K.mono(g, r[1], 150, 800 + i * 300, { px: 24, color: E.PAL.dim, align: 'left' });
      g.save(); g.fillStyle = 'rgba(255,255,255,.07)'; g.fillRect(150, 840 + i * 300, 780, 1); g.restore();
    });
  } else if (t < 13) {
    K.headline(g, 'All of it, actually running.', VW / 2, 500, { px: 58, maxw: 900 });
    BUILDS.forEach((b, i) => {
      const t0 = 10.6 + i * 0.4;
      const a = clamp((t - t0) / 0.3, 0, 1);
      if (a <= 0) return;
      const x = 90 + (i % 2) * 460, y = 640 + Math.floor(i / 2) * 320;
      g.save(); g.globalAlpha = a;
      E.panel(g, x, y, 430, 280, { r: 20 });
      K.mono(g, b.title, x + 26, y + 52, { align: 'left', px: 19, color: E.PAL.dim });
      K.liveDot(g, x + 36, y + 120, t + i, 0.9);
      K.mono(g, b.value, x + 26, y + 210, { px: 56, color: ACCENT, align: 'left', track: -0.02 });
      K.mono(g, b.label, x + 26, y + 248, { align: 'left', px: 15, color: E.PAL.mute });
      g.restore();
    });
  } else if (t < 22) {
    K.typed(g, 'Pick the process', VW / 2 - 400, 700, 62, 13.4, t, { cps: 26 });
    K.typed(g, 'that eats your week.', VW / 2 - 400, 790, 62, 14.3, t, { cps: 26 });
    if (t > 16.0) {
      K.mono(g, '2–3 weeks', VW / 2, 980, { px: 40, color: ACCENT, alpha: clamp((t - 16.0) / 0.3, 0, 1) });
      K.mono(g, 'you approve what matters', VW / 2, 1060, { px: 28, color: E.PAL.dim, alpha: clamp((t - 17.0) / 0.3, 0, 1) });
      K.toggleCard(g, 140, 1180, 800, 170, t > 18.4, t);
    }
  } else {
    K.litShape(g, (() => { const p = new Path2D(); p.roundRect(VW / 2 - 120, 640 - 120, 240, 240, 40); return p; })(),
      { accent: true, glowR: 44, bbox: [VW / 2 - 120, 520, 240, 240], alpha: 0.9 });
    K.headline(g, 'Book a fit call', VW / 2, 950, { px: 84, maxw: 900, alpha: clamp((t - 22.0) / 0.25, 0, 1) });
    K.mono(g, 'inodepi.github.io', VW / 2, 1060, { px: 34, color: ACCENT, track: 0.04, alpha: clamp((t - 25.4) / 0.3, 0, 1) });
    E.caret(g, VW / 2, 1220, 26, { on: (Math.floor(t * 2) % 2 === 0 ? 1 : 0.1), color: ACCENT, glow: 0.3 });
  }
  for (const b of BOUND[14]) wipe(g, t, b);
  K.vvignette(g, 0.5);
  film.drawCaption(g, t);
}

const RENDERS = { 1: day1, 4: day4, 5: day5, 6: day6, 14: day14 };

/* ─── film factory: captions, srt, texts ────────────────── */
export function createFilm(day, durs = {}, opts = {}) {
  const D = DAYS[day];
  const dur = D.dur;
  const cues = D.lines.map(l => {
    const d = durs[l.id] ?? Math.max(2.0, [...l.text].length / 14);
    return { id: l.id, t0: l.t0, t1: Math.min(dur - 0.2, Math.max(l.t0 + 1.8, l.t0 + d + 0.45)), text: l.text };
  });
  function cueAt(t) {
    for (const c of cues) if (t >= c.t0 - 0.06 && t <= c.t1) return c;
    return null;
  }
  function drawCaption(g, t) {
    const c = cueAt(t);
    if (!c) return;
    const a = Math.min(clamp((t - c.t0) / 0.16, 0, 1), clamp((c.t1 - t) / 0.2, 0, 1));
    K.caption(g, c.text, a);
  }
  function render(g, t) {
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
    const cv = g.canvas; const wide = cv.width > cv.height;
    if (wide) K.wideFit(g, (gg, tt) => RENDERS[day](gg, tt, { drawCaption }), t, true);
    else RENDERS[day](g, t, { drawCaption });
    g.restore();
  }
  function texts(t) {
    const out = [];
    const c = cueAt(t);
    if (c) out.push({ id: 'cap-' + c.id, text: c.text, x0: 90, y0: VH - 170, x1: VW - 90, y1: VH - 60, pass: true });
    if (day === 4) {
      const k = clamp(Math.floor(t / 4), 0, 2), s0 = k * 4, d = NUM3[k];
      if (t > s0 + 0.95) out.push({ id: 'n' + k, text: d.v + ' ' + d.label, x0: 120, y0: 780, x1: VW - 120, y1: 1120 });
    }
    return out;
  }
  return { render, texts, cues, dur };
}
