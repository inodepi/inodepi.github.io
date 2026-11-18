# DESIGN.md

Design system for inodepi.github.io: the main practice site, the `/websites` doorway,
and the four fictional demo builds under `/demo/`.

## Product truth

inodepi is an independent n8n automation practice. The site sells one action: a 15-minute
systems audit. The `/websites` page and the demo builds support the outbound funnel —
prospects with broken websites see a site built for their vertical plus the automation
behind it.

Modes: main site and `/websites` are **Persuade**; demo pages are **Persuade** surfaces
selling the visitor's own business back to them, with the systems layer as proof.

## Main site

- Dark drafting-board surface, amber accent, node-graph vocabulary (chips, ports, `node/` ids).
- Tokens in `src/styles/global.css`; single dark palette, no light variant ships.
- Type: Bricolage Grotesque (display), Inter (body), system mono for identifiers and data.
- Components: `.btn`, `.tag`, `.container`, `.section`; cards use hairline borders and a
  coloured node chip, never decorative gradients or glows.
- Motion: one orchestrated hero entrance; reduced motion swaps the hero video for its poster.

## Demo builds

Each demo is a separate visual world with its own tokens set per page:

| Route | World | Ground | Accent | Display face |
| --- | --- | --- | --- | --- |
| `/demo/furnaceworks/` | Work-order paperwork, dispatch board | cool paper `#eef1f4`, ink panels `#101a24` | furnace orange `#e4551f` (dark ink on it) | Archivo |
| `/demo/redline-towing/` | Night highway, hi-vis signage | asphalt `#14181a` | safety yellow `#ffd400` | Barlow Condensed |
| `/demo/fernhollow/` | Off-grid forest, hospitality | forest `#1b3527` + sage `#e9ecdf` | lantern `#e2a33c` | Gabarito |
| `/demo/lumen-dental/` | Warm clinical, text-first | bone `#f8f7f4` | plum `#a63d6b` | Schibsted Grotesk |

Shared rules:

- `src/layouts/DemoLayout.astro` sets base resets, the demo ribbon, the coupon footer, and
  `[hidden]` handling. Every demo is `noindex` and excluded from the sitemap.
- `LoopStrip` is the series signature: an inverted panel (brand ink background) showing four
  numbered steps with node dots and tool chips. It always ends the marketing sections and
  always names the workflow that runs each step.
- `DemoForm` is a client-side demonstration only. Its success state lists what would happen
  next and states plainly that nothing was sent.
- Copy is authored per brand; prices, names, and queues are sample content and are labelled
  as such. No invented customer claims or review counts.
- One authored entrance per page; no scroll-triggered effects, no hover lifts on cards.

## Brand marks

- One authored SVG mark per demo, in `src/components/demo/DemoMark.astro`: flame
  (FurnaceWorks), tow hook (Redline), fir (Fernhollow), tooth with a light seam (Lumen).
- Marks take `size` in rem and inherit `currentColor`; the page sets the colour (chip ink,
  hi-vis yellow, chalk white, plum). No gradients, no bevels, no third-party shapes.
- The main site keeps its own node-graph wordmark; demo marks never appear on it.

## Accessibility and performance floor

- 44px minimum touch targets; visible `:focus-visible` rings on every interactive element.
- WCAG AA contrast verified on tokens and on inverted panels (tool chips are tinted from
  the panel's own text colour, never pure accent on a light panel).
- No horizontal overflow at 320px; form states (empty, filled, success, reset) all tested.
- Static Astro output, no client framework; forms use one inline script per page.

## Photography

- Demo photos are CC0 / public-domain images sourced through Openverse (Stocksnap,
  Rawpixel), stored per demo under `public/demo/<slug>/`, and credited in
  `public/demo/CREDITS.md`.
- Each photo is cropped to its display slot and graded to the brand: Redline dusk-cool,
  Lumen warmed, FurnaceWorks cooled, Fernhollow left natural. All ship as WebP.
- No third-party logos, readable phone numbers, or client work appear in frame; photos
  support the demo story rather than standing in for proof.

## Known deliberate choices

- The main site keeps a 52px grid background and noise overlay as the drafting-paper motif;
  the detector flags it as advisory.
- The demo ribbon is intentionally visible at the top of every demo page, and its preview
  screenshot includes it.
