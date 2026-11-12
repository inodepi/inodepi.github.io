// sprite.js — the pixel potato: the automation, made of big square pixels (Canvas 2D, crisp edges)
import { PAL, ACCENT, CREAM, rgba, TAU, clamp } from './brand.js';

const BODY = '#fef3c7', BODY_D = '#e2cd97', BODY_S = '#f9e9bd', EYE = '#1a1f28', SPROUT = '#d7b05a';

// 16 × 15 grid. kind: 1 body, 2 eye, 3 shade, 4 sprout, 5 cheek
function grid({ eyes = 'n', arms = 'down', legs = 'stand' } = {}) {
  const P = new Map(), put = (c, r, v = 1) => P.set(c + ',' + r, v);
  const rows = [
    '.......44.......',
    '......1111......',
    '....11111111....',
    '...1111111111...',
    '..111111111111..',
    '..111111111111..',
    '..111111111111..',
    '..111111111111..',
    '..111111111111..',
    '...1111111111...',
    '....11111111....',
    '.....111111.....',
    '......1111......',
  ];
  rows.forEach((row, r) => [...row].forEach((ch, c) => { if (ch === '1' || ch === '4') put(c, r, ch === '4' ? 4 : 1); }));
  if (arms === 'up') { for (const r of [4, 5, 6]) { put(0, r); put(1, r); put(14, r); put(15, r); } }
  else if (arms === 'wave') { for (const r of [6, 7]) { put(0, r); put(1, r); } for (const r of [3, 4, 5]) { put(14, r); put(15, r); } }
  else if (arms === 'tuck') { /* none */ }
  else { for (const r of [6, 7]) { put(0, r); put(1, r); put(14, r); put(15, r); } }
  const L = { stand: [[4, 2], [5, 2], [10, 2], [11, 2]], walkA: [[4, 2], [5, 1], [10, 1], [11, 2]], walkB: [[4, 1], [5, 2], [10, 2], [11, 1]], tuck: [[4, 1], [5, 1], [10, 1], [11, 1]], none: [] }[legs];
  for (const [c, h] of L) for (let r = 13; r < 13 + h; r++) put(c, r);
  const E = {
    n: [[5, 5], [5, 6], [10, 5], [10, 6]],
    r: [[6, 5], [6, 6], [11, 5], [11, 6]],
    l: [[4, 5], [4, 6], [9, 5], [9, 6]],
    u: [[5, 4], [5, 5], [10, 4], [10, 5]],
    d: [[5, 6], [5, 7], [10, 6], [10, 7]],
    blink: [[5, 6], [10, 6]],
    shut: [[4, 6], [5, 6], [6, 6], [9, 6], [10, 6], [11, 6]],
    happy: [[4, 6], [5, 5], [6, 6], [9, 6], [10, 5], [11, 6]],
    wide: [[4, 4], [5, 4], [5, 5], [6, 4], [9, 4], [10, 4], [10, 5], [11, 4]],
  }[eyes] || [];
  for (const [c, r] of E) put(c, r, 2);
  for (let c = 4; c <= 11; c++) if (P.get(c + ',10')) put(c, 10, 3);
  put(4, 8, 5); put(11, 8, 5);
  return [...P].map(([k, v]) => { const [c, r] = k.split(',').map(Number); return [c, r, v]; });
}

// x,y = bottom-centre of the feet in world coords; px = pixel side; sq>0 squash, <0 stretch
export function potato(g, { x, y, px = 9, flip = false, sq = 0, op = 1, rot = 0, ...pose }) {
  const G = grid(pose);
  const sy = 1 - sq, sx = 1 + sq * .55;
  const S = px * sx, syPx = px * sy;
  const w = 16 * S, h = 15 * syPx;
  const X = Math.round((x - w / 2) * 2) / 2, Y = Math.round((y - h) * 2) / 2;
  g.save(); g.globalAlpha *= op;
  if (rot) { g.translate(x, y); g.rotate(rot); g.translate(-x, -y); }
  g.fillStyle = 'rgba(0,0,0,.30)'; g.beginPath(); g.ellipse(x, y + 2, w * .34, px * .5, 0, 0, TAU); g.fill();
  for (let [c, r, v] of G) {
    if (flip) c = 15 - c;
    g.fillStyle = v === 2 ? EYE : v === 3 ? BODY_D : v === 4 ? SPROUT : v === 5 ? BODY_S : BODY;
    g.fillRect(Math.round((X + c * S) * 2) / 2, Math.round((Y + r * syPx) * 2) / 2, S + .6, syPx + .6);
  }
  g.globalAlpha *= .45; g.fillStyle = '#fff8e1';
  g.fillRect(X + 2 * S, Y + 4 * syPx, S, syPx * .9);
  g.restore();
}

