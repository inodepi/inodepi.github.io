# Patch notes

All notable changes to AdBlock Island. The game is a single `index.html`, and the version shown on the title card (bottom right) matches the latest entry here.

Format: [Semantic Versioning](https://semver.org/). Dates are YYYY-MM-DD. Every release since the first build is listed below, newest first.

## Still pending

This is a **beta**. The list below is deliberately not in the build yet. Some of it is a weekend of work; some of it needs a server, accounts and moderation, which a single static `index.html` on GitHub Pages cannot provide on its own. This section stays at the top of the patch notes until each line is either shipped or honestly dropped.

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

### What an MMORPG still needs

The "MMO" in micro-MMO is currently a polite lie: the other players are bots, and co-op is two people on one keyboard. To be an actual MMORPG, the game still needs:

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

Until then, the honest description is: a single-player and local co-op cozy micro-MMO with bots, in beta.

---

## v0.9.8 — Fullscreen option (2026-11-04)

A small title-screen and settings addition. No gameplay changes.

- Added a **fullscreen** button to the title screen, alongside help and co-op.
- The Settings fullscreen button now toggles in and out and updates its label.
- Fullscreen is best-effort: if the browser blocks it, the game explains instead of failing silently.
- AdBlock Island does **not** lock orientation; portrait and landscape both stay available as before.

## v0.9.7 — Upgrade exit & ad trap (2026-11-04)

Two flow changes.

### Leaving upgrades starts the next wave

- After a wave clear, opening **Upgrade** and then closing the shop now starts the normal **10-second next-wave countdown** automatically.
- Buying upgrades still does not start anything by itself; you can browse until you leave.
- Checkpoint upgrades are unchanged: they still return to the checkpoint panel first.
- The help panel and wave-cleared subtitle now describe the new flow.

### "CLICK HERE" is a trap

- Pop-up ads now have a real **CLICK HERE** button, separate from the ✕.
- Clicking the CTA takes a random **25–75%** of the player's **current health** (ignores wave damage pressure), shakes the screen, marks the player, and closes the pop-up without Joy or a monster hit.
- Clicking the ✕ still rewards Joy and damages the imp as before.
- The help panel warns: click the ✕, never CLICK HERE.

## v0.9.6 — One boss, 50% per wave (2026-11-04)

The boss encounter is no longer a guaranteed pair or a guaranteed spawn.

- **One boss only.** The opening pair roll is gone. `spawnBoss()` always creates a single Algorithm.
- **50% chance per wave.** Once the island is **64% clear**, each wave rolls a **50%** chance to wake the boss. If the roll fails, it tries again on the next wave. The encounter can only happen once per run.
- The roll is per wave, not per frame, so standing still does not reroll it.
- Splits, the 75% HP ladder, smaller children, +25%/+50% speed tiers and randomised beams/summons are unchanged.
- The help panel and Mania note now explain the one-boss, 50%-per-wave rule.

## v0.9.5 — Boss split lock (2026-11-04)

A small fix for the four-boss ladder.

- Once **four bosses are live**, splitting stops for the rest of that fight. Previously a low-health survivor could split again after you killed one, refilling the arena.
- From that point the four (or however many remain) can be killed **one at a time**. The boss bar moves to the next live Algorithm, and partial rewards still apply.
- The lock resets when the boss fight ends and when a new run starts.
- The 75% split ladder, smaller children, +25%/+50% speed tiers and randomised beams/summons are unchanged.

## v0.9.4 — Boss split ladder (2026-11-04)

The Algorithm now splits on a readable health ladder instead of a one-off twin.

### Splitting

- A boss splits at **75% health**, not 50%.
- The parent is consumed by the split and replaced by **two smaller bosses**. Each child can split once at 75%, so **1 → 2 → 4**.
- Split bosses shrink with each generation: **82%** of the parent's size, then **67%**. Their hitbox radius shrinks with the art.
- **Four-boss Mania** remains in Settings. Turn it off and only the first generation splits, stopping at two.
- The split itself does not pay a boss reward; only killing the final live boss ends the fight.

### Speed

- **1 boss:** normal speed.
- **2 bosses:** **+25%** movement and attack tempo.
- **3–4 bosses:** **+50%** movement and attack tempo.
- The multiplier applies to movement, beam cooldowns, radial volleys and ad-break timing.

### RNG

- Boss beams are randomised: **1–2 beams** per cast, with random spread, length, width and wind-up.
- Summons are randomised: **1–3 adds** at the first threshold and **2–4** at the second, with random types and positions. Behemoths are a rare roll.
- Multi-boss add caps and smaller spawn particles still apply, so the extra bosses do not turn into a particle firehose.

### Performance

- Keeps the v0.9.3 boss-fight resolution budget: 1.1× desktop / 1.0× touch while bosses are live.
- Split bosses are smaller, which reduces both the hitbox and the pixels each one paints.

> *Stutter? Sure. That's what ads do.*

## v0.9.3 — Boss-fight performance (2026-11-04)

A focused hotfix for the moment the Algorithm arrives with friends.

### Rendering

- **Boss fights render at a lower resolution.** The canvas drops to 1.1× on desktop and 1.0× on touch while any boss is alive, then restores the normal cap when the last one dies. The scene is still sharp enough for a boss fight and much cheaper to fill.
- **Fewer ornaments per boss.** When more than one boss is live, each body draws fewer glitch rows and two orbiting sponsored cards instead of four.
- **Cached sponsored cards.** The orbiting cards are pre-rendered once instead of redrawing their text every frame.
- **Cached boss-bar gradient.** The health bar no longer rebuilds its gradient every frame.
- **Nameplate budget.** Multi-boss fights cap nearby monster nameplates, so the screen does not spend its frame on 20 tiny labels.

### Boss adds

- Boss adds are capped at **8 live** during multi-boss fights, and each boss summons fewer at the 70%/36% thresholds.
- Summoned adds use a much smaller spawn burst, so four bosses cannot dump hundreds of particles in one frame.
- Boss radial volleys are **6 projectiles** instead of 9 when more than one boss is live.
- Single-boss fights keep the original add counts and 9-projectile volleys.

## v0.9.2 — Performance & four-boss Mania (2026-11-04)

A performance patch with one Mania option. No class, dock or theme rewrites.

### Performance

- **Canvas resolution cap lowered to 1.5× on desktop and 1.25× on touch devices.** It still looks crisp, and it removes roughly 44–65% of the pixels a 2×/3× screen used to push every frame.
- **60 fps render ceiling.** Logic still updates every animation frame, but 90/120 Hz screens no longer redraw the whole canvas twice as often as needed.
- **Cached full-screen gradients.** The ocean gradient, normal vignette and Halloween layer are built once per size instead of every frame.
- **Halloween overlay is now an offscreen layer.** The pumpkin moon, wash and vignette are composited once; only the fog and bats animate. The duplicate normal-theme vignette is skipped while Halloween is on.
- **Minimap terrain is cached.** The static island is drawn once to an offscreen canvas; each minimap refresh only redraws corruption, markers and the camera box.
- **Lighter water pass.** Fewer wave lines, a wider sampling step and fewer sparkles, with the same overall look.
- **Touch-aware effects.** The Halloween overlay and ocean pass use fewer fog bands, bats and wave samples on touch devices.

### Four-boss Mania

- The Algorithm's pair chance is now **50%** (was 40%).
- New **Settings → Four-boss Mania** toggle, on by default. Each boss can split **twice** below **50% health**, so one boss can still become four as the health bar drops. The live cap remains **4**.
- Turn the toggle off to restore the old one-split rule. Partial boss rewards, the `×N` boss bar and the final-defeat collapse are unchanged.

## v0.9.1 — Halloween readability (2026-11-04)

A small patch for the new seasonal theme. No gameplay changes.

### Theme

- Replaced the dark inverted Halloween palette with a **warm autumn-dusk** palette: parchment surfaces, dark ink, pumpkin-orange accents and a violet-to-peach title sky.
- The theme no longer flips text to cream on light panels, so the HUD, chat, class cards, settings and boss panels stay readable.
- **Wave changes got a contrast pass:** the wave banner now uses a solid paper backing, hard dark labels, darker kicker/note text, a high-contrast `cleared` green and a deep raspberry `warn` state.
- Secondary text (`--ink-soft`, `--ink-faint`) is darker in the theme for wave notes, role labels and quest lines.
- Kept the pumpkin moon, soft fog, bats and jack-o'-lanterns; the canvas wash is now a light amber/violet tint instead of a dark vignette.

## v0.9.0 — Archivist, Moderator & the dock (2026-11-04)

Two new classes, a real south-shore dock, a Halloween theme, and a companion pass.

### Two new classes

- **Archivist / support.** Index Dart pierces and marks an ad, Cross-Reference marks and briefly stuns a cone, and Public Record heals and shields nearby friends while marking every ad in a wide ring. 100 HP, 0.90 power, 1.1 HP/s regen.
- **Moderator / crowd control.** Ban Hammer knocks and stuns, Lock Thread roots a crowd, and Mass Ban is a wide knockback/stun/damage shockwave. 135 HP, 0.95 power, and 10% less incoming damage.
- Both classes ship with procedural Canvas art: portraits, distinct silhouettes, headgear, held gear (stamp staff / gavel), projectiles, hit effects, HUD icons (`ledger`, `gavel`, `lock`), class-select cards and their own wave-5 medals (**Due Diligence**, **Thread Locked**).
- The class picker now shows **nine classes**.

### Dock and shopkeeper

- The south shore now has a real **dock** (planks, posts, crates, lantern, bobbing boat and sign) with a minimap marker.
- **Mira** the shopkeeper has a stall, awning, jars, a nameplate and an `F` prompt. The panel is honest about scope: the place and the character exist, while the shop, boat travel and dock quests are the next expansion.
- The interaction prompt follows you between the kindness bench and the dock.

### Companions

- The AI healer is gone. Companions are exactly two, drawn from **AdBlocker, Reader-Mode, Archivist and Moderator**, and they never heal the real player. **Fact-Checker** and **Medic** remain player-only classes.
- The Archivist companion marks ads; the Moderator companion stuns them. Their damage stays at 10% of the player's.

### Halloween theme

- **Default-on Halloween theme** with a Settings toggle: dark-purple paper and panels, a pumpkin moon, low fog, bats, jack-o'-lanterns on the beach, a purple sea, and a **HALLOWEEN** badge on the title screen.
- The canvas gets a fog/vignette overlay; the HUD and title screen use the same palette so it reads as a theme rather than a tint.
- Turn it off in **Settings → Halloween theme** for the original pastel island.

### Notes

- The Archivist/Moderator classes and the dock no longer appear in the pending list: they shipped.
- Docs, README and the release zip are updated for v0.9.0.

## v0.8.0 — Mania (2026-11-04)

Mania mode is live. Death resets the run, and the Algorithm brings friends.

### Death resets the run

- Dying now restarts the run at **wave 1 (Super Easy)**. Joy, upgrades, level, XP, boss progress and island corruption reset with it.
- The death animation still plays, then the island resets. There is no bench respawn.
- Medals, notes, settings, cosmetics and lifetime bests still persist.

### Boss mania

- The Algorithm encounter has a **40% chance** to spawn **two bosses at once**.
- Any boss below **50% health** summons another boss. Cap: **4 active bosses**.
- Downing one boss pays partial Joy and XP; only the last one triggers the island collapse and the Algorithm Unplugged medal.
- The boss bar and off-screen marker show `THE ALGORITHM ×N` while more than one is live.

### Title

- The title screen now carries the **MANIA** badge and a rules note: death resets the run, two bosses can spawn, bosses split at 50%.
- The page title and social metadata read **AdBlock Island: Mania**.

### Notes

- The Archivist, Moderator, dock and shopkeeper were still planned at this point; they shipped in **v0.9.0**.

## v0.7.0 — beta (2026-11-04)

Endless mode, checkpoints, mandatory upgrades and a damage curve. The campaign still ends at wave 10; the door after it now goes somewhere.

### Endless mode

- Clearing wave 10 changes the final button from **Keep going** to **Enter Endless**. Wave 11 begins **Endless mode**: there is no final wave, and the tier label, banner and HUD all say so.
- **Checkpoints every three endless waves.** Waves **11, 14, 17, 20…** pause the island and pay a checkpoint bundle: **80, 100, 120… Joy** (`60 + 20 × checkpoint`).
- A checkpoint is a real pause. The upgrade shop opens, and the next wave is locked until you buy at least one upgrade (or every upgrade is maxed). **Step away** lets you leave the checkpoint and wander; the wave card brings it back. `Esc` and the close button will not skip it. *(Corrected in the footnote below: Continue is now always available.)*
- **Dying in Endless restarts the current wave.** Joy, upgrades and checkpoint progress are kept. The old bench respawn still applies in the campaign.
- The HUD wave card shows `Endless`, the current depth, and the enemy damage pressure. The pause screen remembers your deepest endless wave.

### Upgrades before every wave

- After every wave clear, the next wave is **gated**: while you can afford an upgrade and have not bought one since the clear, the card replaces **Next wave** with **Upgrade first**. `Enter`, `N` and the wave card all go through the same gate. *(Corrected in the footnote below: the next wave is always available.)*
- Free items and cleansing do **not** open the gate. Spending Joy does.
- If nothing is affordable, the island lets you pass rather than soft-lock the run.
- The wave panel now spells out the gate instead of hiding it behind a disabled button.

### The ads hit back

- Enemy damage gains a pressure multiplier on top of the existing wave recipe:
  - waves 1–6: **×1.00**
  - waves 7–10: **×1.05 → ×1.20**
  - wave 11+: **×1.50**, rising by ×0.10 per wave and capping at **×2.60**
- It applies to contact hits, the Algorithm, sponsored beams, flyers and pop-up damage. By wave 16–20 an unupgraded 85–100 HP hero dies in a few hits; the same wave is survivable with **Deep Breaths** ranks and a little care.
- A late death with no vitality ranks now suggests Deep Breaths instead of silently letting the run stall.

### Achievements

Five new medals join the gallery:

- **Beyond the Ladder** — enter Endless mode.
- **Tea Break** — reach your first endless checkpoint.
- **Deep Static** — reach wave 20 in Endless.
- **Kettle On** — reach five endless checkpoints.
- **Ad Infinitum** — reach wave 30 in Endless.

### Planned: 4-player online rooms

Not shipped. The current build is still single-player and same-keyboard co-op. The plan for the next online step:

- **Vercel** hosts the static game plus a tiny signaling API. A free Redis store (Vercel Marketplace/Upstash) holds room codes and SDP/ICE.
- **4 players per room**, joined by a short room code or link.
- **One player hosts the simulation.** WebRTC data channels carry inputs and snapshots; the host is authoritative for ads, waves, the boss, the island and checkpoints.
- **No accounts, no anti-cheat, no host migration.** If the host leaves, the room closes. Cross-device saves and moderated public chat remain later work.
- Phases: deploy → room lobby/signaling → 2-player sync → 4-player polish (TURN, reconnect, chat).

This is deliberately separate from the single-file build. The shipped file stays offline-capable.

### Distribution

- `adblock-island-beta-v0.7.0.zip` is rebuilt from `index.html`, `README.md` and `CHANGELOG.md`.
- The game is still one HTML file with no build step, no CDN, no fonts, no backend and no network calls.

### Footnote — run-only progression (2026-11-04)

This is a correction to the same v0.7.0 release, not a new version.

- **Joy and upgrade ranks reset to zero at the start of every run.** Level, XP, boss progress and island corruption reset too; run progress is no longer written to `localStorage`.
- **The next wave is always available.** Upgrading is optional again: choose `Upgrade` if you want, or take `Next wave` immediately. Checkpoint `Continue` is always enabled.
- Medals, kindness notes, settings, collected items and lifetime bests still persist.

### Footnote — companion damage (2026-11-04)

- The two AI companions now deal **10% of the player's current damage** per hit. They no longer use fixed damage rolls, and they do not inherit the Engineer's overclock window. The human same-keyboard partner is unchanged.

## v0.6.7 — beta (2026-11-02)

Massive changes: class identity pass. Every class now has its own silhouette and held gear instead of sharing the Reader's robe, cape and pointed hat — the Engineer gets a hard hat and a swinging wrench, the Medic a cross cap and a syringe staff, the Hacker a hood, visor and handheld terminal, the Streamer headphones, a mic boom and an antenna. The Engineer, Medic, Hacker and Streamer also stopped borrowing the Reader's attack: they now throw their own wrench bolts, syringes, exploit bolts and hype shards, each drawn as a real prop with its own hit behaviour (turret shots fire visible bolts, syringes patch you on impact, exploit bolts pierce and mark, hype shards pierce a crowd). Class cards, in-game sprites and projectiles all read as different kits now.

### Bug fixes

- **New classes borrowed the Reader's attack.** `doAttack()` had no branches for Engineer, Medic, Hacker or Streamer, so all four fell through to the Reader's piercing beam. Each one now has its own projectile, hit behaviour and sound.
- **New classes borrowed the Reader's body.** `drawHeroBody()` only special-cased AdBlocker and Fact-Checker; everything else was drawn with the Reader's cape, robe and pointed hat. The four new kits now have their own silhouettes and headgear.
- **Projectiles all looked the same.** `drawProjectiles()` only knew three shapes, so every class shot rendered as the same recoloured circle. Wrench bolts, syringes, exploit glyphs and hype shards now have real art.
- **Piercing shots hit the same ad every frame.** A single shard could tick against one target repeatedly and delete a boss in a fraction of a second. Projectiles now track what they have already hit.
- **Turrets dealt invisible damage.** Turret fire was instant with no travel or miss chance. Turrets now launch visible bolts.
- **The overclock buff only boosted damage.** It now also shortens attack cooldown by 40%, as the description promised.
- **Patch notes were listed oldest-first** under a heading that says newest-first. The list is now genuinely newest-first.
- **The PATCH NOTES button rendered as a raw link.** It was an `<a>` wearing the `.big-btn` class, so it stayed inline: default link colour and underline, and no full-width hit area. It now renders exactly like *wash ashore*.

### Distribution

- The release zip (`adblock-island-beta-v0.6.7.zip`) is a **self-contained static build**: one `index.html` with all CSS, JavaScript, canvas art, audio and save data inline. No CDN, no fonts, no `fetch`, no WebSockets, no backend.
- It runs from `file://`, from GitHub Pages, or from any static host you upload it to. Drop the `index.html` on a host and it plays.
- **Co-op is local, not networked.** "Play with a friend" puts player two on the same keyboard (arrow keys) on the same screen. There is no online matchmaking, no peer-to-peer and no server — a single static HTML file cannot provide those on its own. The zip is fully playable online as a single-player/co-op game; it is not an online multiplayer client.
- The submission zip lives at the repo root as `adblock-island-beta-v0.6.7.zip` and is intentionally **not committed** to git; it is rebuilt from `index.html`, `README.md` and `CHANGELOG.md`.

## v0.6.6 — beta (2026-11-02)

Massive changes combined: achievements + toasts + medal gallery, four new classes (Engineer, Medic, Hacker, Streamer) with unique icons and projectile visuals, class-specific attack effects, PATCH NOTES button, and mobile/web optimization pass. Single-file build, no backend. Submission zip refreshed.

## v0.6.5 — beta (2026-11-02)

Massive changes: added class-specific projectile visuals and unique attack effects so each class throws distinct projectiles (turret bolts, syringes, exploit bolts, hype beams) instead of identical reskins. Submission zip refreshed.

## v0.6.4 — beta (2026-11-02)

Massive changes: added unique class icons (turret, syringe, terminal, broadcast) so each class is visually distinct instead of looking like a reskinned mage. Submission zip refreshed.

## v0.6.3 — beta (2026-11-02)

Massive changes: added four new classes — Engineer (deployable turrets + Overclock), Medic (heals and shields), Hacker (exploits and marks), and Streamer (wide AoE hype beams). Each has unique stats, skills, and achievements. The class picker now shows all seven classes. Submission zip refreshed.

## v0.6.2 — beta (2026-11-02)

Massive changes: added a new **Engineer** class with deployable turrets and an Overclock burst, plus a full achievement pass — seven new medals (Algorithm Unplugged, Shield Wall, Sharpshooter, Speed Reader, Better Together, Big Spender, Spotless), unlock toasts, and a medal gallery in the pause screen. Wave, class, co-op, economy and cleanup milestones now all grant medals. The submission zip was refreshed.

## [0.6.1] — 2026-10-30

A **quieter phone HUD**. Nothing on the island changed — the same handful of facts was being told three times, and now it is told once. Desktop is untouched, and moving a mouse brings the full layout straight back.

### At a glance

| Element | Before | After |
| --- | --- | --- |
| Top band | 170 px tall, XP bar, four-line wave card | 144 px tall, `Lv N` chip, two-line wave card |
| Tool buttons | five unlabelled icons | mute, chat and pause |
| Clarity card | ring + objective sentence + bar | ring and percentage only |
| Wave banner | 105 px, 3.2 s on screen | 71 px pill, 1.9 s |
| Pop-up windows | up to 3 | up to 2, spawned in the middle band |
| Toast tray | 4 messages, 3 s each | 2 messages, 2.2 s each |
| Touch buttons | SKILL/BONK label chips | icon only, thinner edges |
| Companion state | hidden below 860 px | one quiet line under the wave card |

### Changed

- **The top bar consolidates.** The player card drops its XP bar — a `Lv N` chip sits beside your name instead — and shrinks from 66 px to 56 px. The wave card goes from four lines to two, with the crew folded onto the count line (`4 left · 4 pop-ups`). The clarity card keeps its ring and percentage and loses the objective sentence and progress bar, which repeated what the ring already said.
- **Five tool buttons become three.** Mute, chat and pause stay; help and settings were already one tap away in the pause panel, so they no longer sit over the play area.
- **The wave banner is a pill, not a paragraph.** It loses the tier note, halves in height, and stays on screen for 1.9 s instead of 3.2 s. It also sits lower now, at 21% of the screen, so it clears both top cards while it is up.
- **Pop-up ads are capped at two on a phone**, in the middle band, so they never land under the top cards or the thumb buttons.
- **The toast tray keeps two messages**, for 2.2 s instead of 3 s, in smaller type.
- **Touch buttons lose their floating SKILL/BONK labels** and carry thinner borders and softer shadows. Tap targets are unchanged in size — thumbs still need them.
- **Companion state is visible on phones again.** The status chips were `display:none` below 860 px, so the health and down timer of your two allies never showed on the platform where it matters. A single quiet line under the wave card now carries it, in rose when someone is down.

### Verified

- 11 phone-HUD checks at 390×844: level chip replaces the XP bar, two-line wave card naming the crew, companion line, tool row down to mute/chat/pause, ring-only clarity card, no floating button labels, help and settings still reachable through pause, pop-up cap of two, toast tray of two, and a mouse restoring the full desktop layout.
- A touch soak cleared wave 1 with the pop-up cap never exceeded, the compact banner clearing both top cards, and no runtime errors.

## [0.6.0] — 2026-10-30

A **balance pass across the whole island**: fewer but realer allies, a ladder that reads like stages instead of a multiplier, and damage numbers that finally reflect the class you picked.

### Your party

The seven roaming locals are gone. Whichever class you leave on the title screen supplies the two heroes already on the island, so the party is always all three classes and always yours.

| Hero | Class | What they bring |
| --- | --- | --- |
| **Tidal** | AdBlocker | The line to stand behind: a short, wide swing that keeps ads off you. |
| **Moss** | Fact-Checker | Marks ads for extra damage and patches you up 8 HP on a cooldown. |
| **Juniper** | Reader-Mode | Reaches across a crowd from the back and keeps the flanks clean. |

Pick the AdBlocker and you wash ashore beside **Moss** and **Juniper**; pick the Reader and you get **Tidal** and **Moss**. They cleanse, chip ads, mark, heal, and can now be **knocked out** — a downed companion sits out 14 seconds and walks back from the bench at 60% health, and the HUD chips (or, on a phone, the ally line) name each one with their health or their timer.

### The ladder

`STAGE_CREWS` replaces the old type-pool maths. Every stage is a fixed recipe, so the preview on the cleared-wave card always matches the fight, and each tier introduces something instead of just multiplying the last one.

| Wave | Tier | Crew | Health | Damage |
| --- | --- | --- | --- | --- |
| 1 | Super Easy | 4 pop-ups | ×0.55 | ×0.60 |
| 2 | Super Easy | 3 pop-ups, 2 banners | ×0.70 | ×0.72 |
| 3 | Easy | 4 pop-ups, 2 banners | ×0.85 | ×0.84 |
| 4 | Easy | 3 pop-ups, 2 banners, 1 mimic | ×1.00 | ×0.95 |
| 5 | Normal | 4 pop-ups, 2 banners, 2 mimics | ×1.15 | ×1.05 |
| 6 | Normal | 4 pop-ups, 3 banners, 2 mimics | ×1.30 | ×1.12 |
| 7 | Hard | 4 pop-ups, 2 banners, 2 mimics, 1 behemoth | ×1.42 | ×1.20 |
| 8 | Hard | 3 pop-ups, 3 banners, 3 mimics, 2 behemoths | ×1.55 | ×1.28 |
| 9 | Super Hard | 4 pop-ups, 3 banners, 3 mimics, 3 behemoths | ×1.68 | ×1.36 |
| 10 | Super Hard | 5 pop-ups, 3 banners, 3 mimics, 3 behemoths | ×1.80 | ×1.45 |
| 11+ | Super Hard+ | the same shape, one more ad per wave up to 20 | +0.10 a wave | +0.06 a wave |

### Added

- **Crew readouts.** The wave card names what is still standing (`2 pop-ups · 1 behemoth`) instead of only counting it, and the cleared-wave panel previews the next crew by type.
- **Companion down and revival.** A companion knocked to zero HP is out for 14 seconds, then walks back from the bench at 60% health with a line about what they missed.

### Changed

- **Harder across the board.** Late crews are bigger (13 ads at wave 9, 14 at wave 10, up from 11 and 12), wave damage multipliers climb further (Super Hard is ×1.45, up from ×1.27), contact attacks land every 1.3–0.92 s instead of 1.5–1.05 s, player invulnerability after a hit drops from 0.62 s to 0.5 s, and Banner Bat flyers are faster and hit for 9 instead of 8.
- **The scaling layers no longer stack into sponges.** Monster health carried both a wave multiplier and a level-plus-elapsed-time multiplier; the elapsed-time term is gone and the per-level term drops from 0.13 to 0.05. On a level-10 save, wave 10 is about 2.6× base health instead of roughly 4.2×, while the stage table carries the curve. A maxed level-10 AdBlocker needs around 40 seconds of clean damage for the Super Hard crew instead of minutes.
- **Class power is real.** `playerDamage()` now applies the class damage stat, which had been defined and then ignored: Fact-Checker 0.92, AdBlocker 1.00, Reader-Mode 1.16. The tank keeps its sustained sword, the checker pays for its healing, the reader gets its advertised output.
- **Companions can no longer steal kills.** Their finishing hit used to pay 20% Joy and XP because only player damage counted; a kill is now the party's kill at full value.
- **The Algorithm fights back.** Its free damage from bystanders is capped at two helpers for about 3.5 DPS (seven locals used to solo the fight), and its health is sized to expected player damage — 1100 + 95 per level, down from 1500 + 170 — with sponsored beams and banner volleys arriving more often and 22 contact damage instead of 20.
- **The help panel tells the truth about who is beside you**, naming your companions, explaining that they are the classes you did not pick, and leaving the other locals to the kettle.

### Fixed

- The class `damage` stat had no effect on any attack.
- A companion landing the last hit cut your reward to a fifth.

### Verified

- 23 headless checks against the real page: ladder counts and health curve, crew recipes through `startWave`, class damage ordering, full-value party kills, the cleared-wave card, companion down and revival, boss sizing and capped chip damage, and i-frames swallowing a second hit.
- An autopilot soak cleared waves 1 and 2 (9 ads, first medal, first item, level 3) with no runtime errors and no deaths.

## [0.5.4] — 2026-10-29

Beta launch polish.

### Added

- **A social preview card.** `social-card.jpg` is a 1200×630 crop of the title screen with the beta badge, used by Open Graph and Twitter cards, so links to the game unfurl as the island instead of a bare URL.
- **Fuller link metadata.** The head now carries `og:url`, `og:site_name`, `og:locale`, `og:image` (with type, size and alt text), `twitter:card`, `twitter:title`, `twitter:description` and `twitter:image`, plus a canonical URL and app names for iOS.
- **Screenshots in the README.** Desktop title screen, a wave-cleared card showing the achievement and the next-wave preview, and the phone title screen.
- **`robots.txt` and `sitemap.xml`** so the public page is indexable and the beta is easy to find.

### Changed

- **The beta now counts from zero.** Every release in this log is numbered `0.x`, from `0.0.0` to this build, so the version line matches the project's actual status. The title badge, the build tag, the page metadata and the help panel all read the same `VERSION` constant.
- **The local storage keys changed.** They are now `adblock-island.save.v0`, `adblock-island.notes.v0` and `adblock-island.settings.v0`. These are storage-schema tags rather than game versions; progress, kindness notes and settings saved under the old keys do not carry over, so the first visit after this build starts fresh.
- The page now has a `<noscript>` card explaining that the island needs JavaScript, instead of a dead title screen.
- Description and preview copy mention the beta and the current version.

## [0.5.3] — 2026-10-29

The wave card gets keyboard manners.

### Added

- **`Enter` takes the next wave.** With the wave-cleared card open, `Enter` does exactly what the pink *Next wave · 10s* button does and starts the countdown. If you dismissed the card, `Enter` brings it back instead of skipping the choice.
- **`U` opens upgrades from the card.** Pressing `U` while the card is open jumps straight to the shop, same as the *Upgrade* button, and leaves the wave cleared and waiting for you.
- A quiet `Enter next wave · U upgrade` hint sits under the next-wave preview on desktop, and both buttons carry a tooltip. The hint is hidden on touch, where the buttons are the only input.

### Changed

- The help panel's controls line now lists `Enter` next to `N` wave choice and `U` upgrades.

## [0.5.2] — 2026-10-29

The wave ladder keeps its promise.

### Fixed

- **Waves stopped after the island had been restored once.** `updateWaves` bailed out whenever the island-clarity victory flag was set, so returning players got the wave 1 ads, killed them, and then nothing: no cleared popup, no reward and no way to call the next wave. The clarity victory and the wave ladder are now independent, and every visit can climb from Super Easy to Super Hard again.
- **The cleared-wave popup could be swallowed.** It used to be a one-shot 800 ms timer that only fired while the game was in the `playing` state, so pausing, being knocked out, or the island-restored panel opening at the same moment could lose it. The choice card now lives on a retry counter in the update loop: it opens when play resumes, survives a pause or a knockout, and reopens after the victory panel is dismissed.
- Waves cleared while the Algorithm is on the island still wait for the boss (that interruption is deliberate), but the popup is no longer lost in the process.

### Verified

- A save with `won: true` now clears waves 1→10: every wave spawns its full crew (4, 5, 6, 7, 8, 9, 9, 10, 11, 12 ads), every clear opens the choice card with the right medal or item, and wave 10 shows the "You saved this island from serving ads" win card.
- Pausing immediately after a clear, dying during it, and finishing the boss at the same moment all still lead to the popup.

## [0.5.1] — 2026-10-29

Beta, labelled.

### Added

- **A beta badge on the title screen.** A loud `beta · v0.5.1` pill sits next to the "wholesome micro-MMO" kicker, and the build tag in the bottom-right corner now reads `v0.5.1 · beta`. The pill's tooltip and the help panel's "This build" block both say the build is a beta.
- **A "Still pending" section at the top of these patch notes**, covering the achievements and items that are still thin, and the MMORPG essentials — online multiplayer, accounts, moderated chat, parties, quests, economy, anti-cheat, live ops — that a static page cannot provide on its own. Mirrored in the README.

### Changed

- The page `<title>` and `<meta name="description">` now say **beta** and the current version, so link previews and search results match the build.
- The help panel's "This build" block points at the pending list instead of implying the game is finished.

## [0.5.0] — 2026-10-29

Waves become a ladder you climb on purpose.

### Added

- **Upgrade or next wave.** Clearing a wave no longer rolls straight into the next one. A card opens with what you just swept, the story chapter you unlocked, the reward you earned and a preview of the next tier. **Upgrade** opens the shop; buying things never starts the next wave. **Next wave** starts a **10-second countdown** on the card under your portrait. The countdown pauses while the shop or any panel is open, and `N` or tapping the wave card reopens the choice if you dismissed it.
- **Medals.** Six achievements, tracked on the pause screen and kept between visits: First Sweep (wave 1), Polite Static (wave 3), They Brought Friends (wave 5), Banner Bane (wave 7), Hold the Line (wave 9) and Island Saved (wave 10).
- **Free items.** Waves without a medal hand out something instead: Spare Broom, Wool Blanket, Spare Lens, Worn Sandals, Cool Cloth, Jar of Joy or Kettle Break. Most are a free upgrade rank; the rest are Joy or a full heal. Found items are listed on the pause screen.
- **A story chapter per wave.** The island log runs from "the first pop-up bursts like wet paper" to the kettle at the end of the ladder, one short entry per clear, also written into the chat log so you can reread it. Waves 11+ have a small pool of extra entries.
- **An ending for the ladder.** Clearing **Super Hard** (wave 10) shows *"You saved this island from serving ads"*, fires the confetti, awards the Island Saved medal, and unlocks endless **Super Hard+** waves. The victory is remembered in the save.

### Changed

- **Every run starts at Super Easy.** Waves used to resume from `save.wave`; now the ladder always begins at wave 1, while levels, Joy, upgrades, medals, items and the island itself persist. Restarting the climb is the point, not a punishment.
- **The boss no longer eats a wave.** If the Algorithm interrupts the schedule, the wave is marked held and re-spawned properly once it is dealt with, instead of being counted as cleared with no ads on the field.
- The HUD wave card is now a button when a wave is cleared ("cleared · tap to choose") and shows the countdown while one is running.
- The pause screen "current plan" follows the wave state, and the help panel documents the choice, the countdown and the ladder's ending.

## [0.4.3] — 2026-10-29

The island gets its story told.

### Added

- **A backstory in the help panel.** Pressing `H` now opens with "The story so far": the ads came with the tide, the locals kept the kettle on, and you wash ashore with a broom and nowhere else to be. Two short paragraphs above the existing plan, class abilities, controls, ads, waves and co-op blocks.
- **A credit and disclaimer footer.** The bottom of the help panel names it as an original solo project by [@potaterrr](https://github.com/potaterrr), links to the source, and notes that every asset is hand-written — no third-party art, fonts, audio, or libraries — and that the game is a work of parody with no real advertisers involved.
- **README: backstory, how to play, patch notes, disclaimer.** The readme now opens with the island's story, then a seven-step how-to-play that matches the actual game loop (classes, aim, cleansing, waves, the Algorithm, the bench, co-op), then a patch-notes table covering every release from 0.0.0 to 0.4.3, then a plain-language disclaimer: original work by potaterrr, no third-party assets, no affiliation, no data collection.

### Changed

- The "note on the fiction" paragraph moved into the fuller disclaimer at the end of the README, so the affiliation and parody notice sits next to the ownership statement instead of being buried mid-document.

## [0.4.2] — 2026-10-29

The title screen gets the phone treatment too.

### Changed

- **The class picker is compact on phones.** The three full-width portrait cards are now short rows: a cropped portrait on the left, name, role and description on the right, abilities underneath. On a 390×844 phone the title card drops from 1424px to 948px tall and each class card from roughly 450px to 125px, so all three classes fit on one screen instead of one and a bit.
- **Phone-sized class blurbs.** Each class has a two-line description for the compact card, so nothing is cut off with an ellipsis. Desktop and tablet keep the original longer copy.
- Tighter title spacing under 500px (logo, tagline, name field, button, links) so the "wash ashore" button and the whole picker share the first screen.

## [0.4.1] — 2026-10-29

A phone-sized pass over the controls.

### Fixed

- **Touch controls no longer eat the screen.** The thumbstick and the four action buttons scale with the viewport: BONK drops from 82px to 61–67px on phones, the two skills from 60px to 45–49px, and the dash from 50px to 37–41px, while tablets and desktops keep the larger layout. The whole cluster stays inside the safe-area insets.
- **The HUD card fits its content.** Its width is now pinned to the space beside the tool row instead of shrinking to the nickname, so the HP and XP numbers are no longer clipped and the audio/chat/help buttons can't sit on top of it. On very narrow phones the tool buttons compact and the JOY box steps aside.
- **The wave banner** keeps its tier on one line and sits below the top cards instead of on top of them.
- **Short and landscape screens.** The title screen now scrolls from the top instead of centering itself out of reach, so "wash ashore" can't be pushed off-screen, and full-screen layers use `dvh` so a mobile browser's toolbar can't cover the bottom controls.

## [0.4.0] — 2026-10-29

Waves, a friend on the arrow keys, and aim that stops guessing.

### Added

- **Waves.** Ads now arrive in crews instead of trickling in. Difficulty climbs from **Super Easy** through **Easy**, **Normal**, **Hard**, **Super Hard**, into endless **Super Hard+**, with more ads, more health, more damage, and faster movement each step. Clearing a crew pays bonus Joy and XP, then the island takes a 4–5 second breath.
- **Wave notifications.** A banner announces every wave and every clear, a HUD card under your portrait tracks the current wave, tier, and remaining ads (or the countdown to the next one), and the locals comment in chat. The boss interrupts the schedule, and the card says so.
- **Same-keyboard co-op.** Turn on "play with a friend" on the title screen for a second hero on the arrow keys. They move with arrows, auto-swing at whatever they face, take real damage, and share the camera, the wave, and the Joy. The camera holds both heroes and leashes player 2 to one screen.

### Changed

- **Aim no longer depends on device detection at all.** If the mouse moved or clicked recently, the mouse is aiming — no media query, no pointer-kind flag. Touch input simply clears the flag. Moving a mouse on a touchscreen laptop also flips the HUD back to the desktop layout, so the mode is always visible.

### Fixed

- The AdBlocker's auto-sword could still draw attention to the wrong direction; it now has its own arc colour and never modifies the aim.

## [0.3.2] — 2026-10-29

Attacks now go where you point.

### Fixed

- **Aim assist was pulling swings sideways.** It picked the ad nearest to the *player* inside the aim cone, so a closer ad could steal a swing from the one you were actually pointing at. It now picks the ad nearest to your **aim line**, and large bodies get a much smaller amount of extra grace, so a boss standing next to you can no longer drag your attack 30–50° off target.
- **The AdBlocker's auto-sword was hijacking the aim.** It reused the normal attack direction and swept a full 360°, so every 0.85 s the visible swing snapped to whichever ad was closest — including ones behind you — while your buffered mouse aim appeared to be ignored. The sword now has its own animation, swings only in the forward arc, and never touches the direction you aimed.

### Changed

- The auto-swing draws its own small gold arc, separate from the shield bash, so you can tell the two apart.

## [0.3.1] — 2026-10-29

The mouse works everywhere now.

### Fixed

- **Mouse aim on hybrid devices.** The game used to pick touch mode purely from the `(pointer: coarse)` media query, so a touchscreen laptop, a tablet with a trackpad, or a Chromebook treated the mouse as if it did not exist. Aim now follows whichever device was used last: move the mouse and it takes over instantly, tap the screen and the thumbstick takes over again.
- **Aim keeps updating over the HUD.** Pointer moves were only tracked on the canvas, so the aim froze while the cursor crossed the minimap, chat, or top bar. They are tracked window-wide now.
- **Mouse aim is instant.** The hero used to ease toward the cursor with a short smoothing delay, which read as an unresponsive aim. It now points at the cursor exactly.

### Added

- Two faint pips in front of the hero show the aim direction at a glance.

## [0.3.0] — 2026-10-29

Aiming, weapons, and paperwork.

### Added

- **The AdBlocker gets a sword.** The mallet is gone; the tank now carries a proper arming sword and shield. Gold trim arrives at level 3, a steel glow at level 6.
- **Short-range auto-attack for the AdBlocker.** The sword swings on its own every 0.85 s at the nearest ad within 64 px, for a small slice of damage. Stand your ground and the crowd in front of you keeps chipping away even when you are busy blocking, dashing, or reading the wall.
- **Aim assist.** Attacks snap onto the nearest ad inside the aim cone (about 24° on desktop, 34° on touch), so shots land where you meant them to instead of where your thumb happened to be.
- **Version display.** The current version sits on the title card and in the help panel.
- **Docs.** A full README and this changelog.

### Changed

- **Desktop aiming is free again.** The mouse no longer locks onto enemies. Point wherever you like — including while walking — and the character aims there. If the mouse sits still for 8 seconds, aim falls back to the direction you are walking, so keyboard-only play still works.
- **Phones aim where you move.** The stick direction is the aim direction, with the leading cursor pip showing it, and attacks pick the nearest ad in that direction.

### Removed

- The enemy-lock reticle from 0.2.0. It was helpful, but it stole the cursor from players who wanted to keep aiming by hand.

## [0.2.0] — 2026-10-29

### Added

- The aim cursor travels with the player: it rides ahead of you while walking, and a mobile pip shows the stick direction.

## [0.1.0] — 2026-10-29

### Added

- **The cast is now chibi MMORPG adventurers**, drawn procedurally on the canvas with class armour, weapons, headgear, and idle flourishes: AdBlocker (plumed helm, kite shield, mallet), Fact-Checker (hood, cupid collar, magnifier staff), Reader-Mode (wizard hat, floating tome, quill wand).
- Gear tiers: gold trim from level 3, weapon glow from level 6.
- Each hero and local rolls their own skin and hair; bots spawn at levels 1–6 with visible weapons.
- Full-body class-select banners and a matching HUD portrait.
- The sitting pose actually sits on the bench instead of standing in front of it.

### Changed

- HUD portraits, cosmetic previews, bots, and the player all share one hero renderer.

## [0.0.0] — 2026-10-29

### Added

- Initial release: three classes (AdBlocker, Fact-Checker, Reader-Mode), four ad-monsters plus The Algorithm boss, Joy and clarity progression, permanent upgrades and cosmetics, roaming locals with chat, the kindness wall, procedural ocean and lo-fi audio, responsive retro-pastel UI, touch controls, and local save data.
- Deployed to GitHub Pages at <https://potaterrr.github.io/adblock-island/>.
