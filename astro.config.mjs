import { defineConfig } from 'astro/config';
import remarkPoemElement from 'remark-poem-element';
import remarkDirective from 'remark-directive';
import remarkProjectMetaBar from 'remark-project-meta-bar';

export default defineConfig({
  site: 'https://andystevens.name',
  output: 'static',
  redirects: {
    '/blog': '/articles/',
  },
  build: {
    inlineStylesheets: 'always',
  },
  markdown: {
    remarkPlugins: [remarkPoemElement, remarkDirective, remarkProjectMetaBar],
    shikiConfig: {
      themes: {
        light: 'github-light',
        dark: 'github-dark',
      },
    },
  },
});
