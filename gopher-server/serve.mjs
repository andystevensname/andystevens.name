// Static gopher server (RFC 1436) for the capsule generated into /content
// by scripts/generate-feeds.mjs.
//
// The protocol is a single round trip: the client opens a connection and
// sends a selector terminated by CRLF, the server writes the item and
// closes. There is no request header, no status line, no keep-alive, and
// no way to signal content type out of band — the item type lives in the
// menu line that pointed here, which is why the generator has to get
// those right.
//
// Framing differs by item kind, so the two are handled separately:
//
//   gophermap  Generated complete, terminating "." line included, by
//              src/lib/feeds/renderers/gopher.mjs. Sent verbatim.
//   *.txt      Prose stored with LF. Normalized to CRLF, period-stuffed
//              and terminated here — that framing is the transport's job,
//              not something to bake into the generated files.
//
// Dependency-free on purpose: it keeps the image a stock node:alpine with
// no RUN step (see the Dockerfile).

import { createServer } from 'node:net';
import { readFile, stat } from 'node:fs/promises';
import { resolve, join, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(process.env.GOPHER_ROOT || '/content');
const PORT = Number(process.env.GOPHER_PORT || 7070);
const BIND = process.env.GOPHER_BIND || '0.0.0.0';

// A selector is read before anything is parsed, so bound it. Every
// selector this capsule publishes is well under 100 bytes; anything an
// order of magnitude past that is not a real client.
const MAX_SELECTOR = 1024;
const IDLE_TIMEOUT_MS = 10_000;

// Gopher's error convention is a menu holding a single type-3 item.
const errorMenu = (message) => `3${message}\tfake\terror.host\t1\r\n.\r\n`;

// Map a selector to a path inside ROOT, or null if it escapes.
//
// This is the security-sensitive part of the server: the selector is
// attacker-controlled and names a path. resolve() collapses any "..", and
// the prefix check then rejects whatever landed outside ROOT — the check
// is on the *resolved* path, so it can't be fooled by encoding or by
// nesting. A NUL is rejected outright rather than resolved, because it
// truncates the path down in the syscall layer.
export function resolveSelector(selector) {
  if (selector.includes('\0')) return null;
  let rel = selector;
  if (rel === '' || rel === '/') rel = '/gophermap';
  else if (rel.endsWith('/')) rel += 'gophermap';
  if (!rel.startsWith('/')) rel = '/' + rel;
  // The leading '.' keeps this relative, so an absolute selector can't
  // make resolve() discard ROOT.
  const path = resolve(ROOT, '.' + rel);
  if (path !== ROOT && !path.startsWith(ROOT + sep)) return null;
  return path;
}

// RFC 1436: text items are CRLF-delimited, terminated by a line holding
// only ".", and any line that itself starts with "." is doubled so it
// can't be mistaken for that terminator.
export function textToWire(text) {
  const body = text
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => (line.startsWith('.') ? '.' + line : line))
    .join('\r\n');
  return (body.endsWith('\r\n') ? body : body + '\r\n') + '.\r\n';
}

async function respond(socket, selector) {
  const path = resolveSelector(selector);
  if (!path) {
    console.log(`bad-selector ${JSON.stringify(selector.slice(0, 80))}`);
    socket.end(errorMenu('Bad selector'));
    return;
  }
  try {
    // Be lenient about a directory selector missing its trailing slash;
    // our own menus always include it, but clients get hand-typed URLs.
    let target = path;
    if ((await stat(target)).isDirectory()) target = join(target, 'gophermap');
    const buf = await readFile(target);
    console.log(`ok ${selector || '/'} -> ${target}`);
    socket.end(target.endsWith('gophermap') ? buf : textToWire(buf.toString('utf8')));
  } catch {
    console.log(`not-found ${JSON.stringify(selector.slice(0, 80))}`);
    socket.end(errorMenu('Not found'));
  }
}

const server = createServer((socket) => {
  let buffer = '';
  let handled = false;

  socket.setTimeout(IDLE_TIMEOUT_MS, () => socket.destroy());
  socket.on('error', () => socket.destroy());
  socket.on('data', (chunk) => {
    if (handled) return;
    buffer += chunk.toString('utf8');
    if (buffer.length > MAX_SELECTOR) {
      handled = true;
      socket.end(errorMenu('Selector too long'));
      return;
    }
    const eol = buffer.search(/\r?\n/);
    if (eol === -1) return; // wait for the rest of the line
    handled = true;
    respond(socket, buffer.slice(0, eol));
  });
});

// Listen only when run directly, so tests can import the helpers above
// without opening a socket.
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  server.listen(PORT, BIND, () => {
    console.log(`gopher: serving ${ROOT} on ${BIND}:${PORT}`);
  });
}

export { server };
