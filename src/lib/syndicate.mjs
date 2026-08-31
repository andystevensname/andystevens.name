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

// The ledger lives in the Bunny state bucket; without it there's no dedup, so
// the delivery scripts skip rather than post blind (which would risk dupes).
export function ledgerConfigured() {
  return Boolean(
    process.env.BUNNY_STATE_BUCKET_NAME && process.env.BUNNY_STATE_ACCESS_KEY
  );
}

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
//   seedIds    : non-null ONLY on cold start — the BACK-CATALOGUE ids to seal
//                into the ledger so they're never replayed. It deliberately
//                EXCLUDES the fresh candidates: those must be recorded only
//                after they actually send, so a failed delivery retries on the
//                next deploy instead of being silently sealed as "done".
export async function selectUnsyndicated(posts, target, wants) {
  const opted = posts.filter((p) => wants(p));
  const ledger = await getSyndicatedIds(target);

  if (ledger.size === 0) {
    const now = Date.now();
    const fresh = opted.filter(
      (p) => now - new Date(p.published).getTime() < COLD_START_GRACE_MS
    );
    const freshIds = new Set(fresh.map(postId));
    const backCatalogue = opted
      .filter((p) => !freshIds.has(postId(p)))
      .map(postId);
    return { candidates: fresh, seedIds: backCatalogue };
  }

  const candidates = opted.filter((p) => !ledger.has(postId(p)));
  return { candidates, seedIds: null };
}

// Drives the shared ledger-delivery protocol for one syndication target so
// each script only has to supply the genuinely target-specific bits:
//   wants(post)      → is this post opted into `target`?
//   setup()          → optional one-time prep (e.g. a Bluesky session), run
//                      only when there's actually something to deliver.
//   send(post, ctx)  → deliver one post; return truthy if it landed (record
//                      it) or falsy if not (leave it out so it retries). A
//                      thrown error is treated as "did not land".
//
// The invariants that were easy to get wrong live here, once: seal the
// cold-start back-catalogue but never the fresh candidates; record only what
// actually delivered; and write the ledger exactly once per run (the seal and
// the successes are merged into a single PUT).
export async function runSyndication({ target, label, posts, wants, send, setup }) {
  const { candidates, seedIds } = await selectUnsyndicated(posts, target, wants);

  // Starts with the cold-start back-catalogue (sealed so it's never replayed)
  // and accumulates successfully-delivered candidates; flushed once at the end.
  const toRecord = seedIds ? [...seedIds] : [];
  if (seedIds) {
    console.log(
      `${label}: cold start — sealed ${seedIds.length} back-catalogue post(s) into the ledger`
    );
  }

  if (candidates.length === 0) {
    if (!seedIds) console.log(`No new items opted into ${label} syndication`);
    await addSyndicatedIds(target, toRecord);
    return;
  }

  let ctx;
  try {
    ctx = setup ? await setup() : undefined;
  } catch (e) {
    // Setup failed (e.g. auth): seal the back-catalogue, deliver nothing, let
    // the candidates retry next deploy.
    console.warn(`${label}: setup failed, skipping delivery this run:`, e.message);
    await addSyndicatedIds(target, toRecord);
    return;
  }

  for (const post of candidates) {
    try {
      if (await send(post, ctx)) toRecord.push(postId(post));
    } catch (e) {
      console.warn(
        `${label}: delivery failed for ${post.url}, will retry next deploy:`,
        e.message
      );
    }
  }

  await addSyndicatedIds(target, toRecord);
}
