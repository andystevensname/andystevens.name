import { defineConfig } from 'astro/config';
import remarkPoemElement from '@andystevensname/remark-poem-element';
import remarkDirective from 'remark-directive';
import remarkProjectMetaBar from '@andystevensname/remark-project-meta-bar';
import remarkFediverseHandle from './src/lib/remark-fediverse-handle.mjs';

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
    remarkPlugins: [remarkPoemElement, remarkDirective, remarkProjectMetaBar, remarkFediverseHandle],
    shikiConfig: {
      themes: {
        light: 'github-light',
        dark: 'github-dark',
      },
    },
  },
  vite: {
    server: {
      allowedHosts: ['.ngrok-free.app', '.ngrok-free.dev', 'andystevens.name', 'localhost'],
    }
  }
});
