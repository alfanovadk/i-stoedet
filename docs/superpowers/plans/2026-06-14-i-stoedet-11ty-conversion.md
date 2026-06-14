# i-stødet.dk → 11ty content-site + PWA under /app/ — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Write all user-facing Danish copy via the **alfanova-voice** skill (the plan provides buildable draft copy; polish it through the skill).

**Goal:** Konvertér alfanova-elpriser in-place til et 11ty content-site for i-stødet.dk med forside + besparelses-guides, mens den eksisterende PWA bevares uændret under `/app/` og Capacitor-iOS-buildet fortsat virker.

**Architecture:** 11ty 3.x (CommonJS-config i `eleventy.config.cjs`, da repoet er `type:module`) bygger marketing-sider fra `src/*.njk`. Den eksisterende runtime-PWA flyttes til `src/app/` og bruges som fælles kilde for BÅDE 11ty-passthrough (`_site/app/`) OG Capacitor-www-build (`www/`). Deploy alfanova-style (npm-scripts: build + rsync + verify) til Hetzner `websites`-serveren, proxied bag Cloudflare med allerede-oprettet CF Origin-cert.

**Tech Stack:** Eleventy ^3.0.0, @udstillerguide/11ty-media, Nunjucks, Caddy (websites-server), Cloudflare (alfanova-konto), Capacitor (iOS, uændret), Node 26.

---

## Reference-fakta (verificeret 2026-06-14)

- Domæne: i-stødet.dk · punycode `xn--i-stdet-t1a.dk` · CF-zone `ea83cb8b7df67afc0e7e0edda4db904a` (alfanova-konto `65ccd168e05b2ba750797d0ecd0dfe95`).
- Mål-server: Hetzner **websites** — Tailscale `100.64.0.4` (`ssh root@websites`), public `46.225.103.197`. Caddy aktiv, sites i `/etc/caddy/sites.d/*.caddy`, certs i `/etc/caddy/certs/<domæne>/`, docroots `/var/www/<domæne>/current/`.
- CF Origin-cert: **allerede oprettet**, i 1Password (vault udstillerguide-v3) som **"CF Origin Cert — i-stødet.dk"** — note indeholder `origin.crt` + `origin.key` (SAN: apex + `*.xn--i-stdet-t1a.dk`, udløber 2041-06-10).
- CF DNS-records (apex + www) findes allerede men peger på GreenGeeks `107.6.136.42` — skal repointes til `46.225.103.197`.
- CF API-token (1Password "Cloudflare API Token - UG3", udstillerguide-v3) har nu DNS:Edit + SSL:Edit.
- Repo er `type:module`; `www/` + `node_modules` er gitignored; `_site/` er IKKE (tilføjes).
- Capacitor: `capacitor.config.json` `webDir:"www"`; `scripts/build-www.mjs` kopierer `RUNTIME_FILES` (fra `scripts/runtime-files.mjs`) → `www/`.
- Plugin-sti virker: `file:../../ug-11ty-plugins/packages/media`.

## File Structure (efter konvertering)

```
eleventy.config.cjs          # NY — 11ty-config (CommonJS)
package.json                 # MODIFICÉR — 11ty-deps + build/deploy/verify-scripts
.gitignore                   # MODIFICÉR — tilføj _site/
src/
  _data/site.js              # NY — domæne, navn, metadata, nav
  _data/apparater.js         # NY — reference-kWh + besparelses-model (single source)
  _includes/layouts/base.njk # NY — base-layout (head, nav, footer)
  _includes/layouts/guide.njk# NY — guide-template (delt af /spar/*)
  _includes/partials/header.njk, footer.njk  # NY
  assets/css/main.css        # NY
  assets/js/site.js          # NY — lille progressive-enhancement (nav-toggle)
  assets/photos/             # NY — billeder via {% image %}
  index.njk                  # NY — forside
  spar.njk                   # NY — /spar/ oversigt
  spar/elbil.njk             # NY
  spar/opvaskemaskine.njk    # NY
  spar/vaskemaskine.njk      # NY
  spar/varmepumpe.njk        # NY
  saadan-beregner-vi.njk     # NY
  om.njk                     # NY
  404.njk                    # NY
  robots.njk                 # NY (permalink /robots.txt)
  sitemap.njk                # NY (permalink /sitemap.xml)
  app/                       # FLYTTET hertil (git mv) — PWA uændret
    index.html pricing.js gamify.js eloverblik.js forbrug-analyse.js co2.js
    sw.js manifest.webmanifest icon-192.png icon-512.png apple-touch-icon.png
    favicon.ico robots.txt
    *.test.mjs               # FLYTTET med modulerne (relative imports bevares)
scripts/
  runtime-files.mjs          # MODIFICÉR — peg på src/app/
  build-www.mjs              # MODIFICÉR — kilde = src/app/
  verify-live.js             # NY — post-deploy dev-browser-tjek
deploy/
  caddy-i-stoedet.dk.caddy   # NY — Caddy site-blok
```

---

## Phase 0 — Branch

### Task 1: Opret feature-branch

**Files:** ingen (git)

- [ ] **Step 1: Bekræft ren working tree + opret branch**

Run:
```bash
cd /Users/johannesdamsgaard-bruhn/Github/alfanova/alfanova-elpriser
git status --short
git checkout -b feat/11ty-content-site
```
Expected: ingen uncommittede ændringer (spec/plan-docs er der; commit dem i næste step), ny branch aktiv.

- [ ] **Step 2: Commit den allerede-skrevne spec + plan**

```bash
git add docs/superpowers/specs/2026-06-14-i-stoedet-11ty-conversion-design.md docs/superpowers/plans/2026-06-14-i-stoedet-11ty-conversion.md
git commit -m "docs: i-stødet.dk 11ty-conversion design + plan"
```

---

## Phase 1 — 11ty-scaffold (build virker)

### Task 2: 11ty-deps + minimal config + tom forside

**Files:**
- Modify: `package.json`
- Create: `eleventy.config.cjs`, `src/_data/site.js`, `src/_includes/layouts/base.njk`, `src/index.njk`, `.gitignore`

