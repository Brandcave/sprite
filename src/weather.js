import * as THREE from 'three';
import { sim, frac, range, TICK, catchUp } from './sim.js';

/*
  Weather.

  One director owns three continuous values — wind, rain and flash — and
  everything else just reads them. Nothing in the scene knows what a "storm" is:
  the foliage reads `wind`, the rain field reads `rain`, the lighting reads all
  three. Keeping it to numbers is what stops the weather and the day cycle from
  fighting over the same globals.

  All of it is derived from the shared clock (see sim.js) rather than integrated
  frame by frame, so two machines with the same seed and epoch get the same
  weather without exchanging a word about it, and a client that joins in the
  middle of a storm arrives in the middle of the same storm:

  - Which spells happen on a given day is a pure function of hash(seed, day).
  - How far into a spell you are is (now - start), not an accumulated timer.
  - Lightning strikes are a precomputed list of instants per storm.
  - Gusts spawn on tick numbers and are laid out from hash(seed, tick), so the
    same swooshes cross the same ground for everybody.

  Only ground wetness is genuinely stateful — it is an integral of rain over
  time — so it advances on the fixed tick. It is also a leaky integrator with a
  minute-long memory, which means any drift washes out on its own.

  The lighting is layered *on top of* the day cycle rather than replacing it:
  applyTimeOfDay() writes the clear-sky baseline for the hour, then applyBase()
  multiplies it down. Rain at dawn is dim orange and rain at noon flat grey,
  with no combinations to author — and a heavy storm drags the sun low enough
  that the existing dusk test trips and the street lamps come on by themselves.
*/

const PROFILES = {
  clear: { wind: 0.00, rain: 0.0, dark: 0.00, strikes: false },
  wind:  { wind: 1.00, rain: 0.0, dark: 0.12, strikes: false },
  rain:  { wind: 0.45, rain: 0.5, dark: 0.55, strikes: false },
  storm: { wind: 0.90, rain: 1.0, dark: 1.00, strikes: true },
};

// Rolled per day. Storms are the rarest — they are the loudest, and a sky that
// tears open twice an hour stops being an event.
const WEIGHTED = ['wind', 'wind', 'rain', 'rain', 'rain', 'storm'];

export const DAY_LENGTH = 24 * 60;    // seconds per full day/night cycle
const RAMP = 10;                      // seconds to fade a spell in or out
const DUR = [70, 130];                // spell length, seconds

const STORM_SKY = new THREE.Color(0x7f8ea8);
const STORM_FOG = new THREE.Color(0x5a6472);
const STORM_BG = new THREE.Color(0x49525f);
const FLASH_SKY = new THREE.Color(0xdfe8ff);
const FLASH_BG = new THREE.Color(0xc3d0e6);

const lerp = THREE.MathUtils.lerp;
const clamp = THREE.MathUtils.clamp;
const smooth = (t) => t * t * (3 - 2 * t);

/**
 * Lightning envelope: a hard hit, a fast fall, then a second smaller pop. A
 * single linear fade reads as somebody switching a lamp on.
 */
function flashEnvelope(t) {
  if (t < 0) return 0;
  if (t < 0.05) return 1;
  if (t < 0.13) return lerp(1, 0.08, (t - 0.05) / 0.08);
  if (t < 0.19) return lerp(0.08, 0.72, (t - 0.13) / 0.06);
  if (t < 0.5) return lerp(0.72, 0, (t - 0.19) / 0.31);
  return 0;
}

/* ------------------------------------------------------------------ particles */

