// ui.js — the screen: a workflow window redrawn in code (chrome, nodes, wires, panels), all Canvas 2D
import { PAL, ACCENT, GREEN, CREAM, rgba, rr, panel, text, mono, font, chip, check, liveDot, clamp, lerp, seg, eo, eio, back, spring, hash, TAU, W, H } from './brand.js';
import { icon } from './sprite.js';

export const WIN = { x: 48, y: 196, w: 984, h: 1480, title: 74, rail: 68 };
export const CANVAS = { x: WIN.x + WIN.rail, y: WIN.y + WIN.title, w: WIN.w - WIN.rail, h: WIN.h - WIN.title };
export const PANEL = { x: 512, y: 470, w: 504, h: 840 };
export const NODE_X = 236, NODE_W = 680;

export function nodeRects(n) {
  if (n <= 5) { const h = 160, step = 270; return [...Array(n)].map((_, i) => ({ x: NODE_X, y: 344 + i * step, w: NODE_W, h })); }
  const h = 148, step = 222; return [...Array(n)].map((_, i) => ({ x: NODE_X, y: 344 + i * step, w: NODE_W, h }));
}

/* ── the whole window ────────────────────────────────────── */
export function windowFrame(g, t, o) {
  const { file = 'workflow.json', running = 0, counter = '', progress = 0, alpha = 1, scale = 1, lift = 0, done = 0 } = o;
  g.save();
  if (scale !== 1) { g.translate(W / 2, H / 2); g.scale(scale, scale); g.translate(-W / 2, -H / 2); }
  g.globalAlpha *= alpha;
  // shadow + body
  g.save(); g.shadowColor = 'rgba(0,0,0,.72)'; g.shadowBlur = 70; g.shadowOffsetY = 34;
  g.fillStyle = '#10161f'; rr(g, WIN.x, WIN.y, WIN.w, WIN.h, 22); g.fill(); g.restore();
  g.strokeStyle = 'rgba(255,255,255,.10)'; g.lineWidth = 1; rr(g, WIN.x + .5, WIN.y + .5, WIN.w - 1, WIN.h - 1, 22); g.stroke();

  // title bar
  g.save(); rr(g, WIN.x, WIN.y, WIN.w, WIN.title, 22); g.clip();
  g.fillStyle = PAL.surf; g.fillRect(WIN.x, WIN.y, WIN.w, WIN.title);
  g.fillStyle = 'rgba(255,255,255,.05)'; g.fillRect(WIN.x, WIN.y + WIN.title - 1, WIN.w, 1);
  g.restore();
  const ty = WIN.y + WIN.title / 2;
  ['#3b4352', '#333b49', '#2c3340'].forEach((c, i) => { g.fillStyle = c; g.beginPath(); g.arc(WIN.x + 32 + i * 20, ty, 6, 0, TAU); g.fill(); });
  text(g, file, WIN.x + 118, ty + 6, { px: 19, wt: 500, fam: 'mono', color: PAL.dim });
  g.save(); g.font = font(19, 500, 'mono'); const fw = g.measureText(file).width; g.restore();
  mono(g, 'saved', WIN.x + 118 + fw + 18, ty + 6, { px: 13, color: PAL.mute });
  // status + counter + run button
  const rx = WIN.x + WIN.w - 46;
  g.save(); g.fillStyle = PAL.surf3; g.beginPath(); g.arc(rx, ty, 17, 0, TAU); g.fill();
  g.strokeStyle = 'rgba(255,255,255,.09)'; g.lineWidth = 1; g.stroke();
  g.fillStyle = running > 0 ? ACCENT : PAL.dim; g.beginPath(); g.moveTo(rx - 4, ty - 7); g.lineTo(rx + 8, ty); g.lineTo(rx - 4, ty + 7); g.closePath(); g.fill(); g.restore();
  let counterW = 0;
  if (counter) {
    g.save(); g.font = font(15, 500, 'mono'); counterW = g.measureText(counter).width; g.restore();
    mono(g, counter, rx - 34, ty + 6, { px: 15, color: PAL.dim, align: 'right' });
  }
  const pillW = 106, px0 = rx - 34 - (counter ? counterW + 16 : 10) - pillW;
  const on = running > 0 || done > 0;
  g.save(); g.fillStyle = on ? rgba(GREEN, .10) : 'rgba(255,255,255,.04)'; rr(g, px0, ty - 15, pillW, 30, 15); g.fill();
  g.strokeStyle = on ? rgba(GREEN, .35) : 'rgba(255,255,255,.08)'; g.lineWidth = 1; rr(g, px0 + .5, ty - 14.5, pillW - 1, 29, 15); g.stroke(); g.restore();
  g.save(); g.fillStyle = on ? GREEN : PAL.mute; g.beginPath(); g.arc(px0 + 18, ty, 4.5, 0, TAU); g.fill(); g.restore();
  text(g, running > 0 ? 'running' : done > 0 ? 'complete' : 'idle', px0 + 30, ty + 5, { px: 14, wt: 500, fam: 'mono', color: on ? GREEN : PAL.mute });

  // left palette rail
  g.save(); g.fillStyle = '#121a25'; g.fillRect(WIN.x, CANVAS.y, WIN.rail, CANVAS.h);
  g.fillStyle = 'rgba(255,255,255,.05)'; g.fillRect(WIN.x + WIN.rail - 1, CANVAS.y, 1, CANVAS.h);
  for (let i = 0; i < 4; i++) {
    const y = CANVAS.y + 38 + i * 62;
    g.fillStyle = i === 0 ? 'rgba(240,180,41,.10)' : 'rgba(255,255,255,.035)';
    rr(g, WIN.x + 16, y, 36, 36, 9); g.fill();
    icon(g, ['webhook', 'search', 'pen', 'sheet'][i], WIN.x + 34, y + 18, 19, i === 0 ? ACCENT : PAL.mute);
  }
  g.fillStyle = ACCENT; g.fillRect(WIN.x, CANVAS.y + 38, 2, 36);
  g.restore();

  // canvas: dot grid
  g.save(); g.beginPath(); g.rect(CANVAS.x, CANVAS.y, CANVAS.w, CANVAS.h); g.clip();
  g.fillStyle = '#0f151d'; g.fillRect(CANVAS.x, CANVAS.y, CANVAS.w, CANVAS.h);
  const gr = g.createRadialGradient(CANVAS.x + CANVAS.w * .5, CANVAS.y + 240, 0, CANVAS.x + CANVAS.w * .5, CANVAS.y + 240, 900);
  gr.addColorStop(0, 'rgba(26,33,48,.55)'); gr.addColorStop(1, 'rgba(15,21,29,0)');
  g.fillStyle = gr; g.fillRect(CANVAS.x, CANVAS.y, CANVAS.w, CANVAS.h);
  g.fillStyle = 'rgba(255,255,255,.055)';
  for (let y = CANVAS.y + 26; y < CANVAS.y + CANVAS.h; y += 26) for (let x = CANVAS.x + 26; x < CANVAS.x + CANVAS.w; x += 26) g.fillRect(x, y, 2, 2);

  // progress strip
  const bx = CANVAS.x + 20, bw = CANVAS.w - 40;
  g.fillStyle = 'rgba(255,255,255,.06)'; rr(g, bx, CANVAS.y + 14, bw, 4, 2); g.fill();
  if (progress > 0) {
    g.fillStyle = ACCENT; rr(g, bx, CANVAS.y + 14, Math.max(4, bw * clamp(progress)), 4, 2); g.fill();
    g.save(); g.fillStyle = ACCENT; g.shadowColor = rgba(ACCENT, .9); g.shadowBlur = 12;
    g.beginPath(); g.arc(bx + bw * clamp(progress), CANVAS.y + 16, 4, 0, TAU); g.fill(); g.restore();
  }
  g.restore();
  g.restore();
}

