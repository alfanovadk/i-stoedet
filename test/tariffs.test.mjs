import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DSO_TARIFFS, validLive, liveSource, tariffAt, nettarif } from '../src/app/pricing.js';

const SNAP = JSON.parse(readFileSync(new URL('../src/app/tariffs.json', import.meta.url), 'utf8'));

test('tariffs.json: gyldigt snapshot for kendte netselskaber', () => {
  assert.match(SNAP.fetched, /^\d{4}-\d{2}-\d{2}$/);
  const keys = Object.keys(SNAP.dso);
  assert.ok(keys.length > 0);
  for (const k of keys) {
    assert.ok(DSO_TARIFFS[k], `ukendt netselskab i snapshot: ${k}`);
    assert.ok(validLive(SNAP.dso[k]), `ugyldige perioder for ${k}`);
  }
});

test('tariffs.json: Radius vinter 2026/27 matcher den verificerede sats', () => {
  const tariff = { ...DSO_TARIFFS.radius, live: SNAP.dso.radius };
  assert.equal(nettarif(17, 9, tariffAt(tariff, '2026-10-15')), 119.45);
  assert.equal(nettarif(3, 9, tariffAt(tariff, '2026-10-15')), 13.27);
});

const P = (from, v) => [{ from, to: null, hourly: Array(24).fill(v) }];

test('liveSource: frisk live-hentning vinder over snapshot', () => {
  assert.deepEqual(liveSource({ ts: 2000, periods: P('2026-10-01', 1) }, P('2026-10-01', 2), 1000), P('2026-10-01', 1));
});

test('liveSource: snapshot vinder når live-cachen er ældre end snapshot, eller mangler', () => {
  assert.deepEqual(liveSource({ ts: 500, periods: P('2026-10-01', 1) }, P('2026-10-01', 2), 1000), P('2026-10-01', 2));
  assert.deepEqual(liveSource(undefined, P('2026-10-01', 2), 1000), P('2026-10-01', 2));
});

test('liveSource: ugyldige kilder springes over, ingen kilde giver null', () => {
  assert.deepEqual(liveSource({ ts: 500, periods: P('2026-10-01', 1) }, [{ from: 'x' }], 1000), P('2026-10-01', 1));
  assert.equal(liveSource({ ts: 9999, periods: 'junk' }, undefined, 0), null);
  assert.equal(liveSource(undefined, undefined, 0), null);
});
