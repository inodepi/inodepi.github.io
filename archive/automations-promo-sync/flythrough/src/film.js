// inodepi · automations · Desktop Flythrough — day 7 (teaser, no voice) and day 10 (before/after, voice).
// One desk, three paper cards (a sheet, a shared inbox, a CRM) and a voxel courier who carries a single record between them.
// Day 7 ends mid-hop on "Tomorrow: the same job, one hop."  Day 10 turns the relay into one lit data run, then pulls back
// over the whole desk and drops a title card.  ?day=7|10.  Everything lands on the 16th grid at 120 BPM.
import * as THREE from 'three';
import { card, pill, rbox } from './world.js';
import { makeMonster } from './voxel.js';
import * as K from './cards.js';
import { clamp, lerp, seg, ss, eo, ei, eio, back, hash, V, arc, pop, beatBounce, squash, hops } from './anim.js';
import { CUES7, CUES10 } from './cues.js';

export const DAY = +(new URLSearchParams(location.search).get('day') || 7);
const FULL = DAY === 10 ? 30 : 20;
export const DUR = +(new URLSearchParams(location.search).get('dur') || FULL);
export const MAT = [2.34, 2.34];
export const END = { credit: DUR + 10 };
export const SUBS = DAY === 10 ? CUES10 : CUES7;
export const VO = SUBS;   // captions.js reads cues from here
export const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 ·×–—:.,/'()%$£";

const C = K.COL, TOP = .006, YAX = V(0, 1, 0);

// ── the desk layout (vertical frame: stations stack along z, so the tall frame is full) ──
export const CARDS = {
  sheet: { c: V(-.33, 0, .54), w: .46, h: .34, yaw: .05 },
  inbox: { c: V(.38, 0, .00), w: .40, h: .46, yaw: -.07 },
  crm: { c: V(-.30, 0, -.53), w: .44, h: .36, yaw: .04 },
};
export const at = (n, u, v, y = TOP) => { const d = CARDS[n]; return V(u / 1000 - d.w / 2, y, v / 1000 - d.h / 2).applyAxisAngle(YAX, d.yaw).add(d.c); };
const onMat = p => V(p.x, 0, p.z);

// ── timeline (16ths at 120 BPM = .125 s) ──
export const T = DAY === 10 ? {
  popCourier: 1.5, popRec: 1.625, hop1: [2.25, 3.75], print1: 3.875, shuffle: [5.25, 5.5],
  hop2: [6.25, 7.75], print2: 7.875, drop: [8.125, 8.5], pick: 8.625,
  hop3: [8.875, 10.125], rise: [10.25, 10.5], whip: [10.5, 11.4], route: [11.4, 12.1],
  run: [12.1, 15.0], pull: [15.25, 18.25], curtain: [16.5, 16.75, 17.0], hopHome: [17.0, 18.25],
  titleDrop: [19.5, 19.875], cta: 24.8,
} : {
  popCourier: .75, popRec: 1.0, hop1: [2.25, 3.75], print1: 3.875,
  hop2: [5.375, 6.875], print2: 7.0, hop3: [8.5, 10.0], print3: 10.125,
  hop4: [10.25, 11.375], pileDrop: [11.625, 12.0], unpile: 13.25,
  hop5: [14.75, 18.0], freeze: 16.375,
};

// ── pixel art ──
const COURIER = [
  '.....AAAAAA.....', '....AAAAAAAA....', '...AAAAAAAAAA...', '...aFFFFFFFFa...',
  '...FFFFFFFFFF...', '...FFKFFFFKFF...', '...FFFFFFFFFF...', '....FFffffFF....',
  '...BBSSSSSSBB...', '..BBBBBBBBBBBB..', '..BBbbbbbbbbBB..', '..BBBBBBBBBBBB..',
  '...FFFFFFFF.....', '...FF....FF.....', '...KK....KK.....', '................'];
const CPAL = { A: '#f0b429', a: '#d99a1a', F: '#f7f0e4', f: '#ded3c0', K: '#14181c', B: '#2f8fb0', b: '#24718c', S: '#20252b' };
const RECORD = [
  'DDDDDDDDDDDD', 'DAAAAAAAAAAD', 'DWWWWWWWWWWD', 'DWLLLLLLLLWD',
  'DWLLLLLLLLWD', 'DWLLLDLLLLWD', 'DWLLLLLLLLWD', 'DWWWWWWWWWWD',
  '.DDDDDDDDDD.', '..DDDDDDDD..'];
const RPAL = { W: '#f3f2ec', A: '#f0b429', L: '#8f969e', D: '#3c434b' };
const toArt = (rows, pal) => { const cells = []; rows.forEach((r, j) => [...r].forEach((ch, i) => { if (ch !== '.') cells.push([i, j, pal[ch]]); })); return { w: rows[0].length, h: rows.length, cells }; };

// ── card print ──
const chip = (c, s, x, y, col, fg, size = 10, pad = 10) => {
  c.font = `600 ${size}px ${K.MONO}`; const w = c.measureText(s.toUpperCase()).width + pad * 2;
  c.fillStyle = col; K.rr(c, x, y - size * .95, w, size * 1.9, size * .5); c.fill();
  K.txt(c, s.toUpperCase(), x + pad, y, { size, wt: 600, col: fg, ls: .4 });
  return w;
};
const rule = (c, y, x0 = 22, x1 = 438, col = K.COL.line) => { c.fillStyle = col; c.fillRect(x0, y, x1 - x0, 1.6); };

