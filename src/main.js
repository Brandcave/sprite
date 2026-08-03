import * as THREE from 'three';
import { buildWorld, tileAt, MAP_W, MAP_H } from './world.js';
import { Player } from './player.js';
import { Npc } from './npc.js';
import { DIRS, characterAt } from './character.js';
import { Dialogue, message } from './dialogue.js';
import { ANOKA, TULA, SIGNS, WORN_SIGN } from './dialogue-scripts.js';
import { VILLAGERS } from './art.js';
import { Weather, DAY_LENGTH } from './weather.js';
import { sim } from './sim.js';
import { PlanarReflection } from './reflection.js';

/* --------------------------------------------------------------- renderer */

const canvas = document.getElementById('view');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(32, 1, 0.5, 200);

/* ----------------------------------------------------------------- lights */

// Shadow frustum sizing. Both the caster AND the ground it lands on have to be
// inside this box, or the shadow gets sliced off along a hard straight edge. The
// sun sits low and backlights the scene, so shadows run long: a 3-unit house at
// the ~11° dawn elevation throws one ~16 units. SPAN must therefore cover the
// visible ground (~±20) plus that overhang, not just what is on screen.
const SHADOW_SPAN = 32;
const SHADOW_DISTANCE = 60;           // how far back the light sits from target
// 4096 keeps the same texel density the old ±16 box had at 2048. This is the
// knob to turn if the shadow pass ever costs too much: 2048 halves edge
// precision to ~0.03 world units, still under half a voxel.
const SHADOW_MAP_SIZE = 4096;
const SHADOW_TEXEL = (SHADOW_SPAN * 2) / SHADOW_MAP_SIZE;

const sun = new THREE.DirectionalLight(0xffffff, 3.0);
sun.castShadow = true;
sun.shadow.mapSize.set(SHADOW_MAP_SIZE, SHADOW_MAP_SIZE);
// The light is pushed well back so that at low sun angles, casters on the
// sunward side of the frustum do not cross the near plane and pop out.
sun.shadow.camera.near = 5;
sun.shadow.camera.far = SHADOW_DISTANCE + SHADOW_SPAN * 2.2;
sun.shadow.bias = -0.0006;
sun.shadow.normalBias = 0.02;
Object.assign(sun.shadow.camera, {
  left: -SHADOW_SPAN, right: SHADOW_SPAN, top: SHADOW_SPAN, bottom: -SHADOW_SPAN,
});
sun.shadow.camera.updateProjectionMatrix();
scene.add(sun, sun.target);

const sky = new THREE.HemisphereLight(0xbfd8ff, 0x4a6b3a, 0.6);
scene.add(sky);

// Camera-side fill. With the sun backlighting the scene, every surface facing
// the viewer — the hero's billboard most of all — would otherwise sit in pure
// ambient. This keeps those faces legible without flattening the shadows.
const fill = new THREE.DirectionalLight(0xfff0d8, 0.5);
scene.add(fill);

/* ------------------------------------------------------------- day cycle */
// key: 0 = dawn, 0.25 = noon, 0.5 = dusk, 0.75 = night

const KEYS = [
  { t: 0.00, sun: 0xffb070, sunI: 1.6, sky: 0xffc9a0, ground: 0x6b5a3a, skyI: 0.55, fog: 0xf0b98a, bg: 0xf3c79c, exposure: 1.0 },
  { t: 0.25, sun: 0xfff6e0, sunI: 3.2, sky: 0xbfd8ff, ground: 0x4a6b3a, skyI: 0.65, fog: 0xc9e2ff, bg: 0x9fd0ff, exposure: 1.05 },
  { t: 0.50, sun: 0xff8a4a, sunI: 1.9, sky: 0xffb9a0, ground: 0x5a4a3a, skyI: 0.5, fog: 0xf09a6a, bg: 0xef8f63, exposure: 1.0 },
  { t: 0.75, sun: 0x8fa8ff, sunI: 0.7, sky: 0x4a6ac0, ground: 0x1a2438, skyI: 0.8, fog: 0x243052, bg: 0x121c33, exposure: 1.3 },
  { t: 1.00, sun: 0xffb070, sunI: 1.6, sky: 0xffc9a0, ground: 0x6b5a3a, skyI: 0.55, fog: 0xf0b98a, bg: 0xf3c79c, exposure: 1.0 },
];