- [ ] **Step 1: Tilføj 11ty-deps + scripts til package.json**

Tilføj til `devDependencies`:
```json
"@11ty/eleventy": "^3.0.0",
"@11ty/eleventy-img": "^6.0.4",
"@udstillerguide/11ty-media": "file:../../ug-11ty-plugins/packages/media"
```
Erstat `scripts`-blokken med (bevar de eksisterende cap:*/ios:*/xcode-scripts):
```json
"scripts": {
  "test": "node --test",
  "dev": "eleventy --serve",
  "build": "eleventy",
  "clean": "rm -rf _site",
  "deploy": "npm run build && rsync -avz --delete _site/ root@websites:/var/www/xn--i-stdet-t1a.dk/current/ && npm run verify:live",
  "deploy:caddy": "bash scripts/deploy-caddy.sh",
  "verify:live": "node scripts/verify-live.js",
  "cap:assets": "node scripts/build-www.mjs",
  "cap:icons": "node scripts/make-assets.mjs && npx @capacitor/assets generate --ios",
  "cap:sync": "npm run cap:assets && npx cap sync ios",
  "cap:open": "npx cap open ios",
  "ios:release": "sh scripts/ios-release.sh",
  "xcode:log": "node scripts/xcode-cloud-log.mjs"
}
```

- [ ] **Step 2: Installér**

Run: `npm install`
Expected: ingen fejl; `node_modules/@11ty/eleventy` + `node_modules/@udstillerguide/11ty-media` findes.

- [ ] **Step 3: Tilføj `_site/` til .gitignore**

Tilføj linjen `_site/` til `.gitignore` (under den eksisterende `www/`).

- [ ] **Step 4: Opret `src/_data/site.js`**

```js
// Site-wide metadata. url bruges til canonical/OG/sitemap.
module.exports = {
  name: "I stødet",
  url: "https://i-stødet.dk",
  punycodeUrl: "https://xn--i-stdet-t1a.dk",
  tagline: "Se hvornår strømmen er billig — og spar på det du alligevel bruger",
  maker: "alfanova",
  makerUrl: "https://alfanova.dk",
  appPath: "/app/",
  nav: [
    { href: "/spar/", label: "Sådan sparer du" },
    { href: "/saadan-beregner-vi/", label: "Sådan regner vi" },
    { href: "/om/", label: "Om" },
    { href: "/app/", label: "Åbn app", cta: true },
  ],
};
```

- [ ] **Step 5: Opret `eleventy.config.cjs`**

```js
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { assetUrl: assetUrlFn } = require("@udstillerguide/11ty-media/lib/asset-url");

module.exports = function (eleventyConfig) {
  // immediate:true så vores assetUrl-override er final (11ty 3.x deferrer ellers plugins).
  eleventyConfig.addPlugin(require("@udstillerguide/11ty-media"), { immediate: true });

  // Statiske marketing-assets.
  eleventyConfig.addPassthroughCopy("src/assets");
  // PWA'en kopieres byte-for-byte til _site/app/.
  eleventyConfig.addPassthroughCopy({ "src/app": "app" });

  eleventyConfig.addWatchTarget("src/assets/css/");
  eleventyConfig.addWatchTarget("src/assets/js/");

  // assetUrl: MEDIA_URL-prefix (no-op når MEDIA_URL er tom). Per-fil cache-bust via assetVersion.
  const mediaUrl = process.env.MEDIA_URL || "";
  eleventyConfig.addFilter("assetUrl", (assetPath) => assetUrlFn(assetPath, mediaUrl, null));

  const versionCache = new Map();
  eleventyConfig.addFilter("assetVersion", (srcPath) => {
    if (versionCache.has(srcPath)) return versionCache.get(srcPath);
    try {
      const filePath = path.join(__dirname, "src", srcPath.replace(/^\//, ""));
      const hash = crypto.createHash("sha1").update(fs.readFileSync(filePath)).digest("hex").slice(0, 8);
      versionCache.set(srcPath, hash);
      return hash;
    } catch (e) {
      return "0";
    }
  });

  // kr-formatering: 12.34 -> "12,34". Bruges i besparelses-tal.
  eleventyConfig.addFilter("kr", (n) => Number(n).toLocaleString("da-DK", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
  eleventyConfig.addFilter("kr0", (n) => Number(n).toLocaleString("da-DK", { maximumFractionDigits: 0 }));

  return {
    dir: { input: "src", output: "_site", includes: "_includes", data: "_data" },
    templateFormats: ["njk", "md", "html"],
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
  };
};
```

- [ ] **Step 6: Opret minimal `src/_includes/layouts/base.njk`** (udvides i Task 6)

```njk
<!DOCTYPE html>
<html lang="da">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{{ pageTitle or (title + " · " + site.name) }}</title>
<meta name="description" content="{{ description }}">
{%- if robots %}<meta name="robots" content="{{ robots }}">{%- endif %}
<link rel="canonical" href="{{ site.url }}{{ page.url }}">
<meta property="og:type" content="website">
<meta property="og:title" content="{{ pageTitle or (title + ' · ' + site.name) }}">
<meta property="og:description" content="{{ description }}">
<meta property="og:locale" content="da_DK">
<meta property="og:site_name" content="{{ site.name }}">
<link rel="stylesheet" href="{{ '/assets/css/main.css' | assetUrl }}?v={{ '/assets/css/main.css' | assetVersion }}">
</head>
<body class="{{ bodyClass | default('') }}">
<a class="skip-link" href="#main">Spring til hovedindhold</a>
<main id="main">
{{ content | safe }}
</main>
</body>
</html>
```

- [ ] **Step 7: Opret placeholder `src/index.njk`**

```njk
---
layout: layouts/base.njk
title: I stødet
pageTitle: I stødet — elpriser og besparelse
description: Se hvornår strømmen er billig, og spar på det du alligevel bruger.
---
<h1>{{ site.tagline }}</h1>
<p><a href="{{ site.appPath }}">Åbn app</a></p>
```

- [ ] **Step 8: Opret minimal `src/assets/css/main.css`** (udvides i Task 5)

