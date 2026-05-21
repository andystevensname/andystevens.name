// Build-time endpoint. Astro renders this during `astro build` to produce
// dist/post-manifest.json. scripts/copy-manifest.mjs then moves it into
// data/posts.json (where the Netlify functions and build plugins read it)
// and deletes the public copy.
//
// This is the post manifest: a flat list of every published post across
// the federation source collections, with rendered HTML included so
// runtime consumers don't need to walk the content collection. The
// manifest does NOT filter by syndication token — each entry carries
// its `syndication` array, and consumers (AP runtime, Bluesky plugin,
// etc.) filter for the tokens they care about.

import type { APIRoute } from 'astro';
import { getCollection, render } from 'astro:content';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { sources } from '../lib/post-sources.mjs';

const DOMAIN = import.meta.env.AP_DOMAIN || process.env.AP_DOMAIN;

export const GET: APIRoute = async () => {
  if (!DOMAIN) {
    return new Response('AP_DOMAIN not configured', { status: 500 });
  }

  const container = await AstroContainer.create();
  const manifest: any[] = [];

  for (const src of sources) {
    let entries: any[];
    try {
      entries = await getCollection(src.collection as any);
    } catch {
      continue;
    }
    if (!entries || !entries.length) continue;

    for (const entry of entries) {
      if (entry.data.published === false) continue;

      const date = entry.data.date;
      if (!date) continue;

      const item = await buildItem(entry, src, container);
      if (item) manifest.push(item);
    }
  }

  manifest.sort((a, b) => b.published.localeCompare(a.published));

  return new Response(JSON.stringify(manifest, null, 2), {
    headers: { 'Content-Type': 'application/json' },
  });
};

async function buildItem(entry: any, src: any, container: any) {
  let html = '';
  try {
    const { Content } = await render(entry);
    html = await container.renderToString(Content);
  } catch (e: any) {
    console.warn(
      `[post-manifest] render failed for ${src.collection}/${entry.id}:`,
      e?.message
    );
  }

  const slug = entry.data.slug || entry.id.replace(/\.[^.]+$/, '');
  const url = `https://${DOMAIN}${src.path}/${slug}`;
  const published =
    entry.data.date instanceof Date
      ? entry.data.date.toISOString()
      : new Date(entry.data.date).toISOString();

  const item: any = {
    slug,
    collection: src.collection,
    apType: src.type,
    path: src.path,
    published,
    url,
    title: entry.data.title || '',
    summary: entry.data[src.summaryField ?? 'description'] || '',
    tags: entry.data.tags || [],
    syndication: entry.data.syndication || [],
    notify: entry.data.notify !== false,
    html,
    markdown: entry.body ?? '',
  };

  if (src.type === 'Like') {
    const target = entry.data[src.targetField];
    if (!target) {
      console.warn(
        `[post-manifest] ${src.collection}/${entry.id} is Like but missing ${src.targetField}`
      );
      return null;
    }
    item.likeTarget = target;
  }
  if (src.imageField) {
    const imgs = entry.data[src.imageField];
    if (imgs) item.images = Array.isArray(imgs) ? imgs : [imgs];
  }
  if (src.linkField) {
    const link = entry.data[src.linkField];
    if (link) item.externalLink = link;
  }
  if (src.inReplyToField) {
    const ir = entry.data[src.inReplyToField];
    if (ir) item.inReplyTo = ir;
  }

  return item;
}
