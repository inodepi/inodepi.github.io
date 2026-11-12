// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

// Temporary hosting: potaterrr.github.io/inodepi. Update if the repo moves.
export default defineConfig({
  site: 'https://potaterrr.github.io',
  base: '/inodepi',
  output: 'static',
  vite: {
    plugins: [tailwindcss()],
  },
});
