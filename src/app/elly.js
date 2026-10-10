// elly.js — Elly-maskottens SVG. ÉN kilde for både PWA'en (index.html) og
// marketing-sitet ({% elly %}-shortcoden i eleventy.config.cjs), så de to ikke
// driver fra hinanden. Ingen DOM, ingen afhængigheder. Tilstande og animation
// styres af CSS-klasser i appen (se «ELLY MASCOT» i index.html).
const INK = '#11352b';

// Krop + ansigt. `outline` er lynets omrids, `ink` er ansigtets streger.
function body(outline, ink){
  return `<path class="bolt" d="M70 6 L30 62 L56 62 L46 114 L94 48 L66 48 Z" fill="#FFD23F" stroke="${outline}" stroke-width="4.5" stroke-linejoin="round"></path>
      <circle class="eye eye-l" cx="55" cy="44" r="8" fill="#fff" stroke="${ink}" stroke-width="2"></circle>
      <circle class="eye eye-r" cx="73" cy="44" r="8" fill="#fff" stroke="${ink}" stroke-width="2"></circle>
      <circle class="pupil pupil-l" cx="57" cy="46" r="3.4" fill="${ink}"></circle>
      <circle class="pupil pupil-r" cx="75" cy="46" r="3.4" fill="${ink}"></circle>
      <path class="mouth-happy" d="M54 56 Q64 64 74 56" stroke="${ink}" stroke-width="3" fill="none" stroke-linecap="round"></path>`;
}

// App-udgaven: tilstandsklasse (cheap|mid|expensive|charge|cheer|blink) + de
// ekstra dele som CSS'en tænder pr. tilstand (glød, gnister, sur mund, bryn).
// Rent dekorativ → skjult for skærmlæsere.
export function ellySVG(stateClass, size, stroke){
  stroke = stroke || INK;
  return `<svg viewBox="0 0 120 120" class="elly ${stateClass}" width="${size}" height="${size}" aria-hidden="true" focusable="false" style="display:block;overflow:visible;flex-shrink:0;">
    <circle class="glow" cx="62" cy="60" r="36"></circle>
    <path class="spark" d="M99 24 l-6 8 l5 1 l-6 9" fill="none" stroke="#FF2F52" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"></path>
    <path class="spark" d="M22 40 l7 6 l-4 3 l7 6" fill="none" stroke="#FF6B83" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"></path>
    <path class="spark" d="M92 84 l-2 9 l-5 -3 l-1 10" fill="none" stroke="#FF2F52" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"></path>
    <path class="sparkle" d="M100 22 l2 6 l6 2 l-6 2 l-2 6 l-2 -6 l-6 -2 l6 -2 z" fill="#34B27B"></path>
    <path class="sparkle" d="M20 36 l1.6 5 l5 1.6 l-5 1.6 l-1.6 5 l-1.6 -5 l-5 -1.6 l5 -1.6 z" fill="#7CE0A8"></path>
    <path class="sparkle" d="M90 96 l1.6 5 l5 1.6 l-5 1.6 l-1.6 5 l-1.6 -5 l-5 -1.6 l5 -1.6 z" fill="#34B27B"></path>
    <g class="char">
      ${body(stroke, stroke)}
      <path class="mouth-mad" d="M53 60 l4.6 -5 l4.6 5 l4.6 -5 l4.6 5 l4.6 -5" stroke="${stroke}" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round"></path>
      <path class="brow brow-l" d="M47 33 L61 41" stroke="${stroke}" stroke-width="3.2" stroke-linecap="round"></path>
      <path class="brow brow-r" d="M81 33 L67 41" stroke="${stroke}" stroke-width="3.2" stroke-linecap="round"></path>
    </g>
  </svg>`;
}

// Site-udgaven: statisk og glad, uden app-CSS. Omridset følger tekstfarven
// (currentColor fra --text), så det er synligt i dark mode. Ansigtet ligger på
// gul/hvid og beholder den mørke farve i begge temaer.
export function ellyStatic(size, outline){
  const s = size || 96;
  return `<svg viewBox="0 0 120 120" width="${s}" height="${s}" aria-hidden="true" focusable="false" style="display:inline-block;overflow:visible;color:var(--text,${INK});">
      ${body(outline || 'currentColor', INK)}
    </svg>`;
}
