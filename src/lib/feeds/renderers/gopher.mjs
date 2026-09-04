// Gopher renderer — file renderer: FeedItem[] → { relpath: body }.
//
// Layout mirrors the gemtext capsule:
//   index.txt                  root menu (type 0 directory)
//   {collection}/index.txt     collection menu
//   {collection}/{slug}.txt    full post (type 1 text file)
//
// Selector line format: Label<TAB>Type<TAB>Selector<TAB>Host<TAB>Port<TAB>
// Type 0 = directory, 1 = text file. Host/Port empty means "same gopher
// host". Post bodies reuse the gemtext conversion — its `=> url text`
// link lines read fine as plain text in gopher clients.

import { marked } from 'marked';
import { tokensToGemtext } from './gemtext.mjs';

const fmtDate = (item) => (item.date ? item.date.slice(0, 10) : '');

// A gopher selector line. Labels can't contain tabs; truncate to be safe.
function entry(label, type, selector) {
  return `${String(label).replace(/\t/g, ' ').trim()}\t${type}\t${selector}\t\t`;
}

function renderPost(item) {
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
  lines.push(tokensToGemtext(marked.lexer(item.markdown)));
  lines.push('');
  lines.push(`=> /${item.collection}/ All ${item.collection}`);
  lines.push('=> / Home');
  return lines.join('\n');
}

function renderCollectionIndex(collection, items) {
  const lines = items.map((item) =>
    entry(
      `${item.date ? fmtDate(item) + ' ' : ''}${item.title || item.slug}`,
      1,
      `/${collection}/${item.slug}.txt`
    )
  );
  lines.push(entry(`All ${collection}`, 0, `/${collection}/`));
  lines.push(entry('Home', 0, '/'));
  return lines.join('\n') + '\n';
}

function renderHomeIndex(items, { collectionOrder, labels, webUrl }) {
  const lines = [];
  for (const item of items.slice(0, 20)) {
    lines.push(
      entry(
        `${item.date ? fmtDate(item) + ' ' : ''}${item.title || item.slug}`,
        1,
        `/${item.collection}/${item.slug}.txt`
      )
    );
  }
  for (const collection of collectionOrder) {
    lines.push(entry(labels[collection], 0, `/${collection}/`));
  }
  lines.push(entry('andystevens.name on the web', 1, webUrl));
  return lines.join('\n') + '\n';
}

export function renderGopher(items, {
  collectionOrder,
  webUrl = 'https://andystevens.name',
} = {}) {
  const files = new Map();
  const labels = Object.fromEntries(
    collectionOrder.map((c) => [c, c.charAt(0).toUpperCase() + c.slice(1)])
  );

  for (const item of items) {
    files.set(`${item.collection}/${item.slug}.txt`, renderPost(item));
  }
  for (const collection of collectionOrder) {
    files.set(
      `${collection}/index.txt`,
      renderCollectionIndex(collection, items.filter((i) => i.collection === collection))
    );
  }
  files.set(
    'index.txt',
    renderHomeIndex(items, { collectionOrder, labels, webUrl })
  );
  return files;
}
