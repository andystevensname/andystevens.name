# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Personal website for andystevens.name built with Astro 5. Static-only output with no client-side JavaScript framework. Built and deployed by a Forgejo Action (`.forgejo/workflows/build.yaml`) to Bunny Storage + CDN. Strong emphasis on performance (inlined CSS, subset fonts, no CSS framework) and IndieWeb standards (microformats, WebMention, Micropub, self-hosted ActivityPub).

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

**RSS**: Generated at `/feed.xml` via `src/pages/feed.xml.ts` using `@astrojs/rss`. Item mapping is in `src/lib/feed.ts`. Each post type has a `mapX()` function — all must set `bodyHtml: renderBody(body)` for outbound webmention sending to work. The feed uses `content` (not `'content:encoded'`) as the item field name for `@astrojs/rss`. Redirects from `/feed`, `/index.xml`, and `/feed/index.xml` to `/feed.xml` are handled by the Bunny Edge Script (`edge-script/main.mjs`) to support go-jamming's feed discovery.

## Deployment

Forgejo Action on push to `main` (`.forgejo/workflows/build.yaml`, runner on emily): builds the site, syncs `dist/` to Bunny Storage (`scripts/deploy-to-bunny.mjs`), deploys the Edge Script, **purges the Bunny pull zone** (`scripts/purge-bunny-cache.mjs` — pages carry a 30-day max-age, so a missed purge means stale content), then runs webmention/Bluesky/ActivityPub/push-notification delivery runner-side. Posting paths: Sveltia CMS at `/admin/` (browser -> Forgejo API) and the Micropub shim at `micropub.stormfield.house` (the `/post/` bookmarklet page; babylon repo, `micropub` stack). Both are LAN/tailnet-only.
