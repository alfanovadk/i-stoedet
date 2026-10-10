import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  season, nettarif, DSO_TARIFFS, parseDK,
  componentsOf, totalOf, ELAFGIFT, energinetAt, regionFor, MOMS,
  tierOf, loHi, bestWindow, seriesForDay, tierClass, tariffAt, nowDK, datahubURL, liveFromDatahub, pickPrices,
} from '../src/app/pricing.js';

test('season: oktober-marts er vinter, april-september er sommer', () => {
  assert.equal(season(0), 'winter');
  assert.equal(season(2), 'winter');
  assert.equal(season(3), 'summer');
  assert.equal(season(8), 'summer');
  assert.equal(season(9), 'winter');
  assert.equal(season(11), 'winter');
});

test('DSO_TARIFFS: seks netselskaber, hver periode har begge sæsoner', () => {
  for (const key of ['n1','radius','cerius','trefor','konstant','dinel']) {
    const d = DSO_TARIFFS[key];
    assert.ok(d, `mangler ${key}`);
    for (const p of d.periods) {
      assert.match(p.from, /^\d{4}-\d{2}-\d{2}$/);
      for (const s of ['winter','summer']) {
        for (const band of ['lav','hoej','spids']) {
          assert.equal(typeof p[s][band], 'number', `${key}.${p.from}.${s}.${band}`);
        }
      }
    }
  }
});

test('nettarif: rigtige tidsbånd for N1 vinter', () => {
  const t = tariffAt(DSO_TARIFFS.n1, '2026-01-15');
  assert.equal(nettarif(3, 0, t), 11);
  assert.equal(nettarif(10, 0, t), 33);
  assert.equal(nettarif(18, 0, t), 99);
  assert.equal(nettarif(22, 0, t), 33);
});

test('nettarif: N1 sommer afviger fra vinter', () => {
  const t = tariffAt(DSO_TARIFFS.n1, '2026-01-15');
  assert.equal(nettarif(18, 5, t), 43);
  assert.equal(nettarif(3, 5, t), 11);
});

test('nettarif: spids-grænser er 17–20 inkl., 21 er høj', () => {
  const t = tariffAt(DSO_TARIFFS.cerius, '2026-01-15');
  assert.equal(nettarif(16, 0, t), 40);
  assert.equal(nettarif(17, 0, t), 120);
  assert.equal(nettarif(20, 0, t), 120);
  assert.equal(nettarif(21, 0, t), 40);
});

test('parseDK: udtrækker felter fra ISO-streng med offset', () => {
  const r = parseDK('2026-06-13T14:00:00+02:00');
  assert.equal(r.y, 2026);
  assert.equal(r.m, 6);
  assert.equal(r.d, 13);
  assert.equal(r.h, 14);
  assert.equal(r.monthIdx, 5);
  assert.equal(r.dayKey, '2026-6-13');
});

test('parseDK: dayKey bruger ikke nul-padding', () => {
  const r = parseDK('2026-01-05T03:00:00+01:00');
  assert.equal(r.dayKey, '2026-1-5');
  assert.equal(r.h, 3);
});

const REC = { DKK_per_kWh: 0.50, time_start: '2026-01-13T18:00:00+01:00' };
const CFG = { markup: 8, tariff: DSO_TARIFFS.n1 };

test('componentsOf: enkeltkomponenter er korrekte', () => {
  const c = componentsOf(REC, CFG);
  assert.equal(c.spot, 0.50 * 100 * MOMS);
  assert.equal(c.elafgift, ELAFGIFT);
  assert.equal(c.energinet, 14.375);
  assert.equal(c.nettarif, 99);
  assert.equal(c.markup, 8);
});

test('componentsOf: sum af komponenter == total (invariant)', () => {
  const c = componentsOf(REC, CFG);
  const sum = c.spot + c.elafgift + c.energinet + c.nettarif + c.markup;
  assert.ok(Math.abs(sum - c.total) < 1e-9, `sum ${sum} != total ${c.total}`);
});

test('totalOf == componentsOf(...).total', () => {
  assert.equal(totalOf(REC, CFG), componentsOf(REC, CFG).total);
});

test('totalOf reagerer på valgt DSO', () => {
  const n1 = totalOf(REC, { markup:8, tariff:DSO_TARIFFS.n1 });
  const trefor = totalOf(REC, { markup:8, tariff:DSO_TARIFFS.trefor });
  assert.notEqual(n1, trefor);
  assert.equal(n1 - trefor, 99 - 73);
});

