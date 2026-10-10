// pricing.js — ren pris-motor for «I stødet»-PWA. Ingen DOM, ingen global state.
// Alle beløb i øre/kWh inkl. moms, medmindre andet er nævnt.

export const ELAFGIFT = 1.0;     // 0,8 øre ekskl. moms × 1,25 (Skat, midlertidig nedsættelse 2026–2027)
export const MOMS = 1.25;

// Energinets net- + systemtarif, øre/kWh inkl. moms (DatahubPricelist 40000 + 41000).
export const ENERGINET_PERIODS = [
  { from:'2026-01-01', ore:14.375 }, // 5,375 + 9,0
  { from:'2027-01-01', ore:13.125 }, // 7,0 + 6,125
];

// Nettariffer, øre/kWh inkl. moms. Tarifmodel 3.0.
// Hver periode gælder fra `from` (YYYY-MM-DD) til næste periodes `from`.
// Netselskaber skifter typisk satser 1/1, 1/4 og 1/10 — tilføj en ny periode.
// Kilder: jan 2026 fra elforbrug.nu/eloversigt.dk; 2026-10-01 fra Energi Data
// Service DatahubPricelist (Price × 1,25), verificeret 2026-10-10.
// `area` er prisområdet netselskabet ligger i (bestemmer spotprisen).
// `datahub` er live-kilden i DatahubPricelist (ejer + tarifkoder; flere koder
// summeres). Den statiske tabel her er fallback, når live-data mangler.
export const DSO_TARIFFS = {
  n1:       { navn:'N1', area:'DK1', datahub:{owner:'N1 A/S - 131', codes:['CD']}, periods:[
    { from:'2026-01-01', winter:{lav:11,hoej:33,spids:99},  summer:{lav:11,hoej:17,spids:43} },
  ]},
  radius:   { navn:'Radius', area:'DK2', datahub:{owner:'Radius Elnet A/S', codes:['DT_C_01']}, periods:[
    { from:'2026-01-01', winter:{lav:12,hoej:37,spids:110}, summer:{lav:13,hoej:20,spids:52} },
    { from:'2026-10-01', winter:{lav:13.27,hoej:39.82,spids:119.45}, summer:{lav:13.27,hoej:19.91,spids:51.76} },
  ]},
  cerius:   { navn:'Cerius', area:'DK2', datahub:{owner:'Cerius A/S', codes:['30TR_C_ET']}, periods:[
    { from:'2026-01-01', winter:{lav:13,hoej:40,spids:120}, summer:{lav:14,hoej:22,spids:56} },
    { from:'2026-10-01', winter:{lav:14.42,hoej:43.25,spids:129.75}, summer:{lav:14.42,hoej:21.63,spids:56.23} },
  ]},
  trefor:   { navn:'TREFOR El-net', area:'DK1', datahub:{owner:'TREFOR El-net A/S', codes:['C']}, periods:[
    { from:'2026-01-01', winter:{lav:8, hoej:24,spids:73},  summer:{lav:5, hoej:8, spids:21} },
    { from:'2026-10-01', winter:{lav:5.36,hoej:16.10,spids:48.29}, summer:{lav:5.36,hoej:8.05,spids:20.93} },
  ]},
  // Konstant: bruttotarif C_FBTNTR_B minus rabat C_FBTNTR_R.
  konstant: { navn:'Konstant', area:'DK1', datahub:{owner:'Konstant Net A/S - 151', codes:['C_FBTNTR_B','C_FBTNTR_R']}, periods:[
    { from:'2026-01-01', winter:{lav:6, hoej:18,spids:54},  summer:{lav:6, hoej:9, spids:24} },
    { from:'2026-10-01', winter:{lav:6.17,hoej:18.55,spids:55.66}, summer:{lav:6.17,hoej:9.28,spids:24.11} },
  ]},
  dinel:    { navn:'Dinel', area:'DK1', datahub:{owner:'Dinel A/S', codes:['TCL<100_02']}, periods:[
    { from:'2026-01-01', winter:{lav:10,hoej:30,spids:91},  summer:{lav:8, hoej:12,spids:30} },
    { from:'2026-10-01', winter:{lav:7.69,hoej:23.07,spids:69.24}, summer:{lav:7.69,hoej:11.54,spids:30.00} },
  ]},
};

