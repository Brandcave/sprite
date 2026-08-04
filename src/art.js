// GBC-era palette + hand-authored pixel bitmaps.
// Everything here is original art in the Game Boy Color style: 4-ish shades per
// material, hard outlines, no anti-aliasing. Drop-in replacement point — swap
// these bitmaps (or load a PNG sheet) and the rest of the engine follows.

export const PALETTE = {
  '.': null,            // transparent
  k: '#181818',         // outline
  K: '#303030',
  // grass
  g: '#6fbf3f',
  G: '#4c9427',
  h: '#a8dd6a',
  d: '#2f6b1c',
  // dirt / path
  p: '#d8cfa8',
  P: '#b8a878',
  q: '#8f7f58',
  // water
  w: '#5868f0',
  W: '#3848c8',
  v: '#9aa8ff',
  // wood / roof
  n: '#8a5a2b',
  N: '#5c3a18',
  o: '#c08040',
  // stone
  c: '#c8c8c0',
  C: '#909090',
  // flower
  f: '#e04858',
  F: '#f89098',
  y: '#f8e050',
  // palm — its own greens and trunk browns so the beach does not read as the
  // same foliage as the inland woods
  u: '#c9a066',         // trunk, lit
  U: '#8a6636',         // trunk, shaded
  j: '#9ad84e',         // frond highlight
  J: '#5fb038',         // frond mid
  a: '#3f9642',         // frond shadow / spine — still the dark tone, but the
                        // face shading darkens it again on every side face, so
                        // it is authored lighter than it ends up reading
  z: '#7a4a20',         // coconut
  // skin / character
  s: '#e8a878',
  S: '#c89058',
  r: '#d8483c',         // cap + shoes red
  R: '#901818',
  b: '#3050a0',         // shirt blue
  B: '#203868',
  m: '#f8f8f8',         // white
  e: '#404048',         // shoe / dark
  // Cap and shoes again, in everybody else's colours. The hero bitmaps ink
  // exactly three things — outline, skin and `r` — so `r` is the only channel a
  // player's colours can live in, and it happens to be the largest solid block
  // on the sprite: the whole dome of the cap. See PLAYER_SKINS.
  '1': '#3878d8',       // blue
  '2': '#2f8f5a',       // green, deep enough not to sink into the grass
  '3': '#9858d0',       // violet
  '4': '#f09030',       // orange
  '5': '#e8e8f0',       // white
  '6': '#e858a8',       // pink
  '7': '#f0d040',       // gold
  // npc villager: straw hat + teal shirt, so they never get mistaken for the hero
  t: '#f0d878',         // straw, lit
  L: '#c8a848',         // straw, weave / shade
  x: '#3aa08a',         // shirt teal
  X: '#1f6b5e',
  '8': '#41764a',       // bottle glass
  // Painted-silver ironwork, and no outline tone at all. A hard black edge is
  // right for a 16px character, but on a lamp it swallowed the post; a darker
  // grey did the same, because the sun is behind the world and every
  // camera-facing surface is already in shadow. Two light tones is the whole
  // ramp — the face shading does the rest.
  V: '#e8ecf4',         // silver, lit
  Q: '#b4bcc8',         // silver, mid
  // shells, bleached against the sand
  E: '#f4ead6',
  H: '#c9ab7c',         // ridge / growth line — the shape reads from these
  /*
    Amy, and she is two inks and an outline — no shade tone for either, which is
    the whole reason her sprite reads the way it does. Everything else in this
    file ramps two or three values per material; she is drawn flat, and the shape
    carries all of it. Adding a shadow tone to "improve" her is how you lose it.

    The apricot is her face *and* her dress, one colour for both, which is the
    other thing that makes her read as drawn rather than modelled.

    Authored light, as everything here is: the sun sits behind the world, so
    every camera-facing pixel is already in shadow before the side faces darken
    it again — the same reason the palm fronds above are lighter than they look.
  */
  A: '#b5834e',         // hair
  I: '#f2a850',         // skin and dress alike
};

// ---------------------------------------------------------------- tile art
// 16x16 top-down textures, tiled across the ground.

export const TILES = {
  grass: [
    'ggggggggggggggg G',
    'gggghgggggggggGg',
    'ggggggggggghggGg',
    'gGgggggggggggggg',
    'gggggggggggggggg',
    'ggghggggGgggggGg',
    'ggggggggggggggig',
    'gggggggggggggggg',
    'gGggggggggghgggg',
    'ggggggggggggggGg',
    'gggghgggggggggig',
    'gggggggggGgggggg',
    'gggggggggggggggg',
    'gGgggghggggggggg',
    'ggggggggggggGggg',
    'gggggggggggggggg',
  ].map((r) => r.replace(/[iI ]/g, 'h').slice(0, 16)),

  path: [
    'pppppppPppppppPp',
    'pppPppppppppPppp',
    'ppppppppPppppppp',
    'pPppppppppppppPp',
    'ppppppPpppppPppp',
    'pppppppppppppppp',
    'ppPppppppPpppppp',
    'ppppppppppppPppp',
    'pppppPpppppppppp',
    'pPpppppppPpppppp',
    'ppppppppppppppPp',
    'pppppppPpppppppp',
    'ppPpppppppppPppp',
    'pppppppppPpppppp',
    'ppppPppppppppppp',
    'pppppppppppppppp',
  ],

  water: [
    'wwwwwwwwwwwwwwww',
    'wvvwwwwwvvwwwwww',
    'wwwvwwwwwwvwwwww',
    'WwwwwwwWwwwwwwWw',
    'wwwwwvwwwwwwvwww',
    'wwvwwwwwwvwwwwww',
    'wwwwwwwwwwwwwwww',
    'WwwwwWwwwwwWwwww',
    'wwwwwwwwwwwwwwww',
    'wwvvwwwwwvvwwwww',
    'wwwwvwwwwwwvwwww',
    'WwwwwwwwWwwwwwWw',
    'wwwwwwvwwwwwwvww',
    'wwvwwwwwwwvwwwww',
    'wwwwwwwwwwwwwwww',
    'wWwwwwWwwwwwWwww',
  ],

  sand: [
    'PPPPPPPqPPPPPPPP',
    'PPPqPPPPPPPqPPPP',
    'PPPPPPPPPqPPPPPP',
    'PqPPPPPPPPPPPPqP',
    'PPPPPPqPPPPPPPPP',
    'PPPPPPPPPPPqPPPP',
    'PPqPPPPPPPPPPPPP',
    'PPPPPPPPqPPPPPPP',
    'PPPPqPPPPPPPPPPP',
    'PqPPPPPPPqPPPPPP',
    'PPPPPPPPPPPPPqPP',
    'PPPPPqPPPPPPPPPP',
    'PPqPPPPPPPPqPPPP',
    'PPPPPPPPqPPPPPPP',
    'PPPPqPPPPPPPPPPP',
    'PPPPPPPPPPPqPPPP',
  ],

  // Indoors. A cream tile with a faint lattice pressed into it — busy enough
  // that a floor twenty tiles across does not read as one flat slab, quiet
  // enough that the furniture standing on it still wins.
  floor: [
    'EEEEEEEcEEEEEEEc',
    'EEEEEEcEcEEEEEcE',
    'EEEEEcEEEcEEEcEE',
    'EEEEcEEEEEcEcEEE',
    'EEEcEEEEEEEcEEEE',
    'EEcEEEEEEEcEcEEE',
    'EcEEEEEEEcEEEcEE',
    'cEEEEEEEcEEEEEcE',
    'EcEEEEEcEEEEEEEc',
    'EEcEEEcEEEEEEEcE',
    'EEEcEcEEEEEEEcEE',
    'EEEEcEEEEEEEcEEE',
    'EEEcEcEEEEEcEEEE',
    'EEcEEEcEEEcEEEEE',
    'EcEEEEEcEcEEEEEE',
    'cEEEEEEEcEEEEEEE',
  ],
  // The mat by the door, laid on top of the floor rather than tiled. It is the
  // only bright thing indoors, which is the whole job: it says *here* is the way
  // out without a label, an arrow, or a line of dialogue.
  rug: [
    'FFFFFFFFFFFFFFFF',
    'FmmFmmFmmFmmFmmF',
    'FFFFFFFFFFFFFFFF',
    'F44444444444444F',
    'F44mm44mm44mm44F',
    'F44mm44mm44mm44F',
    'F44444444444444F',
    'F44444444444444F',
    'F44444444444444F',
    'F44444444444444F',
    'F44mm44mm44mm44F',
    'F44mm44mm44mm44F',
    'F44444444444444F',
    'FFFFFFFFFFFFFFFF',
    'FmmFmmFmmFmmFmmF',
    'FFFFFFFFFFFFFFFF',
  ],

  stone: [
    'cccCccccccCccccc',
    'ccccccCccccccccc',
    'CccccccccccCcccc',
    'cccccCcccccccccC',
    'ccCcccccccCccccc',
    'cccccccCcccccccc',
    'ccccCccccccccCcc',
    'CccccccccCcccccc',
    'cccCccccccccccCc',
    'ccccccccCccccccc',
    'cCccccCcccccccccc'.slice(0, 16),
    'ccccccccccCccccc',
    'cccCcccccccccCcc',
    'CcccccccCcccccccc'.slice(0, 16),
    'ccccCccccccccccc',
    'ccccccccCcCccccc',
  ],
};

