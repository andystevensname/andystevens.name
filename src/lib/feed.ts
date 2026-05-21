import type { CollectionEntry } from 'astro:content';
import { marked } from 'marked';

export type FeedItemData = {
  type: 'article' | 'note' | 'bookmark' | 'like' | 'photo' | 'reply' | 'writing' | 'award' | 'album' | 'code';
  url: string;
  date: Date;
  title?: string;
  summary?: string;
  bodyHtml?: string;
  quote?: string;
  linkTo?: string;
  photo?: string;
  photoWidth?: number;
  photoHeight?: number;
  alt?: string;
  venue?: string;
  category?: string;
  tags?: string[];
};

function renderBody(body: string | undefined): string | undefined {
  if (!body?.trim()) return undefined;
  return marked.parse(body.trim(), { async: false }) as string;
}

// Builds the fields every feed item shares; `extra` supplies the
// type-specific ones.
function feedItem(
  type: FeedItemData['type'],
  path: string,
  entry: { id: string; data: { date?: Date } },
  extra: Partial<FeedItemData>,
): FeedItemData {
  return {
    type,
    url: `${path}/${entry.id}/`,
    date: entry.data.date ?? new Date(0),
    ...extra,
  };
}

export function mapArticles(posts: CollectionEntry<'articles'>[]): FeedItemData[] {
  return posts.map((p) => feedItem('article', '/articles', p, {
    title: p.data.title,
    summary: p.data.description,
    bodyHtml: renderBody(p.body),
    quote: p.data.quote,
    tags: p.data.tags,
  }));
}

export function mapNotes(notes: CollectionEntry<'notes'>[]): FeedItemData[] {
  return notes.map((n) => feedItem('note', '/notes', n, {
    bodyHtml: renderBody(n.body),
    tags: n.data.tags,
  }));
}

export function mapBookmarks(bookmarks: CollectionEntry<'bookmarks'>[]): FeedItemData[] {
  return bookmarks.map((b) => feedItem('bookmark', '/bookmarks', b, {
    title: b.data.title,
    linkTo: b.data.bookmark_of,
    bodyHtml: renderBody(b.body),
    tags: b.data.tags,
  }));
}

export function mapLikes(likes: CollectionEntry<'likes'>[]): FeedItemData[] {
  return likes.map((l) => feedItem('like', '/likes', l, {
    title: l.data.title,
    summary: l.data.summary,
    linkTo: l.data.like_of,
  }));
}

export function mapPhotos(photos: CollectionEntry<'photos'>[]): FeedItemData[] {
  return photos.map((p) => feedItem('photo', '/photos', p, {
    title: p.data.title,
    photo: Array.isArray(p.data.photo) ? p.data.photo[0] : p.data.photo,
    photoWidth: p.data.width,
    photoHeight: p.data.height,
    alt: p.data.alt,
    tags: p.data.tags,
  }));
}

export function mapReplies(replies: CollectionEntry<'replies'>[]): FeedItemData[] {
  return replies.map((r) => feedItem('reply', '/replies', r, {
    linkTo: r.data.in_reply_to,
    bodyHtml: renderBody(r.body),
    tags: r.data.tags,
  }));
}

export function mapWriting(writing: CollectionEntry<'writing'>[]): FeedItemData[] {
  return writing.map((w) => feedItem('writing', '/writing', w, {
    title: w.data.title,
    linkTo: w.data.url,
    venue: w.data.venue,
    category: w.data.category,
    bodyHtml: renderBody(w.body),
    tags: w.data.tags,
  }));
}

export function mapAwards(awards: CollectionEntry<'awards'>[]): FeedItemData[] {
  return awards.map((a) => feedItem('award', '/awards', a, {
    title: a.data.title,
    venue: a.data.issuer,
  }));
}

export function mapAlbums(
  albums: CollectionEntry<'albums'>[],
  photos: CollectionEntry<'photos'>[] = [],
): FeedItemData[] {
  const dimsByCover = new Map<string, { width?: number; height?: number }>();
  for (const p of photos) {
    const src = Array.isArray(p.data.photo) ? p.data.photo[0] : p.data.photo;
    if (src) dimsByCover.set(src, { width: p.data.width, height: p.data.height });
  }
  return albums.map((a) => {
    const dims = a.data.cover ? dimsByCover.get(a.data.cover) : undefined;
    return feedItem('album', '/albums', a, {
      title: a.data.title,
      summary: a.data.description,
      photo: a.data.cover,
      photoWidth: dims?.width,
      photoHeight: dims?.height,
      tags: a.data.tags,
    });
  });
}

export function mapCode(projects: CollectionEntry<'code'>[]): FeedItemData[] {
  return projects.map((p) => feedItem('code', '/code', p, {
    title: p.data.title,
    summary: p.data.description,
    tags: p.data.tags,
  }));
}

export function sortByDate(items: FeedItemData[]): FeedItemData[] {
  return items.sort((a, b) => b.date.getTime() - a.date.getTime());
}
