// Trigger the push-fanout Netlify Function after a successful deploy.
// The function holds the cursor logic and the send loop — build plugins
// don't get Netlify Blobs auth automatically, so the work has to live
// in function context. Same pattern as deliver-to-activitypub.

export const onSuccess = async function () {
  const secret = process.env.PUSH_FANOUT_SECRET;
  const domain = process.env.AP_DOMAIN;

  if (!secret || !domain) {
    console.log('PUSH_FANOUT_SECRET or AP_DOMAIN not set, skipping push notifications');
    return;
  }

  try {
    const res = await fetch(`https://${domain}/.netlify/functions/push-fanout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${secret}` },
    });
    const body = await res.text();
    if (res.ok) {
      console.log(`Push fanout: ${body}`);
    } else {
      console.warn(`Push fanout failed (${res.status}): ${body}`);
    }
  } catch (e) {
    console.warn('Push fanout error:', e.message);
  }
};