// ------------------------------------------------------- voxel prop bitmaps
// These get extruded into cubes (one cube per opaque pixel).

/**
 * The tree is the one prop you see large and from several sides at once, so it
 * is a true voxel volume instead of an extruded bitmap: a lumpy ellipsoid crown
 * on a chunky trunk. Extrusion made it read as a coin standing on edge.
 *
 * `at(seed)` returns a function giving a palette char per cell (null = empty)
 * over a 16-cubed grid. The seed varies the lumps so no two trees match.
 */
export const TREE_VOLUME = {
  size: 16,
  at(seed) {
    const CX = 7.5, CZ = 7.5;         // trunk / crown axis
    const CY = 10.0;                  // crown centre height
    const RX = 6.8, RY = 5.4, RZ = 6.8;
    const s = seed * 1.7;

    // cheap deterministic dither, stable per cell
    const hash = (x, y, z, k) => {
      const n = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719 + k * 4.1 + s) * 43758.5453;
      return n - Math.floor(n);
    };

    return (x, y, z) => {
      // trunk: a squat column, visible under the crown
      const inTrunk = y <= 6 && Math.abs(x - CX) <= 1.5 && Math.abs(z - CZ) <= 1.5;

      // crown: ellipsoid pushed around by a few sine lumps
      const dx = (x - CX) / RX, dy = (y - CY) / RY, dz = (z - CZ) / RZ;
      let d = dx * dx + dy * dy + dz * dz;
      d += 0.10 * Math.sin(x * 1.1 + z * 0.7 + s)
         + 0.08 * Math.sin(y * 1.3 + x * 0.5 - s)
         + 0.07 * Math.sin(z * 1.5 - y * 0.9 + s * 2.0);

      if (d <= 1.0) {
        // Shade = height + a low-frequency patch term. Quantising the hash to
        // 2-voxel clumps groups the colour into leaf-sized masses; per-voxel
        // noise alone just reads as static.
        const t = (y - (CY - RY)) / (2 * RY);
        const clump = hash(Math.floor(x / 2), Math.floor(y / 2), Math.floor(z / 2), 3);
        const shade = t * 0.72 + clump * 0.42 + hash(x, y, z, 1) * 0.08 - 0.14;
        if (shade > 0.78) return 'h';
        if (shade > 0.40) return 'g';
        if (shade > 0.16) return 'G';
        return 'd';
      }

      if (inTrunk) return hash(x, y, z, 2) < 0.6 ? 'n' : 'N';
      return null;
    };
  },
};

/**
 * Palm trees. Same idea as TREE_VOLUME — a real voxel volume, not an extruded
 * bitmap — but a palm is mostly negative space, so instead of testing every cell
 * against a field we stamp the trunk and fronds into a sparse map and look cells
 * up. A curved trunk plus a handful of drooping fronds is the whole silhouette;
 * getting the lean and the droop right matters more than any pixel detail.
 *
 * `at(seed, variant)` returns the colour lookup volumeGeometry() wants, over a
 * 24-cubed grid (taller than the 16 the inland tree uses — palms are lanky).
 */
const PALM_VARIANTS = {
  // trunkH: height of the crown, in cells. lean: how far the top drifts sideways.
  tall:   { trunkH: 17, lean: 3.0, frondL: 8.0, fronds: 8, rise: 3.4, drop: 7.2, nuts: 3 },
  short:  { trunkH: 11, lean: 1.6, frondL: 9.0, fronds: 9, rise: 2.6, drop: 8.4, nuts: 4 },
  sprout: { trunkH: 4,  lean: 0.7, frondL: 6.5, fronds: 6, rise: 3.0, drop: 4.6, nuts: 0 },
};

