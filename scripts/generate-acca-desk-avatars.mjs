#!/usr/bin/env node
/**
 * Regenerates Acca Desk roster avatars (no "ACCA DESK" wordmark).
 * Run: node scripts/generate-acca-desk-avatars.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(path.join(root, 'backend/package.json'));
const sharp = require('sharp');
const outDir = path.join(root, 'web/public/avatars');

const RISKS = {
  sure: { from: '#0f766e', to: '#042f2e', accent: '#5eead4', label: 'SURE', initial: 'SU' },
  safe: { from: '#1d4ed8', to: '#172554', accent: '#93c5fd', label: 'SAFE', initial: 'SA' },
  medium: { from: '#b45309', to: '#1c1917', accent: '#fcd34d', label: 'MED', initial: 'MD' },
  high: { from: '#c2410c', to: '#1c1917', accent: '#fdba74', label: 'HIGH', initial: 'HI' },
};

const MARKETS = [
  { key: '1x2', mark: '1X2' },
  { key: 'dc', mark: 'DC' },
  { key: 'btts', mark: 'BTTS' },
  { key: 'o25', mark: 'O2.5' },
  { key: 'o15', mark: 'O1.5' },
  { key: 'mix', mark: 'MIX' },
];

const SIZE = 256;

function svg({ from, to, accent, label, initial, mark }) {
  const markSize = mark.length > 4 ? 52 : mark.length > 3 ? 58 : 64;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${from}"/>
      <stop offset="100%" stop-color="${to}"/>
    </linearGradient>
  </defs>
  <rect width="${SIZE}" height="${SIZE}" fill="url(#g)"/>
  <circle cx="128" cy="64" r="28" fill="${accent}"/>
  <text x="128" y="73" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="18" font-weight="800" fill="#111827">${initial}</text>
  <text x="128" y="148" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="${markSize}" font-weight="800" fill="#ffffff">${mark}</text>
  <text x="128" y="198" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="18" font-weight="700" letter-spacing="3" fill="${accent}">${label}</text>
</svg>`;
}

const files = [];
for (const [risk, palette] of Object.entries(RISKS)) {
  for (const market of MARKETS) {
    if (risk === 'high' && market.key !== 'o25' && market.key !== 'o15') continue;
    files.push({
      name: `acca_${risk}_${market.key}.png`,
      svg: svg({ ...palette, mark: market.mark }),
    });
  }
}

await fs.promises.mkdir(outDir, { recursive: true });
for (const file of files) {
  const dest = path.join(outDir, file.name);
  await sharp(Buffer.from(file.svg)).png({ compressionLevel: 9 }).toFile(dest);
  console.log(dest);
}
console.log(`Wrote ${files.length} avatars`);
