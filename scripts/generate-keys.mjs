// Run once: node scripts/generate-keys.mjs
// Copy both outputs into Netlify env vars.
// Preserve the \n newlines - Netlify's UI handles multi-line values correctly
// if you paste them as-is. If you're setting via CLI, escape them.

import { generateKeyPairSync } from 'node:crypto';

const { publicKey, privateKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});

console.log('=== AP_PUBLIC_KEY ===');
console.log(publicKey);
console.log('=== AP_PRIVATE_KEY ===');
console.log(privateKey);
console.log('Paste each into its own Netlify environment variable.');
console.log('Keep the private key secret. Do not commit it.');
