import { buildActor } from '../../src/lib/activitypub.mjs';

export default async (request) => {
  const actor = buildActor();
  return new Response(JSON.stringify(actor), {
    status: 200,
    headers: {
      'Content-Type': 'application/activity+json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=300',
    },
  });
};