const PARTICLE_VERT = /* glsl */ `
  attribute vec4 aSeed;          // xy: cell position, z: phase, w: per-drop random
  uniform vec3 uOrigin;
  uniform vec2 uDrift;
  uniform float uRadius, uHeight, uFall, uLen, uWidth, uTime, uAmount;
  varying float vAlpha;
  varying vec2 vUv;

  void main() {
    vAlpha = 0.0;
    vUv = uv;

    // Density without touching the buffers: every particle holds a random, and
    // only those under the current amount are drawn. The rest collapse off
    // screen, which costs a vertex and nothing else.
    if (aSeed.w > uAmount) {
      gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
      return;
    }

    float sp = 0.75 + 0.5 * aSeed.w;
    float y = fract(aSeed.z - uTime * uFall * sp / uHeight) * uHeight;

    // Wrap horizontally inside the box so the field can drift forever without
    // the particle count ever depending on the size of the world.
    vec2 xz = aSeed.xy * uRadius + uDrift * uTime * sp;
    xz = mod(xz + uRadius, 2.0 * uRadius) - uRadius;
    vec3 wp = uOrigin + vec3(xz.x, y, xz.y);

    // Build the streak along its own travel direction, turned edge-on to the
    // camera — a billboard that stays aligned with the fall instead of facing
    // the viewer flat.
    vec3 dir = normalize(vec3(-uDrift.x, -uFall, -uDrift.y));
    vec3 toCam = normalize(cameraPosition - wp);
    vec3 side = normalize(cross(dir, toCam));
    wp += side * (position.x * uWidth) + dir * (position.y * uLen * (0.7 + 0.6 * aSeed.w));

    float r = length(xz) / uRadius;
    vAlpha = (1.0 - smoothstep(0.55, 1.0, r))          // hide the box edge
           * (1.0 - smoothstep(0.88, 1.0, y / uHeight)); // and the ceiling

    gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
  }
`;

const PARTICLE_FRAG = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  varying float vAlpha;
  varying vec2 vUv;

  void main() {
    float head = mix(0.3, 1.0, vUv.y);   // brightest at the leading end
    float a = vAlpha * uOpacity * head;
    if (a < 0.01) discard;
    gl_FragColor = vec4(uColor, a);
  }
`;

/**
 * Rain: one instanced field whose vertex shader does the falling, the drifting
 * and the wrapping, so the cost is the same whether you are standing in it or
 * looking across the island at it. It rides with the camera, which is why it
 * needs no clock of its own beyond the shared one.
 */
class ParticleField {
  constructor(scene, { count, color, fall, len, width, radius = 20, height = 15 }) {
    const base = new THREE.PlaneGeometry(1, 1);
    const geo = new THREE.InstancedBufferGeometry();
    geo.index = base.index;
    geo.setAttribute('position', base.attributes.position);
    geo.setAttribute('uv', base.attributes.uv);

    // Laid out from the shared hash, not Math.random, so every client's rain
    // falls in the same places — it rides the camera, but it is not arbitrary.
    const seeds = new Float32Array(count * 4);
    for (let i = 0; i < count; i++) {
      seeds[i * 4 + 0] = frac(sim.seed, 11, i) * 2 - 1;
      seeds[i * 4 + 1] = frac(sim.seed, 12, i) * 2 - 1;
      seeds[i * 4 + 2] = frac(sim.seed, 13, i);
      seeds[i * 4 + 3] = frac(sim.seed, 14, i);
    }
    geo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seeds, 4));
    geo.instanceCount = count;

    this.uniforms = {
      uOrigin: { value: new THREE.Vector3() },
      uDrift: { value: new THREE.Vector2() },
      uRadius: { value: radius },
      uHeight: { value: height },
      uFall: { value: fall },
      uLen: { value: len },
      uWidth: { value: width },
      uTime: { value: 0 },
      uAmount: { value: 0 },
      uColor: { value: new THREE.Color(color) },
      uOpacity: { value: 1 },
    };

    const mat = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: PARTICLE_VERT,
      fragmentShader: PARTICLE_FRAG,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.frustumCulled = false;       // positions live in the shader
    this.mesh.renderOrder = 10;
    this.mesh.visible = false;
    this.mesh.name = 'weather:rain';
    scene.add(this.mesh);
  }

  update(t, origin, { amount, opacity, drift }) {
    this.mesh.visible = amount > 0.001;
    if (!this.mesh.visible) return;
    this.uniforms.uTime.value = t % 3600;
    this.uniforms.uAmount.value = amount;
    this.uniforms.uOpacity.value = opacity;
    this.uniforms.uDrift.value.copy(drift);
    // Half a box above the player, so the ceiling is never in shot.
    this.uniforms.uOrigin.value.set(origin.x, origin.y - 0.5, origin.z);
  }
}

/* ---------------------------------------------------------------------- gusts */

const GUST_MAX = 24;              // ribbons the buffer can hold at once
const GUST_SEGMENTS = 24;
const GUST_LIFE = 2.4;            // seconds from spawn to gone
const GUST_TRAVEL = 26;

const GUST_VERT = /* glsl */ `
  attribute float aU;             // 0..1 along the ribbon
  attribute float aSide;          // -1 / +1 across it
  attribute vec4 iOriginLife;     // xyz: where it started, w: 0..1 life (<0 dead)
  attribute vec4 iDirLen;         // xy: heading, z: length, w: seed
  uniform float uTravel, uWidth;
  varying float vAlpha;

  void main() {
    vAlpha = 0.0;
    float life = iOriginLife.w;
    if (life < 0.0 || life > 1.0) {
      gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
      return;
    }

    vec2 d = normalize(iDirLen.xy);
    vec3 flow = vec3(d.x, 0.0, d.y);
    vec3 across = vec3(-d.y, 0.0, d.x);
    float seed = iDirLen.w;

    // The whole ribbon slides along its heading; aU walks its length.
    vec3 p = iOriginLife.xyz + flow * (life * uTravel + aU * iDirLen.z);

    // A lazy S and a slight rise, so it curls the way a Wind Waker gust does
    // instead of ruling a straight line across the screen.
    p += across * sin(aU * 3.14159 * 1.4 + seed * 6.28) * 0.55;
    p.y += sin(aU * 3.14159) * 0.32 + sin(life * 6.28 + seed) * 0.12;

    // Tapered to points at both ends.
    float w = uWidth * pow(sin(aU * 3.14159), 0.55);
    vec3 toCam = normalize(cameraPosition - p);
    p += normalize(cross(flow, toCam)) * (aSide * w);

    vAlpha = sin(aU * 3.14159)
           * smoothstep(0.0, 0.12, life)
           * (1.0 - smoothstep(0.72, 1.0, life));

    gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
  }
