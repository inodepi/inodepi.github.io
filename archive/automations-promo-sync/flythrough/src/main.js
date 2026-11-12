// Page contract: DUR, EV, SUBS, TEXTS, render(t), READY. Vertical 1080×1920 at 30 fps.
import * as THREE from 'three';
import { makeWorld, W, H } from './world.js';
import { makePost } from './post.js';
import { makeRig } from './camera.js';
import { makeSubs } from './captions.js';
import { KEYS, SHAKES } from './shots.js';
import * as F from './film.js';

const FPS = 30, SHUTTER = .3;
const Q = new URLSearchParams(location.search);
window.DUR = F.DUR; window.SUBS = F.SUBS;
await Promise.all([document.fonts.load('500 20px Inter', F.GLYPHS), document.fonts.load('600 20px Inter', F.GLYPHS),
  document.fonts.load('700 20px Inter', F.GLYPHS), document.fonts.load('600 20px InterTight', F.GLYPHS),
  document.fonts.load('500 20px JBMono', F.GLYPHS), document.fonts.load('600 20px JBMono', F.GLYPHS)]);

const world = makeWorld({ mat: F.MAT, haze: '#e6e4e1' }), { renderer, scene, camera, sun, SUNDIR } = world;
const ev = [];
const ctx = { world, subj: {}, ev, camera };
const update = F.build(ctx);
const rig = makeRig(ctx, camera, KEYS, SHAKES);
const caps = makeSubs(F.SUBS, F.END);
const post = makePost(renderer, scene, camera, W, H);
post.grade.uniforms.amt.value = .12; post.grade.uniforms.warm.value = .055; post.grade.uniforms.lift.value.set(0, 0, 0);
post.grade.uniforms.contrast.value = .10; post.grade.uniforms.sat.value = 1.08;
post.bloom.strength = .12; post.bloom.threshold = 1.1;
if (Q.get('dof') === '0') post.dof.maxCoc = 0;
if (Q.get('bloom') === '0') post.composer.removePass(post.bloom);

function applyAt(t, jx, jy) {
  update(t);
  const { tg, d } = rig.apply(t, jx, jy);
  sun.target.position.copy(tg); sun.position.copy(tg).addScaledVector(SUNDIR, 4);
  const hs = Math.min(4, Math.max(.35, d * 1.1));
  Object.assign(sun.shadow.camera, { left: -hs, right: hs, top: hs, bottom: -hs, near: .1, far: 10 }); sun.shadow.camera.updateProjectionMatrix();
  const fp = tg.clone().applyMatrix4(camera.matrixWorldInverse); post.dof.focus = Math.max(.05, -fp.z) * 1.25; post.dof.aper = 2.0; post.dof.maxCoc = 5;
  renderer.toneMappingExposure = 1 + 1.6 * ctx.fx.flash;
}
const halton = (i, b) => { let f = 1, r = 0; while (i > 0) { f /= b; r += f * (i % b); i = Math.floor(i / b); } return r; };
let TC = 0;
post.accum.N = +(Q.get('n') || 16);
let SH = SHUTTER;
const q0 = new THREE.Quaternion();
function shutterAt(t) {
  const h = .02; applyAt(t - h, 0, 0); q0.copy(camera.quaternion); const p0 = camera.position.clone(); const d0 = rig.target(t - h).distanceTo(p0);
  applyAt(t + h, 0, 0); const ang = q0.angleTo(camera.quaternion) + camera.position.distanceTo(p0) / Math.max(.05, d0);
  const pxPerSec = ang / (2 * h) * 1080 / (camera.fov * Math.PI / 180);
  return Math.max(.02, Math.min(SHUTTER, 8 * FPS / Math.max(1, pxPerSec)));
}
post.accum.setSub = (i, n) => applyAt(TC + ((i + .5) / n - .5) * SH / FPS, halton(i + 1, 2) - .5, halton(i + 1, 3) - .5);

window.render = t => { TC = t; SH = shutterAt(t); caps.render(t); post.composer.render(); };
const proj = new THREE.Vector3();
window.TEXTS = t => {
  caps.render(t); const out = caps.texts(t);
  applyAt(t, 0, 0); camera.updateMatrixWorld();
  for (const [id, text, t0, t1, corners] of ctx.read) {
    if (t < t0 || t >= t1) continue;
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9, behind = false;
    for (const p of corners()) { proj.copy(p).project(camera); if (proj.z > 1) behind = true; const x = (proj.x + 1) / 2 * W, y = (1 - proj.y) / 2 * H; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    if (!behind) out.push({ id, text, x0, y0, x1, y1 });
  }
  return out;
};
// Offscreen capture: the composer renders into a target, a copy pass gives RGBA8 pixels, readPixels avoids the slow compositor path.
const capRT = new THREE.WebGLRenderTarget(W, H, { type: THREE.UnsignedByteType, format: THREE.RGBAFormat, colorSpace: THREE.SRGBColorSpace });
const capScene = new THREE.Scene(), capCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
const capQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
  uniforms: { tex: { value: null } }, vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }',
  fragmentShader: 'varying vec2 vUv; uniform sampler2D tex; void main(){ gl_FragColor = vec4(texture2D(tex, vUv).rgb, 1.); }' }));