/* ── wires ───────────────────────────────────────────────── */
export function drawWires(g, t, o) {
  const { rects, state } = o;   // state[i] = 'idle' | 'run' | 'done'
  const cx = NODE_X + NODE_W / 2;
  for (let i = 0; i < rects.length - 1; i++) {
    const a = rects[i], b = rects[i + 1];
    const y0 = a.y + a.h, y1 = b.y;
    const done = state[i] === 'done', running = state[i] === 'run';
    g.save(); g.lineCap = 'round';
    g.strokeStyle = 'rgba(255,255,255,.09)'; g.lineWidth = 4;
    g.beginPath(); g.moveTo(cx, y0 + 10); g.lineTo(cx, y1 - 10); g.stroke();
    if (done || running) {
      const u = done ? 1 : clamp((t - o.activeT[i]) / Math.max(.4, o.gap[i]));
      g.strokeStyle = done ? rgba(GREEN, .62) : ACCENT; g.lineWidth = 4;
      g.beginPath(); g.moveTo(cx, y0 + 10); g.lineTo(cx, y0 + 10 + (y1 - 10 - y0 - 10) * eio(u)); g.stroke();
      if (running) {
        g.fillStyle = ACCENT; g.shadowColor = rgba(ACCENT, .95); g.shadowBlur = 16;
        const yy = y0 + 10 + (y1 - 20 - y0) * eio(u);
        g.fillRect(cx - 5, yy - 5, 10, 10); g.shadowColor = 'transparent';
      }
    }
    // ports
    for (const [yy, col] of [[y0, done ? GREEN : PAL.mute], [y1, state[i + 1] === 'done' ? GREEN : state[i + 1] === 'run' ? ACCENT : PAL.mute]]) {
      g.fillStyle = '#0f151d'; g.beginPath(); g.arc(cx, yy, 6, 0, TAU); g.fill();
      g.strokeStyle = rgba(col === PAL.mute ? '#5c6675' : col, .9); g.lineWidth = 2; g.beginPath(); g.arc(cx, yy, 6, 0, TAU); g.stroke();
    }
    g.restore();
  }
}

