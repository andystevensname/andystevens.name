import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// Loads the build-time post manifest — single source of truth for what
// published in a build. Two flavors of caller:
//   - Workflow scripts running in the Forgejo runner: have disk access,
//     read data/posts.json directly.
//   - The Bunny Edge Script: no filesystem, but can fetch HTTP. Set
//     POST_MANIFEST_URL on the script to point at the published copy
//     (kept in dist/ now that copy-manifest.mjs no longer deletes it).
// Throws if neither path resolves.

export async function loadManifest() {
  const url = process.env.POST_MANIFEST_URL;
  if (url) {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`manifest fetch failed: ${res.status} ${res.statusText}`);
    }
    return res.json();
  }

  const fromHere = join(
    dirname(fileURLToPath(import.meta.url)), '..', '..', 'data', 'posts.json'
  );
  for (const path of ['data/posts.json', fromHere]) {
    try {
      return JSON.parse(await readFile(path, 'utf8'));
    } catch {
      // try the next candidate
    }
  }
  throw new Error('post manifest not found (data/posts.json)');
}