function drawSheet(c, st) {
  const W = 460, H = 340;
  K.cardBase(c, W, H, 'sheet', 'Quarterly leads', { headH: 86 });
  K.txt(c, '09:02', W - 28, 30, { size: 13, wt: 600, col: C.mute, align: 'right' });
  if (st.n > 1) K.txt(c, `×${st.n} copies`, W - 28, 56, { size: 12, wt: 600, col: C.accent, align: 'right' });
  else K.txt(c, 'row 1 of 212', W - 28, 56, { size: 11, wt: 500, col: C.mute, align: 'right' });
  const cols = [28, 176, 286, 372];
  ['account', 'contact', 'stage', 'owner'].forEach((s, i) => K.txt(c, s.toUpperCase(), cols[i], 106, { size: 10, wt: 600, col: C.mute, ls: 1.3 }));
  const rows = [
    ['Halden & Co', 'N. Okafor', 'proposal', 'me'],
    ['Northwind', 'J. Ruiz', 'new', 'me'],
    ['Okafor Studio', 'A. Bello', 'won', 'me'],
    ['Bramble', 'S. Kelly', 'new', 'me'],
    ['Kestrel', 'M. Ito', 'proposal', 'me']];
  rows.forEach((r, i) => {
    const y = 134 + i * 34;
    if (i === 0) {
      c.fillStyle = st.after ? 'rgba(46,168,134,.14)' : 'rgba(240,180,41,.17)';
      K.rr(c, 20, y - 15, 420, 30, 6); c.fill();
      c.fillStyle = st.after ? C.green : C.accent; c.fillRect(20, y - 15, 3, 30);
    }
    K.txt(c, r[0], cols[0], y, { size: 13.5, wt: 600 });
    K.txt(c, r[1], cols[1], y, { size: 12.5, wt: 500, col: C.mute });
    chip(c, r[2], cols[2], y - 1, i === 0 ? (st.after ? C.green : C.accent) : C.faint, i === 0 ? '#fff' : C.mute, 9, 8);
    K.txt(c, r[3], cols[3], y, { size: 11.5, wt: 500, col: C.mute });
    if (i === 0 && st.after) K.tick(c, W - 34, y, 15, C.green, 3.4);
  });
  rule(c, 306);
  K.txt(c, 'sheet · q4_pipeline.csv', 28, 322, { size: 11, wt: 500, col: C.mute });
  K.txt(c, st.after ? 'synced · just now' : 'last edit · 09:02', W - 28, 322, { size: 11, wt: 600, col: st.after ? C.green : C.mute, align: 'right' });
}

function drawInbox(c, st) {
  const W = 400, H = 460;
  K.cardBase(c, W, H, 'inbox', 'Shared inbox', { headH: 86 });
  K.txt(c, '12 unread', W - 24, 30, { size: 13, wt: 600, col: C.mute, align: 'right' });
  if (st.n > 1) K.txt(c, `×${st.n} copies`, W - 24, 56, { size: 12, wt: 600, col: C.accent, align: 'right' });
  const rows = [
    ['N. Okafor', 'Re: Q4 renewal — updated record', '09:04'],
    ['J. Ruiz', 'Invoice 2188 — chase again', '08:41'],
    ['A. Bello', 'Site visit notes', '08:12'],
    ['M. Ito', 'Fwd: new lead from webform', '07:58']];
  rows.forEach((r, i) => {
    const y = 124 + i * 58;
    if (i === 0) {
      c.fillStyle = st.after ? 'rgba(46,168,134,.12)' : 'rgba(240,180,41,.15)';
      K.rr(c, 18, y - 24, W - 36, 46, 7); c.fill();
    }
    c.fillStyle = i === 0 && st.after ? C.green : (i === 0 ? C.accent : '#c8cfd7');
    c.beginPath(); c.arc(30, y - 7, 3.4, 0, 7); c.fill();
    K.txt(c, r[0], 44, y - 9, { size: 13.5, wt: 600 });
    K.txt(c, r[1], 44, y + 9, { size: 11.5, wt: 500, col: C.mute });
    K.txt(c, r[2], W - 22, y - 9, { size: 10.5, wt: 500, col: C.mute, align: 'right' });
    if (i === 0 && st.n > 0) K.txt(c, 'draft', W - 22, y + 10, { size: 10, wt: 600, col: C.accent, align: 'right' });
    if (i === 0 && st.after) K.tick(c, W - 30, y + 10, 12, C.green, 3);
    rule(c, y + 24, 22, W - 22);
  });
  // the compose pane
  K.rr(c, 18, 356, W - 36, 86, 8); c.fillStyle = st.n > 0 ? C.faint : 'rgba(242,244,246,.5)'; c.fill();
  if (st.n > 0) {
    K.txt(c, 'to      n.okafor@haldenandco.com', 32, 374, { size: 9.5, wt: 500, col: C.mute });
    K.txt(c, 'subject Q4 renewal — updated record', 32, 390, { size: 9.5, wt: 500, col: C.mute });
    K.txt(c, 'attach  record.csv', 32, 406, { size: 9.5, wt: 500, col: C.mute });
    if (st.after) {
      K.rr(c, W - 150, 412, 118, 22, 11); c.fillStyle = C.green; c.fill();
      K.txt(c, 'sent · 0.4 s', W - 91, 423, { size: 9.5, wt: 600, col: '#fff', align: 'center' });
    } else {
      K.rr(c, W - 104, 412, 72, 22, 11); c.fillStyle = C.accent; c.fill();
      K.txt(c, 'send', W - 68, 423, { size: 10, wt: 700, col: '#3a2a00', align: 'center' });
    }
  } else K.txt(c, 'no draft yet', 32, 400, { size: 11, wt: 500, col: '#b9c0c9' });
}