// Tarif gældende på `date` (YYYY-MM-DD). En live-periode der dækker datoen
// vinder; ellers den statiske tabel. En egen tarif ({winter, summer} uden
// perioder) returneres uændret.
export function tariffAt(tariff, date){
  const live = tariff.live?.find(p => date >= p.from && (!p.to || date < p.to));
  if (live) return live;
  return tariff.periods ? periodAt(tariff.periods, date) : tariff;
}

// URL til netselskabets nettariffer (ChargeType D03) med ValidFrom >= `since`.
export function datahubURL(dso, since, base = 'https://api.energidataservice.dk'){
  const src = DSO_TARIFFS[dso]?.datahub;
  if (!src) return null;
  const filter = JSON.stringify({ ChargeOwner:[src.owner], ChargeTypeCode:src.codes, ChargeType:['D03'] });
  return base + '/dataset/DatahubPricelist?' +
    new URLSearchParams({ filter, start:since, sort:'ValidFrom asc', limit:'200' });
}

// DatahubPricelist-records (kr/kWh ekskl. moms, Price1..Price24) → live-perioder
// [{from, to, hourly[24]}] i øre inkl. moms. En periode kræver en record for
// hver kode; flade tariffer har kun Price1.
export function liveFromDatahub(records, codes){
  const recs = (Array.isArray(records) ? records : [])
    .filter(r => r && r.ChargeType === 'D03' && codes.includes(r.ChargeTypeCode) && typeof r.ValidFrom === 'string')
    .map(r => ({ r, from:r.ValidFrom.slice(0, 10), to:typeof r.ValidTo === 'string' ? r.ValidTo.slice(0, 10) : null }));
  const out = [];
  for (const from of [...new Set(recs.map(x => x.from))].sort()){
    const parts = codes.map(c => recs.find(x => x.r.ChargeTypeCode === c && from >= x.from && (!x.to || from < x.to)));
    if (parts.some(x => !x)) continue;
    const ends = [...parts.map(x => x.to), ...recs.map(x => x.from).filter(f => f > from)].filter(Boolean).sort();
    const hourly = Array.from({ length:24 }, (_, h) =>
      Math.round(parts.reduce((sum, x) => sum + (x.r['Price' + (h + 1)] ?? x.r.Price1), 0) * 100 * MOMS * 100) / 100);
    const period = { from, to:ends[0] ?? null, hourly };
    if (validLive([period])) out.push(period);
  }
  return out;
}

// Data fra tredjeparts-API'er caches i localStorage. De valideres både før de
// gemmes og når de læses, så et misdannet svar aldrig kan vælte appen ved start.
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;
export function validLive(periods){
  return Array.isArray(periods) && periods.length > 0 && periods.every(p =>
    p && typeof p.from === 'string' && ISO_DAY.test(p.from) &&
    (p.to === null || (typeof p.to === 'string' && ISO_DAY.test(p.to))) &&
    Array.isArray(p.hourly) && p.hourly.length === 24 && p.hourly.every(Number.isFinite));
}
export function validRecords(records){
  return Array.isArray(records)
    ? records.filter(r => r && Number.isFinite(r.DKK_per_kWh) &&
        typeof r.time_start === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:/.test(r.time_start))
    : [];
}

export const energinetAt = date => periodAt(ENERGINET_PERIODS, date).ore;

// Prisområde for et netselskab; egen tarif ('custom') eller ukendt beholder `fallback`.
export const regionFor = (dso, fallback) => DSO_TARIFFS[dso]?.area ?? fallback;

function periodAt(periods, date){
  let cur = periods[0];
  for (const p of periods) if (date >= p.from) cur = p;
  return cur;
}

// monthIdx er 0-baseret (0=januar). Vinter okt–mar, sommer apr–sep.
export const season = monthIdx => (monthIdx >= 3 && monthIdx <= 8) ? 'summer' : 'winter';

export function nettarif(h, monthIdx, tariff){
  if (tariff.hourly) return tariff.hourly[h];
  const s = tariff[season(monthIdx)];
  if (h < 6) return s.lav;
  if (h >= 17 && h < 21) return s.spids;
  return s.hoej;
}

