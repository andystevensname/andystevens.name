import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const blog = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    date: z.coerce.date().optional(),
    published: z.boolean().optional().default(true),
    tags: z.array(z.string()).optional().default([]),
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
    'bookmark-of': z.string(),
    date: z.coerce.date().optional(),
    published: z.boolean().optional().default(true),
    tags: z.array(z.string()).optional().default([]),
    slug: z.string().optional(),
  }),
});

const likes = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/likes' }),
  schema: z.object({
    'like-of': z.string(),
    date: z.coerce.date().optional(),
    published: z.boolean().optional().default(true),
    slug: z.string().optional(),
  }),
});

const notes = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/notes' }),
  schema: z.object({
    date: z.coerce.date().optional(),
    published: z.boolean().optional().default(true),
    tags: z.array(z.string()).optional().default([]),
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
    slug: z.string().optional(),
  }),
});

const replies = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/replies' }),
  schema: z.object({
    'in-reply-to': z.string(),
    date: z.coerce.date().optional(),
    published: z.boolean().optional().default(true),
    tags: z.array(z.string()).optional().default([]),
    slug: z.string().optional(),
  }),
});

export const collections = { blog, pages, bookmarks, likes, notes, photos, replies };