export const PALM_VOLUME = {
  size: 24,
  variants: Object.keys(PALM_VARIANTS),

  at(seed, variant = 'tall') {
    const S = 24;
    const CX = 11.5, CZ = 11.5;
    const V = PALM_VARIANTS[variant] ?? PALM_VARIANTS.tall;
    const s = seed * 1.7;

    const hash = (x, y, z, k) => {
      const n = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719 + k * 4.1 + s) * 43758.5453;
      return n - Math.floor(n);
    };

    const cells = new Map();
    const key = (x, y, z) => (y * S + z) * S + x;
    // Trunk wins over fronds where they overlap: the crown should sit on the
    // stem, not swallow it.
    const set = (x, y, z, ch, strong = false) => {
      x = Math.round(x); y = Math.round(y); z = Math.round(z);
      if (x < 0 || y < 0 || z < 0 || x >= S || y >= S || z >= S) return;
      const k = key(x, y, z);
      if (!strong && cells.has(k)) return;
      cells.set(k, ch);
    };

    // ---- trunk: leans off vertical, quadratically, so the base stays planted
    const leanA = hash(0, 0, 0, 9) * Math.PI * 2;
    const lx = Math.cos(leanA) * V.lean;
    const lz = Math.sin(leanA) * V.lean;
    const trunkAt = (t) => [CX + lx * t * t, V.trunkH * t, CZ + lz * t * t];

    for (let y = 0; y <= V.trunkH; y++) {
      const t = y / V.trunkH;
      const [tx, , tz] = trunkAt(t);
      const r = 2.0 - 0.9 * t;                       // tapers toward the crown
      for (let dx = -3; dx <= 3; dx++) {
        for (let dz = -3; dz <= 3; dz++) {
          if (dx * dx + dz * dz > r * r) continue;
          // ring scars every few cells give the trunk its stacked-collar look
          const scar = y % 3 === 0;
          const lit = dx - dz < 0.5 && !scar;
          set(tx + dx, y, tz + dz, lit ? 'u' : 'U', true);
        }
      }
    }

    // ---- fronds: a spine arcing up then drooping, with leaflets either side
    const [hx, hy, hz] = trunkAt(1);
    const base = hash(0, 1, 0, 4) * Math.PI * 2;
    for (let f = 0; f < V.fronds; f++) {
      const a = base + (f / V.fronds) * Math.PI * 2 + (hash(f, 0, 0, 6) - 0.5) * 0.35;
      const dx = Math.cos(a), dz = Math.sin(a);
      const len = V.frondL * (0.82 + hash(f, 1, 0, 7) * 0.36);
      const rise = V.rise * (0.85 + hash(f, 2, 0, 8) * 0.3);

      for (let i = 0; i <= 40; i++) {
        const t = i / 40;
        const px = hx + dx * len * t;
        const pz = hz + dz * len * t;
        const py = hy + rise * t - V.drop * t * t;
        if (py < 0.5) break;                          // frond tip hit the sand

        set(px, py, pz, 'a');                         // spine
        // leaflets fan out perpendicular, widest mid-frond, feathered at the tip
        const hw = 2.3 * Math.sin(Math.PI * Math.pow(t, 0.75));
        for (let o = 1; o <= Math.ceil(hw); o++) {
          for (const sgn of [-1, 1]) {
            if (o > hw) break;
            // gaps between leaflets — a solid slab reads as a leaf, not a palm
            if (hash(i, o, f, sgn > 0 ? 1 : 2) < 0.22) continue;
            const ox = px - dz * o * sgn;
            const oz = pz + dx * o * sgn;
            const oy = py - o * 0.55 * (0.4 + t);     // outer leaflets hang lower
            const shade = 0.62 - t * 0.3 + hash(i, o, f, 3) * 0.42;
            set(ox, oy, oz, shade > 0.66 ? 'j' : shade > 0.34 ? 'J' : 'a');
          }
        }
      }
    }

    // ---- coconuts, tucked under the crown against the trunk
    for (let n = 0; n < V.nuts; n++) {
      const a = hash(n, 3, 0, 5) * Math.PI * 2;
      set(hx + Math.cos(a) * 2.1, hy - 1 - hash(n, 4, 0, 5) * 1.5, hz + Math.sin(a) * 2.1, 'z', true);
      set(hx + Math.cos(a) * 2.6, hy - 1 - hash(n, 4, 0, 5) * 1.5, hz + Math.sin(a) * 2.6, 'z', true);
    }

    return (x, y, z) => cells.get(key(x, y, z)) ?? null;
  },
};

export const PROPS = {
  // Upright cluster: three blooms on stems that converge into a leafy base.
  // Standing up is what lets the wind sway act on it — a flat decal has no
  // height for the sway weight to grab.
  flower: [
    '.....ff.........',
    '....fFyFf.......',
    '....fFFFf..ff...',
    '.....fff..fFyFf.',
    '......g...fFFFf.',
    '......g....fff..',
    '..ff..g.....g...',
    '.fFyFf.g....g...',
    '.fFFFf.g...g....',
    '..fff..g..g.....',
    '....g..g.g......',
    '.....g.ggg......',
    '.....gggg.......',
    '....hggggh......',
    '...hgggggdh.....',
    '...dggggggd.....',
  ],

  // A clump of separated blades rather than a solid mass — the gaps are what
  // make it read as grass once it is extruded and backlit.
  tallgrass: [
    '................',
    '................',
    '.......h........',
    '......hh...h....',
    '..h...hg..hh....',
    '..hh..gg..hg..h.',
    '..hg..gg..gg..hh',
    '..gg.hgg.hgg..gg',
    '..gg.ggg.ggg.hgg',
    '.hgg.ggG.ggG.ggg',
    '.ggg.ggG.ggG.ggG',
    '.gggGggGGggGGggG',
    '.ggGGggGGggGGggG',
    'GggGGGgGGggGGGgG',
    'GGGGGGGGGGGGGGGG',
    '.GGGGGGGGGGGGGG.',
  ],

  sign: [
    '................',
    '................',
    '..kkkkkkkkkkkk..',
    '..koooooooooek..',
    '..koPPPPPPPPek..',
    '..koPPPPPPPPek..',
    '..koPPPPPPPPek..',
    '..koooooooooek..',
    '..kkkkkkkkkkkk..',
    '.......nn.......',
    '.......nN.......',
    '.......nN.......',
    '.......nN.......',
    '.......nN.......',
    '......NNNN......',
    '................',
  ],

  fence: [
    '................',
    '................',
    '..n..........n..',
    '..n..........n..',
    'nnnnnnnnnnnnnnnn',
    'NNNNNNNNNNNNNNNN',
    '..n..........n..',
    '..n..........n..',
    'nnnnnnnnnnnnnnnn',
    'NNNNNNNNNNNNNNNN',
    '..n..........n..',
    '..N..........N..',
    '..N..........N..',
    '..N..........N..',
    '................',
    '................',
  ],

  // Street lamp. Authored as one bitmap and split at build time: the 'y' pixels
  // become a second mesh with an emissive material, so the glass can light up
  // after dusk while the ironwork stays iron. Extruded thick — at this scale the
  // depth matches the post's width, so it reads as a square post, not a slab.
  lamp: [
    '.....QVVVVQ.....',
    '.....QyyyyQ.....',
    '.....VyyyyV.....',
    '.....QyyyyQ.....',
    '.....QQQQQQ.....',
    '......QVVQ......',
    '.......VQ.......',
    '.......VQ.......',
    '.......VQ.......',
    '.......VQ.......',
    '.......VQ.......',
    '.......VQ.......',
    '.......VQ.......',
    '.......VQ.......',
    '......QVVQ......',
    '.....QVVVVQ.....',
  ],

  // Beach litter, laid flat on the sand. No outline: at five pixels across, a
  // ring of dark edge is half the sprite and the whole thing reads as a bit of
  // grit. Bleached shell against sand is contrast enough — the drop shadow and
  // the cube sides do the separating.
  sanddollar: [
    '................',
    '................',
    '................',
    '................',
    '.....EEEEEE.....',
    '....EEEEEEEE....',
    '....EEHEEHEE....',
    '....EEEHHEEE....',
    '....EEHEEHEE....',
    '....EEEEEEEE....',
    '.....EEEEEE.....',
    '................',
    '................',
    '................',
    '................',
    '................',
  ],

  scallop: [
    '................',
    '................',
    '................',
    '................',
    '......EEEE......',
    '.....EEEEEE.....',
    '....EEHEEHEE....',
    '...EEHEEEEHEE...',
    '...EEEHEEHEEE...',
    '...EEEEEEEEEE...',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
  ],

  conch: [
    '................',
    '................',
    '................',
    '................',
    '......EEEE......',
    '.....EEFEEE.....',
    '....EEFEEFEE....',
    '....EEEFFEEE....',
    '.....EEEEEE.....',
    '......EEEE......',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
  ],

  rock: [
    '................',
    '................',
    '................',
    '.....CCCC.......',
    '....CccccC......',
    '...CcccccCC.....',
    '..CccccccccC....',
    '..CccccccccC....',
    '.CcccccccccCC...',
    '.CcccccccccCC...',
    '..CCcccccccC....',
    '...CCCCCCCC.....',
    '................',
    '................',
    '................',
    '................',
  ],
};

