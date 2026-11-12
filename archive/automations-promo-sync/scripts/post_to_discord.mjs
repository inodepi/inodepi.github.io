#!/usr/bin/env node
// post_to_discord.mjs — send one day's delivery copy to Discord via webhook.
// Usage:
//   node scripts/post_to_discord.mjs --auto            # day = days since manifest.startDate (UTC+8) + 1
//   node scripts/post_to_discord.mjs --day 5           # explicit day
//   node scripts/post_to_discord.mjs --list            # print the queue
//   node scripts/post_to_discord.mjs --day 5 --dry-run # print the payload, send nothing
// Env: DISCORD_WEBHOOK_URL (required unless --dry-run/--list)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const M = JSON.parse(fs.readFileSync(path.join(ROOT, 'content/manifest.json'), 'utf8'));
const args = process.argv.slice(2);
const has = k => args.includes(k);
const val = k => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const TZ_OFFSET_MS = 8 * 3600 * 1000; // Asia/Shanghai; manifest is UTC+08:00

const pad = n => String(n).padStart(2, '0');
function todayLocal() {
  return new Date(Date.now() + TZ_OFFSET_MS).toISOString().slice(0, 10);
}
function dayFromDate(iso) {
  const start = new Date(M.startDate + 'T00:00:00Z') / 86400000;
  const now = new Date(iso + 'T00:00:00Z') / 86400000;
  return Math.floor(now - start) + 1;
}
function scheduleDay() {
  const d = dayFromDate(todayLocal());
  return Math.min(Math.max(d, 1), M.days.length);
}
const sleep = ms => new Promise(r => setTimeout(r, ms));

const byDay = new Map(M.days.map(d => [d.day, d]));
const want = val('--day');
let day = want ? parseInt(want, 10) : scheduleDay();

if (has('--list')) {
  console.log(`start ${M.startDate} · ${M.postTimeLocal} ${M.timezone} · today(local) ${todayLocal()} → day ${scheduleDay()}`);
  for (const d of M.days) console.log(`  day ${pad(d.day)}  ${d.video}  ${d.title}`);
  process.exit(0);
}
if (!Number.isInteger(day) || !byDay.has(day)) {
  console.error(`day ${want ?? '(auto)'} is not in the manifest (1–${M.days.length})`);
  process.exit(2);
}
const entry = byDay.get(day);
const video = path.join(ROOT, entry.video);
const poster = entry.poster ? path.join(ROOT, entry.poster) : null;
const MAX_BYTES = 9_500_000; // Discord free upload ceiling is 10 MB; stay under it

const content = [
  `**Day ${day} · ${entry.title}**`,
  '',
  entry.caption,
  '',
  M.hashtags,
  '',
  '_Post the same video on LinkedIn / Reels / Shorts / TikTok._',
].join('\n');

function files() {
  const out = [];
  if (fs.existsSync(video)) {
    const s = fs.statSync(video).size;
    if (s <= MAX_BYTES) out.push({ p: video, type: 'video/mp4', name: path.basename(video) });
    else console.warn(`! ${entry.video} is ${(s / 1e6).toFixed(1)} MB (> ${MAX_BYTES / 1e6} MB) — sending poster only, grab the video from the repo`);
  } else console.warn(`! missing video ${entry.video} — sending text only`);
  if (poster && fs.existsSync(poster)) out.push({ p: poster, type: 'image/jpeg', name: path.basename(poster) });
  return out;
}

const attachments = files();
const payload = {
  username: 'inodepi · promo',
  allowed_mentions: { parse: [] },
  content: content + (attachments.some(f => f.type === 'video/mp4') ? '' : '\n\n_[video not attached — download it from the repo]_'),
  attachments: attachments.map((f, i) => ({ id: String(i), description: '' })),
};

if (has('--dry-run')) {
  console.log(JSON.stringify({ day, content: payload.content, attachments: attachments.map(a => a.name) }, null, 2));
  process.exit(0);
}

const url = process.env.DISCORD_WEBHOOK_URL;
if (!url) { console.error('DISCORD_WEBHOOK_URL is not set (use the repo secret in Actions, or export it locally)'); process.exit(2); }

async function send() {
  const form = new FormData();
  form.append('payload_json', JSON.stringify(payload));
  for (const [i, f] of attachments.entries()) {
    form.append(`files[${i}]`, new Blob([fs.readFileSync(f.p)], { type: f.type }), f.name);
  }
  return fetch(url + '?wait=true', { method: 'POST', body: form });
}

let attempt = 0, res;
while (attempt++ < 3) {
  res = await send();
  if (res.status !== 429) break;
  const body = await res.json().catch(() => ({}));
  const wait = Math.min(30, Number(body.retry_after || 3));
  console.warn(`rate limited — retrying in ${wait}s`);
  await sleep(wait * 1000);
}
const text = await res.text();
if (!res.ok) { console.error(`discord ${res.status}: ${text.slice(0, 500)}`); process.exit(1); }
console.log(`sent day ${pad(day)} "${entry.title}" → ${attachments.map(a => a.name).join(', ') || 'text only'}`);
