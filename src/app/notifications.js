// notifications.js — ren logik for appens lokale notifikationer. Ingen DOM og
// ingen Capacitor: index.html oversætter planen til LocalNotifications-kald.
import { seriesForDay, bestWindow } from './pricing.js';

const pad = n => String(n).padStart(2, '0');
const kr = ore => (ore / 100).toFixed(2).replace('.', ',');
const keyOf = d => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
const WINDOW_HOURS = 3;   // typisk længde for vask, opvask og en del af en opladning

// Faste id'er for den daglige notifikation (i dag + 6 dage frem), så de kan
// annulleres og planlægges igen hver gang appen henter nye priser.
export const DAILY_IDS = [4100, 4101, 4102, 4103, 4104, 4105, 4106];

// Besked om morgendagens billigste vindue, eller null hvis appen ikke har
// (næsten) hele morgendagen endnu. `dayKey` er i appens format (2026-10-11
// eller 2026-10-1; begge virker, fordi de sammenlignes som datoer).
export function dailyTomorrowMessage(raw, cfg, dayKey){
  const [y, m, d] = String(dayKey).split('-').map(Number);
  const series = seriesForDay(raw, `${y}-${m}-${d}`, cfg);
  if (series.length < 20) return null;
  const w = bestWindow(series, WINDOW_HOURS);
  if (!w) return null;
  return {
    title: 'Billig strøm i morgen',
    body: `I morgen er strømmen billigst kl. ${pad(w.from.h)}–${pad((w.to.h + 1) % 24)}, ca. ${kr(w.avg)} kr/kWh.`,
  };
}

const REMINDER = { title: 'Morgendagens elpriser er klar', body: 'Se hvornår strømmen er billigst i morgen.' };

// Plan for de næste 7 dage på brugerens tidspunkt. `now` er dansk vægur
// (nowDK). Dagens notifikation får de rigtige tal, hvis appen allerede har
// morgendagens priser; de øvrige dage er en påmindelse, som udskiftes med tal,
// når appen åbnes og henter dem. Returnerer [{ id, atDK, title, body }], hvor
// atDK er dansk vægur (index.html omregner til rigtig tid).
export function planDaily(settings, raw, cfg, now){
  if (!settings || !settings.on) return [];
  const hour = Number.isInteger(settings.hour) && settings.hour >= 0 && settings.hour <= 23 ? settings.hour : 14;
  const plan = [];
  DAILY_IDS.forEach((id, offset) => {
    const atDK = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset, hour, 0, 0);
    if (atDK <= now) return;
    const tomorrow = new Date(atDK.getFullYear(), atDK.getMonth(), atDK.getDate() + 1);
    const msg = dailyTomorrowMessage(raw, cfg, keyOf(tomorrow)) || REMINDER;
    plan.push({ id, atDK, ...msg });
  });
  return plan;
}
