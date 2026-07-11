// Copy the Sveltia CMS bundle from node_modules into public/admin/ so the
// admin page is fully self-hosted — it handles OAuth tokens, so it should
// not load script from a third-party CDN. Runs via the npm `prebuild`
// hook; the copied file is gitignored (npm owns the version via the
// @sveltia/cms dependency, which Renovate keeps fresh).

import { copyFile, mkdir } from 'node:fs/promises';

await mkdir('public/admin', { recursive: true });
await copyFile(
  'node_modules/@sveltia/cms/dist/sveltia-cms.js',
  'public/admin/sveltia-cms.js'
);
console.log('Copied sveltia-cms.js to public/admin/');
await copyFile(
  'node_modules/@sveltia/cms/dist/sveltia-cms.js.map',
  'public/admin/sveltia-cms.js.map'
);
console.log('Copied sveltia-cms.js.map to public/admin/');
