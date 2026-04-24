// Serves two related endpoints:
//   /.well-known/nodeinfo  — discovery document pointing at the nodeinfo doc
//   /nodeinfo/2.0          — the nodeinfo 2.0 document itself
//
// Mastodon probes these to surface instance metadata. Not strictly required
// for federation to work, but prevents 404s when remote servers look it up.

export default async (request) => {
  const url = new URL(request.url);
  const domain = process.env.AP_DOMAIN;
  if (!domain) {
    return new Response('AP_DOMAIN not set', { status: 500 });
  }
  const base = `https://${domain}`;

  if (url.pathname === '/.well-known/nodeinfo') {
    const body = {
      links: [
        {
          rel: 'http://nodeinfo.diaspora.software/ns/schema/2.0',
          href: `${base}/nodeinfo/2.0`,
        },
      ],
    };
    return new Response(JSON.stringify(body), {
      status: 200,
      headers: {
        'Content-Type': 'application/jrd+json; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }

  const body = {
    version: '2.0',
    software: { name: 'astro-activitypub', version: '0.1.0' },
    protocols: ['activitypub'],
    services: { inbound: [], outbound: [] },
    usage: { users: { total: 1, activeMonth: 1, activeHalfyear: 1 } },
    openRegistrations: false,
    metadata: {},
  };
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      'Content-Type':
        'application/json; profile="http://nodeinfo.diaspora.software/ns/schema/2.0#"; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
    },
  });
};