/* ── one node ────────────────────────────────────────────── */
export function drawNode(g, t, r, n, st, o = {}) {
  const { x, y, w, h } = r;
  const active = st === 'run', done = st === 'done';
  panel(g, x, y, w, h, {
    r: 15, fill: active ? '#1b2430' : PAL.surf, shadow: active ? .55 : .18,
    border: active ? rgba(ACCENT, .75) : done ? rgba(GREEN, .30) : 'rgba(255,255,255,.085)', lw: active ? 1.8 : 1,
  });
  if (active) {
    g.save(); g.shadowColor = rgba(ACCENT, .22); g.shadowBlur = 30; g.strokeStyle = rgba(ACCENT, .5); g.lineWidth = 2;
    rr(g, x, y, w, h, 15); g.stroke(); g.restore();
  }
  // icon plate
  const ix = x + 24, iy = y + (h - 58) / 2;
  g.save(); g.fillStyle = active ? 'rgba(240,180,41,.12)' : 'rgba(255,255,255,.045)';
  rr(g, ix, iy, 58, 58, 12); g.fill();
  g.strokeStyle = active ? rgba(ACCENT, .30) : 'rgba(255,255,255,.06)'; g.lineWidth = 1; rr(g, ix + .5, iy + .5, 57, 57, 12); g.stroke(); g.restore();
  icon(g, n.icon, ix + 29, iy + 29, 26, active ? ACCENT : done ? PAL.dim : PAL.mute);
  // labels
  text(g, n.title, x + 100, y + h / 2 - 2, { px: 29, wt: 500, color: active ? PAL.text : done ? PAL.text : '#c3cddb' });
  mono(g, n.sub, x + 100, y + h / 2 + 30, { px: 17, color: PAL.mute });
  // right: value + status
  if (n.val && done) mono(g, n.val, x + w - 78, y + h / 2 + 6, { px: 17, color: rgba(GREEN, .95), align: 'right' });
  const sx = x + w - 44, sy = y + h / 2;
  g.save();
  if (done) {
    g.fillStyle = rgba(GREEN, .15); g.beginPath(); g.arc(sx, sy, 16, 0, TAU); g.fill();
    g.strokeStyle = GREEN; g.lineWidth = 1.5; g.beginPath(); g.arc(sx, sy, 16, 0, TAU); g.stroke();
    check(g, sx, sy, 14, GREEN, 2.6);
  } else if (active) {
    g.strokeStyle = rgba(ACCENT, .28); g.lineWidth = 2.4; g.beginPath(); g.arc(sx, sy, 16, 0, TAU); g.stroke();
    g.strokeStyle = ACCENT; g.lineWidth = 2.6; g.lineCap = 'round';
    g.beginPath(); g.arc(sx, sy, 16, t * 5.2, t * 5.2 + 1.9); g.stroke();
  } else {
    g.strokeStyle = 'rgba(255,255,255,.16)'; g.lineWidth = 1.5; g.setLineDash([3, 4]); g.beginPath(); g.arc(sx, sy, 15, 0, TAU); g.stroke(); g.setLineDash([]);
  }
  g.restore();
}

/* ── detail panel (the node detail view) ─────────────────── */
const PANEL_H = { email: 450, log: 420, enrich: 450, reply: 410, transcript: 700, score: 840, digest: 550 };
export function panelRect(kind) { const h = PANEL_H[kind] || 560; return { x: PANEL.x, y: PANEL.y, w: PANEL.w, h }; }
export function digestButton() { return { x: PANEL.x + 28 + 125, y: PANEL.y + 470, w: 250, h: 56 }; }

const PANEL_KIND = {
  email: { head: 'DRAFT · FOLLOW-UP', icon: 'pen' },
  log: { head: 'APPENDED · AR_LOG', icon: 'sheet' },
  enrich: { head: 'ENRICHED · RECORD', icon: 'globe' },
  reply: { head: 'REPLY · CLASSIFIED', icon: 'mail' },
  transcript: { head: 'TRANSCRIPT · 00:14', icon: 'mic' },
  score: { head: 'RUBRIC · SCORE', icon: 'score' },
  digest: { head: 'DIGEST · 07:00', icon: 'digest' },
};

export function panelOpen(t, p) { return t >= p.t0 && t <= p.t1; }
export function panelSlide(t, p) {
  if (t < p.t0 || t > p.t1) return 0;
  return Math.min(1, eio(seg(t, p.t0, p.t0 + .3))) * (1 - eio(seg(t, p.t1 - .22, p.t1)));
}