test('konstanter har de verificerede 2026-værdier', () => {
  assert.equal(ELAFGIFT, 1.0);
  assert.equal(energinetAt('2026-06-01'), 14.375);
  assert.equal(MOMS, 1.25);
});

test('tierOf: null og flad serie giver tier 0', () => {
  assert.equal(tierOf(null, 0, 100), 0);
  assert.equal(tierOf(50, 10, 10.5), 0);
});

test('tierOf: tre niveauer ud fra position i lo–hi', () => {
  assert.equal(tierOf(10, 10, 110), 0);
  assert.equal(tierOf(60, 10, 110), 1);
  assert.equal(tierOf(110, 10, 110), 2);
});

test('tierClass: mapper pris-tier til Elly-tilstandsklasse', () => {
  assert.equal(tierClass(0), 'cheap');
  assert.equal(tierClass(1), 'mid');
  assert.equal(tierClass(2), 'expensive');
  assert.equal(tierClass(99), 'mid');
});

test('loHi: min og max af værdier', () => {
  assert.deepEqual(loHi([30, 10, 20]), [10, 30]);
});

test('loHi: filtrerer null/undefined fra', () => {
  assert.deepEqual(loHi([10, null, 20, undefined]), [10, 20]);
});

test('loHi: tom serie giver [0,1] (ingen Infinity)', () => {
  assert.deepEqual(loHi([]), [0, 1]);
});

test('bestWindow: finder billigste sammenhængende vindue', () => {
  const pool = [10,9,8,50,60].map((total,i)=>({ total, h:i }));
  const w = bestWindow(pool, 2);
  assert.equal(w.from.h, 1);
  assert.equal(w.to.h, 2);
  assert.equal(w.avg, 8.5);
});

test('bestWindow: tom pool giver null', () => {
  assert.equal(bestWindow([], 3), null);
});

const CFG6 = { markup: 0, tariff: DSO_TARIFFS.n1 };
const mkRec = (iso) => ({ DKK_per_kWh: 0.10, time_start: iso });

test('seriesForDay: normalt døgn giver 24 timer i rækkefølge', () => {
  const raw = Array.from({length:24}, (_,h)=>mkRec(`2026-06-13T${String(h).padStart(2,'0')}:00:00+02:00`));
  const s = seriesForDay(raw, '2026-6-13', CFG6);
  assert.equal(s.length, 24);
  assert.equal(s[0].h, 0);
  assert.equal(s[23].h, 23);
  assert.ok(s.every(x => typeof x.total === 'number'));
});

test('seriesForDay: forårs-DST (23 timer, kl 02 mangler) uden huller', () => {
  const hours = [0,1,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23];
  const raw = hours.map(h => mkRec(`2026-03-29T${String(h).padStart(2,'0')}:00:00+0${h<2?'1':'2'}:00`));
  const s = seriesForDay(raw, '2026-3-29', CFG6);
  assert.equal(s.length, 23);
  assert.ok(s.every(x => x.total != null), 'ingen null-huller');
});

test('seriesForDay: efterårs-DST (25 timer, kl 02 to gange)', () => {
  const recs = [];
  for (let h=0; h<2; h++) recs.push(mkRec(`2026-10-25T0${h}:00:00+02:00`));
  recs.push(mkRec('2026-10-25T02:00:00+02:00'));
  recs.push(mkRec('2026-10-25T02:00:00+01:00'));
  for (let h=3; h<24; h++) recs.push(mkRec(`2026-10-25T${String(h).padStart(2,'0')}:00:00+01:00`));
  const s = seriesForDay(recs, '2026-10-25', CFG6);
  assert.equal(s.length, 25);
  assert.equal(s.filter(x => x.h === 2).length, 2);
});

test('seriesForDay: filtrerer på dayKey', () => {
  const raw = [
    mkRec('2026-06-13T10:00:00+02:00'),
    mkRec('2026-06-14T10:00:00+02:00'),
  ];
  assert.equal(seriesForDay(raw, '2026-6-13', CFG6).length, 1);
});

// Dated tariffs: DSOs change rates on 1/1, 1/4, 1/10. Values verified against
// Energi Data Service DatahubPricelist (Price x 1.25) on 2026-10-10.
const at = (iso, dso) => componentsOf({ DKK_per_kWh: 0.5, time_start: iso }, { markup: 0, tariff: DSO_TARIFFS[dso] }).nettarif;

