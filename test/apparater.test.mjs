import { test } from 'node:test';
import assert from 'node:assert/strict';
import apparater from '../src/_data/apparater.js';

test('hvert apparat har de nødvendige felter', () => {
  for (const a of apparater.liste) {
    assert.ok(a.slug && a.navn && typeof a.kwh === 'number' && a.enhed, `mangler felt: ${a.slug}`);
    assert.ok(typeof a.kanFlyttes === 'boolean', `kanFlyttes mangler: ${a.slug}`);
  }
});

test('besparelse beregnes som kwh * prisspaend', () => {
  const a = apparater.bySlug('elbil');
  const forventet = a.kwh * apparater.prisspaend.typisk;
  assert.equal(apparater.besparelse(a, 'typisk'), Math.round(forventet * 100) / 100);
});

test('bySlug returnerer undefined for ukendt', () => {
  assert.equal(apparater.bySlug('findes-ikke'), undefined);
});
