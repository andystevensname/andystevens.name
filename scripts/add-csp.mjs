// Post-build: inject a per-page Content-Security-Policy <meta> into every
// built HTML file.
//
// Why a meta tag rather than a header on the pull zone: the policy has to
// carry SHA-256 hashes of this build's inline <style> and <script> blocks,
// and those change whenever the inlined CSS or the Layout scripts change.
// A header configured on the Bunny pull zone lives outside the deployed
// artifact, so between the storage upload and a config update the edges can
// serve HTML whose hashes do not match the live policy — which blanks every
// page until it settles. Shipping the policy inside the same HTML it
// describes makes that desync impossible.
//
// The directives a meta tag cannot express — frame-ancestors, report-uri —
// are set once as a Bunny Edge Rule instead. Those never change, so they do
// not have the sync problem that pushed the rest in here.
//
// Astro's own inline scripts (the theme/FOUC guard, the service worker
// registration, and small bundled modules) are what make this necessary;
// there are no inline event handlers anywhere, so no 'unsafe-inline' for
// scripts is needed.

import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';

const DIST = 'dist';

// Origins the browser actually contacts at runtime. media/ webmention are
// hard-coded in the source; the ActivityPub base is inlined at build time
// from PUBLIC_AP_BASE (push subscribe/unsubscribe POST there), so read it
// from the same env the build used rather than duplicating the hostname.
const MEDIA = 'https://media.andystevens.name';
const WEBMENTION = 'https://webmention.andystevens.name';
const AP_BASE = (process.env.PUBLIC_AP_BASE || '').trim().replace(/\/+$/, '');

// Sveltia CMS talks to Forgejo, and applies styles by injecting <style>
// elements at runtime — style-src-elem, which a hash cannot cover. Scoped to
// /admin/ so the rest of the site keeps the strict policy. The bundle
// contains no eval() and no new Function(), so it needs no 'unsafe-eval'.
const CMS_BACKEND = 'https://git.stormfield.house';

// Sveltia pulls its UI webfonts from jsDelivr at runtime. Without this the
// admin renders in fallback faces. It also probes unpkg for its own latest
// version on load; that stays blocked — this CMS is self-hosted precisely to
// avoid depending on a public CDN, and a failed version check is cosmetic.
// If it ever turns out to be load-bearing, add it to the connect list here.
const CMS_FONTS = 'https://cdn.jsdelivr.net';

const sha256 = (source) =>
  `'sha256-${createHash('sha256').update(source, 'utf8').digest('base64')}'`;

// Browsers that understand hashes IGNORE 'unsafe-inline' when a hash is
// present in the same directive, so this is a no-op for them. It only takes
// effect on pre-CSP2 browsers, which would otherwise block every inline
// block and render the page unstyled with no theme guard. Lighthouse
// recommends it for that reason.
//
// Guarded on the list being non-empty, which matters: with no hashes there
// is nothing to suppress it and 'unsafe-inline' would genuinely apply.
// /admin/ has no inline scripts at all, so its script-src must not get it.
const withLegacyFallback = (hashes) =>
  hashes.length ? `${hashes.join(' ')} 'unsafe-inline'` : '';

// Only executable scripts need a hash. application/ld+json is data, is never
// executed, and browsers do not enforce script-src on it — verified against
// the built pages, which carry ld+json and pass with no hash for it.
function inlineHashes(html) {
  const styles = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]);
  const scripts = [...html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)]
    .filter(([, attrs, body]) => !/\ssrc=/.test(attrs) && !/ld\+json/.test(attrs) && body.trim())
    .map(([, , body]) => body);
  return {
    style: [...new Set(styles.map(sha256))],
    script: [...new Set(scripts.map(sha256))],
  };
}

function policyFor(html, isAdmin) {
  const { style, script } = inlineHashes(html);
  const connect = ["'self'", WEBMENTION, MEDIA];
  if (AP_BASE) connect.push(AP_BASE);
  // The CMS fetches data: URIs for embedded UI assets and previews uploads
  // as blob: URLs. /admin/ is a single-user authoring surface behind the
  // Forgejo login, so it gets the headroom an editor needs while the public
  // site keeps the strict policy.
  if (isAdmin) connect.push(CMS_BACKEND, 'data:', 'blob:');

  const directives = [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "form-action 'self'",
    `script-src 'self' ${withLegacyFallback(script)}`.trim(),
    // style-src-attr stays 'unsafe-inline': Shiki emits per-token colour
    // style="" attributes that change with every code sample, so hashing
    // them would break on unrelated content edits. Style attributes cannot
    // execute script.
    isAdmin ? "style-src 'self' 'unsafe-inline'" : `style-src 'self' ${withLegacyFallback(style)}`.trim(),
    "style-src-attr 'unsafe-inline'",
    isAdmin ? `img-src 'self' data: blob: ${MEDIA}` : `img-src 'self' data: ${MEDIA}`,
    isAdmin ? `font-src 'self' ${CMS_FONTS}` : "font-src 'self'",
    `connect-src ${connect.join(' ')}`,
    // The CMS generates its own web app manifest as a blob: URL at runtime.
    isAdmin ? "manifest-src 'self' blob:" : "manifest-src 'self'",
    "worker-src 'self'",
  ];
  return directives.join('; ');
}

async function* htmlFiles(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) yield* htmlFiles(full);
    else if (entry.name.endsWith('.html')) yield full;
  }
}

let patched = 0;
for await (const file of htmlFiles(DIST)) {
  const html = await readFile(file, 'utf8');
  if (html.includes('http-equiv="Content-Security-Policy"')) continue;

  const isAdmin = relative(DIST, file).split(sep)[0] === 'admin';
  const meta = `<meta http-equiv="Content-Security-Policy" content="${policyFor(html, isAdmin)}">`;

  // Must sit before the first inline <style>/<script> to govern it, and
  // after <meta charset> so the charset stays inside the first 1024 bytes.
  const charset = html.match(/<meta[^>]+charset[^>]*>/i);
  if (!charset) {
    console.error(`add-csp: no <meta charset> in ${file} — skipped`);
    continue;
  }
  const at = charset.index + charset[0].length;
  await writeFile(file, html.slice(0, at) + meta + html.slice(at));
  patched += 1;
}

console.log(`CSP: injected into ${patched} page(s)${AP_BASE ? '' : ' (PUBLIC_AP_BASE unset — push endpoints omitted from connect-src)'}`);
