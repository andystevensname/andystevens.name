// Storage layer backed by a private Bunny Storage zone (JSON files).
//
// We landed on this after libsql / Bunny Edge Database Lite proved
// unreachable from inside Bunny Edge Scripts (fetch crashes with
// "Cannot read properties of undefined (reading 'loop')" against any
// *.bunnydb.net URL — appears to be a Bunny runtime bug). The Bunny
// Storage HTTP API is plain fetch and arch-independent.
//
// Same public surface as before (addFollower, listFollowers, etc.) —
// callers don't need to change.
//
// Data model (one file per key, hashed):
//   followers/{hash}.json     { actor, inbox, sharedInbox?, followedAt }
//   activities/{hash}.json    original inbound activity
//   push-subs/{hash}.json     { endpoint, keys, createdAt, ua? }
//   push-meta/{key}.json      JSON value
//
// Env required:
//   BUNNY_STATE_BUCKET_NAME   storage zone name
//   BUNNY_STATE_ACCESS_KEY    storage zone password (write+read)
//   BUNNY_STATE_REGION        region constant (NewYork etc.), defaults
//                             to Falkenstein

import { createHash } from 'node:crypto';

const REGION_HOST_PREFIX = {
  Falkenstein: '',
  London: 'uk.',
  NewYork: 'ny.',
  LosAngeles: 'la.',
  Singapore: 'sg.',
  Stockholm: 'se.',
  SaoPaulo: 'br.',
  Johannesburg: 'jh.',
  Sydney: 'syd.',
};

let _config;
function cfg() {
  if (_config) return _config;
  const region =
    process.env.BUNNY_STATE_REGION ||
    process.env.BUNNY_STORAGE_REGION ||
    'Falkenstein';
  const prefix = REGION_HOST_PREFIX[region] ?? '';
  const bucket = process.env.BUNNY_STATE_BUCKET_NAME;
  const accessKey = process.env.BUNNY_STATE_ACCESS_KEY;
  if (!bucket || !accessKey) {
    throw new Error(
      'BUNNY_STATE_BUCKET_NAME and BUNNY_STATE_ACCESS_KEY must be set'
    );
  }
  _config = {
    base: `https://${prefix}storage.bunnycdn.com/${bucket}`,
    accessKey,
  };
  return _config;
}

function hashId(id) {
  return createHash('sha256').update(id).digest('hex').slice(0, 32);
}

async function putJson(path, value) {
  const { base, accessKey } = cfg();
  const res = await fetch(`${base}/${path}`, {
    method: 'PUT',
    headers: {
      AccessKey: accessKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(value),
  });
  if (!res.ok) {
    throw new Error(
      `storage PUT ${path}: ${res.status} ${(await res.text()).slice(0, 200)}`
    );
  }
}

async function getJson(path) {
  const { base, accessKey } = cfg();
  const res = await fetch(`${base}/${path}`, {
    headers: { AccessKey: accessKey },
  });
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(
      `storage GET ${path}: ${res.status} ${(await res.text()).slice(0, 200)}`
    );
  }
  return res.json();
}

async function deletePath(path) {
  const { base, accessKey } = cfg();
  const res = await fetch(`${base}/${path}`, {
    method: 'DELETE',
    headers: { AccessKey: accessKey },
  });
  if (!res.ok && res.status !== 404) {
    throw new Error(
      `storage DELETE ${path}: ${res.status} ${(await res.text()).slice(0, 200)}`
    );
  }
}

async function listDir(prefix) {
  const { base, accessKey } = cfg();
  const res = await fetch(`${base}/${prefix}/`, {
    headers: { AccessKey: accessKey, Accept: 'application/json' },
  });
  if (res.status === 404) return [];
  if (!res.ok) {
    throw new Error(
      `storage LIST ${prefix}: ${res.status} ${(await res.text()).slice(0, 200)}`
    );
  }
  return res.json();
}

async function listJsonObjects(prefix) {
  const items = await listDir(prefix);
  const files = items.filter((i) => !i.IsDirectory);
  const results = await Promise.all(
    files.map((i) => getJson(`${prefix}/${i.ObjectName}`))
  );
  return results.filter(Boolean);
}

// ───── followers ────────────────────────────────────────────────────────

export async function addFollower(actor, inbox, sharedInbox) {
  await putJson(`followers/${hashId(actor)}.json`, {
    actor,
    inbox,
    sharedInbox: sharedInbox ?? null,
    followedAt: new Date().toISOString(),
  });
}

export async function removeFollower(actor) {
  await deletePath(`followers/${hashId(actor)}.json`);
}

export async function hasFollower(actor) {
  return (await getJson(`followers/${hashId(actor)}.json`)) !== null;
}

export async function listFollowers() {
  const rows = await listJsonObjects('followers');
  return rows.map((r) => ({
    actor: r.actor,
    inbox: r.inbox,
    sharedInbox: r.sharedInbox ?? undefined,
    followedAt: r.followedAt,
  }));
}

// ───── activities (idempotency + audit) ─────────────────────────────────

export async function recordActivity(id, json) {
  await putJson(`activities/${hashId(id)}.json`, json);
}

export async function getActivity(id) {
  return await getJson(`activities/${hashId(id)}.json`);
}

// ───── push subscriptions ───────────────────────────────────────────────

export async function addPushSubscription(subscription, ua) {
  await putJson(`push-subs/${hashId(subscription.endpoint)}.json`, {
    endpoint: subscription.endpoint,
    keys: subscription.keys,
    createdAt: new Date().toISOString(),
    ua: ua || null,
  });
}

export async function removePushSubscription(endpoint) {
  await deletePath(`push-subs/${hashId(endpoint)}.json`);
}

export async function listPushSubscriptions() {
  return await listJsonObjects('push-subs');
}

// ───── push meta (cursor) ───────────────────────────────────────────────

export async function getLastPushed() {
  return await getJson('push-meta/last-pushed.json');
}

export async function setLastPushed(data) {
  await putJson('push-meta/last-pushed.json', data);
}

// ───── syndication ledger (per-target dedup) ─────────────────────────────
// One file per target (bluesky, activitypub, …) holding the ids of posts
// already syndicated there. A per-item ledger — not a time window — is what
// makes date-only posts syndicate reliably: the old "published within the
// last hour" gate dropped any hand-authored article (midnight UTC timestamp)
// that wasn't deployed within the hour. It's also idempotent across re-runs
// and tolerant of backfilled/out-of-order dates, which a single high-water
// cursor is not.

export async function getSyndicatedIds(target) {
  const data = await getJson(`syndication-meta/${target}.json`);
  return new Set(data?.ids ?? []);
}

export async function addSyndicatedIds(target, ids) {
  if (!ids || ids.length === 0) return;
  const merged = await getSyndicatedIds(target);
  for (const id of ids) merged.add(id);
  await putJson(`syndication-meta/${target}.json`, {
    ids: [...merged],
    updatedAt: new Date().toISOString(),
  });
}

// Drop one id from a target's ledger so the post re-delivers on the next
// deploy. Returns true if it was present. Removing a single entry keeps the
// ledger non-empty (the normal/"warm" path), avoiding the cold-start grace
// window you'd re-enter by deleting the whole file.
export async function removeSyndicatedId(target, id) {
  const set = await getSyndicatedIds(target);
  if (!set.delete(id)) return false;
  await putJson(`syndication-meta/${target}.json`, {
    ids: [...set],
    updatedAt: new Date().toISOString(),
  });
  return true;
}
