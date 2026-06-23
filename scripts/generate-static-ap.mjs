// Generate static AP documents on the apex domain (andystevens.name) into
// dist/: the webfinger discovery endpoint, the actor, and one object file
// per federatable post. These all have to be same-host as the actor — Bunny
// Pull Zones with Storage Zone origin block POSTs, so the *dynamic* endpoints
// (inbox, followers, push) run on a separate subdomain, but anything static
// and identity-bearing lives here. The actor JSON advertises the subdomain
// URLs for those dynamic endpoints via AP_DYNAMIC_BASE (see activitypub.mjs).
//
// Objects specifically MUST be on the apex: Mastodon rejects a status whose
// id host differs from its author's host, so an object served from the
// subdomain federates as "delivered but invisible". buildFromManifestItem now
// builds object ids on the apex; this emits the matching files.
//
// Runs after `astro build` + copy-manifest (in the workflow), before
// deploy-to-bunny — so data/posts.json exists by now.

import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import {
  buildActor,
  buildWebFinger,
  buildFromManifestItem,
  config,
} from '../src/lib/activitypub.mjs';
import { loadManifest } from '../src/lib/manifest.mjs';
import { federatable } from '../src/lib/post-sources.mjs';

const c = config(); // fails loudly if env vars are missing

const actor = buildActor();
const webfinger = buildWebFinger(`acct:${c.username}@${c.domain}`);
if (!webfinger) {
  throw new Error('buildWebFinger returned null for our own user');
}

await mkdir('dist/.well-known', { recursive: true });
await mkdir('dist/ap', { recursive: true });

await writeFile(
  'dist/.well-known/webfinger',
  JSON.stringify(webfinger),
  'utf8'
);
await writeFile('dist/ap/actor', JSON.stringify(actor), 'utf8');

// Per-post object files at /ap/objects/<collection>/<slug> (apex host).
let objectCount = 0;
try {
  const posts = await loadManifest();
  for (const item of posts.filter(federatable)) {
    const { object } = buildFromManifestItem(item);
    // Likes carry no local object (a native Like targets the remote object's
    // id; the rare HTML-fallback Note is built at delivery time).
    if (!object) continue;
    const path = `dist/ap/objects/${item.collection}/${item.slug}`;
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, JSON.stringify(object), 'utf8');
    objectCount++;
  }
} catch (e) {
  console.warn('Static AP objects: skipped (manifest unavailable):', e.message);
}

console.log(
  `Generated static AP: dist/.well-known/webfinger, dist/ap/actor, ${objectCount} object(s)`
);
