// Runs after `astro build`. Copies dist/post-manifest.json (the rendered
// output of src/pages/post-manifest.json.ts) into data/posts.json where
// runner-side scripts (deliver-to-activitypub, deliver-to-bluesky) read
// it from disk. The dist copy stays in place so it ships to Bunny and
// the Edge Script can fetch it over HTTP via POST_MANIFEST_URL.

import { copyFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';

const src = 'dist/post-manifest.json';
const dst = 'data/posts.json';

if (!existsSync(src)) {
  console.error(`expected ${src} to exist after astro build`);
  process.exit(1);
}

await mkdir('data', { recursive: true });
await copyFile(src, dst);
console.log(`Post manifest: copied ${src} → ${dst} (dist copy kept for HTTP access)`);
