// Runs after `astro build`. Moves dist/ap-manifest.json (the rendered output
// of src/pages/ap-manifest.json.ts) into data/posts.json where the Netlify
// functions expect it, then deletes the public copy so it doesn't get
// deployed as a public URL on the site.

import { copyFile, mkdir, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';

const src = 'dist/ap-manifest.json';
const dst = 'data/posts.json';

if (!existsSync(src)) {
  console.error(`expected ${src} to exist after astro build`);
  process.exit(1);
}

await mkdir('data', { recursive: true });
await copyFile(src, dst);
await rm(src);
console.log(`ActivityPub: moved ${src} → ${dst}`);
