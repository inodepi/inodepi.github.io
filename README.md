# inodepi

Portfolio and client-acquisition site for an n8n automation architect. Built with Astro,
Tailwind CSS, and GitHub Pages (static output).

## Local development

```bash
npm install
npm run dev
```

Build and preview the production output:

```bash
npm run build
npm run preview
```

## Before the first deploy

1. **Pages URL** — `site` is set to `https://inodepi.github.io` and the site is served
   from the domain root (no `base` path).
2. **Create the GitHub repo** named `inodepi.github.io` (a user Pages repo), push this
   folder to `main`.
3. **Enable Pages** — repository Settings → Pages → Source: **GitHub Actions**.
4. The workflow in `.github/workflows/deploy.yml` builds and deploys on every push to `main`.

## Contact and calendar

The contact section renders a custom two-week calendar in the browser (Sunday start,
past days disabled, paging by two weeks). Picking a day sends you to the Cal.com
discovery event with `?date=YYYY-MM-DD`; `siteConfig.calendarUrl` sets the destination.

## Editing content

Everything editable lives in two places.

### `src/data/projects.ts`

- `siteConfig` — name, email, Cal.com link, social URLs, response time.
- `automationRepos` — the featured repository cards. Toggle `featured` to choose what shows.
- `sideProjects` — the side project cards. Set `size: 'large'` on one entry to make it the
  feature card above the grid; `demoUrl` makes the card link to a playable build.

### `src/styles/global.css`

The `:root` block holds the dark palette; `[data-theme='light']` holds the light palette.
To switch themes, add `data-theme="light"` to the `<html>` tag in `src/layouts/Base.astro`.

## Brand

- **Mark:** a π drawn as a node graph — two legs ending in nodes, one filled, one outlined.
- **Wordmark:** `inode` + the π glyph, read as “I · node · Pi”. The favicon and mark
  live in `public/favicon.svg` and `public/logo.svg`.

## Structure

```
src/
  components/   Hero, WorkflowCanvas, Capabilities, FeaturedRepos,
                SideProjects, Process, Contact, Footer,
                BrandMark, PiGlyph
  data/         projects.ts (typed content config)
  layouts/      Base.astro
  pages/        index.astro
  styles/       global.css (design tokens)
public/         favicon.svg, logo.svg
```
