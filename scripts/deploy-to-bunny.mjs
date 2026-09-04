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
import { relative, join, extname } from 'node:path';
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
// so set the right type at upload so Storage returns it. Beyond the
// fixed paths below, every per-post object under ap/objects/ also needs
// application/activity+json (see AP_OBJECTS_PREFIX in resolveOverride) —
// without it remote servers (Mastodon) won't parse the dereferenced
// object. The .md source files and feed.json are the other two inference
// misses: Bunny doesn't know .md (serves octet-stream, so the
// <link rel="alternate" type="text/markdown"> page advertises a type the
// server contradicts) and it would serve feed.json as application/json
// instead of the application/feed+json the endpoint and <head> declare.
const CONTENT_TYPE_OVERRIDES = {
  '.well-known/webfinger': 'application/jrd+json; charset=utf-8',
  'ap/actor': 'application/activity+json; charset=utf-8',
  'feed.json': 'application/feed+json; charset=utf-8',
};
const AP_OBJECTS_PREFIX = 'ap/objects/';
const EXTENSION_OVERRIDES = {
  '.md': 'text/markdown; charset=utf-8',
};

// MIME comparison is case-insensitive and shouldn't care about the space
// after the parameter semicolon, so compare normalized forms — otherwise a
// cosmetic formatting difference would re-upload the same files forever.
const normalizeType = (value) => (value || '').toLowerCase().replace(/\s+/g, '');

function resolveOverride(remote) {
  if (CONTENT_TYPE_OVERRIDES[remote]) return CONTENT_TYPE_OVERRIDES[remote];
  if (remote.startsWith(AP_OBJECTS_PREFIX)) {
    return 'application/activity+json; charset=utf-8';
  }
  const extOverride = EXTENSION_OVERRIDES[extname(remote)];
  if (extOverride) return extOverride;
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
// and tells us per-file Checksum (SHA256, uppercase hex) and ContentType.
// Neither field appears in the published API schema, but Checksum is
// demonstrably there — the whole skip-unchanged path is built on it — so
// ContentType is read on the same basis and treated as best-effort: see
// needsUpload for what happens when it comes back empty.
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
        contentType: item.ContentType || '',
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

// Plan: PUT files that are missing, whose bytes changed, or whose stored
// Content-Type doesn't match the override we want.
//
// That last case is why this isn't a plain checksum comparison. Content-Type
// is metadata Bunny stores alongside the object; it isn't covered by the
// checksum, so adding a new entry to the override tables above would
// otherwise never reach files whose bytes are unchanged — which, the day an
// override is introduced, is every one of them. Re-uploading is the only way
// to restate the type.
//
// When Bunny reports no ContentType we can't confirm agreement, so we
// re-upload rather than assume it. That's the safe direction: the override
// set is the .md sources, feed.json and the AP files — a rounding error
// against the images and HTML — so the worst case is a negligible constant
// cost per deploy, whereas assuming agreement would silently never heal.
// The "Content-Type only" count in the plan line tells you which case you
// are in: it falls to 0 once the types are restated if Bunny reports them,
// and sits at the size of the override set if it doesn't.
function needsUpload(f) {
  const r = remote.get(f.remote);
  if (!r) return true;
  if (r.sha256 !== f.sha256) return true;
  const want = resolveOverride(f.remote);
  return want !== undefined && normalizeType(r.contentType) !== normalizeType(want);
}

const toUpload = local.filter(needsUpload);
const retypedOnly = toUpload.filter((f) => {
  const r = remote.get(f.remote);
  return r && r.sha256 === f.sha256;
}).length;
const localSet = new Set(local.map((f) => f.remote));
const toDelete = [...remote.keys()].filter((k) => !localSet.has(k));
const skipped = local.length - toUpload.length;

console.log(
  `Plan: ${toUpload.length} upload(s) (${retypedOnly} for Content-Type only), ` +
    `${toDelete.length} delete(s), ${skipped} unchanged`
);

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