export function detailPanel(g, t, p, node, o = {}) {
  const a = panelSlide(t, p); if (a <= 0) return;
  const kind = PANEL_KIND[p.kind] || PANEL_KIND.email;
  const { x, y, w, h } = panelRect(p.kind);
  const slide = (1 - eio(seg(t, p.t0, p.t0 + .3))) * 46;
  g.save(); g.globalAlpha = a; g.translate(slide, 0);
  g.save(); g.shadowColor = 'rgba(0,0,0,.6)'; g.shadowBlur = 48; g.shadowOffsetY = 22;
  g.fillStyle = '#151d29'; rr(g, x, y, w, h, 18); g.fill(); g.restore();
  g.strokeStyle = 'rgba(255,255,255,.12)'; g.lineWidth = 1; rr(g, x + .5, y + .5, w - 1, h - 1, 18); g.stroke();
  // header
  g.save(); rr(g, x, y, w, 66, 18); g.clip(); g.fillStyle = '#1a2330'; g.fillRect(x, y, w, 66);
  g.fillStyle = 'rgba(255,255,255,.07)'; g.fillRect(x, y + 65, w, 1); g.restore();
  icon(g, kind.icon, x + 32, y + 32, 20, ACCENT);
  text(g, node.title, x + 54, y + 40, { px: 20, wt: 500 });
  mono(g, kind.head, x + w - 24, y + 40, { px: 12, color: PAL.mute, align: 'right' });
  const px = x + 28, pw = w - 56;
  const line = (yy) => { g.fillStyle = 'rgba(255,255,255,.06)'; g.fillRect(px, yy, pw, 1); };
  const row = (yy, k, v, col = PAL.text) => {
    mono(g, k, px, yy, { px: 13, color: PAL.mute });
    text(g, v, px + 96, yy + 2, { px: 19, wt: 500, fam: 'mono', color: col });
  };
  let yy = y + 112;
  if (p.kind === 'email') {
    row(yy, 'TO', 'dana@northwind.co'); yy += 34;
    row(yy, 'SUBJ', 'Invoice 2041 · 6 days'); yy += 30; line(yy); yy += 34;
    const body = ['Hi Dana — invoice 2041 (4,250)', 'was due on the 3rd. Sending it', 'again in case it slipped.', '', '— inodepi'];
    body.forEach((l, i) => { text(g, l, px, yy + i * 30, { px: 19, color: i === 4 ? PAL.dim : '#dbe3ee' }); });
    yy += 5 * 30 + 14; line(yy); yy += 30;
    chip(g, 'tone · firm, polite', px, yy, { px: 12 });
    g.save(); g.strokeStyle = rgba(ACCENT, .8); g.lineWidth = 1.4; rr(g, x + w - 136, yy - 18, 108, 40, 8); g.stroke();
    g.fillStyle = rgba(ACCENT, .10); rr(g, x + w - 136, yy - 18, 108, 40, 8); g.fill(); g.restore();
    text(g, 'Send', x + w - 82, yy + 9, { px: 17, wt: 600, align: 'center', color: ACCENT });
  } else if (p.kind === 'log') {
    row(yy, 'ROW', '48 · inv-2041'); yy += 38;
    row(yy, 'STATUS', 'follow-up sent', GREEN); yy += 38;
    row(yy, 'NEXT', '+4 days', ACCENT); yy += 38;
    row(yy, 'OWNER', 'dana@northwind.co'); yy += 44; line(yy); yy += 34;
    text(g, '47 rows appended this run.', px, yy, { px: 19, color: PAL.dim });
    yy += 40; text(g, '0 errors · 0 manual touches', px, yy, { px: 19, color: PAL.dim });
  } else if (p.kind === 'enrich') {
    row(yy, 'CO', 'Northwind Freight'); yy += 38;
    row(yy, 'ROLE', 'Head of Operations'); yy += 38;
    row(yy, 'SIZE', '240 people'); yy += 38;
    row(yy, 'SIGNAL', 'hired 3 ops roles', ACCENT); yy += 44; line(yy); yy += 30;
    text(g, 'Enriched from the open web,', px, yy, { px: 19, color: PAL.dim }); yy += 30;
    text(g, 'then written back to the record.', px, yy, { px: 19, color: PAL.dim });
    yy += 46; chip(g, 'source · web · 2.1s', px, yy, { px: 12 });
  } else if (p.kind === 'reply') {
    g.save(); g.fillStyle = 'rgba(255,255,255,.04)'; rr(g, px, yy - 18, pw, 96, 12); g.fill();
    g.strokeStyle = 'rgba(255,255,255,.08)'; g.lineWidth = 1; rr(g, px + .5, yy - 17.5, pw - 1, 95, 12); g.stroke(); g.restore();
    text(g, 'Yes — send the invoice again,', px + 18, yy + 14, { px: 19 }); 
    text(g, 'I will get it approved today.', px + 18, yy + 46, { px: 19 });
    yy += 108;
    row(yy, 'INTENT', 'positive', GREEN); yy += 34;
    row(yy, 'ROUTE', 'deals pipeline', ACCENT); yy += 34;
    row(yy, 'SEQ', 'paused · human now'); yy += 40;
    chip(g, 'classified in 0.8s', px, yy, { px: 12 });
  } else if (p.kind === 'transcript') {
    const turns = [['REP', 'Walk me through the rollout.', PAL.dim], ['BUYER', 'Two regions first, then ops.', PAL.text],
      ['REP', 'What budget is approved?', PAL.dim], ['BUYER', 'About forty a year.', PAL.text], ['REP', 'Next step is a pilot, then?', ACCENT]];
    turns.forEach((tt, i) => {
      const hl = tt[2] === ACCENT;
      if (hl) { g.fillStyle = rgba(ACCENT, .08); rr(g, px - 10, yy - 20 + i * 108, pw + 20, 34, 7); g.fill(); }
      mono(g, tt[0], px, yy + i * 108, { px: 12, color: tt[2] === PAL.dim ? PAL.mute : GREEN });
      text(g, tt[1], px + 58, yy + i * 108, { px: 18, color: tt[2] });
      mono(g, '0:' + String(12 + i * 7).padStart(2, '0'), x + w - 24, yy + i * 108, { px: 12, color: PAL.mute, align: 'right' });
    });
    yy += 5 * 108 + 4; line(yy - 26);
    chip(g, 'speakers split · 2', px, yy, { px: 12 });
  } else if (p.kind === 'score') {
    const bars = scoreLayout();
    const s = Math.round(clamp((t - p.t0) / 2.6) * 82);
    text(g, String(s), x + 28, y + 208, { px: 86, wt: 600, fam: 'disp', color: ACCENT, track: -.04 });
    mono(g, '/ 100', x + 150, y + 208, { px: 16, color: PAL.mute });
    mono(g, 'weighted rubric · 6 criteria', x + w - 24, y + 176, { px: 12, color: PAL.mute, align: 'right' });
    bars.forEach((b, i) => {
      const u = spring(clamp((t - p.t0 - .35 - i * .22) / .8), 8, .5);
      const bh = b.h * clamp(u);
      g.save(); g.fillStyle = 'rgba(255,255,255,.06)'; rr(g, b.x, b.base - b.h, b.w, b.h, 4); g.fill();
      g.fillStyle = i === 4 ? ACCENT : rgba(ACCENT, .82); rr(g, b.x, b.base - bh, b.w, bh, 4); g.fill();
      g.restore();
      mono(g, b.k, b.x + b.w / 2, b.base + 26, { px: 11, color: PAL.mute, align: 'center' });
    });
    mono(g, '1 discovery · 2 budget · 3 next step · 4 objections · 5 close', x + w / 2, y + h - 28, { px: 10, color: PAL.mute, align: 'center', track: .03 });
  } else if (p.kind === 'digest') {
    const rows = [['Northwind Freight', 'routed · Dana', GREEN], ['Halden Labs', 'routed · Sam', GREEN], ['Copperline', 'duplicate · merged', PAL.dim], ['Brackett Co', 'needs review', ACCENT]];
    rows.forEach((r, i) => {
      const yy2 = yy + i * 74;
      g.save(); g.fillStyle = i === 3 ? 'rgba(240,180,41,.06)' : 'rgba(255,255,255,.03)'; rr(g, px - 8, yy2 - 28, pw + 16, 58, 9); g.fill(); g.restore();
      text(g, r[0], px + 8, yy2, { px: 20, wt: 500 });
      mono(g, r[1], x + w - 24, yy2, { px: 12, color: r[2], align: 'right' });
    });
    yy += 4 * 74 + 4;
    mono(g, '3 new leads · 1 merged · 1 flagged', px, yy, { px: 13, color: PAL.dim });
    yy += 42;
    const approved = t > (o.approve || 1e9);
    g.save();
    g.fillStyle = approved ? rgba(GREEN, .14) : rgba(ACCENT, .14); rr(g, px, yy - 12, 250, 56, 10); g.fill();
    g.strokeStyle = approved ? rgba(GREEN, .7) : ACCENT; g.lineWidth = 1.4; rr(g, px + .5, yy - 11.5, 249, 55, 10); g.stroke(); g.restore();
    text(g, approved ? 'Approved · sent' : 'Approve & send', px + 125, yy + 23, { px: 18, wt: 600, align: 'center', color: approved ? GREEN : ACCENT });
    liveDot(g, px + 286, yy + 16, t, .8, approved ? 'digest sent 07:00' : 'waiting for you');
  }
  g.restore();
}