`;

const GUST_FRAG = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  varying float vAlpha;
  void main() {
    float a = vAlpha * uOpacity;
    if (a < 0.01) discard;
    gl_FragColor = vec4(uColor, a);
  }
`;

/**
 * Wind you can see: pale swooshes that sweep past at knee height and are gone.
 * They are the wind — there is no ambient haze and nothing leans permanently,
 * because a gust that never ends stops reading as a gust.
 *
 * They are anchored to the world rather than to the camera, and every one of
 * them is a pure function of the tick it spawned on, so the same swoosh crosses
 * the same patch of grass for every player watching. The renderer holds no
 * state at all: each frame it is handed the live ones and draws them.
 */
class Gusts {
  constructor(scene) {
    const geo = new THREE.InstancedBufferGeometry();
    const pos = [];
    const u = [];
    const side = [];
    const idx = [];
    for (let i = 0; i <= GUST_SEGMENTS; i++) {
      const t = i / GUST_SEGMENTS;
      pos.push(0, 0, 0, 0, 0, 0);
      u.push(t, t);
      side.push(-1, 1);
    }
    for (let i = 0; i < GUST_SEGMENTS; i++) {
      const a = i * 2;
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('aU', new THREE.Float32BufferAttribute(u, 1));
    geo.setAttribute('aSide', new THREE.Float32BufferAttribute(side, 1));
    geo.setIndex(idx);

    this.originLife = new Float32Array(GUST_MAX * 4);
    this.dirLen = new Float32Array(GUST_MAX * 4);
    this.aOriginLife = new THREE.InstancedBufferAttribute(this.originLife, 4);
    this.aDirLen = new THREE.InstancedBufferAttribute(this.dirLen, 4);
    this.aOriginLife.setUsage(THREE.DynamicDrawUsage);
    this.aDirLen.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('iOriginLife', this.aOriginLife);
    geo.setAttribute('iDirLen', this.aDirLen);
    geo.instanceCount = GUST_MAX;

    this.uniforms = {
      uTravel: { value: GUST_TRAVEL },
      uWidth: { value: 0.17 },
      uColor: { value: new THREE.Color(0xf4f9ff) },
      uOpacity: { value: 0.4 },
    };

    const mat = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: GUST_VERT,
      fragmentShader: GUST_FRAG,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 8;
    this.mesh.name = 'weather:gusts';
    scene.add(this.mesh);

    this.band = {
      pos: new THREE.Vector2(1e6, 1e6),
      dir: new THREE.Vector2(1, 0),
      push: 0,
    };
  }

  /** @param live descriptors from Weather.liveGusts(), newest last */
  draw(live, focus) {
    const n = Math.min(live.length, GUST_MAX);
    for (let i = 0; i < GUST_MAX; i++) this.originLife[i * 4 + 3] = -1;

    let best = null;
    let bestD = Infinity;
    for (let i = 0; i < n; i++) {
      const g = live[live.length - n + i];
      this.originLife.set([g.x, g.y, g.z, g.life], i * 4);
      this.dirLen.set([g.dx, g.dz, g.len, g.seed], i * 4);

      // the swoosh nearest the player is the one the grass bows for
      const cx = g.x + g.dx * (g.life * GUST_TRAVEL + g.len * 0.5);
      const cz = g.z + g.dz * (g.life * GUST_TRAVEL + g.len * 0.5);
      const d = (cx - focus.x) ** 2 + (cz - focus.z) ** 2;
      if (d < bestD) {
        bestD = d;
        best = { cx, cz, dx: g.dx, dz: g.dz, life: g.life };
      }
    }
    this.aOriginLife.needsUpdate = true;
    this.aDirLen.needsUpdate = true;
    this.mesh.visible = n > 0;

    if (best) {
      this.band.pos.set(best.cx, best.cz);
      this.band.dir.set(best.dx, best.dz).normalize();
      this.band.push = 0.11 * Math.sin(clamp(best.life, 0, 1) * Math.PI);
    } else {
      this.band.push = 0;
    }
  }
}

/* -------------------------------------------------------------------- weather */

export class Weather {
  constructor({ scene, renderer, sun, sky, fill, windUniforms = [], bounds }) {
    this.scene = scene;
    this.renderer = renderer;
    this.sun = sun;
    this.sky = sky;
    this.fill = fill;
    this.windUniforms = windUniforms;
    this.bounds = bounds ?? { w: 64, h: 64 };

    // the clear-sky fog the day cycle assumes, to lerp away from and back to
    this.fogNear = scene.fog.near;
    this.fogFar = scene.fog.far;

    this.wind = 0;
    this.rain = 0;
    this.dark = 0;
    this.flash = 0;
    this.wet = 0;               // ground wetness: the one genuinely stateful value
    this.windClock = 0;

    this.dir = new THREE.Vector2(1, 0);
    this.drift = new THREE.Vector2();
    this.days = new Map();      // day number -> spells, cached
    this.override = null;       // devtools only; see force()
    this.at = sim.tick;

    this.rainField = new ParticleField(scene, {
      count: 6000, color: 0xcfe0f5, fall: 17, len: 0.55, width: 0.035,
    });
    this.gusts = new Gusts(scene);

    // Wetness has a minute-long memory, so replaying the last few minutes puts
    // a client that has just loaded exactly where everyone else already is.
    this.at = sim.tick - 3000;
    catchUp(this.at, (t) => this.step(t), 3000);
    this.at = sim.tick;
  }

