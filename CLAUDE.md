# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Personal website for andystevens.name built with Astro 5 and deployed to Netlify. Static-only output with no client-side JavaScript framework. Strong emphasis on performance (inlined CSS, subset fonts, no CSS framework) and IndieWeb standards (microformats, WebMention, IndieAuth, Bridgy federation).

## Commands

- **Dev server**: `npm run dev`
- **Build**: `npm run build` (outputs to `dist/`)
- **Preview build**: `npm run preview`
- **Format**: `npx prettier --write .`

No test or lint scripts are configured.

**Remark plugin cache**: Astro caches compiled markdown in `.astro/data-store.json`. After changing a remark plugin, delete this file and restart the dev server to see changes.

## Architecture

**Astro static site** with two content collections defined in `src/content/config.ts`:
- **blog** (`src/content/blog/`) — Markdown posts with title, description, date, published, tags, slug
- **pages** (`src/content/pages/`) — Markdown pages with title, description, slug

**Routing**: File-based via `src/pages/`. Dynamic routes use `[slug].astro` for both blog posts and pages.

**Layout**: Single `Layout.astro` wraps all pages. It handles meta tags, Open Graph, IndieWeb microformats (h-card, h-feed, h-entry), and WebMention endpoints. Props: title, description, extraHead, canonical, ogType.

**Styling**: All CSS lives in `src/styles/global.css` — pure custom CSS, no framework. Dark mode via `html.dark` class with localStorage persistence. Stylesheets are inlined at build time (configured in `astro.config.mjs`).

**Animation**: Custom SVG animation system in `src/lib/animation/` (TypeScript modules, no third-party libraries). Used on the homepage via `Animation.astro`.

**RSS**: Generated at `/feed.xml` via `src/pages/feed.xml.ts` using `@astrojs/rss`.

## Deployment

Netlify with config in `netlify.toml`. Includes aggressive caching headers for fonts and `_astro/` assets, plus Bridgy federation redirects for `.well-known` endpoints.