// ------------------------------------------------------------ character art
// Transcribed from the reference renders: 16x16, one bitmap per facing, two
// walk frames each (the lower body shifts a pixel to swap the leading leg).
// Only three inked colours + transparent, exactly like the source hardware.

const HERO_DOWN_A = [
  '.....kkkkkk.....',
  '....krrrrrrk....',
  '..kkrrrrrrrrkk..',
  '..kkrrrrrrrrkk..',
  '..kkkrssssrkkk..',
  '..kkskkkkkkskk..',
  '.kskssssssssksk.',
  '.kssssksskssssk.',
  '..kksskssksskk..',
  '..kkkssrrsskkk..',
  '.ksskkkkkkkkssk.',
  '.ksskkkkkkkkssk.',
  '..kkkrrkkrrkkk..',
  '...krkkrrkkrk...',
  '...krrrkkrrrk...',
  '....kkk..kkk....',
];

const HERO_DOWN_B = [
  '.....kkkkkk.....',
  '....krrrrrrk....',
  '..kkrrrrrrrrkk..',
  '..kkrrrrrrrrkk..',
  '..kkkrssssrkkk..',
  '..kkskkkkkkskk..',
  '.kskssssssssksk.',
  '.kssssksskssssk.',
  '..kksskssksskk..',
  '..kkkssrrsskkk..',
  '.ksskkkkkkkkssk.',
  '.ksskkkkkkkkssk.',
  '...kkkrrkkrrkkk.',
  '....krkkrrkkrk..',
  '....krrrkkrrrk..',
  '.....kkk..kkk...',
];

const HERO_UP_A = [
  '.....kkkkkk.....',
  '....krrrrrrk....',
  '...krrrrrrrrk...',
  '...krrrrrrrrk...',
  '..kkrrrrrrrrkk..',
  '..kkkrrrrrrkkk..',
  '.kskkkkkkkkkksk.',
  '.ksskkkkkkkkssk.',
  '..kksskkkksskk..',
  '..kkkkrrrrkkkk..',
  '.kskkrkkkkrkksk.',
  '.kskkrrssrrkksk.',
  '..kkkkrrrrkkkk..',
  '...krkkkkkkrk...',
  '...krrrkkrrrk...',
  '....kkk..kkk....',
];

const HERO_UP_B = [
  '.....kkkkkk.....',
  '....krrrrrrk....',
  '...krrrrrrrrk...',
  '...krrrrrrrrk...',
  '..kkrrrrrrrrkk..',
  '..kkkrrrrrrkkk..',
  '.kskkkkkkkkkksk.',
  '.ksskkkkkkkkssk.',
  '..kksskkkksskk..',
  '..kkkkrrrrkkkk..',
  '.kskkrkkkkrkksk.',
  '.kskkrrssrrkksk.',
  '...kkkkrrrrkkkk.',
  '....krkkkkkkrk..',
  '....krrrkkrrrk..',
  '.....kkk..kkk...',
];

const HERO_LEFT_A = [
  '.....kkkkkk.....',
  '....krrrrrrk....',
  '...krrrrrrrrk...',
  '..kksrrrrrrrk...',
  '.kssssrrrrrkkk..',
  '..kkrrrkkkkkkk..',
  '...ksksskkkkkk..',
  '...kskssksskk...',
  '...ksssssssk....',
  '....krssskkrk...',
  '.....kkkkkrrk...',
  '......kksskrk...',
  '......kksskrk...',
  '.....krrkkkk....',
  '.....krrrrk.....',
  '......kkkk......',
];

const HERO_LEFT_B = [
  '.....kkkkkk.....',
  '....krrrrrrk....',
  '...krrrrrrrrk...',
  '..kksrrrrrrrk...',
  '.kssssrrrrrkkk..',
  '..kkrrrkkkkkkk..',
  '...ksksskkkkkk..',
  '...kskssksskk...',
  '...ksssssssk....',
  '....krssskkrk...',
  '.....kkkkkrrk...',
  '.......kksskrk..',
  '.......kksskrk..',
  '......krrkkkk...',
  '......krrrrk....',
  '.......kkkk.....',
];

const HERO_RIGHT_A = [
  '.....kkkkkk.....',
  '....krrrrrrk....',
  '...krrrrrrrrk...',
  '...krrrrrrrskk..',
  '..kkkrrrrrssssk.',
  '..kkkkkkkrrrkk..',
  '..kkkkkkssksk...',
  '...kksskssksk...',
  '....ksssssssk...',
  '...krkksssrk....',
  '...krrkkkkk.....',
  '...krksskk......',
  '...krksskk......',
  '....kkkkrrk.....',
  '.....krrrrk.....',
  '......kkkk......',
];

const HERO_RIGHT_B = [
  '.....kkkkkk.....',
  '....krrrrrrk....',
  '...krrrrrrrrk...',
  '...krrrrrrrskk..',
  '..kkkrrrrrssssk.',
  '..kkkkkkkrrrkk..',
  '..kkkkkkssksk...',
  '...kksskssksk...',
  '....ksssssssk...',
  '...krkksssrk....',
  '...krrkkkkk.....',
  '..krksskk.......',
  '..krksskk.......',
  '...kkkkrrk......',
  '....krrrrk......',
  '.....kkkk.......',
];

export const HERO = {
  down: [HERO_DOWN_A, HERO_DOWN_B],
  up: [HERO_UP_A, HERO_UP_B],
  left: [HERO_LEFT_A, HERO_LEFT_B],
  right: [HERO_RIGHT_A, HERO_RIGHT_B],
};

/** The same bitmaps with the cap and shoes inked a different colour. */
const recap = (sprites, ink) => Object.fromEntries(
  Object.entries(sprites).map(([facing, frames]) => [
    facing, frames.map((rows) => rows.map((row) => row.replaceAll('r', ink))),
  ]),
);

/*
  One per player, chosen by the id the relay hands out — see identity.js.

  It is the same silhouette every time on purpose. A cap and a slim body means a
  person; a straw brim or a weaver's shawl means a villager who lives here. That
  distinction is worth more than variety, because it is the one the player reads
  before they read anything else, and it is what tells them who can be talked
  *with* rather than talked *at*. Colour is for telling two people apart, which
  is a question you only ask once you know they are both people.
*/
export const PLAYER_INKS = ['r', '1', '2', '3', '4', '5', '6', '7'];

