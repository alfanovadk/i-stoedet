# Design: i-stødet.dk → 11ty content-site + PWA under /app/

**Dato:** 2026-06-14
**Status:** Godkendt (brainstorm) — afventer spec-review før implementeringsplan
**Domæne:** i-stødet.dk (punycode `xn--i-stdet-t1a.dk`)
**Repo:** alfanova-elpriser (in-place konvertering)

## Formål

i-stødet.dk skal være et marketing/SEO-content-site der forklarer værdien af at
flytte elforbrug til billige timer — med konkrete besparelses-guides pr. apparat —
og som har den eksisterende elpris-PWA som selve app-oplevelsen under `/app/`.

Den drivende indsigt (fra ejer): folk vil vide **hvor meget man reelt kan spare**
på elbil-opladning, opvaskemaskine og vaskemaskine — og på at flytte
varmepumpe/varmt-vand til andre tidspunkter, **hvis** man overhovedet kan
tidsstyre det. Det er kerne-søge-intenten siden skal ramme.

## Beslutninger (fra brainstorm)

| Spørgsmål | Valg |
|-----------|------|
| Forside-scope | Marketing/SEO-site med flere sider |
| App-placering | Subpath `i-stødet.dk/app/` (ét domæne, bedst SEO, ét cert) |
| Repo | Konvertér dette repo in-place til 11ty |
| Deploy-mekanisme | alfanova-style npm-scripts (rsync + verify), IKKE `ugctl deploy-site-11ty` |
| Mål-server | Hetzner **websites** (`100.64.0.4`, public `46.225.103.197`) |
| TLS | CF Origin-cert, proxied bag Cloudflare (Full Strict) |
| Voice | alfanova-voice |

## Arkitektur

11ty 3.x site (samme stak som alfanova-dk). 11ty bygger forside + guides;
PWA'en bevares uændret og passthrough-kopieres.

```
src/
  _data/
    apparater.js          # reference-kWh pr. apparat → konsistente tal i guides + tabel
    site.js               # domæne, navn, metadata
  _includes/
    layouts/base.njk      # base-layout (assetUrl til CSS/JS, meta, OG-tags)
    layouts/guide.njk     # guide-template (genbrugt af alle /spar/*-sider)
    partials/*.njk
  assets/
    css/main.css
    js/*.js               # forsidens/guides' lille progressive-enhancement-JS (ikke app'en)
    photos/               # billeder via {% image %}-shortcode
  app/                    # ← den eksisterende PWA, flyttet hertil, uændret
    index.html
    pricing.js gamify.js eloverblik.js forbrug-analyse.js co2.js
    sw.js manifest.webmanifest icon-192.png icon-512.png
    apple-touch-icon.png favicon.ico
  index.njk               # forside
  spar.njk                # /spar/ oversigt
  spar/elbil.njk
  spar/opvaskemaskine.njk
  spar/vaskemaskine.njk
  spar/varmepumpe.njk
  saadan-beregner-vi.njk
  om.njk
  404.njk
  robots.txt.njk
eleventy.config.js
package.json
deploy/
  caddy-i-stoedet.dk.caddy
scripts/
  verify-live.js
docs/superpowers/specs/   # dette dokument
*.test.mjs                # node --test på de rene moduler (bevaret)
```

PWA-passthrough: `eleventy.config.js` får `addPassthroughCopy({ "src/app": "app" })`
så hele app'en lander i `_site/app/` byte-for-byte. App'en bruger allerede relative
stier (`start_url:"."`, `scope:"./"`, relativ `sw.js`-registrering) → under `/app/`
bliver SW-scope korrekt `/app/`, og installeret PWA får `start_url` `/app/`. Ingen
kodeændringer i app'en.

## Sidestruktur (SEO)

