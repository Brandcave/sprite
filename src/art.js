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
  // skin / character
  s: '#e8a878',
  S: '#c89058',
  r: '#d8483c',         // cap + shoes red
  R: '#901818',
  b: '#3050a0',         // shirt blue
  B: '#203868',
  m: '#f8f8f8',         // white
  e: '#404048',         // shoe / dark
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
