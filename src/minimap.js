import { PALETTE } from './art.js';
import { tileAt, MAP_W, MAP_H } from './world.js';
import { capColour } from './identity.js';
import { sim } from './sim.js';

/*
  The island from directly above, and who is on it.

  The camera is locked to a quarter turn and follows the hero, which is the
  right framing to play in and a poor one to find anybody in: the village fills
  the screen and the rest of the island is off the edge of it. This is the
  answer to "where is everyone" — small, always the same way up, and honest
  about only two things, the shape of the land and where people are standing.

  The land is drawn once. It is a fixed array of characters and will not change
  while anybody is looking at it, so it is baked into an offscreen canvas at one
  pixel per tile and blitted each frame with smoothing off. What actually
  changes is the fog over it, and a handful of dots.

  The island arrives unknown and is uncovered by walking it. That is worth more
  here than a complete map would be: an island you have been shown is scenery,
  and one you have opened up a corner at a time is somewhere you have been. It
  also gives the far side of the map a reason to exist for anybody who has only
  ever crossed the plaza.

  What is uncovered is remembered per room, so the walk is not repaid every time
  the page reloads. A different seed is a different island and starts dark again.
*/

const SCALE = 3;              // screen pixels per tile

/*
  Kept clear of a tile's width on purpose, ring included — the stroke sits
  astride the edge and counts for half its width again. People gather, and two
  standing side by side are one tile apart here; a dot that reaches its
  neighbour's middle means the one drawn second wins and somebody disappears
  under somebody else. Staying inside the tile, every centre survives whoever is
  beside them, and a crowd reads as a cluster of colours rather than one blob.
*/
const PLAYER_DOT = 2;
const NPC_DOT = 1.3;
const RING = 0.75;

// How far you can see from where you are standing. Wide enough that walking the
// road opens the village either side of it rather than a one-tile thread, and
// short enough that the shoreline is still something you have to go and find.
const SIGHT = 5;

const FOG = 'rgba(12, 18, 34, 0.93)';
const SAVE_EVERY = 4000;      // at most one write to storage this often

/*
  Only what you would navigate by. Flowers, lamps, signs and rocks are each one
  tile of something bright, and a dozen of them scattered about turn the map
  into confetti with an island somewhere underneath — which is the opposite of
  what a glance at it is for. Anything not named here draws as the ground it
  stands on, so those tiles quietly become grass.
*/
const INK = {
  '~': PALETTE.W,             // sea
  _: PALETTE.p,               // beach sand
  '.': PALETTE.G,             // grass
  ',': PALETTE.P,             // path
  T: PALETTE.d,               // tree
  Y: PALETTE.a,               // palm
  '#': PALETTE.N,             // fence
  c: PALETTE.c,               // pond curb
  X: PALETTE.N,               // building
};

/*
  Muted toward the glass it sits on. At full strength this is the brightest
  thing on the screen — a saturated green rectangle in the corner of a game
  whose whole look is a low sun — and it pulls the eye away from the island
  itself. The land is background here; the only things that should be sharp are
  the dots, and they are the one thing left unmuted.
*/
const BASE = '#16203a';
const MUTE = 0.62;

const mix = (hex, into, t) => {
  const a = parseInt(hex.slice(1), 16);
  const b = parseInt(into.slice(1), 16);
  const ch = (shift) => {
    const va = (a >> shift) & 255;
    const vb = (b >> shift) & 255;
    return Math.round(va + (vb - va) * t);
  };
  return `rgb(${ch(16)}, ${ch(8)}, ${ch(0)})`;
};

const muted = Object.fromEntries(
  Object.entries(INK).map(([k, hex]) => [k, mix(hex, BASE, MUTE)]),
);

const CSS = `
.mm-root {
  position: fixed;
  right: max(16px, env(safe-area-inset-right, 0px));
  bottom: max(16px, env(safe-area-inset-bottom, 0px));
  z-index: 9; padding: 7px; line-height: 0;
  background: rgba(20, 28, 48, 0.34);
  -webkit-backdrop-filter: blur(14px) saturate(160%);
  backdrop-filter: blur(14px) saturate(160%);
  border: 1px solid rgba(255, 255, 255, 0.22);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.3), 0 8px 20px rgba(4, 8, 18, 0.35);
  border-radius: 12px;
  pointer-events: none; user-select: none;
}
.mm-root canvas { display: block; border-radius: 5px; image-rendering: pixelated; }
`;

export class Minimap {
  constructor(parent = document.body) {
    const style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);

    const root = document.createElement('div');
    root.className = 'mm-root';

    const dpr = Math.min(devicePixelRatio, 2);
    const canvas = document.createElement('canvas');
    canvas.width = MAP_W * SCALE * dpr;
    canvas.height = MAP_H * SCALE * dpr;
    canvas.style.width = `${MAP_W * SCALE}px`;
    canvas.style.height = `${MAP_H * SCALE}px`;
    root.append(canvas);
    parent.append(root);

    this.ctx = canvas.getContext('2d');
    this.ctx.scale(dpr, dpr);
    this.ctx.imageSmoothingEnabled = false;
    this.land = this.bakeLand();