| URL | Indhold |
|-----|---------|
| `/` | Hero + "sådan virker det" (3 trin) + fremhævede guides + CTA "Åbn app" → `/app/` |
| `/spar/` | Oversigtstabel: typisk besparelse pr. apparat (fra `apparater.js`) |
| `/spar/elbil/` | Elbil-opladning — størst potentiale |
| `/spar/opvaskemaskine/` | Opvaskemaskine |
| `/spar/vaskemaskine/` | Vaskemaskine |
| `/spar/varmepumpe/` | Varmepumpe + varmt vand — med "kun hvis du KAN tidsstyre"-nuance |
| `/saadan-beregner-vi/` | Metode/transparens — grounder tallene |
| `/om/` | Om alfanova som afsender: kombinerer psykologi + brugerforståelse + design + AI → små, nemmere og gode værktøjer. i-stødet er et konkret eksempel på tilgangen. CTA til alfanova.dk. |
| `/app/` | PWA (passthrough, uændret) |
| `/404.html`, `/robots.txt`, `/sitemap.xml`, `/manifest.webmanifest` | Standard |

Hver guide targeter konkret søge-intent (fx "hvor meget kan jeg spare på
elbil-opladning om natten") og slutter med CTA → `/app/` for personlig beregning.

## Besparelses-indhold (grounded)

Tal = **apparatets kWh pr. cyklus/forbrug × pris-spændet (dyre vs. billige timer)**.

- **Datakilde:** `src/_data/apparater.js` holder reference-kWh pr. apparat ét sted, så
  oversigtstabel og guide-sider altid er konsistente. Pris-spændet illustreres med
  2026-DK-referencetal og en ærlig spændvidde — ikke ét fluffy års-tal.
- **Ærlighed pr. apparat:**
  - *Elbil*: stort. En fuld opladning (~40–60 kWh) flyttet til natbillige timer kan
    spare betydeligt over et år (titusinder af kr ved meget kørsel). Største enkelt-gevinst.
  - *Opvask/vask*: små absolutte beløb (~øre til få kr pr. cyklus, ~1 kWh/cyklus).
    Kommunikeres ærligt — gevinsten er reel men beskeden; vanen er nem.
  - *Varmepumpe/varmt vand*: stort potentiale (store årsforbrug), MEN **betinget** af
    om systemet kan tidsstyres (legionella-hensyn på varmtvandsbeholder, komfort på
    rumvarme). Ejerens "HVIS man kan"-pointe står centralt på siden.
- **Verifikation:** Eksakte kWh- og tarif-tal verificeres ved implementering (projektet
  flagger allerede daterede tariffer i `pricing.js`). Guides viser metode, så tallene
  er reproducerbare, og deep-linker til `/app/` for den personlige, live beregning.

## UG 11ty-konventioner (global HARD RULE)

- `@udstillerguide/11ty-media` registreres i `eleventy.config.js` med `immediate:true`.
- CSS/JS-links i base-layout gennem `{{ '/assets/css/main.css' | assetUrl }}`.
- Billeder via `{% image "photos/X.jpg", "alt", "sizes" %}` fra `src/assets/photos`.
- Koden bliver MEDIA_URL-konform med det samme (filteret no-op'er når MEDIA_URL er tom).
- **Cookieless `media.i-stødet.dk`-subdomæne udskydes** til opfølgning (ikke MVP):
  koden er klar, men DNS+Caddy+cert for media-subdomænet rejses separat. Dokumenteres
  som kendt teknisk gæld, ikke en silent skip.

## Deploy + infrastruktur

Model: alfanova-dk's npm-scripts. Mål: websites (`46.225.103.197`).

**package.json-scripts:**
- `build`: `eleventy` (pagefind-søgning udeladt i MVP — YAGNI for få sider).
- `deploy`: `npm run build && rsync -avz --delete _site/ root@websites:/var/www/xn--i-stdet-t1a.dk/current/ && npm run verify:live`
  - MEDIA_URL sættes ikke i MVP (media-subdomæne udskudt) → `assetUrl`-filteret
    no-op'er og serverer assets fra eget domæne. Når media-subdomænet rejses,
    præfikses scriptet med `MEDIA_URL=https://media.xn--i-stdet-t1a.dk`.
  - `&& npm run verify:live` i samme kommando er dét der lader deploy-verify-hooken
    passere rsync til `/var/www/`.
- `verify:live`: `node scripts/verify-live.js` — HTTP + (manuel/dev-browser) visuel verifikation.
- `deploy:caddy`: lægger `deploy/caddy-i-stoedet.dk.caddy` på serveren og kører
  `ugctl caddy reload --server=websites` (honorerer "brug ugctl" + deploy-hooken).

**Caddy-blok** (`/etc/caddy/sites.d/xn--i-stdet-t1a.dk.caddy`), fleet-mønster:
- `tls /etc/caddy/certs/xn--i-stdet-t1a.dk/origin.crt /etc/caddy/certs/xn--i-stdet-t1a.dk/origin.key`
- `root * /var/www/xn--i-stdet-t1a.dk/current`, `encode gzip zstd`, `file_server`
- www→apex 301-redirect
- Cache: `/app/*`-assets + hashed assets lang cache; HTML + `sw.js` kort/no-cache
  (undgår GreenGeeks-stale-JS-problemet — `sw.js` skal være frisk).
- Security-headers (HSTS-ramp, X-Content-Type-Options, Referrer-Policy, CSP
  frame-ancestors, Permissions-Policy), `-Server`.
- `handle_errors` → `/404.html`. JSON-log til `/var/log/caddy/`.

**DNS:** Opdatér de allerede-oprettede Cloudflare-records (apex + www) fra
GreenGeeks-IP `107.6.136.42` → `46.225.103.197`, **proxied** beholdt.

**Cert:** ✅ **OPRETTET** (2026-06-14). CF Origin-cert, RSA, 15 år (udløber
2041-06-10), SAN `xn--i-stdet-t1a.dk` + `*.xn--i-stdet-t1a.dk` (wildcard dækker www
+ fremtidig media-subdomæne). Gemt i 1Password (udstillerguide-v3) som
**"CF Origin Cert — i-stødet.dk"** (cert+key i note). Ved implementering: hentes
derfra og lægges som `/etc/caddy/certs/xn--i-stdet-t1a.dk/origin.{crt,key}`
(caddy:caddy, key chmod 600).

## Oprydning (GreenGeeks — udfases)

Den nuværende PWA på GreenGeeks udfases. Ejer sletter i cPanel:
- addon-domænet `xn--i-stdet-t1a.dk`
- subdomænet `i-stoedet.alfanova.dk`
- den orphan symlink/docroot `public_html/xn--i-stdet-t1a.dk`

(i-stoedet.alfanova.dk er i forvejen nede med 526 pga. manglende origin-cert — den
genoplives ikke; trafik flyttes til i-stødet.dk på websites.)

## Test

- `node --test` på de rene moduler bevares (flyttet sammen med app'en til `src/app/`,
  test-stier opdateret).
- Build-verifikation: `eleventy` bygger uden fejl; `_site/app/index.html` + alle
  moduler findes byte-identiske; guides renderer; `apparater.js`-tal matcher tabel.
- Live-verifikation efter deploy (global HARD RULE): dev-browser, hard-reload,
  desktop + 390px, console-tjek, app loader (ikke "Henter elpriser…"-hæng).

## Ikke i scope (MVP)

- Cookieless `media.i-stødet.dk`-subdomæne (kode klar, infra udskudt).
- Pagefind-søgning.
- Blog/flere guides ud over de fire apparater.
- Live besparelses-widgets på guide-sider (statisk + CTA til app i stedet).
- Onboarding til `ugctl deploy-site-11ty`-pipelinen.

## Åbne afhængigheder

1. ~~CF Origin-cert~~ ✅ LØST 2026-06-14 (i 1Password "CF Origin Cert — i-stødet.dk").
2. Eksakte 2026-kWh/tarif-tal til guides verificeres ved implementering.
3. ~~`/om/`-sidens vinkel~~ ✅ AFKLARET: alfanova-afsender (psykologi + brugerforståelse
   + design + AI → små, nemmere, gode værktøjer; i-stødet som eksempel).
