// RSS 2.0 renderer — stream renderer: FeedItem[] → Response.
//
// The item mapping mirrors the legacy feed.xml.ts exactly (title
// fallback to the capitalized type, description from summary or body,
// full HTML in content:encoded, tags as categories) so swapping the
// page endpoint over is behavior-preserving.

import rss from '@astrojs/rss';

export const SITE_TITLE = 'Andy Stevens';
export const SITE_DESCRIPTION =
  'Poetry, writing, and web development by Andy Stevens.';

export function renderRss(
  items,
  { site, title = SITE_TITLE, description = SITE_DESCRIPTION }
) {
  return rss({
    title,
    description,
    site,
    items: items.map((item) => ({
      title: item.title || cap(item.feedType),
      pubDate: item.date ? new Date(item.date) : new Date(0),
      description: item.summary || item.bodyHtml || '',
      link: item.url,
      categories: item.tags,
      content: item.bodyHtml || '',
    })),
    customData: '<language>en-us</language>',
  });
}

function cap(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