capScene.add(capQuad);
window.grabDirect = t => {
  update(t);
  const { tg, d } = rig.apply(t, 0, 0);
  sun.target.position.copy(tg); sun.position.copy(tg).addScaledVector(SUNDIR, 4);
  const hs = Math.min(4, Math.max(.35, d * 1.1));
  Object.assign(sun.shadow.camera, { left: -hs, right: hs, top: hs, bottom: -hs, near: .1, far: 10 }); sun.shadow.camera.updateProjectionMatrix();
  renderer.setRenderTarget(capRT); renderer.render(scene, camera);
  const buf = new Uint8Array(W * H * 4); renderer.readRenderTargetPixels(capRT, 0, 0, W, H, buf);
  let s = '', c = 0x8000;
  for (let i = 0; i < buf.length; i += c) s += String.fromCharCode.apply(null, buf.subarray(i, i + c));
  return btoa(s);
};
window.grabFrame = t => {
  TC = t; SH = shutterAt(t); caps.render(t);
  post.composer.renderToScreen = false; post.composer.render();
  capQuad.material.uniforms.tex.value = post.composer.readBuffer.texture;
  renderer.setRenderTarget(capRT); renderer.render(capScene, capCam);
  const buf = new Uint8Array(W * H * 4); renderer.readRenderTargetPixels(capRT, 0, 0, W, H, buf);
  let s = '', c = 0x8000;
  for (let i = 0; i < buf.length; i += c) s += String.fromCharCode.apply(null, buf.subarray(i, i + c));
  return btoa(s);
};
// Frame capture with the burned caption drawn in 2D (no DOM overlay, no slow canvas readback of the GPU buffer).
const gf = document.createElement('canvas'); gf.width = W; gf.height = H; const g2 = gf.getContext('2d', { willReadFrequently: true });
function capState(t) {
  let c = null; for (const q of F.SUBS) if (t >= q.t0 && t < q.t1) c = q;
  if (!c) return null;
  const a = Math.min(Math.min(1, (t - c.t0) / .14), Math.max(0, Math.min(1, (c.t1 - t) / .12)));
  return { c, a };
}
function drawCaption(ctx, t) {
  const st = capState(t); if (!st) return;
  const { c, a } = st;
  ctx.save(); ctx.globalAlpha = a;
  ctx.font = '500 38px Inter, sans-serif';
  const tw = ctx.measureText(c.text).width, padL = 36, padR = 36, dot = 11, gap = 16;
  const bw = tw + padL + padR + dot + gap, bh = 82;
  const bx = (W - bw) / 2, by = H - 150 - bh + (1 - a) * 8;
  ctx.fillStyle = c.cta ? 'rgba(240,180,41,.94)' : 'rgba(32,37,43,.72)';
  ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 22); ctx.fill();
  ctx.fillStyle = c.cta ? '#20252b' : '#f0b429';
  ctx.beginPath(); ctx.arc(bx + padL + dot / 2, by + bh / 2, dot / 2, 0, 7); ctx.fill();
  ctx.fillStyle = c.cta ? '#20252b' : '#ffffff';
  ctx.textBaseline = 'middle'; ctx.fillText(c.text, bx + padL + dot + gap, by + bh / 2 + 1);
  ctx.restore();
}
window.grabComp = t => {
  update(t);
  const { tg, d } = rig.apply(t, 0, 0);
  sun.target.position.copy(tg); sun.position.copy(tg).addScaledVector(SUNDIR, 4);
  const hs = Math.min(4, Math.max(.35, d * 1.1));
  Object.assign(sun.shadow.camera, { left: -hs, right: hs, top: hs, bottom: -hs, near: .1, far: 10 }); sun.shadow.camera.updateProjectionMatrix();
  renderer.setRenderTarget(null); renderer.render(scene, camera);
  g2.clearRect(0, 0, W, H); g2.drawImage(renderer.domElement, 0, 0, W, H); drawCaption(g2, t);
  const buf = g2.getImageData(0, 0, W, H).data;
  let s = '', c = 0x8000;
  for (let i = 0; i < buf.length; i += c) s += String.fromCharCode.apply(null, buf.subarray(i, i + c));
  return btoa(s);
};
window.EV = ev;
applyAt(0, 0, 0); renderer.compile(scene, camera);
window.__w = { renderer, scene, camera, post, world };
window.READY = true;
window.DBG = (t, names = []) => { applyAt(t, 0, 0); const r = { cam: camera.position.toArray().map(v => +v.toFixed(3)), tg: rig.target(t).toArray().map(v => +v.toFixed(3)) }; for (const n of names) r[n] = ctx.subj[n](t).toArray().map(v => +v.toFixed(3)); return r; };
