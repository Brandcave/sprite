// Cut the hero's head out of his own walk sprite and write it as the favicon.
//
// The sprite is a bitmap, not a file, so the icon is generated rather than
// drawn: run `npm run favicon` after touching HERO_DOWN_A and the tab follows.
// SVG, not PNG, because one <rect> per pixel stays perfectly crisp at 16px and
// at 512, and no build step or image library is involved.

import { writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { HERO, PALETTE } from '../src/art.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(HERE, '../public/favicon.svg');

// The head, in sprite coordinates: the cap through the collar, and only as wide
// as the skull — columns 3..12 clip off the arms, which at this crop would read
// as lumps growing out of his ears.
const ROW0 = 0, ROWS = 9;
const COL0 = 3, COLS = 10;

const PAD = 1;                    // a pixel of air so the outline is not flush
const BACKDROP = PALETTE.G;       // grass; the hard black outline reads on it
const RADIUS = 2;

const source = HERO.down[0];      // facing the viewer, standing still

// Cut a head off a body and one row comes away unfinished: at the shoulders the
// sprite spends its outline on the arms, so the cheeks run straight off the crop
// and the face reads a couple of pixels too wide there. Re-ink the cut edge
// wherever it landed on bare skin — the outline the arms were standing in for.
const seal = (ch, x) => (x === 0 || x === COLS - 1) && ch === 's' ? 'k' : ch;

const pixels = [];
for (let y = 0; y < ROWS; y++) {
  const row = source[ROW0 + y];
  for (let x = 0; x < COLS; x++) {
    const fill = PALETTE[seal(row[COL0 + x], x)];
    if (!fill) continue;
    // Merge runs of one colour into a single rect — a solid cap becomes one
    // shape instead of forty, and the file halves.
    const last = pixels[pixels.length - 1];
    if (last && last.fill === fill && last.y === y && last.x + last.w === x) last.w++;
    else pixels.push({ x, y, w: 1, fill });
  }
}

const W = COLS + PAD * 2;
const H = ROWS + PAD * 2;

const svg = [
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" shape-rendering="crispEdges">`,
  `<rect width="${W}" height="${H}" rx="${RADIUS}" fill="${BACKDROP}"/>`,
  ...pixels.map(
    (p) => `<rect x="${p.x + PAD}" y="${p.y + PAD}" width="${p.w}" height="1" fill="${p.fill}"/>`,
  ),
  '</svg>',
].join('\n');

await mkdir(dirname(OUT), { recursive: true });
await writeFile(OUT, `${svg}\n`);
console.log(`favicon → ${OUT} (${pixels.length} rects)`);