  /* ---------------------------------------------- pure functions of the clock */

  /** The spells for a given day: two or three, one per equal slice so they never stack. */
  spellsFor(day) {
    let spells = this.days.get(day);
    if (spells) return spells;

    const n = 2 + (frac(sim.seed, 101, day) < 0.45 ? 1 : 0);
    spells = [];
    for (let i = 0; i < n; i++) {
      const slice = 1 / n;
      const at = (i + 0.15 + frac(sim.seed, 102, day, i) * 0.7) * slice;
      spells.push({
        day,
        index: i,
        type: WEIGHTED[Math.floor(frac(sim.seed, 103, day, i) * WEIGHTED.length)],
        start: day * DAY_LENGTH + at * DAY_LENGTH,
        dur: range(DUR[0], DUR[1], sim.seed, 104, day, i),
      });
    }
    this.days.set(day, spells);
    if (this.days.size > 8) this.days.delete(this.days.keys().next().value);
    return spells;
  }

  /** Whichever spell covers this instant, if any. */
  spellAt(time) {
    const day = Math.floor(time / DAY_LENGTH);
    for (let d = day - 1; d <= day; d++) {
      if (d < 0) continue;
      for (const s of this.spellsFor(d)) {
        if (time >= s.start && time < s.start + s.dur) return s;
      }
    }
    return null;
  }