export const PLAYER_SKINS = PLAYER_INKS.map((ink) => (ink === 'r' ? HERO : recap(HERO, ink)));


// ------------------------------------------------------------------- npc art
// Same rules as the hero — 16x16, one bitmap per facing, two walk frames, hard
// outline, a handful of inked colours — so the two read as the same cast. The
// silhouette is what separates them: a wide straw brim instead of a cap, and a
// stockier body. That is a villager you can pick out of a crowd at a glance,
// which is the whole job of an NPC sprite at this size.

const NPC_DOWN_A = [
  '.....kkkkkk.....',
  '....kttttttk....',
  '...kttLttLttk...',
  'kLLLLLLLLLLLLLLk',
  '....kssssssk....',
  '....kskssksk....',
  '....kssssssk....',
  '.kskxxxxxxxxksk.',
  '.kskxXxxxxXxksk.',
  '.kssxxxxxxxxssk.',
  '..kkPPPPPPPPkk..',
  '..kPPPPPPPPPPk..',
  '..ksssk..ksssk..',
  '..ksssk..ksssk..',
  '..keeek..keeek..',
  '...kkk....kkk...',
];

const NPC_DOWN_B = [
  '.....kkkkkk.....',
  '....kttttttk....',
  '...kttLttLttk...',
  'kLLLLLLLLLLLLLLk',
  '....kssssssk....',
  '....kskssksk....',
  '....kssssssk....',
  '.kskxxxxxxxxksk.',
  '.kskxXxxxxXxksk.',
  '.kssxxxxxxxxssk.',
  '..kkPPPPPPPPkk..',
  '..kPPPPPPPPPPk..',
  '...ksssk..ksssk.',
  '...ksssk..ksssk.',
  '...keeek..keeek.',
  '....kkk....kkk..',
];

const NPC_UP_A = [
  '.....kkkkkk.....',
  '....kttttttk....',
  '...kttLttLttk...',
  'kLLLLLLLLLLLLLLk',
  '....kNNNNNNk....',
  '....kNNNNNNk....',
  '....kNNNNNNk....',
  '.kskxxxxxxxxksk.',
  '.kskxXxxxxXxksk.',
  '.kssxxxxxxxxssk.',
  '..kkPPPPPPPPkk..',
  '..kPPPPPPPPPPk..',
  '..ksssk..ksssk..',
  '..ksssk..ksssk..',
  '..keeek..keeek..',
  '...kkk....kkk...',
];

const NPC_UP_B = [
  '.....kkkkkk.....',
  '....kttttttk....',
  '...kttLttLttk...',
  'kLLLLLLLLLLLLLLk',
  '....kNNNNNNk....',
  '....kNNNNNNk....',
  '....kNNNNNNk....',
  '.kskxxxxxxxxksk.',
  '.kskxXxxxxXxksk.',
  '.kssxxxxxxxxssk.',
  '..kkPPPPPPPPkk..',
  '..kPPPPPPPPPPk..',
  '...ksssk..ksssk.',
  '...ksssk..ksssk.',
  '...keeek..keeek.',
  '....kkk....kkk..',
];

const NPC_LEFT_A = [
  '.....kkkkkk.....',
  '....kttttttk....',
  '...kttLttLttk...',
  'kLLLLLLLLLLLLLLk',
  '...ksssskNNk....',
  '...ksksssNNk....',
  '...ksssskNNk....',
  '....kxxxxxxxk...',
  '....ksxxXxxxk...',
  '....kssxxxxxk...',
  '....kPPPPPPk....',
  '....kPPPPPPk....',
  '.....ksssk......',
  '.....ksssk......',
  '.....keeek......',
  '......kkk.......',
];

const NPC_LEFT_B = [
  '.....kkkkkk.....',
  '....kttttttk....',
  '...kttLttLttk...',
  'kLLLLLLLLLLLLLLk',
  '...ksssskNNk....',
  '...ksksssNNk....',
  '...ksssskNNk....',
  '....kxxxxxxxk...',
  '....ksxxXxxxk...',
  '....kssxxxxxk...',
  '....kPPPPPPk....',
  '....kPPPPPPk....',
  '......ksssk.....',
  '......ksssk.....',
  '......keeek.....',
  '.......kkk......',
];

const NPC_RIGHT_A = [
  '.....kkkkkk.....',
  '....kttttttk....',
  '...kttLttLttk...',
  'kLLLLLLLLLLLLLLk',
  '....kNNkssssk...',
  '....kNNsssksk...',
  '....kNNkssssk...',
  '...kxxxxxxxk....',
  '...kxxxXxxsk....',
  '...kxxxxxssk....',
  '....kPPPPPPk....',
  '....kPPPPPPk....',
  '......ksssk.....',
  '......ksssk.....',
  '......keeek.....',
  '.......kkk......',
];

const NPC_RIGHT_B = [
  '.....kkkkkk.....',
  '....kttttttk....',
  '...kttLttLttk...',
  'kLLLLLLLLLLLLLLk',
  '....kNNkssssk...',
  '....kNNsssksk...',
  '....kNNkssssk...',
  '...kxxxxxxxk....',
  '...kxxxXxxsk....',
  '...kxxxxxssk....',
  '....kPPPPPPk....',
  '....kPPPPPPk....',
  '.....ksssk......',
  '.....ksssk......',
  '.....keeek......',
  '......kkk.......',
];

// The second villager. Same rules again, and read by a different silhouette:
// where the islander is a straw brim, this one is hair and a hem. No split legs
// at all — the skirt swings a pixel instead, which is what sells her walk.

const W_DOWN_A = [
  '.....kkkkkk.....',
  '....knnnnnnk....',
  '...knnnnnnnnk...',
  '...knnnnnnnnk...',
  '...knssssssnk...',
  '...knskssksnk...',
  '...knssssssnk...',
  '...kNnssssnNk...',
  '..kskbbbbbbksk..',
  '..kskbBbbBbksk..',
  '..kssbbbbbbssk..',
  '..kbbmmmmmmbbk..',
  '..kbbbbbbbbbbk..',
  '.kbbbbbbbbbbbbk.',
  '.kbbbbbbbbbbbbk.',
  '.kkkeekkkkeekkk.',
];

const W_DOWN_B = [
  '.....kkkkkk.....',
  '....knnnnnnk....',
  '...knnnnnnnnk...',
  '...knnnnnnnnk...',
  '...knssssssnk...',
  '...knskssksnk...',
  '...knssssssnk...',
  '...kNnssssnNk...',
  '..kskbbbbbbksk..',
  '..kskbBbbBbksk..',
  '..kssbbbbbbssk..',
  '..kbbmmmmmmbbk..',
  '..kbbbbbbbbbbk..',
  '..kbbbbbbbbbbbbk',
  '..kbbbbbbbbbbbbk',
  '..kkkeekkkkeekkk',
];

