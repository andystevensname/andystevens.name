// Apex edge configuration, applied to the pull zone as Bunny Edge Rules by
// scripts/sync-edge-rules.mjs.
//
// These live in the repo deliberately. The previous set lived in
// netlify.toml, added in 4cb5117 and deleted with that file during the
// Netlify retirement (0e5d602) — /feed, /index.xml and /feed/index.xml
// have 404'd ever since, while CLAUDE.md went on describing them as
// working. An edge rule created only in the dashboard has exactly the same
// failure mode: nothing records it, so nothing notices when it goes.
//
// They cannot live in edge-script/main.mjs. That script is bound to
// ap.andystevens.name; these are apex paths, and the apex goes Pull Zone →
// Storage without ever reaching the script.

export const HOST = 'andystevens.name';

export const redirects = [
  {
    // The three 301s from 4cb5117, restored. '/feed/' is new — it 404s the
    // same way and readers do ask for it.
    description: 'feed aliases -> /feed.xml',
    from: ['/feed', '/feed/', '/index.xml', '/feed/index.xml'],
    to: `https://${HOST}/feed.xml`,
    status: 301,
  },
  {
    // Replaces the Astro `redirects:` entry, which emits a 200 meta-refresh
    // stub rather than a redirect. That stub is also the one page in the
    // build with no <meta charset>, so add-csp skips it and /blog ships
    // with no CSP at all. Remove the astro.config entry once this is live.
    description: '/blog -> /articles/',
    from: ['/blog', '/blog/'],
    to: `https://${HOST}/articles/`,
    status: 301,
  },
];

// ── browser caching ──────────────────────────────────────────────────────
//
// The pull zone tells browsers to cache EVERYTHING for 30 days:
//
//   cache-control: public, max-age=2592000
//
// on HTML and on fingerprinted assets alike. For /_astro/* that is right —
// the filename changes when the content does. For HTML it means a returning
// reader keeps a month-old page: the CDN purge on each deploy clears Bunny's
// edges but cannot reach a browser cache. That is why the CSP fix appeared
// not to work — the browser was still showing pre-fix HTML, blocked by its
// own stale policy, while curl saw the corrected page.
//
// So the zone default becomes short (see readme: Browser Cache Expiration)
// and the fingerprinted paths get their long life back explicitly here.
export const browserCache = [
  {
    description: 'immutable assets - long browser cache',
    paths: ['/_astro/*', '/fonts/*'],
    seconds: 31536000, // 1 year; these URLs are content-addressed
  },
];
