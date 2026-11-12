# Patch notes

All notable changes to AdBlock Island. The game is a single `index.html`, and the version shown on the title card (bottom right) matches the latest entry here.

Format: [Semantic Versioning](https://semver.org/). Dates are YYYY-MM-DD. Every release since the first build is listed below, newest first.

> **Online-beta branch.** This branch restarts the version count at **0.1.0** for the networked era and keeps its own patch notes. The game is still one page and one file. Entries from **0.9.8** down are the main branch's history and are kept here for context.

## Still pending

This is a **beta**. The list below is deliberately not in the build yet. Some of it is a weekend of work; some of it needs a server, accounts and moderation, which a single static `index.html` on GitHub Pages cannot provide on its own — which is why the online build lives on this branch and deploys to Vercel. This section stays at the top of the patch notes until each line is either shipped or honestly dropped.

### Achievements

Campaign medals, class clears, co-op, the boss, spending, cleanup and the new Endless milestones ship today, with a gallery and unlock toasts in the pause screen. Still pending:

- Dated unlock history, locked silhouettes, progress bars, and a "new" dot until you have looked at it.
- Achievements for ten kindness notes, a full run without being knocked out, and other non-wave milestones.
- Account-wide achievements. Today they live in `localStorage` and vanish when site data is cleared.

### Cool items

Waves currently hand out seven small things — Spare Broom, Wool Blanket, Spare Lens, Worn Sandals, Cool Cloth, Jar of Joy and Kettle Break — and most are quietly a free upgrade rank. Still pending:

- A real inventory: slots, stacking, descriptions, and a "found on wave N" line.
- Cosmetic drops that change how your hero looks — hats, brooms, trails, emotes — plus an equip screen. The class-picker cosmetics are the only cosmetic today.
- Rarity tiers, set bonuses, and a reason to keep an item once its upgrade is maxed.
- Items that change a run: one-use lures, placeable turrets, a kettle you can set down for the locals.
- Trading and gifting between players. That needs accounts and a server first.

### What online co-op still needs

The other players are still bots, and co-op is two people on one keyboard. To become the online RPG the branch is aiming for, the game still needs:

- **Online multiplayer.** Authoritative servers, rooms or shards, lag compensation and state sync. GitHub Pages is static hosting, so this needs a backend — or a peer-to-peer/WebRTC experiment with all of its NAT headaches. The concrete next step is the **4-player room-code plan** in [v0.7.0](#planned-4-player-online-rooms): Vercel static + signaling, free Redis, host-authoritative WebRTC, no accounts or anti-cheat yet.
- **Accounts and cross-device saves.** Sign-in, cloud saves and conflict handling. Today progress belongs to one browser's `localStorage`.
- **Moderated chat.** Server-side filtering, reporting, mute/block, rate limits, and a human process behind it. An unmoderated chat is not something to ship.
- **Parties, friends and guilds.** Invites, presence, shared objectives, and a reason to log in together.
- **Quests, raids and world events.** Content beyond the wave ladder, with rewards that respect everyone's time.
- **A player economy.** Trading, currency sinks, and anti-dupe rules. Joy is single-player and is not an economy yet.
- **Anti-cheat and fair play.** Server authority, validation and rate limits. Anything that lives only on the client is a suggestion.
- **Live ops.** Seasons, events, balance patches, and consent-based telemetry so balance changes are informed.
- **Accessibility and localisation.** Remapping, a screen-reader pass, reduced-motion parity, and translated copy.
- **A content pipeline.** The island is one hand-written file; more classes, enemies and stories need tooling that does not exist yet.

Until then, the honest description is: a single-player and local co-op cozy micro-RPG with bots, in beta.

---

## v0.10.0 — Blob room fallback (2026-11-09)

Rooms no longer wait for an Upstash account. When the Redis environment is absent, the same room desk runs on the Vercel Blob store that is already connected to this project.

### How it works

- **Ping reports the mode.** `POST /api/signaling {action:"ping"}` returns `mode: "redis" | "blob" | "none"` and booleans for each credential family. Redis is always preferred when present.
- **Per-writer files, no shared documents.** Presence lives in each peer's own `p/{id}.json`; every signal or chat line is its own immutable message blob under the recipient's inbox; the host owns `host.json`, `mutes.json` and `backup.json`. Paths are HMAC'd with a server salt, so the public store cannot be enumerated by room code alone.
- **Same contract.** Create, join, poll, signal, leave, promote, backup, takeover, chat and mute behave identically: tokens, four-peer rooms, server-side chat filtering, 1.5s chat rate limit, host mutes and handover state. Delivery is best-effort polling rather than atomic Redis lists, and chat lands in about a second.
- **No long-poll in Blob mode.** The desk returns immediately; clients default to ~1.2s polling.

### Verified live

Against `https://adblock-island.vercel.app` in Blob mode:

- **Co-op**: create/join over the public URL, guest spawned on the island, movement mirrored (`1652 → 1681`), chat filtered server-side (`hi … [link]`).
- **Wall + banner + relay**: a guest pinned a note to the host's wall, the guest saw the next wave banner, the relay panel opened.
- **Handover**: three browsers, host left, successor adopted the island, third guest stayed connected under the promoted host.

All four committed suites pass locally; the co-op, wall and handover suites also pass against production.

## v0.9.1 — Room setup diagnostics (2026-11-09)

A small release to make the one deployment step obvious.

- **`ping` reports which storage names are missing.** `POST /api/signaling {action:"ping"}` now returns `env: { url, token }` booleans beside `storage`, so a failed room setup can be diagnosed from the live URL.
- **The lobby has a try-again button.** After a create/join error, retry the same action without retyping the code, so connecting the store does not require a reload.
- **Clearer error copy.** It names the exact Vercel path (Storage → Create → Upstash Redis) and states that no redeploy is needed.

## v0.9.0 — Shared wall & guest banners (2026-11-09)

The last section of the roadmap that did not need an account or a rewrite.

### The bench wall is shared

- **Guests read and write the host's wall.** Sitting at the bench as a guest asks the host for its notes (`wall`), shows them read-only, and lets the guest pin one. The host validates and stores it (`note`), broadcasts the updated wall, and keeps it across sessions like any local note.
- **Hearts stay local.** The host's own wall keeps its heart behaviour; guest notes arrive without hearts so there is no hidden vote surface.
- **Moderated by the host.** A duplicate note or a note under three characters is refused; the host's own note rules apply.

### Guests see the schedule

- **Wave banners are broadcast.** Each `startWave` sends the same kicker, tier, note and incoming count to every guest, so the room reads the same screen.

### Relay and spectators

- **TURN relay settings.** A new panel in Settings stores `urls`, `username` and `credential` in this browser and adds the relay to new peer connections. STUN is still the default; nothing ships with credentials.
- **Spectator chip.** Watchers get a "spectating · 1–4 follows" chip, and the hero-switch keys still swap the camera.

### Tests

- **`tests/wall.mjs`** joins a room, pins a note to the host's wall, checks the host stored it, verifies the guest sees the next wave banner, and opens the relay panel. `bash tests/run.sh` runs it alongside the smoke, co-op and handover suites.

## v0.8.0 — Co-op polish & long-poll (2026-11-09)

A pass over the three bugs the phase-6 build exposed, plus the quality-of-life gaps around them.

### The room desk got faster and cheaper

- **Long-polling.** `poll` now holds the request for up to 8 seconds, checking the inbox as it waits. Chat and signaling land in about a second, and each client uses a handful of requests per minute instead of a request every 1.2 seconds. Clients send `wait: 8000` and re-poll immediately after a long poll returns.
- **Snapshot cadence adapts.** Desktop stays at 10 snapshots/second; touch devices drop to roughly 6/second.
- **Guests see their own cooldowns.** The host sends remaining skill and dash cooldowns in each snapshot; the guest action bar and touch buttons show the same rings as solo play.
- **Guest pause and wave cards.** The pause panel gains a real **leave the island** action, and each guest's personal shop opens with the wave number, tier and reward that just landed.

### Online achievements

- **Room Crew** — clear a wave with an online hero.
- **Handover Hero** — take over as the new host.
- **Front Row** — join a room as a spectator.

### Fixes

- **Chat and mute calls now carry the room code.** Without it the server rejected them; long-polling exposed the missing field.
- **Poll scheduling no longer dies on a stale scope error**, and a poll that resolves after leaving a room cannot schedule another.
- **The lobby stops rebuilding under a click** when membership has not changed.

### Tests and assets

- **A committed Playwright harness.** `tests/` includes a fake Redis, a solo smoke test (including "zero API calls offline"), a two-browser co-op test (movement, server-side chat filtering), and a three-browser handover test. `bash tests/run.sh` runs all three.
- **Fresh screenshots** captured from the real build: title, room lobby, a guest island, and the phone title.

## v0.7.0 — Vercel room service (phase 6) (2026-11-09)

Phase 6 hardens the room itself. Everything runs inside the existing Vercel function — no new infrastructure, no second deploy target.

### The room desk is now the authority for the room

- **Peer tokens.** `create` and `join` return a server-issued token. Polling, signaling, chat, handover and mute calls are rejected without it, so one tab cannot spoof another peer's id.
- **Server-side moderation.** Free text goes to `POST /api/signaling` with `action: "chat"`. The server strips links to `[link]`, masks a blocked-word list, limits each voice to one line every **2 seconds**, and refuses chat for muted peers.
- **Server-enforced mutes.** The host's mute button calls the server (`mute`), which records the flag on the peer and rejects that peer's chat. The client no longer has to trust the host tab for this.
- **Rate limits and size caps.** Each peer is limited to **45 requests/second**, signals are capped at **64 KB**, bodies at **320 KB**, rooms at four peers, and codes are validated. Chat and system messages share the same inbox channel.
- **System lines.** Joining, leaving, promoting and taking over now post a system line to the room log.

### Handover, on the same service

- The backup, `promote` and `takeover` actions now require tokens; only the current host can write a backup, and any token-holding peer can take over when one exists.
- Guest recovery was corrected: a dropped guest now waits for a re-offer, rejoins as a guest while the host is alive, and only takes over when the host's presence has gone stale. The host keeps a dropped hero warm for 12 seconds so a reconnection resumes the same hero instead of spawning a new one.

### Fixed

- **The lobby no longer rebuilds on every poll.** It renders only when membership, connection state or join mode changes, so buttons no longer detach under a click.

### Still honest

- Vercel functions are HTTP request/response, so this is a room service, not a persistent game server. Gameplay is still host-simulated; a dedicated simulation server, full anti-cheat and a human moderation process remain later work.

## v0.6.0 — Host handover & spectators (phase 5) (2026-11-09)

The room survives the host, watchers get a camera, and chat gets a voice with rules.

### Host handover

- **A backup in Redis.** The host uploads a compact game state every 10 seconds (and once more when leaving): every hero, monster, projectile, hazard, beam, turret, pickup, wave flag and the corruption grid. Backups expire in 120 seconds.
- **A named successor.** When the host leaves, the next connected hero is told to take over and everyone else is told to wait. The successor calls `takeover`, adopts the state — itself becomes the player hero, the old host's hero becomes an AI bot — promotes itself through `promote`, and re-offers WebRTC connections to every remaining guest.
- **Crash fallback.** If the host vanishes without a handover message, the first remaining hero tries `takeover` from the last backup; if there is none, the room finally closes.
- **Guests stay.** They no longer abort on a host channel close while a handover is in progress; they wait for the new host's offer and resume from the adopted state.

### Spectators

- **Join as a watcher.** The lobby has a `join as: hero / spectator` switch. Watchers spawn no hero on the host and send no input.
- **Their own camera.** A spectator follows the room, and `1`–`4` picks a hero to follow. Their own avatar is not drawn.

### Host-filtered chat

- **One line of free text.** The chat panel keeps the six presets and adds a 140-character line. The host strips links to `[link]`, masks a small blocked-word list, rate-limits each speaker to one line per 1.5 seconds, and can mute any guest.
- **Spectators talk through the room log**, since they have no hero to put a bubble over.
- **Honest scope.** This is host-side filtering, not a moderation team or a server-side policy engine.

### Still not shipped

- Dedicated servers, true server-side moderation, anti-cheat and ranked play. Handover is best-effort: it needs the successor to stay connected and a backup to exist.

## v0.5.0 — Guest tree & quick chat (phase 4) (2026-11-09)

Co-op gets its own economy, its own drinks and a way to talk without a chat log.

### The guest tree

- **Your Joy, your upgrades.** Kills credit the hero who landed them, and guests now spend that Joy in the same six-upgrade tree as the host: **Clarity Lens** (+10% damage), **Deep Breaths** (+15 max HP), **Barefoot Speed** (+5% move), **Wide Broom** (+18% cleanse), **Cool Head** (-7% cooldowns) and **Joy Magnet** (+20% Joy).
- **The host validates every purchase.** A guest sends a buy request; the host checks rank, cost and wallet, deducts the Joy, applies the stat to that hero and acknowledges the new rank. Ranks and wallet ride back in snapshots.
- **Its own panel.** <kbd>U</kbd> opens the guest tree at any time, and the host opens it automatically after a cleared wave. The host's tree stays the host's.
- **Kettle break.** <kbd>R</kbd> heals a guest for 30% of max HP once per wave; the allowance resets on the next clear.

### Preset chat

- **Six lines, bubbles only.** <kbd>C</kbd> opens *nice bonk!*, *behind me*, *pop-ups!*, *kettle break?*, *thank you* and *brb*. The hero says it in a bubble that every client sees through the snapshot.
- **No free text.** Presets are validated on the host, so there is no unmoderated channel to run.
- Hosts and guests both get the panel in an online session; the solo chat log is untouched.

### Still not shipped

- Host migration (the host leaving still closes the room), moderated free-text chat and spectators remain phase-5 work.
- The guest tree is applied host-side; there is no client-side prediction of a purchase before the host confirms.

## v0.4.0 — Guest skills & rejoin (phase 3) (2026-11-09)

Online co-op gains the abilities, choices and recovery a shared run needs.

### Guest abilities

- **Q and E work for guests.** The keys send a skill request; the host executes that class's skill on the guest's hero using the same monsters, beams, rings and particles as the solo kit. All damage is still credited to that hero and stays host-authoritative.
- **Dash works for guests.** Space requests a short dash along their aim; the host moves the hero with terrain checks and knocks ads aside.
- **Guest shields count.** Host-side contact damage now spends a guest hero's shield before HP, and shield timers tick per hero.

### Guest upgrades

- **A personal choice after each clear.** When the host clears a wave, every guest gets a small shop card: **sharper** (+12% damage), **steadier** (+15% max HP and a full heal) or **quicker** (+6% speed). The pick applies to that hero on the host and is acknowledged back.
- **Host upgrades stay the host's.** The main Joy shop still belongs to the host's hero; guests get their own lane without sharing the host's currency.

### Recovery and reachability

- **Automatic rejoin.** If a guest's data channel drops, the guest retires its dead peer, rejoins the same room up to three times and waits for the host to spawn it back in. The host drops the vanished hero and accepts the new one.
- **Stale-peer cleanup.** A guest that leaves on purpose removes its peer record immediately instead of waiting out the 30-second sweep.
- **TURN hook.** `window.ADBLOCK_TURN = { urls, username, credential }` adds a TURN relay to the WebRTC config for symmetric NATs. No credentials ship by default, so a plain deployment is still STUN-only.
- **Late joiners and host-leave** keep working as in phase 2.

### Limits

- Guest skills are a faithful-but-approximate port of each class kit, not the exact solo code path. Potions, the full upgrade tree for guests, host migration and moderated chat remain later work.

## v0.3.0 — Online co-op (phase 2) (2026-11-09)

The room is now a run. One host runs the island; up to three guests join it from their own keyboards.

### One island

- **Host starts the run.** The lobby's **start co-op** button (host only) begins a normal run and spawns every connected guest as a real hero on the host's simulation.
- **Guest input.** Guests send a frame 20×/s: movement vector, world-space aim angle and whether attack is held. The host moves each guest through the same partner update path, class-flavoured auto-attack included.
- **Snapshots.** The host broadcasts 10×/s: every hero (host, companions, guests), monsters, projectiles, beams, hazards, game turrets, wave state, island clarity, boss flags, and the corruption grid once a second.
- **Own camera.** Guests render the host's world and their own avatar from snapshots, with a follow camera and local interpolation, so each player watches their own hero instead of the host's screen.
- **Host authority.** Guests never simulate damage, spawning or cleansing locally; their local attacks, skills and dash are suppressed so the host stays the only truth. Guest HP, level, Joy and shield come back in snapshots.
- **Kill credit.** The hero who lands the last hit earns the monster's Joy and XP; guest XP rolls over into levels (and a little max HP) on the host, and both ride back in the snapshot.
- **Pop-ups reach everyone.** Pop-Up Imps can target a remote hero. The host opens the pop-up on that guest's screen over the data channel; **✕** pays 3 Joy to that hero and damages the imp, **CLICK HERE** takes the usual random 25–75% health cut from that hero.
- **Late joiners.** A guest who connects after the run starts gets a hero and a `hello` snapshot. If a guest leaves, their hero is removed. If the host leaves, guests get a notice and return to the lobby.
- **Phase 2 limits, stated plainly.** Guest class skills, dash, potions and upgrade choices are not wired yet; upgrades are the host's call this build. No TURN, no reconnect, no host migration.

## v0.2.0 — Room codes (phase 1) (2026-11-09)

The first online build. The island itself is untouched; this release connects players before it puts them on the same beach.

### The lobby

- **`play online` button.** It sits directly under **wash ashore** and uses the same `.big-btn` style, so the title screen has one obvious pair of doors.
- **Create or join.** Open a room to get a six-character code (no `0`, `O`, `1`, `I`), or type a friend's code. Up to **four heroes** per room.
- **Invite links.** `?room=CODE` opens the lobby with the code filled in.
- **Live roster.** The lobby lists every hero, their class, who is host, who is you, and a green dot plus round-trip ping once the data channel is open.
- **Leave on close.** Closing the panel, pressing `Esc`, or clicking the backdrop leaves the room and closes the peer connections. The host leaving closes the room for everyone.

### The handshake

- **`api/signaling.js`** is a single Vercel function: `create`, `join`, `poll`, `signal` and `leave`. It stores room metadata and the SDP/ICE handshake in **Upstash Redis** (REST), with a two-hour room TTL and a 30-second stale-peer sweep.
- **WebRTC data channels** connect every guest straight to the host. STUN only (no TURN yet), ordered channels, and a ping/pong every 2.5 seconds for the latency readout.
- **No gameplay state crosses the wire yet.** Everyone stays in the lobby; spawning heroes into one island is phase 2.

### Honest limits

- Needs the free Upstash Redis store connected to the project. Without it the lobby says room codes are not switched on and the rest of the game plays as before.
- No accounts, no chat, no host migration, no reconnect, no anti-cheat. If the host leaves, the room closes.
- The offline build still makes **zero network calls**; the lobby is the only thing that talks to the server.

### Housekeeping

- `npm`-free deployment: the function has no dependencies, and the site still needs no build step.
- Version **0.2.0**; release zip rebuilt.

## v0.1.0 — Online beta, back to normal (2026-11-09)

First release on the **online-beta** branch, and a reset of the version count for the networked era. The page and the file do not change shape: one `index.html`, one page, different notes.

### Modes back to normal

- **Halloween theme removed.** The Settings toggle, the `HALLOWEEN` title badge, the autumn-dusk palette, the pumpkin moon, fog, bats, jack-o'-lanterns, pumpkin ground decor and the cached Halloween overlay are all gone. The island draws its normal day palette, sky, clouds and vignette again; text goes back to the standard paper/ink colours.
- **Four-boss Mania removed.** The `MANIA` title badge, its rules note and the Settings → Four-boss Mania toggle are gone.
- **Split ladder stops at two.** At **75% HP** a boss still splits once into two smaller halves, and the halves cannot split again. The live cap is **two**.
- **One boss, 33% per wave.** Once the island is **64%** clear, each wave has a **33%** chance to wake the Algorithm (down from 50%). A failed roll tries again on the next wave.
- **Speed rule trimmed.** Two live bosses move and attack **25% faster**; the unreachable +50% three/four-boss tier is gone.

### Death is normal again

- **Dying no longer wipes the run.** You wake at the bench with full health, the same as the pre-Mania build.
- **Endless keeps your progress.** Dying during an Endless fight restarts the current wave and keeps your Joy and upgrades. The old "Mania reset to wave 1" path and its toast are removed.

### Balance for solo and co-op

- **Waves scale with the party.** Each extra human adds up to **+6 ads** (30% of the crew, hard-capped at 22 in a wave) and **+55% monster health**. Solo numbers are unchanged.
- **The Algorithm scales too.** Boss health gets the same **+55%** per extra hero.
- **Wave 1 was fixed to include the partner.** The co-op partner used to spawn after wave 1 was planned, so wave 1 always used the solo recipe; the partner now arrives before the first wave.

### Words and versions

- **micro-MMO → micro-RPG** across the page title, description, social metadata, title card and help panel; the pending list now talks about online co-op rather than "MMORPG essentials".
- **Version reset to 0.1.0** on the title card, the build tag, the README and the release zip. This branch's notes start here.
- **Vercel-ready.** The page needs no build step and no environment variables yet; `/api/signaling` and the Upstash store arrive with room-code co-op.
