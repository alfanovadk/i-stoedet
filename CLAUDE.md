# alfanova-elpriser

Lille statisk PWA der viser danske elpriser (i dag + i morgen) med totalpris pr.
netselskab, anbefalede tidsvinduer for apparater, klik-på-time pris-nedbrydning,
animeret Volt-maskot, og — via Eloverblik — verificeret gamification (point/badges
for at flytte forbrug til billige timer).

## Arkitektur

Ren client-side, ingen backend. ESM-moduler, ingen build-step.

| Fil | Rolle |
|-----|-------|
| `index.html` | App-skal: UI, temaer (soft/bold/play), DOM-render, actions, Volt-maskot, settings/wizard |
| `pricing.js` | Ren pris-motor: afgifter, netselskab-tariffer, serier, komponent-nedbrydning |
| `gamify.js` | Ren gamification-logik: verificér claims, point, smart-score, badges |
| `eloverblik.js` | Eloverblik CustomerApi-klient (CORS-verificeret, ingen proxy) + timeseries-parser |
| `sw.js` | Service worker (network-first app-skal-cache) |

Designs + planer: `docs/superpowers/`.

## Test

```
node --test
```

Rene moduler (`pricing.js`, `gamify.js`, `eloverblik.js`) er unit-testede med Node's
indbyggede runner (ingen deps).

## Vigtige data-noter

- **Tariffer/afgifter i `pricing.js` er dateret (pr. jan 2026) og skal verificeres
  årligt** — netselskaber justerer typisk 1/1 og 1/4, Energinet/elafgift ved årsskifte.
- Elafgift 1,0 øre og Energinet 14,375 øre er inkl. moms, verificeret mod 2026-kilder.
- `eloverblik.js` `parseTimeSeries` har en tidszone-følsom dayKey-udledning markeret
  `// VERIFICÉR mod rigtigt kald` — bekræft mod et rigtigt Eloverblik-svar (sommer/vintertid).

## Deploy

Statisk site på **GreenGeeks** (shared hosting). Deploy = rsync af statiske filer.

- **SSH:** bruger `alfanova`, origin-IP `107.6.136.42` (domænet er Cloudflare-proxied,
  så brug origin-IP til SSH/rsync — ikke DNS-opslaget).
- **Sti:** `public_html/elpriser.damsgaard-bruhn.dk/`
- **Filer der skal med:** `index.html`, `pricing.js`, `gamify.js`, `eloverblik.js`,
  `sw.js`, `manifest.webmanifest`, `icon-192.png`, `icon-512.png`,
  `apple-touch-icon.png`, `favicon.ico`, `robots.txt` (IKKE `docs/`, `node_modules/`,
  `package.json`, `*.test.mjs`, `.git`).

```
rsync -avz --exclude='.git' --exclude='docs' --exclude='node_modules' \
  --exclude='*.test.mjs' --exclude='package.json' \
  index.html pricing.js gamify.js eloverblik.js sw.js manifest.webmanifest \
  *.png favicon.ico robots.txt \
  alfanova@107.6.136.42:public_html/elpriser.damsgaard-bruhn.dk/
```

**HARD RULE — verificér live efter deploy** (jf. global CLAUDE.md): åbn
`https://elpriser.damsgaard-bruhn.dk` i browser, hard-reload (cmd+shift+R, omgå
Cloudflare-cache), inspicér visuelt desktop + 390px, tjek console. Tag screenshot OG
læs det. Husk evt. Cloudflare cache-purge hvis gamle assets serveres.

Credentials (SSH-nøgle/password, Eloverblik-token) ligger IKKE her — de hører i
`~/.claude/CLAUDE.local.md` (gitignored) eller gives ad hoc.

## Sprog

Kommuniker på dansk. Kode-kommentarer og commits på engelsk.
