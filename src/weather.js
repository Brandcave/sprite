import * as THREE from 'three';

/*
  Weather.

  One director owns three continuous values — wind, rain and flash — and
  everything else just reads them. Nothing in the scene knows what a "storm" is:
  the foliage reads `wind`, the particle fields read `rain`, the lighting reads
  all three. Keeping it to numbers is what stops the weather and the day cycle
  from fighting over the same globals.

  Two or three events land at random points in each day. Each ramps in, holds,
  and ramps out; the ramps are most of what makes it read as weather rather than
  as a switch being thrown.

  The lighting is deliberately layered *on top of* the day cycle rather than
  replacing it: applyTimeOfDay() writes the clear-sky baseline for the current
  hour, then applyBase() below multiplies that down. Rain at dawn is therefore
  dim orange and rain at noon is flat grey, with no combinations to author. It
  also means a heavy storm drags the sun low enough that the existing dusk test
  trips and the street lamps come on by themselves.
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

const RAMP = 10;                  // seconds to fade an event in or out
const DUR = [70, 130];            // event length, seconds

const STORM_SKY = new THREE.Color(0x7f8ea8);
const STORM_FOG = new THREE.Color(0x5a6472);
const STORM_BG = new THREE.Color(0x49525f);
const FLASH_SKY = new THREE.Color(0xdfe8ff);
const FLASH_BG = new THREE.Color(0xc3d0e6);

const lerp = THREE.MathUtils.lerp;
const smooth = (t) => t * t * (3 - 2 * t);

/**
 * Lightning envelope: a hard hit, a fast fall, then a second smaller pop. A
 * single linear fade reads as somebody switching a lamp on.
 */
