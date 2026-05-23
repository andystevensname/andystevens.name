// Bundle edge-script/main.mjs into a single string, upload it to Bunny's
// Edge Scripting API, then publish the new release.
//
// Bunny's `Set Code` endpoint takes the whole script as a single "Code"
// field, so all imports (npm packages, our handlers, shared src/lib code)
// have to be inlined before the POST. node:* built-ins are externalized
// since they're available in Bunny's Deno runtime.
//
// Env:
//   BUNNY_API_KEY           — account API key (Bunny dashboard → API)
//   BUNNY_EDGE_SCRIPT_ID    — integer script ID from the dashboard URL
//                             /compute/edgescripting/{id}

import { build } from 'esbuild';

const apiKey = process.env.BUNNY_API_KEY;
const scriptId = process.env.BUNNY_EDGE_SCRIPT_ID;

if (!apiKey) {
  console.error('BUNNY_API_KEY not set');
  process.exit(1);
}
if (!scriptId) {
  console.error('BUNNY_EDGE_SCRIPT_ID not set');
  process.exit(1);
}

console.log('Bundling edge-script/main.mjs …');
const result = await build({
  entryPoints: ['edge-script/main.mjs'],
  bundle: true,
  format: 'esm',
  platform: 'neutral',
  target: 'es2022',
  write: false,
  // neutral platform ignores `main` and most conditions by default — make
  // it look for npm packages the way Node would, but prefer ESM and
  // edge/browser builds when available.
  mainFields: ['module', 'main'],
  conditions: ['workerd', 'browser', 'import', 'default'],
  // Bunny's Deno runtime provides node:* built-ins natively.
  external: ['node:*'],
  logLevel: 'info',
});
const code = result.outputFiles[0].text;
console.log(`Bundle size: ${(code.length / 1024).toFixed(1)} KB`);

const headers = {
  AccessKey: apiKey,
  'Content-Type': 'application/json',
};

console.log(`Uploading code to script ${scriptId} …`);
const uploadRes = await fetch(
  `https://api.bunny.net/compute/script/${scriptId}/code`,
  { method: 'POST', headers, body: JSON.stringify({ Code: code }) }
);
if (!uploadRes.ok) {
  console.error(
    `Upload failed: ${uploadRes.status} ${await uploadRes.text()}`
  );
  process.exit(1);
}
console.log('Code uploaded.');

// The UUID-less /publish endpoint just publishes whatever code was last
// uploaded — same call the bunny CLI's `scripts deploy` makes. The
// `/publish/{uuid}` variant is for re-publishing a specific historical
// release.
console.log('Publishing …');
const publishRes = await fetch(
  `https://api.bunny.net/compute/script/${scriptId}/publish`,
  { method: 'POST', headers, body: '{}' }
);
if (!publishRes.ok) {
  console.error(
    `Publish failed: ${publishRes.status} ${await publishRes.text()}`
  );
  process.exit(1);
}
console.log('Edge Script released.');