test('nettarif: vintersatser fra 1/10-2026 (spidslast kl. 17)', () => {
  const iso = '2026-10-15T17:00:00+02:00';
  assert.equal(at(iso, 'radius'), 119.45);
  assert.equal(at(iso, 'cerius'), 129.75);
  assert.equal(at(iso, 'trefor'), 48.29);
  assert.equal(at(iso, 'dinel'), 69.24);
  assert.equal(at(iso, 'n1'), 99);
});

test('nettarif: januar 2026 bruger stadig jan-2026-satserne', () => {
  const iso = '2026-01-13T18:00:00+01:00';
  assert.equal(at(iso, 'radius'), 110);
  assert.equal(at(iso, 'trefor'), 73);
});

test('nettarif: sommer 2026 uændret', () => {
  assert.equal(at('2026-07-01T18:00:00+02:00', 'radius'), 52);
});

test('tariffAt: egen tarif uden perioder returneres uændret', () => {
  const custom = { winter:{lav:1,hoej:2,spids:3}, summer:{lav:1,hoej:2,spids:3} };
  assert.equal(tariffAt(custom, '2026-10-15'), custom);
});

// Energinet net+system tariff (DatahubPricelist 40000 + 41000), verified 2026-10-10.
test('energinetAt: 14,375 i 2026, 13,125 fra 1/1-2027', () => {
  assert.equal(energinetAt('2026-12-31'), 14.375);
  assert.equal(energinetAt('2027-01-01'), 13.125);
  const c = componentsOf({ DKK_per_kWh: 0.5, time_start: '2027-01-02T10:00:00+01:00' }, { markup: 0, tariff: DSO_TARIFFS.n1 });
  assert.equal(c.energinet, 13.125);
});

// Konstant: gross C_FBTNTR_B minus discount C_FBTNTR_R, in both seasons.
test('nettarif: Konstant bruger nettosatser i begge sæsoner', () => {
  assert.equal(at('2026-10-15T17:00:00+02:00', 'konstant'), 55.66);
  assert.equal(at('2026-07-01T18:00:00+02:00', 'konstant'), 24);
  assert.equal(at('2027-07-01T18:00:00+02:00', 'konstant'), 24.11);
});

test('regionFor: netselskab bestemmer prisområde, egen tarif beholder valget', () => {
  for (const k of ['radius', 'cerius']) assert.equal(regionFor(k, 'DK1'), 'DK2');
  for (const k of ['n1', 'trefor', 'konstant', 'dinel']) assert.equal(regionFor(k, 'DK2'), 'DK1');
  assert.equal(regionFor('custom', 'DK2'), 'DK2');
  assert.equal(regionFor('ukendt', 'DK1'), 'DK1');
});

// nowDK returns a Date whose local fields show Copenhagen wall-clock time,
// regardless of the device time zone (tests run with whatever TZ the host has).
test('nowDK: dansk vægur uanset enhedens tidszone', () => {
  const summer = nowDK(new Date('2026-07-01T22:30:00Z'));   // CEST = UTC+2
  assert.deepEqual([summer.getFullYear(), summer.getMonth(), summer.getDate(), summer.getHours(), summer.getMinutes()], [2026, 6, 2, 0, 30]);
  const winter = nowDK(new Date('2026-12-31T23:15:00Z'));   // CET = UTC+1
  assert.deepEqual([winter.getFullYear(), winter.getMonth(), winter.getDate(), winter.getHours()], [2027, 0, 1, 0]);
});

// Live tariffs from Energi Data Service DatahubPricelist (prices ekskl. moms, kr/kWh).
const dh = (code, from, to, lav, hoej, spids) => {
  const r = { ChargeType: 'D03', ChargeTypeCode: code, ValidFrom: from + 'T00:00:00', ValidTo: to ? to + 'T00:00:00' : null };
  for (let i = 1; i <= 24; i++) { const h = i - 1; r['Price' + i] = h < 6 ? lav : (h >= 17 && h < 21 ? spids : hoej); }
  return r;
};

