import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// Loads the build-time post manifest (data/posts.json) — the single source
// of truth for what published in a build. Build plugins run with cwd at the
// repo root; bundled Netlify Functions don't, so a second candidate is
// resolved from this module's own location. Throws if neither resolves.
export async function loadManifest() {
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
