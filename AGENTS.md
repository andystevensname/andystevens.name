# AGENTS.md

Design and development conventions for this site. Follow these when making changes.

## Spacing

8pt grid system with a 16px base font size. Use increments of 0.5rem (8px) for margins, padding, and gaps. Vertical rhythm is maintained through consistent bottom-only margins (typically 1rem or 1.5rem) — do not use top margins on text or feed elements. This site does not use a baseline grid.

## Colors

Material Design color palette (https://materialui.co/colors). Key values are defined as CSS custom properties in `:root`:

- `--c-gray` (#212121) — primary text, borders
- `--c-gray-light` (#757575) — secondary text, timestamps
- `--c-gray-lighter` (#E0E0E0) — dividers
- `--c-accent` (#039BE5) — links, interactive elements

Content type icons use Material 600-weight colors: red (#E53935) for likes, blue (#1E88E5) for bookmarks, amber (#FFA000) for notes, green (#43A047) for replies, purple (#8E24AA) for photos. Articles inherit text color.

## CSS

All styles live in `src/styles/global.css` — pure CSS, no framework. Stylesheets are inlined at build time via `astro.config.mjs` for performance. Dark mode is handled with `html.dark` class and localStorage persistence.

Use bottom-only margins (`margin: 0 0 Xrem 0` or `margin-bottom`) for all block elements. Do not double-space with top-and-bottom margins.

## HTML

Use semantic HTML elements: `<main>`, `<section>`, `<article>`, `<nav>`, `<header>`, `<footer>`. CSS class names should be descriptive and not page-specific (e.g. `.site-layout` not `.homepage-layout`). Purely decorative elements (like the animation sidebar) should use `<div aria-hidden="true">` instead of semantic elements like `<aside>`.

## IndieWeb

This site follows IndieWeb conventions:

- **Microformats2**: h-card (representative, visually hidden), h-feed on listing pages, h-entry on individual posts. Use appropriate properties: `p-name`, `u-url`, `u-uid`, `dt-published`, `e-content`, `p-summary`, `p-author`, `p-category`.
- **Post types**: article, note, bookmark (`u-bookmark-of`), like (`u-like-of`), photo (`u-photo`), reply (`u-in-reply-to`). Each has a content collection in `src/content/` and routes under `src/pages/`.
- **Endpoints**: Micropub, authorization, and token endpoints via Indiekit at `ik.andystevens.name`. WebMention endpoint at `webmention.andystevens.name`.
- **Bridgy**: Federation redirects for `.well-known` endpoints configured in `netlify.toml`.
- **Webmention sending**: Triggered via Netlify `onSuccess` plugin (`netlify/plugins/send-webmentions`), which calls go-jamming via `PUT https://webmention.andystevens.name/webmention/andystevens.name/{GO_JAMMING_TOKEN}`. Go-jamming discovers the feed via `/feed` (redirects to `/feed.xml`). The RSS feed must include `content:encoded` (via the `content` field in `@astrojs/rss` items) for go-jamming to find outbound links.
- **Bluesky syndication**: Triggered via Netlify `onSuccess` plugin (`netlify/plugins/post-to-bluesky`). Reads `feed.xml`, finds items published in the last 10 minutes, posts via AT Protocol. Requires `BLUESKY_HANDLE` and `BLUESKY_APP_PASSWORD` Netlify env vars.
- **Indiekit server**: Running at `ik.andystevens.name` on a Linode VPS (`ssh indiekit`). Managed via PM2. Config in `~/indiekit/package.json`. Requires MongoDB running locally on the VPS — connection string set as `MONGODB_URL` in `~/indiekit/.env`. Article posts save to `src/content/articles/{slug}.md` with URL `articles/{slug}/`.

## Astro Features

- **Content Collections** with glob loaders and Zod schemas (`src/content/config.ts`)
- **View Transitions** via `ClientRouter` in Layout.astro for client-side navigation without full page reloads
- **`transition:persist="sidebar"`** on the animation sidebar to preserve it across page navigations
- **`astro:page-load`** event for re-binding DOM event listeners after view transitions
- **CSS inlining** at build time (configured in `astro.config.mjs`)
- **`is:inline`** scripts for anti-FOUC theme application before paint
- **Remark plugins** (e.g. `remark-poem.mjs`) are loaded at startup. After changing a remark plugin, delete `.astro/data-store.json` and restart the dev server — Astro caches compiled markdown in this file and won't re-run plugins otherwise

## Fonts

Self-hosted, subset woff2 files in `public/fonts/`. Fjalla One for UI, Instrument Serif for the site title. Both use `font-display: optional` to avoid layout shift.

## Animation sidebar

The custom SVG animation in `src/lib/animation/` sequences three phases (beams → bars → gears) over a 12500ms cycle. Opacity sequencing is handled by the Web Animations API on group elements with staggered delays, while per-element jitter/movement is driven by a `requestAnimationFrame` tick loop. Both systems live in `src/components/Animation.astro`.

Two load-bearing details that fix Chrome/Firefox-specific bugs Safari happens to mask:

1. **Hide delayed groups with inline opacity before animating them.** Set `poetryGroup.style.opacity = '0'` and `gadgetsGroup.style.opacity = '0'` before calling `.animate()`. The inner bar and gear elements have non-zero native opacity (0.75 and 0.7), so during the Web Animation's "before" phase with the default `fill: 'none'`, those native opacities leak through and bars/gears flash visible before their phase starts. Only shows on the first cycle because `iterations: Infinity` keeps the animation in "active" phase forever afterwards. During the before phase the inline style wins; during the active phase the animation's keyframed value wins.

2. **Drive the JS tick by wall-clock time, not a per-rAF frame counter.** The tick computes `framePos` from `(now - cycleStart) % 12500`, not from a counter that increments once per `requestAnimationFrame` call. A naive frame counter assumes 60fps and completes a 750-frame cycle in 12.5s, but on a 120Hz display rAF fires twice as fast and the counter completes its cycle in ~6.25s, desyncing from the Web Animations. Symptoms of the drift: bars fade in and out but never jitter (JS poetry phase runs while bars are still invisible), beams freeze ~2s before their fade-out, and beams appear to vanish cycle-by-cycle because their per-cycle update windows fall outside the visible window. Safari's rAF appears to be throttled to 60Hz regardless of panel refresh rate, which is why it doesn't expose the bug.
