// Generate a Gemini capsule (dist-gemini/) from the source markdown
// posts. Runs after `astro build`. The output is what gets baked into
// the Gemini server container image; one image per deploy carries
// whatever was current at build time.
//
// Markdown → gemtext conversion is done with marked's lexer (we already
// depend on marked). Block types map straightforwardly; inline emphasis
// is flattened (gemtext has no inline markup) and links/images are
// pulled out into link lines after the paragraph they appeared in.

import { readdir, readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { existsSync } from 'node:fs';
import { marked } from 'marked';
import matter from 'gray-matter';

const COLLECTIONS = [
  { dir: 'articles', label: 'Articles' },
  { dir: 'notes', label: 'Notes' },
  { dir: 'writing', label: 'Writing' },
  { dir: 'bookmarks', label: 'Bookmarks' },
  { dir: 'replies', label: 'Replies' },
  { dir: 'awards', label: 'Awards' },
  { dir: 'albums', label: 'Albums' },
];

const OUT = 'dist-gemini';
const CONTENT_ROOT = 'src/content';

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

function tokensToGemtext(tokens) {
  const lines = [];
  for (const t of tokens) {
    switch (t.type) {
      case 'heading': {
        const depth = Math.min(t.depth, 3);
        lines.push('#'.repeat(depth) + ' ' + inlineText(t.tokens));
        lines.push('');
        for (const l of extractLinks(t.tokens)) {
          lines.push(`=> ${l.href} ${l.text}`);
        }
        break;
      }
      case 'paragraph': {
        lines.push(inlineText(t.tokens));
        const links = extractLinks(t.tokens);
        if (links.length) {
          lines.push('');
          for (const l of links) lines.push(`=> ${l.href} ${l.text}`);
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
        const inner = tokensToGemtext(t.tokens);
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
            lines.push(`=> ${l.href} ${l.text}`);
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

// ───── per-post + per-collection generation ─────────────────────────────

async function readPost(collection, filename) {
  const raw = await readFile(
    join(CONTENT_ROOT, collection, filename),
    'utf8'
  );
  const { data, content } = matter(raw);
  return { frontmatter: data, body: content, filename };
}

function postSlug(post) {
  return post.frontmatter.slug || post.filename.replace(/\.mdx?$/, '');
}

function postDate(post) {
  const d = post.frontmatter.date || post.frontmatter.published;
  if (!d) return null;
  const date = d instanceof Date ? d : new Date(d);
  return Number.isFinite(date.getTime()) ? date : null;
}

function isPublished(post) {
  return post.frontmatter.published !== false;
}

function fmt(date) {
  if (!date) return '';
  return date.toISOString().slice(0, 10);
}

async function loadCollection(collection) {
  const dir = join(CONTENT_ROOT, collection);
  if (!existsSync(dir)) return [];
  const files = await readdir(dir);
  const posts = [];
  for (const f of files) {
    if (!/\.mdx?$/.test(f)) continue;
    posts.push(await readPost(collection, f));
  }
  return posts
    .filter(isPublished)
    .sort((a, b) => {
      const da = postDate(a)?.getTime() ?? 0;
      const db = postDate(b)?.getTime() ?? 0;
      return db - da;
    });
}

function renderPost(post, collection) {
  const fm = post.frontmatter;
  const title = fm.title || postSlug(post);
  const date = postDate(post);
  const lines = [];
  lines.push(`# ${title}`);
  lines.push('');
  if (date) lines.push(`Published: ${fmt(date)}`);
  if (fm.description) lines.push(`${fm.description}`);

  // Collection-specific context
  if (fm.bookmark_of) lines.push(`=> ${fm.bookmark_of} Bookmark of: ${fm.bookmark_of}`);
  if (fm.in_reply_to) lines.push(`=> ${fm.in_reply_to} In reply to: ${fm.in_reply_to}`);
  if (fm.like_of) lines.push(`=> ${fm.like_of} Liked: ${fm.like_of}`);
  if (fm.url && collection === 'writing') lines.push(`=> ${fm.url} Originally published`);

  lines.push('');
  lines.push(tokensToGemtext(marked.lexer(post.body)));
  lines.push('───────────────────────');
  lines.push(`=> /${collection}/ All ${collection}`);
  lines.push('=> / Home');
  return lines.join('\n');
}

function renderCollectionIndex(collectionLabel, collection, posts) {
  const lines = [];
  lines.push(`# ${collectionLabel}`);
  lines.push('');
  if (posts.length === 0) {
    lines.push('Nothing here yet.');
  } else {
    for (const p of posts) {
      const date = postDate(p);
      const slug = postSlug(p);
      const datePrefix = date ? `${fmt(date)} ` : '';
      lines.push(`=> /${collection}/${slug}.gmi ${datePrefix}${p.frontmatter.title || slug}`);
    }
  }
  lines.push('');
  lines.push('───────────────────────');
  lines.push('=> / Home');
  return lines.join('\n');
}

function renderHomeIndex(allPosts) {
  const lines = [];
  lines.push('# andystevens.name');
  lines.push('');
  lines.push('Welcome to the Gemini capsule mirror of andystevens.name.');
  lines.push('');
  lines.push('## Recent posts');
  lines.push('');
  for (const { post, collection } of allPosts.slice(0, 20)) {
    const date = postDate(post);
    const slug = postSlug(post);
    const datePrefix = date ? `${fmt(date)} ` : '';
    lines.push(
      `=> /${collection}/${slug}.gmi ${datePrefix}${post.frontmatter.title || slug}`
    );
  }
  lines.push('');
  lines.push('## All collections');
  lines.push('');
  for (const c of COLLECTIONS) {
    lines.push(`=> /${c.dir}/ ${c.label}`);
  }
  lines.push('');
  lines.push('───────────────────────');
  lines.push('=> https://andystevens.name The web version of this site');
  return lines.join('\n');
}

// ───── main ──────────────────────────────────────────────────────────────

await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });

const all = [];

for (const { dir, label } of COLLECTIONS) {
  const posts = await loadCollection(dir);
  await mkdir(join(OUT, dir), { recursive: true });
  for (const post of posts) {
    const slug = postSlug(post);
    const path = join(OUT, dir, `${slug}.gmi`);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, renderPost(post, dir));
    all.push({ post, collection: dir });
  }
  await writeFile(
    join(OUT, dir, 'index.gmi'),
    renderCollectionIndex(label, dir, posts)
  );
  console.log(`  ${dir}: ${posts.length} posts`);
}

all.sort((a, b) => {
  const da = postDate(a.post)?.getTime() ?? 0;
  const db = postDate(b.post)?.getTime() ?? 0;
  return db - da;
});

await writeFile(join(OUT, 'index.gmi'), renderHomeIndex(all));
console.log(`Gemtext generated for ${all.length} posts across ${COLLECTIONS.length} collections.`);
