// Fast stills through grabComp (same capture path as the film): node tools/grab_stills.mjs <day> <t...>
import fs from 'fs'; import path from 'path'; import { execFileSync } from 'child_process';
import { openDemo, closeServer } from '/home/kristiandyan/lemo-opuscar/core/render/page.mjs';
const dir = '/home/kristiandyan/git-projects/automations-promo/flythrough';
const [day, ...tt] = process.argv.slice(2);
const { browser, page } = await openDemo(dir, { w: 1080, h: 1920, q: `day=${day}&dof=0` });
for (const t of tt.map(Number)) {
  const b64 = await page.evaluate(t => window.grabComp(t), t);
  const raw = `/tmp/opencode/g_${day}_${t}.rgba`, jpg = path.join(dir, 'stills', `gday${day}_${t.toFixed(2)}.jpg`);
  fs.writeFileSync(raw, Buffer.from(b64, 'base64'));
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', '1080x1920', '-i', raw,
    '-vf', 'eq=contrast=1.07:saturation=1.13:brightness=-0.012,colorbalance=rs=.025:gs=.005:bs=-.03', '-q:v', '2', jpg]);
  fs.rmSync(raw); console.log(jpg);
}
await browser.close(); closeServer();
