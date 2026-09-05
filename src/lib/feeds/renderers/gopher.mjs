// Gopher renderer — file renderer: FeedItem[] → { relpath: body }.
//
// Everything is a menu, because a menu is the only gopher resource that
// can contain a link. A type-0 text file has no link syntax at all, so a
// post published as one is a dead end: its references are inert text no
// client can act on. Publishing posts as menus instead makes every link
// followable on every client — which is what menus are for.
//
//   gophermap                          root menu
//   {collection}/gophermap             collection menu
//   {collection}/{slug}/gophermap      the post itself
//
// Menu syntax is RFC 1436:
//
//   <type><display><TAB><selector><TAB><host><TAB><port><CR><LF>
//
// terminated by a line holding only ".". The item type is the FIRST
// CHARACTER of the display string, not a separate field; type 0 is a text
// FILE and 1 a DIRECTORY (menu); host and port are mandatory on every
// line, so a menu cannot be written without knowing the hostname it will
// be served under; and lines end CRLF.
//
// Types used: 1 directory, i informational (prose), h URL (selector
// "URL:<href>", which clients hand to a browser).
//
// Prose is emitted one paragraph per line and left for the client to wrap.
// Hard-wrapping here was tried and removed: both Lagrange and Bombadillo
// soft-wrap long display strings, so a fixed measure does not protect
// anything — it just fights the client's own wrapping and orphans the tail
// of every paragraph whenever the window is narrower than the measure. A
// 69-character line still broke in two at a large font size. Leaving lines
// whole also means deliberate short line breaks (poetry) survive as
// written, since nothing is joined or re-flowed.

import { marked } from 'marked';
import { tokensToGemtext } from './gemtext.mjs';
import { parseTarget, toWebUrl, treeIndex } from './links.mjs';

const CRLF = '\r\n';

export const DEFAULT_GOPHER_HOST = 'gopher.andystevens.name';
export const DEFAULT_GOPHER_PORT = 70;

// Informational and URL lines don't address a selector on this server.
// The long-standing convention is to point them at a host that will never
// answer, so a client that tries to follow one fails fast.
const NULL_SELECTOR = 'fake';
const NULL_HOST = 'error.host';
const NULL_PORT = 1;

const fmtDate = (item) => (item.date ? item.date.slice(0, 10) : '');

// "Bookmark of: boingboing.net" rather than the full URL: the item is the
// link, so the label only has to say where it goes.
function destination(href) {
  try {
    return new URL(href).host.replace(/^www\./, '');
  } catch {
    return href;
  }
}

// Display strings are tab-delimited and line-terminated. Prose keeps its
// leading whitespace (list and quote indentation); menu labels are trimmed.
const safe = (value) => String(value).replace(/[\t\r\n]+/g, ' ');
const label = (value) => safe(value).trim();

function line(type, display, selector, host, port) {
  return `${type}${label(display)}\t${selector}\t${host}\t${port}`;
}

// Prose line. Not trimmed — indentation carries meaning in lists and quotes.
const info = (text = '') =>
  `i${safe(text).replace(/\s+$/, '')}\t${NULL_SELECTOR}\t${NULL_HOST}\t${NULL_PORT}`;

const menu = (lines) => lines.join(CRLF) + CRLF + '.' + CRLF;

// Gopher-shaped addresses for links inside a post.
//
// A gopher URL carries the item type as its first path segment, so these
// cannot be relative and the mapper has to know what it points at. The web
// is the fallback only for what gopher genuinely does not carry.
function gopherHref({ base, host, port, index }) {
  const authority = Number(port) === 70 ? host : `${host}:${port}`;
  return (href) => {
    const target = parseTarget(href);
    if (!target) return href;
    if (target.kind === 'root') return `gopher://${authority}/1/`;
    if (target.kind === 'collection' && index.hasCollection(target.collection)) {
      return `gopher://${authority}/1/${target.collection}/`;
    }
    if (target.kind === 'post' && index.hasPost(target.collection, target.slug)) {
      return `gopher://${authority}/1/${target.collection}/${target.slug}/`;
    }
    return toWebUrl(base, href);
  };
}

