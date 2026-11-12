# Discord daily delivery

Every day at **07:30 Asia/Shanghai (UTC+8)** a GitHub Action posts that day's video + caption to a Discord channel. The webhook URL is a repo secret — it is never in the code, the manifest, the logs, or the workflow file.

## 1. One-time setup (2 minutes)

1. In Discord, create a private channel for the queue, e.g. `#promo-posting`.
2. Channel settings → **Integrations → Webhooks → New Webhook** → copy the URL.
3. Add it as a secret (paste the URL when prompted):

   ```sh
   gh secret set DISCORD_WEBHOOK_URL --repo inodepi/automations-promo-sync
   ```

4. Test with day 1:

   ```sh
   gh workflow run discord-daily.yml --repo inodepi/automations-promo-sync -f day=1
   gh run watch --repo inodepi/automations-promo-sync
   ```

Nothing else to do. The cron sends the next day automatically.

## 2. How the day is chosen

- `content/manifest.json` holds `startDate` (`2026-11-09` — day 1 was sent manually on the 9th) and 14 entries.
- Each run computes `day = days since startDate + 1` in UTC+8, clamps to 1–14.
- The schedule is the cron line in `.github/workflows/discord-daily.yml` (`30 23 * * *` UTC = 07:30 UTC+8). Change that line to change the time; change `startDate` to move the campaign.
- GitHub may start scheduled runs a few minutes late; that is normal.

## 3. Manual sends

| Goal | Command |
|---|---|
| Re-send a specific day | `gh workflow run discord-daily.yml --repo inodepi/automations-promo-sync -f day=5` |
| Preview without sending | `gh workflow run discord-daily.yml --repo inodepi/automations-promo-sync -f day=5 -f dry_run=true` then read the run log |
| Send from your machine | `DISCORD_WEBHOOK_URL='https://discord.com/api/webhooks/…' node scripts/post_to_discord.mjs --day 5` |
| See the queue / today's day | `node scripts/post_to_discord.mjs --list` |

`--auto` is the scheduled mode; `--day N` overrides it. Sends are serialised (one concurrency group), so overlapping triggers queue up instead of double-posting.

## 4. What gets posted

One message per day:

```
Day 5 · Not the list
<caption from content/manifest.json>
<hashtags>
[video attachment] [poster attachment]
```

- Videos in `out/discord/` are CRF-28 delivery copies (0.5–6.7 MB) so they attach under Discord's 10 MB webhook ceiling. The full-quality masters stay local in `out/` and are not committed.
- The poster attaches as the image preview.
- If a video ever exceeds the ceiling, the message still goes out with the caption and poster plus a note to pull the master from the repo — the day is never silently lost.
- Discord message content is capped at 2,000 characters; all captions are well under it.

## 5. Limits and notes

- Private repos get 2,000 free Actions minutes/month; this job uses about 1 minute per day.
- **Scheduled workflows are disabled after ~60 days of repo inactivity.** The campaign is 14 days, so it does not apply, but if the repo goes quiet, GitHub emails a warning; one manual run re-enables it.
- The webhook secret stays out of history; rotate it by creating a new webhook and re-running `gh secret set`.
- Do not make the repo public: it contains unreleased promo content.
