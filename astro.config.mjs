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
    },
    // Inline VAPID_PUBLIC_KEY into the client bundle alongside the default
    // PUBLIC_* prefix. Not a bare 'VAPID_' prefix — we must never expose
    // VAPID_PRIVATE_KEY to the browser.
    envPrefix: ['PUBLIC_', 'VAPID_PUBLIC_'],
  }
});
