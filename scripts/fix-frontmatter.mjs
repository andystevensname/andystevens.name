// One-shot: normalize content frontmatter that js-yaml (Astro/gray-matter)
// tolerates but the spec-strict `yaml` package (Sveltia CMS) rejects —
// notably Flickr-import multiline double-quoted strings whose
// continuation lines sit at column 0. Re-serializes only files that
// fail strict parsing; everything else is left byte-identical.

import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const jsyaml = require('js-yaml');
const YAML = require('yaml');

const ROOT = 'src/content';
let fixed = 0;
let failed = 0;

const entries = await readdir(ROOT, { recursive: true, withFileTypes: true });
for (const e of entries) {
  if (!e.isFile() || !e.name.endsWith('.md')) continue;
  const path = join(e.parentPath, e.name);
  const raw = await readFile(path, 'utf8');
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) continue;
  const [, fm, body] = m;
  try {
    YAML.parse(fm, { strict: true });
    continue; // strict parser is happy — leave the file alone
  } catch {
    /* needs normalizing */
  }
  let data;
  try {
    data = jsyaml.load(fm); // lenient read, same as the site build
  } catch (err) {
    console.error(`UNFIXABLE (js-yaml also rejects): ${path}: ${err.message}`);
    failed++;
    continue;
  }
  const newFm = YAML.stringify(data, { lineWidth: 0 }).trimEnd();
  YAML.parse(newFm, { strict: true }); // sanity: output must round-trip
  await writeFile(path, `---\n${newFm}\n---\n${body}`);
  console.log(`fixed: ${path}`);
  fixed++;
}
console.log(`\n${fixed} file(s) normalized, ${failed} unfixable`);
if (failed > 0) process.exit(1);