export function scoreLayout() {
  const { x, y, w, h } = PANEL;
  const n = 5, bw = 52, gap = 28, x0 = x + 34, base = y + 700;
  return [...Array(n)].map((_, i) => ({ x: x0 + i * (bw + gap), w: bw, base, h: [180, 250, 300, 150, 340][i], k: String(i + 1) }));
}

/* ── toast anchored above a node ─────────────────────────── */
export function toast(g, t, node, r, str, a) {
  if (a <= 0) return;
  g.save(); g.globalAlpha *= a;
  const px = 16; g.font = font(px, 500, 'mono');
  const w = g.measureText(str).width + 46, h = 38;
  const x = r.x + r.w / 2 - w / 2, y = r.y - 12 - h;
  g.shadowColor = 'rgba(0,0,0,.5)'; g.shadowBlur = 22; g.shadowOffsetY = 8;
  g.fillStyle = '#1d2634'; rr(g, x, y, w, h, 8); g.fill(); g.shadowColor = 'transparent';
  g.strokeStyle = 'rgba(255,255,255,.12)'; g.lineWidth = 1; rr(g, x + .5, y + .5, w - 1, h - 1, 8); g.stroke();
  g.fillStyle = GREEN; g.beginPath(); g.arc(x + 18, y + h / 2, 4.5, 0, TAU); g.fill();
  g.fillStyle = PAL.text; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText(str, x + 30, y + h / 2 + 1);
  g.restore();
}

