import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://andystevens.name',
  output: 'static',
  prefetch: {
    defaultStrategy: 'hover',
  },
  build: {
    inlineStylesheets: 'always',
  },
  markdown: {
    shikiConfig: {
      themes: {
        light: 'github-light',
        dark: 'github-dark',
      },
    },
  },
});
