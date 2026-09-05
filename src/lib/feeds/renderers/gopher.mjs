// Gopher renderer — file renderer: FeedItem[] → { relpath: body }.
//
// Layout mirrors the gemtext capsule:
//   gophermap                  root menu
//   {collection}/gophermap     collection menu
//   {collection}/{slug}.txt    full post, served as a plain text file
//
// Menu syntax is RFC 1436:
//
//   <type><display><TAB><selector><TAB><host><TAB><port><CR><LF>
//
// with the menu terminated by a line containing only ".". Four things
// about that format are easy to get wrong:
//
//   - the item type is the FIRST CHARACTER of the display string, not a
//     separate tab-delimited field;
//   - type 0 is a text FILE and type 1 is a DIRECTORY (menu) — the
//     mapping is not the intuitive one;
//   - host and port are mandatory on every line, so a menu cannot be
//     written without knowing the hostname it will be served under;
//   - lines end CRLF, not LF.
//
// Item types used here: 0 text file, 1 directory, i informational,
// h URL (selector "URL:<href>", which clients dereference over HTTP).
//
// Post bodies are plain text and keep the gemtext conversion — its
// "=> url text" link lines read fine as prose, and gopher has no way to
// embed a link inside a type-0 file anyway.

import { marked } from 'marked';
import { tokensToGemtext, hrefResolver } from './gemtext.mjs';

const CRLF = '\r\n';

// Hostname the menus advertise. Every selector line has to name a host,
// so this has to be decided at generation time, not serve time — the
// same constraint GEMINI_HOSTNAME solves for the capsule.
export const DEFAULT_GOPHER_HOST = 'gopher.andystevens.name';
export const DEFAULT_GOPHER_PORT = 70;

// Informational and URL lines don't address a selector on this server.
// The long-standing convention is to point them at a host that will
// never answer, so a client that tries to follow one fails fast instead
// of hanging on a real socket.
const NULL_SELECTOR = 'fake';
const NULL_HOST = 'error.host';
const NULL_PORT = 1;

const fmtDate = (item) => (item.date ? item.date.slice(0, 10) : '');

// Display strings and selectors are tab-delimited and line-terminated,
// so they cannot contain tabs or newlines.
const clean = (value) => String(value).replace(/[\t\r\n]+/g, ' ').trim();

function line(type, display, selector, host, port) {
  return `${type}${clean(display)}\t${selector}\t${host}\t${port}`;
}

const info = (text = '') => line('i', text, NULL_SELECTOR, NULL_HOST, NULL_PORT);

const menu = (lines) => lines.join(CRLF) + CRLF + '.' + CRLF;

// A dated title as it appears in a menu: "2026-08-13 The Art of the Copyist".
const listLabel = (item) =>
  `${item.date ? fmtDate(item) + ' ' : ''}${item.title || item.slug}`;

const postLine = (item, { host, port }) =>
  line('0', listLabel(item), `/${item.collection}/${item.slug}.txt`, host, port);

function renderPost(item, absolutize) {
  const lines = [];
  lines.push(item.title || item.slug);
  lines.push('');
  if (item.date) lines.push(`Published: ${fmtDate(item)}`);
  if (item.summary) lines.push(item.summary);

  if (item.linkTo && item.collection === 'bookmarks') {
    lines.push(`Bookmark of: ${item.linkTo}`);
  }
  if (item.inReplyTo) {
    lines.push(`In reply to: ${item.inReplyTo}`);
  }
  if (item.likeTarget) {
    lines.push(`Liked: ${item.likeTarget}`);
  }
  if (item.linkTo && item.collection === 'writing') {
    lines.push(`Originally published: ${item.linkTo}`);
  }

  lines.push('');
  lines.push(tokensToGemtext(marked.lexer(item.markdown), { absolutize }));
  lines.push('');
  lines.push(`=> /${item.collection}/ All ${item.collection}`);
  lines.push('=> / Home');
  return lines.join('\n');
}

function renderCollectionIndex(label, items, { host, port }) {
  const lines = [info(label), info()];
  if (items.length === 0) {
    lines.push(info('Nothing here yet.'));
  } else {
    for (const item of items) lines.push(postLine(item, { host, port }));
  }
  lines.push(info());
  lines.push(line('1', 'Home', '/', host, port));
  return menu(lines);
}

function renderHomeIndex(items, { collections, host, port, webUrl }) {
  const lines = [info('andystevens.name'), info(), info('Recent posts'), info()];
  for (const item of items.slice(0, 20)) {
    lines.push(postLine(item, { host, port }));
  }
  lines.push(info(), info('All collections'), info());
  for (const { collection, label } of collections) {
    lines.push(line('1', label, `/${collection}/`, host, port));
  }
  lines.push(info());
  lines.push(
    line('h', 'andystevens.name on the web', `URL:${webUrl}`, NULL_HOST, NULL_PORT)
  );
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
  // carried: null — a gopher post is a plain text file, so no link inside
  // it can be followed by any client. Every rooted path becomes an
  // absolute web URL the reader can at least copy.
  const absolutize = hrefResolver({ base: webUrl, carried: null });

  for (const item of items) {
    files.set(`${item.collection}/${item.slug}.txt`, renderPost(item, absolutize));
  }
  for (const { collection, label } of collections) {
    files.set(
      `${collection}/gophermap`,
      renderCollectionIndex(
        label,
        items.filter((i) => i.collection === collection),
        addressing
      )
    );
  }
  files.set(
    'gophermap',
    renderHomeIndex(items, { collections, host, port, webUrl })
  );
  return files;
}
