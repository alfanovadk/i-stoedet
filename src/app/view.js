// view.js — ren visnings-logik for «Nu»-fanen. Ingen DOM, ingen global state:
// alt afhænger af (raw, cfg, now), så det kan testes med falsk tid.
// `now` er dansk vægur (nowDK() fra pricing.js). `cfg` er { markup, tariff }.
import { parseDK, totalOf, seriesForDay, loHi, tierOf } from './pricing.js';

export const keyOf = d => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
const addDay = d => { const x = new Date(d); x.setDate(x.getDate() + 1); return x; };

// Alle timer fra og med den igangværende time, kronologisk — puljen som de
// anbefalede tidsvinduer vælges fra.
export function futurePool(raw, cfg, now){
  const cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours());
  return raw.map(r => { const t = parseDK(r.time_start);
      return { h:t.h, dayKey:t.dayKey, dow:t.dow, total:totalOf(r, cfg), dateObj:new Date(t.y, t.monthIdx, t.d, t.h) }; })
    .filter(x => x.dateObj >= cutoff).sort((a, b) => a.dateObj - b.dateObj);
}

// Kernetallene for «Nu»: dagens og morgendagens serier, nu-pris og -tier, og
// hvornår det er billigt. Timer er tal (0–24); `nextCheapH` er -1 når der ikke
// er flere billige timer i dag.
export function viewCore(raw, cfg, now){
  const nowH = now.getHours();
  const todayList = seriesForDay(raw, keyOf(now), cfg);
  const tmrList = seriesForDay(raw, keyOf(addDay(now)), cfg);
  const hasToday = todayList.length > 0, hasTmr = tmrList.length > 0;
  const todayVals = todayList.map(x => x.total);
  const [loT, hiT] = hasToday ? loHi(todayVals) : [0, 1];
  const byHour = h => todayList.find(x => x.h === h);
  const nowEntry = byHour(nowH);
  const nowTotal = nowEntry ? nowEntry.total : (todayVals[0] ?? 0);
  const nowTier = tierOf(nowTotal, loT, hiT);
  const peak = hasToday ? Math.max(...todayVals) : 0;
  const cheapAt = h => { const e = byHour(h); return !!e && tierOf(e.total, loT, hiT) === 0; };

  let cheapEndH = nowH; while (cheapEndH < 24 && cheapAt(cheapEndH)) cheapEndH++;
  let nextCheapH = -1; for (let h = nowH; h < 24; h++) if (cheapAt(h)) { nextCheapH = h; break; }

  const dayAvg = todayVals.length ? todayVals.reduce((a, b) => a + b, 0) / todayVals.length : 0;
  const score = hasToday ? Math.round(Math.max(0, Math.min(100, (peak - nowTotal) / Math.max(1, peak - loT) * 100))) : 0;
  return { nowH, todayList, tmrList, hasToday, hasTmr, loT, hiT, nowTotal, nowTier, peak, cheapEndH, nextCheapH, dayAvg, score };
}
