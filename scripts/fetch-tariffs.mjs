// Henter netselskabernes tariffer fra Energi Data Service (DatahubPricelist) og
// skriver dem til src/app/tariffs.json, som følger med appen (web + iOS).
//
// Hvorfor: API'et sender ingen CORS-headers, så web-appen kan ikke hente dem selv
// uden /eds-proxyen. Denne fil giver appen API'ets tariffer pr. seneste deploy,
// inklusive de kommende perioder, netselskaberne allerede har meldt ind.
// Rækkefølgen i appen er: frisk live-hentning → denne fil → den statiske tabel i pricing.js.
//
// Kør: npm run tariffs  (kører også som første trin i npm run deploy).
// Fejler et netselskab eller hele API'et, beholdes de forrige data, og scriptet
// afslutter med kode 0, så et deploy aldrig stopper på grund af tarifferne.
import { readFile, writeFile } from 'node:fs/promises';
import { DSO_TARIFFS, datahubURL, liveFromDatahub, validLive } from '../src/app/pricing.js';

const OUT = new URL('../src/app/tariffs.json', import.meta.url);
const since = new Date(Date.now() - 400 * 864e5).toISOString().slice(0, 10);
const sleep = ms => new Promise(r => setTimeout(r, ms));

let previous = {};
try { previous = JSON.parse(await readFile(OUT, 'utf8')).dso || {}; } catch { /* first run */ }

const dso = { ...previous };
let updated = 0;
for (const key of Object.keys(DSO_TARIFFS)) {
  try {
    const r = await fetch(datahubURL(key, since));
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const periods = liveFromDatahub((await r.json()).records || [], DSO_TARIFFS[key].datahub.codes);
    if (!validLive(periods)) throw new Error('ingen gyldige perioder');
    dso[key] = periods;
    updated++;
    const last = periods[periods.length - 1];
    console.log(`[tariffs] ${key}: ${periods.length} perioder, seneste fra ${last.from}`);
  } catch (e) {
    console.warn(`[tariffs] ${key}: beholder forrige data (${e.message})`);
  }
  await sleep(3500);   // API'et tillader kun få kald ad gangen
}

if (updated) {
  await writeFile(OUT, JSON.stringify({ fetched: new Date().toISOString().slice(0, 10), dso }) + '\n');
  console.log(`[tariffs] skrev ${updated}/${Object.keys(DSO_TARIFFS).length} netselskaber til src/app/tariffs.json`);
} else {
  console.warn('[tariffs] intet hentet, src/app/tariffs.json er uændret');
}
