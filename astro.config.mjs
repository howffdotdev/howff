import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://howff.dev',
  output: 'static',
  trailingSlash: 'never',
  integrations: [sitemap()],
  markdown: {
    smartypants: false,
  },
  build: {
    format: 'directory',
    inlineStylesheets: 'auto',
  },
});
