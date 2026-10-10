// Besparelses-model pr. apparat. Single source for guides, /spar/-tabellen,
// forsiden og /saadan-beregner-vi/.
//
// MODEL (vindues-gennemsnit, ikke dyreste-minus-billigste time):
//
//   besparelse = flytbar kWh x ( snitpris i det vindue du typisk ville bruge
//                                - snitpris i det billigste vindue af samme længde )
//
// Vinduet er apparatets realistiske køretid (N timer). En elbil kan ikke lade
// 50 kWh på én time, så den får aldrig hele forskellen mellem døgnets dyreste
// og billigste time. Jo længere vindue, jo mere udvandes forskellen.
//
// Alle priser herunder er kr/kWh inkl. moms og dækker KUN de dele af prisen der
// varierer over døgnet (nettarif + spot). Elafgift, Energinet-tarif og
// elselskabets tillæg er ens alle timer og går ud i differencen.

// ── Nettarif (tarifmodel 3.0): lavlast 00-06, spidslast 17-21, højlast resten ──
// Reference = N1's satser pr. januar 2026 (samme tal som src/app/pricing.js,
// DSO_TARIFFS.n1). N1 er valgt bevidst: forskellen spids-minus-lav er 0,88 kr
// om vinteren og 0,32 kr om sommeren, hvilket ligger i den LAVE ende af de
// store netselskaber (Radius/Cerius: ca. 1,06-1,15 kr vinter, 0,38-0,42 kr
// sommer). TREFOR, Konstant og Dinel ligger lavere (ca. 0,43-0,62 kr vinter);
// bor du der, er din besparelse mindre end tallene her. Appen regner med dit
// eget netselskab.
const tarif = {
  vinter: { lav: 0.11, hoej: 0.33, spids: 0.99 }, // okt-mar
  sommer: { lav: 0.11, hoej: 0.17, spids: 0.43 }, // apr-sep
};

// ── Spot-tillæg i forhold til nattetimerne (kr/kWh inkl. moms) ──
// ANTAGELSE, ikke en måling: spotprisen er typisk lavest om natten og højest i
// aftenspidsen. Vi lægger et forsigtigt tillæg oven på nattens niveau. Tallene
// er sat lavt med vilje, fordi spot-forskellen svinger meget fra dag til dag
// (på blæsende dage er den tæt på nul) og fordi sommerens billigste timer ofte
// ligger midt på dagen, hvor solcellerne producerer. Tariffen er derfor den
// bærende del af regnestykket, og spot er et lille, konservativt tillæg.
const spotTillaeg = {
  vinter: { nat: 0, dag: 0.10, aften: 0.25 },
  sommer: { nat: 0, dag: 0.05, aften: 0.20 },
};

const SAESONER = ["vinter", "sommer"];

// Den tidsvariable del af prisen i time h (0-23).
function timepris(h, saeson) {
  const t = tarif[saeson], s = spotTillaeg[saeson];
  if (h < 6) return t.lav + s.nat;
  if (h >= 17 && h < 21) return t.spids + s.aften;
  return t.hoej + s.dag;
}

// Snitpris over `timer` sammenhængende timer fra `start` (løber over midnat).
function vinduesSnit(start, timer, saeson) {
  let sum = 0;
  for (let i = 0; i < timer; i++) sum += timepris((start + i) % 24, saeson);
  return sum / timer;
}

// Billigste sammenhængende vindue af `timer` timer i døgnet.
function billigsteVindue(timer, saeson) {
  let bedst = { start: 0, snit: Infinity };
  for (let start = 0; start < 24; start++) {
    const snit = vinduesSnit(start, timer, saeson);
    if (snit < bedst.snit - 1e-9) bedst = { start, snit };
  }
  return bedst;
}

// Prisforskel i kr/kWh for apparatet. saeson: "vinter" | "sommer" | "aar".
// "aar" er et simpelt gennemsnit af de to halvår. Det er konservativt for
// varme, hvor det meste forbrug ligger om vinteren, hvor forskellen er størst.
function prisforskel(a, saeson = "aar") {
  if (saeson === "aar") return (prisforskel(a, "vinter") + prisforskel(a, "sommer")) / 2;
  return vinduesSnit(a.typiskStart, a.timer, saeson) - billigsteVindue(a.timer, saeson).snit;
}