scene.fog = new THREE.Fog(0xc9e2ff, 34, 78);
scene.background = new THREE.Color(0x9fd0ff);

const cA = new THREE.Color();
const cB = new THREE.Color();
const sunDir = new THREE.Vector3();

function applyTimeOfDay(t) {
  let i = 0;
  while (i < KEYS.length - 2 && t > KEYS[i + 1].t) i++;
  const a = KEYS[i];
  const b = KEYS[i + 1];
  const k = (t - a.t) / (b.t - a.t);

  const mix = (ka, kb) => cA.setHex(ka).lerp(cB.setHex(kb), k).getHex();

  sun.color.setHex(mix(a.sun, b.sun));
  sun.intensity = THREE.MathUtils.lerp(a.sunI, b.sunI, k);
  sky.color.setHex(mix(a.sky, b.sky));
  sky.groundColor.setHex(mix(a.ground, b.ground));
  sky.intensity = THREE.MathUtils.lerp(a.skyI, b.skyI, k);
  scene.fog.color.setHex(mix(a.fog, b.fog));
  scene.background.setHex(mix(a.bg, b.bg));
  renderer.toneMappingExposure = THREE.MathUtils.lerp(a.exposure, b.exposure, k);

  // Weather multiplies the clear-sky baseline down *here*, before the fill
  // light, the self-lit floors and the dusk test read sun.intensity — so a
  // storm dims all of them, and a heavy one lights the street lamps by itself.
  weather.applyBase();

  fill.intensity = 0.7 * (sun.intensity / 3.2) + 0.08;
  // self-lit floor for the characters, so the backlit sprites still read
  const skin = 1.15 * (sun.intensity / 3.2) + 0.12;
  player.material.emissiveIntensity = skin;
  for (const npc of npcs) npc.material.emissiveIntensity = skin;
  // a gentler one for foliage — backlit leaves glow, they do not go flat black
  const leaf = 0.72 * (sun.intensity / 3.2) + 0.05;
  for (const mat of foliage) mat.emissiveIntensity = leaf;
  // and one for the lamps' painted metal, which the backlit sun never reaches
  if (lampMetal) lampMetal.emissiveIntensity = 0.6 * (sun.intensity / 3.2) + 0.05;

  // 0 in broad daylight, 1 in the dead of night
  const night = THREE.MathUtils.smoothstep(1 - sun.intensity / 1.6, 0, 1);
  lantern.intensity = night * 5.5;
  // `power` lets a street lamp burn brighter than a house window without
  // needing its own pass here
  for (const { mat, glow, power = 1 } of lamps) {
    mat.emissiveIntensity = night * 1.3;
    glow.intensity = night * 4 * power;
  }

  // lightning last: a strike must not switch the lamps back off
  weather.applyFlash();

  // Sun arcs east -> west; low and raking near dawn/dusk, steep at noon.
  // theta advances a FULL turn per day, so t = 1 lands on exactly the same
  // direction as t = 0 and the cycle wraps with no pop. The fixed negative Z
  // parks the sun on the far side of the world from the camera all day, so
  // shadows always rake *toward* the viewer. That backlit read is the look.
  const theta = (t - 0.25) * Math.PI * 2;
  const elev = Math.max(0.18, Math.cos(theta));
  sunDir.set(Math.sin(theta) * 1.4, elev * 1.25, -1.0).normalize();
}

/* ------------------------------------------------------------------ world */

// Read the shared clock before anything is built from it: the weather replays
// the last few minutes on construction, and the villagers replay every step
// they have taken since the world began.
sim.read();

const { animated, lamps, foliage, lampMetal, windUniforms, puddles } = buildWorld(scene);
const player = new Player(scene, 31, 28);

