// Shared push-send logic, imported by edge-script/handlers/push-fanout.

import webpush from 'web-push';
import { listPushSubscriptions, removePushSubscription } from './storage.mjs';

export function buildPayload(post) {
  if (post.apType === 'Like') {
    return {
      title: 'New like',
      body: post.likeTarget || '',
      url: post.url,
      tag: post.url,
    };
  }
  return {
    title: post.title || 'New post',
    body: post.summary || post.description || '',
    url: post.url,
    tag: post.url,
  };
}

export function configureVapid() {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject) return false;
  webpush.setVapidDetails(subject, publicKey, privateKey);
  return true;
}

export async function sendForPosts(posts) {
  if (!posts.length) return { sent: 0, pruned: 0, skipped: 'no-posts' };
  const subs = await listPushSubscriptions();
  if (!subs.length) return { sent: 0, pruned: 0, skipped: 'no-subscribers' };

  let sent = 0;
  let pruned = 0;
  for (const post of posts) {
    const payload = JSON.stringify(buildPayload(post));
    const results = await Promise.allSettled(
      subs.map((sub) => webpush.sendNotification({ endpoint: sub.endpoint, keys: sub.keys }, payload))
    );
    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      if (r.status === 'fulfilled') {
        sent++;
      } else {
        const status = r.reason?.statusCode;
        if (status === 404 || status === 410) {
          await removePushSubscription(subs[i].endpoint);
          pruned++;
        } else {
          console.warn(`Push send failed (${status ?? 'no status'}): ${r.reason?.body || r.reason?.message}`);
        }
      }
    }
  }
  return { sent, pruned, posts: posts.length };
}
