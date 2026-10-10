import { test } from 'node:test';
import assert from 'node:assert/strict';
import { futurePool, viewCore, keyOf } from '../src/app/view.js';

// Flat tariff + zero markup so totals follow the spot price shape.
const CFG = { markup: 0, tariff: { winter: { lav: 0, hoej: 0, spids: 0 }, summer: { lav: 0, hoej: 0, spids: 0 } } };
const p2 = n => String(n).padStart(2, '0');
// One day of hourly records; price(h) in kr/kWh ekskl. moms.
const day = (y, m, d, price) => Array.from({ length: 24 }, (_, h) => ({ DKK_per_kWh: price(h), time_start: `${y}-${p2(m)}-${p2(d)}T${p2(h)}:00:00+02:00` }));
// Cheap at night (00–05), expensive in the evening peak (17–20), mid otherwise.
const shape = h => (h < 6 ? 0.10 : (h >= 17 && h < 21 ? 1.00 : 0.50));
const TODAY = day(2026, 10, 10, shape), TMR = day(2026, 10, 11, shape);
const at = (h, min = 0) => new Date(2026, 9, 10, h, min);

test('keyOf: ikke nul-paddet, matcher parseDK.dayKey', () => {
  assert.equal(keyOf(new Date(2026, 0, 5)), '2026-1-5');
});

test('futurePool: starter ved den igangværende time og er kronologisk', () => {
  const pool = futurePool([...TMR, ...TODAY], CFG, at(14, 59));
  assert.equal(pool[0].h, 14);
  assert.equal(pool[0].dayKey, '2026-10-10');
  assert.equal(pool.length, 10 + 24);
  assert.ok(pool.every((x, i) => i === 0 || x.dateObj > pool[i - 1].dateObj));
});

test('futurePool: timeskifte flytter puljens start', () => {
  assert.equal(futurePool(TODAY, CFG, at(15, 0))[0].h, 15);
  assert.equal(futurePool(TODAY, CFG, at(23, 30)).length, 1);
});

test('viewCore: billig nat — billigt indtil kl. 6', () => {
  const v = viewCore([...TODAY, ...TMR], CFG, at(3));
  assert.equal(v.nowTier, 0);
  assert.equal(v.cheapEndH, 6);
  assert.equal(v.nextCheapH, 3);
  assert.equal(v.hasToday && v.hasTmr, true);
  assert.equal(v.score, 100);
});

test('viewCore: dyr aften — ingen billige timer tilbage i dag', () => {
  const v = viewCore([...TODAY, ...TMR], CFG, at(18));
  assert.equal(v.nowTier, 2);
  assert.equal(v.nextCheapH, -1);
  assert.equal(v.cheapEndH, 18);
  assert.equal(v.score, 0);
  assert.equal(v.peak, v.nowTotal);
});

test('viewCore: før kl. 13 mangler morgendagen, efter er den der', () => {
  assert.equal(viewCore(TODAY, CFG, at(12)).hasTmr, false);
  assert.equal(viewCore([...TODAY, ...TMR], CFG, at(14)).hasTmr, true);
});

test('viewCore: ved midnat er «i dag» den nye dag', () => {
  const v = viewCore([...TODAY, ...TMR], CFG, new Date(2026, 9, 11, 0, 5));
  assert.equal(v.todayList.length, 24);
  assert.equal(v.hasTmr, false);
  assert.equal(v.nowH, 0);
});

test('viewCore: ingen data giver neutrale tal uden exception', () => {
  const v = viewCore([], CFG, at(10));
  assert.deepEqual([v.hasToday, v.hasTmr, v.nowTotal, v.nowTier, v.peak, v.score, v.dayAvg], [false, false, 0, 0, 0, 0, 0]);
});

test('viewCore: Ellys humør og blik følger prisen', () => {
  const night = viewCore([...TODAY, ...TMR], CFG, at(3));
  assert.deepEqual([night.mood, night.look], [1, 0]);              // cheapest hour: happy, looks at you
  const noon = viewCore([...TODAY, ...TMR], CFG, at(12));
  assert.ok(noon.mood > 0.4 && noon.mood < 0.7, 'mid price, mid mood: ' + noon.mood);
  assert.equal(noon.look, 1);                                       // no cheap hours left today
  const peak = viewCore([...TODAY, ...TMR], CFG, at(18));
  assert.deepEqual([peak.mood, peak.look], [0, 1]);
  assert.deepEqual([viewCore([], CFG, at(3)).mood, viewCore([], CFG, at(3)).look], [1, 0]);
});
