// Genererer PWA'ens maskable ikon (512x512): fuld baggrund uden afrundede hjørner
// og lynet skaleret ind i den sikre zone (midterste 80 %), så Android kan beskære
// det til cirkel/squircle uden at klippe motivet.
// Kør manuelt når ikonet ændres: node scripts/make-maskable-icon.mjs
// Resultatet (src/app/icon-maskable-512.png) er committet, så build kræver ikke sharp.
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'app', 'icon-maskable-512.png');

// Samme lyn og farver som icon-512.png, skaleret til 68 % omkring centrum.
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#104a3a"/><stop offset="1" stop-color="#0a231b"/>
  </linearGradient></defs>
  <rect width="512" height="512" fill="url(#g)"/>
  <g transform="translate(256 256) scale(0.68) translate(-256 -256)">
    <polygon points="297,50 155,272 240,272 215,465 368,232 280,232" fill="#F5C04A"/>
  </g>
</svg>`;

await sharp(Buffer.from(svg)).png().toFile(out);
console.log('skrev', out);