  /** wind / rain / dark at an instant — ramps included, no timers anywhere. */
  levelsAt(time) {
    if (this.override) return PROFILES[this.override];
    const s = this.spellAt(time);
    if (!s) return PROFILES.clear;

    const e = time - s.start;
    let k = 1;
    if (e < RAMP) k = e / RAMP;
    else if (e > s.dur - RAMP) k = Math.max(0, (s.dur - e) / RAMP);
    const p = PROFILES[s.type];
    const g = smooth(k);
    return { wind: p.wind * g, rain: p.rain * g, dark: p.dark * g, strikes: p.strikes };
  }

  /** When a storm's strikes land: a list of instants, worked out once per spell. */
  strikesFor(spell) {
    if (spell.strikes) return spell.strikes;
    const out = [];
    let t = range(4, 9, sim.seed, 105, spell.day, spell.index);
    for (let i = 0; t < spell.dur - 1.5 && i < 40; i++) {
      out.push(spell.start + t);
      t += range(4, 13, sim.seed, 106, spell.day, spell.index, i);
    }
    spell.strikes = out;
    return out;
  }

  flashAt(time) {
    if (this.override && !PROFILES[this.override].strikes) return 0;
    const s = this.spellAt(time);
    if (!s || !PROFILES[s.type].strikes) return 0;
    let f = 0;
    for (const at of this.strikesFor(s)) {
      if (at > time) break;
      if (time - at < 0.5) f = Math.max(f, flashEnvelope(time - at));
    }
    return f;
  }

  /**
   * Every swoosh currently in flight. A gust exists if its spawn tick rolled
   * under the spawn chance for the wind at that moment, and everything about it
   * — where, which way, how long — comes from that tick. No state is kept, so a
   * client that has been running for an hour and one that just arrived see the
   * same ribbons in the same places.
   */
  liveGusts(time) {
    const live = [];
    const window = Math.ceil(GUST_LIFE / TICK);
    const first = Math.max(0, sim.tick - window);
    const { w, h } = this.bounds;
    for (let t = first; t <= sim.tick; t++) {
      const wind = this.levelsAt(t * TICK).wind;
      if (frac(sim.seed, 201, t) >= lerp(0.012, 0.3, wind)) continue;
      const life = (time - t * TICK) / GUST_LIFE;
      if (life < 0 || life > 1) continue;

      // heading: the prevailing wind at that moment, with a little slant
      const a = this.dirAt(t * TICK);
      const j = range(-0.25, 0.25, sim.seed, 202, t);
      const c = Math.cos(j);
      const s = Math.sin(j);
      live.push({
        x: range(1, w - 1, sim.seed, 203, t),
        y: range(0.3, 1.6, sim.seed, 204, t),
        z: range(1, h - 1, sim.seed, 205, t),
        dx: a.x * c - a.y * s,
        dz: a.x * s + a.y * c,
        len: range(3.5, 8, sim.seed, 206, t),
        seed: frac(sim.seed, 207, t),
        life,
      });
    }
    return live;
  }

  /** The prevailing wind direction wanders slowly, and does so identically for all. */
  dirAt(time) {
    const a = time * 0.013;
    const x = Math.cos(a);
    const y = Math.sin(a * 0.7 + 1.1);
    const m = Math.hypot(x, y) || 1;
    return { x: x / m, y: y / m };
  }

  /* -------------------------------------------------------- the fixed tick */

  step(tick) {
    const L = this.levelsAt(tick * TICK);
    // Puddles lag the rain and outlast it — water takes a while to pool, and
    // longer to go. Filling is scaled by how hard it is coming down.
    const fill = L.rain > 0.05 ? (TICK * L.rain) / 22 : -TICK / 55;
    this.wet = clamp(this.wet + fill, 0, 1);
    this.windClock += TICK * (1 + 1.5 * L.wind);
  }

