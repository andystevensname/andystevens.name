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

console.log('Fetching latest release …');
const releasesRes = await fetch(
  `https://api.bunny.net/compute/script/${scriptId}/releases?perPage=1`,
  { method: 'GET', headers }
);
if (!releasesRes.ok) {
  console.error(
    `Release lookup failed: ${releasesRes.status} ${await releasesRes.text()}`
  );
  process.exit(1);
}
const releasesBody = await releasesRes.json();
// Bunny pagination responses typically use Items[] with a Uuid per item.
const latest = releasesBody.Items?.[0] ?? releasesBody[0];
const uuid = latest?.Uuid ?? latest?.uuid;
if (!uuid) {
  console.error(
    'Could not extract release UUID from response:',
    JSON.stringify(releasesBody).slice(0, 500)
  );
  process.exit(1);
}

console.log(`Publishing release ${uuid} …`);
const publishRes = await fetch(
  `https://api.bunny.net/compute/script/${scriptId}/publish/${uuid}`,
  {
    method: 'POST',
    headers,
    body: JSON.stringify({ Note: `deploy ${new Date().toISOString()}` }),
  }
);
if (!publishRes.ok) {
  console.error(
    `Publish failed: ${publishRes.status} ${await publishRes.text()}`
  );
  process.exit(1);
}
console.log('Edge Script released.');
