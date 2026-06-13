import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseTimeSeries } from './eloverblik.js';

const FIXTURE = { result: [ { MyEnergyData_MarketDocument: { TimeSeries: [ { Period: [ {
  timeInterval: { start: '2026-06-12T22:00:00Z', end: '2026-06-13T22:00:00Z' },
  Point: Array.from({length:24},(_,i)=>({ position:String(i+1), 'out_Quantity.quantity':String((i*0.1).toFixed(3)) }))
} ] } ] } } ] };

test('parseTimeSeries: mapper til {dayKey: number[24]}', () => {
  const out = parseTimeSeries(FIXTURE);
  const keys = Object.keys(out);
  assert.equal(keys.length, 1);
  const arr = out[keys[0]];
  assert.equal(arr.length, 24);
  assert.equal(arr[0], 0);
  assert.ok(Math.abs(arr[10]-1.0) < 1e-9);
});

test('parseTimeSeries: tomt/uventet input → {}', () => {
  assert.deepEqual(parseTimeSeries({}), {});
  assert.deepEqual(parseTimeSeries(null), {});
  assert.deepEqual(parseTimeSeries({result:[]}), {});
});

test('parseTimeSeries: manglende Point-array håndteres', () => {
  const f = { result:[{ MyEnergyData_MarketDocument:{ TimeSeries:[{ Period:[{ timeInterval:{start:'2026-06-12T22:00:00Z'} }] }] } }] };
  const out = parseTimeSeries(f);
  // a day with all-zero array or empty — must not throw
  assert.equal(typeof out, 'object');
});
