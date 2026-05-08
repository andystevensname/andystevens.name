import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as fontkit from 'fontkit';
import { Resvg } from '@resvg/resvg-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const FONT_PATH = path.join(ROOT, 'public/fonts/BebasNeue-Regular.woff2');
const OUT_DIR = path.join(ROOT, 'public');

// Mirrors --home-stops in src/styles/global.css. [h, s, l, position%].
const HOME_STOPS = [
  [199, 100, 50, 0], [196, 100, 50, 12], [193, 100, 50, 22],
  [190, 100, 49, 31], [185, 100, 46, 40], [178, 100, 44, 48],
  [170, 100, 45, 55], [162, 100, 46, 63], [148, 86, 56, 70],
  [114, 83, 68, 78], [86, 86, 62, 85], [68, 86, 55, 93],
  [55, 100, 50, 100],
];
const GRADIENT_ANGLE_DEG = 35; // matches CSS linear-gradient(35deg, ...)
const FOREGROUND = '#212121';

function hslToHex(h, s, l) {
  s /= 100; l /= 100;
  const k = (n) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => {
    const c = l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return Math.round(c * 255).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

// Compute SVG gradient endpoints to match a CSS `linear-gradient(angleDeg, …)`.
// CSS 0deg = up; positive = clockwise. Length spans the full bbox projection.
function gradientEndpoints(size, angleDeg) {
  const t = (angleDeg * Math.PI) / 180;
  const dx = Math.sin(t);
  const dy = -Math.cos(t);
  const half = (Math.abs(size * Math.sin(t)) + Math.abs(size * Math.cos(t))) / 2;
  const c = size / 2;
  return { x1: c - dx * half, y1: c - dy * half, x2: c + dx * half, y2: c + dy * half };
}

const font = fontkit.openSync(FONT_PATH);
const run = font.layout('AS');
const totalAdvance = run.positions.reduce((s, p) => s + p.xAdvance, 0);
const capUnits = font.capHeight || font.ascent * 0.72;

function buildSvg({ size, contentRatio, withLine = true }) {
  // Composition stack: AS (capH) + (gap 0.20 capH + line 0.13 capH if withLine).
  const stemRatio = 0.13;
  const gapRatio = 0.20;
  const totalRatio = withLine ? 1 + gapRatio + stemRatio : 1;

  const compHeight = size * contentRatio;
  const capPx = compHeight / totalRatio;
  const stemPx = capPx * stemRatio;
  const gapPx = capPx * gapRatio;
  const fontScale = capPx / capUnits;
  const asWidth = totalAdvance * fontScale;

  const cx = size / 2;
  const cy = size / 2;
  const compTop = cy - compHeight / 2;
  const baseline = compTop + capPx;
  const lineTop = baseline + gapPx;

  let glyphSvg = '';
  let x = cx - asWidth / 2;
  for (let i = 0; i < run.glyphs.length; i++) {
    const g = run.glyphs[i];
    const p = g.path.scale(fontScale, -fontScale).translate(x, baseline);
    glyphSvg += `<path d="${p.toSVG()}"/>`;
    x += run.positions[i].xAdvance * fontScale;
  }

  const lineSvg = withLine
    ? `<rect x="${(cx - asWidth / 2).toFixed(2)}" y="${lineTop.toFixed(2)}" width="${asWidth.toFixed(2)}" height="${stemPx.toFixed(2)}" rx="${(stemPx / 2).toFixed(2)}"/>`
    : '';

  const gl = gradientEndpoints(size, GRADIENT_ANGLE_DEG);
  const stops = HOME_STOPS
    .map(([h, s, l, p]) => `<stop offset="${p}%" stop-color="${hslToHex(h, s, l)}"/>`)
    .join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
  <defs>
    <linearGradient id="bg" gradientUnits="userSpaceOnUse" x1="${gl.x1.toFixed(2)}" y1="${gl.y1.toFixed(2)}" x2="${gl.x2.toFixed(2)}" y2="${gl.y2.toFixed(2)}">${stops}</linearGradient>
  </defs>
  <rect width="${size}" height="${size}" fill="url(#bg)"/>
  <g fill="${FOREGROUND}">
    ${glyphSvg}
    ${lineSvg}
  </g>
</svg>`;
}

function renderPng(svg, size) {
  const r = new Resvg(svg, { fitTo: { mode: 'width', value: size } });
  return r.render().asPng();
}

async function rasterize(svg, outPath, size) {
  await fs.writeFile(outPath, renderPng(svg, size));
}

// ICO: 6-byte header + N×16-byte directory entries + concatenated PNGs.
function encodeIco(pngs, sizes) {
  const n = pngs.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); header.writeUInt16LE(1, 2); header.writeUInt16LE(n, 4);
  const dir = Buffer.alloc(n * 16);
  let offset = 6 + n * 16;
  for (let i = 0; i < n; i++) {
    const sz = sizes[i], png = pngs[i], e = i * 16;
    dir.writeUInt8(sz === 256 ? 0 : sz, e);
    dir.writeUInt8(sz === 256 ? 0 : sz, e + 1);
    dir.writeUInt16LE(1, e + 4);
    dir.writeUInt16LE(32, e + 6);
    dir.writeUInt32LE(png.length, e + 8);
    dir.writeUInt32LE(offset, e + 12);
    offset += png.length;
  }
  return Buffer.concat([header, dir, ...pngs]);
}

const SIZE = 512;
const regularSvg = buildSvg({ size: SIZE, contentRatio: 0.70 });
const maskableSvg = buildSvg({ size: SIZE, contentRatio: 0.55 });

await fs.writeFile(path.join(OUT_DIR, 'icon.svg'), regularSvg);
await fs.writeFile(path.join(OUT_DIR, 'icon-maskable.svg'), maskableSvg);

await rasterize(regularSvg, path.join(OUT_DIR, 'icon-192.png'), 192);
await rasterize(regularSvg, path.join(OUT_DIR, 'icon-512.png'), 512);
await rasterize(maskableSvg, path.join(OUT_DIR, 'icon-maskable-512.png'), 512);
await rasterize(regularSvg, path.join(OUT_DIR, 'apple-touch-icon.png'), 180);

// Favicon: no underline, AS sized to fill more of the canvas for legibility at small px.
const faviconSvg = buildSvg({ size: SIZE, contentRatio: 0.72, withLine: false });
await fs.writeFile(path.join(OUT_DIR, 'favicon.svg'), faviconSvg);
const faviconSizes = [16, 32, 48];
const faviconPngs = faviconSizes.map((s) => renderPng(faviconSvg, s));
await fs.writeFile(path.join(OUT_DIR, 'favicon.ico'), encodeIco(faviconPngs, faviconSizes));

console.log('Wrote: icon.svg, icon-maskable.svg, icon-192.png, icon-512.png, icon-maskable-512.png, apple-touch-icon.png, favicon.svg, favicon.ico');
