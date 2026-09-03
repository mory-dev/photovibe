// @ts-check
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://photovibe.mory.dev',
  trailingSlash: 'never',
  vite: { plugins: [tailwindcss()] },
  integrations: [sitemap()],
});
