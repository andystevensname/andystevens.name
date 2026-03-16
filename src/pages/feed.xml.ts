import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';

export async function GET(context: APIContext) {
  const posts = await getCollection('blog', ({ data }) => data.published !== false);

  posts.sort((a, b) => {
    const aDate = a.data.date?.getTime() ?? 0;
    const bDate = b.data.date?.getTime() ?? 0;
    return bDate - aDate;
  });

  return rss({
    title: 'Andy Stevens',
    description: 'Poetry, writing, and web development by Andy Stevens.',
    site: context.site!.href,
    items: posts.map((post) => ({
      title: post.data.title,
      pubDate: post.data.date,
      description: post.data.description,
      link: `/blog/${post.id}/`,
      categories: post.data.tags,
    })),
    customData: `<language>en-us</language>`,
  });
}
