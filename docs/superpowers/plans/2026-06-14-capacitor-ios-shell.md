# Capacitor iOS-shell — Implementeringsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pakke den eksisterende «I stødet»-PWA ind som en native iOS-app via Capacitor, der kører i iOS-simulator med bundlede assets, native HTTP og Elly-ikon — uden regression på web/PWA.

**Architecture:** Capacitor-wrapper, iOS-only, samme repo. De 13 runtime-filer kopieres til `www/` (Capacitors `webDir`) og bundles i app'en. `CapacitorHttp` routes `fetch` gennem native networking (ingen CORS). Service worker registreres kun på web, ikke i native. Web-deploy (rsync fra repo-root) er uændret.

**Tech Stack:** Capacitor (seneste stabile — v6/v7; config-formatet i denne plan er kompatibelt med begge) (@capacitor/core, /ios, /cli, /splash-screen, /status-bar, /app, /assets), Node 26, Xcode 26.5, CocoaPods, sharp (SVG→PNG til ikon/splash), node:test.

**Spec:** `docs/superpowers/specs/2026-06-13-capacitor-ios-shell-design.md`

---

## Filstruktur

| Fil | Ansvar | Ny/ændret |
|-----|--------|-----------|
| `scripts/runtime-files.mjs` | Kanonisk liste over de 13 runtime-filer (én kilde for www-build) | Ny |
| `scripts/runtime-files.test.mjs` | Verificér listen = 13 filer, alle findes på disk | Ny |
| `scripts/build-www.mjs` | Kopiér runtime-filer → `www/` | Ny |
| `scripts/build-www.test.mjs` | Verificér `www/` får alle filer med matchende indhold | Ny |
| `scripts/make-assets.mjs` | Rasterisér Elly-SVG → ikon (1024) + splash (2732) PNG'er | Ny |
| `assets/icon-source.svg` | Elly på brand-baggrund, kilde til ikon/splash | Ny |
| `capacitor.config.json` | appId, appName, webDir, CapacitorHttp | Ny |
| `package.json` | + Capacitor-deps + cap-scripts | Ændret |
| `.gitignore` | + `www/`, `ios/App/Pods/`, `ios/App/App/public/` | Ændret |
| `index.html:1645` | SW-guard: kun web, ikke native | Ændret |
| `ios/` | Capacitor Xcode-projekt | Genereret, committed (minus Pods) |
| `www/` | Bundlede web-assets | Genereret, gitignored |

**Kanonisk runtime-fils-liste (13):** `index.html`, `pricing.js`, `gamify.js`, `eloverblik.js`, `forbrug-analyse.js`, `co2.js`, `sw.js`, `manifest.webmanifest`, `icon-192.png`, `icon-512.png`, `apple-touch-icon.png`, `favicon.ico`, `robots.txt`.

---

## Task 1: Installér CocoaPods (prerequisite)

CocoaPods mangler på maskinen og kræves af Capacitor til iOS.

**Files:** ingen (miljø)

- [ ] **Step 1: Installér CocoaPods via Homebrew**

Run: `brew install cocoapods`

- [ ] **Step 2: Verificér**

Run: `pod --version`
Expected: et versionsnummer (fx `1.15.2`), ingen fejl.

- [ ] **Step 3: Verificér Xcode-kommandolinje peger på fuld Xcode**

Run: `xcode-select -p`
Expected: `/Applications/Xcode.app/Contents/Developer` (ikke `.../CommandLineTools`). Hvis forkert: `sudo xcode-select -s /Applications/Xcode.app/Contents/Developer`.

---

## Task 2: Kanonisk runtime-fils-liste (DRY)

Én kilde for «hvad shipper» så www-build og deploy ikke divergerer.

**Files:**
- Create: `scripts/runtime-files.mjs`
- Test: `scripts/runtime-files.test.mjs`

- [ ] **Step 1: Write the failing test**

```js
// scripts/runtime-files.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { RUNTIME_FILES } from './runtime-files.mjs';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

test('RUNTIME_FILES indeholder de 13 filer', () => {
  assert.equal(RUNTIME_FILES.length, 13);
});

test('alle runtime-filer findes i repo-roden', () => {
  for (const f of RUNTIME_FILES) {
    assert.ok(existsSync(join(repoRoot, f)), `mangler: ${f}`);
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test scripts/runtime-files.test.mjs`
Expected: FAIL — `Cannot find module './runtime-files.mjs'`.

