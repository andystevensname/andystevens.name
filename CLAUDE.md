# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Personal website for andystevens.name built with Astro 7. Static-only output with no client-side JavaScript framework. Built and deployed by a Forgejo Action (`.forgejo/workflows/build.yaml`) to Bunny Storage + CDN. Strong emphasis on performance (inlined CSS, subset fonts, no CSS framework) and IndieWeb standards (microformats, WebMention, Micropub, self-hosted ActivityPub).

## Commands

- **Dev server**: `npm run dev` (background daemon; `npm run dev:logs` to follow, `npm run dev:stop` to stop, `npm run dev:fg` for foreground)
- **Build**: `npm run build` (outputs to `dist/`)
- **Preview build**: `npm run preview`
- **Format**: `npx prettier --write .`

No test or lint scripts are configured. `npx astro check` is the type gate and should stay at 0 errors.

`npm run build` needs `AP_DOMAIN` and `AP_USERNAME` in the environment — `scripts/generate-static-ap.mjs` is a plain Node script and reads `process.env`, so `.env` does not reach it. Both values are public (they appear in the federated actor). CI uses placeholders; a local build with placeholders must not be deployed, since it writes an actor pointing at the wrong domain.

**Remark plugin cache**: Astro caches compiled markdown in `.astro/data-store.json`. After changing a remark plugin, delete this file and restart the dev server to see changes.

## Architecture

**Content collections** are defined in `src/content.config.ts` — eleven of them: `articles`, `pages`, `bookmarks`, `likes`, `notes`, `photos`, `replies`, `writing`, `awards`, `albums`, `code`. Each has its own directory under `src/content/` and its own `[slug].astro` route. There is no `blog` collection; `/blog` is a redirect to `/articles/`.

**Routing**: File-based via `src/pages/`, one `[slug].astro` per collection.

**Layout**: Single `Layout.astro` wraps all pages. It handles meta tags, Open Graph, IndieWeb microformats (h-card, h-feed, h-entry), and WebMention endpoints. Props: title, description, extraHead, canonical, ogType. It also mounts Astro's `ClientRouter` — see the CSP note below, which that choice constrains.

**Styling**: All CSS lives in `src/styles/global.css` — pure custom CSS, no framework. Dark mode via `html.dark` class with localStorage persistence. Stylesheets are inlined at build time (`inlineStylesheets: 'always'` in `astro.config.mjs`), which is why each page's CSP carries a style hash.

**Animation**: Custom SVG animation system in `src/lib/animation/` (TypeScript modules, no third-party libraries). Used on the homepage via `Animation.astro`.

**Feeds** live in `src/lib/feeds/` and share one `FeedItem` model across every output format:

- `sources.mjs` — the registry: which collections appear in which feed
- `load.mjs` — Astro-side loader (`getCollection`), used by the page endpoints
- `from-manifest.mjs` — Node-side loader, reads `data/posts.json`, used by build scripts
- `renderers/` — `rss`, `json-feed`, `gemtext`, `gopher`, `markdown`

`/feed.xml` and `/feed.json` are page endpoints. `scripts/generate-feeds.mjs` runs after the build and writes `dist-gemini/` (Gemini capsule), `dist-gopher/` (Gopher menus) and `dist/{collection}/{slug}.md` (raw source, advertised via `<link rel="alternate" type="text/markdown">`).

`src/lib/feed.ts` is a different thing despite the similar name: it maps collections for the **HTML** pages (`FeedList`, index pages), not for the syndicated feeds.

Note the `.mjs` files are imported from `.ts` endpoints **with the extension** (`../lib/feeds/load.mjs`). Vite resolves extensionless imports; TypeScript does not, and omitting it breaks `astro check` while the build still passes.

## Things that will bite you

**The CSP must be identical on every page.** `add-csp.mjs` injects a `<meta>` policy containing SHA-256 hashes of each page's inline `<style>`/`<script>`. Because `ClientRouter` swaps a new body into the existing document, the CSP that stays in force is the one from the page the visitor *landed* on — a `<meta>` arriving in swapped-in markup cannot replace it. Per-page hash sets therefore blank the page on any click to a page whose inline CSS differs. The policy is a union of every hash in the build for exactly this reason. Do not "tighten" it back to per-page.

**Apex edge config lives in `edge-rules.mjs`**, reconciled onto the pull zone by `scripts/sync-edge-rules.mjs` on each deploy. It holds the `/feed`, `/feed/`, `/index.xml`, `/feed/index.xml` → `/feed.xml` redirects (restored after being lost with `netlify.toml`), the `/blog` → `/articles/` redirect, and the long browser cache for `/_astro/*` and `/fonts/*`.

These **cannot** go in `edge-script/main.mjs`. That script is bound to `ap.andystevens.name`; the apex goes Pull Zone → Storage and never reaches it. Rules the zone has that nothing declares (COOP, SSL, the security-header CSP, the b-cdn.net block) are reported and left alone by the sync.

**Cache-control is deliberately split.** HTML is `max-age=0` so browsers revalidate; `/_astro/*` and `/fonts/*` are a year via the edge rule. The zone is set to *Respect origin Cache-Control* for the edge and an explicit browser expiration. Raising the HTML value means content updates stop reaching returning readers — a 30-day value previously hid a deployed fix for exactly that long.

**The service worker serves documents network-first with forced revalidation** (`public/sw.js`). Only `/_astro/*`, `/fonts/*` and cross-origin media are cache-first. `ClientRouter` fetches pages with a plain `fetch()`, so anything cache-first there serves stale HTML on every clicked link. Navigation preload is disabled on purpose — it would bypass that revalidation. **Re-enable on or after 2026-10-09**, once the last HTML cached under the old 30-day `max-age` has expired; `public/sw.js` carries the reasoning and the outside date.

## Deployment

Forgejo Action on push to `main` (`.forgejo/workflows/build.yaml`, runner on emily): builds the site, generates the text-protocol feeds, syncs `dist/` to Bunny Storage (`scripts/deploy-to-bunny.mjs`), deploys the Edge Script, syncs the edge rules, **purges the Bunny pull zone** (`scripts/purge-bunny-cache.mjs`), builds and pushes the gemini and gopher container images, redeploys them on Bunny Magic Containers, then runs webmention/Bluesky/ActivityPub/push-notification delivery runner-side.

`deploy-to-bunny.mjs` skips files whose SHA256 already matches, and re-uploads when a file's stored `Content-Type` does not match the override it should have — Content-Type is not covered by the checksum, so adding an override otherwise never reaches existing files.

Steps that depend on unset config are guarded on a repository **variable** and skip silently. Forgejo keeps `vars.` and `secrets.` in separate namespaces: a value put in the wrong one reads as empty and the step disappears with no error.

Gemini (`gemini.andystevens.name:1965`) and Gopher (`gopher.andystevens.name:70`) are containers on Bunny Magic Containers, currently in the same app — a crash loop in one takes the other down. Agate's certs live on a volume mounted at `/certs`, with agate pointed at `/certs/live`: a Bunny volume is ext4, so `lost+found` at the mount root is read as a hostname directory and agate refuses to start.

Posting paths: Sveltia CMS at `/admin/` (browser -> Forgejo API) and the Micropub shim at `micropub.stormfield.house` (the `/post/` bookmarklet page; babylon repo, `micropub` stack). Both are LAN/tailnet-only.