// props, on the same grid
export function spark(g, x, y, px = 6, col = ACCENT, op = 1) {
  g.save(); g.globalAlpha *= op; g.fillStyle = col;
  const pts = [[0, -2], [0, -1], [0, 0], [0, 1], [0, 2], [-2, 0], [-1, 0], [1, 0], [2, 0]];
  for (const [c, r] of pts) g.fillRect(x + c * px - px / 2, y + r * px - px / 2, px + .5, px + .5);
  g.restore();
}
export function bang(g, x, y, px = 6, op = 1) {
  const rows = ['.kkk.', 'kwwwk', 'kwkwk', 'kwwwk', 'kwwwk', 'kw.kw', 'kwwwk', '.kkk.', '..k..'];
  g.save(); g.globalAlpha *= op;
  rows.forEach((row, r) => [...row].forEach((ch, c) => {
    if (ch === '.') return; g.fillStyle = ch === 'w' ? '#ffffff' : EYE;
    g.fillRect(x + c * px, y + r * px, px + .5, px + .5);
  }));
  g.restore();
}
export function dust(g, x, y, t, px = 5, n = 6, seed = 1) {
  if (t <= 0 || t >= 1) return;
  g.save(); g.globalAlpha *= (1 - t);
  for (let i = 0; i < n; i++) {
    const side = i % 2 ? 1 : -1, k = (i >> 1) + 1, e = 1 - Math.pow(1 - t, 2);
    const dx = side * (16 + k * 15 + ((seed * 7 + i * 13) % 9)) * e, dy = -(6 + k * 5) * Math.sin(Math.PI * t * .9);
    const sz = px * (1 - t * .7); g.fillStyle = '#8b8577';
    g.fillRect(x + dx - sz / 2, y + dy - sz, sz + .5, sz + .5);
  }
  g.restore();
}
export function trail(g, x, y, dir, t, px = 4) {
  if (t <= 0 || t >= 1) return;
  g.save(); g.globalAlpha *= (1 - t) * .6; g.fillStyle = CREAM;
  for (let i = 0; i < 4; i++) {
    const len = (3 + (i % 2) * 3) * px, off = (i * 23 + 11) % 54 - 27;
    g.fillRect(x - dir * (34 + i * 11) - (dir > 0 ? len : 0), y - 34 + off, len + .5, px + .5);
  }
  g.restore();
}

