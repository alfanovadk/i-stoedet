// view.js — ren visnings-logik for «Nu»-fanen. Ingen DOM, ingen global state:
// alt afhænger af (raw, cfg, now), så det kan testes med falsk tid.
// `now` er dansk vægur (nowDK() fra pricing.js). `cfg` er { markup, tariff }.
import { parseDK, totalOf, seriesForDay, loHi, tierOf, levelOf, goTier, bestWindow } from './pricing.js?v=14';

export const keyOf = d => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
const addDay = d => { const x = new Date(d); x.setDate(x.getDate() + 1); return x; };

// Alle timer fra og med den igangværende time, kronologisk — puljen som de
// anbefalede tidsvinduer vælges fra.
export function futurePool(raw, cfg, now){
  const cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours());
  return raw.map(r => { const t = parseDK(r.time_start);
      return { h:t.h, dayKey:t.dayKey, dow:t.dow, total:totalOf(r, cfg), dateObj:new Date(t.y, t.monthIdx, t.d, t.h),
        ts:Math.floor(Date.parse(r.time_start) / 1000) }; })
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
  const nowLevel = hasToday ? levelOf(nowTotal) : 1;
  const peak = hasToday ? Math.max(...todayVals) : 0;
  const cheapAt = h => { const e = byHour(h); return !!e && tierOf(e.total, loT, hiT) === 0; };

  let cheapEndH = nowH; while (cheapEndH < 24 && cheapAt(cheapEndH)) cheapEndH++;
  let nextCheapH = -1; for (let h = nowH; h < 24; h++) if (cheapAt(h)) { nextCheapH = h; break; }

  const dayAvg = todayVals.length ? todayVals.reduce((a, b) => a + b, 0) / todayVals.length : 0;
  const score = hasToday ? Math.round(Math.max(0, Math.min(100, (peak - nowTotal) / Math.max(1, peak - loT) * 100))) : 0;
  // Ellys udtryk: mood 1 = dagens billigste time, 0 = dagens dyreste. look er hvor langt
  // fremme den næste billige time ligger (0 = nu, 1 = 8+ timer eller først i morgen).
  // The fixed price level caps it: never a big smile at a high price, never a frown at a low one.
  const dayMood = hasToday ? 1 - Math.max(0, Math.min(1, (nowTotal - loT) / Math.max(1, hiT - loT))) : 1;
  const mood = nowLevel === 2 ? Math.min(dayMood, 0.5) : (nowLevel === 0 ? Math.max(dayMood, 0.5) : dayMood);
  const look = !hasToday || nowTier === 0 ? 0 : (nextCheapH < 0 ? 1 : Math.min(1, (nextCheapH - nowH) / 8));
  return { nowH, todayList, tmrList, hasToday, hasTmr, loT, hiT, nowTotal, nowTier, nowLevel, goTier: goTier(nowTier, nowLevel), peak, cheapEndH, nextCheapH, dayAvg, score, mood, look };
}

// Data til iOS-widget'en (læses af ios/App/IStoedetWidget/PriceStore.swift): de
// kommende timepriser som { t: epoch-sekunder, p: øre/kWh } og det billigste
// sammenhængende vindue på `windowLen` timer. `nowEpoch` er rigtig tid i sekunder.
export function widgetPayload(raw, cfg, now, area, nowEpoch, windowLen = 3){
  const pool = futurePool(raw, cfg, now).filter(x => Number.isFinite(x.ts));
  const w = bestWindow(pool, windowLen);
  return {
    updated: nowEpoch, area,
    hours: pool.map(x => ({ t:x.ts, p:Math.round(x.total * 10) / 10 })),
    cheapFrom: w ? w.from.ts : null,
    cheapTo: w ? w.to.ts + 3600 : null,
  };
}