function drawCRM(c, st) {
  const W = 440, H = 360;
  K.cardBase(c, W, H, 'crm', 'Deal · Halden & Co', { headH: 86 });
  if (st.after) chip(c, 'live', W - 84, 30, C.green, '#fff', 9, 9);
  else { c.strokeStyle = '#e8b3b3'; c.lineWidth = 1.4; K.rr(c, W - 112, 20, 84, 20, 10); c.stroke(); K.txt(c, 'stale 6 d', W - 70, 30, { size: 9.5, wt: 600, col: C.red, align: 'center' }); }
  K.txt(c, 'HALDEN & CO', 28, 122, { size: 23, wt: 700, ls: .5 });
  K.txt(c, 'N. Okafor · Head of Ops', 28, 148, { size: 12, wt: 500, col: C.mute });
  const stages = ['discovery', 'proposal', 'won'];
  stages.forEach((s, i) => {
    const x = 28 + i * 128, w = 118, y = 172, on = st.after ? i === 1 : i === 0;
    c.fillStyle = on ? (st.after ? C.green : C.ink) : 'rgba(224,228,232,.55)';
    K.rr(c, x, y, w, 30, 7); c.fill();
    K.txt(c, s.toUpperCase(), x + w / 2, y + 15, { size: 9.5, wt: 600, col: on ? '#fff' : C.mute, align: 'center', ls: .8 });
    if (st.after && i === 1) K.tick(c, x + w - 12, y + 15, 9, '#fff', 2.2);
  });
  rule(c, 226, 28, W - 28);
  const field = (k, v, x, col = C.ink) => { K.txt(c, k.toUpperCase(), x, 244, { size: 9, wt: 600, col: C.mute, ls: 1 }); K.txt(c, v, x, 262, { size: 13, wt: 600, col }); };
  field('owner', 'me', 28);
  field('value', '48k', 140);
  field('last touch', st.after ? 'just now' : '6 days ago', 244, st.after ? C.green : C.ink);
  rule(c, 286, 28, W - 28);
  K.txt(c, 'activity', 28, 302, { size: 9, wt: 600, col: C.mute, ls: 1 });
  K.txt(c, st.after ? 'record synced · 09:04' : 'waiting on updated record', 28, 322, { size: 12, wt: 500, col: st.after ? C.green : C.mute });
}

