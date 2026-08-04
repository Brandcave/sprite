// The social preview card, drawn out of the game's own pixels.
//
// Same argument as the favicon: nothing here is a painted asset. The sand, the
// water and the grass are the real 16x16 tile bitmaps the ground is made of, the
// hero is the frame he stands in when he is not walking, and every colour comes
// out of PALETTE. Change the art and re-run this — the card cannot go stale in a
// way the game does not.
//
//   node scripts/og.mjs        →  public/og.svg  +  public/og.png
//
// SVG is the master; the PNG is rasterised by headless Chrome because link
// unfurlers (Slack, iMessage, Twitter) will not touch an SVG.

import { writeFile, mkdir, rm } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { HERO, PALETTE, PROPS, TILES } from '../src/art.js';

const run = promisify(execFile);
const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(HERE, '../public');

const W = 1200, H = 630;          // the size every unfurler crops toward

// --------------------------------------------------------------- pixel type
// Five letters is a small enough alphabet to author by hand, and a real pixel
// wordmark is worth more here than any installed typeface would be: it is the
// only lettering that belongs to the same world as the sprite beside it.
const GLYPHS = {
  S: ['.####', '#....', '#....', '.###.', '....#', '....#', '####.'],
  A: ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  N: ['#...#', '##..#', '#.#.#', '#.#.#', '#.#.#', '#..##', '#...#'],
  D: ['####.', '#...#', '#...#', '#...#', '#...#', '#...#', '####.'],
  O: ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
};

const GLYPH_W = 5, GLYPH_H = 7, TRACKING = 1;

// Every glyph pixel becomes a 2x2 block before anything is drawn. The strokes in
// a 5x7 font are one pixel wide, and an outline is one pixel too — draw it at
// that ratio and each letter is two thirds black with a coloured thread down the
// middle, which is how the first pass came out. Doubling the letter and leaving
// the outline at one cell puts the ink back in charge.
const BOLD = 2;
const HEIGHT = GLYPH_H * BOLD;

/** Cells of a word, in glyph space, already doubled. */
function wordCells(word) {
  const cells = new Set();
  let ox = 0;
  for (const ch of word) {
    const rows = GLYPHS[ch];
    if (!rows) throw new Error(`no glyph for ${ch} — add one to GLYPHS`);
    rows.forEach((row, y) => {
      [...row].forEach((c, x) => {
        if (c !== '#') return;
        for (let dy = 0; dy < BOLD; dy++) {
          for (let dx = 0; dx < BOLD; dx++) cells.add(`${(ox + x) * BOLD + dx},${y * BOLD + dy}`);
        }
      });
    });
    ox += GLYPH_W + TRACKING;
  }
  return { cells, width: (ox - TRACKING) * BOLD };
}

// Sunset, top of the stroke to the bottom of it, one entry per doubled row. The
// lit row is not in the ramp — it is added on top of whatever the ramp gave.
const INK = [
  '#f8e050', '#f8e050', '#f8e050', '#f0c840', '#f0b83c', '#f0a838', '#f09030',
  '#ec8434', '#e8783a', '#e06c3a', '#d8603a', '#d05638', '#c85036', '#c04c34',
];
const LIT = '#fff4c0';

/**
 * The wordmark: a dark ring traced around the letters, a sunset ramp down the
 * stroke, and a lit pixel on top of every column. That last one is the whole
 * trick — without it the word is a flat sticker; with it the light in the card
 * falls on the letters too.
 */
function wordmark(word, { x, y, cell }) {
  const { cells, width } = wordCells(word);
  const has = (cx, cy) => cells.has(`${cx},${cy}`);
  const put = (cx, cy, fill) =>
    `<rect x="${x + cx * cell}" y="${y + cy * cell}" width="${cell}" height="${cell}" fill="${fill}"/>`;

  // Outline the letters from the *outside* only. Ringing every empty cell that
  // touches a stroke also rings the inside, and the counters of D, O and A are
  // three cells across — they fill in solid and the word turns into five black
  // slabs. So flood the empty space inward from the margin first, and let only
  // what the flood reached be outline; the enclosed counters stay open sky.
  const outside = new Set();
  const queue = [[-1, -1]];
  while (queue.length) {
    const [cx, cy] = queue.pop();
    const key = `${cx},${cy}`;
    if (cx < -1 || cy < -1 || cx > width || cy > HEIGHT) continue;
    if (outside.has(key) || has(cx, cy)) continue;
    outside.add(key);
    queue.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]);
  }

  const parts = [];
  for (const key of outside) {
    const [cx, cy] = key.split(',').map(Number);
    let touches = false;
    for (let dy = -1; dy <= 1 && !touches; dy++) {
      for (let dx = -1; dx <= 1; dx++) if (has(cx + dx, cy + dy)) { touches = true; break; }
    }
    if (touches) parts.push(put(cx, cy, PALETTE.k));
  }

  for (const key of cells) {
    const [cx, cy] = key.split(',').map(Number);
    parts.push(put(cx, cy, has(cx, cy - 1) ? INK[cy] : LIT));
  }

  return { svg: parts.join(''), width: width * cell, height: HEIGHT * cell };
}

// ------------------------------------------------------------------ bitmaps
/** A 16x16 tile as a repeating SVG pattern, so the band costs 256 rects once. */
function tilePattern(id, rows, scale) {
  const px = [];
  rows.forEach((row, y) => {
    let runX = null, runW = 0, runFill = null;
    const flush = () => {
      if (runFill) px.push(`<rect x="${runX * scale}" y="${y * scale}" width="${runW * scale}" height="${scale}" fill="${runFill}"/>`);
      runFill = null;
    };
    for (let x = 0; x < 16; x++) {
      const fill = PALETTE[row[x]] ?? null;
      if (fill === runFill) { runW++; continue; }
      flush();
      runX = x; runW = 1; runFill = fill;
    }
    flush();
  });
  const size = 16 * scale;
  return `<pattern id="${id}" width="${size}" height="${size}" patternUnits="userSpaceOnUse">${px.join('')}</pattern>`;
}

