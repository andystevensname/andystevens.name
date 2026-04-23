import { verifyRequest, signRequest } from '../../src/lib/crypto.mjs';
import {
  addFollower,
  removeFollower,
  recordActivity,
  getActivity,
} from '../../src/lib/storage.mjs';
import {
  buildAcceptActivity,
  config,
} from '../../src/lib/activitypub.mjs';

export default async (request) => {
  if (request.method !== 'POST') {
    return new Response('method not allowed', { status: 405 });
  }

  // Read raw body once - we need it for digest verification AND parsing
  const rawBody = await request.text();

  // Verify signature. Mastodon requires inboxes to authenticate requests.
  const verification = await verifyRequest(request, rawBody);
  if (!verification.valid) {
    console.warn('inbox signature invalid:', verification.reason);
    return new Response('invalid signature', { status: 401 });
  }

  let activity;
  try {
    activity = JSON.parse(rawBody);
  } catch {
    return new Response('invalid json', { status: 400 });
  }

  // Idempotency: ignore activities we've already processed
  if (activity.id && (await getActivity(activity.id))) {
    return new Response('', { status: 202 });
  }
  if (activity.id) await recordActivity(activity.id, activity);

  console.log('inbox:', activity.type, 'from', verification.actor);

  try {
    switch (activity.type) {
      case 'Follow':
        await handleFollow(activity);
        break;
      case 'Undo':
        await handleUndo(activity);
        break;
      case 'Like':
      case 'Announce':
        // Stored already via recordActivity; you can query these later
        // to show reactions on your blog posts.
        break;
      case 'Create':
        // Replies to your posts. Stored; render on your post pages if you want.
        break;
      case 'Delete':
        // Sender is deleting a post or their account. Clean up if it's a follower.
        if (typeof activity.object === 'string') {
          await removeFollower(activity.object);
        }
        break;
      default:
        console.log('unhandled activity type:', activity.type);
    }
  } catch (e) {
    console.error('inbox handler error:', e);
    return new Response('server error', { status: 500 });
  }

  return new Response('', { status: 202 });
};

async function handleFollow(activity) {
  const c = config();
  // activity.actor is the follower's actor URL
  // activity.object should be our actor URL
  if (activity.object !== c.actorUrl) {
    console.warn('Follow targeted wrong actor:', activity.object);
    return;
  }

  // Fetch the follower's actor to get their inbox
  const followerActor = await fetchActor(activity.actor);
  if (!followerActor) return;

  const inbox = followerActor.inbox;
  const sharedInbox = followerActor.endpoints?.sharedInbox;
  await addFollower(activity.actor, inbox, sharedInbox);

  // Send Accept back to the follower's inbox
  const accept = buildAcceptActivity(activity);
  await postToInbox(inbox, accept);
}

async function handleUndo(activity) {
  // Undo wraps the activity being undone, typically a Follow
  const inner = activity.object;
  if (typeof inner === 'object' && inner?.type === 'Follow') {
    await removeFollower(inner.actor);
  }
}

async function fetchActor(url) {
  try {
    const res = await fetch(url, {
      headers: { Accept: 'application/activity+json' },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    console.error('fetchActor failed:', e.message);
    return null;
  }
}

async function postToInbox(inboxUrl, activity) {
  const c = config();
  const body = JSON.stringify(activity);
  const headers = signRequest({
    url: inboxUrl,
    body,
    privateKey: c.privateKey,
    keyId: c.keyId,
  });
  const res = await fetch(inboxUrl, { method: 'POST', headers, body });
  if (!res.ok) {
    console.warn(
      'inbox POST failed:',
      inboxUrl,
      res.status,
      await res.text().catch(() => '')
    );
  }
}
