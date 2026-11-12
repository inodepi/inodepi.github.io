// tools/export_cues.mjs — write cues.json from window.SUBS: node tools/export_cues.mjs <demo> <out.json> --q 'day=1' --size 1080x1920
import fs from 'fs';
import path from 'path';
import { openDemo, closeServer, requireDemo, takeSize } from '/home/kristiandyan/lemo-opuscar/core/render/page.mjs';
const args = process.argv.slice(2), { w, h } = takeSize(args);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const dir = args[0], out = args[1]; requireDemo(dir);
const { browser, page } = await openDemo(dir, { w, h, q: opt('--q', ''), gl: false });
const sub = await page.evaluate(() => window.SUBS || []);
fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
fs.writeFileSync(out, JSON.stringify(sub, null, 1));
console.log('cues', sub.length, '→', out);
await browser.close(); closeServer();