/** A 16x16 sprite blown up, transparent pixels left out. */
function sprite(rows, { x, y, scale }) {
  const px = [];
  rows.forEach((row, sy) => {
    let runX = null, runW = 0, runFill = null;
    const flush = () => {
      if (runFill) px.push(`<rect x="${x + runX * scale}" y="${y + sy * scale}" width="${runW * scale}" height="${scale}" fill="${runFill}"/>`);
      runFill = null;
    };
    for (let sx = 0; sx < 16; sx++) {
      const fill = PALETTE[row[sx]] ?? null;
      if (fill === runFill) { runW++; continue; }
      flush();
      runX = sx; runW = 1; runFill = fill;
    }
    flush();
  });
  return px.join('');
}

// ------------------------------------------------------------------- layout
// The horizon sits high and the bands shrink toward it: big grass underfoot,
// a thinner strip of sand, then water reduced to a glitter. Tiles drawn at
// three scales is the cheapest honest perspective there is.
const HORIZON = 330;
const BANDS = [
  { fill: 'url(#water)', y: HORIZON,       h: 50 },
  { fill: 'url(#sand)',  y: HORIZON + 50,  h: 60 },
  { fill: 'url(#grass)', y: HORIZON + 110, h: H - HORIZON - 110 },
];

// The sunset keyframe from main.js's day cycle — the hour this game looks best.
const SKY = ['#4a6ac0', '#8f7fc0', '#ef8f63', '#f3c79c'];

// Half-set, and well clear of the hero: the sun behind a sprite is just a sprite
// with a bright edge, and the whole point of it is the water underneath.
const SUN_X = 604, SUN_R = 46;

const HERO_SCALE = 18;
const HERO_X = 856;
const HERO_Y = H - 74 - 16 * HERO_SCALE;

const mark = wordmark('SANDO', { x: 96, y: 132, cell: 9 });

// Foreground planting. Without it the grass band is a green rectangle taking up
// a third of the card; a couple of props at different scales give it a near edge
// and something for the light to catch.
const PLANTS = [
  { art: 'tallgrass', x: 44,  y: 500, scale: 8 },
  { art: 'flower',    x: 236, y: 528, scale: 6 },
  { art: 'tallgrass', x: 640, y: 546, scale: 5 },
];

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" shape-rendering="crispEdges">
<defs>
  <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
    ${SKY.map((c, i) => `<stop offset="${(i / (SKY.length - 1)).toFixed(3)}" stop-color="${c}"/>`).join('\n    ')}
  </linearGradient>
  <radialGradient id="glow">
    <stop offset="0" stop-color="#ffe6b0" stop-opacity="0.85"/>
    <stop offset="1" stop-color="#ffe6b0" stop-opacity="0"/>
  </radialGradient>
  ${tilePattern('water', TILES.water, 3)}
  ${tilePattern('sand', TILES.sand, 4)}
  ${tilePattern('grass', TILES.grass, 6)}
</defs>

<rect width="${W}" height="${H}" fill="url(#sky)"/>
<circle cx="${SUN_X}" cy="${HORIZON}" r="250" fill="url(#glow)"/>
<circle cx="${SUN_X}" cy="${HORIZON}" r="${SUN_R}" fill="#ffe0a0"/>

${BANDS.map((b) => `<rect x="0" y="${b.y}" width="${W}" height="${b.h}" fill="${b.fill}"/>`).join('\n')}
<rect x="0" y="${HORIZON}" width="${W}" height="3" fill="#ffd98e" opacity="0.45"/>
<!-- the sun's track on the water, and the surf where it meets the sand -->
${[[6, 62], [18, 46], [30, 34], [40, 22]].map(([dy, w]) =>
  `<rect x="${SUN_X - w / 2}" y="${HORIZON + dy}" width="${w}" height="5" fill="#ffe0a0" opacity="0.55"/>`).join('')}
<rect x="0" y="${HORIZON + 44}" width="${W}" height="6" fill="#eaf2ff" opacity="0.5"/>

${PLANTS.map((p) => sprite(PROPS[p.art], p)).join('\n')}
<ellipse cx="${HERO_X + 8 * HERO_SCALE}" cy="${H - 70}" rx="104" ry="22" fill="#1c2a14" opacity="0.3"/>
${sprite(HERO.down[0], { x: HERO_X, y: HERO_Y, scale: HERO_SCALE })}

${mark.svg}
</svg>
`;

await mkdir(OUT, { recursive: true });
await writeFile(resolve(OUT, 'og.svg'), svg);

// ---- rasterise. Unfurlers want a PNG, and Chrome is the one renderer we can
// assume is here — it is what the game is played in.
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const page = resolve(tmpdir(), 'sando-og.html');
await writeFile(page, `<body style="margin:0">${svg}</body>`);
try {
  await run(CHROME, [
    '--headless', '--disable-gpu', '--hide-scrollbars',
    `--window-size=${W},${H}`,
    `--screenshot=${resolve(OUT, 'og.png')}`,
    `file://${page}`,
  ]);
  console.log(`og → ${OUT}/og.svg + og.png`);
} catch (err) {
  console.warn(`og.svg written; PNG skipped (${err.message.split('\n')[0]})`);
} finally {
  await rm(page, { force: true });
}