- [ ] **Step 3: Write the implementation**

```js
// scripts/runtime-files.mjs
// Kanonisk liste over filer der bundles i app'en OG deployes til web.
// Holdes i sync med deploy-listen i CLAUDE.md.
export const RUNTIME_FILES = [
  'index.html',
  'pricing.js',
  'gamify.js',
  'eloverblik.js',
  'forbrug-analyse.js',
  'co2.js',
  'sw.js',
  'manifest.webmanifest',
  'icon-192.png',
  'icon-512.png',
  'apple-touch-icon.png',
  'favicon.ico',
  'robots.txt',
];
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test scripts/runtime-files.test.mjs`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add scripts/runtime-files.mjs scripts/runtime-files.test.mjs
git commit -m "build: canonical runtime-files manifest for www bundling"
```

---

## Task 3: build-www.mjs — kopiér assets til www/

**Files:**
- Create: `scripts/build-www.mjs`
- Test: `scripts/build-www.test.mjs`

- [ ] **Step 1: Write the failing test**

```js
// scripts/build-www.test.mjs
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { RUNTIME_FILES } from './runtime-files.mjs';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const wwwDir = join(repoRoot, 'www');

test('build-www kopierer alle runtime-filer til www/', () => {
  execFileSync('node', ['scripts/build-www.mjs'], { cwd: repoRoot });
  for (const f of RUNTIME_FILES) {
    assert.ok(existsSync(join(wwwDir, f)), `mangler i www/: ${f}`);
  }
});

test('www/index.html er identisk med kilden', () => {
  execFileSync('node', ['scripts/build-www.mjs'], { cwd: repoRoot });
  assert.equal(
    readFileSync(join(wwwDir, 'index.html'), 'utf8'),
    readFileSync(join(repoRoot, 'index.html'), 'utf8'),
  );
});

