export type FeedItemData = {
  type: 'article' | 'note' | 'bookmark' | 'like' | 'photo' | 'reply' | 'writing' | 'award';
  url: string;
  date: Date;
  title?: string;
  summary?: string;
  quote?: string;
  linkTo?: string;
  photo?: string;
  alt?: string;
  venue?: string;
  category?: string;
  tags?: string[];
  truncated?: boolean;
};

function truncate(text: string | undefined, maxChars: number): string | undefined {
  if (!text) return undefined;
  if (text.length <= maxChars) return text;
  const words = text.split(/\s+/);
  let result = '';
  for (const word of words) {
    const next = result ? `${result} ${word}` : word;
    if (next.length > maxChars) break;
    result = next;
  }
  return result || words[0];
}

export function mapBlogPosts(posts: any[]): FeedItemData[] {
  return posts.map((p) => ({
    type: 'article' as const,
    url: `/blog/${p.id}/`,
    date: p.data.date ?? new Date(0),
    title: p.data.title,
    summary: p.data.description,
    quote: p.data.quote,
    tags: p.data.tags ?? [],
  }));
}

export function mapNotes(notes: any[]): FeedItemData[] {
  return notes.map((n) => ({
    type: 'note' as const,
    url: `/notes/${n.id}/`,
    date: n.data.date ?? new Date(0),
    summary: truncate(n.body, 200),
    truncated: (n.body?.length ?? 0) > 200,
    tags: n.data.tags ?? [],
  }));
}

export function mapBookmarks(bookmarks: any[]): FeedItemData[] {
  return bookmarks.map((b) => ({
    type: 'bookmark' as const,
    url: `/bookmarks/${b.id}/`,
    date: b.data.date ?? new Date(0),
    title: b.data.title,
    linkTo: b.data.bookmark_of,
    summary: truncate(b.body, 200),
    truncated: (b.body?.length ?? 0) > 200,
    tags: b.data.tags ?? [],
  }));
}

export function mapLikes(likes: any[]): FeedItemData[] {
  return likes.map((l) => ({
    type: 'like' as const,
    url: `/likes/${l.id}/`,
    date: l.data.date ?? new Date(0),
    linkTo: l.data.like_of,
  }));
}

export function mapPhotos(photos: any[]): FeedItemData[] {
  return photos.map((p) => ({
    type: 'photo' as const,
    url: `/photos/${p.id}/`,
    date: p.data.date ?? new Date(0),
    title: p.data.title,
    photo: Array.isArray(p.data.photo) ? p.data.photo[0] : p.data.photo,
    alt: p.data.alt,
    tags: p.data.tags ?? [],
  }));
}

export function mapReplies(replies: any[]): FeedItemData[] {
  return replies.map((r) => ({
    type: 'reply' as const,
    url: `/replies/${r.id}/`,
    date: r.data.date ?? new Date(0),
    linkTo: r.data.in_reply_to,
    summary: truncate(r.body, 200),
    truncated: (r.body?.length ?? 0) > 200,
    tags: r.data.tags ?? [],
  }));
}

export function mapWriting(writing: any[]): FeedItemData[] {
  return writing.map((w) => ({
    type: 'writing' as const,
    url: `/writing/${w.id}/`,
    date: w.data.date ?? new Date(0),
    title: w.data.title,
    linkTo: w.data.url,
    venue: w.data.venue,
    category: w.data.category,
    summary: truncate(w.body, 200),
    truncated: (w.body?.length ?? 0) > 200,
    tags: w.data.tags ?? [],
  }));
}

export function mapAwards(awards: any[]): FeedItemData[] {
  return awards.map((a) => ({
    type: 'award' as const,
    url: `/awards/${a.id}/`,
    date: a.data.date ?? new Date(0),
    title: a.data.title,
    venue: a.data.issuer,
  }));
}

export function sortByDate(items: FeedItemData[]): FeedItemData[] {
  return items.sort((a, b) => b.date.getTime() - a.date.getTime());
}
