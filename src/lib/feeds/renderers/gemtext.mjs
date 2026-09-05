// Gemtext renderer — file renderer: FeedItem[] → { relpath: body }.
//
// The markdown → gemtext conversion (inlineText/extractLinks/
// tokensToGemtext) is ported verbatim from the old
// scripts/generate-gemtext.mjs so capsule output stays byte-identical;
// only the item source changed (FeedItem instead of raw gray-matter
// posts). The one deliberate difference: descriptions arrive
// HTML-stripped because the manifest carries schema-processed data.

import { marked } from 'marked';

// ───── markdown → gemtext ────────────────────────────────────────────────

function inlineText(tokens) {
  if (!tokens) return '';
  return tokens
    .map((t) => {
      switch (t.type) {
        case 'text':
          // marked sometimes nests further inline tokens here
          return t.tokens ? inlineText(t.tokens) : t.text;
        case 'em':
        case 'strong':
        case 'del':
          return inlineText(t.tokens);
        case 'codespan':
          return t.text;
        case 'link':
          // Inline link becomes its link text in the paragraph; the URL
          // is extracted separately into a following link line.
          return inlineText(t.tokens) || t.text;
        case 'image':
          // Same idea — alt text in flow, image link extracted after.
          return t.text || '';
        case 'br':
          return '\n';
        case 'escape':
          return t.text;
        case 'html':
          return ''; // strip raw HTML
        default:
          return t.raw ?? '';
      }
    })
    .join('');
}

function extractLinks(tokens, acc = []) {
  if (!tokens) return acc;
  for (const t of tokens) {
    if (t.type === 'link') {
      acc.push({ href: t.href, text: inlineText(t.tokens) || t.text });
    } else if (t.type === 'image') {
      acc.push({ href: t.href, text: t.text ? `[image] ${t.text}` : '[image]' });
    }
    if (t.tokens) extractLinks(t.tokens, acc);
  }
  return acc;
}

