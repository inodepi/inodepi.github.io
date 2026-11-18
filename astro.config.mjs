// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

// User Pages site, served from the domain root.
export default defineConfig({
  site: 'https://inodepi.github.io',
  output: 'static',
  integrations: [
    sitemap({
      // Demo builds are noindex concept pages; keep them out of the sitemap.
      filter: (page) => !page.includes('/demo/'),
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
