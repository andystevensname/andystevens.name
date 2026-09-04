// JSON Feed 1.1 renderer (https://jsonfeed.org) — stream renderer:
// FeedItem[] → object. The endpoint serializes it.
//
// Maps onto the spec's item fields: id/url/date_published always;
// title, summary_text, content_html, content_text, tags, image, and
// external_url when the item carries them.

import { SITE_TITLE, SITE_DESCRIPTION } from './rss.mjs';

export function renderJsonFeed(
  items,
  { site, title = SITE_TITLE, description = SITE_DESCRIPTION }
) {
  const home = site.replace(/\/$/, '');
  return {
    version: 'https://jsonfeed.org/version/1.1',
    title,
    home_page_url: `${home}/`,
    feed_url: `${home}/feed.json`,
    description,
    language: 'en-us',
    items: items.map((item) => {
      const entry = {
        id: item.url,
        url: item.url,
        date_published: item.date,
      };
      if (item.title) entry.title = item.title;
      if (item.summary) entry.summary_text = item.summary;
      if (item.bodyHtml) {
        entry.content_html = item.bodyHtml;
        entry.content_text = item.bodyHtml.replace(/<[^>]*>/g, '');
      }
      if (item.tags?.length) entry.tags = item.tags;
      if (item.image) {
        entry.image = item.image.src;
      }
      if (item.linkTo) entry.external_url = item.linkTo;
      return entry;
    }),
  };
}