// Extracted link lines carry whatever href the markdown used. A rooted
// path like /photos/foo/ only means something if a reader can follow it
// *in the tree being rendered*: the capsule resolves it against the
// capsule root, while a gopher post body cannot follow anything at all
// (type-0 text files have no link syntax, so those lines are prose). So
// each renderer declares what is reachable, and anything else is rewritten
// to an absolute web URL — which is always usable, even if only by hand.
//
// carried: a Set of collection names reachable in this tree, or null for
// "nothing is reachable".
export function hrefResolver({ base = 'https://andystevens.name', carried = null } = {}) {
  const origin = base.replace(/\/$/, '');
  return (href) => {
    if (typeof href !== 'string' || !href.startsWith('/')) return href;
    if (href.startsWith('//')) return href; // protocol-relative; leave alone
    if (carried) {
      const segment = href.slice(1).split(/[/?#]/)[0];
      if (segment === '' || carried.has(segment)) return href;
    }
    return origin + href;
  };
}

// `absolutize` defaults to identity so the conversion is unchanged for
// any caller that doesn't care where links point.
export function tokensToGemtext(tokens, { absolutize = (href) => href } = {}) {
  const linkLine = (l) => `=> ${absolutize(l.href)} ${l.text}`;
  const lines = [];
  for (const t of tokens) {
    switch (t.type) {
      case 'heading': {
        const depth = Math.min(t.depth, 3);
        lines.push('#'.repeat(depth) + ' ' + inlineText(t.tokens));
        lines.push('');
        for (const l of extractLinks(t.tokens)) {
          lines.push(linkLine(l));
        }
        break;
      }
      case 'paragraph': {
        lines.push(inlineText(t.tokens));
        const links = extractLinks(t.tokens);
        if (links.length) {
          lines.push('');
          for (const l of links) lines.push(linkLine(l));
        }
        lines.push('');
        break;
      }
      case 'code':
        lines.push('```' + (t.lang || ''));
        lines.push(t.text);
        lines.push('```');
        lines.push('');
        break;
      case 'blockquote': {
        const inner = tokensToGemtext(t.tokens, { absolutize });
        for (const line of inner.split('\n')) {
          if (line.startsWith('=>') || line.startsWith('```')) {
            // Don't quote link/preformatted lines — let them pass through.
            lines.push(line);
          } else if (line.trim() === '') {
            lines.push('');
          } else {
            lines.push('> ' + line);
          }
        }
        break;
      }
      case 'list': {
        for (const item of t.items) {
          // Each item.tokens is typically [paragraph_token]; flatten its tokens.
          const inner = item.tokens
            .flatMap((it) => it.tokens || [{ type: 'text', text: it.raw || '' }]);
          lines.push('* ' + inlineText(inner));
          for (const l of extractLinks(inner)) {
            lines.push(linkLine(l));
          }
        }
        lines.push('');
        break;
      }
      case 'hr':
        lines.push('───────────────────────');
        lines.push('');
        break;
      case 'space':
        // marked emits these between blocks; we already add blank lines
        // after each block.
        break;
      case 'html':
        // Raw HTML doesn't translate; skip.
        break;
      default:
        // Unknown block — best effort.
        if (t.text) {
          lines.push(t.text);
          lines.push('');
        }
    }
  }
  // Collapse runs of blank lines.
  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
}

// ───── per-item + per-collection rendering ───────────────────────────────

const fmtDate = (item) => (item.date ? item.date.slice(0, 10) : '');

function renderPost(item, absolutize) {
  const lines = [];
  lines.push(`# ${item.title || item.slug}`);
  lines.push('');
  if (item.date) lines.push(`Published: ${fmtDate(item)}`);
  if (item.summary) lines.push(`${item.summary}`);

  // Collection-specific context
  if (item.linkTo && item.collection === 'bookmarks') {
    lines.push(`=> ${item.linkTo} Bookmark of: ${item.linkTo}`);
  }
  if (item.inReplyTo) {
    lines.push(`=> ${item.inReplyTo} In reply to: ${item.inReplyTo}`);
  }
  if (item.likeTarget) {
    lines.push(`=> ${item.likeTarget} Liked: ${item.likeTarget}`);
  }
  if (item.linkTo && item.collection === 'writing') {
    lines.push(`=> ${item.linkTo} Originally published`);
  }

  lines.push('');
  lines.push(tokensToGemtext(marked.lexer(item.markdown), { absolutize }));
  lines.push('───────────────────────');
  lines.push(`=> /${item.collection}/ All ${item.collection}`);
  lines.push('=> / Home');
  return lines.join('\n');
}

function renderCollectionIndex(label, collection, items) {
  const lines = [];
  lines.push(`# ${label}`);
  lines.push('');
  if (items.length === 0) {
    lines.push('Nothing here yet.');
  } else {
    for (const item of items) {
      const datePrefix = item.date ? `${fmtDate(item)} ` : '';
      lines.push(`=> /${collection}/${item.slug}.gmi ${datePrefix}${item.title || item.slug}`);
    }
  }
  lines.push('');
  lines.push('───────────────────────');
  lines.push('=> / Home');
  return lines.join('\n');
}

function renderHomeIndex(items, { collectionOrder, labels, webUrl }) {
  const lines = [];
  lines.push('# andystevens.name');
  lines.push('');
  lines.push('Welcome to the Gemini capsule mirror of andystevens.name.');
  lines.push('');
  lines.push('## Recent posts');
  lines.push('');
  for (const item of items.slice(0, 20)) {
    const datePrefix = item.date ? `${fmtDate(item)} ` : '';
    lines.push(
      `=> /${item.collection}/${item.slug}.gmi ${datePrefix}${item.title || item.slug}`
    );
  }
  lines.push('');
  lines.push('## All collections');
  lines.push('');
  for (const collection of collectionOrder) {
    lines.push(`=> /${collection}/ ${labels[collection]}`);
  }
  lines.push('');
  lines.push('───────────────────────');
  lines.push(`=> ${webUrl} The web version of this site`);
  return lines.join('\n');
}

// The order the capsule's home page has always listed collections in.
// Deliberately not registry order — the two differ (writing sits third
// here, sixth there) and this is the published layout.
export const DEFAULT_COLLECTION_ORDER = [
  'articles', 'notes', 'writing', 'bookmarks', 'replies', 'awards', 'albums',
];

// Legacy order first, then anything the registry has gained since, so a
// newly added collection gets an index instead of silently vanishing.
function orderCollections(collections) {
  const present = new Set(collections);
  return [
    ...DEFAULT_COLLECTION_ORDER.filter((c) => present.has(c)),
    ...collections.filter((c) => !DEFAULT_COLLECTION_ORDER.includes(c)),
  ];
}

// items must already be sorted newest-first (sortFeedItems).
export function renderGemtext(items, {
  collectionOrder = DEFAULT_COLLECTION_ORDER,
  webUrl = 'https://andystevens.name',
} = {}) {
  const order = orderCollections(collectionOrder);
  // A relative link works in the capsule only if the capsule carries that
  // collection; photos/likes/code are excluded from the gemini feed, so a
  // link into them has to leave for the web.
  const absolutize = hrefResolver({ base: webUrl, carried: new Set(order) });
  const files = new Map();
  const label = (collection) =>
    collection.charAt(0).toUpperCase() + collection.slice(1);

  for (const item of items) {
    files.set(
      `${item.collection}/${item.slug}.gmi`,
      renderPost(item, absolutize)
    );
  }
  for (const collection of order) {
    files.set(
      `${collection}/index.gmi`,
      renderCollectionIndex(label(collection), collection, items.filter((i) => i.collection === collection))
    );
  }
  files.set(
    'index.gmi',
    renderHomeIndex(items, {
      collectionOrder: order,
      labels: Object.fromEntries(order.map((c) => [c, label(c)])),
      webUrl,
    })
  );
  return files;
}
