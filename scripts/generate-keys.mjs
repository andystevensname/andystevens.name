// Run once: node scripts/generate-keys.mjs
//
// The two halves go to different places:
//   AP_PUBLIC_KEY  -> Forgejo Actions secret on andy/andystevens.name. The
//                     build inlines it into the static actor JSON via
//                     scripts/generate-static-ap.mjs.
//   AP_PRIVATE_KEY -> Bunny Edge Script environment variable, NOT a Forgejo
//                     secret. HTTP signatures are produced in the edge script
//                     (edge-script/handlers/), never during the build — see
//                     the "Deliberately NO AP_PRIVATE_KEY" note in
//                     .forgejo/workflows/build.yaml.
//
// Preserve the \n newlines when pasting; src/lib/activitypub.mjs normalizes
// escaped variants, but intact PEM is what it expects.

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
console.log('AP_PUBLIC_KEY -> Forgejo Actions secret; AP_PRIVATE_KEY -> Bunny Edge Script env.');
console.log('Keep the private key secret. Do not commit it.');
