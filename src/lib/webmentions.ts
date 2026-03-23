const DOMAIN = 'andystevens.name';
const BASE_URL = `https://webmention.${DOMAIN}`;

export interface Webmention {
  source: string;
  target: string;
  author?: {
    name?: string;
    picture?: string;
  };
  content?: string;
  published?: string;
  url?: string;
  type?: string;
}

export async function fetchWebmentions(): Promise<Webmention[]> {
  const token = import.meta.env.GO_JAMMING_TOKEN;
  if (!token) {
    console.warn('GO_JAMMING_TOKEN not set, skipping webmention fetch');
    return [];
  }

  try {
    const res = await fetch(`${BASE_URL}/webmention/${DOMAIN}/${token}`);
    if (!res.ok) {
      console.warn(`Webmention fetch failed: ${res.status}`);
      return [];
    }
    const data = await res.json();
    return data.json ?? data ?? [];
  } catch (e) {
    console.warn('Webmention fetch error:', e);
    return [];
  }
}

export function getWebmentionsForUrl(mentions: Webmention[], url: string): Webmention[] {
  const normalized = url.replace(/\/$/, '');
  return mentions.filter((m) => {
    const target = m.target?.replace(/\/$/, '');
    return target === normalized || target === `${normalized}/`;
  });
}

export function groupWebmentions(mentions: Webmention[]) {
  const likes = mentions.filter((m) => m.type === 'like');
  const reposts = mentions.filter((m) => m.type === 'repost');
  const replies = mentions.filter((m) => m.type === 'reply' || (!m.type && m.content));
  const other = mentions.filter((m) => !m.type && !m.content);

  return { likes, reposts, replies, other };
}
