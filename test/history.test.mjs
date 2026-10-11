import { test } from 'node:test';
import assert from 'node:assert/strict';
import { historyKeys, historyRows, historyStats, pruneHistory } from '../src/app/history.js';

const CFG = { markup: 0, tariff: { winter: { lav: 0, hoej: 0, spids: 0 }, summer: { lav: 0, hoej: 0, spids: 0 } } };
const p2 = n => String(n).padStart(2, '0');
// kr/kWh excl. VAT; cheap nights, dear evenings. Wednesday 7 Oct is a bit dearer.
const shape = h => (h < 5 ? 0.10 : (h >= 17 && h < 21 ? 1.00 : 0.40));
const recs = (d, k = 1) => Array.from({ length: 24 }, (_, h) => ({ DKK_per_kWh: shape(h) * k, time_start: `2026-10-${p2(d)}T${p2(h)}:00:00+02:00` }));
const NOW = new Date(2026, 9, 10, 14, 0);

test('historyKeys: de sidste N dage til og med i dag, ældste først', () => {
  assert.deepEqual(historyKeys(NOW, 3), ['2026-10-8', '2026-10-9', '2026-10-10']);
  assert.equal(historyKeys(NOW, 30).length, 30);
  assert.equal(historyKeys(NOW, 30)[0], '2026-9-11');
});

test('historyRows: priser inkl. alt pr. time, null for manglende timer og dage', () => {
  const cache = { region: 'DK1', days: { '2026-10-9': recs(9), '2026-10-10': recs(10).slice(0, 15) } };
  const rows = historyRows(cache, 'DK1', ['2026-10-8', '2026-10-9', '2026-10-10'], CFG);
  assert.equal(rows.length, 3);
  assert.equal(rows[0].hours, null);                         // not fetched
  assert.equal(rows[1].hours.length, 24);
  assert.equal(rows[1].hours[0], 0.10 * 100 * 1.25 + 1.0 + 14.375);
  assert.equal(rows[2].hours[20], null);                     // after 14:00 today: no data yet
  assert.equal(rows[1].label, 'fre. 9.');
});

test('historyRows: cache for et andet prisområde bruges ikke', () => {
  const rows = historyRows({ region: 'DK2', days: { '2026-10-9': recs(9) } }, 'DK1', ['2026-10-9'], CFG);
  assert.equal(rows[0].hours, null);
});

test('historyStats: snit, yderpunkter, billig andel, mønster og dage', () => {
  const days = { '2026-10-7': recs(7, 1.3), '2026-10-8': recs(8), '2026-10-9': recs(9) };
  const rows = historyRows({ region: 'DK1', days }, 'DK1', ['2026-10-7', '2026-10-8', '2026-10-9'], CFG);
  const s = historyStats(rows);
  assert.equal(s.days, 3);
  assert.equal(s.min.key, '2026-10-8');                      // first occurrence of the lowest price
  assert.equal(s.min.h, 0);
  assert.equal(s.max.key, '2026-10-7');
  assert.equal(s.max.h, 17);
  assert.deepEqual([s.cheapSpan.from, s.cheapSpan.to], [0, 4]);
  assert.deepEqual([s.dearSpan.from, s.dearSpan.to], [17, 21]);
  assert.equal(s.cheapestDay.key, '2026-10-8');
  assert.equal(s.dearestDay.key, '2026-10-7');
  // Lowest third of the range (27.875-177.875 øre) ends at 77.875: nights and daytime on the two
  // normal days (20 + 20 hours) and only the nights on the dear day (5) = 45 of 72 hours.
  assert.equal(s.cheapShare, 45 / 72);
  assert.ok(s.shiftSavingWeek > 0);
  // 2 kWh a day moved from 17-21 to 00-04 for 7 days: (dear - cheap) øre × 14 kWh / 100.
  assert.equal(Math.round(s.shiftSavingWeek * 100), Math.round((s.dearSpan.avg - s.cheapSpan.avg) * 14));
});

test('historyStats: ingen data giver null', () => {
  assert.equal(historyStats([{ key: 'x', label: 'x', hours: null }]), null);
});

test('pruneHistory: beholder kun de nyeste dage', () => {
  const days = {}; for (let d = 1; d <= 10; d++) days[`2026-10-${d}`] = [];
  assert.deepEqual(Object.keys(pruneHistory({ region: 'DK1', days }, 3).days), ['2026-10-8', '2026-10-9', '2026-10-10']);
});
