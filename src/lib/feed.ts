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
};

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
    summary: n.body?.slice(0, 200),
    tags: n.data.tags ?? [],
  }));
}

export function mapBookmarks(bookmarks: any[]): FeedItemData[] {
  return bookmarks.map((b) => ({
    type: 'bookmark' as const,
    url: `/bookmarks/${b.id}/`,
    date: b.data.date ?? new Date(0),
    title: b.data.title,
    linkTo: b.data['bookmark-of'],
    summary: b.body?.slice(0, 200),
    tags: b.data.tags ?? [],
  }));
}

export function mapLikes(likes: any[]): FeedItemData[] {
  return likes.map((l) => ({
    type: 'like' as const,
    url: `/likes/${l.id}/`,
    date: l.data.date ?? new Date(0),
    linkTo: l.data['like-of'],
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
    linkTo: r.data['in-reply-to'],
    summary: r.body?.slice(0, 200),
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
    category: w.data.category.charAt(0).toUpperCase() + w.data.category.slice(1),
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
