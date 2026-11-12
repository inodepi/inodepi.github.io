// k.js — inodepi brand layer over the Dark Tech Keynote engine.
import * as E from './engine.js';
export * from './engine.js';
export { E };

/* ── brand palette ─────────────────────────────────────────── */
E.PAL.bg0 = '#0d1117';
E.PAL.bg1 = '#10161f';
E.PAL.surf = '#161d28';
E.PAL.surf2 = '#1a2130';
E.PAL.surf3 = '#232c3a';
E.PAL.line = 'rgba(255,255,255,.075)';
E.PAL.hi = 'rgba(255,255,255,.10)';
E.PAL.text = '#e6edf3';
E.PAL.dim = '#94a3b8';
E.PAL.mute = '#5c6675';
E.PAL.accent = '#f0b429';
E.PAL.green = '#2ea886';
E.PAL.cream = '#fef3c7';
E.PAL.red = '#e0575b';
E.PAL.cool = '#2ea886';

export const ACCENT = '#f0b429';
export const GREEN = '#2ea886';
export const CREAM = '#fef3c7';

export const VW = 1080, VH = 1920;
export const SAFE = 84;

export function vbg(g, o = {}) {
  const { lift = 1, cool = 1 } = o;
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
  g.fillStyle = E.PAL.bg0; g.fillRect(0, 0, VW, VH);
  let gr = g.createRadialGradient(VW * 0.5, VH * 0.30, 0, VW * 0.5, VH * 0.30, VW * 0.95);
  gr.addColorStop(0, E.rgba(E.PAL.bg1, 0.95 * lift)); gr.addColorStop(1, E.rgba(E.PAL.bg0, 0));
  g.fillStyle = gr; g.fillRect(0, 0, VW, VH);
  if (cool > 0) E.glow(g, VW * 0.86, VH * 0.10, 760, E.PAL.green, 0.055 * cool);
  g.restore();
}
export function vgrid(g, o = {}) {
  const { module = 48, alpha = 1, ox = 0, oy = 0, major = 4 } = o;
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
  for (let i = 0; ; i++) {
    const x = ox % module + i * module; if (x > VW) break;
    if (x < -module) continue;
    g.strokeStyle = `rgba(255,255,255,${(i % major === 0 ? 0.055 : 0.028) * alpha})`;
    g.lineWidth = 1; g.beginPath(); g.moveTo(x + 0.5, 0); g.lineTo(x + 0.5, VH); g.stroke();
  }
  for (let i = 0; ; i++) {
    const y = oy % module + i * module; if (y > VH) break;
    if (y < -module) continue;
    g.strokeStyle = `rgba(255,255,255,${(i % major === 0 ? 0.055 : 0.028) * alpha})`;
    g.lineWidth = 1; g.beginPath(); g.moveTo(0, y + 0.5); g.lineTo(VW, y + 0.5); g.stroke();
  }
  g.restore();
}
export function vvignette(g, a = 0.55) {
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
  const gr = g.createRadialGradient(VW / 2, VH / 2, VH * 0.18, VW / 2, VH / 2, VH * 0.72);
  gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, `rgba(0,0,0,${a})`);
  g.fillStyle = gr; g.fillRect(0, 0, VW, VH); g.restore();
}

/* ── type ──────────────────────────────────────────────────── */
export function headline(g, text, x, y, o = {}) {
  const { px = 84, wt = 600, fam = 'disp', color = E.PAL.text, align = 'center', track = -0.02, alpha = 1, maxw = 0 } = o;
  g.save(); g.globalAlpha *= alpha; g.fillStyle = color; g.textAlign = align; g.textBaseline = 'alphabetic';
  let size = px;
  for (;;) { g.font = E.font(size, wt, fam); if (!maxw || g.measureText(text).width <= maxw || size <= 24) break; size -= 2; }
  // manual tracking
  if (track) {
    const chars = [...text], widths = chars.map(c => g.measureText(c).width + track * size);
    const total = widths.reduce((a, b) => a + b, 0) - track * size;
    let cx = align === 'center' ? x - total / 2 : align === 'right' ? x - total : x;
    g.textAlign = 'left';
    chars.forEach((c, i) => { g.fillText(c, cx, y); cx += widths[i]; });
  } else g.fillText(text, x, y);
  g.restore(); return size;
}
export function mono(g, text, x, y, o = {}) {
  const { px = 26, color = E.PAL.dim, align = 'center', wt = 500, alpha = 1, track = 0.10 } = o;
  g.save(); g.globalAlpha *= alpha; g.fillStyle = color; g.textAlign = align; g.textBaseline = 'alphabetic';
  g.font = E.font(px, wt, 'mono');
  if (track) {
    const chars = [...text], widths = chars.map(c => g.measureText(c).width + track * px);
    const total = widths.reduce((a, b) => a + b, 0) - track * px;
    let cx = align === 'center' ? x - total / 2 : align === 'right' ? x - total : x;
    g.textAlign = 'left';
    chars.forEach((c, i) => { g.fillText(c, cx, y); cx += widths[i]; });
  } else g.fillText(text, x, y);
  g.restore();
}
export function typed(g, text, x, y, px, t0, t, o = {}) {
  const { cps = 16, color = E.PAL.text, wt = 600, fam = 'disp', caretOn = true, caretColor = ACCENT } = o;
  const n = Math.max(0, Math.min([...text].length, Math.floor((t - t0) * cps)));
  const s = [...text].slice(0, n).join('');
  g.save(); g.font = E.font(px, wt, fam); g.fillStyle = color; g.textAlign = 'left'; g.textBaseline = 'alphabetic';
  g.fillText(s, x, y);
  const w = g.measureText(s).width;
  g.restore();
  const done = n >= [...text].length;
  const on = done ? (Math.floor(t * 2) % 2 === 0 ? 1 : 0.15) : 1;
  if (caretOn) E.caret(g, x + w + 6, y - px * 0.32, px * 0.86, { color: caretColor, on, glow: 0.5 });
  return w;
}