function flashEnvelope(t) {
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
 * One instanced field of streaks — rain if it falls, blown dust if it drifts.
 * The whole thing is a single draw call whose vertex shader does the falling,
 * the drifting and the wrapping, so the cost is the same whether you are
 * standing in it or looking across the island at it.
 */
class ParticleField {
  constructor(scene, {
    count, color, fall, len, width, radius = 20, height = 15, opacity = 1,
  }) {
    const base = new THREE.PlaneGeometry(1, 1);
    const geo = new THREE.InstancedBufferGeometry();
    geo.index = base.index;
    geo.setAttribute('position', base.attributes.position);
    geo.setAttribute('uv', base.attributes.uv);

    const seeds = new Float32Array(count * 4);
    for (let i = 0; i < count; i++) {
      seeds[i * 4 + 0] = Math.random() * 2 - 1;
      seeds[i * 4 + 1] = Math.random() * 2 - 1;
      seeds[i * 4 + 2] = Math.random();
      seeds[i * 4 + 3] = Math.random();
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
      uOpacity: { value: opacity },
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
    this.mesh.name = 'weather:particles';
    scene.add(this.mesh);
  }

  update(t, origin, { amount, opacity, drift }) {
    this.mesh.visible = amount > 0.001;
    if (!this.mesh.visible) return;
    this.uniforms.uTime.value = t;
    this.uniforms.uAmount.value = amount;
    this.uniforms.uOpacity.value = opacity;
    this.uniforms.uDrift.value.copy(drift);
    // Half a box above the player, so the ceiling is never in shot.
    this.uniforms.uOrigin.value.set(origin.x, origin.y - 0.5, origin.z);
  }
}

/* ---------------------------------------------------------------------- gusts */

const GUST_MAX = 10;              // live swooshes at once
const GUST_SEGMENTS = 24;

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
 * Wind you can see: a handful of pale swooshes that sweep past at knee height
 * and are gone. They are the wind — there is no ambient haze and nothing leans
 * permanently, because a gust that never ends stops reading as a gust.
 *
 * The newest live swoosh also publishes its position as a band the foliage
 * shader bows inside, so the grass and the palms react to the thing you can
 * actually see going past rather than to a global number.
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
    for (let i = 0; i < GUST_MAX; i++) this.originLife[i * 4 + 3] = -1;   // all dead
    this.aOriginLife = new THREE.InstancedBufferAttribute(this.originLife, 4);
    this.aDirLen = new THREE.InstancedBufferAttribute(this.dirLen, 4);
    this.aOriginLife.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('iOriginLife', this.aOriginLife);
    geo.setAttribute('iDirLen', this.aDirLen);
    geo.instanceCount = GUST_MAX;

    this.uniforms = {
      uTravel: { value: 26 },
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

    this.speed = new Float32Array(GUST_MAX);
    this.wait = 2;
    this.primary = -1;
    this.band = {
      pos: new THREE.Vector2(1e6, 1e6),
      dir: new THREE.Vector2(1, 0),
      push: 0,
    };
  }

  spawn(dir, focus, wind) {
    let slot = -1;
    for (let i = 0; i < GUST_MAX; i++) {
      if (this.originLife[i * 4 + 3] < 0) { slot = i; break; }
    }
    if (slot < 0) return;           // all ten in flight: skip this one

    // start upwind of the player and off to one side, at knee to waist height
    const across = new THREE.Vector2(-dir.y, dir.x).multiplyScalar((Math.random() - 0.5) * 22);
    const back = 13 + Math.random() * 4;
    this.originLife[slot * 4] = focus.x - dir.x * back + across.x;
    this.originLife[slot * 4 + 1] = 0.3 + Math.random() * 1.3;
    this.originLife[slot * 4 + 2] = focus.z - dir.y * back + across.y;
    this.originLife[slot * 4 + 3] = 0;

    const jitter = (Math.random() - 0.5) * 0.5;
    const c = Math.cos(jitter);
    const s = Math.sin(jitter);
    this.dirLen[slot * 4] = dir.x * c - dir.y * s;
    this.dirLen[slot * 4 + 1] = dir.x * s + dir.y * c;
    this.dirLen[slot * 4 + 2] = 3.5 + Math.random() * 4.5;
    this.dirLen[slot * 4 + 3] = Math.random();
    this.aDirLen.needsUpdate = true;

    this.speed[slot] = (0.4 + Math.random() * 0.2) * (1 + 0.5 * wind);
    this.primary = slot;
  }

  update(dt, wind, dir, focus) {
    // Sporadic when it is calm, insistent in a gale — but never a steady stream.
    // The pending wait is also clamped down as the wind rises, or a spell that
    // starts during a long calm interval takes ten seconds to show itself.
    this.wait = Math.min(this.wait, lerp(16, 0.7, wind) * 1.4);
    this.wait -= dt;
    if (this.wait <= 0) {
      const n = wind > 0.5 ? 1 + Math.floor(Math.random() * 3) : 1;
      for (let i = 0; i < n; i++) this.spawn(dir, focus, wind);
      this.wait = lerp(16, 0.7, wind) * (0.6 + Math.random() * 0.8);
    }

    let live = false;
    for (let i = 0; i < GUST_MAX; i++) {
      const life = this.originLife[i * 4 + 3];
      if (life < 0) continue;
      const next = life + dt * this.speed[i];
      this.originLife[i * 4 + 3] = next > 1 ? -1 : next;
      if (next <= 1) live = true;
    }
    this.aOriginLife.needsUpdate = true;
    this.mesh.visible = live;

    // hand the newest swoosh to the foliage as a band to bow inside
    const p = this.primary;
    const life = p >= 0 ? this.originLife[p * 4 + 3] : -1;
    if (life >= 0) {
      const travel = life * this.uniforms.uTravel.value + this.dirLen[p * 4 + 2] * 0.5;
      this.band.dir.set(this.dirLen[p * 4], this.dirLen[p * 4 + 1]).normalize();
      this.band.pos.set(
        this.originLife[p * 4] + this.band.dir.x * travel,
        this.originLife[p * 4 + 2] + this.band.dir.y * travel,
      );
      this.band.push = 0.11 * Math.sin(Math.min(1, life) * Math.PI);
    } else {
      this.band.push = 0;
    }
  }
}

/* -------------------------------------------------------------------- weather */

export class Weather {
  constructor({ scene, renderer, sun, sky, fill, windUniforms = [] }) {
    this.scene = scene;
    this.renderer = renderer;
    this.sun = sun;
    this.sky = sky;
    this.fill = fill;
    this.windUniforms = windUniforms;

    // the clear-sky fog the day cycle assumes, to lerp away from and back to
    this.fogNear = scene.fog.near;
    this.fogFar = scene.fog.far;

    this.wind = 0;
    this.rain = 0;
    this.wet = 0;      // ground wetness: fills under rain, dries slowly after
    this.dark = 0;
    this.flash = 0;

    this.dir = new THREE.Vector2(1, 0);       // downwind, in world XZ
    this.drift = new THREE.Vector2();
    this.windClock = 0;
    this.clock = 0;

    this.schedule = [];
    this.next = 0;
    this.active = null;
    this.elapsed = 0;
    this.forced = null;
    this.lastDayT = 1;
    this.strikeIn = 0;
    this.flashT = 99;

    this.rainField = new ParticleField(scene, {
      count: 6000, color: 0xcfe0f5, fall: 17, len: 0.55, width: 0.035,
    });
    this.gusts = new Gusts(scene);

    this.roll();
  }

  /** Two or three events, one per equal slice of the day so they never stack. */
  roll() {
    const n = 2 + (Math.random() < 0.45 ? 1 : 0);
    this.schedule = [];
    for (let i = 0; i < n; i++) {
      const slice = 1 / n;
      this.schedule.push({
        at: (i + 0.15 + Math.random() * 0.7) * slice,
        type: WEIGHTED[Math.floor(Math.random() * WEIGHTED.length)],
        dur: DUR[0] + Math.random() * (DUR[1] - DUR[0]),
      });
    }
    this.next = 0;
  }

  /** Force a condition from devtools. 'clear' ends whatever is running. */
  force(type) {
    if (type === 'clear') {
      this.forced = null;
      this.active = null;
      // Skip anything already due, or the scheduler starts the next event the
      // instant this one is cancelled and 'clear' never actually clears.
      while (this.schedule[this.next] && this.schedule[this.next].at <= this.lastDayT) this.next++;
      return 'clearing';
    }
    if (!PROFILES[type]) return `unknown: ${type} (clear, wind, rain, storm)`;
    this.forced = type;
    this.active = { type, dur: Infinity };
    this.elapsed = 0;
    return `${type} — setWeather('clear') to stop`;
  }

  get label() {
    return this.active ? this.active.type : 'clear';
  }

  update(dt, dayT, focus) {
    this.clock = (this.clock + dt) % 3600;

    // a new day: new schedule
    if (dayT < this.lastDayT) this.roll();
    this.lastDayT = dayT;

    if (!this.active && !this.forced) {
      // Walk past anything whose slot has been and gone — an event that was
      // shadowed by a longer one before it should be missed, not fired late.
      while (this.schedule[this.next] && dayT >= this.schedule[this.next].at) {
        const e = this.schedule[this.next++];
        if (dayT - e.at < 0.05) {
          this.active = e;
          this.elapsed = 0;
          break;
        }
      }
    }

    // ramp in, hold, ramp out — one curve, evaluated per frame
    let k = 0;
    if (this.active) {
      this.elapsed += dt;
      const { dur } = this.active;
      if (this.elapsed >= dur) {
        this.active = null;
      } else if (this.elapsed < RAMP) {
        k = this.elapsed / RAMP;
      } else if (this.elapsed > dur - RAMP) {
        k = Math.max(0, (dur - this.elapsed) / RAMP);
      } else {
        k = 1;
      }
    }
    // a cancelled force still has to fade out, so ease toward the target rather
    // than snapping when `active` disappears
    const p = PROFILES[this.active ? this.active.type : 'clear'];
    const e = smooth(k);
    const ease = 1 - Math.pow(0.02, dt);
    this.wind = lerp(this.wind, p.wind * e, ease);
    this.rain = lerp(this.rain, p.rain * e, ease);
    this.dark = lerp(this.dark, p.dark * e, ease);

    // wind direction wanders slowly, so gusts do not always come from the same
    // quarter; the whole scene leans with it
    const a = this.clock * 0.013;
    this.dir.set(Math.cos(a), Math.sin(a * 0.7 + 1.1)).normalize();

    // Puddles lag the rain and outlast it — water takes a while to pool, and
    // longer to go. Filling is scaled by how hard it is coming down.
    const fill = this.rain > 0.05 ? (dt * this.rain) / 22 : -dt / 55;
    this.wet = THREE.MathUtils.clamp(this.wet + fill, 0, 1);

    this.gusts.update(dt, this.wind, this.dir, focus);
    this.gusts.uniforms.uOpacity.value = 0.28 + 0.3 * this.wind;
    this.updateWind(dt);
    this.updateStrikes(dt, p);

    // rain slants downwind and harder in a gust; dust is mostly sideways
    this.drift.copy(this.dir).multiplyScalar(1.1 + 5.0 * this.wind);
    this.rainField.update(this.clock, focus, {
      amount: this.rain,
      opacity: 0.42 + 0.3 * this.rain + 0.45 * this.flash,
      drift: this.drift,
    });
  }

  updateWind(dt) {
    // Accumulated, not absolute: a gust speeds the motion up, and because the
    // clock only ever moves forward the phase never jumps when it does.
    this.windClock += dt * (1 + 1.5 * this.wind);
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

  updateStrikes(dt, profile) {
    this.flashT += dt;
    this.flash = flashEnvelope(this.flashT);

    if (!profile.strikes || this.dark < 0.55) {
      this.strikeIn = 3 + Math.random() * 4;
      return;
    }
    this.strikeIn -= dt;
    if (this.strikeIn <= 0) {
      this.strikeIn = 4 + Math.random() * 9;
      this.flashT = 0;
    }
  }

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
