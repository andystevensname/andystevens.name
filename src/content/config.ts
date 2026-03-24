import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const syndication = z.array(z.string()).optional().default([]);

const blog = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    quote: z.string().optional(),
    date: z.coerce.date().optional(),
    published: z.boolean().optional().default(true),
    tags: z.array(z.string()).optional().default([]),
    syndication,
    slug: z.string().optional(),
  }),
});

const pages = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/pages' }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    slug: z.string().optional(),
  }),
});

const bookmarks = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/bookmarks' }),
  schema: z.object({
    title: z.string().optional(),
    bookmark_of: z.string(),
    date: z.coerce.date().optional(),
    published: z.boolean().optional().default(true),
    tags: z.array(z.string()).optional().default([]),
    syndication,
    slug: z.string().optional(),
  }),
});

const likes = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/likes' }),
  schema: z.object({
    like_of: z.string(),
    date: z.coerce.date().optional(),
    published: z.boolean().optional().default(true),
    syndication,
    slug: z.string().optional(),
  }),
});

const notes = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/notes' }),
  schema: z.object({
    date: z.coerce.date().optional(),
    published: z.boolean().optional().default(true),
    tags: z.array(z.string()).optional().default([]),
    syndication,
    slug: z.string().optional(),
  }),
});

const photos = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/photos' }),
  schema: z.object({
    title: z.string().optional(),
    photo: z.union([z.string(), z.array(z.string())]),
    alt: z.string().optional(),
    date: z.coerce.date().optional(),
    published: z.boolean().optional().default(true),
    tags: z.array(z.string()).optional().default([]),
    albums: z.array(z.string()).optional().default([]),
    license: z.string().optional(),
    geo: z.object({
      latitude: z.number(),
      longitude: z.number(),
    }).optional(),
    flickr_url: z.string().optional(),
    syndication,
    slug: z.string().optional(),
  }),
});

const replies = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/replies' }),
  schema: z.object({
    in_reply_to: z.string(),
    date: z.coerce.date().optional(),
    published: z.boolean().optional().default(true),
    tags: z.array(z.string()).optional().default([]),
    syndication,
    slug: z.string().optional(),
  }),
});

const writing = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/writing' }),
  schema: z.object({
    title: z.string(),
    category: z.enum(['poetry', 'non-fiction', 'fiction', 'documentation']),
    venue: z.string().optional(),
    url: z.string().optional(),
    date: z.coerce.date().optional(),
    published: z.boolean().optional().default(true),
    tags: z.array(z.string()).optional().default([]),
    syndication,
    slug: z.string().optional(),
  }),
});

const awards = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/awards' }),
  schema: z.object({
    title: z.string(),
    issuer: z.string().optional(),
    date: z.coerce.date().optional(),
    published: z.boolean().optional().default(true),
    slug: z.string().optional(),
  }),
});

const albums = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/albums' }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    cover: z.string().optional(),
    date: z.coerce.date().optional(),
    published: z.boolean().optional().default(true),
    tags: z.array(z.string()).optional().default([]),
    flickr_url: z.string().optional(),
    syndication,
    slug: z.string().optional(),
  }),
});

export const collections = { blog, pages, bookmarks, likes, notes, photos, replies, writing, awards, albums };