// A followable menu item. A gopher:// URL becomes a native selector on
// this server; anything else becomes a type-h URL item.
function linkItem(href, text, { host, port }) {
  const native = href.match(/^gopher:\/\/[^/]+\/(.)(.*)$/);
  if (native) {
    const [, type, rest] = native;
    return line(type, text, '/' + rest.replace(/^\//, ''), host, port);
  }
  return line('h', text, `URL:${href}`, NULL_HOST, NULL_PORT);
}

// The body, converted through the shared gemtext pass and then split into
// menu items: "=> href label" lines become real links, everything else
// becomes wrapped prose.
function bodyItems(item, absolutize, addressing) {
  const out = [];
  let preformatted = false;
  for (const raw of tokensToGemtext(marked.lexer(item.markdown), { absolutize }).split('\n')) {
    if (raw.startsWith('```')) {
      preformatted = !preformatted; // the fence itself carries nothing in a menu
      continue;
    }
    if (preformatted) {
      out.push(info(raw)); // never reflow code
      continue;
    }
    if (raw.startsWith('=> ')) {
      const rest = raw.slice(3);
      const gap = rest.search(/\s/);
      const href = gap === -1 ? rest : rest.slice(0, gap);
      const text = gap === -1 ? rest : rest.slice(gap + 1).trim();
      out.push(linkItem(href, text || href, addressing));
      continue;
    }
    out.push(info(raw));
  }
  return out;
}

function renderPost(item, absolutize, addressing) {
  const lines = [info(item.title || item.slug), info()];
  if (item.date) lines.push(info(`Published: ${fmtDate(item)}`));
  if (item.summary) lines.push(info(item.summary));

  // Collection context. These are the point of a bookmark or a reply, so
  // they are real items rather than prose.
  const context = [];
  if (item.linkTo && item.collection === 'bookmarks') context.push(['Bookmark of', item.linkTo]);
  if (item.inReplyTo) context.push(['In reply to', item.inReplyTo]);
  if (item.likeTarget) context.push(['Liked', item.likeTarget]);
  if (item.linkTo && item.collection === 'writing') context.push(['Originally published', item.linkTo]);
  if (context.length) lines.push(info());
  for (const [text, href] of context) {
    lines.push(linkItem(absolutize(href), `${text}: ${destination(href)}`, addressing));
  }

  lines.push(info());
  lines.push(...bodyItems(item, absolutize, addressing));
  lines.push(info());
  lines.push(linkItem(absolutize(`/${item.collection}/`), `All ${item.collection}`, addressing));
  lines.push(linkItem(absolutize('/'), 'Home', addressing));
  return menu(lines);
}

const listLabel = (item) =>
  `${item.date ? fmtDate(item) + ' ' : ''}${item.title || item.slug}`;

const postLine = (item, { host, port }) =>
  line('1', listLabel(item), `/${item.collection}/${item.slug}/`, host, port);

function renderCollectionIndex(collectionLabel, items, addressing) {
  const lines = [info(collectionLabel), info()];
  if (items.length === 0) lines.push(info('Nothing here yet.'));
  else for (const item of items) lines.push(postLine(item, addressing));
  lines.push(info());
  lines.push(line('1', 'Home', '/', addressing.host, addressing.port));
  return menu(lines);
}

function renderHomeIndex(items, { collections, host, port, webUrl }) {
  const lines = [info('andystevens.name'), info(), info('Recent posts'), info()];
  for (const item of items.slice(0, 20)) lines.push(postLine(item, { host, port }));
  lines.push(info(), info('All collections'), info());
  for (const { collection, label: name } of collections) {
    lines.push(line('1', name, `/${collection}/`, host, port));
  }
  lines.push(info());
  lines.push(line('h', 'andystevens.name on the web', `URL:${webUrl}`, NULL_HOST, NULL_PORT));
  return menu(lines);
}

// `collections` is [{ collection, label }] in menu order — pass the feed
// registry's own entries so a collection added there can't go missing.
// items must already be sorted newest-first (sortFeedItems).
export function renderGopher(items, {
  collections,
  host = DEFAULT_GOPHER_HOST,
  port = DEFAULT_GOPHER_PORT,
  webUrl = 'https://andystevens.name',
} = {}) {
  if (!collections) throw new Error('renderGopher: { collections } is required');
  const files = new Map();
  const addressing = { host, port };
  const absolutize = gopherHref({ base: webUrl, host, port, index: treeIndex(items) });

  for (const item of items) {
    files.set(`${item.collection}/${item.slug}/gophermap`, renderPost(item, absolutize, addressing));
  }
  for (const { collection, label: name } of collections) {
    files.set(
      `${collection}/gophermap`,
      renderCollectionIndex(name, items.filter((i) => i.collection === collection), addressing)
    );
  }
  files.set('gophermap', renderHomeIndex(items, { collections, host, port, webUrl }));
  return files;
}
