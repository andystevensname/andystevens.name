// Generate text-protocol mirrors from the build-time post manifest.
// Runs after `astro build` (data/posts.json must exist).
//
//   node scripts/generate-feeds.mjs
//
// Outputs:
//   dist-gemini/                   Gemini capsule — baked into the agate
//                                  container image. Replaces
//                                  scripts/generate-gemtext.mjs (which is
//                                  kept as a fallback but no longer
//                                  called by the workflows).
//   dist-gopher/                   Gopher menu — host with any static
//                                  gopher listener (e.g. gopherbagger)
//                                  alongside the capsule.
//   dist/{collection}/{slug}.md    Raw markdown source next to each post
//                                  (the "source" link convention).
//
// All rendering is shared with the feed page endpoints under
// src/lib/feeds — one FeedItem model, one set of renderers. Collections
// are driven by the feed registry's per-feed membership; the manifest
// only carries syndicated collections, so non-federated ones (code)
// simply don't appear here.

import { readFile, writeFile, mkdir, rm, readdir } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import matter from 'gray-matter';
import { feedItemsFromManifest } from '../src/lib/feeds/from-manifest.mjs';
import { renderGemtext } from '../src/lib/feeds/renderers/gemtext.mjs';
import { renderGopher } from '../src/lib/feeds/renderers/gopher.mjs';
import { renderMarkdownSources } from '../src/lib/feeds/renderers/markdown.mjs';
import { sourcesForFeeds } from '../src/lib/feeds/sources.mjs';

const CONTENT_ROOT = 'src/content';
const WEB_URL = 'https://andystevens.name';

// ── manifest ─────────────────────────────────────────────────────────────

const manifestPath = 'data/posts.json';
if (!existsSync(manifestPath)) {
  console.error(`expected ${manifestPath} to exist — run \`astro build\` first`);
  process.exit(1);
}
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));

// ── helpers ──────────────────────────────────────────────────────────────

async function writeTree(root, files) {
  await rm(root, { recursive: true, force: true });
  for (const [rel, body] of files) {
    const path = join(root, rel);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, body);
  }
  console.log(`  ${root}: ${files.size} files`);
}

// collection/slug → absolute path of the original source file. Frontmatter
// `slug` can differ from the file name, so resolve both.
async function buildSourceIndex(collections) {
  const index = new Map();
  for (const collection of collections) {
    const dir = join(CONTENT_ROOT, collection);
    if (!existsSync(dir)) continue;
    for (const file of await readdir(dir)) {
      if (!/\.mdx?$/.test(file)) continue;
      const { data } = matter(await readFile(join(dir, file), 'utf8'), {
        extract: false,
      });
      const slug = data.slug || file.replace(/\.mdx?$/, '');
      index.set(`${collection}/${slug}`, join(dir, file));
    }
  }
  return index;
}

// ── Gemini ───────────────────────────────────────────────────────────────

const geminiItems = feedItemsFromManifest(manifest, { feeds: ['gemini'] });
await writeTree(
  'dist-gemini',
  renderGemtext(geminiItems, {
    collectionOrder: sourcesForFeeds(['gemini']).map((s) => s.collection),
    webUrl: WEB_URL,
  })
);

// ── Gopher ───────────────────────────────────────────────────────────────

// Menus have to name the host they will be served under (see gopher.mjs);
// GOPHER_HOST overrides the default the way GEMINI_HOSTNAME does for the
// capsule's container.
const gopherItems = feedItemsFromManifest(manifest, { feeds: ['gopher'] });
await writeTree(
  'dist-gopher',
  renderGopher(gopherItems, {
    collections: sourcesForFeeds(['gopher']).map((s) => ({
      collection: s.collection,
      label: s.label,
    })),
    ...(process.env.GOPHER_HOST ? { host: process.env.GOPHER_HOST } : {}),
    webUrl: WEB_URL,
  })
);

// ── Markdown sources ─────────────────────────────────────────────────────

const markdownItems = feedItemsFromManifest(manifest, { feeds: ['markdown'] });
const sourceIndex = await buildSourceIndex(
  new Set(markdownItems.map((item) => item.collection))
);
const { files, stats } = renderMarkdownSources(markdownItems, (collection, slug) => {
  const sourcePath = sourceIndex.get(`${collection}/${slug}`);
  return sourcePath ? readFileSync(sourcePath, 'utf8') : null;
});
for (const [rel, body] of files) {
  const path = join('dist', rel);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, body);
}
console.log(
  `  dist/*.md: ${files.size} files (${stats.fallback} without source file, body-only fallback)`
);

console.log(
  `Feeds generated from ${manifest.length} manifest items ` +
    `(gemini: ${geminiItems.length}, gopher: ${gopherItems.length}, markdown: ${markdownItems.length}).`
);
