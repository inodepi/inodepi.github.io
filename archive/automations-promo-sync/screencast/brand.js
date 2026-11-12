// brand.js — inodepi brand layer for the Living Screencast family (Canvas 2D, deterministic)
import { clamp, lerp, seg, ss, eo, ei, eio, back, spring, mulberry, hash, TAU } from '/core/lib.js';
export { clamp, lerp, seg, ss, eo, ei, eio, back, spring, mulberry, hash, TAU };

export const W = 1080, H = 1920;
export const PAL = {
  bg: '#0d1117', bgAlt: '#10161f', surf: '#161d28', surf2: '#1a2130', surf3: '#232c3a',
  line: 'rgba(255,255,255,.075)', hi: 'rgba(255,255,255,.11)',
  text: '#e6edf3', dim: '#94a3b8', mute: '#5c6675',
  accent: '#f0b429', green: '#2ea886', cream: '#fef3c7', ink: '#141a22',
};
export const ACCENT = PAL.accent, GREEN = PAL.green, CREAM = PAL.cream;
export const FONT = { ui: 'Inter', disp: 'InterTight', mono: 'JBMono' };
export const font = (px, wt = 500, fam = 'ui') => `${wt} ${px}px ${FONT[fam]}`;

export function rgba(hex, a) {
  if (hex.startsWith('rgba') || hex.startsWith('rgb')) return hex;
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`;
}
export function rr(g, x, y, w, h, r) { g.beginPath(); g.roundRect(x, y, w, h, Math.max(0, Math.min(r, w / 2, h / 2))); }

export function panel(g, x, y, w, h, o = {}) {
  const { r = 16, fill = PAL.surf, border = 'rgba(255,255,255,.07)', lw = 1, shadow = 0, alpha = 1 } = o;
  g.save(); g.globalAlpha *= alpha;
  if (shadow) { g.shadowColor = `rgba(0,0,0,${0.55 * shadow})`; g.shadowBlur = 44 * shadow; g.shadowOffsetY = 18 * shadow; }
  g.fillStyle = fill; rr(g, x, y, w, h, r); g.fill();
  g.shadowColor = 'transparent';
  if (border) { g.strokeStyle = border; g.lineWidth = lw; rr(g, x + lw / 2, y + lw / 2, w - lw, h - lw, r); g.stroke(); }
  g.restore();
}

/* ── type ───────────────────────────────────────────────── */
export function text(g, str, x, y, o = {}) {
  const { px = 26, wt = 500, fam = 'ui', color = PAL.text, align = 'left', baseline = 'alphabetic', track = 0, alpha = 1 } = o;
  g.save(); g.globalAlpha *= alpha; g.fillStyle = color; g.textAlign = align; g.textBaseline = baseline;
  g.font = font(px, wt, fam);
  if (track) {
    const chars = [...str], widths = chars.map(c => g.measureText(c).width + track * px);
    const total = widths.reduce((a, b) => a + b, 0) - track * px;
    let cx = align === 'center' ? x - total / 2 : align === 'right' ? x - total : x;
    g.textAlign = 'left';
    chars.forEach((c, i) => { g.fillText(c, cx, y); cx += widths[i]; });
  } else g.fillText(str, x, y);
  g.restore();
}
export function mono(g, str, x, y, o = {}) { return text(g, str, x, y, { px: 18, wt: 500, fam: 'mono', color: PAL.dim, track: .12, ...o }); }
export function measure(g, str, px, wt = 500, fam = 'ui') { g.save(); g.font = font(px, wt, fam); const w = g.measureText(str).width; g.restore(); return w; }

/* ── background: the desktop under the window ───────────── */
export function desktop(g, t = 0, o = {}) {
  const { grid = 1, lift = 1 } = o;
  g.fillStyle = PAL.bg; g.fillRect(0, 0, W, H);
  const gr = g.createRadialGradient(W * .5, H * .26, 0, W * .5, H * .26, W * 1.05);
  gr.addColorStop(0, rgba(PAL.bgAlt, .95 * lift)); gr.addColorStop(1, rgba(PAL.bg, 0));
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  g.fillStyle = rgba(GREEN, .05);
  const gr2 = g.createRadialGradient(W * .88, H * .08, 0, W * .88, H * .08, 620);
  gr2.addColorStop(0, rgba(GREEN, .10)); gr2.addColorStop(1, rgba(GREEN, 0));
  g.fillStyle = gr2; g.fillRect(0, 0, W, H);
  if (grid > 0) {
    g.save(); g.strokeStyle = `rgba(255,255,255,${.026 * grid})`; g.lineWidth = 1;
    for (let x = 0; x < W; x += 54) { g.beginPath(); g.moveTo(x + .5, 0); g.lineTo(x + .5, H); g.stroke(); }
    for (let y = 0; y < H; y += 54) { g.beginPath(); g.moveTo(0, y + .5); g.lineTo(W, y + .5); g.stroke(); }
    g.restore();
  }
  vignette(g, .5);
}
export function vignette(g, a = .5) {
  const gr = g.createRadialGradient(W / 2, H / 2, H * .24, W / 2, H / 2, H * .74);
  gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, `rgba(0,0,0,${a})`);
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
}
export function menuBar(g, t, o = {}) {
  const { clock = '06:12', label = 'inodepi' } = o;
  text(g, label, 56, 64, { px: 19, wt: 600, fam: 'mono', color: PAL.dim, track: .04 });
  text(g, clock, W - 56, 64, { px: 19, wt: 500, fam: 'mono', color: PAL.mute, align: 'right', track: .04 });
  g.fillStyle = 'rgba(255,255,255,.05)'; g.fillRect(0, 88, W, 1);
}

/* ── burned captions (bottom-centre frosted pill) ────────── */
export function caption(g, str, a) {
  if (!str || a <= 0) return;
  const px = 38, y = H - 118;
  g.save(); g.font = font(px, 500); g.textAlign = 'center'; g.textBaseline = 'middle';
  const tw = g.measureText(str).width, h = px * 1.9, w = Math.min(W - 88, tw + px * 2.2);
  const x = W / 2 - w / 2, yy = y - h + (1 - eo(a)) * 14;
  g.globalAlpha = eo(a);
  g.shadowColor = 'rgba(0,0,0,.55)'; g.shadowBlur = 34; g.shadowOffsetY = 8;
  g.fillStyle = 'rgba(12,14,19,.86)'; rr(g, x, yy, w, h, h / 2); g.fill(); g.shadowColor = 'transparent';
  g.strokeStyle = 'rgba(255,255,255,.12)'; g.lineWidth = 1; rr(g, x + .5, yy + .5, w - 1, h - 1, h / 2); g.stroke();
  g.fillStyle = ACCENT; g.beginPath(); g.arc(x + px * .95, yy + h / 2, px * .13, 0, TAU); g.fill();
  g.fillStyle = PAL.text; g.fillText(str, W / 2 + px * .25, yy + h / 2 + 1);
  g.restore();
}

/* ── small components ───────────────────────────────────── */
export function liveDot(g, x, y, t, s = 1, label = null, col = GREEN) {
  const pulse = .6 + .4 * Math.sin(t * Math.PI);
  g.save();
  g.fillStyle = rgba(col, .16 * pulse); g.beginPath(); g.arc(x, y, 15 * s * (1 + .18 * pulse), 0, TAU); g.fill();
  g.fillStyle = col; g.shadowColor = rgba(col, .8); g.shadowBlur = 10 * s; g.beginPath(); g.arc(x, y, 6 * s, 0, TAU); g.fill();
  g.shadowColor = 'transparent';
  if (label) { g.fillStyle = PAL.dim; g.font = font(15 * s, 600, 'mono'); g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText(label, x + 17 * s, y + .5); }
  g.restore();
}
export function chip(g, str, x, y, o = {}) {
  const { px = 15, color = PAL.dim, border = 'rgba(255,255,255,.10)', fill = 'rgba(255,255,255,.035)', padX = 12, h = 30 } = o;
  g.save(); g.font = font(px, 500, 'mono');
  const w = g.measureText(str).width + padX * 2;
  if (fill) { g.fillStyle = fill; rr(g, x, y - h / 2, w, h, h / 2); g.fill(); }
  if (border) { g.strokeStyle = border; g.lineWidth = 1; rr(g, x + .5, y - h / 2 + .5, w - 1, h - 1, h / 2); g.stroke(); }
  g.fillStyle = color; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText(str, x + padX, y + 1);
  g.restore(); return w;
}
export function check(g, x, y, s = 12, col = GREEN, w = 3) {
  g.save(); g.strokeStyle = col; g.lineWidth = w; g.lineCap = 'round'; g.lineJoin = 'round';
  g.beginPath(); g.moveTo(x - s * .45, y + s * .02); g.lineTo(x - s * .1, y + s * .38); g.lineTo(x + s * .5, y - s * .38); g.stroke();
  g.restore();
}
export function cursor(g, x, y, o = {}) {
  const { sc = 1.35, op = 1, ring = 0 } = o;
  g.save(); g.globalAlpha *= op;
  if (ring > 0) {
    g.strokeStyle = rgba(ACCENT, .55 * (1 - ring)); g.lineWidth = 2.5;
    g.beginPath(); g.arc(x, y, 12 + ring * 26, 0, TAU); g.stroke();
  }
  g.translate(x, y); g.scale(sc, sc);
  g.shadowColor = 'rgba(0,0,0,.5)'; g.shadowBlur = 7; g.shadowOffsetY = 3;
  g.beginPath(); g.moveTo(0, 0); g.lineTo(0, 22); g.lineTo(5.5, 16.5); g.lineTo(9, 25); g.lineTo(13, 23.2); g.lineTo(9.6, 15); g.lineTo(17, 15); g.closePath();
  g.fillStyle = '#f4f7fb'; g.fill(); g.shadowColor = 'transparent';
  g.strokeStyle = '#0b0f14'; g.lineWidth = 1.6; g.lineJoin = 'round'; g.stroke();
  g.restore();
}
export function arrow(g, x0, y0, x1, y1, col, w = 3) {
  g.save(); g.strokeStyle = col; g.lineWidth = w; g.lineCap = 'round';
  g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
  const a = Math.atan2(y1 - y0, x1 - x0), s = 8;
  g.beginPath(); g.moveTo(x1, y1); g.lineTo(x1 - Math.cos(a - .5) * s, y1 - Math.sin(a - .5) * s);
  g.moveTo(x1, y1); g.lineTo(x1 - Math.cos(a + .5) * s, y1 - Math.sin(a + .5) * s); g.stroke();
  g.restore();
}