// Villagers. Each keeps to a home tile and a roam radius, so they stay where
// they were placed — one on the lawn by the path, one up by the houses.
// `index` is their identity in the shared schedule: it staggers when each one
// decides, and it seeds what they decide. Order matters — villagers block each
// other, so who moves first decides who gets the tile — so never reorder this
// list without meaning to.
const npcs = [
  new Npc(scene, 34, 28, { index: 0, roam: 3, script: ANOKA, sprites: VILLAGERS.straw }),
  new Npc(scene, 26, 20, { index: 1, roam: 2, script: TULA, sprites: VILLAGERS.weaver }),
];

const dialogue = new Dialogue();

// One mirrored render of the scene, shared by every puddle — they all lie on the
// same plane, so this costs a pass per frame rather than a pass per puddle, and
// only on the frames where the ground is wet at all.
const reflection = new PlanarReflection({ height: 0.012, scale: 0.5 });
puddles.reflect.value = reflection.texture;
puddles.matrix.value = reflection.textureMatrix;

// Two or three spells of weather a day, rolled fresh each morning. It reads the
// scene's own lights rather than owning them — see weather.js.
const weather = new Weather({
  scene, renderer, sun, sky, fill, windUniforms,
  bounds: { w: MAP_W, h: MAP_H },
});

// the hero carries a lantern — it only earns its keep after dusk, but it is the
// clearest demo that these are real lights and not baked sprite shading
// parented to the billboarding pivot, so it always sits between the sprite and
// the camera and lights the face rather than the back of the slab
const lantern = new THREE.PointLight(0xffc27a, 0, 9, 2);
lantern.position.set(0, 0.8, 0.5);
player.pivot.add(lantern);

/* ----------------------------------------------------------------- camera */

// The camera is locked: fixed quarter-turn, fixed distance, fixed pitch. It only
// ever follows the player. The sun is authored against this one framing, so
// letting it orbit or zoom would throw away the backlit read.
const YAW_INDEX = 0;                  // 0..3, quarter turns
const DISTANCE = 17 * 1.35;
const PITCH = THREE.MathUtils.degToRad(46);

const camOffset = new THREE.Vector3();
const camTarget = new THREE.Vector3();

function updateCamera(dt) {
  camOffset.set(0, Math.sin(PITCH) * DISTANCE, Math.cos(PITCH) * DISTANCE);
  camOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), (YAW_INDEX * Math.PI) / 2);

  camTarget.lerp(player.position, 1 - Math.pow(0.0015, dt));
  camera.position.copy(camTarget).add(camOffset);
  camera.lookAt(camTarget.x, camTarget.y + 0.6, camTarget.z);

  // Follow the player, but snap the frustum to whole shadow-map texels — an
  // unsnapped box slides by fractions of a texel and makes every shadow edge
  // crawl as you walk. Pinned to y = 0 so it does not bob with the ground.
  const sx = Math.round(camTarget.x / SHADOW_TEXEL) * SHADOW_TEXEL;
  const sz = Math.round(camTarget.z / SHADOW_TEXEL) * SHADOW_TEXEL;
  sun.target.position.set(sx, 0, sz);
  sun.position.set(sx, 0, sz).addScaledVector(sunDir, SHADOW_DISTANCE);

  // the fill rides with the camera so it always lands on the faces we can see
  fill.position.copy(camOffset).normalize();
}

/* ------------------------------------------------------------------ input */

const held = new Set();
const KEYMAP = {
  ArrowUp: 0, KeyW: 0,
  ArrowRight: 1, KeyD: 1,
  ArrowDown: 2, KeyS: 2,
  ArrowLeft: 3, KeyA: 3,
};

// One full day/night cycle takes 24 real minutes. dayT is normalised 0..1 and
// wraps at 1 -> 0, which the keyframe table and the sun arc are both built to
// cross seamlessly. It is *read* from the shared clock rather than accumulated,
// so two machines on the same epoch are at the same hour without being told.
const DAY_PHASE = 0.115;              // a fresh world opens a little after sunrise
let dayShift = 0;                     // setDay() only moves this
let dayT = DAY_PHASE;
const readDay = () => (sim.time / DAY_LENGTH + DAY_PHASE + dayShift + 1) % 1;

