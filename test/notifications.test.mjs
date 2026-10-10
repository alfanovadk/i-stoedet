import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dailyTomorrowMessage, planDaily, DAILY_IDS } from '../src/app/notifications.js';

// Flat tariff + zero markup: totals follow the spot price shape.
const CFG = { markup: 0, tariff: { winter: { lav: 0, hoej: 0, spids: 0 }, summer: { lav: 0, hoej: 0, spids: 0 } } };
const p2 = n => String(n).padStart(2, '0');
const day = (d, price, n = 24, off = '+02:00') => Array.from({ length: n }, (_, h) => ({ DKK_per_kWh: price(h), time_start: `2026-10-${p2(d)}T${p2(h % 24)}:00:00${off}` }));
// Cheapest 3 hours tomorrow: 02-05 at 0,10 kr spot; everything else 0,60.
const TMR = day(11, h => (h >= 2 && h < 5 ? 0.10 : 0.60));
const TODAY = day(10, () => 0.50);

test('dailyTomorrowMessage: billigste 3-timers vindue i morgen med pris', () => {
  const m = dailyTomorrowMessage([...TODAY, ...TMR], CFG, '2026-10-11');
  assert.equal(m.title, 'Billig strøm i morgen');
  // 0,10 kr spot × 1,25 moms + 1,0 elafgift + 14,375 Energinet = 27,875 øre ≈ 0,28 kr
  assert.equal(m.body, 'I morgen er strømmen billigst kl. 02–05, ca. 0,28 kr/kWh.');
});

test('dailyTomorrowMessage: null når morgendagen mangler eller er ufuldstændig', () => {
  assert.equal(dailyTomorrowMessage(TODAY, CFG, '2026-10-11'), null);
  assert.equal(dailyTomorrowMessage([...TODAY, ...TMR.slice(0, 12)], CFG, '2026-10-11'), null);
});

test('dailyTomorrowMessage: 25-timers dag (sommertid slutter) giver stadig et vindue', () => {
  const dst = [...day(25, h => (h === 3 ? 0.05 : 0.60), 24, '+01:00'), { DKK_per_kWh: 0.60, time_start: '2026-10-25T02:00:00+02:00' }];
  const m = dailyTomorrowMessage(dst, CFG, '2026-10-25');
  assert.ok(m && /kl\. \d\d–\d\d/.test(m.body), m && m.body);
});

const at = (d, h, min = 0) => new Date(2026, 9, d, h, min);

test('planDaily: slået fra planlægger intet', () => {
  assert.deepEqual(planDaily({ on: false, hour: 14 }, [...TODAY, ...TMR], CFG, at(10, 9)), []);
});

test('planDaily: i dag med rigtige tal, de næste dage med påmindelse', () => {
  const plan = planDaily({ on: true, hour: 14 }, [...TODAY, ...TMR], CFG, at(10, 9));
  assert.equal(plan.length, 7);
  assert.deepEqual(plan.map(p => p.id), DAILY_IDS);
  assert.deepEqual([plan[0].atDK.getDate(), plan[0].atDK.getHours(), plan[0].atDK.getMinutes()], [10, 14, 0]);
  assert.equal(plan[0].title, 'Billig strøm i morgen');
  assert.equal(plan[1].atDK.getDate(), 11);
  assert.equal(plan[1].title, 'Morgendagens elpriser er klar');
});

test('planDaily: er tidspunktet passeret i dag, starter planen i morgen', () => {
  const plan = planDaily({ on: true, hour: 14 }, [...TODAY, ...TMR], CFG, at(10, 15));
  assert.equal(plan.length, 6);
  assert.equal(plan[0].atDK.getDate(), 11);
  assert.equal(plan[0].title, 'Morgendagens elpriser er klar');   // tomorrow's tomorrow is unknown
});

test('planDaily: ugyldigt tidspunkt falder tilbage til kl. 14, og morgendagen ukendt giver påmindelse', () => {
  const plan = planDaily({ on: true, hour: 'x' }, TODAY, CFG, at(10, 9));
  assert.equal(plan[0].atDK.getHours(), 14);
  assert.equal(plan[0].title, 'Morgendagens elpriser er klar');
});
