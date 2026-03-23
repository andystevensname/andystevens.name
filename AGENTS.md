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

## Astro Features

- **Content Collections** with glob loaders and Zod schemas (`src/content/config.ts`)
- **View Transitions** via `ClientRouter` in Layout.astro for client-side navigation without full page reloads
- **`transition:persist="sidebar"`** on the animation sidebar to preserve it across page navigations
- **`astro:page-load`** event for re-binding DOM event listeners after view transitions
- **CSS inlining** at build time (configured in `astro.config.mjs`)
- **`is:inline`** scripts for anti-FOUC theme application before paint

## Fonts

Self-hosted, subset woff2 files in `public/fonts/`. Fjalla One for UI, Instrument Serif for the site title. Both use `font-display: optional` to avoid layout shift.
