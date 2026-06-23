// Sync dist/ to a Bunny Storage zone via the native HTTP API. Skips
// files whose SHA256 already matches what Bunny is storing; deletes
// remote files that no longer exist locally. Parallelises uploads.
//
// We talk to Bunny directly instead of using @bunny.net/storage-sdk
// because the SDK passes file contents as a ReadableStream with
// `duplex: 'half'`, which Node's fetch turns into a chunked-transfer-
// encoded PUT — Bunny's API rejects those with a generic "Unauthorized
// access to storage zone." Passing a Buffer body lets fetch set
// Content-Length and works fine.
//
// Env:
//   BUNNY_S3_BUCKET_NAME       — storage zone name (e.g. "andystevens-name")
//   BUNNY_STORAGE_ACCESS_KEY   — API+HTTP write token from the dashboard
//   BUNNY_STORAGE_REGION       — region name; defaults to Falkenstein

import { readdir, readFile } from 'node:fs/promises';
import { relative, join } from 'node:path';
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

const regionName = process.env.BUNNY_STORAGE_REGION || 'Falkenstein';
const prefix = REGION_HOST_PREFIX[regionName];
const zone = process.env.BUNNY_S3_BUCKET_NAME;
const accessKey = process.env.BUNNY_STORAGE_ACCESS_KEY?.trim();
const CONCURRENCY = Number(process.env.BUNNY_UPLOAD_CONCURRENCY) || 16;

if (prefix === undefined) {
  console.error(`Unknown BUNNY_STORAGE_REGION: ${regionName}`);
  process.exit(1);
}
if (!zone) {
  console.error('BUNNY_S3_BUCKET_NAME not set');
  process.exit(1);
}
if (!accessKey) {
  console.error('BUNNY_STORAGE_ACCESS_KEY not set');
  process.exit(1);
}

const base = `https://${prefix}storage.bunnycdn.com/${zone}/`;
const DIST = 'dist';

// Most files served by Bunny get their Content-Type from extension
// inference at request time. The AP files we generate have no extension,
// so set the right type at upload so Storage returns it. Beyond the two
// fixed paths below, every per-post object under ap/objects/ also needs
// application/activity+json (see AP_OBJECTS_PREFIX in resolveOverride) —
// without it remote servers (Mastodon) won't parse the dereferenced object.
const CONTENT_TYPE_OVERRIDES = {
  '.well-known/webfinger': 'application/jrd+json; charset=utf-8',
  'ap/actor': 'application/activity+json; charset=utf-8',
};
const AP_OBJECTS_PREFIX = 'ap/objects/';

function resolveOverride(remote) {
  if (CONTENT_TYPE_OVERRIDES[remote]) return CONTENT_TYPE_OVERRIDES[remote];
  if (remote.startsWith(AP_OBJECTS_PREFIX)) {
    return 'application/activity+json; charset=utf-8';
  }
  return undefined;
}

// ───── small concurrency helper ─────────────────────────────────────────

async function pmap(items, concurrency, fn) {
  let i = 0;
  const errors = [];
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (i < items.length) {
      const idx = i++;
      try {
        await fn(items[idx], idx);
      } catch (err) {
        errors.push({ item: items[idx], err });
      }
    }
  });
  await Promise.all(workers);
  return errors;
}

// ───── bunny api helpers ────────────────────────────────────────────────

async function upload(remote, buf) {
  // Bunny treats the standard Content-Type header as the request body's
  // type only — it uses the proprietary "Override-Content-Type" header
  // to set the MIME stored with the file and returned on subsequent GETs.
  const headers = {
    AccessKey: accessKey,
    'Content-Type': 'application/octet-stream',
  };
  const override = resolveOverride(remote);
  if (override) headers['Override-Content-Type'] = override;
  const res = await fetch(base + remote, { method: 'PUT', headers, body: buf });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`PUT ${remote}: ${res.status} ${res.statusText} ${text.slice(0, 200)}`);
  }
}

async function remove(remote) {
  const res = await fetch(base + remote, {
    method: 'DELETE',
    headers: { AccessKey: accessKey },
  });
  if (!res.ok && res.status !== 404) {
    const text = await res.text().catch(() => '');
    throw new Error(`DELETE ${remote}: ${res.status} ${res.statusText} ${text.slice(0, 200)}`);
  }
}

// Recursive listing. Bunny lists one directory at a time (trailing slash)
// and tells us per-file Checksum (SHA256, uppercase hex).
async function listRemote(prefixPath = '') {
  const url = base + prefixPath;
  const res = await fetch(url, {
    headers: { AccessKey: accessKey, Accept: 'application/json' },
  });
  if (res.status === 404) return new Map();
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`LIST ${prefixPath}: ${res.status} ${res.statusText} ${text.slice(0, 200)}`);
  }
  const items = await res.json();
  const out = new Map(); // path -> { sha256 lowercase }
  for (const item of items) {
    if (item.IsDirectory) {
      const sub = await listRemote(prefixPath + item.ObjectName + '/');
      for (const [k, v] of sub) out.set(k, v);
    } else {
      out.set(prefixPath + item.ObjectName, {
        sha256: (item.Checksum || '').toLowerCase(),
      });
    }
  }
  return out;
}

// ───── walk dist/ ───────────────────────────────────────────────────────

async function walkLocal() {
  const entries = await readdir(DIST, { recursive: true, withFileTypes: true });
  const out = []; // { remote, localPath }
  for (const e of entries) {
    if (!e.isFile()) continue;
    const localPath = join(e.parentPath, e.name);
    const remote = relative(DIST, localPath).split(/[\\/]/).join('/');
    out.push({ remote, localPath });
  }
  return out;
}

// ───── plan + execute ───────────────────────────────────────────────────

console.log('Walking dist/ …');
const local = await walkLocal();
console.log(`  ${local.length} local files`);

console.log('Listing remote …');
const remote = await listRemote();
console.log(`  ${remote.size} remote files`);

console.log('Hashing local files …');
for (const file of local) {
  const buf = await readFile(file.localPath);
  file.buf = buf;
  file.sha256 = createHash('sha256').update(buf).digest('hex');
}

// Plan: PUT files that are missing or have different hashes, skip matches.
const toUpload = local.filter((f) => {
  const r = remote.get(f.remote);
  return !r || r.sha256 !== f.sha256;
});
const localSet = new Set(local.map((f) => f.remote));
const toDelete = [...remote.keys()].filter((k) => !localSet.has(k));
const skipped = local.length - toUpload.length;

console.log(`Plan: ${toUpload.length} upload(s), ${toDelete.length} delete(s), ${skipped} unchanged`);

const uploadErrors = await pmap(toUpload, CONCURRENCY, async (f) => {
  await upload(f.remote, f.buf);
});
const deleteErrors = await pmap(toDelete, CONCURRENCY, async (path) => {
  await remove(path);
});

const failedUploads = uploadErrors.length;
const failedDeletes = deleteErrors.length;
for (const e of [...uploadErrors, ...deleteErrors]) {
  console.warn(`  FAILED: ${e.err.message}`);
}

console.log(
  `Done. Uploaded ${toUpload.length - failedUploads}, deleted ${toDelete.length - failedDeletes}, skipped ${skipped}.`
);
if (failedUploads > 0 || failedDeletes > 0) process.exit(1);
