import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';
import {
  mapArticles,
  mapNotes,
  mapBookmarks,
  mapLikes,
  mapPhotos,
  mapReplies,
  mapWriting,
  mapAwards,
  mapCode,
  sortByDate,
} from '../lib/feed';

export async function GET(context: APIContext) {
  const [articles, notes, bookmarks, likes, photos, replies, writing, awards, code] = await Promise.all([
    getCollection('articles', ({ data }) => data.published !== false),
    getCollection('notes', ({ data }) => data.published !== false),
    getCollection('bookmarks', ({ data }) => data.published !== false),
    getCollection('likes', ({ data }) => data.published !== false),
    getCollection('photos', ({ data }) => data.published !== false),
    getCollection('replies', ({ data }) => data.published !== false),
    getCollection('writing', ({ data }) => data.published !== false),
    getCollection('awards', ({ data }) => data.published !== false),
    getCollection('code', ({ data }) => data.published !== false),
  ]);

  const items = sortByDate([
    ...mapArticles(articles),
    ...mapNotes(notes),
    ...mapBookmarks(bookmarks),
    ...mapLikes(likes),
    ...mapPhotos(photos),
    ...mapReplies(replies),
    ...mapWriting(writing),
    ...mapAwards(awards),
    ...mapCode(code),
  ]).map((item) => ({
    title: item.title || item.type.charAt(0).toUpperCase() + item.type.slice(1),
    pubDate: item.date,
    description: item.summary || item.bodyHtml || '',
    link: item.url,
    categories: item.tags,
    content: item.bodyHtml || '',
  }));

  return rss({
    title: 'Andy Stevens',
    description: 'Poetry, writing, and web development by Andy Stevens.',
    site: context.site!.href,
    items,
    customData: `<language>en-us</language>`,
  });
}
