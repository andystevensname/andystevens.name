import { signRequest } from '../../src/lib/crypto.mjs';
import { listFollowers } from '../../src/lib/storage.mjs';
import {
  config,
  buildFromManifestItem,
  buildLikeActivity,
} from '../../src/lib/activitypub.mjs';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// POST /api/deliver
// Headers: Authorization: Bearer <AP_DELIVER_SECRET>
// Body:    { "slug": "my-post-slug", "collection": "articles" }
//
// Specify `collection` to disambiguate when the same slug appears in more
// than one collection.

export default async (request) => {
  if (request.method !== 'POST') {
    return new Response('method not allowed', { status: 405 });
  }

  const auth = request.headers.get('authorization') || '';
  const expected = `Bearer ${process.env.AP_DELIVER_SECRET}`;
  if (!process.env.AP_DELIVER_SECRET || auth !== expected) {
    return new Response('unauthorized', { status: 401 });
  }

  const { slug, collection } = await request.json();
  if (!slug) return new Response('missing slug', { status: 400 });

  const c = config();
  const here = dirname(fileURLToPath(import.meta.url));
  const posts = JSON.parse(
    await readFile(join(here, '..', '..', 'data', 'posts.json'), 'utf8')
  );

  const item = posts.find(
    (p) => p.slug === slug && (!collection || p.collection === collection)
  );
  if (!item) {
    return new Response('post not found in manifest', { status: 404 });
  }

  // Build the activity appropriate to the item's AP type
  let activity;
  if (item.apType === 'Like') {
    const targetId = await resolveToActivityPubId(item.likeTarget);
    if (!targetId) {
      return new Response(
        JSON.stringify({
          error: 'like target not resolvable to ActivityPub',
          target: item.likeTarget,
          hint: 'This URL does not appear to be a fediverse post. Likes can only federate to fediverse targets.',
        }),
        { status: 422, headers: { 'Content-Type': 'application/json' } }
      );
    }
    activity = buildLikeActivity(item, targetId);
  } else {
    activity = buildFromManifestItem(item).activity;
  }

  if (!activity) {
    return new Response('unable to build activity for this item', {
      status: 500,
    });
  }

  // Delivery targets: Creates fan out to all followers (dedup by sharedInbox).
  // Likes go only to the target author's inbox.
  let targetInboxes;
  if (item.apType === 'Like') {
    const authorInbox = await resolveAuthorInbox(item.likeTarget);
    if (!authorInbox) {
      return new Response('could not resolve target author inbox', {
        status: 422,
      });
    }
    targetInboxes = [authorInbox];
  } else {
    const followers = await listFollowers();
    const inboxes = new Set();
    for (const f of followers) {
      inboxes.add(f.sharedInbox || f.inbox);
    }
    targetInboxes = [...inboxes];
  }

  const body = JSON.stringify(activity);
  const results = await Promise.allSettled(
    targetInboxes.map(async (inbox) => {
      const headers = signRequest({
        url: inbox,
        body,
        privateKey: c.privateKey,
        keyId: c.keyId,
      });
      const res = await fetch(inbox, { method: 'POST', headers, body });
      const responseBody = await res.text().catch(() => '');
      if (res.status >= 300) {
        console.warn(`deliver ${inbox} → ${res.status}: ${responseBody.slice(0, 500)}`);
      }
      return { inbox, status: res.status, body: responseBody.slice(0, 500) };
    })
  );

  const succeeded = results.filter(
    (r) => r.status === 'fulfilled' && r.value.status < 300
  ).length;
  const failed = results.length - succeeded;

  const failures = results
    .map((r) => (r.status === 'fulfilled' ? r.value : { error: String(r.reason) }))
    .filter((r) => r.error || r.status >= 300);

  return new Response(
    JSON.stringify({
      type: item.apType,
      collection: item.collection,
      slug: item.slug,
      delivered: succeeded,
      failed,
      total: results.length,
      failures,
    }),
    { headers: { 'Content-Type': 'application/json' } }
  );
};

// Given an external URL, try to resolve it to an ActivityPub object ID.
async function resolveToActivityPubId(url) {
  try {
    const apRes = await fetch(url, {
      headers: { Accept: 'application/activity+json' },
      redirect: 'follow',
    });
    if (apRes.ok) {
      const ct = apRes.headers.get('content-type') || '';
      if (ct.includes('activity+json') || ct.includes('ld+json')) {
        const obj = await apRes.json();
        if (obj.id) return obj.id;
      } else if (ct.includes('text/html')) {
        const html = await apRes.text();
        const match = html.match(
          /<link[^>]+rel=["']alternate["'][^>]+type=["']application\/activity\+json["'][^>]+href=["']([^"']+)["']/i
        );
        if (match) return match[1];
        const match2 = html.match(
          /<link[^>]+href=["']([^"']+)["'][^>]+type=["']application\/activity\+json["']/i
        );
        if (match2) return match2[1];
      }
    }
  } catch (e) {
    console.error('resolveToActivityPubId failed:', e.message);
  }
  return null;
}

async function resolveAuthorInbox(url) {
  const apId = await resolveToActivityPubId(url);
  if (!apId) return null;

  try {
    const res = await fetch(apId, {
      headers: { Accept: 'application/activity+json' },
    });
    if (!res.ok) return null;
    const obj = await res.json();

    const actorUrl =
      typeof obj.attributedTo === 'string'
        ? obj.attributedTo
        : Array.isArray(obj.attributedTo)
          ? obj.attributedTo[0]
          : obj.attributedTo?.id;
    if (!actorUrl) return null;

    const actorRes = await fetch(actorUrl, {
      headers: { Accept: 'application/activity+json' },
    });
    if (!actorRes.ok) return null;
    const actor = await actorRes.json();
    return actor.endpoints?.sharedInbox || actor.inbox || null;
  } catch (e) {
    console.error('resolveAuthorInbox failed:', e.message);
    return null;
  }
}
