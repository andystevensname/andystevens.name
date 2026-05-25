// Generate static /.well-known/webfinger and /ap/actor JSON files into
// dist/. The actor's canonical id and the webfinger discovery endpoint
// have to live on the apex domain (andystevens.name) — Bunny Pull Zones
// with Storage Zone origin block POST methods, so all the *dynamic*
// endpoints (inbox, outbox, etc.) run on a separate hostname. The actor
// JSON we ship here advertises those subdomain URLs via the
// AP_DYNAMIC_BASE env var (see src/lib/activitypub.mjs).
//
// Runs after `astro build` (in the workflow), before deploy-to-bunny.

import { mkdir, writeFile } from 'node:fs/promises';
import { buildActor, buildWebFinger, config } from '../src/lib/activitypub.mjs';

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

console.log('Generated static AP: dist/.well-known/webfinger, dist/ap/actor');