/* ── the totals plate (spotlight freeze) ─────────────────── */
export function statPlate(g, t, wf, lock, o = {}) {
  const { x, y, w, h } = CANVAS;
  const a = eo(seg(t, lock - .5, lock - .15));
  if (a <= 0) return;
  g.save(); g.globalAlpha = a;
  g.fillStyle = 'rgba(9,13,19,.86)'; g.fillRect(x, y, w, h);
  const cx = 540, cy = 900;
  const gr = g.createRadialGradient(cx, cy, 0, cx, cy, 480);
  gr.addColorStop(0, rgba(ACCENT, .09)); gr.addColorStop(1, rgba(ACCENT, 0));
  g.fillStyle = gr; g.fillRect(x, y, w, h);
  // the summary card (an execution-summary overlay, drawn in the app's own language)
  const cw = 840, ch = 560, px0 = cx - cw / 2, py0 = cy - ch / 2;
  const rise = (1 - eo(seg(t, lock - .3, lock + .05))) * 22;
  g.save(); g.translate(0, rise);
  g.shadowColor = 'rgba(0,0,0,.7)'; g.shadowBlur = 60; g.shadowOffsetY = 26;
  g.fillStyle = '#131b26'; rr(g, px0, py0, cw, ch, 24); g.fill(); g.shadowColor = 'transparent';
  g.strokeStyle = 'rgba(255,255,255,.11)'; g.lineWidth = 1; rr(g, px0 + .5, py0 + .5, cw - 1, ch - 1, 24); g.stroke();
  g.restore();
  mono(g, 'RUN SUMMARY · 07:14', cx, py0 + 56, { px: 15, color: PAL.mute, align: 'center', track: .2 });
  g.fillStyle = 'rgba(255,255,255,.07)'; g.fillRect(px0 + 40, py0 + 80, cw - 80, 1);
  mono(g, 'THIS WEEK', cx, py0 + 140, { px: 17, color: PAL.dim, align: 'center', track: .26 });
  const val = wf.stat[0];
  const u = clamp((t - lock + .3) / .5);
  const shown = ['47', '64', '128'].includes(val) ? String(Math.round(lerp(0, +val, eo(u)))) : val;
  const s = back(clamp((t - lock + .56) / .45), 1.5);
  g.save(); g.translate(cx, py0 + 300); g.scale(lerp(.9, 1, clamp(s, 0, 1.1)), lerp(.9, 1, clamp(s, 0, 1.1)));
  text(g, shown, 0, 0, { px: 210, wt: 600, fam: 'disp', color: ACCENT, align: 'center', track: -.05 });
  g.restore();
  text(g, wf.stat[1], cx, py0 + 392, { px: 38, wt: 500, color: PAL.text, align: 'center' });
  mono(g, wf.statSub, cx, py0 + 440, { px: 15, color: PAL.mute, align: 'center', track: .12 });
  g.save(); g.fillStyle = rgba(GREEN, .10); rr(g, cx - 112, py0 + 472, 224, 44, 22); g.fill();
  g.strokeStyle = rgba(GREEN, .38); g.lineWidth = 1; rr(g, cx - 111.5, py0 + 472.5, 223, 43, 22); g.stroke(); g.restore();
  liveDot(g, cx - 86, py0 + 494, t, .85, 'workflow green');
  g.restore();
}