  update(focus) {
    this.at = catchUp(this.at, (t) => this.step(t));

    const time = sim.time;
    const L = this.levelsAt(time);
    this.wind = L.wind;
    this.rain = L.rain;
    this.dark = L.dark;
    this.flash = this.flashAt(time);

    const d = this.dirAt(time);
    this.dir.set(d.x, d.y);

    this.gusts.draw(this.liveGusts(time), focus);
    this.gusts.uniforms.uOpacity.value = 0.28 + 0.3 * this.wind;
    this.applyWind();

    this.drift.copy(this.dir).multiplyScalar(1.1 + 5.0 * this.wind);
    this.rainField.update(time, focus, {
      amount: this.rain,
      opacity: 0.42 + 0.3 * this.rain + 0.45 * this.flash,
      drift: this.drift,
    });
  }

  applyWind() {
    const band = this.gusts.band;
    for (const u of this.windUniforms) {
      u.uWindTime.value = this.windClock;
      u.uWindScale.value = 1 + 1.4 * this.wind;
      // the plants bow inside whatever swoosh is passing, not to a global lean
      u.uGustPos.value.copy(band.pos);
      u.uGustDir.value.copy(band.dir);
      u.uGustPush.value = band.push * (0.7 + 0.6 * this.wind);
      u.uGustWidth.value = 3.2;
    }
  }

  /**
   * Force a condition from devtools. This is the one thing here that is not
   * shared: it overrides the schedule locally, so a forced storm falls on you
   * alone. 'clear' hands control back to the clock.
   */
  force(type) {
    if (type === 'clear' || !type) {
      this.override = null;
      return 'back on the schedule';
    }
    if (!PROFILES[type]) return `unknown: ${type} (clear, wind, rain, storm)`;
    this.override = type;
    return `${type} — local only; setWeather('clear') to rejoin the schedule`;
  }

  /** What the sky is doing, plainly — 'clear', 'wind', 'rain' or 'storm'. */
  get kind() {
    return this.override ?? this.spellAt(sim.time)?.type ?? 'clear';
  }

  get label() {
    if (this.override) return `${this.override} (forced)`;
    return this.kind;
  }

  /** What the next spells are, for debugging the schedule. */
  get schedule() {
    const day = Math.floor(sim.time / DAY_LENGTH);
    return this.spellsFor(day).map((s) => ({
      type: s.type,
      inMinutes: +((s.start - sim.time) / 60).toFixed(1),
      lasts: Math.round(s.dur),
    }));
  }

  /* ------------------------------------------------------------- the lighting */

  /**
   * Multiply the day cycle's clear-sky values down. Call this after the
   * keyframes are applied and *before* anything derived from sun.intensity, so
   * the fill light, the self-lit floors and the dusk test all follow the storm
   * rather than the hour.
   */
  applyBase() {
    const { scene } = this;
    const d = this.dark;
    scene.fog.near = lerp(this.fogNear, this.fogNear * 0.3, d);
    scene.fog.far = lerp(this.fogFar, this.fogFar * 0.42, d);
    if (d < 0.001) return;

    this.sun.intensity *= 1 - 0.78 * d;
    this.sky.intensity *= 1 - 0.2 * d;
    this.sky.color.lerp(STORM_SKY, 0.65 * d);
    scene.fog.color.lerp(STORM_FOG, 0.8 * d);
    scene.background.lerp(STORM_BG, 0.85 * d);
    this.renderer.toneMappingExposure *= 1 - 0.16 * d;
  }

  /**
   * Lightning, applied last so a strike cannot switch the street lamps back off.
   * It flashes the hemisphere and the background, never the sun: the sun owns
   * the shadow direction, and flashing it swings every shadow in the scene.
   */
  applyFlash() {
    const f = this.flash;
    if (f < 0.001) return;
    this.sky.intensity += 3.4 * f;
    this.sky.color.lerp(FLASH_SKY, 0.75 * f);
    this.scene.background.lerp(FLASH_BG, 0.8 * f);
    this.renderer.toneMappingExposure += 0.3 * f;
  }
}