test('datahubURL: filtrerer på ejer + kode, null for egen tarif', () => {
  const u = new URL(datahubURL('radius', '2025-09-01'));
  assert.equal(u.hostname, 'api.energidataservice.dk');
  assert.deepEqual(JSON.parse(u.searchParams.get('filter')), { ChargeOwner: ['Radius Elnet A/S'], ChargeTypeCode: ['DT_C_01'], ChargeType: ['D03'] });
  assert.equal(u.searchParams.get('start'), '2025-09-01');
  assert.equal(datahubURL('custom', '2025-09-01'), null);
});

test('liveFromDatahub: perioder med 24 timepriser inkl. moms', () => {
  const live = liveFromDatahub([
    dh('DT_C_01', '2026-10-01', '2027-04-01', 0.106175, 0.318525, 0.955575),
    dh('DT_C_01', '2026-04-01', '2026-10-01', 0.106175, 0.15926, 0.41408),
    { ...dh('DT_C_01', '2026-10-01', null, 9, 9, 9), ChargeType: 'D01' },   // subscription, ignored
  ], ['DT_C_01']);
  assert.deepEqual(live.map(p => [p.from, p.to]), [['2026-04-01', '2026-10-01'], ['2026-10-01', '2027-04-01']]);
  assert.equal(live[1].hourly.length, 24);
  assert.equal(live[1].hourly[17], 119.45);
  assert.equal(live[1].hourly[3], 13.27);
});

test('liveFromDatahub: flere koder summeres (Konstant tarif + rabat), flad pris fra Price1', () => {
  const flat = { ChargeType: 'D03', ChargeTypeCode: 'R', ValidFrom: '2026-11-01T00:00:00', ValidTo: null, Price1: -0.008 };
  const live = liveFromDatahub([dh('B', '2026-10-01', '2027-01-01', 0.0605, 0.1816, 0.5449), dh('R', '2026-10-01', '2026-11-01', -0.0111, -0.0332, -0.0996), flat], ['B', 'R']);
  assert.deepEqual(live.map(p => [p.from, p.to]), [['2026-10-01', '2026-11-01'], ['2026-11-01', '2027-01-01']]);
  assert.equal(live[0].hourly[17], 55.66);
  assert.equal(live[1].hourly[17], 67.11);   // (0.5449 - 0.008) * 125
});

test('tariffAt/componentsOf: live-periode vinder, statisk tabel er fallback uden for dækning', () => {
  const live = liveFromDatahub([dh('DT_C_01', '2026-10-01', '2026-11-01', 0.1, 0.2, 0.8)], ['DT_C_01']);
  const tariff = { ...DSO_TARIFFS.radius, live };
  const net = iso => componentsOf({ DKK_per_kWh: 0.5, time_start: iso }, { markup: 0, tariff }).nettarif;
  assert.equal(net('2026-10-15T17:00:00+02:00'), 100);       // live
  assert.equal(net('2026-11-15T17:00:00+01:00'), 119.45);    // after ValidTo -> static
  assert.equal(net('2026-01-13T18:00:00+01:00'), 110);       // before -> static
});

// Offline fallback: which price records to show after a fetch attempt.
const day = (d, n = 2) => Array.from({ length: n }, (_, h) => ({ DKK_per_kWh: 0.5, time_start: `2026-10-${d}T0${h}:00:00+02:00` }));
const CACHE = { region: 'DK1', ts: 1234, raw: [...day(10), ...day(11)] };

test('pickPrices: friske priser vinder og er ikke markeret som gamle', () => {
  const fresh = day(10, 3);
  const r = pickPrices(fresh, [], CACHE, 'DK1', '2026-10-10', '2026-10-11');
  assert.equal(r.staleTs, null);
  assert.equal(r.raw.length, 3 + 2);            // tomorrow reused from cache
});

test('pickPrices: fejlet hentning falder tilbage til cachen for samme prisområde', () => {
  const r = pickPrices([], [], CACHE, 'DK1', '2026-10-10', '2026-10-11');
  assert.equal(r.raw.length, 4);
  assert.equal(r.staleTs, 1234);
});

test('pickPrices: cache for andet prisområde eller anden dag bruges ikke', () => {
  assert.deepEqual(pickPrices([], [], CACHE, 'DK2', '2026-10-10', '2026-10-11'), { raw: [], staleTs: null });
  assert.deepEqual(pickPrices([], [], CACHE, 'DK1', '2026-10-12', '2026-10-13'), { raw: [], staleTs: null });
  assert.deepEqual(pickPrices([], [], null, 'DK1', '2026-10-10', '2026-10-11'), { raw: [], staleTs: null });
});
