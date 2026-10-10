import { test } from 'node:test';
import assert from 'node:assert/strict';
import apparater from '../src/_data/apparater.js';

const near = (a, b, msg) => assert.ok(Math.abs(a - b) < 1e-9, `${msg ?? ''} forventede ${b}, fik ${a}`);

test('hvert apparat har de nødvendige felter', () => {
  for (const a of apparater.liste) {
    assert.ok(a.slug && a.navn && typeof a.kwh === 'number' && a.enhed, `mangler felt: ${a.slug}`);
    assert.ok(typeof a.kanFlyttes === 'boolean', `kanFlyttes mangler: ${a.slug}`);
    assert.ok(Number.isInteger(a.timer) && a.timer >= 1 && a.timer <= 24, `timer mangler: ${a.slug}`);
    assert.ok(Number.isInteger(a.typiskStart) && a.typiskStart >= 0 && a.typiskStart < 24, `typiskStart mangler: ${a.slug}`);
    assert.ok(apparater.flytbarKwh(a) <= a.kwh, `flytbarKwh > kwh: ${a.slug}`);
  }
});

test('timepris følger tarifmodel 3.0: lav 00-06, spids 17-21, høj resten', () => {
  const { tarif, spotTillaeg, timepris } = apparater;
  near(timepris(0, 'vinter'), tarif.vinter.lav + spotTillaeg.vinter.nat);
  near(timepris(5, 'vinter'), tarif.vinter.lav + spotTillaeg.vinter.nat);
  near(timepris(6, 'vinter'), tarif.vinter.hoej + spotTillaeg.vinter.dag);
  near(timepris(16, 'sommer'), tarif.sommer.hoej + spotTillaeg.sommer.dag);
  near(timepris(17, 'sommer'), tarif.sommer.spids + spotTillaeg.sommer.aften);
  near(timepris(20, 'vinter'), tarif.vinter.spids + spotTillaeg.vinter.aften);
  near(timepris(21, 'vinter'), tarif.vinter.hoej + spotTillaeg.vinter.dag);
});

test('vinduesSnit er gennemsnit over N timer og løber over midnat', () => {
  const { timepris, vinduesSnit } = apparater;
  near(vinduesSnit(17, 1, 'vinter'), timepris(17, 'vinter'));
  near(vinduesSnit(23, 2, 'vinter'), (timepris(23, 'vinter') + timepris(0, 'vinter')) / 2);
});

test('billigste vindue ligger om natten og udvandes når det er længere end lavlasten', () => {
  const { billigsteVindue, timepris } = apparater;
  const nat = timepris(0, 'vinter'), dag = timepris(6, 'vinter');
  near(billigsteVindue(6, 'vinter').snit, nat);
  near(billigsteVindue(8, 'vinter').snit, (6 * nat + 2 * dag) / 8);
});

test('elbil: 5 timers vindue fra kl. 17 mod billigste 5 timer (håndregnet)', () => {
  const a = apparater.bySlug('elbil');
  // vinter: 4 spidstimer à 0,99+0,25 og 1 højlasttime à 0,33+0,10, minus nat 0,11
  near(apparater.prisforskel(a, 'vinter'), (4 * 1.24 + 0.43) / 5 - 0.11);
  // sommer: 4 x (0,43+0,20) + 1 x (0,17+0,05), minus nat 0,11
  near(apparater.prisforskel(a, 'sommer'), (4 * 0.63 + 0.22) / 5 - 0.11);
  assert.equal(apparater.besparelse(a, 'vinter'), 48.4);
  assert.equal(apparater.besparelse(a, 'sommer'), 21.9);
  assert.equal(apparater.besparelse(a, 'aar'), 35.15);
  assert.equal(apparater.besparelse(a), 35.15);
  assert.equal(apparater.besparelseOmAaret(a), 2109);
});

test('varmepumpe: kun den flytbare andel tæller', () => {
  const a = apparater.bySlug('varmepumpe');
  assert.equal(apparater.flytbarKwh(a), 4.5);
  assert.equal(apparater.besparelse(a, 'aar'), Math.round(4.5 * apparater.prisforskel(a, 'aar') * 100) / 100);
});

test('besparelse er aldrig større end dyreste-minus-billigste time, og vinter >= år >= sommer', () => {
  for (const a of apparater.liste) {
    for (const s of apparater.SAESONER) {
      const priser = Array.from({ length: 24 }, (_, h) => apparater.timepris(h, s));
      const loft = Math.max(...priser) - Math.min(...priser);
      const d = apparater.prisforskel(a, s);
      assert.ok(d > 0 && d <= loft + 1e-9, `${a.slug}/${s}: ${d} uden for (0, ${loft}]`);
    }
    assert.ok(apparater.besparelse(a, 'vinter') >= apparater.besparelse(a, 'aar'), a.slug);
    assert.ok(apparater.besparelse(a, 'aar') >= apparater.besparelse(a, 'sommer'), a.slug);
  }
});

test('et længere vindue giver mindre prisforskel pr. kWh', () => {
  const kort = { timer: 2, typiskStart: 17 }, langt = { timer: 10, typiskStart: 17 };
  assert.ok(apparater.prisforskel(langt, 'vinter') < apparater.prisforskel(kort, 'vinter'));
});

test('bySlug returnerer undefined for ukendt', () => {
  assert.equal(apparater.bySlug('findes-ikke'), undefined);
});