after(() => rmSync(wwwDir, { recursive: true, force: true }));
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test scripts/build-www.test.mjs`
Expected: FAIL — `Cannot find module ... build-www.mjs` (execFileSync kaster).

- [ ] **Step 3: Write the implementation**

```js
// scripts/build-www.mjs
// Kopierer de kanoniske runtime-filer til www/ (Capacitors webDir).
// Kør før `npx cap sync ios`.
import { mkdirSync, copyFileSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { RUNTIME_FILES } from './runtime-files.mjs';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const wwwDir = join(repoRoot, 'www');

rmSync(wwwDir, { recursive: true, force: true });
mkdirSync(wwwDir, { recursive: true });
for (const f of RUNTIME_FILES) {
  copyFileSync(join(repoRoot, f), join(wwwDir, f));
}
console.log(`build-www: kopierede ${RUNTIME_FILES.length} filer → www/`);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test scripts/build-www.test.mjs`
Expected: PASS (2 tests).

- [ ] **Step 5: Verificér hele suiten stadig grøn**

Run: `node --test`
Expected: alle tests passerer (76 eksisterende + 4 nye = 80).

- [ ] **Step 6: Commit**

```bash
git add scripts/build-www.mjs scripts/build-www.test.mjs
git commit -m "build: build-www.mjs copies runtime files to www/ (Capacitor webDir)"
```

---

## Task 4: Capacitor-deps, config, scripts, gitignore

**Files:**
- Modify: `package.json`
- Create: `capacitor.config.json`
- Modify: `.gitignore`

- [ ] **Step 1: Installér Capacitor-afhængigheder**

Run:
```bash
npm install @capacitor/core @capacitor/app @capacitor/splash-screen @capacitor/status-bar
npm install --save-dev @capacitor/cli @capacitor/ios @capacitor/assets sharp
```
Expected: installeret uden fejl; `node_modules/@capacitor/` findes.

- [ ] **Step 2: Tilføj cap-scripts til package.json**

Erstat `scripts`-blokken i `package.json` med:
```json
  "scripts": {
    "test": "node --test",
    "cap:assets": "node scripts/build-www.mjs",
    "cap:icons": "node scripts/make-assets.mjs && npx @capacitor/assets generate --ios",
    "cap:sync": "npm run cap:assets && npx cap sync ios",
    "cap:open": "npx cap open ios"
  },
```

- [ ] **Step 3: Opret capacitor.config.json**

```json
{
  "appId": "dk.alfanova.istoedet",
  "appName": "I stødet",
  "webDir": "www",
  "plugins": {
    "CapacitorHttp": { "enabled": true },
    "SplashScreen": {
      "launchShowDuration": 800,
      "backgroundColor": "#0b1620",
      "showSpinner": false
    },
    "StatusBar": {
      "style": "DARK",
      "backgroundColor": "#0b1620"
    }
  }
}
```

- [ ] **Step 4: Opdatér .gitignore**

Tilføj disse linjer til `.gitignore`:
```
# Capacitor
www/
ios/App/Pods/
ios/App/App/public/
DerivedData/
```

- [ ] **Step 5: Verificér Capacitor CLI virker**

Run: `npx cap --version`
Expected: et versionsnummer (fx `6.x`).

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json capacitor.config.json .gitignore
git commit -m "build: add Capacitor deps, config, scripts, gitignore"
```

---

## Task 5: Service worker-guard (kun web, ikke native)

**Files:**
- Modify: `index.html:1645`

- [ ] **Step 1: Ændr SW-registreringen**

Find linjen:
```js
if('serviceWorker' in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{}));}
```
Erstat med:
```js
if(!window.Capacitor?.isNativePlatform() && 'serviceWorker' in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{}));}
```

- [ ] **Step 2: Verificér guarden er på plads**

Run: `grep -n "isNativePlatform() && 'serviceWorker'" index.html`
Expected: ét hit på linje ~1645.

- [ ] **Step 3: Verificér ingen test-regression**

Run: `node --test`
Expected: alle tests passerer (80).

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "feat: skip service worker registration in native Capacitor context"
```

---

## Task 6: Scaffold iOS-projektet

**Files:**
- Create: `ios/` (genereret af Capacitor)

- [ ] **Step 1: Byg www/ og tilføj iOS-platformen**

Run:
```bash
npm run cap:assets
npx cap add ios
```
Expected: `ios/App/App.xcworkspace` oprettes; CocoaPods installerer pods uden fejl.

- [ ] **Step 2: Sync**

Run: `npx cap sync ios`
Expected: «sync» fuldfører; `www/` kopieres til `ios/App/App/public/`.

- [ ] **Step 3: Verificér projektet findes**

Run: `ls ios/App/App.xcworkspace`
Expected: stien findes.

- [ ] **Step 4: Commit (Pods ekskluderet via .gitignore)**

```bash
git add ios capacitor.config.json
git commit -m "feat: scaffold Capacitor iOS project"
```

---

## Task 7: Elly app-ikon + splash

iOS-ikon skal være 1024×1024 uigennemsigtigt. Vi rasteriserer Elly-SVG'en med sharp og lader `@capacitor/assets` generere hele sættet.

**Files:**
- Create: `assets/icon-source.svg`
- Create: `scripts/make-assets.mjs`

- [ ] **Step 1: Opret Elly-ikon-SVG (1024, uigennemsigtig brand-baggrund)**

```xml
<!-- assets/icon-source.svg -->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
  <rect width="1024" height="1024" fill="#EAF7EF"/>
  <g transform="translate(232,212) scale(4.66)">
    <path d="M70 6 L30 62 L56 62 L46 114 L94 48 L66 48 Z" fill="#FFD23F" stroke="#11352b" stroke-width="4.5" stroke-linejoin="round"/>
    <circle cx="55" cy="44" r="8" fill="#fff" stroke="#11352b" stroke-width="2"/>
    <circle cx="73" cy="44" r="8" fill="#fff" stroke="#11352b" stroke-width="2"/>
    <circle cx="57" cy="46" r="3.4" fill="#11352b"/>
    <circle cx="75" cy="46" r="3.4" fill="#11352b"/>
    <path d="M54 56 Q64 64 74 56" stroke="#11352b" stroke-width="3" fill="none" stroke-linecap="round"/>
  </g>
</svg>
```

- [ ] **Step 2: Opret make-assets.mjs (SVG → PNG-kilder til @capacitor/assets)**

```js
// scripts/make-assets.mjs
// Rasteriserer Elly-SVG'en til de PNG-kilder @capacitor/assets forventer i assets/.
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const assets = join(root, 'assets');
const svg = readFileSync(join(assets, 'icon-source.svg'));
const BG = '#EAF7EF';

// Ikon: 1024×1024 uigennemsigtigt
await sharp(svg, { density: 384 }).resize(1024, 1024).flatten({ background: BG })
  .png().toFile(join(assets, 'icon-only.png'));

// Splash: 2732×2732, Elly centreret på brand-baggrund (logo ~40% bredde)
const logo = await sharp(svg, { density: 384 }).resize(1100, 1100).png().toBuffer();
const splash = sharp({ create: { width: 2732, height: 2732, channels: 3, background: BG } })
  .composite([{ input: logo, gravity: 'center' }]).png();
await splash.clone().toFile(join(assets, 'splash.png'));
await splash.clone().toFile(join(assets, 'splash-dark.png'));

console.log('make-assets: icon-only.png + splash(.dark).png genereret');
```

- [ ] **Step 3: Generér iOS-ikon/splash-sættet**

Run: `npm run cap:icons`
Expected: `@capacitor/assets` skriver ikoner + splash ind i `ios/App/App/Assets.xcassets/` uden fejl.

- [ ] **Step 4: Verificér ikon-output**

Run: `ls ios/App/App/Assets.xcassets/AppIcon.appiconset/`
Expected: PNG-ikoner genereret (inkl. en 1024-fil).

- [ ] **Step 5: Inspicér ikon-kilden visuelt før build**

Konvertér og se kilden:
Run: `node scripts/make-assets.mjs && open assets/icon-only.png`
Expected: Elly (gul lyn-bolt med øjne) centreret på lys mint baggrund, ingen afklipning. (Juster `translate`/`scale` i `icon-source.svg` hvis bolten ikke er centreret.)

- [ ] **Step 6: Sync + commit**

```bash
npx cap sync ios
git add assets scripts/make-assets.mjs ios/App/App/Assets.xcassets
git commit -m "feat: Elly app icon + splash via @capacitor/assets"
```

---

## Task 8: Safe areas (notch + home-indicator)

WKWebView med `viewport-fit=cover` eksponerer `env(safe-area-inset-*)`. Sikr at indhold — især bund-nav'en — ikke ligger under notch/home-indicator.

**Files:**
- Modify: `index.html` (CSS i `<style>`-blokken)

- [ ] **Step 1: Find bund-nav'ens selector**

Run: `grep -n "Forbrug\|Point\|navbar\|bottom-nav\|tabbar" index.html | head`
Find container-elementet for bund-navigationen (Nu/Forbrug/Point/Mere) og dets CSS-klasse.

- [ ] **Step 2: Tilføj safe-area-padding**

I `<style>`-blokken (efter de eksisterende base-regler, fx nær linje 48), tilføj — erstat `.NAVCLASS` med den faktiske klasse fundet i Step 1:
```css
  /* iOS safe-areas (Capacitor WKWebView, viewport-fit=cover) */
  body{padding-top:env(safe-area-inset-top)}
  .NAVCLASS{padding-bottom:calc(8px + env(safe-area-inset-bottom))}
```
(Hvis bund-nav'en allerede har `padding-bottom`, læg `env(safe-area-inset-bottom)` til den eksisterende værdi i stedet.)

- [ ] **Step 3: Verificér ingen test-regression**

Run: `node --test`
Expected: alle tests passerer (80).

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "fix: respect iOS safe-area insets for status bar and bottom nav"
```

---

## Task 9: Byg + kør i simulator — netværks-verifikation (kritisk risiko)

CapacitorHttp routes `fetch` native. Den primære integrationsrisiko er at pris- og Eloverblik-kald parser identisk.

**Files:** ingen (verifikation)

- [ ] **Step 1: Sync seneste assets**

Run: `npm run cap:sync`
Expected: ingen fejl.

- [ ] **Step 2: Byg + kør i simulator**

Run: `npx cap run ios --target="$(xcrun simctl list devices available | grep -m1 -oE 'iPhone [0-9]+[^(]*' | xargs)"` — eller åbn `npm run cap:open` og kør en iPhone-simulator fra Xcode.
Expected: app'en bygger, simulatoren starter, «I stødet» loader.

- [ ] **Step 3: Verificér pris-data henter (native HTTP)**

I den kørende simulator: bekræft at spotpriser vises (ikke «Henter elpriser…»-hæng). Tag screenshot:
Run: `xcrun simctl io booted screenshot /tmp/istoedet-sim-prices.png`
Læs `/tmp/istoedet-sim-prices.png` og bekræft pris + graf renderer.

- [ ] **Step 4: Verificér Eloverblik-flow (Bearer-token via native HTTP)**

I simulatoren: åbn settings/wizard og gennemfør Eloverblik-forbindelse med et gyldigt token. Bekræft at forbrugs-data hentes. Hvis et kald fejler: se fallback i spec (eksplicit `CapacitorHttp.request()` for det specifikke kald). Tag + læs screenshot.

- [ ] **Step 5: Tjek WKWebView-console for fejl**

I Xcode (eller Safari → Develop → Simulator → I stødet): bekræft ingen JS/console-fejl, særligt ingen CORS- eller import-fejl.

- [ ] **Step 6: (Ingen commit — ren verifikation. Noter resultater i Task 10.)**

---

## Task 10: Endelig acceptance + ingen web-regression

**Files:** ingen (verifikation) / evt. `docs/superpowers/specs/...` for noter

- [ ] **Step 1: Kør acceptance-tjeklisten i simulator**

Bekræft hver (tag + LÆS screenshots — et screenshot er ikke en inspektion):
- [ ] App launcher, «I stødet» loader (ikke skeleton-hæng)
- [ ] Live spotpriser vises (native HTTP)
- [ ] Eloverblik-flow virker (token-header bevaret)
- [ ] Tema-skift (soft/bold/play) virker
- [ ] Safe-areas korrekte: intet under notch/home-indicator; bund-nav fri
- [ ] Elly-ikon (hjemmeskærm) + splash vises
- [ ] Ingen console-fejl

- [ ] **Step 2: Verificér INGEN web/PWA-regression**

Run: `node --test`
Expected: alle tests grønne (80).

Run: `grep -n "isNativePlatform" index.html`
Expected: SW-guarden findes — dvs. web beholder SW (guarden er false på web → SW registreres).

Bekræft web-deploy er uændret: `rsync`-kommandoen i CLAUDE.md kører fra repo-root og rører ikke `www/`/`ios/`.

- [ ] **Step 3: Verificér build-artefakter ikke er committet ved en fejl**

Run: `git status --short`
Expected: rent træ; `www/` og `ios/App/Pods/` er IKKE tracked (gitignored).

- [ ] **Step 4: Slut-commit (hvis docs/noter ændret)**

```bash
git add -A
git commit -m "docs: capacitor iOS shell verified in simulator"
```

---

## Self-review-noter (udfyldt af planlæggeren)

- **Spec-dækning:** Approach A (bundlede assets + CapacitorHttp) → Task 3/4/6/9. SW-guard → Task 5. Ikon/splash (Elly) → Task 7. Safe areas → Task 8. App-identitet (navn/bundle ID) → Task 4. Acceptance-kriterier → Task 10. Ingen-regression → Task 3/5/10. Alle spec-sektioner har en task.
- **Afgrænsning:** notifikationer/widget/Game Center/CloudKit/Android/publicering eksplicit UDE (spec §«IKKE i scope») — ingen tasks for dem her. ✓
- **Type-konsistens:** `RUNTIME_FILES` defineret i Task 2, brugt i Task 3. `www/` som webDir konsistent (Task 3/4/6). Scripts (`cap:assets`/`cap:icons`/`cap:sync`/`cap:open`) defineret i Task 4, brugt i 6/7/9. ✓
- **Kendt åbenhed:** Task 8 Step 1/2 kræver at finde den faktiske nav-selector (investigativt men med konkret fix-mønster) — ikke en placeholder, men en bevidst inspektion mod live DOM.