// kWh der reelt kan flyttes pr. gang (hele forbruget, medmindre andet er angivet).
function flytbarKwh(a) { return a.flytbarKwh ?? a.kwh; }

const liste = [
  {
    slug: "elbil", navn: "Elbil-opladning", enhed: "pr. fuld opladning", icon: "car",
    // 50 kWh på en 11 kW hjemmelader tager ca. 4,5 time → 5 timers vindue.
    // Typisk uden styring: sat til når du kommer hjem kl. 17, lader 17-22.
    kwh: 50, timer: 5, typiskStart: 17, kanFlyttes: true,
    // 60 fulde opladninger = 3.000 kWh/år, ca. 16.000 km ved 18 kWh/100 km.
    frekvensOmAaret: 60,
    resume: "Størst potentiale. En opladning flyttet fra aftenen til natten sparer mest af alle apparater.",
    forudsaetning: "Kræver kun at du sætter til om aftenen og lader bilen eller laderen styre starttidspunktet.",
  },
  {
    slug: "opvaskemaskine", navn: "Opvaskemaskine", enhed: "pr. opvask", icon: "utensils",
    // Eco-program ca. 3 timer. Typisk uden styring: startet efter aftensmaden kl. 19.
    kwh: 1.0, timer: 3, typiskStart: 19, kanFlyttes: true, frekvensOmAaret: 300,
    resume: "Lille beløb pr. gang, men nemt: tænd udskudt start, når du går i seng.",
    forudsaetning: "De fleste maskiner har udskudt start (timer).",
  },
  {
    slug: "vaskemaskine", navn: "Vaskemaskine", enhed: "pr. vask", icon: "shirt",
    // 40°C-vask ca. 2 timer. Typisk uden styring: sat over sidst på eftermiddagen
    // kl. 16, så kun den ene time rammer spidslasten.
    kwh: 0.9, timer: 2, typiskStart: 16, kanFlyttes: true, frekvensOmAaret: 200,
    resume: "Som opvask: beskeden gevinst pr. vask, men gratis at flytte med timer.",
    forudsaetning: "Kræver udskudt start. Varmtvandstilslutning ændrer regnestykket.",
  },
  {
    slug: "varmepumpe", navn: "Varmepumpe & varmt vand", enhed: "pr. dag", icon: "fire",
    // 15 kWh/dag er hele forbruget, men et hus skal varmes hele døgnet. Vi regner
    // kun med at 30 % (4,5 kWh: varmt brugsvand + en smule forvarmning) kan
    // flyttes ud af de fire spidslast-timer 17-21 uden at det går ud over komforten.
    kwh: 15, flytbarKwh: 4.5, timer: 4, typiskStart: 17, kanFlyttes: false, frekvensOmAaret: 365,
    resume: "Stort forbrug, men kun en mindre del kan flyttes. Og kun hvis systemet kan tidsstyres uden at gå på kompromis med komfort eller legionella-sikkerhed.",
    forudsaetning: "Mange varmepumper og varmtvandsbeholdere kan IKKE tidsstyres uden videre. Tjek om din kan, før du regner med besparelsen.",
  },
];

function bySlug(slug) { return liste.find((a) => a.slug === slug); }

// Besparelse i kr pr. gang (pr. `enhed`). niveau: "sommer" | "aar" | "vinter".
function besparelse(a, niveau = "aar") {
  return Math.round(flytbarKwh(a) * prisforskel(a, niveau) * 100) / 100;
}
function besparelseOmAaret(a) {
  return Math.round(flytbarKwh(a) * prisforskel(a, "aar") * a.frekvensOmAaret);
}

// "17-22"-tekst for et vindue (til forklaringssiden).
function vindueTekst(start, timer) {
  const p = (h) => String(h % 24).padStart(2, "0");
  return `${p(start)}-${p(start + timer)}`;
}

// ESM (repoet er type:module). 11ty 3.x læser ESM _data-filer fint.
export default {
  tarif, spotTillaeg, SAESONER, liste, bySlug,
  timepris, vinduesSnit, billigsteVindue, prisforskel, flytbarKwh,
  besparelse, besparelseOmAaret, vindueTekst,
};