const W_UP_A = [
  '.....kkkkkk.....',
  '....knnnnnnk....',
  '...knnnnnnnnk...',
  '...knnnnnnnnk...',
  '...knnnnnnnnk...',
  '...knnnnnnnnk...',
  '...kNnnnnnnNk...',
  '...kNNnnnnNNk...',
  '..kskbbbbbbksk..',
  '..kskbBbbBbksk..',
  '..kssbbbbbbssk..',
  '..kbbmmmmmmbbk..',
  '..kbbbbbbbbbbk..',
  '.kbbbbbbbbbbbbk.',
  '.kbbbbbbbbbbbbk.',
  '.kkkeekkkkeekkk.',
];

const W_UP_B = [
  '.....kkkkkk.....',
  '....knnnnnnk....',
  '...knnnnnnnnk...',
  '...knnnnnnnnk...',
  '...knnnnnnnnk...',
  '...knnnnnnnnk...',
  '...kNnnnnnnNk...',
  '...kNNnnnnNNk...',
  '..kskbbbbbbksk..',
  '..kskbBbbBbksk..',
  '..kssbbbbbbssk..',
  '..kbbmmmmmmbbk..',
  '..kbbbbbbbbbbk..',
  '..kbbbbbbbbbbbbk',
  '..kbbbbbbbbbbbbk',
  '..kkkeekkkkeekkk',
];

const W_LEFT_A = [
  '.....kkkkkk.....',
  '....knnnnnnk....',
  '...knnnnnnnnk...',
  '...knnnnnnnnk...',
  '...kssssnnk.....',
  '...kskssnnk.....',
  '...kssssnNk.....',
  '....kssnNNk.....',
  '...kbbbbbbbk....',
  '...ksbbBbbbk....',
  '...kssbbbbbk....',
  '....kmmmmmk.....',
  '....kbbbbbk.....',
  '...kbbbbbbbk....',
  '...kbbbbbbbk....',
  '....kkeekkk.....',
];

const W_LEFT_B = [
  '.....kkkkkk.....',
  '....knnnnnnk....',
  '...knnnnnnnnk...',
  '...knnnnnnnnk...',
  '...kssssnnk.....',
  '...kskssnnk.....',
  '...kssssnNk.....',
  '....kssnNNk.....',
  '...kbbbbbbbk....',
  '...ksbbBbbbk....',
  '...kssbbbbbk....',
  '....kmmmmmk.....',
  '....kbbbbbk.....',
  '....kbbbbbbbk...',
  '....kbbbbbbbk...',
  '.....kkeekkk....',
];

const W_RIGHT_A = [
  '.....kkkkkk.....',
  '....knnnnnnk....',
  '...knnnnnnnnk...',
  '...knnnnnnnnk...',
  '.....knnssssk...',
  '.....knnssksk...',
  '.....kNnssssk...',
  '.....kNNnssk....',
  '....kbbbbbbbk...',
  '....kbbbBbbsk...',
  '....kbbbbbssk...',
  '.....kmmmmmk....',
  '.....kbbbbbk....',
  '....kbbbbbbbk...',
  '....kbbbbbbbk...',
  '.....kkkeekk....',
];

const W_RIGHT_B = [
  '.....kkkkkk.....',
  '....knnnnnnk....',
  '...knnnnnnnnk...',
  '...knnnnnnnnk...',
  '.....knnssssk...',
  '.....knnssksk...',
  '.....kNnssssk...',
  '.....kNNnssk....',
  '....kbbbbbbbk...',
  '....kbbbBbbsk...',
  '....kbbbbbssk...',
  '.....kmmmmmk....',
  '.....kbbbbbk....',
  '...kbbbbbbbk....',
  '...kbbbbbbbk....',
  '....kkkeekk.....',
];

/*
  The drifter on the south beach. Built on the villagers' own proportions so he
  reads as the same cast rather than an import — the difference is all in what
  he has and has not got: a mop of hair instead of a hat, nothing above the
  waist, cut-offs instead of trousers, bare feet instead of boots, and a bottle
  at his hip. At sixteen pixels that is as much characterisation as there is
  room for, and it is enough.
*/
const BUM_DOWN_A = [
  '.....kkkkkk.....',
  '....kNNNNNNk....',
  '...kNNNNNNNNk...',
  '...kNNNNNNNNk...',
  '....kssssssk....',
  '....kskssksk....',
  '....ksNNNNsk....',
  '.kskssssssssksk.',
  '.ksksSssssSsksk.',
  '.k88ssssssssssk.',
  '..k8qqqqqqqqkk..',
  '..kqqqqqqqqqqk..',
  '..ksssk..ksssk..',
  '..ksssk..ksssk..',
  '..kSSSk..kSSSk..',
  '...kkk....kkk...',
];

const BUM_DOWN_B = [
  '.....kkkkkk.....',
  '....kNNNNNNk....',
  '...kNNNNNNNNk...',
  '...kNNNNNNNNk...',
  '....kssssssk....',
  '....kskssksk....',
  '....ksNNNNsk....',
  '.kskssssssssksk.',
  '.ksksSssssSsksk.',
  '.k88ssssssssssk.',
  '..k8qqqqqqqqkk..',
  '..kqqqqqqqqqqk..',
  '...ksssk..ksssk.',
  '...ksssk..ksssk.',
  '...kSSSk..kSSSk.',
  '....kkk....kkk..',
];

const BUM_UP_A = [
  '.....kkkkkk.....',
  '....kNNNNNNk....',
  '...kNNNNNNNNk...',
  '...kNNNNNNNNk...',
  '....kNNNNNNk....',
  '....kNNNNNNk....',
  '....kNNNNNNk....',
  '.kskssssssssksk.',
  '.ksksSssssSsksk.',
  '.kssssssssssssk.',
  '..kkqqqqqqqqkk..',
  '..kqqqqqqqqqqk..',
  '..ksssk..ksssk..',
  '..ksssk..ksssk..',
  '..kSSSk..kSSSk..',
  '...kkk....kkk...',
];

const BUM_UP_B = [
  '.....kkkkkk.....',
  '....kNNNNNNk....',
  '...kNNNNNNNNk...',
  '...kNNNNNNNNk...',
  '....kNNNNNNk....',
  '....kNNNNNNk....',
  '....kNNNNNNk....',
  '.kskssssssssksk.',
  '.ksksSssssSsksk.',
  '.kssssssssssssk.',
  '..kkqqqqqqqqkk..',
  '..kqqqqqqqqqqk..',
  '...ksssk..ksssk.',
  '...ksssk..ksssk.',
  '...kSSSk..kSSSk.',
  '....kkk....kkk..',
];

const BUM_LEFT_A = [
  '.....kkkkkk.....',
  '....kNNNNNNk....',
  '...kNNNNNNNNk...',
  '...kNNNNNNNNk...',
  '...ksssskNNk....',
  '...ksksssNNk....',
  '...kssNNkNNk....',
  '....ksssssssk...',
  '....ksssSsssk...',
  '....kss8ssssk...',
  '....kqqqqqqk....',
  '....kqqqqqqk....',
  '.....ksssk......',
  '.....ksssk......',
  '.....kSSSk......',
  '......kkk.......',
];

