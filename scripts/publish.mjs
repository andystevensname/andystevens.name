// Usage:
//   node scripts/publish.mjs <collection> <slug>
//   node scripts/publish.mjs articles hello-fediverse
//   node scripts/publish.mjs notes good-morning
//   node scripts/publish.mjs likes cool-post-i-saw
//
// Calls the deployed /api/deliver endpoint to fan out a single post to
// followers (or to send a Like to its target). Run after deploy — manual by
// design so edits to old posts don't re-spam followers.

const [collection, slug] = process.argv.slice(2);
if (!collection || !slug) {
  console.error('usage: node scripts/publish.mjs <collection> <slug>');
  process.exit(1);
}

const domain = process.env.AP_DOMAIN;
const secret = process.env.AP_DELIVER_SECRET;
if (!domain || !secret) {
  console.error('Set AP_DOMAIN and AP_DELIVER_SECRET in your environment');
  process.exit(1);
}

const res = await fetch(`https://${domain}/api/deliver`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${secret}`,
  },
  body: JSON.stringify({ slug, collection }),
});

const data = await res.json().catch(() => ({}));
console.log(res.status, data);
if (!res.ok) process.exit(1);