const TALK_KEYS = new Set(['KeyZ', 'KeyE', 'Enter', 'Space']);

addEventListener('keydown', (e) => {
  // A conversation swallows input: arrow keys drive the choice cursor, not the
  // hero, and nothing walks off mid-sentence.
  if (dialogue.active) {
    held.clear();
    if (dialogue.key(e.code)) e.preventDefault();
    return;
  }
  if (TALK_KEYS.has(e.code)) {
    interact();
    e.preventDefault();
    return;
  }
  if (e.code in KEYMAP) {
    held.add(KEYMAP[e.code]);
    e.preventDefault();
  }
});
addEventListener('keyup', (e) => {
  if (e.code in KEYMAP) held.delete(KEYMAP[e.code]);
});

/**
 * Whatever the hero is squarely facing and could act on: a villager to talk to,
 * or a sign to read. One tile ahead, and only while standing still — reaching
 * mid-step would let you trigger something you have already walked past.
 */
function facing() {
  if (player.moving) return null;
  const d = DIRS[(player.facing + YAW_INDEX) % 4];   // screen facing -> world
  const x = player.tileX + d.dx;
  const z = player.tileZ + d.dz;

  const who = characterAt(x, z);
  if (who?.script) return { verb: 'talk', npc: who };
  if (tileAt(x, z) === 's') return { verb: 'read', sign: `${x},${z}` };
  return null;
}

function interact() {
  const target = facing();
  if (!target) return;
  if (target.npc) {
    target.npc.talking = true;
    dialogue.start(target.npc.script, () => { target.npc.talking = false; });
  } else {
    dialogue.start(message(SIGNS[target.sign] ?? WORN_SIGN));
  }
}

function inputDirection() {
  if (!held.size) return -1;
  // most recent key wins; rotate screen-space input into world space
  const screenDir = [...held][held.size - 1];
  return (screenDir + YAW_INDEX) % 4;
}

/* ------------------------------------------------------------------- loop */

function resize() {
  const w = innerWidth;
  const h = innerHeight;
  renderer.setSize(w, h, false);
  reflection.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize);
resize();

const hud = document.getElementById('clock');
const clock = new THREE.Clock();

function frame() {
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;

  sim.read();
  dayT = readDay();
  weather.update(player.position);
  puddles.wet.value = weather.wet;
  applyTimeOfDay(dayT);

  player.update(dt, dialogue.active ? -1 : inputDirection(), YAW_INDEX);
  for (const npc of npcs) npc.update(dt, YAW_INDEX, player);
  dialogue.update(dt);
  dialogue.showHint(!dialogue.active && facing()?.verb);
  updateCamera(dt);
  for (const fn of animated) fn(t);

  const hours = (dayT * 24 + 6) % 24;
  hud.textContent = `${String(Math.floor(hours)).padStart(2, '0')}:${String(Math.floor((hours % 1) * 60)).padStart(2, '0')}`;

  // The puddles cannot be in their own reflection, and neither the rain nor the
  // swooshes belong in it — they are in front of the water, not above it.
  if (puddles.mesh && weather.wet > 0.02) {
    reflection.update(renderer, scene, camera, [
      puddles.mesh, weather.rainField.mesh, weather.gusts.mesh,
    ]);
  }

  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

applyTimeOfDay(dayT);
camTarget.copy(player.position);
frame();

// convenience for poking at the scene from devtools; setDay(0.75) jumps to night
Object.assign(window, {
  THREE, scene, camera, renderer, player, npcs, dialogue, MAP_W, MAP_H,
  setDay: (t) => {
    dayShift = (t - sim.time / DAY_LENGTH - DAY_PHASE) % 1;
    dayT = readDay();
    applyTimeOfDay(dayT);
  },
  setWeather: (type) => weather.force(type),
  reflection, puddles, sim,
  weather,
});
