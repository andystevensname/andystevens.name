export interface FeedItemImage {
  src: string;
  width?: number;
  height?: number;
  alt?: string | null;
}

// Normalized feed item: the shared shape every feed renderer consumes.
// Built from content entries by src/lib/feeds/item.mjs (toFeedItem).
//
// `date` is an ISO 8601 string (not a Date) so items survive the JSON
// manifest boundary when build scripts consume them.
export interface FeedItem {
  collection: string;
  slug: string;
  url: string;
  date: string | null;
  feedType: string; // 'article' | 'note' | 'photo' | 'album' | ...
  apType?: string; // ActivityPub type, when the collection federates
  title: string | null;
  summary: string | null;
  markdown: string; // raw body markdown
  bodyHtml?: string; // marked-rendered body (undefined when empty)
  tags: string[];
  image?: FeedItemImage;
  linkTo?: string | null; // bookmark target / external venue
  inReplyTo?: string | null;
  likeTarget?: string | null;
  syndication: string[];
  notify: boolean;
  published: boolean;
}
