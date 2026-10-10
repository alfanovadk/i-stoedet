import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ellySVG, ellyStatic } from '../src/app/elly.js';

const BOLT = 'M70 6 L30 62 L56 62 L46 114 L94 48 L66 48 Z';

test('ellySVG: tilstandsklasse, størrelse og skjult for skærmlæsere', () => {
  const svg = ellySVG('cheap', 66, '#2a2140');
  assert.match(svg, /class="elly cheap"/);
  assert.match(svg, /width="66" height="66"/);
  assert.match(svg, /aria-hidden="true"/);
  assert.ok(svg.includes(BOLT));
  assert.ok(svg.includes('stroke="#2a2140"'));
  for (const part of ['glow', 'spark', 'sparkle', 'mouth-mad', 'brow', 'mouth-happy']) assert.ok(svg.includes(`class="${part}`), part);
});

test('ellyStatic: samme krop som appen, men uden tilstands-dele', () => {
  const svg = ellyStatic(92);
  assert.ok(svg.includes(BOLT));
  assert.match(svg, /width="92" height="92"/);
  assert.match(svg, /aria-hidden="true"/);
  assert.ok(svg.includes('stroke="currentColor"'), 'outline follows text colour for dark mode');
  for (const part of ['glow', 'spark', 'mouth-mad', 'brow']) assert.ok(!svg.includes(`class="${part}`), part);
});

test('app og site deler ansigtets geometri', () => {
  const face = s => [...s.matchAll(/class="(?:eye|pupil|mouth-happy)[^"]*"[^>]*?(?:cx="(\d+)" cy="(\d+)"|d="([^"]+)")/g)].map(m => m.slice(1).join(','));
  assert.deepEqual(face(ellyStatic(10)), face(ellySVG('mid', 10)));
});
