// Usage: node scripts/publish.mjs my-post-slug
// Calls your deployed deliver endpoint with the shared secret.
// Run this after a successful deploy to fan out a new post to followers.

const slug = process.argv[2];
if (!slug) {
  console.error('usage: node scripts/publish.mjs <slug>');
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
  body: JSON.stringify({ slug }),
});

const data = await res.json().catch(() => ({}));
console.log(res.status, data);
if (!res.ok) process.exit(1);
