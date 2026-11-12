// Render a film with a long screenshot timeout (software WebGL readback can exceed playwright's 30 s default).
// node tools/render_video.mjs <demoDir> <out.mp4> <q> [workers]
import fs from 'fs'; import path from 'path'; import { spawn, execFileSync } from 'child_process';
import { openDemo, closeServer } from '/home/kristiandyan/lemo-opuscar/core/render/page.mjs';
const [dir, out, q, wkArg] = process.argv.slice(2);
const W = 1080, H = 1920, FPS = 30, WK = +(wkArg || 2);
fs.mkdirSync(path.dirname(out), { recursive: true });
const probe = await openDemo(dir, { w: W, h: H, q });
const DUR = await probe.page.evaluate(() => window.DUR); await probe.browser.close();
const TOTAL = Math.round(DUR * FPS), per = Math.ceil(TOTAL / WK);
const segDir = fs.mkdtempSync(path.join(path.dirname(out), '.rv-')); console.log('frames', TOTAL, 'seg', segDir);
const procs = [];
try {
  await Promise.all([...Array(WK)].map(async (_, w) => {
    const a = w * per, b = Math.min(TOTAL, a + per); if (a >= b) return;
    const { browser, page } = await openDemo(dir, { w: W, h: H, q });
    await page.evaluate(() => window.render(0));
    await page.screenshot({ type: 'jpeg', quality: 90, timeout: 240000 });   // warm-up: pay the first readback once
    const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
      '-c:v', 'libx264', '-preset', 'medium', '-crf', '14', '-pix_fmt', 'yuv420p', `seg_${w}.mp4`], { cwd: segDir, stdio: ['pipe', 'inherit', 'inherit'] });
    procs.push(ff);
    const t0 = Date.now();
    for (let f = a; f < b; f++) {
      await page.evaluate(t => window.render(t), f / FPS);
      const buf = await page.screenshot({ type: 'jpeg', quality: 95, timeout: 240000 });
      if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
      if (f % 30 === 0) console.log(`w${w} ${f - a}/${b - a} ${((Date.now() - t0) / 1000).toFixed(0)}s`);
    }
    await new Promise(r => { ff.stdin.end(); ff.on('close', r); });
    await browser.close();
  }));
  const list = path.join(segDir, 'segs.txt');
  fs.writeFileSync(list, [...Array(WK)].map((_, w) => `file 'seg_${w}.mp4'`).filter((_, w) => w * per < TOTAL).join('\n'));
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', 'segs.txt', '-c', 'copy', 'merged.mp4'], { cwd: segDir, stdio: 'inherit' });
  fs.renameSync(path.join(segDir, 'merged.mp4'), out);
  console.log('done', out);
} finally { for (const p of procs) p.kill('SIGKILL'); try { fs.rmSync(segDir, { recursive: true, force: true }); } catch {} }
closeServer();
