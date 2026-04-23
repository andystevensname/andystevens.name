// HTTP Signatures (Cavage draft-12, which Mastodon uses).
// This is the *critical* piece: if signatures are wrong, Mastodon will
// silently drop your requests with a 401 or just ignore them.
//
// What we sign on outbound: (request-target), host, date, digest
// What we verify on inbound: same, by fetching the sender's public key.

import { createSign, createVerify, createHash } from 'node:crypto';

/**
 * Sign an outgoing POST (for delivering activities to follower inboxes).
 *
 * @param {object} opts
 * @param {string} opts.url - Full target inbox URL
 * @param {string} opts.body - JSON-stringified body
 * @param {string} opts.privateKey - PEM-encoded RSA private key
 * @param {string} opts.keyId - Your public key ID (e.g. "https://andystevens.name/ap/actor#main-key")
 * @returns {Record<string,string>} Headers to include in the fetch call
 */
export function signRequest({ url, body, privateKey, keyId }) {
  const u = new URL(url);
  const date = new Date().toUTCString();
  const digest = 'SHA-256=' + createHash('sha256').update(body).digest('base64');

  const signingString = [
    `(request-target): post ${u.pathname}${u.search}`,
    `host: ${u.host}`,
    `date: ${date}`,
    `digest: ${digest}`,
  ].join('\n');

  const signer = createSign('RSA-SHA256');
  signer.update(signingString);
  signer.end();
  const signature = signer.sign(privateKey).toString('base64');

  const signatureHeader = [
    `keyId="${keyId}"`,
    `algorithm="rsa-sha256"`,
    `headers="(request-target) host date digest"`,
    `signature="${signature}"`,
  ].join(',');

  return {
    Host: u.host,
    Date: date,
    Digest: digest,
    Signature: signatureHeader,
    'Content-Type': 'application/activity+json',
    Accept: 'application/activity+json',
  };
}

/**
 * Verify an incoming signed request.
 * Fetches the sender's actor to get their public key, then verifies.
 *
 * @param {Request} request - The incoming Request object
 * @param {string} rawBody - The raw request body (must be read before this)
 * @returns {Promise<{valid: boolean, actor?: string, reason?: string}>}
 */
export async function verifyRequest(request, rawBody) {
  const sigHeader = request.headers.get('signature');
  if (!sigHeader) return { valid: false, reason: 'missing signature header' };

  const parts = parseSignatureHeader(sigHeader);
  if (!parts.keyId || !parts.signature || !parts.headers) {
    return { valid: false, reason: 'malformed signature header' };
  }

  // Verify digest matches the body we received
  const expectedDigest =
    'SHA-256=' + createHash('sha256').update(rawBody).digest('base64');
  const actualDigest = request.headers.get('digest');
  if (actualDigest && actualDigest !== expectedDigest) {
    return { valid: false, reason: 'digest mismatch' };
  }

  // Fetch the actor to get their public key
  // Strip the fragment (#main-key) to get the actor URL
  const actorUrl = parts.keyId.split('#')[0];
  let actor;
  try {
    const res = await fetch(actorUrl, {
      headers: { Accept: 'application/activity+json' },
    });
    if (!res.ok) {
      return { valid: false, reason: `actor fetch ${res.status}` };
    }
    actor = await res.json();
  } catch (e) {
    return { valid: false, reason: `actor fetch error: ${e.message}` };
  }

  const publicKeyPem = actor?.publicKey?.publicKeyPem;
  if (!publicKeyPem) return { valid: false, reason: 'no public key on actor' };

  // Reconstruct the signing string from the header list
  const u = new URL(request.url);
  const lines = parts.headers.split(' ').map((h) => {
    if (h === '(request-target)') {
      return `(request-target): ${request.method.toLowerCase()} ${u.pathname}${u.search}`;
    }
    return `${h}: ${request.headers.get(h) ?? ''}`;
  });
  const signingString = lines.join('\n');

  const verifier = createVerify('RSA-SHA256');
  verifier.update(signingString);
  verifier.end();

  const valid = verifier.verify(
    publicKeyPem,
    Buffer.from(parts.signature, 'base64')
  );

  return valid
    ? { valid: true, actor: actor.id }
    : { valid: false, reason: 'signature verification failed' };
}

function parseSignatureHeader(header) {
  const out = {};
  // Format: keyId="...",algorithm="...",headers="...",signature="..."
  const regex = /(\w+)="([^"]*)"/g;
  let match;
  while ((match = regex.exec(header)) !== null) {
    out[match[1]] = match[2];
  }
  return out;
}
