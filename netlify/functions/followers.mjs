import { listFollowers } from '../../src/lib/storage.mjs';
import { config } from '../../src/lib/activitypub.mjs';

export default async (request) => {
  const c = config();
  const followers = await listFollowers();

  const collection = {
    '@context': 'https://www.w3.org/ns/activitystreams',
    id: c.followersUrl,
    type: 'OrderedCollection',
    totalItems: followers.length,
    orderedItems: followers.map((f) => f.actor),
  };

  return new Response(JSON.stringify(collection), {
    status: 200,
    headers: { 'Content-Type': 'application/activity+json; charset=utf-8' },
  });
};