/* ── caption bar (burned) ──────────────────────────────────── */
export function caption(g, text, a) {
  if (!text || a <= 0) return;
  const maxw = VW - 140;
  let px = 34, lines;
  for (;;) {
    g.font = E.font(px, 500);
    const words = text.split(' ');
    lines = ['']; let ok = true;
    for (const w of words) {
      const last = lines.length - 1;
      const cand = lines[last] ? lines[last] + ' ' + w : w;
      if (g.measureText(cand).width <= maxw) lines[last] = cand;
      else if (lines.length < 2) lines.push(w);
      else { ok = false; break; }
    }
    if (ok && lines.every(l => g.measureText(l).width <= maxw)) break;
    px -= 2; if (px < 24) break;
  }
  g.font = E.font(px, 500);
  const tw = Math.max(...lines.map(l => g.measureText(l).width));
  const lh = px * 1.45, h = lines.length * lh + px * 0.7, w = Math.min(maxw, tw + px * 2.2);
  const x = VW / 2 - w / 2, y = VH - 108 - h + (1 - E.eo(a)) * 14;
  g.save(); g.globalAlpha = E.eo(a); g.textAlign = 'center'; g.textBaseline = 'middle';
  g.shadowColor = 'rgba(0,0,0,.55)'; g.shadowBlur = 34; g.shadowOffsetY = 8;
  g.fillStyle = 'rgba(12,14,19,.86)'; E.rr(g, x, y, w, h, 26); g.fill(); g.shadowColor = 'transparent';
  g.strokeStyle = 'rgba(255,255,255,.10)'; g.lineWidth = 1; E.rr(g, x + .5, y + .5, w - 1, h - 1, 26); g.stroke();
  g.fillStyle = ACCENT; g.beginPath(); g.arc(x + px * 0.95, y + h / 2, px * 0.13, 0, E.TAU); g.fill();
  g.fillStyle = E.PAL.text;
  lines.forEach((l, i) => g.fillText(l, VW / 2 + px * 0.25, y + px * 0.35 + lh * (i + 0.5)));
  g.restore();
}

