// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

// Project Pages URL: inodepi.github.io/inodepi.
export default defineConfig({
  site: 'https://inodepi.github.io',
  base: '/inodepi',
  output: 'static',
  vite: {
    plugins: [tailwindcss()],
  },
});