/* ── small vector icons for nodes (drawn in a 24×24 box) ─── */
export function icon(g, kind, x, y, s = 22, col = PAL.dim) {
  g.save(); g.translate(x, y); g.scale(s / 24, s / 24);
  g.strokeStyle = col; g.fillStyle = col; g.lineWidth = 1.8; g.lineCap = 'round'; g.lineJoin = 'round';
  const L = (a, b, c, d) => { g.beginPath(); g.moveTo(a, b); g.lineTo(c, d); g.stroke(); };
  switch (kind) {
    case 'sheet':
      g.strokeRect(3, 4, 18, 16); L(3, 9.5, 21, 9.5); L(3, 15, 21, 15); L(9, 4, 9, 20); L(15, 4, 15, 20); break;
    case 'clock':
      g.beginPath(); g.arc(12, 12, 8.5, 0, TAU); g.stroke(); L(12, 7, 12, 12); L(12, 12, 16, 14); break;
    case 'search':
      g.beginPath(); g.arc(10.5, 10.5, 6.5, 0, TAU); g.stroke(); L(15.5, 15.5, 21, 21); break;
    case 'pen':
      L(5, 19, 18, 6); L(15, 3, 21, 9); L(5, 19, 4, 21); break;
    case 'mail':
      g.strokeRect(3, 5.5, 18, 13); L(3, 6.5, 12, 13); L(21, 6.5, 12, 13); break;
    case 'send':
      g.beginPath(); g.moveTo(3, 12); g.lineTo(21, 3.5); g.lineTo(14.5, 21); g.lineTo(11, 14); g.closePath(); g.stroke(); L(21, 3.5, 11, 14); break;
    case 'check':
      g.beginPath(); g.arc(12, 12, 8.5, 0, TAU); g.stroke(); L(7.5, 12.5, 10.5, 15.5); L(16.5, 8.5, 10.5, 15.5); break;
    case 'globe':
      g.beginPath(); g.arc(12, 12, 8.5, 0, TAU); g.stroke(); g.beginPath(); g.ellipse(12, 12, 4, 8.5, 0, 0, TAU); g.stroke(); L(3.5, 12, 20.5, 12); break;
    case 'score':
      L(4, 20, 4, 13); L(9, 20, 9, 8); L(14, 20, 14, 11); L(19, 20, 19, 4); L(2, 20, 22, 20); break;
    case 'webhook':
      g.beginPath(); g.arc(7, 8, 3.2, 0, TAU); g.stroke(); g.beginPath(); g.arc(17, 8, 3.2, 0, TAU); g.stroke(); g.beginPath(); g.arc(12, 18, 3.2, 0, TAU); g.stroke();
      L(9, 9.5, 11, 15); L(15, 9.5, 13, 15); L(10, 8, 14, 8); break;
    case 'filter':
      g.beginPath(); g.moveTo(3, 4); g.lineTo(21, 4); g.lineTo(14, 12); g.lineTo(14, 20); g.lineTo(10, 18); g.lineTo(10, 12); g.closePath(); g.stroke(); break;
    case 'tag':
      g.beginPath(); g.moveTo(4, 4); g.lineTo(13, 4); g.lineTo(20, 11); g.lineTo(11, 20); g.lineTo(4, 13); g.closePath(); g.stroke();
      g.beginPath(); g.arc(8, 8, 1.6, 0, TAU); g.fill(); break;
    case 'crm':
      g.strokeRect(3, 4, 18, 16); L(3, 9, 21, 9); L(10, 9, 10, 20); break;
    case 'digest':
      g.strokeRect(4, 3, 16, 18); L(8, 8, 16, 8); L(8, 12, 16, 12); L(8, 16, 13, 16); break;
    case 'mic':
      g.beginPath(); g.roundRect(9, 3, 6, 11, 3); g.stroke(); g.beginPath(); g.arc(12, 12, 6.5, 0, Math.PI); g.stroke(); L(12, 18.5, 12, 21); L(8.5, 21, 15.5, 21); break;
    case 'wave':
      L(3, 12, 5, 12); L(7, 7, 7, 17); L(9.5, 4, 9.5, 20); L(12, 9, 12, 15); L(14.5, 5, 14.5, 19); L(17, 8, 17, 16); L(19.5, 11, 19.5, 13); break;
    case 'spark':
      L(12, 3, 12, 21); L(3, 12, 21, 12); L(6, 6, 18, 18); L(18, 6, 6, 18); break;
    case 'user':
      g.beginPath(); g.arc(12, 8.5, 4, 0, TAU); g.stroke(); g.beginPath(); g.arc(12, 21, 7, Math.PI * 1.15, Math.PI * 1.85); g.stroke(); break;
    case 'bell':
      g.beginPath(); g.moveTo(6, 17); g.lineTo(6, 11); g.arc(12, 11, 6, Math.PI, 0); g.lineTo(18, 17); g.closePath(); g.stroke(); L(10, 20, 14, 20); break;
    default:
      g.strokeRect(4, 4, 16, 16);
  }
  g.restore();
}
export { BODY as POTATO };