/* ── hook / intro scenes ─────────────────────────────────── */
export function hookTyped(g, t, t0) {
  const u = clamp((t - t0) / .2);
  g.save(); g.globalAlpha = u;
  mono(g, 'mon 07:12 · laptop', 96, 760, { px: 17, color: PAL.mute, track: .08 });
  const cps = 26;
  const n1 = clamp(Math.floor((t - t0 - .25) * cps), 0, 18);
  text(g, 'You hired a person'.slice(0, n1), 96, 900, { px: 68, wt: 600, fam: 'disp', track: -.03 });
  const n2 = clamp(Math.floor((t - t0 - 1.0) * cps), 0, 15);
  text(g, 'to be a cable.'.slice(0, n2), 96, 990, { px: 68, wt: 600, fam: 'disp', track: -.03, color: ACCENT });
  const done = n2 >= 15;
  g.save(); g.font = font(68, 600, 'disp'); const w2 = g.measureText('to be a cable.').width; g.restore();
  const on = done ? (Math.floor(t * 2.4) % 2 ? .22 : 1) : 1;
  g.save(); g.globalAlpha = u * on; g.fillStyle = ACCENT; g.fillRect(96 + w2 + 12, 928, 5, 66); g.restore();
  text(g, 'automations · built in your stack', 96, 1070, { px: 22, fam: 'ui', color: PAL.mute });
  g.restore();
}

export function backlog(g, t, t0) {
  const a = eo(seg(t, t0, t0 + .3));
  g.save(); g.globalAlpha = a;
  const x = 62, y = 300, w = 956, h = 1250;
  g.save(); g.shadowColor = 'rgba(0,0,0,.7)'; g.shadowBlur = 60; g.shadowOffsetY = 28;
  g.fillStyle = '#10161f'; rr(g, x, y, w, h, 20); g.fill(); g.restore();
  g.strokeStyle = 'rgba(255,255,255,.10)'; g.lineWidth = 1; rr(g, x + .5, y + .5, w - 1, h - 1, 20); g.stroke();
  g.save(); rr(g, x, y, w, 66, 20); g.clip(); g.fillStyle = PAL.surf; g.fillRect(x, y, w, 66); g.restore();
  ['#3b4352', '#333b49', '#2c3340'].forEach((c, i) => { g.fillStyle = c; g.beginPath(); g.arc(x + 32 + i * 20, y + 33, 6, 0, TAU); g.fill(); });
  mono(g, 'crm · leads (stale)', x + 112, y + 40, { px: 18, color: PAL.dim });
  mono(g, 'saved filter · last touch > 180d', x + w - 26, y + 40, { px: 13, color: PAL.mute, align: 'right' });
  const rows = [['Northwind Freight', '214 days', 'cold'], ['Halden Labs', '198 days', 'cold'], ['Copperline', '231 days', 'cold'],
    ['Brackett Co', '176 days', 'cold'], ['Marlowe & Sons', '260 days', 'cold'], ['Fenwick Rail', '187 days', 'cold'], ['Ostwald Group', '205 days', 'cold'],
    ['Pinehurst Media', '192 days', 'cold'], ['Avery & Blake', '221 days', 'cold']];
  rows.forEach((r, i) => {
    const ry = y + 104 + i * 116;
    const sel = i === 2;
    g.save(); g.fillStyle = sel ? 'rgba(240,180,41,.07)' : 'rgba(255,255,255,.022)'; rr(g, x + 24, ry, w - 48, 96, 12); g.fill();
    if (sel) { g.strokeStyle = rgba(ACCENT, .35); g.lineWidth = 1; rr(g, x + 24.5, ry + .5, w - 49, 95, 12); g.stroke(); } g.restore();
    g.save(); g.fillStyle = 'rgba(255,255,255,.05)'; g.beginPath(); g.arc(x + 70, ry + 48, 20, 0, TAU); g.fill(); g.restore();
    text(g, r[0], x + 106, ry + 44, { px: 25, wt: 500 });
    mono(g, 'last touch ' + r[1], x + 106, ry + 74, { px: 14, color: PAL.mute });
    mono(g, r[2], x + w - 44, ry + 56, { px: 13, color: sel ? ACCENT : PAL.mute, align: 'right' });
  });
  mono(g, '64 leads · 0 replies · nobody has time', x + w / 2, y + h - 34, { px: 16, color: PAL.mute, align: 'center', track: .06 });
  g.restore();
}

