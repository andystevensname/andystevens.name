// Shared syndication gating for the runner-side delivery scripts
// (deliver-to-bluesky, deliver-to-activitypub). Replaces the old
// "published within the last hour" window, which silently dropped any
// date-only post (frontmatter `date: YYYY-MM-DD` → midnight UTC) that
// wasn't deployed within the hour.
//
// Model: a per-target ledger of already-syndicated post ids (see
// storage.mjs). Each run syndicates the opted-in posts NOT yet in the
// ledger, then records the ones that succeeded — so a transient outage at
// the target retries on the next deploy instead of dropping the post.

import { getSyndicatedIds, addSyndicatedIds } from './storage.mjs';

// Cold-start grace: on the FIRST run for a target (no ledger file yet) we
// must NOT replay the whole back-catalogue. We seal every existing opted-in
// post into the ledger and only release those published within this window —
// so deploying this change still syndicates the just-published post without
// blasting the archive. After the first run the ledger is authoritative and
// this window is irrelevant.
const COLD_START_GRACE_MS = 48 * 60 * 60 * 1000;

// Ledger identity: the canonical post URL — stable, unique, and legible when
// eyeballing the stored JSON.
export const postId = (p) => p.url;

// Returns { candidates, seedIds }.
//   candidates : posts to syndicate this run.
//   seedIds    : non-null ONLY on cold start — the full set of opted-in ids
//                to write into the ledger so the back-catalogue is sealed
//                (the caller records these regardless of per-item send
//                outcome; it's a one-time seal).
export async function selectUnsyndicated(posts, target, wants) {
  const opted = posts.filter((p) => wants(p));
  const ledger = await getSyndicatedIds(target);

  if (ledger.size === 0) {
    const now = Date.now();
    const fresh = opted.filter(
      (p) => now - new Date(p.published).getTime() < COLD_START_GRACE_MS
    );
    return { candidates: fresh, seedIds: opted.map(postId) };
  }

  const candidates = opted.filter((p) => !ledger.has(postId(p)));
  return { candidates, seedIds: null };
}

// Record ids into a target's ledger. Caller passes seedIds on cold start, or
// the ids of successfully-sent posts on a normal run.
export async function recordSyndicated(target, ids) {
  await addSyndicatedIds(target, ids);
}