export function build(ctx) {
  const { world, ev } = ctx, scene = world.scene;
  ctx.fx = { flash: 0 };
  const mat = (col, r = .5, extra = {}) => new THREE.MeshStandardMaterial({ color: col, roughness: r, ...extra });

  // ── cards ──
  const cv = {}, cd = {}, state = {};
  const mk = (n, draw, init) => {
    const d = CARDS[n], [c, x] = K.canvas(d.w * 1000, d.h * 1000, 3.2);
    cv[n] = x; draw(x, init); state[n] = JSON.stringify(init);
    const g = card(world, c, d.w, d.h, TOP); g.position.copy(d.c); g.rotation.y = d.yaw; scene.add(g); cd[n] = g;
  };
  const re = (n, draw, st) => { const k = JSON.stringify(st); if (k === state[n]) return; state[n] = k; draw(cv[n], st); cd[n].userData.redraw(); };
  mk('sheet', drawSheet, { after: false }); mk('inbox', drawInbox, { n: 0, after: false }); mk('crm', drawCRM, { after: false });

  // ── props: pen, sticky pad, mug, eraser, and a standing desk clock ──
  {
    const pen = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(.0062, .0062, .15, 20), mat('#2a3038', .38)); body.rotation.z = Math.PI / 2; pen.add(body);
    const tip = new THREE.Mesh(new THREE.ConeGeometry(.0062, .022, 20), mat('#c9ccd4', .3, { metalness: .55 })); tip.rotation.z = -Math.PI / 2; tip.position.x = .086; pen.add(tip);
    const clip = new THREE.Mesh(rbox(.05, .002, .004, .001), mat('#c9ccd4', .3, { metalness: .55 })); clip.position.set(-.038, .0065, 0); pen.add(clip);
    pen.position.set(-.64, .0062, .26); pen.rotation.y = .62; pen.traverse(o => o.castShadow = true); scene.add(pen);

    for (let i = 0; i < 5; i++) {
      const n = new THREE.Mesh(rbox(.10, .0016, .10, .002), mat(i === 4 ? '#f7e9bd' : '#f4e3b5', .85));
      n.position.set(.64, .0008 + i * .0016, .74); n.rotation.y = .28 + i * .035; n.rotation.z = (i % 2 ? 1 : -1) * .012;
      n.castShadow = n.receiveShadow = true; scene.add(n);
    }
    const mug = new THREE.Group();
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(.052, .048, .1, 40, 1, true), mat('#f1ece2', .45, { side: THREE.DoubleSide })); cup.position.y = .05; mug.add(cup);
    const bottom = new THREE.Mesh(new THREE.CircleGeometry(.048, 40), mat('#f1ece2', .45)); bottom.rotation.x = -Math.PI / 2; bottom.position.y = .002; mug.add(bottom);
    const coffee = new THREE.Mesh(new THREE.CircleGeometry(.049, 40), mat('#6b4a32', .25)); coffee.rotation.x = -Math.PI / 2; coffee.position.y = .085; mug.add(coffee);
    const handle = new THREE.Mesh(new THREE.TorusGeometry(.026, .007, 12, 24, Math.PI), mat('#f1ece2', .45)); handle.rotation.z = -Math.PI / 2; handle.position.set(.052, .05, 0); mug.add(handle);
    mug.position.set(-.46, 0, .86); mug.rotation.y = 2.3; mug.traverse(o => o.castShadow = o.receiveShadow = true); scene.add(mug);
    const er = new THREE.Mesh(rbox(.05, .014, .022, .004), mat('#e6b0a2', .7)); er.position.set(.56, .007, -.92); er.rotation.y = .5; er.castShadow = true; scene.add(er);
  }
  // the clock: a standing card with printed ticks and real 3D hands (it races through the morning)
  const clock = new THREE.Group(); clock.position.set(-.02, 0, -1.0); clock.rotation.y = .12; scene.add(clock);
  const hands = {};
  {
    const bodyM = new THREE.Mesh(rbox(.104, .118, .022, .006), mat(C.card, .8)); bodyM.position.y = .059; bodyM.rotation.x = -.12; bodyM.castShadow = bodyM.receiveShadow = true; clock.add(bodyM);
    const [c, x] = K.canvas(220, 250, 2); x.fillStyle = C.card; K.rr(x, 0, 0, 220, 250, 16); x.fill(); K.grain(x, 220, 250, 3, 1400);
    x.strokeStyle = C.line; x.lineWidth = 3; for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2, r0 = 78, r1 = i % 3 ? 84 : 90; x.beginPath(); x.moveTo(110 + Math.sin(a) * r0, 118 - Math.cos(a) * r0); x.lineTo(110 + Math.sin(a) * r1, 118 - Math.cos(a) * r1); x.stroke(); }
    x.fillStyle = C.accent; x.fillRect(0, 0, 220, 10);
    K.txt(x, 'MORNING', 18, 30, { size: 13, wt: 600, col: C.accent, ls: 2 });
    K.txt(x, 'desk clock', 18, 232, { size: 12, wt: 600, col: C.mute, ls: 1.4 });
    const face = new THREE.Mesh(new THREE.PlaneGeometry(.092, .105), new THREE.MeshStandardMaterial({ map: world.tex(c), transparent: true, roughness: .8 }));
    face.position.set(0, .060, .0118); face.rotation.x = -.12; clock.add(face);
    const hand = (len, w, col, z) => { const m = new THREE.Mesh(rbox(w, len, .0018, .0008), mat(col, .4)); m.position.set(0, 0, 0); m.geometry.translate(0, len / 2, 0); const g = new THREE.Group(); g.add(m); g.position.set(0, .061, .0135 + z); g.rotation.x = -.12; clock.add(g); return g; };
    hands.h = hand(.030, .0042, C.ink, 0);
    hands.m = hand(.044, .0032, C.ink, .0015);
    hands.s = hand(.046, .0014, C.accent, .003);
  }
  // soft window light on the desk
  { const [c, x] = K.canvas(512, 512, 1); x.filter = 'blur(26px)'; x.fillStyle = 'rgba(255,236,205,1)';
    for (const [a, b] of [[60, 60], [270, 60], [60, 270], [270, 270]]) x.fillRect(a, b, 180, 180); x.filter = 'none';
    const lm = new THREE.MeshBasicMaterial({ map: world.tex(c), transparent: true, opacity: .22, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
    for (const [px, pz, s, r] of [[-.30, .58, 1.2, .5], [.55, -.32, .9, .5]]) { const m = new THREE.Mesh(new THREE.PlaneGeometry(s, s * .8), lm); m.rotation.set(-Math.PI / 2, 0, r); m.position.set(px, .0003, pz); m.renderOrder = 1; scene.add(m); } }

  // ── places ──
  const P = {
    sheet: at('sheet', 478, 160, 0), sheetWait: at('sheet', 478, 236, 0),
    inbox: at('inbox', -10, 150, 0), inboxWait: at('inbox', -10, 292, 0),
    crm: at('crm', 464, 150, 0), crmWait: at('crm', 464, 246, 0),
    printS: at('sheet', 430, 150, TOP), printI: at('inbox', 54, 132, TOP), printC: at('crm', 400, 150, TOP),
    pile: at('inbox', 0, 176, 0),
  };

  // ── cast ──
  const courier = makeMonster(toArt(COURIER, CPAL), .0062, 'courier', .95); scene.add(courier.root);
  const record = makeMonster(toArt(RECORD, RPAL), .0046, 'record', .7); scene.add(record.root);

  // ── pile of paper (day 7): drops on the courier on the downbeat ──
  const pile = new THREE.Group(); pile.position.copy(P.pile); scene.add(pile);
  const slabs = [];
  for (let i = 0; i < 6; i++) {
    const s = new THREE.Mesh(rbox(.27 - i * .012, .007, .205 - i * .008, .002), mat(i === 2 ? '#f3ead2' : C.card, .86));
    s.position.set((hash(i) - .5) * .03, .006 + i * .0072, (hash(i + 9) - .5) * .025);
    s.rotation.y = (hash(i + 3) - .5) * .35; s.castShadow = s.receiveShadow = true; pile.add(s); slabs.push(s);
  }
  const tab = new THREE.Mesh(rbox(.05, .0012, .02, .001), mat(C.red, .7)); tab.position.set(.07, .006 + 2 * .0072 + .004, -.09); tab.rotation.y = .3; pile.add(tab);
  // the top sheet of the backlog still carries its print
  { const [c, x] = K.canvas(280, 210, 2.4); x.fillStyle = C.card; x.fillRect(0, 0, 280, 210);
    K.txt(x, 'BACKLOG', 14, 18, { size: 11, wt: 600, col: C.accent, ls: 2.2 });
    for (let i = 0; i < 5; i++) { x.fillStyle = 'rgba(32,37,43,.16)'; x.fillRect(14, 40 + i * 26, 150 + (i % 3) * 30, 3); x.fillRect(14, 50 + i * 26, 90 + (i % 2) * 40, 2); }
    x.strokeStyle = '#e8b3b3'; x.lineWidth = 1.2; K.rr(x, 186, 10, 82, 18, 9); x.stroke();
    K.txt(x, 'OVERDUE', 227, 19, { size: 8.5, wt: 600, col: C.red, align: 'center', ls: 1 });
    const top = new THREE.Mesh(new THREE.PlaneGeometry(.248, .186), new THREE.MeshStandardMaterial({ map: world.tex(c), transparent: true, roughness: .85 }));
    top.rotation.x = -Math.PI / 2; top.position.y = .0038; slabs[5].add(top); }

  // the path the courier has already walked: a faint grey dotted relay line
  const TRAIL = [P.sheet, V(.02, 0, .30), P.inbox, V(.10, 0, -.30), P.crm, V(-.18, 0, -.08), P.sheet].map(p => V(p.x, .0014, p.z));
  const trailCurve = new THREE.CatmullRomCurve3(TRAIL);
  const NT = 170, tp = [...Array(NT)].map((_, k) => trailCurve.getPointAt((k + .5) / NT));
  const trailMesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(.0024, .0024, .0016, 10), new THREE.MeshStandardMaterial({ color: '#b3bac2', roughness: .9 }), NT);
  scene.add(trailMesh);

  // ── route + data run (day 10) ──
  const ROUTE = [P.printS, V(-.04, 0, .46), P.printI, V(.10, 0, -.33), P.printC].map(p => V(p.x, .0016, p.z));
  const route = new THREE.CatmullRomCurve3(ROUTE);
  const NR = 120, rp = [...Array(NR)].map((_, k) => route.getPointAt((k + .5) / NR));
  const dotGeo = new THREE.CylinderGeometry(.0046, .0046, .0022, 14);
  const routeMesh = new THREE.InstancedMesh(dotGeo, new THREE.MeshStandardMaterial({ color: C.accent, roughness: .42, emissive: C.accent, emissiveIntensity: 0 }), NR);
  routeMesh.castShadow = true; scene.add(routeMesh);
  const PK = 26, cubes = new THREE.InstancedMesh(rbox(.012, .012, .012, .003), new THREE.MeshStandardMaterial({ color: C.accent, roughness: .35, emissive: C.accent, emissiveIntensity: .5 }), PK);
  cubes.castShadow = true; scene.add(cubes);

  // impact rings
  const ringAt = (t0, p, amp) => { const m = new THREE.Mesh(new THREE.RingGeometry(.97, 1, 96), new THREE.MeshBasicMaterial({ color: C.accent, transparent: true, depthWrite: false, fog: false })); m.rotation.x = -Math.PI / 2; m.position.set(p.x, .0006, p.z); m.renderOrder = 2; scene.add(m); return { m, t0, amp }; };
  const rings = [ringAt(DAY === 10 ? 3.875 : 12.0, DAY === 10 ? P.printI : P.pile, 1.2)];
  if (DAY === 10) rings.push(ringAt(15.0, P.printC, .8));

  // status pills that rise out of the cards in the automated pass
  const pills = [
    { s: 'sent 09:04', p: at('sheet', 300, 205, TOP), t0: 12.55, bg: C.green },
    { s: 'replied', p: at('inbox', 190, 250, TOP), t0: 13.55, bg: C.green },
    { s: 'logged', p: at('crm', 300, 262, TOP), t0: 14.85, bg: C.green },
  ].map(o => { const m = pill(world, o.s, { h: .022, size: 30, bg: o.bg, fg: '#fff', font: K.MONO, wt: 600 }); m.castShadow = false; return { ...o, m }; });

  // ── title card (day 10): drops into open desk at the back right ──
  const BIG = { w: .56, h: .252, c: V(.26, 0, -.82), yaw: -.045 };
  const bigTitle = new THREE.Group(); bigTitle.position.copy(BIG.c); bigTitle.rotation.y = BIG.yaw; scene.add(bigTitle);
  { const [c, x] = K.canvas(600, 270, 3.2); x.fillStyle = C.card; K.rr(x, 0, 0, 600, 270, 18); x.fill(); K.grain(x, 600, 270, 13, 4200);
    x.fillStyle = C.accent; x.fillRect(0, 0, 16, 270);
    K.txt(x, 'DELIVERED', 54, 52, { size: 15, wt: 600, col: C.accent, ls: 4 });
    K.txt(x, '2–3 weeks', 50, 140, { size: 96, wt: 600, font: K.WIDE, ls: -3 });
    K.txt(x, 'one process, automated', 54, 218, { size: 25, wt: 500, col: C.mute });
    const g = card(world, c, BIG.w, BIG.h, TOP); bigTitle.add(g); }
  const bigAt = (u, v, y = TOP + .001) => V(u / 1000 - BIG.w / 2, y, v / 1000 - BIG.h / 2).applyAxisAngle(YAX, BIG.yaw).add(BIG.c);

  // ── text meant to be read ──
  const uv = (n, u0, v0, u1, v1, y = TOP) => () => [at(n, u0, v0, y), at(n, u1, v0, y), at(n, u0, v1, y), at(n, u1, v1, y)];
  ctx.read = [];
  if (DAY === 10) ctx.read.push(['title', '2–3 weeks', T.titleDrop[1], DUR + 1, () => [bigAt(44, 82), bigAt(420, 82), bigAt(44, 200), bigAt(420, 200)]]);

  // ── sound events ──
  const push = o => ev.push(o);
  push({ t: T.popCourier, type: 'pop' }, { t: T.popRec, type: 'pop' });
  for (const k of ['hop1', 'hop2', 'hop3']) push({ t: T[k][0], type: 'hop' }, { t: T[k][1], type: 'land' });
  if (DAY === 10) {
    push({ t: T.shuffle[0], type: 'hop' }, { t: T.shuffle[1], type: 'land' }, { t: T.drop[0], type: 'paper' },
      { t: T.pick, type: 'pop' }, { t: T.hop3[0], type: 'hop' }, { t: T.hop3[1], type: 'land' },
      { t: T.whip[0], type: 'whoosh' }, ...[...Array(10)].map((_, i) => ({ t: T.route[0] + i * .075, type: 'dot' })),
      ...[...Array(18)].map((_, i) => ({ t: T.run[0] + i * .15, type: 'cube', k: i })),
      { t: 12.55, type: 'lock' }, { t: 13.55, type: 'lock' }, { t: 14.85, type: 'lock' }, { t: 15.0, type: 'chime' },
      ...[0, 1, 2].map(i => ({ t: T.curtain[i], type: 'hop' })), ...[0, 1, 2].map(i => ({ t: T.curtain[i] + .18, type: 'land' })),
      { t: T.hopHome[0], type: 'hop' }, { t: T.hopHome[1], type: 'land' },
      { t: T.titleDrop[0] + .2, type: 'whoosh' }, { t: T.titleDrop[1], type: 'stamp' }, { t: T.cta, type: 'chime' },
      { t: 3.3, type: 'whoosh' }, { t: 7.6, type: 'whoosh' }, { t: 15.3, type: 'whoosh' }, { t: 16.35, type: 'whoosh' });
  } else {
    push({ t: T.hop4[0], type: 'hop' }, { t: T.hop4[1], type: 'land' },
      { t: T.pileDrop[0], type: 'whoosh' }, { t: T.pileDrop[1], type: 'slam' },
      { t: T.pileDrop[1] + .25, type: 'paper' }, { t: T.unpile, type: 'pop' },
      { t: T.hop5[0], type: 'hop' },
      { t: 3.3, type: 'whoosh' }, { t: 6.7, type: 'whoosh' }, { t: 9.8, type: 'whoosh' }, { t: 16.35, type: 'whoosh' });
  }
  // prints land on the cards, clock ticks under everything
  push({ t: T.print1, type: 'stamp' }, { t: T.print2, type: 'stamp' });
  if (DAY === 7) push({ t: T.print3, type: 'stamp' });
  for (let t = 0; t < DUR; t += .5) push({ t, type: 'tick', soft: 1 });

  // ── subjects the camera can follow ──
  const S = { cpos: P.sheet.clone(), rec: P.sheet.clone(), head: P.printS.clone(), courierVis: false };
  Object.assign(ctx.subj, {
    sheet: () => at('sheet', 230, 170, .02), sheetTop: () => at('sheet', 230, 120, .02), sheetRow: () => at('sheet', 230, 160, .02),
    inbox: () => at('inbox', 190, 210, .02), inboxTop: () => at('inbox', 190, 140, .02), inboxRow: () => at('inbox', 150, 170, .02),
    crm: () => at('crm', 215, 190, .02), crmTop: () => at('crm', 215, 130, .02), crmRow: () => at('crm', 200, 170, .02),
    clock: () => V(-.02, .074, -1.0), clockLow: () => V(.64, .045, .50),
    courier: () => S.cpos.clone().add(V(0, .045, 0)), rec: () => S.rec.clone().add(V(0, .02, 0)), head: () => S.head.clone(),
    wide: () => V(-.03, 0, .02), wide2: () => V(-.10, 0, .03), final: () => V(-.01, 0, -.02),
    title: () => V(BIG.c.x, .045, BIG.c.z), mid: () => V(.02, 0, -.10),
    sheetPair: () => at('sheet', 255, 195, .02), inboxPair: () => at('inbox', 200, 205, .02), crmPair: () => at('crm', 235, 195, .02),
  });

  // ── helpers ──
  const hopList = DAY === 10
    ? [{ t0: T.hop1[0], t1: T.hop1[1], from: P.sheet, to: P.inbox, h: .24 },
       { t0: T.shuffle[0], t1: T.shuffle[1], from: P.inbox, to: P.inboxWait, h: .05 },
       { t0: T.hop2[0], t1: T.hop2[1], from: P.inboxWait, to: P.crm, h: .24 },
       { t0: 8.375, t1: 8.5, from: P.crm, to: P.crmWait, h: .04 },
       { t0: T.hop3[0], t1: T.hop3[1], from: P.crmWait, to: P.sheetWait, h: .24 }]
    : [{ t0: T.hop1[0], t1: T.hop1[1], from: P.sheet, to: P.inbox, h: .22 },
       { t0: T.hop2[0], t1: T.hop2[1], from: P.inbox, to: P.crm, h: .26 },
       { t0: T.hop3[0], t1: T.hop3[1], from: P.crm, to: P.sheet, h: .26 },
       { t0: T.hop4[0], t1: T.hop4[1], from: P.sheet, to: P.inbox, h: .22 },
       { t0: T.hop5[0], t1: T.hop5[1], from: P.inbox, to: P.crm, h: .24 }];

  const pileSettle = (t) => {
    const d = t - T.pileDrop[1];
    if (d < 0) return 0;
    return .0032 * Math.sin(d * 26) * Math.exp(-d * 4.5) + (d < .4 ? .002 * Math.sin(d * 60) * Math.exp(-d * 6) : 0);
  };
  const cardJolt = (t, base) => {
    const d = t - base;
    if (d < 0 || d > 1.4) return 0;
    return .0028 * Math.sin(d * 44) * Math.exp(-d * 4.2);
  };

  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), ONE = V(1, 1, 1);
  const tmpP = new THREE.Vector3();

  return t => {
    const day10 = DAY === 10;
    const tc = day10 ? t : Math.min(t, T.freeze);

    // ── cards state ──
    if (day10) {
      re('sheet', drawSheet, { n: t >= T.print3 ? 2 : 1, after: t >= 12.55 });
      re('inbox', drawInbox, { n: 1, after: t >= 13.55 });
      re('crm', drawCRM, { after: t >= 14.85 });
    } else {
      re('sheet', drawSheet, { n: t >= T.print3 ? 2 : 1, after: false });
      re('inbox', drawInbox, { n: t >= T.hop4[1] ? 2 : 1, after: false });
      re('crm', drawCRM, { after: false });
    }

    // ── the walked trail (grey dotted relay line) ──
    {
      const prog = !day10 ? seg(t, 2.5, 11.3) : seg(t, 2.5, 10.3);
      const fade = day10 ? 1 - ss(seg(t, 11.35, 12.0)) : 1;
      tp.forEach((p, k) => {
        const u = (k + .5) / NT, on = u <= prog ? Math.min(1, (prog - u) * 60) : 0;
        m4.compose(p, q.identity(), V(1, 1, 1).multiplyScalar(Math.max(1e-4, on * fade)));
        trailMesh.setMatrixAt(k, m4);
      });
      trailMesh.instanceMatrix.needsUpdate = true;
      trailMesh.visible = prog > 0 && fade > .01;
    }

    // ── the courier ──
    let pos, air = null, lands, takeoffs, yaw = .12, vis = day10 ? t >= 0 : t >= T.popCourier, sq = 1, hidden = false;
    const P0 = pop(t, T.popCourier, .4, .04);
    if (!day10 && t >= T.freeze) {
      // frozen mid-hop: the take-off that never lands
      const h = hops(T.freeze, hopList, P.sheet);
      pos = h.pos.clone();
      const bob = .003 * Math.sin((t - T.freeze) * 2.4);
      pos.y += bob;
      sq = 1 + .05 * Math.sin((t - T.freeze) * 2.4);
      yaw = .35;
    } else {
      const h = hops(tc, hopList, P.sheet);
      pos = h.pos.clone(); air = h.air; lands = h.lands; takeoffs = h.takeoffs;
      if (h.dir) yaw = clamp(Math.atan2(h.dir.x, h.dir.z) * .5, -.65, .65);
      // face the camera while waiting
      const waiting = day10
        ? (t > T.hop1[1] + .05 && t < T.shuffle[0] - .05) || (t > T.shuffle[1] + .05 && t < T.hop2[0] - .05) || (t > T.hop2[1] + .1 && t < T.hop3[0] - .05) || t > T.hop3[1] + .1
        : (t > T.hop1[1] + .05 && t < T.hop2[0] - .05) || (t > T.hop2[1] + .1 && t < T.hop3[0] - .05) || (t > T.hop3[1] + .1 && t < T.hop4[0] - .05) || (t > T.pileDrop[1] + .5 && t < T.hop5[0] - .5);
      if (waiting) yaw = clamp(yaw, -.3, .3);
      const idle = waiting ? beatBounce(t, T.hop1[1] + .1, DUR, .012) : { y: 0, sq: 1 };
      pos.y += idle.y;
      sq = squash(tc, lands, takeoffs, air) * idle.sq;
    }
    // the pile squashes him flat (day 7)
    let squashed = 1;
    if (!day10) {
      if (t >= T.pileDrop[1] && t < T.unpile) {
        squashed = .18 + .025 * Math.sin(t * 20);
        pos.z += .13 * ss(seg(t, T.pileDrop[1], T.pileDrop[1] + .18));   // squeezed out from under the stack, flat
        yaw = .06;
      } else if (t >= T.unpile && t < T.unpile + .5) {
        pos.z += .13 * (1 - ss(seg(t, T.unpile, T.unpile + .3)));
        squashed = .13 + .87 * back(seg(t, T.unpile, T.unpile + .42), 2.0);
      }
    }
    pos.y += P0.y;
    S.cpos.copy(pos); S.courierVis = vis;
    courier.set({ pos, vis, e: day10 ? 1 : P0.e, hinge: day10 ? 1 : P0.hinge, sq: Math.max(.1, (day10 ? 1 : P0.sq) * sq * squashed), yaw, scale: 1 });
    courier.blink(((t + .4) % 2.2) < .12 || (!day10 && t > T.pileDrop[1] && t < T.unpile + .2));

    // ── the record: carried, dropped, or riding the route ──
    {
      let rp, e = 1, hinge = .55, sc = 1, ry = yaw, lit = 0;
      const carry = 0.132 + .004 * Math.sin(t * 3.1);
      if (day10 && t >= T.run[0] && t < T.run[1] + .1) {
        const u = seg(t, T.run[0], T.run[1]);
        const p = route.getPointAt(clamp(u));
        rp = V(p.x, .012 + .006 * Math.abs(Math.sin(u * 40)), p.z);
        hinge = .18; ry = .2 + u * 2.2; lit = 1;
      } else if (day10 && t >= T.drop[0] && t < T.pick) {
        const u = ss(seg(t, T.drop[0], T.drop[1]));
        const from = P.crm.clone().setY(.098), to = P.printC.clone().setY(TOP + .003);
        rp = from.lerp(to, u); rp.y += .05 * (1 - u) * Math.sin(Math.PI * u * .5) + .02 * Math.sin(Math.PI * u);
        hinge = lerp(.55, 0, u); e = lerp(1, 1, u); ry = lerp(yaw, .2, u);
      } else if (day10 && t >= 15.0) {
        sc = 0;
      } else {
        rp = pos.clone().add(V(0, carry, 0));
        if (!day10 && t > T.pileDrop[1] && t < T.unpile) { rp = pos.clone().add(V(.12, .012, .03)); hinge = 0; }
      }
      if (rp) S.rec.copy(rp);
      record.set({ pos: rp || V(0, -1, 0), vis: vis && t >= T.popRec && sc > .001, e, hinge, sq: 1, yaw: ry, scale: sc, tiltZ: lit ? .12 : 0 });
      record.blink(false);
    }

    // ── pile (day 7) ──
    if (!day10) {
      const dropU = ss(seg(t, T.pileDrop[0], T.pileDrop[1]));
      const d = t - T.pileDrop[1];
      pile.visible = t >= T.pileDrop[0] - .1;
      pile.position.y = (1 - ei(seg(t, T.pileDrop[0], T.pileDrop[1]))) * .55;
      const wob = d > 0 ? .02 * Math.sin(d * 18) * Math.exp(-d * 5) : 0;
      pile.rotation.z = wob; pile.rotation.x = wob * .6;
      pile.scale.set(1, Math.max(.05, dropU), 1);
      slabs.forEach((s, i) => { s.position.y = .006 + i * .0072 + (d > 0 ? .001 * Math.sin(d * 20 - i * .6) * Math.exp(-d * 4) : 0); });
      // the inbox jolts on the beat under the pile
      cd.inbox.position.y = pileSettle(t);
      cd.inbox.rotation.z = CARDS.inbox.yaw * 0 + cardJolt(t, T.pileDrop[1]);
    } else {
      pile.visible = false; cd.inbox.position.y = 0; cd.inbox.rotation.z = 0;
    }

    // ── route + data run (day 10) ──
    if (day10) {
      const draw = seg(t, T.route[0], T.route[1]);
      rp.forEach((p, k) => {
        const on = t >= T.route[0] + (k / NR) * (T.route[1] - T.route[0]);
        const s = on ? back(clamp((t - (T.route[0] + (k / NR) * (T.route[1] - T.route[0]))) / .12), 2) : 0;
        m4.compose(p, q.identity(), V(1, 1, 1).multiplyScalar(Math.max(1e-4, s))); routeMesh.setMatrixAt(k, m4);
      });
      routeMesh.instanceMatrix.needsUpdate = true;
      const headU = seg(t, T.run[0], T.run[1]);
      routeMesh.material.emissiveIntensity = t < T.route[0] ? 0 : (t < T.run[1] + .4 ? .55 + .45 * Math.sin(t * 12) : .35 + .25 * Math.exp(-Math.abs(t - 16.8)));
      // cubes
      const m4c = new THREE.Matrix4(), qc = new THREE.Quaternion();
      for (let k = 0; k < PK; k++) {
        const u = headU - k * .017;
        const on = t >= T.run[0] && u > 0 && t < T.run[1] + .25;
        const p = on ? route.getPointAt(clamp(u)) : V(0, -1, 0);
        const sc = on ? Math.min(1, (t - T.run[0]) * 4) * Math.max(0, 1 - (u < .02 ? 1 : 0)) : 0;
        p.y = .011 + .008 * Math.abs(Math.sin(u * 55 + k));
        qc.setFromEuler(new THREE.Euler(u * 6 + k, u * 9, 0));
        m4c.compose(p, qc, V(1, 1, 1).multiplyScalar(Math.max(1e-4, sc)));
        cubes.setMatrixAt(k, m4c);
      }
      cubes.instanceMatrix.needsUpdate = true;
      cubes.visible = t >= T.run[0] && t < T.run[1] + .3;
      // head position for the camera
      if (t >= T.run[0] && t <= T.run[1]) S.head.copy(route.getPointAt(clamp(headU))).setY(.03);
      else S.head.copy(P.printC).setY(.03);
    } else { routeMesh.visible = false; cubes.visible = false; }

    // ── pills that rise out of the cards ──
    for (const b of pills) {
      const on = day10 && t >= b.t0 && t < b.t0 + 1.9;
      b.m.visible = on;
      if (on) {
        const p = eo(seg(t, b.t0, b.t0 + .3)) * (1 - ss(seg(t, b.t0 + 1.6, b.t0 + 1.9)));
        b.m.position.copy(b.p).add(V(0, .075 + .055 * eo(seg(t, b.t0, b.t0 + .45)), 0));
        b.m.scale.setScalar(Math.max(.001, p));
        b.m.face(ctx.camera);
      }
    }

    // ── rings ──
    for (const r of rings) {
      const d = t - r.t0, on = d > 0 && d < 1.1; r.m.visible = on;
      if (on) { r.m.scale.setScalar((.05 + d * .22) * r.amp); r.m.material.opacity = .5 * (1 - d / 1.1); }
    }

    // ── curtain call + title drop (day 10) ──
    if (day10) {
      const stations = [cd.sheet, cd.inbox, cd.crm];
      stations.forEach((g, k) => {
        const d = t - T.curtain[k];
        g.position.y = d > 0 && d < .42 ? .022 * arc(d / .42) : 0;
      });
      // the courier's one long run along the lit route (his last hop)
      const hu = seg(t, T.hopHome[0], T.hopHome[1]);
      if (t >= T.hopHome[0] && t < T.hopHome[1] + .2) {
        const p = route.getPointAt(clamp(hu));
        S.cpos.copy(p); courier.set({ pos: p, vis: true, e: 1, hinge: 1, sq: 1 + .1 * Math.sin(Math.PI * hu), yaw: .35, scale: 1 });
      }
      const td = T.titleDrop[0], land = T.titleDrop[1], p = seg(t, td, land), d = t - land;
      bigTitle.visible = t >= td;
      bigTitle.position.y = (1 - ei(p)) * .62 + (d > 0 && d < .4 ? .014 * Math.sin(Math.PI * d / .4) * (1 - d / .4) : 0);
      const tq = d > 0 && d < .22 ? 1 - .22 * Math.sin(Math.PI * d / .22) : 1;
      bigTitle.scale.set(1 / Math.sqrt(tq), tq, 1 / Math.sqrt(tq));
      if (t >= 18.25 && t < T.hopHome[0] + .3) { /* keep him standing at the CRM after the run */ }
      if (t >= T.hopHome[1]) {
        const p2 = P.crm.clone(); S.cpos.copy(p2);
        const idle = beatBounce(t, T.hopHome[1], DUR, .012);
        courier.set({ pos: p2.clone().add(V(0, idle.y, 0)), vis: true, e: 1, hinge: 1, sq: idle.sq, yaw: .3, scale: 1 });
        record.set({ pos: p2.clone().add(V(0, .132 + idle.y, 0)), vis: true, e: 1, hinge: .55, sq: 1, yaw: .3, scale: 1 });
      }
    } else {
      bigTitle.visible = false;
      cd.sheet.position.y = cd.crm.position.y = 0;
    }

    // ── the desk clock: races through the morning, then snaps to 09:04 after the turn ──
    let mins;
    if (day10) {
      if (t < 10.6) mins = 542 + (t / 10.6) * 158;
      else mins = 544 + .06 * Math.sin(t * 1.2);
      if (t > 11.0 && t < 11.9) mins = lerp(mins, 544, eo(seg(t, 11.0, 11.5)));
    } else mins = 542 + (t / 20) * 240;
    const aH = -2 * Math.PI * ((mins / 60) % 12) / 12, aM = -2 * Math.PI * (mins % 60) / 60, aS = -2 * Math.PI * ((t * (day10 && t > 11 ? 8 : 1)) % 60) / 60;
    hands.h.rotation.z = aH; hands.m.rotation.z = aM; hands.s.rotation.z = aS;
  };
}

