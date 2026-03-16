import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://andystevens.name',
  output: 'static',
  build: {
    inlineStylesheets: 'always',
  },
});
