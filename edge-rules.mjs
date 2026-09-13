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
// The zone currently tells browsers:
//
//   HTML                    max-age=2592000    30 days
//   /_astro/*, /fonts/*     max-age=25600000   ~296 days
//
// Neither comes from an edge rule — both are zone settings. 296 days for
// content-addressed assets is right; 30 days for HTML means a returning
// reader keeps a month-old page, because the CDN purge on each deploy
// clears Bunny's edges and cannot reach a browser cache. That is why the
// CSP fix appeared not to work, and it is also why a new post does not
// reach a returning visitor for up to a month.
//
// Fixing that means dropping the zone's Browser Cache Expiration so HTML
// revalidates — which would take the assets down with it, since the same
// setting covers both. So the assets get their long life restated here as
// an explicit rule FIRST, and only then is the zone default lowered.
// Merging this before changing the setting is the whole point of the
// ordering; see the readme note.
export const browserCache = [
  {
    description: 'immutable assets - long browser cache',
    paths: ['/_astro/*', '/fonts/*'],
    seconds: 31536000, // 1 year; these URLs are content-addressed
  },
];

// ── response security headers ──────────────────────────────────────────────
//
// These four headers were live on every response but existed ONLY as
// hand-made dashboard edge rules — the "reported and left alone" set the
// sync used to skip. That is the same failure mode as the lost feed
// redirects: nothing recorded them, and nothing noticed when the COOP one
// broke the CMS. So they are declared here and reconciled like everything
// else. (The zone's ForceSSL and b-cdn.net-block rules set no response
// header and stay hand-managed; the sync still leaves those alone.)
//
// The header-level CSP carries only what a <meta> tag cannot: frame-ancestors
// is ignored in meta, so it must be a header. The full per-page policy is the
// <meta> injected by add-csp.mjs; the two are enforced together.
//
// COOP is the one that bit us. Sveltia's OAuth popup opens at /admin/,
// navigates cross-origin to Forgejo to authorize, then returns to
// /admin/?code=…. Any COOP but unsafe-none puts the returning popup in a new
// browsing-context group, which nulls window.opener — and Sveltia hands the
// token back via window.opener.postMessage, gated on
// window.opener.origin === location.origin. With opener null the gate fails
// and it restarts auth instead of exchanging the code: the login loop.
//
// So COOP is split by scope, and deliberately with NO overlap rather than a
// broad rule plus an /admin/ override: Bunny applies matching rules in order
// and a second SetResponseHeader for the same header would make the result
// depend on that order. MatchNone keeps the site rule off /admin/ entirely,
// so exactly one COOP rule matches any URL and order cannot matter.
const CSP_HEADER = "frame-ancestors 'none'; base-uri 'self'; object-src 'none'; form-action 'self'";

export const responseHeaders = [
  {
    description: 'security header: Content-Security-Policy',
    paths: ['/*'],
    name: 'Content-Security-Policy',
    value: CSP_HEADER,
  },
  {
    description: 'security header: X-Content-Type-Options',
    paths: ['/*'],
    name: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    description: 'security header: Referrer-Policy',
    paths: ['/*'],
    name: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  // Both COOP rules use the SAME path set so they are exact complements
  // whatever Bunny's `*` does at the zero-character boundary: '/admin' alone
  // covers the bare directory, '/admin/*' the page and its assets.
  {
    description: 'security header: Cross-Origin-Opener-Policy (off /admin)',
    paths: ['/admin', '/admin/*'],
    match: 'none', // every URL EXCEPT the CMS
    name: 'Cross-Origin-Opener-Policy',
    value: 'same-origin-allow-popups',
  },
  {
    description: 'security header: Cross-Origin-Opener-Policy on /admin (Sveltia OAuth needs window.opener)',
    paths: ['/admin', '/admin/*'],
    name: 'Cross-Origin-Opener-Policy',
    value: 'unsafe-none',
  },
];
