import { signRequest } from '../../src/lib/crypto.mjs';
import { listFollowers } from '../../src/lib/storage.mjs';
import {
  config,
  buildNote,
  buildCreateActivity,
} from '../../src/lib/activitypub.mjs';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// POST /api/deliver
// Headers: Authorization: Bearer <AP_DELIVER_SECRET>
// Body: { "slug": "my-post-slug" }
//
// Fan-out delivery. For small follower counts (<500) this fits comfortably
// in a 10s function. For larger counts, move to a background function
// (rename to deliver-background.mjs and it'll have 15min timeout) or queue.

export default async (request) => {
  if (request.method !== 'POST') {
    return new Response('method not allowed', { status: 405 });
  }

  // Shared-secret auth so randos can't force-deliver
  const auth = request.headers.get('authorization') || '';
  const expected = `Bearer ${process.env.AP_DELIVER_SECRET}`;
  if (!process.env.AP_DELIVER_SECRET || auth !== expected) {
    return new Response('unauthorized', { status: 401 });
  }

  const { slug } = await request.json();
  if (!slug) return new Response('missing slug', { status: 400 });

  const c = config();
  const here = dirname(fileURLToPath(import.meta.url));
  const posts = JSON.parse(
    await readFile(join(here, '..', '..', 'data', 'posts.json'), 'utf8')
  );
  const post = posts.find((p) => p.slug === slug);
  if (!post) return new Response('post not found', { status: 404 });

  const note = buildNote(post);
  const activity = buildCreateActivity(note);

  const followers = await listFollowers();
  // Dedupe by shared inbox where available - Mastodon instances accept one
  // delivery to their shared inbox instead of N to each user's personal inbox.
  const inboxes = new Set();
  for (const f of followers) {
    inboxes.add(f.sharedInbox || f.inbox);
  }

  const body = JSON.stringify(activity);
  const results = await Promise.allSettled(
    [...inboxes].map(async (inbox) => {
      const headers = signRequest({
        url: inbox,
        body,
        privateKey: c.privateKey,
        keyId: c.keyId,
      });
      const res = await fetch(inbox, { method: 'POST', headers, body });
      return { inbox, status: res.status };
    })
  );

  const succeeded = results.filter(
    (r) => r.status === 'fulfilled' && r.value.status < 300
  ).length;
  const failed = results.length - succeeded;

  return new Response(
    JSON.stringify({
      delivered: succeeded,
      failed,
      total: results.length,
    }),
    { headers: { 'Content-Type': 'application/json' } }
  );
};
