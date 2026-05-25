// Storage layer backed by Bunny Edge Database Lite (libSQL/SQLite).
//
// Same public surface as the previous Netlify Blobs implementation —
// every call site imports these named functions and nothing else, so
// the backend swap is invisible to callers. To swap again later, replace
// the body of this file but keep the same exports.
//
// Data model (one row per logical key, keyed by sha256-trim-to-32 string):
//   followers           id, actor, inbox, shared_inbox, followed_at
//   activities          id, json
//   push_subscriptions  id, endpoint, keys_json, created_at, ua
//   push_meta           key, value           (JSON-encoded value)
//
// Env required:
//   BUNNY_DATABASE_URL          — libSQL URL for the database
//   BUNNY_DATABASE_WRITE_TOKEN  — full-access token
//
// Schema is created lazily on first connect (CREATE TABLE IF NOT EXISTS),
// so there's no separate migration step to run.

// Use the /web subpath: pure-JS client that talks to libsql over HTTP.
// The default @libsql/client import pulls in a Node-native binary which
// can't run in Bunny's Deno edge runtime.
import { createClient } from '@libsql/client/web';
import { createHash } from 'node:crypto';

let _client;
let _initialized = false;

// Bunny's Deno fetch wrapper crashes when libsql's hrana client passes
// a plain Request object (TypeError: Cannot read properties of undefined
// (reading 'loop')). Unpack the Request into URL + init and re-fetch.
async function bunnyCompatFetch(request) {
  const init = {
    method: request.method,
    headers: Object.fromEntries(request.headers),
  };
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    init.body = await request.text();
  }
  return fetch(request.url, init);
}

function getClient() {
  if (_client) return _client;
  const url = process.env.BUNNY_DATABASE_URL;
  const authToken = process.env.BUNNY_DATABASE_WRITE_TOKEN;
  if (!url || !authToken) {
    throw new Error(
      'BUNNY_DATABASE_URL and BUNNY_DATABASE_WRITE_TOKEN must be set'
    );
  }
  _client = createClient({ url, authToken, fetch: bunnyCompatFetch });
  return _client;
}

async function ensureSchema() {
  if (_initialized) return;
  const client = getClient();
  await client.batch(
    [
      `CREATE TABLE IF NOT EXISTS followers (
        id           TEXT PRIMARY KEY,
        actor        TEXT NOT NULL,
        inbox        TEXT NOT NULL,
        shared_inbox TEXT,
        followed_at  TEXT NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS activities (
        id   TEXT PRIMARY KEY,
        json TEXT NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS push_subscriptions (
        id         TEXT PRIMARY KEY,
        endpoint   TEXT NOT NULL,
        keys_json  TEXT NOT NULL,
        created_at TEXT NOT NULL,
        ua         TEXT
      )`,
      `CREATE TABLE IF NOT EXISTS push_meta (
        key   TEXT PRIMARY KEY,
        value TEXT NOT NULL
      )`,
    ],
    'write'
  );
  _initialized = true;
}

function hashId(id) {
  return createHash('sha256').update(id).digest('hex').slice(0, 32);
}

// ───── followers ────────────────────────────────────────────────────────

export async function addFollower(actor, inbox, sharedInbox) {
  await ensureSchema();
  await getClient().execute({
    sql: `INSERT INTO followers (id, actor, inbox, shared_inbox, followed_at)
          VALUES (?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            actor        = excluded.actor,
            inbox        = excluded.inbox,
            shared_inbox = excluded.shared_inbox,
            followed_at  = excluded.followed_at`,
    args: [hashId(actor), actor, inbox, sharedInbox ?? null, new Date().toISOString()],
  });
}

export async function removeFollower(actor) {
  await ensureSchema();
  await getClient().execute({
    sql: 'DELETE FROM followers WHERE id = ?',
    args: [hashId(actor)],
  });
}

export async function hasFollower(actor) {
  await ensureSchema();
  const res = await getClient().execute({
    sql: 'SELECT 1 FROM followers WHERE id = ? LIMIT 1',
    args: [hashId(actor)],
  });
  return res.rows.length > 0;
}

export async function listFollowers() {
  await ensureSchema();
  const res = await getClient().execute(
    'SELECT actor, inbox, shared_inbox, followed_at FROM followers'
  );
  return res.rows.map((r) => ({
    actor: r.actor,
    inbox: r.inbox,
    sharedInbox: r.shared_inbox ?? undefined,
    followedAt: r.followed_at,
  }));
}

// ───── activities (idempotency + audit) ─────────────────────────────────

export async function recordActivity(id, json) {
  await ensureSchema();
  await getClient().execute({
    sql: `INSERT INTO activities (id, json) VALUES (?, ?)
          ON CONFLICT(id) DO UPDATE SET json = excluded.json`,
    args: [hashId(id), JSON.stringify(json)],
  });
}

export async function getActivity(id) {
  await ensureSchema();
  const res = await getClient().execute({
    sql: 'SELECT json FROM activities WHERE id = ?',
    args: [hashId(id)],
  });
  if (res.rows.length === 0) return null;
  return JSON.parse(res.rows[0].json);
}

// ───── push subscriptions ───────────────────────────────────────────────

export async function addPushSubscription(subscription, ua) {
  await ensureSchema();
  await getClient().execute({
    sql: `INSERT INTO push_subscriptions (id, endpoint, keys_json, created_at, ua)
          VALUES (?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            endpoint   = excluded.endpoint,
            keys_json  = excluded.keys_json,
            created_at = excluded.created_at,
            ua         = excluded.ua`,
    args: [
      hashId(subscription.endpoint),
      subscription.endpoint,
      JSON.stringify(subscription.keys),
      new Date().toISOString(),
      ua || null,
    ],
  });
}

export async function removePushSubscription(endpoint) {
  await ensureSchema();
  await getClient().execute({
    sql: 'DELETE FROM push_subscriptions WHERE id = ?',
    args: [hashId(endpoint)],
  });
}

export async function listPushSubscriptions() {
  await ensureSchema();
  const res = await getClient().execute(
    'SELECT endpoint, keys_json, created_at, ua FROM push_subscriptions'
  );
  return res.rows.map((r) => ({
    endpoint: r.endpoint,
    keys: JSON.parse(r.keys_json),
    createdAt: r.created_at,
    ua: r.ua ?? null,
  }));
}

// ───── push meta (cursor) ───────────────────────────────────────────────

export async function getLastPushed() {
  await ensureSchema();
  const res = await getClient().execute({
    sql: 'SELECT value FROM push_meta WHERE key = ?',
    args: ['last-pushed'],
  });
  if (res.rows.length === 0) return null;
  return JSON.parse(res.rows[0].value);
}

export async function setLastPushed(data) {
  await ensureSchema();
  await getClient().execute({
    sql: `INSERT INTO push_meta (key, value) VALUES (?, ?)
          ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    args: ['last-pushed', JSON.stringify(data)],
  });
}
