// Upload dist/ to a Bunny Storage zone via the native HTTP API.
//
// We hit Bunny directly instead of using @bunny.net/storage-sdk because the
// SDK passes file contents as a ReadableStream with `duplex: 'half'`, which
// Node's fetch turns into a chunked-transfer-encoded PUT — and Bunny's API
// rejects those with a generic "Unauthorized access to storage zone."
// Passing a Buffer body lets fetch set Content-Length and the same write
// token that fails via the SDK succeeds here (matches the working curl call).
//
// Env:
//   BUNNY_S3_BUCKET_NAME       — storage zone name (e.g. "andystevens-name")
//   BUNNY_STORAGE_ACCESS_KEY   — API+HTTP write token from the dashboard
//   BUNNY_STORAGE_REGION       — region name; defaults to Falkenstein
//
// First pass: uploads every file in dist/, no pruning. The zone is fresh
// and DNS hasn't been flipped, so leftover files aren't a concern yet.

import { readdir, readFile } from 'node:fs/promises';
import { relative, join } from 'node:path';

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
// inference at request time. The two AP files we generate have no
// extension, so set the right type at upload so Storage returns it.
const CONTENT_TYPE_OVERRIDES = {
  '.well-known/webfinger': 'application/jrd+json; charset=utf-8',
  'ap/actor': 'application/activity+json; charset=utf-8',
};

async function upload(remote, buf) {
  const contentType =
    CONTENT_TYPE_OVERRIDES[remote] ?? 'application/octet-stream';
  const res = await fetch(base + remote, {
    method: 'PUT',
    headers: {
      AccessKey: accessKey,
      'Content-Type': contentType,
    },
    body: buf,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`${res.status} ${res.statusText} ${text.slice(0, 200)}`);
  }
}

const entries = await readdir(DIST, { recursive: true, withFileTypes: true });

let uploaded = 0;
let failed = 0;
for (const e of entries) {
  if (!e.isFile()) continue;
  const localPath = join(e.parentPath, e.name);
  const remotePath = relative(DIST, localPath).split(/[\\/]/).join('/');
  try {
    const buf = await readFile(localPath);
    await upload(remotePath, buf);
    uploaded++;
    if (uploaded % 50 === 0) console.log(`  uploaded ${uploaded} files…`);
  } catch (err) {
    failed++;
    console.warn(`  FAILED ${remotePath}: ${err.message}`);
  }
}

console.log(`Done. Uploaded ${uploaded} files to ${zone} (${regionName}); ${failed} failed.`);
if (failed > 0) process.exit(1);
