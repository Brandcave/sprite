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

/**
 * Opening the page without a room mints one and writes it into the address bar,
 * so the URL you are looking at is always the URL to send someone. Without this
 * two plain tabs are two separate worlds — same island, different weather,
 * villagers somewhere else entirely — which looks exactly like a bug.
 */
function mintRoom() {
  const epoch = Date.now();
  const seed = crypto.getRandomValues(new Uint32Array(1))[0];
  if (params && typeof history !== 'undefined') {
    params.set('epoch', epoch);
    params.set('seed', seed);
    history.replaceState(null, '', `${location.pathname}?${params}`);
  }
  return { epoch, seed };
}

const room = params && (param('epoch') === null || param('seed') === null)
  ? mintRoom()
  : { epoch: param('epoch') ?? Date.now(), seed: param('seed') ?? 1 };

const ANCHOR = Date.now() - performance.now();   // wall time at performance.now() === 0

/*
  Making the world's clock run fast, for everybody at once.

  This is the one thing that is allowed to move the shared timeline, and it is
  shaped the way everything else here is shaped: not as a command that has to
  arrive while it matters, but as a description of a thing that happened, from
  which every machine works out the same clock forever after.

  A rush is four numbers — when it started, how much skew was already in effect,
  how many seconds of world time to add, and how long to take adding them. Given
  those, the skew at any moment is a pure function of the raw clock, so a client
  that hears about it late (or joins an hour afterwards, and is simply handed the
  same four numbers by the relay) lands on exactly the same hour as everyone
  else. Nothing is integrated, nothing has to be replayed, and there is no
  "speeding up" state to keep in step — there is a curve, and every machine reads
  its own position on it.

  `from` is what makes two of these compose: a second rush picks up where the
  first one left off rather than throwing it away.

  The ramp is a smoothstep, so the sun eases up to speed and eases back down
  rather than lurching. It never decreases, which matters more than it looks:
  ticks only ever move forward, and a clock that went backwards would leave the
  villagers and the weather waiting for real time to catch up.
*/
const smooth = (k) => k * k * (3 - 2 * k);

export const sim = {
  epoch: room.epoch,
  seed: room.seed >>> 0,
  offset: 0,        // server clock correction; see configure()
  rush: null,       // { at, from, by, over } — see above
  tick: 0,
  raw: 0,           // seconds since the epoch
  time: 0,          // ...and the same, with any rush added on

  /**
   * The server will call this on join; until then a session is its own room.
   * `offset` is the correction from a clock handshake — device clocks are only
   * roughly in step, and the simulation tolerates a second or two of skew but
   * not thirty, at which point two clients have their villagers walking toward
   * different destinations.
   */
  configure({ epoch, seed, offset } = {}) {
    if (epoch !== undefined) this.epoch = epoch;
    if (seed !== undefined) this.seed = seed >>> 0;
    if (offset !== undefined) this.offset = offset;
    this.read();
  },

  /**
   * How far ahead of the raw clock the world is, at a given raw time.
   * `raw` rather than `this.time`, because the skew is what turns one into the
   * other and a skew defined in terms of its own output would not be a function.
   */
  skewAt(raw) {
    const r = this.rush;
    if (!r) return 0;
    const k = Math.min(1, Math.max(0, (raw - r.at) / r.over));
    return r.from + r.by * smooth(k);
  },

  /**
   * Start running fast. Absolute rather than relative, so applying the same
   * descriptor twice — which is exactly what happens when we send one to the
   * relay and are handed our own back — changes nothing.
   */
  hurry({ at, from = this.skewAt(at), by, over }) {
    this.rush = { at, from, by, over };
    this.read();
  },

  /** What a rush would look like if started now: for whoever is starting one. */
  rushNow(by, over) {
    this.read();
    return { at: this.raw, from: this.skewAt(this.raw), by, over };
  },

  read() {
    // Anchored to a monotonic source rather than read fresh from Date.now():
    // the wall clock can jump — NTP correcting mid-session, or someone setting
    // it — and a backwards jump would stall the simulation until real time
    // caught back up, because ticks only ever move forward.
    const ms = ANCHOR + performance.now() + this.offset - this.epoch;
    this.raw = ms / 1000;
    this.time = this.raw + this.skewAt(this.raw);
    this.tick = Math.floor(this.time * TICK_HZ);
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
