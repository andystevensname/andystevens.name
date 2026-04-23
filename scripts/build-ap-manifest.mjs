// scripts/build-ap-manifest.mjs
// Run this as part of your Astro build. It reads your content collection and
// writes a flat JSON manifest the functions can read.
//
// Add to package.json:  "build": "astro build && node scripts/build-ap-manifest.mjs"
//
// Then in netlify.toml, ensure the manifest is bundled with functions:
//
//   [functions]
//     node_bundler = "esbuild"
//     included_files = ["data/posts.json"]

import { getCollection } from 'astro:content';
import { writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';

// NOTE: This file can't use astro:content directly outside Astro.
// The recommended pattern is to emit the manifest from an Astro endpoint
// that runs during build. See src/pages/ap-manifest.json.js below.
//
// Alternative approach: run this as an Astro integration hook.

const DOMAIN = process.env.AP_DOMAIN;

async function main() {
  const posts = await getCollection('blog');
  const manifest = posts
    .filter((p) => !p.data.draft)
    .map((p) => ({
      slug: p.slug,
      title: p.data.title,
      published: p.data.date.toISOString(),
      url: `https://${DOMAIN}/posts/${p.slug}`,
      html: p.rendered?.html || '',
      markdown: p.body,
      tags: p.data.tags || [],
    }))
    .sort((a, b) => b.published.localeCompare(a.published));

  const out = 'data/posts.json';
  await mkdir(dirname(out), { recursive: true });
  await writeFile(out, JSON.stringify(manifest, null, 2));
  console.log(`Wrote ${manifest.length} posts to ${out}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