export function relay(g, t, t0) {
  const a = eo(seg(t, t0, t0 + .25));
  g.save(); g.globalAlpha = a;
  const wins = [
    { y: 360, file: 'invoices.csv', rows: ['2041 · Northwind · 4,250', '2042 · Halden · 2,900', '2043 · Copperline · 8,100'], hi: 0 },
    { y: 800, file: 'Inbox — follow-ups', rows: ['2041 · Northwind · 4,250', '2042 · Halden · 2,900', '2043 · Copperline · 8,100'], hi: 1 },
    { y: 1240, file: 'CRM — deals', rows: ['2041 · Northwind · 4,250', '2042 · Halden · 2,900', '2043 · Copperline · 8,100'], hi: 2 },
  ];
  wins.forEach((wn, wi) => {
    const x = 70, w = 940, h = 330;
    g.save(); g.shadowColor = 'rgba(0,0,0,.6)'; g.shadowBlur = 40; g.shadowOffsetY = 18;
    g.fillStyle = '#10161f'; rr(g, x, wn.y, w, h, 16); g.fill(); g.restore();
    g.strokeStyle = 'rgba(255,255,255,.09)'; g.lineWidth = 1; rr(g, x + .5, wn.y + .5, w - 1, h - 1, 16); g.stroke();
    g.save(); rr(g, x, wn.y, w, 48, 16); g.clip(); g.fillStyle = PAL.surf; g.fillRect(x, wn.y, w, 48); g.restore();
    ['#3b4352', '#333b49', '#2c3340'].forEach((c, i) => { g.fillStyle = c; g.beginPath(); g.arc(x + 26 + i * 16, wn.y + 24, 4.6, 0, TAU); g.fill(); });
    mono(g, wn.file, x + 86, wn.y + 30, { px: 15, color: PAL.dim });
    wn.rows.forEach((r, i) => {
      const ry = wn.y + 74 + i * 76;
      g.save(); g.fillStyle = i === 0 ? 'rgba(255,255,255,.035)' : 'transparent'; rr(g, x + 16, ry, w - 32, 62, 8); g.fill(); g.restore();
      text(g, r, x + 36, ry + 40, { px: 21, fam: 'mono', color: i === 0 ? '#c9d4e2' : '#5f6b7c' });
      if (i === 0) { g.fillStyle = ACCENT; g.fillRect(x + 16, ry + 12, 3, 38); }
    });
  });
  // the carried row: one chip moving sheet → inbox → crm, on the 16th grid
  const legs = [[t0 + .5, 486], [t0 + 2.4, 926], [t0 + 4.3, 1366]];
  const tim = t;
  let cy = 486;
  for (let i = 0; i < legs.length - 1; i++) {
    const [ta, ya] = legs[i], [tb, yb] = legs[i + 1];
    if (tim >= ta && tim < tb) cy = lerp(ya, yb, eio(seg(tim, ta + .25, tb - .25))) - Math.sin(Math.PI * seg(tim, ta, tb)) * 40;
  }
  if (tim >= legs[2][0]) cy = legs[2][1];
  const cw = 330, ch = 48, cxr = 742;
  g.save(); g.shadowColor = 'rgba(0,0,0,.55)'; g.shadowBlur = 20; g.shadowOffsetY = 8;
  g.fillStyle = '#27303f'; rr(g, cxr - cw / 2, cy - ch / 2, cw, ch, 8); g.fill(); g.restore();
  g.strokeStyle = rgba(ACCENT, .55); g.lineWidth = 1.2; rr(g, cxr - cw / 2 + .5, cy - ch / 2 + .5, cw - 1, ch - 1, 8); g.stroke();
  text(g, '2041 · Northwind · 4,250', cxr, cy + 7, { px: 18, fam: 'mono', color: PAL.text, align: 'center' });
  mono(g, 'copy · paste', cxr, cy - 40, { px: 12, color: PAL.mute, align: 'center', track: .18 });
  // clock, counting up
  const mins = Math.floor(seg(t, t0, t0 + 6) * 9);
  mono(g, '06:1' + Math.min(9, mins) + '  ·  monday', 986, 300, { px: 18, color: PAL.mute, align: 'right', track: .1 });
  text(g, 'four tools · one record · nine minutes', 540, 1640, { px: 22, color: PAL.mute, align: 'center' });
  g.restore();
}

/* ── end card ────────────────────────────────────────────── */
export function endCard(g, t, cta) {
  const x = W / 2;
  const u1 = eo(seg(t, cta + .1, cta + .5));
  const u2 = eo(seg(t, cta + .3, cta + .7));
  const u3 = eo(seg(t, cta + 3.1, cta + 3.5));
  const u4 = eo(seg(t, cta + 4.0, cta + 4.4));
  g.save(); g.globalAlpha = u1;
  mono(g, 'inodepi · automations', x, 828, { px: 18, color: PAL.mute, align: 'center', track: .26 });
  g.restore();
  g.save(); g.globalAlpha = u2; g.translate(0, (1 - u2) * 18);
  text(g, 'Book a fit call', x, 972, { px: 88, wt: 600, fam: 'disp', align: 'center', track: -.03 });
  g.restore();
  // url + rule + mascot standing on the rule (drawn by film.js)
  g.save(); g.globalAlpha = u3;
  mono(g, 'inodepi.github.io', x - 40, 1088, { px: 34, color: ACCENT, align: 'center', track: .02 });
  g.restore();
  g.save(); g.globalAlpha = u4;
  g.fillStyle = 'rgba(255,255,255,.10)'; g.fillRect(200, 1140, 680, 1);
  text(g, 'one process · two to three weeks · yours', x, 1212, { px: 22, color: PAL.mute, align: 'center' });
  g.restore();

}