const BUM_LEFT_B = [
  '.....kkkkkk.....',
  '....kNNNNNNk....',
  '...kNNNNNNNNk...',
  '...kNNNNNNNNk...',
  '...ksssskNNk....',
  '...ksksssNNk....',
  '...kssNNkNNk....',
  '....ksssssssk...',
  '....ksssSsssk...',
  '....kss8ssssk...',
  '....kqqqqqqk....',
  '....kqqqqqqk....',
  '......ksssk.....',
  '......ksssk.....',
  '......kSSSk.....',
  '.......kkk......',
];

const BUM_RIGHT_A = [
  '.....kkkkkk.....',
  '....kNNNNNNk....',
  '...kNNNNNNNNk...',
  '...kNNNNNNNNk...',
  '....kNNkssssk...',
  '....kNNsssksk...',
  '....kNNkNNssk...',
  '...ksssssssk....',
  '...ksssSsssk....',
  '...k8ssssssssk..',
  '....kqqqqqqk....',
  '....kqqqqqqk....',
  '......ksssk.....',
  '......ksssk.....',
  '......kSSSk.....',
  '.......kkk......',
];

const BUM_RIGHT_B = [
  '.....kkkkkk.....',
  '....kNNNNNNk....',
  '...kNNNNNNNNk...',
  '...kNNNNNNNNk...',
  '....kNNkssssk...',
  '....kNNsssksk...',
  '....kNNkNNssk...',
  '...ksssssssk....',
  '...ksssSsssk....',
  '...k8ssssssssk..',
  '....kqqqqqqk....',
  '....kqqqqqqk....',
  '.....ksssk......',
  '.....ksssk......',
  '.....kSSSk......',
  '......kkk.......',
];

/*
  Amy.

  Same 16x16 grid and the same hard outline as everybody else, so she belongs to
  this cast — but she is drawn to a reference rather than to the house style, and
  the differences are the point rather than a slip:

  - The head takes eleven of the sixteen rows, where everybody else here gets
    about eight. She is the one face the player is asked to look at for twenty
    lines at a time, and a face needs room to be a face.

  - Which buys actual eyes: two pixels across and two down, with a white
    catchlight in each. Every other character in this file has a single dark
    pixel per eye, which is enough to say "person" and not nearly enough to say
    "this person". The blush and the mouth are there for the same reason.

  - Hair parted down the middle, falling either side of the face and flaring past
    the head at the jaw — so the outline is not the cap-and-shoulders shape
    everybody else has, and no hat, where the hero has a cap and the two
    villagers have a brim and a shawl.

  - No feet. The dress simply rounds off, as it does in the reference, and the
    walk reads from the hem swaying a pixel rather than from legs. On a sprite
    with a skirt this hem sway is the better cycle anyway.

  Brown and apricot then say which girl she is, but the shape has already said
  she is one.
*/

const AMY_DOWN_A = [
  '.....kkkkkk.....',
  '....kAAAAAAk....',
  '...kAAAAAAAAk...',
  '...kAAkAAkAAk...',
  '..kAAkIkkIkAAk..',
  '..kAkIIIIIIkAk..',
  '..kkIIkIIkIIkk..',
  '..kkIIkIIkIIkk..',
  '..kAkIIAAIIkAk..',
  '..kkAkkkkkkAkk..',
  '.kkIkIkkkkIkIkk.',
  '.kIIkIIIIIIkIIk.',
  '..kkIIIIIIIIkk..',
  '...kIIIIIIIIk...',
  '....kIIIIIIk....',
  '.....kkkkkk.....',
];

const AMY_DOWN_B = [
  '.....kkkkkk.....',
  '....kAAAAAAk....',
  '...kAAAAAAAAk...',
  '...kAAkAAkAAk...',
  '..kAAkIkkIkAAk..',
  '..kAkIIIIIIkAk..',
  '..kkIIkIIkIIkk..',
  '..kkIIkIIkIIkk..',
  '..kAkIIAAIIkAk..',
  '..kkAkkkkkkAkk..',
  '.kkIkIkkkkIkIkk.',
  '.kIIkIIIIIIkIIk.',
  '..kkIIIIIIIIkk..',
  '...kIIIIIIIIk...',
  '.....kIIIIIIk...',
  '......kkkkkk....',
];

const AMY_UP_A = [
  '.....kkkkkk.....',
  '....kAAAAAAk....',
  '...kAAAAAAAAk...',
  '...kAAkAAkAAk...',
  '..kAAAkAAkAAAk..',
  '..kAAAAAAAAAAk..',
  '..kkAAAAAAAAkk..',
  '..kkAAAAAAAAkk..',
  '..kAkAAAAAAkAk..',
  '..kkAkkkkkkAkk..',
  '.kkIkIkkkkIkIkk.',
  '.kIIkIIIIIIkIIk.',
  '..kkIIIIIIIIkk..',
  '...kIIIIIIIIk...',
  '....kIIIIIIk....',
  '.....kkkkkk.....',
];

const AMY_UP_B = [
  '.....kkkkkk.....',
  '....kAAAAAAk....',
  '...kAAAAAAAAk...',
  '...kAAkAAkAAk...',
  '..kAAAkAAkAAAk..',
  '..kAAAAAAAAAAk..',
  '..kkAAAAAAAAkk..',
  '..kkAAAAAAAAkk..',
  '..kAkAAAAAAkAk..',
  '..kkAkkkkkkAkk..',
  '.kkIkIkkkkIkIkk.',
  '.kIIkIIIIIIkIIk.',
  '..kkIIIIIIIIkk..',
  '...kIIIIIIIIk...',
  '.....kIIIIIIk...',
  '......kkkkkk....',
];

const AMY_LEFT_A = [
  '.....kkkkkk.....',
  '....kAAAAAAk....',
  '...kAAAAAAAAk...',
  '...kIIAAAAAAk...',
  '..kIIIAAAAAAAk..',
  '..kIIIAAAAAAAk..',
  '..kkIkIIAAAAkk..',
  '..kkIkIIAAAAkk..',
  '..kIAIIAAAAAAk..',
  '..kkAkkkkkkAkk..',
  '.kkIkIkkkkIkIkk.',
  '.kIIkIIIIIIkIIk.',
  '..kkIIIIIIIIkk..',
  '...kIIIIIIIIk...',
  '....kIIIIIIk....',
  '.....kkkkkk.....',
];

const AMY_LEFT_B = [
  '.....kkkkkk.....',
  '....kAAAAAAk....',
  '...kAAAAAAAAk...',
  '...kIIAAAAAAk...',
  '..kIIIAAAAAAAk..',
  '..kIIIAAAAAAAk..',
  '..kkIkIIAAAAkk..',
  '..kkIkIIAAAAkk..',
  '..kIAIIAAAAAAk..',
  '..kkAkkkkkkAkk..',
  '.kkIkIkkkkIkIkk.',
  '.kIIkIIIIIIkIIk.',
  '..kkIIIIIIIIkk..',
  '...kIIIIIIIIk...',
  '.....kIIIIIIk...',
  '......kkkkkk....',
];

