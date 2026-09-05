// Where a link extracted from post markdown should point, per tree.
//
// Markdown hrefs are web-shaped — /articles/on-forgetting/ — and no text
// tree uses that shape. The capsule stores /articles/on-forgetting.gmi and
// gopher stores /articles/on-forgetting.txt behind a typed selector, so a
// web-shaped path is a dead link in both. Verified against the live
// capsule: /articles/on-forgetting/ answers "51 Not found", while
// /articles/on-forgetting.gmi answers "20 text/gemini".
//
// Each renderer supplies its own formatter (see gemtextHref / gopherHref);
// this module only classifies the target. Anything a tree does not carry
// at all — photos, likes, code are excluded from both feeds — falls back
// to the web, which is the only place it exists.

// '/'                    -> { kind: 'root' }
// '/articles/'           -> { kind: 'collection', collection }
// '/articles/foo/'       -> { kind: 'post', collection, slug }
// '/articles/foo/?a=b'   -> { kind: 'web' }   queries and anchors are
// '/a/b/c/'              -> { kind: 'web' }   web-only concepts
// 'https://…', '#x', …   -> null              not site-rooted; leave alone
export function parseTarget(href) {
  if (typeof href !== 'string') return null;
  if (!href.startsWith('/') || href.startsWith('//')) return null;
  if (/[?#]/.test(href)) return { kind: 'web' };
  const parts = href.split('/').filter(Boolean);
  if (parts.length === 0) return { kind: 'root' };
  if (parts.length === 1) return { kind: 'collection', collection: parts[0] };
  if (parts.length === 2) return { kind: 'post', collection: parts[0], slug: parts[1] };
  return { kind: 'web' };
}

export function toWebUrl(base, href) {
  return base.replace(/\/$/, '') + href;
}

// An index of what a tree actually contains, so a link is only rewritten
// into that tree when the target is really there.
export function treeIndex(items) {
  const posts = new Set(items.map((i) => `${i.collection}/${i.slug}`));
  return {
    hasPost: (collection, slug) => posts.has(`${collection}/${slug}`),
    hasCollection: (collection) =>
      items.some((i) => i.collection === collection),
  };
}
