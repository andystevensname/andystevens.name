#!/usr/bin/env node

/**
 * Flickr Photo Import Script
 *
 * Reads Flickr export JSON files, uploads photos to Akamai Object Storage,
 * and generates Astro content collection Markdown files.
 *
 * Usage:
 *   node scripts/import-flickr.mjs [--dry-run] [--skip-upload]
 *
 * Flags:
 *   --dry-run      Print what would be done without writing files or uploading
 *   --skip-upload  Generate markdown but don't upload photos (if already uploaded)
 */

import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, extname } from 'node:path';
import { execSync } from 'node:child_process';

const JSON_DIR = join(process.env.HOME, 'Downloads/72157724649497329_4f2df6987d82_part1');
const PHOTO_DIRS = [
  join(process.env.HOME, 'Downloads/data-download-1'),
  join(process.env.HOME, 'Downloads/data-download-2'),
];
const OUTPUT_DIR = join(process.cwd(), 'src/content/photos');
const BUCKET = 'media.andystevens.name';
const BUCKET_HOST = BUCKET;
const BUCKET_URL = `http://${BUCKET_HOST}`;
const S3_BUCKET = `s3://${BUCKET}`;

const DRY_RUN = process.argv.includes('--dry-run');
const SKIP_UPLOAD = process.argv.includes('--skip-upload');

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function findPhotoFile(id, name) {
  const slug = slugify(name);
  for (const dir of PHOTO_DIRS) {
    try {
      const files = execSync(`ls "${dir}"`, { encoding: 'utf-8' }).split('\n');
      const match = files.find((f) => f.includes(`_${id}_`));
      if (match) return join(dir, match);
    } catch {
      continue;
    }
  }
  return null;
}

function parseGeo(geo) {
  if (!geo || !geo.length) return null;
  const { latitude, longitude } = geo[0];
  // Flickr stores as integers, divide by 1e6 for decimal degrees
  const lat = parseInt(latitude) / 1e6;
  const lng = parseInt(longitude) / 1e6;
  if (isNaN(lat) || isNaN(lng)) return null;
  return { latitude: lat, longitude: lng };
}

function escapeYaml(str) {
  if (!str) return '""';
  if (str.includes('"') || str.includes(':') || str.includes('#') || str.includes('\n')) {
    return `"${str.replace(/"/g, '\\"')}"`;
  }
  return `"${str}"`;
}

async function main() {
  const jsonFiles = (await readdir(JSON_DIR)).filter((f) => f.startsWith('photo_') && f.endsWith('.json'));
  console.log(`Found ${jsonFiles.length} photo JSON files`);

  if (!existsSync(OUTPUT_DIR)) {
    await mkdir(OUTPUT_DIR, { recursive: true });
  }

  let imported = 0;
  let skipped = 0;
  let errors = 0;

  for (const jsonFile of jsonFiles) {
    try {
      const raw = await readFile(join(JSON_DIR, jsonFile), 'utf-8');
      const data = JSON.parse(raw);

      // Skip private photos
      if (data.privacy !== 'public') {
        skipped++;
        continue;
      }

      const id = data.id;
      const slug = `${slugify(data.name || id)}-${id}`;
      const ext = extname(data.original || '.jpg');
      const remotePath = `photos/${id}${ext}`;
      const photoUrl = `${BUCKET_URL}/${remotePath}`;

      // Find local photo file
      const localFile = findPhotoFile(id, data.name || id);
      if (!localFile) {
        console.warn(`  SKIP: No photo file found for ${id} (${data.name})`);
        skipped++;
        continue;
      }

      // Upload to Akamai
      if (!SKIP_UPLOAD && !DRY_RUN) {
        console.log(`  Uploading ${localFile} -> ${remotePath}`);
        try {
          execSync(`s3cmd put "${localFile}" "${S3_BUCKET}/${remotePath}" --acl-public`, {
            encoding: 'utf-8',
            stdio: 'pipe',
          });
        } catch (e) {
          console.error(`  ERROR uploading ${id}: ${e.message}`);
          errors++;
          continue;
        }
      } else if (DRY_RUN) {
        console.log(`  DRY RUN: Would upload ${localFile} -> ${remotePath}`);
      }

      // Build frontmatter
      const tags = (data.tags || []).map((t) => t.tag);
      const albums = (data.albums || []).map((a) => a.title);
      const geo = parseGeo(data.geo);
      const hasAlbums = albums.length > 0;

      let frontmatter = '---\n';
      frontmatter += `title: ${escapeYaml(data.name)}\n`;
      frontmatter += `photo: ${escapeYaml(photoUrl)}\n`;
      if (data.description) {
        frontmatter += `alt: ${escapeYaml(data.description)}\n`;
      }
      frontmatter += `date: ${data.date_taken}\n`;
      frontmatter += `published: ${hasAlbums ? 'false' : 'true'}\n`;
      if (tags.length) {
        frontmatter += `tags:\n${tags.map((t) => `  - ${escapeYaml(t)}`).join('\n')}\n`;
      }
      if (albums.length) {
        frontmatter += `albums:\n${albums.map((a) => `  - ${escapeYaml(a)}`).join('\n')}\n`;
      }
      if (data.license) {
        frontmatter += `license: ${escapeYaml(data.license)}\n`;
      }
      if (geo) {
        frontmatter += `geo:\n  latitude: ${geo.latitude}\n  longitude: ${geo.longitude}\n`;
      }
      if (data.photopage) {
        frontmatter += `flickr_url: ${escapeYaml(data.photopage)}\n`;
      }
      frontmatter += `slug: ${escapeYaml(slug)}\n`;
      frontmatter += '---\n';

      const outputFile = join(OUTPUT_DIR, `${slug}.md`);

      if (DRY_RUN) {
        console.log(`  DRY RUN: Would write ${outputFile}`);
        console.log(frontmatter);
      } else {
        await writeFile(outputFile, frontmatter);
        console.log(`  Created ${slug}.md`);
      }

      imported++;
    } catch (e) {
      console.error(`  ERROR processing ${jsonFile}: ${e.message}`);
      errors++;
    }
  }

  console.log(`\nDone. Imported: ${imported}, Skipped: ${skipped}, Errors: ${errors}`);
}

main();
