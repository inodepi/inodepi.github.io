// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

// TODO: replace USERNAME with your GitHub username or org before the first deploy.
export default defineConfig({
  site: 'https://USERNAME.github.io',
  base: '/inodepi',
  output: 'static',
  vite: {
    plugins: [tailwindcss()],
  },
});
