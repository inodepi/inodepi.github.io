// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

// User Pages site, served from the domain root.
export default defineConfig({
  site: 'https://inodepi.github.io',
  output: 'static',
  vite: {
    plugins: [tailwindcss()],
  },
});