export function parseDK(s){
  const y=+s.slice(0,4), m=+s.slice(5,7), d=+s.slice(8,10), h=+s.slice(11,13);
  return { y, m, d, h, monthIdx:m-1, dayKey:`${y}-${m}-${d}`, dow:new Date(y,m-1,d).getDay() };
}

export function componentsOf(rec, cfg){
  const spot = rec.DKK_per_kWh * 100 * MOMS;
  const t = parseDK(rec.time_start);
  const date = rec.time_start.slice(0, 10);
  const net = nettarif(t.h, t.monthIdx, tariffAt(cfg.tariff, date));
  const energinet = energinetAt(date);
  const total = spot + ELAFGIFT + energinet + net + cfg.markup;
  return { spot, elafgift:ELAFGIFT, energinet, nettarif:net, markup:cfg.markup, total };
}

export function totalOf(rec, cfg){
  return componentsOf(rec, cfg).total;
}

export function tierOf(p, lo, hi){
  if (p == null) return 0;
  if (hi - lo < 1) return 0;
  const f = (p - lo) / (hi - lo);
  return f < .34 ? 0 : (f < .67 ? 1 : 2);
}

// Pris-tier (0=billig,1=middel,2=dyr) → Elly-maskottens tilstandsklasse.
export function tierClass(tier){
  return tier === 0 ? 'cheap' : (tier === 2 ? 'expensive' : 'mid');
}

export function loHi(values){
  const v = values.filter(x => x != null);
  if (!v.length) return [0, 1];
  return [Math.min(...v), Math.max(...v)];
}

export function bestWindow(pool, len){
  if (!pool.length) return null;
  if (pool.length < len) len = pool.length;
  let best = null;
  for (let i = 0; i + len <= pool.length; i++){
    let s = 0;
    for (let j = 0; j < len; j++) s += pool[i+j].total;
    const avg = s / len;
    if (!best || avg < best.avg) best = { avg, from:pool[i], to:pool[i+len-1], len };
  }
  return best;
}

// Returnerer kun de timer der faktisk findes for dagen — typisk 24, men
// 23/25 på DST-skiftedage. Bevarer API'ets kronologiske rækkefølge.
export function seriesForDay(raw, dayKey, cfg){
  const out = [];
  for (const r of raw){
    const t = parseDK(r.time_start);
    if (t.dayKey === dayKey) out.push({ h: t.h, total: totalOf(r, cfg) });
  }
  return out;
}

// «Nu» som dansk vægur: et Date-objekt hvis lokale felter (getHours, getDate …)
// viser Europe/Copenhagen-tid uanset enhedens tidszone. Kun til kalender- og
// time-logik — ikke til absolutte tidsstempler (brug Date.now() til dem).
const DK_PARTS = new Intl.DateTimeFormat('en-CA', {
  timeZone:'Europe/Copenhagen', hourCycle:'h23',
  year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit', second:'2-digit',
});
export function nowDK(at = new Date()){
  const p = {};
  for (const { type, value } of DK_PARTS.formatToParts(at)) p[type] = +value;
  return new Date(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
}

// Vælg prisdata efter et hentningsforsøg. Friske records vinder. Kunne dagens
// priser ikke hentes (offline/API-fejl), bruges cachen hvis den dækker dagen for
// samme prisområde; morgendagens genbruges fra cachen når de ikke kom med.
// `cache` er { region, ts, raw } eller null. `staleTs` er cachens tidsstempel
// når dagens priser stammer derfra, ellers null.
export function pickPrices(todayRecs, tmrRecs, cache, region, todayKey, tmrKey){
  const cached = key => (cache && cache.region === region)
    ? validRecords(cache.raw).filter(r => parseDK(r.time_start).dayKey === key) : [];
  const stale = !todayRecs.length;
  const today = stale ? cached(todayKey) : todayRecs;
  const tmr = tmrRecs.length ? tmrRecs : cached(tmrKey);
  return { raw:[...today, ...tmr], staleTs: stale && today.length ? (Number.isFinite(cache.ts) ? cache.ts : null) : null };
}
