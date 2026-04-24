// Build-time endpoint. Astro renders this during `astro build` to produce
// dist/ap-manifest.json. scripts/copy-manifest.mjs then moves it into
// data/posts.json (where the Netlify functions read it) and deletes the
// public copy.
//
// This is the federation manifest: a flat list of every post that opted
// into ActivityPub via `syndication: ['activitypub']`, with rendered HTML
// included so the inbox, outbox, and deliver functions don't need to walk
// the content collection at runtime.

import type { APIRoute } from 'astro';
import { getCollection, render } from 'astro:content';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { sources, SYNDICATION_TOKEN } from '../lib/ap-sources.mjs';

const DOMAIN = import.meta.env.AP_DOMAIN || process.env.AP_DOMAIN;

export const GET: APIRoute = async () => {
  if (!DOMAIN) {
    return new Response('AP_DOMAIN not configured', { status: 500 });
  }

  const container = await AstroContainer.create();
  const manifest: any[] = [];

  for (const src of sources) {
    let entries;
    try {
      entries = await getCollection(src.collection as any);
    } catch {
      continue;
    }
    if (!entries || !entries.length) continue;

    for (const entry of entries) {
      if (entry.data.published === false) continue;

      const syndication = entry.data.syndication;
      if (
        !Array.isArray(syndication) ||
        !syndication.includes(SYNDICATION_TOKEN)
      ) {
        continue;
      }

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
      `[ap-manifest] render failed for ${src.collection}/${entry.id}:`,
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
    html,
    markdown: entry.body ?? '',
  };

  if (src.type === 'Like') {
    const target = entry.data[src.targetField];
    if (!target) {
      console.warn(
        `[ap-manifest] ${src.collection}/${entry.id} is Like but missing ${src.targetField}`
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