const AMY_RIGHT_A = [
  '.....kkkkkk.....',
  '....kAAAAAAk....',
  '...kAAAAAAAAk...',
  '...kAAAAAAIIk...',
  '..kAAAAAAAIIIk..',
  '..kAAAAAAAIIIk..',
  '..kkAAAAIIkIkk..',
  '..kkAAAAIIkIkk..',
  '..kAAAAAAIIAIk..',
  '..kkAkkkkkkAkk..',
  '.kkIkIkkkkIkIkk.',
  '.kIIkIIIIIIkIIk.',
  '..kkIIIIIIIIkk..',
  '...kIIIIIIIIk...',
  '....kIIIIIIk....',
  '.....kkkkkk.....',
];

const AMY_RIGHT_B = [
  '.....kkkkkk.....',
  '....kAAAAAAk....',
  '...kAAAAAAAAk...',
  '...kAAAAAAIIk...',
  '..kAAAAAAAIIIk..',
  '..kAAAAAAAIIIk..',
  '..kkAAAAIIkIkk..',
  '..kkAAAAIIkIkk..',
  '..kAAAAAAIIAIk..',
  '..kkAkkkkkkAkk..',
  '.kkIkIkkkkIkIkk.',
  '.kIIkIIIIIIkIIk.',
  '..kkIIIIIIIIkk..',
  '...kIIIIIIIIk...',
  '...kIIIIIIk.....',
  '....kkkkkk......',
];

/**
 * Every villager sprite set, by name. An NPC picks one; two of them standing in
 * the same square metre wearing the same face is the thing this is here to stop.
 */
export const VILLAGERS = {
  straw: {
    down: [NPC_DOWN_A, NPC_DOWN_B],
    up: [NPC_UP_A, NPC_UP_B],
    left: [NPC_LEFT_A, NPC_LEFT_B],
    right: [NPC_RIGHT_A, NPC_RIGHT_B],
  },
  weaver: {
    down: [W_DOWN_A, W_DOWN_B],
    up: [W_UP_A, W_UP_B],
    left: [W_LEFT_A, W_LEFT_B],
    right: [W_RIGHT_A, W_RIGHT_B],
  },
  drifter: {
    down: [BUM_DOWN_A, BUM_DOWN_B],
    up: [BUM_UP_A, BUM_UP_B],
    left: [BUM_LEFT_A, BUM_LEFT_B],
    right: [BUM_RIGHT_A, BUM_RIGHT_B],
  },
  amy: {
    down: [AMY_DOWN_A, AMY_DOWN_B],
    up: [AMY_UP_A, AMY_UP_B],
    left: [AMY_LEFT_A, AMY_LEFT_B],
    right: [AMY_RIGHT_A, AMY_RIGHT_B],
  },
};

/*
  Firework shells: one bitmap for the bloom and one for what is left of it a
  moment later.

  These are the only sprites in the file inked in a colour they are not drawn
  in. Everything else here picks its palette entries and means them; a firework
  is the same shape in gold, rose, teal or violet, and authoring four copies of
  each to say so would be four chances to fix a pixel in three of them. So the
  bitmap carries the *shading* only — `m` for the hot core of an arm, `c` for
  its cooling tip — and the shell's actual colour is a multiply at draw time.
  See fireworks.js.

  Both are symmetric on both axes, which matters more than it sounds: a shell is
  seen for well under a second, and any lopsidedness reads as a mistake rather
  than as character at that speed.
*/
export const FIREWORK = {
  // A hot core with eight arms off it. The core has to be solid: a shell is
  // roughly three hundred pixels across on screen, and an earlier version drawn
  // as eight two-pixel spokes with nothing in the middle read as a scatter of
  // pale bars rather than as anything that had exploded.
  bloom: [
    '.......cc.......',
    '..c....cc....c..',
    '...c...mm...c...',
    '....c..mm..c....',
    '.....cmmmmc.....',
    '..c..cmmmmc..c..',
    '...ccmmmmmmcc...',
    'ccmmmmmmmmmmmmcc',
    'ccmmmmmmmmmmmmcc',
    '...ccmmmmmmcc...',
    '..c..cmmmmc..c..',
    '.....cmmmmc.....',
    '....c..mm..c....',
    '...c...mm...c...',
    '..c....cc....c..',
    '.......cc.......',
  ],
  // And the same shell a moment later: the core spent, the arms carried out
  // into a ring that is coming apart. Drawn as a ring rather than as a fainter
  // bloom because a firework does not dim in place, it travels outwards.
  embers: [
    '......cccc......',
    '....c......c....',
    '..c..........c..',
    '.c............c.',
    '................',
    'c..c........c..c',
    '................',
    'c...m......m...c',
    'c...m......m...c',
    '................',
    'c..c........c..c',
    '................',
    '.c............c.',
    '..c..........c..',
    '....c......c....',
    '......cccc......',
  ],
};

// ----------------------------------------------------------- building parts
export const BUILDING = {
  wall: [
    'ooooooooooooooooo'.slice(0, 16),
    'oPPoPPoPPoPPoPPo',
    'oPPoPPoPPoPPoPPo',
    'oooooooooooooooo',
    'PPoPPoPPoPPoPPoP',
    'PPoPPoPPoPPoPPoP',
    'oooooooooooooooo',
    'oPPoPPoPPoPPoPPo',
    'oPPoPPoPPoPPoPPo',
    'oooooooooooooooo',
    'PPoPPoPPoPPoPPoP',
    'PPoPPoPPoPPoPPoP',
    'oooooooooooooooo',
    'oPPoPPoPPoPPoPPo',
    'oPPoPPoPPoPPoPPo',
    'oooooooooooooooo',
  ],
  roof: [
    'NNNNNNNNNNNNNNNN',
    'NnnNnnNnnNnnNnnN',
    'NnnNnnNnnNnnNnnN',
    'NNNNNNNNNNNNNNNN',
    'nnNnnNnnNnnNnnNn',
    'nnNnnNnnNnnNnnNn',
    'NNNNNNNNNNNNNNNN',
    'NnnNnnNnnNnnNnnN',
    'NnnNnnNnnNnnNnnN',
    'NNNNNNNNNNNNNNNN',
    'nnNnnNnnNnnNnnNn',
    'nnNnnNnnNnnNnnNn',
    'NNNNNNNNNNNNNNNN',
    'NnnNnnNnnNnnNnnN',
    'NnnNnnNnnNnnNnnN',
    'NNNNNNNNNNNNNNNN',
  ],
  door: [
    '................',
    '................',
    '...kkkkkkkkkk...',
    '...kNNNNNNNNk...',
    '...kNnnnnnnNk...',
    '...kNnNNNNnNk...',
    '...kNnNvvNnNk...',
    '...kNnNvvNnNk...',
    '...kNnNNNNnNk...',
    '...kNnnnnnnNk...',
    '...kNnnnnnnNk...',
    '...kNnnnykkNk...',
    '...kNnnnnnnNk...',
    '...kNnnnnnnNk...',
    '...kNNNNNNNNk...',
    '...kkkkkkkkkk...',
  ],
  window: [
    '................',
    '................',
    '................',
    '....kkkkkkkk....',
    '....kmmvvmmk....',
    '....kmmvvmmk....',
    '....kvvvvvvk....',
    '....kvvvvvvk....',
    '....kmmvvmmk....',
    '....kmmvvmmk....',
    '....kkkkkkkk....',
    '................',
    '................',
    '................',
    '................',
    '................',
  ],
};
