// history.js — prishistorik for store skærme. Ingen DOM: index.html henter og cacher
// de rå timepriser pr. dag ({ region, days: { dayKey: [records] } }) og bruger
// funktionerne her til at regne totalpriser og nøgletal. Totalprisen regnes med
// tariffen for den enkelte dato (componentsOf), så gamle dage står med datidens satser.
import { totalOf, parseDK } from './pricing.js';

const keyOf = d => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
const fromKey = k => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
const DAYS = ['søn.', 'man.', 'tir.', 'ons.', 'tor.', 'fre.', 'lør.'];
const SPAN = 4;            // længde på det typiske billige og dyre tidsrum, i timer
const SHIFT_KWH_DAY = 2;   // eksempel: så meget forbrug flyttet om dagen

// De sidste n dage til og med i dag (dansk vægur), ældste først.
export function historyKeys(now, n){
  return Array.from({ length: n }, (_, i) => keyOf(new Date(now.getFullYear(), now.getMonth(), now.getDate() - (n - 1 - i))));
}

// En række pr. dag: { key, label, hours: number[24] (øre/kWh inkl. alt, null for
// timer uden data) | null hvis dagen ikke er hentet }.
export function historyRows(cache, region, keys, cfg){
  const days = cache && cache.region === region && cache.days ? cache.days : {};
  return keys.map(key => {
    const d = fromKey(key), label = `${DAYS[d.getDay()]} ${d.getDate()}.`;
    const recs = Array.isArray(days[key]) ? days[key] : null;
    if (!recs || !recs.length) return { key, label, hours: null };
    const hours = Array(24).fill(null);
    for (const r of recs) {
      const t = parseDK(r.time_start);
      if (t.dayKey === key && hours[t.h] == null) hours[t.h] = totalOf(r, cfg);   // 25-timers dag: første time 02
    }
    return { key, label, hours };
  });
}

// Billigste og dyreste sammenhængende tidsrum på SPAN timer i det gennemsnitlige døgn.
function spans(hourAvg){
  let cheap = null, dear = null;
  for (let h = 0; h + SPAN <= 24; h++) {
    const w = hourAvg.slice(h, h + SPAN);
    if (w.some(v => v == null)) continue;
    const avg = w.reduce((a, b) => a + b, 0) / SPAN;
    if (!cheap || avg < cheap.avg) cheap = { from: h, to: h + SPAN, avg };
    if (!dear || avg > dear.avg) dear = { from: h, to: h + SPAN, avg };
  }
  return { cheap, dear };
}

export function historyStats(rows){
  const cells = [];
  rows.forEach(r => r.hours && r.hours.forEach((v, h) => { if (v != null) cells.push({ v, key: r.key, label: r.label, h }); }));
  if (!cells.length) return null;
  const vals = cells.map(c => c.v), lo = Math.min(...vals), hi = Math.max(...vals);
  const min = cells.find(c => c.v === lo), max = cells.find(c => c.v === hi);
  const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
  const third = lo + (hi - lo) / 3;
  const cheapShare = vals.filter(v => v < third).length / vals.length;
  const dayAvgs = rows.filter(r => r.hours && r.hours.some(v => v != null)).map(r => {
    const v = r.hours.filter(x => x != null); return { key: r.key, label: r.label, avg: v.reduce((a, b) => a + b, 0) / v.length };
  });
  const byAvg = [...dayAvgs].sort((a, b) => a.avg - b.avg);
  const hourAvg = Array.from({ length: 24 }, (_, h) => {
    const v = rows.map(r => r.hours && r.hours[h]).filter(x => x != null);
    return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
  });
  const { cheap, dear } = spans(hourAvg);
  const shiftSavingWeek = cheap && dear ? (dear.avg - cheap.avg) * SHIFT_KWH_DAY * 7 / 100 : 0;
  return { days: dayAvgs.length, avg, lo, hi, min, max, cheapShare, dayAvgs, hourAvg,
    cheapestDay: byAvg[0], dearestDay: byAvg[byAvg.length - 1], cheapSpan: cheap, dearSpan: dear,
    shiftKwhDay: SHIFT_KWH_DAY, shiftSavingWeek };
}

// Behold kun de `keep` nyeste dage i cachen.
export function pruneHistory(cache, keep){
  const keys = Object.keys(cache.days || {}).sort((a, b) => fromKey(a) - fromKey(b));
  const days = {}; keys.slice(-keep).forEach(k => { days[k] = cache.days[k]; });
  return { ...cache, days };
}
