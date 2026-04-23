// Storage layer. Single implementation lives here; the rest of the code
// only ever imports these named functions. To move off Netlify, replace
// this file with a Turso/Supabase/SQLite version that exports the same API.
//
// Data model (all JSON values):
//   followers/{urlencoded-actor-url}  -> { actor, inbox, sharedInbox?, followedAt }
//   activities/{activity-id-hash}     -> original inbound activity (idempotency + audit)

import { getStore } from '@netlify/blobs';
import { createHash } from 'node:crypto';

const FOLLOWERS = 'activitypub-followers';
const ACTIVITIES = 'activitypub-activities';

function hashId(id) {
  return createHash('sha256').update(id).digest('hex').slice(0, 32);
}

export async function addFollower(actor, inbox, sharedInbox) {
  const store = getStore({ name: FOLLOWERS, consistency: 'strong' });
  await store.setJSON(hashId(actor), {
    actor,
    inbox,
    sharedInbox,
    followedAt: new Date().toISOString(),
  });
}

export async function removeFollower(actor) {
  const store = getStore({ name: FOLLOWERS, consistency: 'strong' });
  await store.delete(hashId(actor));
}

export async function hasFollower(actor) {
  const store = getStore({ name: FOLLOWERS, consistency: 'strong' });
  const data = await store.get(hashId(actor), { type: 'json' });
  return data !== null;
}

export async function listFollowers() {
  const store = getStore({ name: FOLLOWERS });
  const { blobs } = await store.list();
  const followers = await Promise.all(
    blobs.map((b) => store.get(b.key, { type: 'json' }))
  );
  return followers.filter(Boolean);
}

export async function recordActivity(id, json) {
  const store = getStore({ name: ACTIVITIES });
  await store.setJSON(hashId(id), json);
}

export async function getActivity(id) {
  const store = getStore({ name: ACTIVITIES });
  return await store.get(hashId(id), { type: 'json' });
}
