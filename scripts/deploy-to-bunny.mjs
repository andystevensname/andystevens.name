// Upload dist/ to a Bunny Storage zone using the official SDK.
//
// Env:
//   BUNNY_S3_BUCKET_NAME       — storage zone name (e.g. "andystevens-name")
//   BUNNY_STORAGE_ACCESS_KEY   — storage zone password (FTP & API Password,
//                                NOT an S3 read/write token — those are
//                                permission-scoped and can't list)
//   BUNNY_STORAGE_REGION       — region constant name; defaults to Falkenstein
//                                (others: NewYork, LosAngeles, Singapore,
//                                 Sydney, Stockholm, SaoPaulo, Johannesburg)
//
// First pass: uploads every file in dist/. No pruning yet — the bucket starts
// empty on a fresh Storage Zone, and we're not flipping DNS until the Pull
// Zone is configured. Pruning can land in a follow-up.

import { readdir, readFile } from 'node:fs/promises';
import { relative, join } from 'node:path';
import * as BunnyStorageSDK from '@bunny.net/storage-sdk';

const regionName = process.env.BUNNY_STORAGE_REGION || 'Falkenstein';
const region = BunnyStorageSDK.regions.StorageRegion[regionName];
const zone = process.env.BUNNY_S3_BUCKET_NAME;
const accessKey = process.env.BUNNY_STORAGE_ACCESS_KEY;

if (region === undefined) {
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

const sz = BunnyStorageSDK.zone.connect_with_accesskey(region, zone, accessKey);
const DIST = 'dist';

const entries = await readdir(DIST, { recursive: true, withFileTypes: true });

let uploaded = 0;
let failed = 0;
for (const e of entries) {
  if (!e.isFile()) continue;
  const localPath = join(e.parentPath, e.name);
  // SDK's URL builder concatenates pathname + path; the zone URL already
  // ends in a slash, so paths must NOT start with one or you get a double
  // slash in the request URL and Bunny rejects it as Unauthorized.
  const remotePath = relative(DIST, localPath).split(/[\\/]/).join('/');
  try {
    const buf = await readFile(localPath);
    const stream = new Blob([buf]).stream();
    await BunnyStorageSDK.file.upload(sz, remotePath, stream);
    uploaded++;
    if (uploaded % 50 === 0) console.log(`  uploaded ${uploaded} files…`);
  } catch (err) {
    failed++;
    console.warn(`  FAILED ${remotePath}: ${err.message}`);
  }
}

console.log(`Done. Uploaded ${uploaded} files to ${zone} (${regionName}); ${failed} failed.`);
if (failed > 0) process.exit(1);