```css
:root { color-scheme: light; }
body { font-family: system-ui, sans-serif; margin: 0; }
.skip-link { position: absolute; left: -9999px; }
.skip-link:focus { left: 8px; top: 8px; }
```

- [ ] **Step 9: Byg og verificér**

Run: `npm run clean && npm run build`
Expected: bygger uden fejl; `_site/index.html` findes og indeholder `<h1>`-taglinen; `_site/assets/css/main.css` findes.

- [ ] **Step 10: Commit**

```bash
git add package.json package-lock.json eleventy.config.cjs .gitignore src/_data/site.js src/_includes/layouts/base.njk src/index.njk src/assets/css/main.css
git commit -m "feat: 11ty scaffold (config, base layout, placeholder front page)"
```

---

## Phase 2 — Flyt PWA til src/app/ (web + iOS bevaret)

### Task 3: git mv PWA + opdater Capacitor-build + passthrough

**Files:**
- Move: 13 runtime-filer + 5 `*.test.mjs` → `src/app/`
- Modify: `scripts/runtime-files.mjs`, `scripts/build-www.mjs`

- [ ] **Step 1: Flyt runtime-filer + tests med git mv**

```bash
mkdir -p src/app
git mv index.html pricing.js gamify.js eloverblik.js forbrug-analyse.js co2.js sw.js manifest.webmanifest icon-192.png icon-512.png apple-touch-icon.png favicon.ico robots.txt src/app/
git mv pricing.test.mjs gamify.test.mjs eloverblik.test.mjs forbrug-analyse.test.mjs co2.test.mjs src/app/
```
Bemærk: der er nu både `src/app/robots.txt` (PWA's egen) og senere `src/robots.njk` (sitens). 11ty-passthrough lægger PWA'ens på `/app/robots.txt`; sitens på `/robots.txt`. Ingen konflikt.

- [ ] **Step 2: Verificér testene stadig passerer (relative imports uændrede)**

Run: `node --test`
Expected: alle tests i `src/app/*.test.mjs` PASS (de importerer `./pricing.js` osv. fra samme mappe).

- [ ] **Step 3: Opdater `scripts/runtime-files.mjs` til at pege på src/app/**

Erstat filens indhold:
```js
// Canonical list of runtime files, relative to src/app/.
// Bundled i iOS-appen (www/) OG deployet til web (_site/app/ via 11ty-passthrough).
export const APP_DIR = 'src/app';
export const RUNTIME_FILES = [
  'index.html', 'pricing.js', 'gamify.js', 'eloverblik.js', 'forbrug-analyse.js',
  'co2.js', 'sw.js', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png',
  'apple-touch-icon.png', 'favicon.ico', 'robots.txt',
];
```

- [ ] **Step 4: Opdater `scripts/build-www.mjs` til kilde = src/app/**

Erstat kopi-løkken så source er `src/app/`:
```js
// Copies the canonical runtime files from src/app/ to www/ (Capacitor's webDir).
import { mkdirSync, copyFileSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { APP_DIR, RUNTIME_FILES } from './runtime-files.mjs';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const wwwDir = join(repoRoot, 'www');
const srcDir = join(repoRoot, APP_DIR);

rmSync(wwwDir, { recursive: true, force: true });
mkdirSync(wwwDir, { recursive: true });
for (const f of RUNTIME_FILES) {
  copyFileSync(join(srcDir, f), join(wwwDir, f));
}
console.log(`build-www: kopierede ${RUNTIME_FILES.length} filer fra ${APP_DIR}/ → www/`);
```

- [ ] **Step 5: Verificér Capacitor-www-build**

Run: `npm run cap:assets`
Expected: "build-www: kopierede 13 filer fra src/app/ → www/"; `www/index.html` findes.

- [ ] **Step 6: Verificér 11ty-passthrough af appen**

Run: `npm run clean && npm run build`
Expected: `_site/app/index.html` + `_site/app/pricing.js` findes byte-identiske med `src/app/`-versionerne. Tjek: `diff src/app/pricing.js _site/app/pricing.js` → ingen forskel.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "refactor: move PWA to src/app/ as shared source for web + iOS"
```

---

## Phase 3 — Indhold (data, layout, sider)

### Task 4: Besparelses-data + unit-test

**Files:**
- Create: `src/_data/apparater.js`, `src/app/.. ` (n/a) , `test/apparater.test.mjs`

Datamodel: besparelse = forbrug-kWh × pris-spænd (kr/kWh mellem dyre og billige timer). Tal er ærlige 2026-DK-referencer; eksakt-verificeres mod `src/app/pricing.js` ved review.

- [ ] **Step 1: Skriv fejlende test `test/apparater.test.mjs`**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import apparater from '../src/_data/apparater.js';

test('hvert apparat har de nødvendige felter', () => {
  for (const a of apparater.liste) {
    assert.ok(a.slug && a.navn && typeof a.kwh === 'number' && a.enhed, `mangler felt: ${a.slug}`);
    assert.ok(typeof a.kanFlyttes === 'boolean', `kanFlyttes mangler: ${a.slug}`);
  }
});

test('besparelse beregnes som kwh * prisspaend', () => {
  const a = apparater.bySlug('elbil');
  const forventet = a.kwh * apparater.prisspaend.typisk;
  assert.equal(apparater.besparelse(a, 'typisk'), Math.round(forventet * 100) / 100);
});

test('bySlug returnerer undefined for ukendt', () => {
  assert.equal(apparater.bySlug('findes-ikke'), undefined);
});
```

- [ ] **Step 2: Kør testen — forventet FAIL**

Run: `node --test test/apparater.test.mjs`
Expected: FAIL (`apparater.js` findes ikke endnu).

- [ ] **Step 3: Implementér `src/_data/apparater.js`**

```js
// Reference-forbrug pr. apparat + pris-spænd-model. Single source for guides + /spar/-tabel.
// kWh-tal: ærlige 2026-DK-referencer (verificér mod src/app/pricing.js ved review).
// prisspaend = forskel i kr/kWh mellem dyre og billige timer (lav/typisk/høj dag).
const prisspaend = { lav: 0.40, typisk: 1.10, hoej: 2.50 };

const liste = [
  {
    slug: "elbil", navn: "Elbil-opladning", enhed: "pr. fuld opladning",
    kwh: 50, kanFlyttes: true, frekvensOmAaret: 90,
    resume: "Størst potentiale. En fuld opladning flyttet til natbillige timer kan spare mest af alle apparater.",
    forudsaetning: "Kræver kun at du sætter til om aftenen og lader bilen/laderen styre starttidspunktet.",
  },
  {
    slug: "opvaskemaskine", navn: "Opvaskemaskine", enhed: "pr. opvask",
    kwh: 1.0, kanFlyttes: true, frekvensOmAaret: 300,
    resume: "Lille beløb pr. gang, men nemt: tænd udskudt-start om natten.",
    forudsaetning: "De fleste maskiner har udskudt start (timer).",
  },
  {
    slug: "vaskemaskine", navn: "Vaskemaskine", enhed: "pr. vask",
    kwh: 0.9, kanFlyttes: true, frekvensOmAaret: 200,
    resume: "Som opvask: beskeden gevinst pr. vask, men gratis at flytte med timer.",
    forudsaetning: "Kræver udskudt start; varmtvandstilslutning ændrer regnestykket.",
  },
  {
    slug: "varmepumpe", navn: "Varmepumpe & varmt vand", enhed: "pr. dag",
    kwh: 15, kanFlyttes: false, frekvensOmAaret: 365,
    resume: "Stort årsforbrug = stort potentiale — MEN kun hvis systemet kan tidsstyres uden at gå på kompromis med komfort eller legionella-sikkerhed.",
    forudsaetning: "Mange varmepumper/varmtvandsbeholdere kan IKKE tidsstyres uden videre. Tjek om din kan, før du regner med besparelsen.",
  },
];

function bySlug(slug) { return liste.find((a) => a.slug === slug); }
function besparelse(a, niveau = "typisk") {
  return Math.round(a.kwh * prisspaend[niveau] * 100) / 100;
}
function besparelseOmAaret(a, niveau = "typisk") {
  return Math.round(besparelse(a, niveau) * a.frekvensOmAaret);
}

// ESM (repoet er type:module). 11ty 3.x læser ESM _data-filer fint.
export default { prisspaend, liste, bySlug, besparelse, besparelseOmAaret };
```
> **Note:** Alle `src/_data/*.js`-filer SKAL bruge `export default` (repoet er
> `type:module`), IKKE `module.exports`. Kun `eleventy.config.cjs` bruger CommonJS.

- [ ] **Step 4: Kør testen — forventet PASS**

Run: `node --test test/apparater.test.mjs`
Expected: PASS (3 tests).

- [ ] **Step 5: Kør hele suiten (ingen regression)**

Run: `node --test`
Expected: alle tests (PWA-moduler + apparater) PASS.

- [ ] **Step 6: Commit**

```bash
git add src/_data/apparater.js test/apparater.test.mjs
git commit -m "feat: apparater data model + savings calculation with tests"
```

### Task 5: Layout (header/footer) + CSS

**Files:**
- Create: `src/_includes/partials/header.njk`, `src/_includes/partials/footer.njk`, `src/assets/js/site.js`
- Modify: `src/_includes/layouts/base.njk`, `src/assets/css/main.css`

- [ ] **Step 1: Opret `src/_includes/partials/header.njk`**

```njk
<header class="site-header">
  <a class="brand" href="/">{{ site.name }}</a>
  <nav class="site-nav" aria-label="Hovedmenu">
    {%- for item in site.nav %}
    <a href="{{ item.href }}"{% if item.cta %} class="nav-cta"{% endif %}{% if page.url == item.href %} aria-current="page"{% endif %}>{{ item.label }}</a>
    {%- endfor %}
  </nav>
</header>
```

- [ ] **Step 2: Opret `src/_includes/partials/footer.njk`**

```njk
<footer class="site-footer">
  <p>{{ site.name }} — et værktøj fra <a href="{{ site.makerUrl }}">{{ site.maker }}</a>.</p>
  <nav aria-label="Footer">
    {%- for item in site.nav %}<a href="{{ item.href }}">{{ item.label }}</a> {% endfor %}
  </nav>
</footer>
```

- [ ] **Step 3: Opret `src/assets/js/site.js`** (lille progressive enhancement)

```js
// Minimal: marker aktiv nav + (senere) mobil-menu-toggle. Ingen afhængigheder.
document.documentElement.classList.add("js");
```

- [ ] **Step 4: Udvid `base.njk`** — indsæt header før `<main>` og footer + site.js efter `{{ content | safe }}`/`</main>`:

Indsæt `{% include "partials/header.njk" %}` umiddelbart efter `<body ...>`-linjen (før `<main>`), og før `</body>`:
```njk
{% include "partials/footer.njk" %}
<script defer src="{{ '/assets/js/site.js' | assetUrl }}?v={{ '/assets/js/site.js' | assetVersion }}"></script>
```

- [ ] **Step 5: Skriv `src/assets/css/main.css`** — rigtig styling (tokens + layout). Hold det enkelt, mobilvenligt (test 390px). Behold `.skip-link`-reglerne. Tilføj `.site-header`, `.brand`, `.site-nav`, `.nav-cta`, `.site-footer`, container-bredde, typografi, knap-stil. (Skriv konkret CSS — design afstemmes visuelt i live-verifikation; brug alfanova-farver/typografi som udgangspunkt.)

- [ ] **Step 6: Byg + visuel dev-check**

Run: `npm run build`
Expected: bygger; `_site/index.html` indeholder header+footer.
Dev: `npm run dev`, åbn `http://localhost:8080/` i dev-browser, tjek header/footer/nav på desktop + 390px, console-fejl-fri. (Tag screenshot OG læs det — global HARD RULE.)

- [ ] **Step 7: Commit**

```bash
git add src/_includes src/assets
git commit -m "feat: site header/footer layout + base styles"
```

### Task 6: Guide-layout + /spar/ oversigt + 4 guide-sider

**Files:**
- Create: `src/_includes/layouts/guide.njk`, `src/spar.njk`, `src/spar/elbil.njk`, `src/spar/opvaskemaskine.njk`, `src/spar/vaskemaskine.njk`, `src/spar/varmepumpe.njk`

- [ ] **Step 1: Opret `src/_includes/layouts/guide.njk`** (delt struktur, apparat-data via `apparat`-slug i front matter)

```njk
---
layout: layouts/base.njk
---
{%- set a = apparater.bySlug(apparat) %}
<article class="guide">
  <h1>{{ h1 }}</h1>
  <p class="lead">{{ a.resume }}</p>
  <aside class="savings-box">
    <p>Typisk besparelse: <strong>{{ apparater.besparelse(a, 'typisk') | kr }} kr</strong> {{ a.enhed }}
    {%- if a.frekvensOmAaret %} · ca. <strong>{{ apparater.besparelseOmAaret(a, 'typisk') | kr0 }} kr/år</strong>{% endif %}.</p>
    <p class="muted">Spændvidde: {{ apparater.besparelse(a, 'lav') | kr }}–{{ apparater.besparelse(a, 'hoej') | kr }} kr {{ a.enhed }} (afhænger af dagens prisforskel).</p>
  </aside>
  {%- if not a.kanFlyttes %}
  <p class="caveat"><strong>Kun hvis du kan flytte forbruget:</strong> {{ a.forudsaetning }}</p>
  {%- else %}
  <p class="muted">Forudsætning: {{ a.forudsaetning }}</p>
  {%- endif %}
  {{ content | safe }}
  <p class="cta"><a class="nav-cta" href="{{ site.appPath }}">Se din egen besparelse i appen →</a></p>
</article>
```

- [ ] **Step 2: Opret de 4 guide-sider** — hver er tynd: front matter + prose-body. Eksempel `src/spar/elbil.njk`:

```njk
---
layout: layouts/guide.njk
apparat: elbil
title: Spar på elbil-opladning
h1: Hvor meget kan du spare på elbil-opladning?
pageTitle: Spar på elbil-opladning — I stødet
description: Sådan flytter du elbil-opladning til de billige timer, og hvor meget det realistisk sparer.
permalink: /spar/elbil/
---
<p>Skriv brødtekst via alfanova-voice-skillen: forklar regnestykket (kWh × prisforskel),
hvorfor elbilen er det største enkelt-potentiale, og hvordan man sætter natteladning op
(bil-app eller lader-timer). Ærlig om at gevinsten afhænger af dagens prisforskel.</p>
```

Gentag for `opvaskemaskine.njk` (apparat: opvaskemaskine), `vaskemaskine.njk` (apparat: vaskemaskine), `varmepumpe.njk` (apparat: varmepumpe) — samme front-matter-mønster, unik titel/description/permalink (`/spar/<slug>/`), og prose-body skrevet via alfanova-voice. For varmepumpe SKAL brødteksten bære "kun hvis du kan tidsstyre"-nuancen tydeligt.

- [ ] **Step 3: Opret `src/spar.njk`** (oversigtstabel fra data)

```njk
---
layout: layouts/base.njk
title: Sådan sparer du
pageTitle: Sådan sparer du på elregningen — I stødet
description: Typisk besparelse pr. apparat ved at flytte forbrug til billige timer.
permalink: /spar/
---
<h1>Hvad kan du reelt spare?</h1>
<p>Skriv intro via alfanova-voice: flyt det du alligevel bruger til de billige timer.</p>
<table class="savings-table">
  <thead><tr><th>Apparat</th><th>Typisk besparelse</th><th>Pr. år</th><th>Kan flyttes?</th></tr></thead>
  <tbody>
  {%- for a in apparater.liste %}
    <tr>
      <td><a href="/spar/{{ a.slug }}/">{{ a.navn }}</a></td>
      <td>{{ apparater.besparelse(a, 'typisk') | kr }} kr {{ a.enhed }}</td>
      <td>~{{ apparater.besparelseOmAaret(a, 'typisk') | kr0 }} kr</td>
      <td>{% if a.kanFlyttes %}Ja, nemt{% else %}Kun hvis systemet kan tidsstyres{% endif %}</td>
    </tr>
  {%- endfor %}
  </tbody>
</table>
<p class="cta"><a class="nav-cta" href="{{ site.appPath }}">Åbn app →</a></p>
```

- [ ] **Step 4: Byg + verificér data-binding**

Run: `npm run build`
Expected: `/spar/index.html` har tabel med 4 rækker og udregnede tal; `/spar/elbil/index.html` viser savings-box; `/spar/varmepumpe/index.html` viser `.caveat`-blokken.

- [ ] **Step 5: Polér copy via alfanova-voice** for alle 5 sider (intro + brødtekst). Erstat de "Skriv … via alfanova-voice"-pladsholdere med rigtig tekst gennem **alfanova-voice**-skillen.

- [ ] **Step 6: Commit**

```bash
git add src/_includes/layouts/guide.njk src/spar.njk src/spar/
git commit -m "feat: /spar oversigt + 4 besparelses-guides (data-driven)"
```

### Task 7: Forside

**Files:** Modify `src/index.njk`

- [ ] **Step 1: Skriv forsiden** — hero (tagline + CTA "Åbn app" → /app/), "sådan virker det" (3 trin), fremhævede guides (loop over `apparater.liste`), kort afsender-note (alfanova). Brug `apparater`-data til fremhævede besparelser. Front matter:

```njk
---
layout: layouts/base.njk
title: I stødet
pageTitle: I stødet — se hvornår strømmen er billig
description: Se de danske elpriser i dag og i morgen, og spar på elbil, opvask, vask og varme ved at flytte forbruget til de billige timer.
permalink: /
---
```
Body skrives via **alfanova-voice** (hero, 3 trin, guide-kort med `{{ apparater.besparelse(a,'typisk') | kr }} kr`, CTA).

- [ ] **Step 2: Byg + visuel dev-check** (desktop + 390px, dev-browser, screenshot + læs).

Run: `npm run build` → `_site/index.html` har hero + CTA til `/app/` + guide-kort.

- [ ] **Step 3: Commit**

```bash
git add src/index.njk
git commit -m "feat: front page (hero, how-it-works, featured guides)"
```

### Task 8: Resten af siderne (om, metode, 404, robots, sitemap)

**Files:** Create `src/saadan-beregner-vi.njk`, `src/om.njk`, `src/404.njk`, `src/robots.njk`, `src/sitemap.njk`

- [ ] **Step 1: `src/saadan-beregner-vi/`** — metode/transparens. Forklar regnestykket (kWh × pris-spænd), kilder til kWh-tal, og at appen regner personligt på live-priser. Front matter `permalink: /saadan-beregner-vi/`. Copy via alfanova-voice.

- [ ] **Step 2: `src/om.njk`** (`permalink: /om/`) — alfanova-afsender: psykologi + brugerforståelse + design + AI → små, nemmere, gode værktøjer; i-stødet som eksempel; CTA til alfanova.dk. Copy via alfanova-voice.

- [ ] **Step 3: `src/404.njk`**

```njk
---
layout: layouts/base.njk
title: Siden findes ikke
pageTitle: 404 — siden findes ikke
permalink: /404.html
eleventyExcludeFromCollections: true
---
<h1>Den side findes ikke</h1>
<p><a href="/">Tilbage til forsiden</a> eller <a href="{{ site.appPath }}">åbn appen</a>.</p>
```

- [ ] **Step 4: `src/robots.njk`**

```njk
---
permalink: /robots.txt
eleventyExcludeFromCollections: true
---
User-agent: *
Allow: /
Sitemap: {{ site.url }}/sitemap.xml
```

- [ ] **Step 5: `src/sitemap.njk`**

```njk
---
permalink: /sitemap.xml
eleventyExcludeFromCollections: true
---
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
{%- for p in collections.all %}
  {%- if not (p.url | string).startsWith('/app/') and p.url != '/404.html' %}
  <url><loc>{{ site.url }}{{ p.url }}</loc></url>
  {%- endif %}
{%- endfor %}
</urlset>
```

- [ ] **Step 6: Byg + verificér ruter**

Run: `npm run build`
Expected: `_site/saadan-beregner-vi/index.html`, `_site/om/index.html`, `_site/404.html`, `_site/robots.txt`, `_site/sitemap.xml` findes; sitemap lister marketing-sider men IKKE `/app/`-ruter.

- [ ] **Step 7: Commit**

```bash
git add src/saadan-beregner-vi.njk src/om.njk src/404.njk src/robots.njk src/sitemap.njk
git commit -m "feat: om, metode, 404, robots, sitemap"
```

---

## Phase 4 — Deploy-infrastruktur

### Task 9: Caddy-blok + deploy-caddy-script + verify-live

**Files:** Create `deploy/caddy-i-stoedet.dk.caddy`, `scripts/deploy-caddy.sh`, `scripts/verify-live.js`

- [ ] **Step 1: Opret `deploy/caddy-i-stoedet.dk.caddy`**

```
# i-stødet.dk (xn--i-stdet-t1a.dk) — 11ty content-site + PWA under /app/
# Hostes på websites (46.225.103.197). TLS via CF Origin-cert (Full Strict).
# Reload: ugctl caddy reload --server=websites
xn--i-stdet-t1a.dk, www.xn--i-stdet-t1a.dk {
	tls /etc/caddy/certs/xn--i-stdet-t1a.dk/origin.crt /etc/caddy/certs/xn--i-stdet-t1a.dk/origin.key

	@www host www.xn--i-stdet-t1a.dk
	redir @www https://xn--i-stdet-t1a.dk{uri} 301

	root * /var/www/xn--i-stdet-t1a.dk/current
	encode gzip zstd

	# sw.js + manifest skal være friske (ellers hænger PWA på gammel app-skal).
	@swmanifest path /app/sw.js /app/manifest.webmanifest
	header @swmanifest Cache-Control "public, max-age=0, must-revalidate"

	# App-moduler + marketing-assets: kort cache (cache-bust via ?v= på marketing-CSS/JS).
	@appassets path /app/*.js /app/*.png /app/*.ico
	header @appassets Cache-Control "public, max-age=3600"
	@assets path /assets/*
	header @assets Cache-Control "public, max-age=86400"

	@html path *.html /
	header @html Cache-Control "public, max-age=300, must-revalidate"

	header {
		>Strict-Transport-Security "max-age=300"
		>X-Content-Type-Options "nosniff"
		>Referrer-Policy "strict-origin-when-cross-origin"
		>Permissions-Policy "geolocation=(), camera=(), microphone=()"
		-Server
	}

	file_server

	handle_errors {
		@404 expression {http.error.status_code} == 404
		rewrite @404 /404.html
		file_server
	}

	log {
		output file /var/log/caddy/xn--i-stdet-t1a.dk.log {
			roll_size 10MB
			roll_keep 5
		}
		format json
	}
}
```
Bemærk: ingen CSP med frame-ancestors-only her hvis appen bruger inline scripts — PWA'ens `index.html` har inline JS, så undlad en restriktiv `Content-Security-Policy` der ville blokere den. (Verificér i live-tjek at appen kører.)

- [ ] **Step 2: Opret `scripts/deploy-caddy.sh`** (lægger blok + cert på server, reloader via ugctl)

```bash
#!/usr/bin/env bash
# Deployer Caddy-blok + CF Origin-cert til websites og reloader via ugctl.
set -euo pipefail
SERVER=websites
DOMAIN=xn--i-stdet-t1a.dk
LOCAL_CADDY="deploy/caddy-i-stoedet.dk.caddy"

echo "→ henter cert fra 1Password"
op item get "CF Origin Cert — i-stødet.dk" --vault=udstillerguide-v3 --format=json \
  | python3 -c "import json,sys,re; n=[f['value'] for f in json.load(sys.stdin)['fields'] if f.get('id')=='notesPlain'][0]; crt=re.search(r'-----BEGIN CERTIFICATE-----.*?-----END CERTIFICATE-----', n, re.S).group(); key=re.search(r'-----BEGIN (?:RSA )?PRIVATE KEY-----.*?-----END (?:RSA )?PRIVATE KEY-----', n, re.S).group(); open('/tmp/origin.crt','w').write(crt+chr(10)); open('/tmp/origin.key','w').write(key+chr(10))"

echo "→ opretter cert-dir + docroot på $SERVER"
ssh root@$SERVER "mkdir -p /etc/caddy/certs/$DOMAIN /var/www/$DOMAIN/current /var/log/caddy"
scp /tmp/origin.crt root@$SERVER:/etc/caddy/certs/$DOMAIN/origin.crt
scp /tmp/origin.key root@$SERVER:/etc/caddy/certs/$DOMAIN/origin.key
rm -f /tmp/origin.crt /tmp/origin.key
ssh root@$SERVER "chown -R caddy:caddy /etc/caddy/certs/$DOMAIN && chmod 600 /etc/caddy/certs/$DOMAIN/origin.key && install -o caddy -g caddy -m 0644 /dev/null /var/log/caddy/$DOMAIN.log"

echo "→ lægger Caddy-blok"
scp "$LOCAL_CADDY" root@$SERVER:/etc/caddy/sites.d/$DOMAIN.caddy

echo "→ reload via ugctl"
ugctl caddy reload --server=$SERVER --validate-first
echo "✓ caddy deployet"
```

- [ ] **Step 3: Opret `scripts/verify-live.js`** (dev-browser post-deploy-tjek)

```js
#!/usr/bin/env node
// Post-deploy visuelt + HTTP-tjek mod i-stødet.dk. Exit 1 ved fejl.
const { execFileSync } = require("node:child_process");
const HOST = process.env.VERIFY_HOST || "https://i-stødet.dk";
const ROUTES = ["/", "/spar/", "/spar/elbil/", "/spar/opvaskemaskine/", "/spar/vaskemaskine/", "/spar/varmepumpe/", "/saadan-beregner-vi/", "/om/", "/app/"];

let DEV_BROWSER = null;
try { DEV_BROWSER = execFileSync("which", ["dev-browser"], { encoding: "utf8" }).trim(); } catch (e) {}
if (!DEV_BROWSER) { console.error("[verify-live] dev-browser CLI mangler"); process.exit(1); }

const SCRIPT = `
const HOST = ${JSON.stringify(HOST)};
const ROUTES = ${JSON.stringify(ROUTES)};
const page = await browser.newPage("verify-istoedet");
const out = { routes: {}, appLoaded: null, consoleErrors: [] };
page.on("console", m => { if (m.type() === "error") out.consoleErrors.push(m.text()); });
for (const r of ROUTES) {
  try { const resp = await page.goto(HOST + r, { waitUntil: "load", timeout: 20000 }); out.routes[r] = resp ? resp.status() : "no-resp"; }
  catch (e) { out.routes[r] = "err:" + String(e).slice(0,60); }
}
// App må ikke hænge i "Henter elpriser…"
await page.goto(HOST + "/app/", { waitUntil: "networkidle", timeout: 25000 });
await new Promise(r => setTimeout(r, 4000));
const bodyText = await page.evaluate(() => document.body.innerText || "");
out.appLoaded = !/Henter elpriser/i.test(bodyText) || /øre|kWh|kr/i.test(bodyText);
console.log(JSON.stringify(out));
`;
const raw = execFileSync(DEV_BROWSER, ["eval", "-"], { input: SCRIPT, encoding: "utf8" });
const res = JSON.parse(raw.trim().split("\n").pop());
let ok = true;
for (const [r, s] of Object.entries(res.routes)) { if (s !== 200) { console.error(`✗ ${r} → ${s}`); ok = false; } else console.log(`✓ ${r} 200`); }
if (!res.appLoaded) { console.error("✗ /app/ ser ud til at hænge i 'Henter elpriser…'"); ok = false; } else console.log("✓ /app/ loadede");
if (res.consoleErrors.length) { console.error("✗ console-fejl:", res.consoleErrors.slice(0,5)); ok = false; }
process.exit(ok ? 0 : 1);
```
Bemærk: tilpas `dev-browser eval`-kaldet til den faktiske dev-browser-CLI-syntaks på maskinen (tjek `dev-browser --help`); juster `appLoaded`-heuristikken efter hvad appen renderer ved succes.

- [ ] **Step 4: Commit**

```bash
chmod +x scripts/deploy-caddy.sh scripts/verify-live.js
git add deploy/ scripts/deploy-caddy.sh scripts/verify-live.js
git commit -m "feat: caddy block + deploy-caddy + verify-live scripts"
```

### Task 10: Første deploy til websites (Caddy + filer) — IKKE DNS endnu

DNS peger stadig på GreenGeeks, så vi kan teste origin direkte før vi skifter trafik.

- [ ] **Step 1: Læg cert + Caddy-blok på serveren**

Run: `npm run deploy:caddy`
Expected: cert i `/etc/caddy/certs/xn--i-stdet-t1a.dk/`, blok i sites.d, `ugctl caddy reload` validerer + reloader uden fejl.

- [ ] **Step 2: Byg + læg filer (uden verify-step, da DNS endnu peger forkert)**

Run:
```bash
npm run build
CLAUDE_BYPASS_DEPLOY_VERIFY=1 rsync -avz --delete _site/ root@websites:/var/www/xn--i-stdet-t1a.dk/current/
```
(Bypass er bevidst her: vi verificerer mod origin-IP i næste step, ikke mod live-DNS endnu.)
Expected: filer på plads; `/var/www/xn--i-stdet-t1a.dk/current/index.html` + `app/index.html` findes.

- [ ] **Step 3: Verificér mod origin med korrekt SNI (før DNS-skift)**

Run:
```bash
curl -s -o /dev/null -w "/ %{http_code}\n"  --resolve xn--i-stdet-t1a.dk:443:46.225.103.197 https://xn--i-stdet-t1a.dk/
curl -s -o /dev/null -w "/app/ %{http_code}\n" --resolve xn--i-stdet-t1a.dk:443:46.225.103.197 https://xn--i-stdet-t1a.dk/app/
curl -s -o /dev/null -w "/spar/elbil/ %{http_code}\n" --resolve xn--i-stdet-t1a.dk:443:46.225.103.197 https://xn--i-stdet-t1a.dk/spar/elbil/
```
Expected: alle `200`. (TLS valideres mod CF Origin-cert; `--resolve` sætter korrekt SNI.)

### Task 11: DNS-repoint apex + www → websites

**Files:** ingen (CF API). Udløser CF-godkendelses-hook.

- [ ] **Step 1: Find record-ID'er + opdater content til 46.225.103.197**

Run (Python urllib for robusthed):
```bash
python3 - <<'PY'
import json, urllib.request, subprocess
TOKEN = subprocess.check_output(["op","item","get","Cloudflare API Token - UG3","--vault=udstillerguide-v3","--field=Token","--reveal"]).decode().strip()
ZONE = "ea83cb8b7df67afc0e7e0edda4db904a"
NEW_IP = "46.225.103.197"
def api(path, method="GET", body=None):
    req = urllib.request.Request("https://api.cloudflare.com/client/v4"+path,
        data=json.dumps(body).encode() if body else None,
        headers={"Authorization":"Bearer "+TOKEN,"Content-Type":"application/json"}, method=method)
    try: return json.load(urllib.request.urlopen(req))
    except urllib.error.HTTPError as e: return json.load(e)
recs = api(f"/zones/{ZONE}/dns_records?type=A")["result"]
for r in recs:
    if r["name"] in ("xn--i-stdet-t1a.dk","www.xn--i-stdet-t1a.dk"):
        body = {"type":"A","name":r["name"],"content":NEW_IP,"proxied":True}
        res = api(f"/zones/{ZONE}/dns_records/{r['id']}", "PUT", body)
        print(r["name"], "→", NEW_IP, "ok" if res.get("success") else res.get("errors"))
PY
```
Expected: begge records opdateret til `46.225.103.197`, `proxied:true`.

### Task 12: Live-verifikation (HARD RULE)

- [ ] **Step 1: Kør verify:live**

Run: `npm run verify:live`
Expected: alle ruter 200, `/app/` loader (ikke "Henter elpriser…"), ingen console-fejl.

- [ ] **Step 2: Manuel visuel verifikation i dev-browser** — åbn `https://i-stødet.dk` med cache-bust (`?cb=<ts>`), hard-reload (cmd+shift+R). Tjek desktop + 390px: forside-hero, nav, en guide-side (tal vises), og `/app/` (appen kører, viser priser). Tag screenshot OG `Read` PNG'en. Kommentér konkret hvad du ser.

- [ ] **Step 3: Verificér iOS-build stadig virker (ingen regression)**

Run: `npm run cap:assets`
Expected: 13 filer → www/ uden fejl.

---

## Phase 5 — Oprydning + dokumentation

### Task 13: Opdater CLAUDE.md + memory + GreenGeeks-oprydning

**Files:** Modify `CLAUDE.md`

- [ ] **Step 1: Opdater `CLAUDE.md` deploy-sektion** — erstat GreenGeeks/rsync-afsnittet med: 11ty-arkitektur, `src/app/` som PWA-kilde, deploy til websites via `npm run deploy` (+ `deploy:caddy`), Caddy-reload via ugctl, cert i 1Password. Fjern den nu-forældede Cloudflare-.js-cache-bust-HARD-RULE (afløst af 11ty assetVersion + Caddy-cache-headers) — eller markér den som kun-historisk.

- [ ] **Step 2: Opdater arkitektur-tabellen i CLAUDE.md** med de nye filer (eleventy.config.cjs, src/, deploy/).

- [ ] **Step 3: bd memory**

Run:
```bash
bd remember "i-stødet.dk er nu live på websites (46.225.103.197) som 11ty content-site + PWA under /app/. Deploy: npm run deploy (build+rsync+verify:live), npm run deploy:caddy. Cert i 1Password 'CF Origin Cert — i-stødet.dk'. iOS-Capacitor bygger www/ fra src/app/ via npm run cap:assets."
```

- [ ] **Step 4: Påmind ejer om GreenGeeks-oprydning** (manuelt i cPanel — ikke automatisérbart herfra): slet addon-domæne `xn--i-stdet-t1a.dk`, subdomæne `i-stoedet.alfanova.dk`, og docroot/symlink `public_html/xn--i-stdet-t1a.dk`. (Vent til i-stødet.dk er bekræftet live i mindst et par dage.)

- [ ] **Step 5: Commit + push branch + PR**

```bash
git add CLAUDE.md
git commit -m "docs: update deploy section for 11ty + websites hosting"
git push -u origin feat/11ty-content-site
gh pr create --title "i-stødet.dk: 11ty content-site + PWA under /app/" --body "Konverterer til 11ty content-site med besparelses-guides; PWA bevaret uændret under /app/; deploy til websites med CF Origin-cert. Spec + plan i docs/superpowers/."
```

---

## Self-Review noter

- **Spec-dækning:** arkitektur (Task 2-3), sidestruktur (Task 6-8), besparelses-indhold (Task 4,6), UG-konventioner (Task 2,5), deploy+infra (Task 9-12), cert (allerede løst; install i Task 10), oprydning (Task 13). Alle spec-sektioner dækket.
- **Capacitor-bevarelse:** Task 3 sikrer www-build virker fra src/app/; Task 12 step 3 re-verificerer.
- **Type-konsistens:** `apparater.bySlug/besparelse/besparelseOmAaret/prisspaend/liste` defineret i Task 4 og brugt konsistent i Task 6-7. `RUNTIME_FILES`/`APP_DIR` defineret + brugt i Task 3.
- **Kendt usikkerhed at afklare ved eksekvering:** (a) eksakt `dev-browser eval`-syntaks i verify-live.js; (b) eksakte kWh/pris-spænd-tal i apparater.js (verificér mod pricing.js + 2026-kilder); (c) om appens inline-JS kræver justeret/ingen CSP i Caddy-blokken.
