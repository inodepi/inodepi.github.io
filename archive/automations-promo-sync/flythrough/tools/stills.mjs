// One page, many stills; the first screenshot pays the readback warm-up once.
import fs from 'fs'; import path from 'path';
import { openDemo, closeServer } from '/home/kristiandyan/lemo-opuscar/core/render/page.mjs';
const args = process.argv.slice(2);
const dir = args[0], day = args[1], q = args[2] || '', times = args.slice(3).map(Number);
const n = process.env.N || '10';
const out = path.join(dir, 'stills'); fs.mkdirSync(out, { recursive: true });
const { browser, page } = await openDemo(dir, { w: 1080, h: 1920, q: `day=${day}&n=${n}${q}` });
await page.evaluate(() => window.render(0)); await page.screenshot({ type: 'jpeg', quality: 90, timeout: 180000 });
for (const t of times) {
  const t0 = Date.now();
  await page.evaluate(t => window.render(t), t);
  const f = path.join(out, `day${day}_${t.toFixed(2)}.jpg`);
  await page.screenshot({ path: f, type: 'jpeg', quality: 92, timeout: 180000 });
  console.log(f, Date.now() - t0 + 'ms');
}
await browser.close(); closeServer();
