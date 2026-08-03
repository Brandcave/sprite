/*
  The shared clock, and the randomness that hangs off it.

  Everything in the world that moves on its own — the weather, the villagers —
  is a function of two numbers: a seed, and how many ticks have elapsed since a
  shared epoch. Give two machines the same pair and they compute the same island
  without exchanging a single message about it. That is the whole point: when
  this becomes multiplayer, the server says when "now" is and nothing else.

  Two rules make that hold:

  - Nothing that matters may accumulate on the render frame. `x += dt` drifts
    the moment two clients have different frame rates, or one joins late, or a
    tab is backgrounded. Anything stateful advances on a FIXED tick instead, and
    anything that can be derived from the clock outright is derived rather than
    integrated.

  - Nothing that matters may call Math.random(), and nothing shared may go
    through Math.sin(). The world generator's sine hash is fine for laying out
    trees — every client generates its own copy of a static map — but sin() is
    not bit-identical across JavaScript engines, and a shared *timeline* built
    on it would slowly part company between a Chrome player and a Safari one.
    So the clock's randomness is integer-only, and exactly reproducible.
*/

export const TICK_HZ = 20;
export const TICK = 1 / TICK_HZ;
export const TICK_MS = 1000 / TICK_HZ;

// How far behind the clock a simulation will chase before it gives up and snaps
// to the present. Browsers suspend rAF in background tabs, so a client can come
// back minutes late; replaying all of it would stall the frame for no benefit.
export const MAX_CATCHUP = 40;          // 2 seconds of ticks

/**
 * Integer avalanche hash (the murmur3 finaliser, folded over its arguments).
 * Math.imul is an exact 32-bit multiply, so this returns the same number on
 * every engine — which a shared world needs and Math.sin cannot promise.
 */
export function hash(...ints) {
  let h = 0x9e3779b9;
  for (let i = 0; i < ints.length; i++) {
    h ^= ints[i] | 0;
    h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
    h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
    h ^= h >>> 16;
  }
  return h >>> 0;
}

/** The same, as a fraction in [0, 1). */
export const frac = (...ints) => hash(...ints) / 4294967296;

/** …and scaled into a range. */
export const range = (lo, hi, ...ints) => lo + (hi - lo) * frac(...ints);

// A room, for now, is a URL: ?epoch=<ms>&seed=<int>. Two browsers opened on the
// same pair are already in the same weather, watching the same villagers walk
// the same paths — which is the whole of the shared world, before a single byte
// has been sent between them. The server's job later is just to hand these out.
const params = typeof location === 'undefined'
  ? null
  : new URLSearchParams(location.search);
const param = (k) => {
  const v = params?.get(k);
  return v === null || v === undefined || v === '' || Number.isNaN(+v) ? null : +v;
};

export const sim = {
  epoch: param('epoch') ?? Date.now(),
  seed: param('seed') ?? 1,
  tick: 0,
  time: 0,          // seconds since the epoch

  /** The server will call this on join; until then a session is its own room. */
  configure({ epoch, seed } = {}) {
    if (epoch !== undefined) this.epoch = epoch;
    if (seed !== undefined) this.seed = seed >>> 0;
    this.read();
  },

  read() {
    const ms = Date.now() - this.epoch;
    this.time = ms / 1000;
    this.tick = Math.floor(ms / TICK_MS);
    return this.tick;
  },
};

/**
 * Run `step(tick)` up to the shared clock, capped. Returns how many ticks ran.
 * `from` is the last tick the caller integrated; it gets the new one back.
 */
export function catchUp(from, step, cap = MAX_CATCHUP) {
  const target = sim.tick;
  let at = from;
  if (target - at > cap) at = target - cap;      // too far behind: snap
  while (at < target) step(++at);
  return at;
}
