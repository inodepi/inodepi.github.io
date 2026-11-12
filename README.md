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

1. **Set your Pages URL** — edit `site` in `astro.config.mjs`:
   `https://USERNAME.github.io`. `base` is already `/inodepi`.
2. **Create the GitHub repo** named `inodepi`, push this folder to `main`.
3. **Enable Pages** — repository Settings → Pages → Source: **GitHub Actions**.
4. The workflow in `.github/workflows/deploy.yml` builds and deploys on every push to `main`.

## Editing content

Everything editable lives in two places.

### `src/data/projects.ts`

- `siteConfig` — name, email, call link, form action, social URLs, response time.
- `automationRepos` — the featured automation cards. Replace the placeholder fields and
  toggle `featured` to choose what shows. Capped at four cards.
- `sideProjects` — same idea for side project cards.

### `src/styles/global.css`

The `:root` block holds the dark palette; `[data-theme='light']` holds the light palette.
To switch themes, add `data-theme="light"` to the `<html>` tag in `src/layouts/Base.astro`.

## Wiring the contact form

The form posts to `siteConfig.formAction`, currently `#`. Point it at a form backend
(Formspree, Netlify Forms, Basin, or your own endpoint) and the static build will submit
there with no other changes.

## Style previews

Six alternative designs live under `/style/`:

- `/style/ledger/` — warm paper, serif, oxblood accents
- `/style/poster/` — bold Archivo, cobalt, typographic hero
- `/style/fieldnotes/` — sage, Literata, calm single column
- `/style/riso/` — two-colour risograph zine with tape, stamps, marquee
- `/style/control/` — operations dashboard with execution monitor and capability matrix
- `/style/atelier/` — dark editorial gallery with a constellation graph

They share `src/data/projects.ts` and `src/data/content.ts`. Once one is chosen, promote
it by making its page the homepage and converting its sections into components.

## Structure

```
src/
  components/   Hero, WorkflowCanvas, Capabilities, FeaturedRepos,
                SideProjects, Process, Contact, Footer
  data/         projects.ts (typed content config)
  layouts/      Base.astro
  pages/        index.astro
  styles/       global.css (design tokens)
public/         favicon.svg
```
