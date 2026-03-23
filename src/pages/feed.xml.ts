import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';

export async function GET(context: APIContext) {
  const [posts, notes, bookmarks, likes, photos, replies, writing, awards] = await Promise.all([
    getCollection('blog', ({ data }) => data.published !== false),
    getCollection('notes', ({ data }) => data.published !== false),
    getCollection('bookmarks', ({ data }) => data.published !== false),
    getCollection('likes', ({ data }) => data.published !== false),
    getCollection('photos', ({ data }) => data.published !== false),
    getCollection('replies', ({ data }) => data.published !== false),
    getCollection('writing', ({ data }) => data.published !== false),
    getCollection('awards', ({ data }) => data.published !== false),
  ]);

  const items = [
    ...posts.map((p) => ({
      title: p.data.title,
      pubDate: p.data.date,
      description: p.data.description,
      link: `/blog/${p.id}/`,
      categories: p.data.tags,
    })),
    ...notes.map((n) => ({
      title: 'Note',
      pubDate: n.data.date,
      description: n.body?.slice(0, 200),
      link: `/notes/${n.id}/`,
      categories: n.data.tags,
    })),
    ...bookmarks.map((b) => ({
      title: b.data.title ?? `Bookmark: ${b.data.bookmark_of}`,
      pubDate: b.data.date,
      description: b.body?.slice(0, 200),
      link: `/bookmarks/${b.id}/`,
      categories: b.data.tags,
    })),
    ...likes.map((l) => ({
      title: `Liked ${l.data.like_of}`,
      pubDate: l.data.date,
      link: `/likes/${l.id}/`,
    })),
    ...photos.map((p) => ({
      title: p.data.title ?? 'Photo',
      pubDate: p.data.date,
      description: p.data.alt,
      link: `/photos/${p.id}/`,
      categories: p.data.tags,
    })),
    ...replies.map((r) => ({
      title: `Reply to ${r.data.in_reply_to}`,
      pubDate: r.data.date,
      description: r.body?.slice(0, 200),
      link: `/replies/${r.id}/`,
      categories: r.data.tags,
    })),
    ...writing.map((w) => ({
      title: w.data.title,
      pubDate: w.data.date,
      description: `${w.data.category}${w.data.venue ? ` — ${w.data.venue}` : ''}`,
      link: `/writing/${w.id}/`,
      categories: w.data.tags,
    })),
    ...awards.map((a) => ({
      title: a.data.title,
      pubDate: a.data.date,
      description: a.data.issuer,
      link: `/awards/${a.id}/`,
    })),
  ];

  items.sort((a, b) => {
    const aDate = a.pubDate?.getTime() ?? 0;
    const bDate = b.pubDate?.getTime() ?? 0;
    return bDate - aDate;
  });

  return rss({
    title: 'Andy Stevens',
    description: 'Poetry, writing, and web development by Andy Stevens.',
    site: context.site!.href,
    items,
    customData: `<language>en-us</language>`,
  });
}
