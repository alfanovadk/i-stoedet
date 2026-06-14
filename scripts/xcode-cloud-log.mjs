// Henter seneste Xcode Cloud-build-status + fejl via App Store Connect API.
// Bruger samme API-nøgle som upload (.p8 i ~/.appstoreconnect/private_keys/).
// Kør: npm run xcode:log   (eller: node scripts/xcode-cloud-log.mjs)
import crypto from 'node:crypto';
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const KEY_ID = process.env.ASC_KEY_ID || '7KJMNBJ9PK';
const ISSUER_ID = process.env.ASC_ISSUER_ID || 'ff1439a3-2ab5-4187-b864-afff41d7c793';
const APP_NAME = process.env.ASC_APP_NAME || 'I stødet';
const P8 = process.env.ASC_KEY_PATH || join(homedir(), '.appstoreconnect/private_keys', `AuthKey_${KEY_ID}.p8`);
const API = 'https://api.appstoreconnect.apple.com';

// --- JWT (ES256) ---
const b64url = b => Buffer.from(b).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
function jwt() {
  const key = crypto.createPrivateKey(readFileSync(P8, 'utf8'));
  const now = Math.floor(Date.now() / 1000);
  const head = b64url(JSON.stringify({ alg: 'ES256', kid: KEY_ID, typ: 'JWT' }));
  const body = b64url(JSON.stringify({ iss: ISSUER_ID, iat: now, exp: now + 900, aud: 'appstoreconnect-v1' }));
  const sig = b64url(crypto.sign('sha256', Buffer.from(`${head}.${body}`), { key, dsaEncoding: 'ieee-p1363' }));
  return `${head}.${body}.${sig}`;
}
const TOKEN = jwt();
const get = async (path) => {
  const r = await fetch(path.startsWith('http') ? path : API + path, { headers: { Authorization: `Bearer ${TOKEN}` } });
  if (!r.ok) throw new Error(`${r.status} ${r.statusText} on ${path}\n${await r.text()}`);
  return r.json();
};

// --- find Xcode Cloud-produktet for app'en ---
const products = await get('/v1/ciProducts?limit=200&include=app');
const apps = Object.fromEntries((products.included || []).filter(i => i.type === 'apps').map(a => [a.id, a.attributes.name]));
const product = products.data.find(p => {
  const appId = p.relationships?.app?.data?.id;
  return (appId && apps[appId] === APP_NAME) || p.attributes?.name === APP_NAME;
});
if (!product) {
  console.log('Fandt ikke Xcode Cloud-produkt for', JSON.stringify(APP_NAME), '— produkter:',
    products.data.map(p => p.attributes?.name).join(', '));
  process.exit(1);
}

// --- seneste build-run ---
const runs = await get(`/v1/ciProducts/${product.id}/buildRuns?limit=1&sort=-number`);
const run = runs.data[0];
if (!run) { console.log('Ingen build-runs fundet.'); process.exit(0); }
const a = run.attributes;
console.log(`\n=== Build ${a.number} — ${a.executionProgress} / ${a.completionStatus || '—'} ===`);
console.log(`startet: ${a.createdDate} · årsag: ${a.startReason || '—'}`);

// --- actions + issues ---
const actions = await get(`/v1/ciBuildRuns/${run.id}/actions`);
for (const act of actions.data) {
  const aa = act.attributes;
  const mark = aa.completionStatus === 'SUCCEEDED' ? '✅' : (aa.completionStatus ? '❌' : '…');
  console.log(`\n${mark} ${aa.name} — ${aa.executionProgress} / ${aa.completionStatus || '—'}` +
    (aa.issueCounts ? ` (errors:${aa.issueCounts.errors || 0} warnings:${aa.issueCounts.warnings || 0})` : ''));
  if (aa.completionStatus && aa.completionStatus !== 'SUCCEEDED') {
    try {
      const issues = await get(`/v1/ciBuildActions/${act.id}/issues?limit=50`);
      for (const is of issues.data) {
        console.log(`   [${is.attributes.issueType}] ${(is.attributes.message || '').trim().slice(0, 1200)}`);
      }
      if (!issues.data.length) console.log('   (ingen struktureret issue — tjek artifact-loggen i App Store Connect)');
    } catch (e) { console.log('   (kunne ikke hente issues:', e.message.split('\n')[0], ')'); }
  }
}
console.log('');