/* ── components ────────────────────────────────────────────── */
export function liveDot(g, x, y, t, s = 1, label = null) {
  const pulse = 0.6 + 0.4 * Math.sin(t * Math.PI * 2 * 0.5);
  g.save();
  g.fillStyle = E.rgba(GREEN, 0.18 * pulse); g.beginPath(); g.arc(x, y, 16 * s * (1 + 0.15 * pulse), 0, E.TAU); g.fill();
  g.fillStyle = GREEN; g.shadowColor = E.rgba(GREEN, .8); g.shadowBlur = 10 * s; g.beginPath(); g.arc(x, y, 6 * s, 0, E.TAU); g.fill();
  g.shadowColor = 'transparent';
  if (label) { g.fillStyle = E.PAL.dim; g.font = E.font(15 * s, 600, 'mono'); g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText(label, x + 16 * s, y + 0.5); }
  g.restore();
}
export function stat(g, value, label, x, y, o = {}) {
  const { px = 150, lockT = 0, t = 99, color = ACCENT, align = 'left', alpha = 1 } = o;
  g.save(); g.globalAlpha *= alpha;
  g.font = E.font(px, 600, 'disp'); g.textAlign = align; g.textBaseline = 'alphabetic';
  const n = [...value].length, start = lockT - n * 0.0625 - 0.6;
  if (t < start) { g.globalAlpha = 0; g.restore(); return; }
  const locks = [...value].map((c, i) => start + (i + 1) * 0.0625);
  g.textAlign = 'left';
  const tw = g.measureText(value).width, x0 = align === 'center' ? x - tw / 2 : align === 'right' ? x - tw : x;
  E.scramble(g, value, x0, y, t, locks, { px, wt: 600, fam: 'disp', color, tracking: -0.045 });
  g.fillStyle = color;
  if (label) {
    g.font = E.font(20, 600, 'mono'); g.fillStyle = E.PAL.dim; g.textAlign = align; g.textBaseline = 'alphabetic';
    g.fillText(label, x, y + 34);
  }
  g.restore();
}
export function card(g, x, y, w, h, o = {}) {
  const { alpha = 1, fill = E.PAL.surf, r = 22, shadow = 1 } = o;
  E.panel(g, x, y, w, h, { r, fill, alpha, shadow });
}
export function categoryRow(g, text, icon, x, y, w, a = 1) {
  g.save(); g.globalAlpha *= a;
  card(g, x, y, w, 124, { r: 18 });
  const cx = x + 62, cy = y + 62;
  g.strokeStyle = E.rgba(ACCENT, .8); g.lineWidth = 2; g.beginPath(); g.arc(cx, cy, 24, 0, E.TAU); g.stroke();
  g.fillStyle = ACCENT; g.beginPath(); g.arc(cx, cy, 7, 0, E.TAU); g.fill();
  g.fillStyle = E.PAL.text; g.font = E.font(30, 500); g.textAlign = 'left'; g.textBaseline = 'middle';
  g.fillText(text, x + 112, cy + 1);
  if (icon) { g.fillStyle = E.PAL.mute; g.font = E.font(15, 500, 'mono'); g.textAlign = 'right'; g.fillText(icon, x + w - 28, cy + 1); }
  g.restore();
}
export function stamp(g, text, x, y, a = 1, o = {}) {
  g.save(); g.globalAlpha *= a;
  g.font = E.font(26, 600, 'mono'); const tw = g.measureText(text).width + 56;
  const h = 62, xx = x - tw / 2, yy = y - h / 2;
  g.strokeStyle = E.rgba(ACCENT, .85); g.lineWidth = 1.5; E.rr(g, xx, yy, tw, h, 10); g.stroke();
  g.fillStyle = E.rgba(ACCENT, .08); E.rr(g, xx, yy, tw, h, 10); g.fill();
  g.fillStyle = ACCENT; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, x, y + 1);
  g.restore();
}
export function toggleCard(g, x, y, w, h, on, t) {
  card(g, x, y, w, h, { r: 20 });
  const tx = x + w - 150, ty = y + h / 2 - 26;
  g.save(); g.fillStyle = on ? E.rgba(ACCENT, .95) : E.PAL.surf3; E.rr(g, tx, ty, 96, 52, 26); g.fill();
  g.fillStyle = on ? '#0d1117' : E.PAL.dim; const knob = 40, kx = on ? tx + 96 - knob - 6 : tx + 6;
  g.beginPath(); g.arc(kx + knob / 2, ty + 26, knob / 2, 0, E.TAU); g.fill();
  g.restore();
  g.fillStyle = E.PAL.text; g.font = E.font(30, 500); g.textAlign = 'left'; g.textBaseline = 'middle';
  g.fillText('You approve', x + 40, y + h / 2 + 1);
  g.fillStyle = E.PAL.mute; g.font = E.font(17, 500, 'mono');
  g.fillText('HUMAN IN THE LOOP', x + 40, y + h / 2 + 40);
}

/* ── cross-camera pull (log-space zoom around an anchor) ───── */
export function cam(t, keys, anchor) {
  // keys: [[t, zoom]] monotone-ish linear in log space
  const z = zipLog(t, keys);
  return E.camera({ x: anchor.x, y: anchor.y, zoom: z });
}
function zipLog(t, keys) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    if (t <= keys[i][0]) {
      const u = (t - keys[i - 1][0]) / (keys[i][0] - keys[i - 1][0]);
      return Math.exp(E.lerp(Math.log(keys[i - 1][1]), Math.log(keys[i][1]), E.eio(u)));
    }
  }
  return keys[keys.length - 1][1];
}

export function wideFit(g, render, t, wide) {
  if (!wide) return render(g, t);
  // draw the vertical composition scaled into a 1920×1080 frame
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
  g.fillStyle = '#07090d'; g.fillRect(0, 0, 1920, 1080);
  const s = 1080 / VH, w = VW * s, x = (1920 - w) / 2;
  g.translate(x, 0); g.scale(s, s);
  render(g, t);
  g.restore();
  // side ambience
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
  const gr = g.createLinearGradient(0, 0, x, 0); gr.addColorStop(0, 'rgba(13,17,23,.9)'); gr.addColorStop(1, 'rgba(13,17,23,0)');
  g.fillStyle = gr; g.fillRect(0, 0, x, 1080);
  const gr2 = g.createLinearGradient(1920, 0, 1920 - x, 0); gr2.addColorStop(0, 'rgba(13,17,23,.9)'); gr2.addColorStop(1, 'rgba(13,17,23,0)');
  g.fillStyle = gr2; g.fillRect(1920 - x, 0, x, 1080);
  const vg = g.createRadialGradient(960, 540, 260, 960, 540, 1050);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.42)');
  g.fillStyle = vg; g.fillRect(0, 0, 1920, 1080);
  g.restore();
}