    this.key = `sando:seen:${sim.epoch}:${sim.seed}`;
    this.seen = this.load();
    this.fog = this.bakeFog();
    this.at = null;             // the tile we last uncovered from
    this.savedAt = 0;
    this.dirty = false;
  }

  /* ------------------------------------------------------------------- fog */

  /**
   * A bit per tile, packed and base64'd — 3472 tiles come to 434 bytes, which
   * is small enough that this can be written whole rather than diffed.
   */
  load() {
    const seen = new Uint8Array(MAP_W * MAP_H);
    try {
      const saved = localStorage.getItem(this.key);
      if (!saved) return seen;
      const bytes = atob(saved);
      for (let i = 0; i < seen.length; i++) {
        seen[i] = (bytes.charCodeAt(i >> 3) >> (i & 7)) & 1;
      }
    } catch {
      // no storage, or something unreadable in it: start dark, which is only
      // ever a walk's worth of loss
    }
    return seen;
  }

  save() {
    try {
      const bytes = new Uint8Array(Math.ceil(this.seen.length / 8));
      for (let i = 0; i < this.seen.length; i++) {
        if (this.seen[i]) bytes[i >> 3] |= 1 << (i & 7);
      }
      localStorage.setItem(this.key, btoa(String.fromCharCode(...bytes)));
    } catch {
      // storage full or refused; the map still works for this sitting
    }
  }

  /** Opaque over everything unknown, and cleared a tile at a time as it is seen. */
  bakeFog() {
    const fog = document.createElement('canvas');
    fog.width = MAP_W;
    fog.height = MAP_H;
    const ctx = fog.getContext('2d');
    ctx.fillStyle = FOG;
    ctx.fillRect(0, 0, MAP_W, MAP_H);
    for (let i = 0; i < this.seen.length; i++) {
      if (this.seen[i]) ctx.clearRect(i % MAP_W, Math.floor(i / MAP_W), 1, 1);
    }
    this.fogCtx = ctx;
    return fog;
  }

  /** Everything within sight of a tile, once. */
  uncover(x, z) {
    for (let dz = -SIGHT; dz <= SIGHT; dz++) {
      for (let dx = -SIGHT; dx <= SIGHT; dx++) {
        if (dx * dx + dz * dz > SIGHT * SIGHT) continue;
        const tx = x + dx;
        const tz = z + dz;
        if (tx < 0 || tz < 0 || tx >= MAP_W || tz >= MAP_H) continue;
        const i = tz * MAP_W + tx;
        if (this.seen[i]) continue;
        this.seen[i] = 1;
        this.fogCtx.clearRect(tx, tz, 1, 1);
        this.dirty = true;
      }
    }
  }

  /** One pixel per tile, drawn once and never again. */
  bakeLand() {
    const land = document.createElement('canvas');
    land.width = MAP_W;
    land.height = MAP_H;
    const ctx = land.getContext('2d');
    for (let z = 0; z < MAP_H; z++) {
      for (let x = 0; x < MAP_W; x++) {
        ctx.fillStyle = muted[tileAt(x, z)] ?? muted['.'];
        ctx.fillRect(x, z, 1, 1);
      }
    }
    return land;
  }

  /** A dot, ringed in the outline colour so it reads against any ground. */
  dot(x, z, radius, colour, ring = PALETTE.k) {
    const { ctx } = this;
    ctx.beginPath();
    ctx.arc((x + 0.5) * SCALE, (z + 0.5) * SCALE, radius, 0, Math.PI * 2);
    ctx.fillStyle = colour;
    ctx.fill();
    ctx.lineWidth = RING;
    ctx.strokeStyle = ring;
    ctx.stroke();
  }

  update(player, remotes, npcs, id = null) {
    const { ctx } = this;

    const here = `${player.tileX},${player.tileZ}`;
    if (here !== this.at) {
      this.at = here;
      this.uncover(player.tileX, player.tileZ);
    }
    // Written on a timer rather than on every step: a walk across the island is
    // a hundred of them, and none is worth a trip to storage on its own.
    const now = performance.now();
    if (this.dirty && now - this.savedAt > SAVE_EVERY) {
      this.savedAt = now;
      this.dirty = false;
      this.save();
    }

    ctx.clearRect(0, 0, MAP_W * SCALE, MAP_H * SCALE);
    ctx.drawImage(this.land, 0, 0, MAP_W * SCALE, MAP_H * SCALE);
    ctx.drawImage(this.fog, 0, 0, MAP_W * SCALE, MAP_H * SCALE);

    // People are drawn over the fog rather than hidden by it. The map's whole
    // job is answering where everybody is, and a fog that hid them would take
    // that away in exchange for a rule nobody asked it to keep.
    //
    // Villagers first and smallest. They are part of the scenery here — worth
    // knowing about, never the thing being looked for.
    for (const npc of npcs) this.dot(npc.tileX, npc.tileZ, NPC_DOT, PALETTE.x);

    for (const who of remotes.values()) {
      this.dot(who.tileX, who.tileZ, PLAYER_DOT, capColour(who.id));
    }

    // You last, so nobody is ever standing on top of you, and ringed in white
    // rather than black: on a map of dots the one that matters is the one you
    // find without looking for it.
    this.dot(player.tileX, player.tileZ, PLAYER_DOT, capColour(id), PALETTE.m);
  }
}
