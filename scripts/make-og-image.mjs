// Genererer det statiske Open Graph-billede (1200x630) til marketing-sitet.
// Kør manuelt når design/tagline ændres: node scripts/make-og-image.mjs
// Resultatet (src/assets/img/og-image.png) er committet, så build kræver ikke sharp.
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { mkdirSync } from 'node:fs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'src', 'assets', 'img');
const out = join(outDir, 'og-image.png');
const INK = '#11352b';
const FONT = 'font-family="Helvetica Neue, Helvetica, Arial, sans-serif"';

// Elly: samme paths som {% elly %}-shortcoden i eleventy.config.cjs.
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#F3FAF6"/>
  <rect y="606" width="1200" height="24" fill="#1c7a4d"/>
  <g transform="translate(70 120) scale(3.1)">
    <path d="M70 6 L30 62 L56 62 L46 114 L94 48 L66 48 Z" fill="#FFD23F" stroke="${INK}" stroke-width="4.5" stroke-linejoin="round"/>
    <circle cx="55" cy="44" r="8" fill="#fff" stroke="${INK}" stroke-width="2"/>
    <circle cx="73" cy="44" r="8" fill="#fff" stroke="${INK}" stroke-width="2"/>
    <circle cx="57" cy="46" r="3.4" fill="${INK}"/><circle cx="75" cy="46" r="3.4" fill="${INK}"/>
    <path d="M54 56 Q64 64 74 56" stroke="${INK}" stroke-width="3" fill="none" stroke-linecap="round"/>
  </g>
  <text x="430" y="250" ${FONT} font-size="112" font-weight="800" fill="${INK}">I stødet</text>
  <text x="434" y="340" ${FONT} font-size="44" font-weight="600" fill="${INK}">Se hvornår strømmen er billig,</text>
  <text x="434" y="398" ${FONT} font-size="44" font-weight="600" fill="${INK}">og spar på det du alligevel bruger</text>
  <text x="434" y="500" ${FONT} font-size="34" font-weight="600" fill="#1c7a4d">i-stødet.dk</text>
</svg>`;

mkdirSync(outDir, { recursive: true });
await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(out);
console.log('make-og-image: ' + out);
