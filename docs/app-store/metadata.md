# App Store Connect · metadata for «I stødet»

Udkast pr. 2026-10-10. Alt her er klar til at blive kopieret ind i App Store Connect.
Teksterne beskriver kun funktioner, der findes i appen i dag. Notifikationer og widget
er ikke bygget endnu (beads `elpriser-8gu.1` og `elpriser-psx.7`) og må først nævnes,
når de er med i det build, der sendes til review.

## Grundoplysninger

| Felt | Værdi | Grænse |
|---|---|---|
| Navn | I stødet | 30 tegn |
| Undertitel | Elpriser time for time | 30 tegn |
| Bundle ID | dk.alfanova.istoedet | |
| Primært sprog | Dansk | |
| Kategori | Værktøjer (Utilities) | |
| Sekundær kategori | Livsstil (Lifestyle) | valgfri |
| Aldersgrænse | 4+ | ingen af indholdstyperne i spørgeskemaet forekommer |
| Pris | Gratis | |
| Enheder | iPhone | iPad er slået fra i v1 |
| Privatlivspolitik | https://xn--i-stdet-t1a.dk/privatliv/ | |
| Support-URL | https://xn--i-stdet-t1a.dk/support/ | |
| Marketing-URL | https://xn--i-stdet-t1a.dk/ | valgfri |
| Copyright | 2026 alfanova | |

App Store Connect accepterer ikke altid æ/ø/å i URL-felter. Brug derfor punycode-formen
ovenfor. Den viser samme side som i-stødet.dk.

## Reklametekst (170 tegn, kan ændres uden nyt build)

Se hvornår strømmen er billig i dag og i morgen. Med dit eget netselskabs tarif regnet med, så prisen passer til din elregning.

## Beskrivelse (4000 tegn)

I stødet viser dig, hvornår strømmen er billig. Time for time, i dag og i morgen.

Du behøver ikke lave om på, hvad du bruger. Du skal bare vide, hvornår det er billigst at tænde for elbilen, opvaskemaskinen og vaskemaskinen.

DEN PRIS DU FAKTISK BETALER
Appen viser den samlede pris pr. kWh. Det er spotprisen plus elafgift, Energinets tariffer, dit netselskabs tarif og moms. Du vælger selv dit netselskab, og appen bruger de satser, der gælder lige nu. Du kan også lægge dit elselskabs tillæg oven i.

HVORNÅR SKAL DU TÆNDE?
Appen finder de billigste sammenhængende timer til bilen, opvasken og vasketøjet. Du bestemmer selv, hvor mange timer hvert apparat skal bruge.

SE HVAD PRISEN BESTÅR AF
Tryk på en time i grafen. Så ser du, hvor meget der er spotpris, afgift, tariffer og tillæg.

DIT EGET FORBRUG
Forbind Eloverblik, hvis du vil se dit eget forbrug time for time. Appen viser, hvor meget du brugte i de billige, de mellemste og de dyre timer. Du kan også se, hvor meget CO2 dit forbrug har udledt, og sammenligne timepris med en fastpris for den enkelte dag.

Det er valgfrit at forbinde Eloverblik. Priserne virker uden.

POINT FOR AT FLYTTE FORBRUG
Tryk på «Tænd nu», når du starter et apparat. Når dit forbrug er klar hos Eloverblik, tjekker appen det og giver point for det forbrug, du har flyttet til billige timer.

DINE DATA BLIVER HOS DIG
Du opretter ingen konto. Appen gemmer dine indstillinger og dit forbrug på din egen telefon. Vi bruger ingen statistik, ingen sporing og ingen reklamer.

VÆRD AT VIDE
Priserne er vejledende. Tariffer og afgifter ændrer sig flere gange om året, og dit elselskabs abonnement er ikke med. Det er altid din elregning, der gælder.

I stødet er et uafhængigt værktøj fra alfanova. Vi er ikke tilknyttet Energinet, Eloverblik, netselskaberne eller noget elselskab. Vi bruger deres offentligt tilgængelige data.

## Søgeord (100 tegn, kommasepareret, uden mellemrum efter komma)

```
elpris,elpriser,strøm,spotpris,elbil,opladning,tarif,nettarif,billig strøm,eloverblik,forbrug,CO2
```

97 tegn. «I stødet» og «alfanova» skal ikke med, fordi navn og udvikler allerede er søgbare.

## Nyheder i denne version (første version)

Første version af I stødet.

## App Privacy (privatlivs-mærkatet)

Svar: **Data Not Collected** («Der indsamles ingen data»).

Begrundelse, hvis Apple spørger:

- Appen har ingen konto og ingen server, der modtager brugerdata.
- Indstillinger, Eloverblik-token, hentet forbrug og point ligger kun på enheden.
- Der er ingen analyse- eller reklame-SDK'er. Appens privacy manifest
  (`ios/App/App/PrivacyInfo.xcprivacy`) erklærer ingen tracking og ingen indsamlede datatyper.
- Appen henter data direkte fra elprisenligenu.dk, api.energidataservice.dk og, hvis brugeren
  selv forbinder det, api.eloverblik.dk. Skrifttyperne ligger i appen.

## Eksport-compliance

`ITSAppUsesNonExemptEncryption` er `false` i Info.plist. Appen bruger kun HTTPS via systemet.
Svar «Nej» til egen kryptering.

## Noter til App Review

```
I stødet shows Danish electricity prices hour by hour, including taxes and the user's own
grid operator tariff, and recommends the cheapest hours for running appliances.

No account or login is needed. All features on the "Nu", "Point" and "Mere" tabs work
immediately after launch.

The "Forbrug" tab is optional. It shows the user's own consumption and requires a personal
API token from eloverblik.dk, the Danish national electricity data hub, which is only
available to Danish residents with MitID. You can review the rest of the app without it.
If you want to see this tab with data, please contact us at hej@i-stødet.dk and we will
provide a demo token.

Data sources are public: elprisenligenu.dk (spot prices) and Energi Data Service from
Energinet (tariffs and CO2). The app is an independent tool from alfanova and is not
affiliated with Energinet, Eloverblik or any electricity company. This is stated in the
app description and on the support page.

The app stores settings and consumption data on the device only. Nothing is sent to us.
```

Kontakt til review: Johannes Damsgaard-Bruhn, hej@i-stødet.dk. Telefonnummer udfyldes i App Store Connect.

## Screenshots

Udkast ligger i `docs/app-store/screenshots/`. De er taget fra web-versionen af appen i de
præcise pixelmål, som App Store kræver, og viser samme skærme som iOS-appen. iOS-appen har
derudover systemets statuslinje, så de endelige billeder bør tages i simulatoren, når
projektet kan bygges i Xcode.

| Mappe | Mål | Skærm |
|---|---|---|
| `6.9/` | 1320 × 2868 | iPhone 6,9" (påkrævet) |
| `6.5/` | 1284 × 2778 | iPhone 6,5" |

Rækkefølge: 1 Nu-pris og anbefalinger · 2 Prisens dele for en time · 3 Netselskab og
indstillinger · 4 Temaet «Bold» · 5 Temaet «Legende» · 6 Point.

## Før du sender til review

- [ ] Byg og arkivér i Xcode. iOS-ændringerne (kun iPhone, privacy manifest, dansk
      lokalisering) er ikke bygget endnu.
- [ ] Beslut om lokale notifikationer skal med i første version. Uden en native funktion er
      der risiko for afvisning efter guideline 4.2 (minimum functionality).
- [ ] Tag endelige screenshots i simulatoren.
- [ ] Hav et demo-token til Eloverblik klar, hvis review beder om det.
