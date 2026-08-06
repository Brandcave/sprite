// The social preview card, drawn out of the game's own pixels.
//
// The card is the title screen, held still: the same paper, the same
// cartridge-style wordmark in the same three inks, and the same pair — the
// hero and Amy — looking straight out of the card. The sprites are the real
// walk-frame bitmaps from art.js and every colour comes out of PALETTE or the
// title card's own ink set. Change the art and re-run this — the card cannot
// go stale in a way the game does not.
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
import { HERO, PALETTE, VILLAGERS } from '../src/art.js';

const run = promisify(execFile);
const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(HERE, '../public');

const W = 1200, H = 630;          // the size every unfurler crops toward

// The title card's inks, verbatim from src/title.js: cream letters, navy
// outline, a lavender shadow, all on GB paper.
const INK = {
  fill: '#f8e070',
  outline: '#333066',
  shadow: '#9a94cc',
  text: '#181818',
  paper: '#f8f8f8',
};

// --------------------------------------------------------------- pixel type
// The title screen rasterises Arial Black through a canvas; there is no canvas
// here, so the wordmark is authored by hand instead — the same 5x7 alphabet
// trick the old card used, just with more letters in it.
const GLYPHS = {
  A: ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  C: ['.###.', '#...#', '#....', '#....', '#....', '#...#', '.###.'],
  G: ['.###.', '#...#', '#....', '#.###', '#...#', '#...#', '.###.'],
  H: ['#...#', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  I: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '#####'],
  M: ['#...#', '##.##', '#.#.#', '#.#.#', '#...#', '#...#', '#...#'],
  N: ['#...#', '##..#', '#.#.#', '#.#.#', '#.#.#', '#..##', '#...#'],
  S: ['.####', '#....', '#....', '.###.', '....#', '....#', '####.'],
  Y: ['#...#', '#...#', '.#.#.', '..#..', '..#..', '..#..', '..#..'],
};

const GLYPH_W = 5, GLYPH_H = 7, TRACKING = 1;

// Doubled before inking, same reasoning as the old card: at 1:1 a one-pixel
// outline eats the one-pixel stroke and the word reads as its own silhouette.
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

/**
 * Ink a word the way stampLogo does on the title screen: the silhouette
 * dropped again as a flat lavender shadow, then the letters in cream with a
 * hard navy outline traced around every stroke — counters included, which is
 * exactly how the old cartridge logos did it.
 */
function cartridge(word, { x, y, cell }) {
  const { cells, width } = wordCells(word);
  const has = (cx, cy) => cells.has(`${cx},${cy}`);
  const sil = (cx, cy) => {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) if (has(cx + dx, cy + dy)) return true;
    }
    return false;
  };
  const put = (cx, cy, fill) =>
    `<rect x="${x + cx * cell}" y="${y + cy * cell}" width="${cell}" height="${cell}" fill="${fill}"/>`;

  const parts = [];
  // shadow first, so the letters sit on top of it — offset one left, two down
  for (let cy = -1; cy <= HEIGHT + 3; cy++) {
    for (let cx = -1; cx <= width + 1; cx++) {
      if (sil(cx + 1, cy - 2)) parts.push(put(cx, cy, INK.shadow));
    }
  }
  for (let cy = -1; cy <= HEIGHT + 1; cy++) {
    for (let cx = -1; cx <= width + 1; cx++) {
      if (has(cx, cy)) parts.push(put(cx, cy, INK.fill));
      else if (sil(cx, cy)) parts.push(put(cx, cy, INK.outline));
    }
  }
  return { svg: parts.join(''), width: width * cell, height: HEIGHT * cell };
}

// ------------------------------------------------------------------ bitmaps
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
// The title screen's proportions, translated from the GB's 144-row grid to the
// unfurler's 1200x630: logo high, the pair standing together beneath it, the
// prompt at the bottom of the card.
const line1 = cartridge('CHASING', { x: (W - wordCells('CHASING').width * 9) >> 1, y: 44, cell: 9 });
const l2y = 44 + line1.height + 26;
const line2 = cartridge('AMY', { x: (W - wordCells('AMY').width * 13) >> 1, y: l2y, cell: 13 });

// The pair, in the space the cartridge kept for the trainer and his starter:
// hero and Amy side by side at the bottom edge of the card, facing out of it.
const PAIR_SCALE = 9;
const PAIR_Y = H - 16 * PAIR_SCALE - 36;
const HERO_X = (W >> 1) - 17 * PAIR_SCALE;
const AMY_X = (W >> 1) + PAIR_SCALE;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" shape-rendering="crispEdges">
<rect width="${W}" height="${H}" fill="${INK.paper}"/>

${line1.svg}
${line2.svg}

${sprite(HERO.down[0], { x: HERO_X, y: PAIR_Y, scale: PAIR_SCALE })}
${sprite(VILLAGERS.amy.down[0], { x: AMY_X, y: PAIR_Y, scale: PAIR_SCALE })}
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
