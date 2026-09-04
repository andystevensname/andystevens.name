// Markdown → HTML via marked. Shared by the Astro-side feed lib
// (feed.ts) and the plain-Node feed scripts (src/lib/feeds), which can't
// import TypeScript directly.

import { marked } from 'marked';

export function renderBody(body) {
  if (!body?.trim()) return undefined;
  return marked.parse(body.trim(), { async: false });
}
