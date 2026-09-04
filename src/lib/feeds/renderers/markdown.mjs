// Markdown source renderer — file renderer: FeedItem[] → { relpath: body }.
//
// Emits the original source file next to each post's URL
// (dist/{collection}/{slug}.md) — the "raw source" link convention.
//
// Keeping the *original* file (frontmatter included) means zero loss and
// trivial mirroring, so the renderer doesn't rebuild documents: the
// caller supplies readSource(collection, slug) → raw file contents (or
// null when the file can't be found, in which case the item's body
// markdown is emitted as a fallback).

export function renderMarkdownSources(items, readSource) {
  const files = new Map();
  const stats = { fromSource: 0, fallback: 0 };
  for (const item of items) {
    const source = readSource(item.collection, item.slug);
    if (source !== null) {
      files.set(`${item.collection}/${item.slug}.md`, source);
      stats.fromSource++;
    } else {
      files.set(`${item.collection}/${item.slug}.md`, item.markdown);
      stats.fallback++;
    }
  }
  return { files, stats };
}
