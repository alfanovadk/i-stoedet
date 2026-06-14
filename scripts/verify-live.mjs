#!/usr/bin/env node
/**
 * verify-live.js — post-deploy sanity-check mod i-stødet.dk via dev-browser.
 *
 * Køres som del af `npm run deploy` (efter rsync) og kan køres standalone:
 *   node scripts/verify-live.js
 *   VERIFY_HOST=https://xn--i-stdet-t1a.dk node scripts/verify-live.js
 *
 * Tjekker (i en RIGTIG browser via dev-browser, ikke curl):
 *   1. Alle marketing-ruter + /app/ returnerer 200
 *   2. /app/ hænger IKKE i "Henter elpriser…" (PWA bootet)
 *   3. Ingen em-dash (—) i rendered marketing-tekst (alfanova-voice-konvention)
 *
 * Exit 0 = alt grønt. Exit 1 = mindst én fejl.
 *
 * dev-browser kører scriptet i en QuickJS-sandbox (ikke Node) via stdin og
 * giver et preconnected `browser`-objekt med Playwright Page-API.
 */
import { execFileSync } from "node:child_process";

const HOST = process.env.VERIFY_HOST || "https://xn--i-stdet-t1a.dk";
const ROUTES = ["/", "/spar/", "/spar/elbil/", "/spar/opvaskemaskine/", "/spar/vaskemaskine/", "/spar/varmepumpe/", "/saadan-beregner-vi/", "/om/", "/app/"];

let DEV_BROWSER;
try {
  DEV_BROWSER = execFileSync("which", ["dev-browser"], { encoding: "utf8" }).trim();
} catch (e) {
  console.error("[verify-live] FATAL: dev-browser CLI ikke fundet i PATH.");
  process.exit(1);
}

// Marketing-ruter (alle undtagen /app/) tjekkes for em-dash.
const SCRIPT = `
const HOST = ${JSON.stringify(HOST)};
const ROUTES = ${JSON.stringify(ROUTES)};
const page = await browser.getPage("main");
const out = { routes: {}, emdash: [], appLoaded: null };

for (const r of ROUTES) {
  try {
    const resp = await page.goto(HOST + r, { waitUntil: "load", timeout: 20000 });
    out.routes[r] = resp ? resp.status() : "no-response";
    if (r !== "/app/") {
      const txt = await page.evaluate(() => document.body.innerText || "");
      if (txt.indexOf("\\u2014") !== -1) out.emdash.push(r);
    }
  } catch (e) {
    out.routes[r] = "error:" + String(e).slice(0, 80);
  }
}

// /app/ må ikke hænge i "Henter elpriser…"
await page.goto(HOST + "/app/", { waitUntil: "load", timeout: 25000 });
await new Promise((res) => setTimeout(res, 4000));
const appTxt = await page.evaluate(() => document.body.innerText || "");
out.appLoaded = !/Henter elpriser/i.test(appTxt) && /kr|kWh|øre|BILLIG|DYR/i.test(appTxt);

console.log("VERIFY_RESULT " + JSON.stringify(out));
`;

let raw;
try {
  raw = execFileSync(DEV_BROWSER, ["--browser", "istoedet-verify"], { input: SCRIPT, encoding: "utf8" });
} catch (e) {
  console.error("[verify-live] dev-browser fejlede:", String(e.stdout || e.message).slice(0, 400));
  process.exit(1);
}

const line = raw.split("\n").find((l) => l.startsWith("VERIFY_RESULT "));
if (!line) {
  console.error("[verify-live] intet resultat fra dev-browser. Output:\n", raw.slice(0, 400));
  process.exit(1);
}
const res = JSON.parse(line.slice("VERIFY_RESULT ".length));

let ok = true;
for (const [r, s] of Object.entries(res.routes)) {
  if (s === 200) console.log("✓ " + r + " 200");
  else { console.error("✗ " + r + " → " + s); ok = false; }
}
if (res.appLoaded) console.log("✓ /app/ bootede (priser vist)");
else { console.error("✗ /app/ ser ud til at hænge i 'Henter elpriser…'"); ok = false; }
if (res.emdash.length === 0) console.log("✓ ingen em-dash i marketing-tekst");
else { console.error("✗ em-dash (—) fundet i:", res.emdash.join(", ")); ok = false; }

process.exit(ok ? 0 : 1);
