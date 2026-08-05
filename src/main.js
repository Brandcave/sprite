import * as THREE from 'three';
import { buildWorld, tileAt, ISLAND, MAP_W, MAP_H } from './world.js';
import { goTo, here, inBounds } from './place.js';
import { buildInterior } from './interior.js';
import { Player } from './player.js';
import { Npc, scriptOf } from './npc.js';
import { DIRS, characterAt, view } from './character.js';
import { Dialogue, message, partOfDay } from './dialogue.js';
import { Chat } from './chat.js';
import { Channel } from './channel.js';
import { Toolbar } from './toolbar.js';
import { Inventory } from './inventory.js';
import { Pickup } from './pickup.js';
import { itemOf } from './items.js';
import { ANOKA, TULA, BRAM, villager, SIGNS, WORN_SIGN, OPENING } from './dialogue-scripts.js';
import { VILLAGERS } from './art.js';
import { Weather, DAY_LENGTH, DAY_PHASE, dayAt } from './weather.js';
import { sim } from './sim.js';
import { Net } from './net.js';
import { RemotePlayer } from './remote.js';
import { PlanarReflection } from './reflection.js';
import { TOUCH, TouchControls } from './touch.js';
import { Minimap } from './minimap.js';
import { Story } from './story.js';
import { Fireworks } from './fireworks.js';

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

// A long lens, which is most of why the world reads as flat and toy-like from
// up here. The kiss borrows a wider one for a few seconds — see KISS_CAM.
const FOV = 32;
const camera = new THREE.PerspectiveCamera(FOV, 1, 0.5, 200);

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
// Halved on a phone: the pass is the most expensive thing on screen and 2048
// still puts the edge precision under half a voxel, which the note above works
// through. This is the one place the mobile build is not the desktop build.
const SHADOW_MAP_SIZE = TOUCH ? 2048 : 4096;
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
  // everyone else in the room too, or they are silhouettes after dark: only the
  // local hero carries a lantern
  for (const who of remotes.values()) who.material.emissiveIntensity = skin;
  // ...and the things lying on the ground, for exactly the same reason. They are
  // the same kind of object as a character — a camera-facing slab, with the sun
  // behind it — so without this a coconut on a bright beach is a black dot.
  for (const p of pickups) p.material.emissiveIntensity = skin;
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

// Reach the relay *before* anything is built from the clock, and correct for
// this machine's clock skew while we are at it: the weather replays the last
// few minutes on construction and the villagers replay every step they have
// taken, so both want the shared time, not this laptop's idea of it. With no
// server to answer, this returns false after a moment and the island is yours
// alone — the game does not need the network, it only makes use of one.
const net = new Net();
await net.connect();
// Before anything is built: if somebody already ran the sun down in this room,
// the island we are about to construct is the one at *that* hour, with the
// weather and the villagers to match.
if (net.rush) sim.hurry(net.rush);
sim.read();

goTo(ISLAND);
const { animated, lamps, foliage, lampMetal, windUniforms, puddles } = buildWorld(scene);
// Spread arrivals around the plaza: with players blocking each other, a room
// where everyone spawns on one square is a room where nobody can move.
const SPAWN = [[31, 28], [30, 28], [32, 28], [31, 27], [30, 27], [32, 27], [31, 29], [30, 29], [32, 29]];
const spawn = SPAWN[(net.id ?? 0) % SPAWN.length];
const player = new Player(scene, spawn[0], spawn[1], net.id);

// Villagers. Each keeps to a home tile and a roam radius, so they stay where
// they were placed — one on the lawn by the path, one up by the houses.
// `index` is their identity in the shared schedule: it staggers when each one
// decides, and it seeds what they decide. Order matters — villagers block each
// other, so who moves first decides who gets the tile — so never reorder this
// list without meaning to.
//
// Their scripts are handed over as functions rather than as scripts, because
// which one they are on depends on how far along you are with Amy and that is
// not known yet — `story` is built a few lines below, out of rooms that do not
// exist until after this list. Asked at the moment you press Z, so the answer is
// always the current one and nothing has to go round the cast when it changes.
// See villager() in dialogue-scripts.js for the four chapters.
//
// Anoka is held in a name of her own as well as in the list, because the story
// has one more use for her than the other two: she is the one who walks up at
// the end of it. Lifted out, not moved — she is still first, and the list is
// still the schedule's order.
const anoka = new Npc(scene, 34, 28, {
  index: 0, roam: 3, sprites: VILLAGERS.straw,
  script: () => villager(ANOKA, story.chapter),
});

const npcs = [
  anoka,
  new Npc(scene, 26, 20, {
    index: 1, roam: 2, sprites: VILLAGERS.weaver,
    script: () => villager(TULA, story.chapter),
  }),
  // Down on the south beach, and steadily less vertical as the day goes on.
  new Npc(scene, 28, 47, {
    index: 2, roam: 4, sprites: VILLAGERS.drifter, tipsy: true,
    script: () => villager(BRAM, story.chapter),
  }),
];

/*
  The two houses, and the rooms behind their doors. The door tile is the one you
  walk into from the path — the wall the door is painted on — so going inside is
  not a key you have to know about, it is the step you were already taking.
*/
const HOUSES = [
  buildInterior(scene, 1, { door: { x: 20, z: 18 }, step: { x: 20, z: 19 } }),
  buildInterior(scene, 2, { door: { x: 39, z: 18 }, step: { x: 39, z: 19 } }),
];

/** The room whose door is on this tile, if any — only ever asked outdoors. */
const houseAt = (x, z) => HOUSES.find((r) => r.door.x === x && r.door.z === z);

/*
  The bag, built up here rather than down with the rest of the panels, because
  the story asks it questions — she wants you to arrive holding something — and
  it has to exist before she does. It is otherwise a tool like any other and is
  handed to the toolbar with the rest of them, further down.
*/
const inventory = new Inventory();

/*
  Amy, and the one thread of this world that runs in an order rather than on the
  clock. She joins the villagers rather than being kept apart from them: she
  wants the same self-lit floor after dark, the same dot on the map, the same
  everything — the only thing about her that is not a villager is that talking to
  her changes where she is, and that lives in story.js.
*/
const story = new Story(
  scene,
  { parlour: HOUSES[0], dining: HOUSES[1] },
  { anoka, player, bag: inventory },
);
npcs.push(story.amy);

// The sky going to pieces, when a script says it does. Yours alone and not on
// the wire — see fireworks.js for why that is the right answer and not a corner
// being cut.
const fireworks = new Fireworks(scene);
// The show goes off over the pair of them rather than over him, now that there
// is a camera swinging round to look at both — a show centred on one of two
// people standing together is off to one side of the picture the whole time.
story.onFireworks = () => {
  const at = player.position.clone().add(story.amy.position).multiplyScalar(0.5);
  fireworks.start(at);
  startKissCam(player, story.amy);
};

/*
  ...and the one thing in the story that is not yours alone. Asking her to watch
  the stars runs the sun down over the whole island, so it goes to the relay
  rather than straight to our own clock.

  Sent and *not* applied here, which is the whole point: the relay is entitled to
  refuse — it will not take two clock changes in a handful of seconds — and a
  client that had already moved its own sun would be the one machine in the room
  on an hour of its own. So we ask, and we change our sky when we are told to,
  by the same message everybody else is told by. It comes straight back, so this
  costs a round trip nobody can see.

  With no relay to ask there is nobody to disagree with, and it applies here.
*/
story.onNightfall = (rush) => (net.online ? net.hurry(rush) : sim.hurry(rush));
net.onRush = (rush) => sim.hurry(rush);

/**
 * What this step would do if it is a step through a door — going in from the
 * path, or back out over the mat — and nothing if it is an ordinary step.
 */
function doorway(dir) {
  const d = DIRS[dir];
  const x = player.tileX + d.dx;
  const z = player.tileZ + d.dz;
  const room = here();

  if (room === ISLAND) {
    const house = houseAt(x, z);
    return house ? () => move(house, house.mat, 0) : null;
  }
  // out is off the bottom of the mat, which is the one edge that is not a wall
  const onMat = player.tileX === room.mat.x && player.tileZ === room.mat.z;
  return onMat && z > player.tileZ ? () => move(ISLAND, room.step, 2) : null;
}

/**
 * Go somewhere else. The camera is put down rather than flown, because places
 * are hundreds of tiles apart and a lerp across that gap would be a three second
 * shot of the sea.
 */
function move(place, to, facing) {
  goTo(place);
  player.placeAt(to.x, to.z);
  player.face(facing, YAW_INDEX);
  camTarget.copy(player.position);
  // Everyone we could see is in the place we just left, and everyone here has
  // not been told about us yet. The relay sorts both out from the room we name.
  for (const who of remotes.values()) who.remove(scene);
  remotes.clear();
  net.step(player.tileX, player.tileZ, player.facing, place.id);
}

const dialogue = new Dialogue(document.body, TOUCH
  ? { confirm: 'A', send: 'A', cancel: 'B' }
  : {});
const chat = new Chat({ net, dialogue });
const channel = new Channel({ net, hasCompany: () => net.online && remotes.size > 0 });
// The bag first, because it is the one that is always there — the chat's button
// comes and goes with the company, and a bar whose buttons reorder underneath
// you is a bar you have to look at every time. (It is built further up, where
// the story can be given it.)
const toolbar = new Toolbar([inventory, channel]);

/*
  Things lying about, and the one rule that keeps them honest: an item exists in
  exactly one place at a time. It is on a tile, or it is in the bag, and taking
  it is the move from one to the other.

  Placed where the island has already said they would be. Bram promises shells by
  the rocks when the tide is out and there is a rock on the south beach; Anoka
  cannot get through a conversation without mentioning the coconuts on the north
  shore; the flower comes off the beds by the fountain that Tula keeps telling
  you to come and look at. Putting them anywhere else would be furniture.
*/
const pickups = [
  // On the sand beside the palm at 30,7 — the one story.js already has to work
  // around when it frames the stars, and the north shore Anoka spends every
  // conversation telling you to walk out to.
  new Pickup(scene, 'coconut', { x: 31, z: 7 }),
  // South beach, near Bram but outside the four tiles he wanders, so he is not
  // forever pathing around it.
  new Pickup(scene, 'shell', { x: 23, z: 46 }),
  // The east column of the flower bed west of the fountain.
  new Pickup(scene, 'flower', { x: 20, z: 24 }),
  /*
    ...and the three Amy sends you for. Every one of them has to be somewhere,
    or she has asked for something that does not exist and the date she asked for
    it before can never happen — see DATE_NEEDS in dialogue-scripts.js.

    Placed where the thing itself would be rather than where it would be
    convenient. A loaf is outside the house it came out of, cooling; fruit is
    under a tree, because that is where fruit ends up; and the chocolate is along
    the tideline, which is the only way a bar of it gets to an island like this.
  */
  // On the path in front of the house with the long table, a tile off the step —
  // set out to cool, which is the one reason there is bread on a road.
  new Pickup(scene, 'bread', { x: 37, z: 19 }),
  // On the grass between the pair of trees on the north-east lawn.
  new Pickup(scene, 'fruit', { x: 41, z: 11 }),
  // South beach again, well east of Bram's four tiles so he is not walking round
  // it all day — and close enough to him that its note is obviously about him.
  new Pickup(scene, 'chocolate', { x: 34, z: 47 }),
];

/*
  One line, two homes. Everything said in the room is logged in the panel;
  something said face to face is *also* handed to the box, so it arrives the way
  a villager's line does, typed out under a name plate. Public talk is never
  given to the box — a room chatting should not stop you walking.

  Our own words come back from the relay rather than being echoed locally, so
  the `from === net.id` test is what keeps us from being told what we just said.
*/
net.onSay = (from, text, to) => {
  channel.add({ from, text, to, me: net.id });
  if (to !== null && from !== net.id) chat.receive(from, text);
};

// Villagers talk about the weather and the hour, so the box has to know both.
// Read at the moment a line opens rather than held, so a storm that arrives
// mid-conversation is in the next thing they say.
dialogue.context = () => ({
  weather: weather.kind,
  time: partOfDay((readDay() * 24 + 6) % 24),
});

// A line that is supposed to do something to the world says so, and this is
// where the box hands that over to whoever can. See dialogue.js.
dialogue.onCue = (cue) => story.cue(cue);
/*
  ...and a line where somebody holds something out. The bag can refuse — it has
  ten slots — and there is nothing sensible for a script to do about that, so it
  is dropped rather than reported: the line still reads, and the one thing that
  must not happen is a conversation stopping halfway because your hands are full.
*/
dialogue.onGive = (id) => inventory.add(id);
/*
  ...and the other direction: the box, opened by somebody who is not you.

  Every conversation in this game starts because you pressed Z at a person — see
  interact(), which does these same three things in the same order. The last one
  starts because Anoka walked over to you instead, and the only thing that
  differs is who decided. So it is the same box, the same name plate, the same
  `talking` flag. The story hands over a script and is told when it closes, and
  needs to know nothing else about the furniture.
*/
story.onSay = (who, script, done) => {
  who.talking = true;
  dialogue.start(script, () => {
    who.talking = false;
    done();
  });
};

/* ----------------------------------------------------------------- players */
// Everyone else in the room. They are told to us one step at a time and nothing
// else: no weather, no villagers, no world — all of that each machine already
// agrees on by computing it. See net.js.
const remotes = new Map();

net.onJoin = (p) => {
  if (p.id === net.id || remotes.has(p.id)) return;
  remotes.set(p.id, new RemotePlayer(scene, p));
};
net.onMove = (m, warp) => {
  const who = remotes.get(m.id);
  if (who) who.moveTo(m.x, m.z, m.f, warp);
  else if (m.id !== net.id) remotes.set(m.id, new RemotePlayer(scene, m));
};
net.onLeave = (id) => {
  remotes.get(id)?.remove(scene);
  remotes.delete(id);
};
net.onDrop = () => {
  for (const who of remotes.values()) who.remove(scene);
  remotes.clear();
};
// Two halves of arriving, and both matter. Read the room the relay handed us
// on connection — it has been waiting since before there was a scene to put
// anybody in — and then say where we are, rather than waiting for our first
// step. Either one skipped leaves somebody standing still and invisible.
const arrive = () => {
  for (const p of net.roster) net.onJoin(p);
  // The hour may have moved on without us while the tab was in the cache.
  if (net.rush) sim.hurry(net.rush);
  net.step(player.tileX, player.tileZ, player.facing, here().id);
};
arrive();
net.watchPage(arrive);
net.start();

// One mirrored render of the scene, shared by every puddle — they all lie on the
// same plane, so this costs a pass per frame rather than a pass per puddle, and
// only on the frames where the ground is wet at all.
const reflection = new PlanarReflection({ height: 0.012, scale: TOUCH ? 0.34 : 0.5 });
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
const UP = new THREE.Vector3(0, 1, 0);
const LOOK = 0.6;                     // how far above the tile the camera aims

/*
  ...and the one time in the game it is not locked.

  The lock above is not timidity, so breaking it wants a reason and this is the
  only one there is: she kisses you, the sky goes off, and holding the ordinary
  framing through that would be the game declining to notice its own ending.

  Authored as keyframes rather than as phases with easing between them, for the
  same reason the day cycle is — a shot is a series of framings, and the table
  is the shot. Reading down the `dist` column tells you what it does.

  Four things the numbers are actually solving, all of them learned by looking
  at it rather than worked out in advance:

  - The lens opens. The resting camera is a long lens, which is what makes the
    island read as a flat little toy — and it is the wrong lens entirely for
    standing two feet from somebody. It is also unable to hold the kiss and the
    sky in one frame at any distance close enough to be a close-up. Widening to
    the fifties buys back the sky, and the swap doubles as the reason the move
    feels like a move: a push-in on a widening lens is a different and much
    stronger thing than a dolly on a fixed one.

  - It comes back *out* while it goes round, and the timings are cut against the
    show rather than chosen for their own sake. The shells are authored to fill
    the sky from seventeen tiles back and sixteen up; from nine tiles away they
    are off the top of the frame at any lens worth having. So the close-up gets
    the *light* of the fireworks and not the fireworks — the one point light
    washing colour over two faces, which is the better half of it anyway — and
    the camera is already coming out by the time there is anything worth seeing.

    Which fixes when: the last shell goes up at 3.62s and dies at 5.12s (see
    PATTERN in fireworks.js), so the move is wide from 3.8 and stays wide
    through 5.4, and the whole thing is seven seconds rather than the nine it
    started as. Nine left the camera orbiting an empty sky for the last two.

  - `spin` is in turns and ends on exactly 1. A full circle lands back on the
    quarter turn it started from, so the handoff to the locked camera is not a
    handoff at all — the shot arrives where the camera lives and stops.
    Unwinding back the way it came would read as a rewind.

  - Nothing here can promise a clear line to the couple. It orbits through three
    different places, two of which have palms and undergrowth, and a spot picked
    to be clear from the resting angle is clear from exactly one angle. Rather
    than pretend otherwise, the wide half of the move is also the high half: at
    forty-odd degrees it is looking down over the foliage rather than through
    it, and what does pass through frame passes through the near edge of it and
    reads as parallax.

  `look` rises through the middle so the couple sit low with the sky above them,
  which is where the fireworks are.
*/
const KISS_CAM = [
  // seconds | tiles back | degrees up | tiles above them | lens | turns round
  { t: 0.0, dist: DISTANCE, pitch: 46, look: LOOK, fov: FOV, spin: 0.00 },
  { t: 1.2, dist: 9.5, pitch: 30, look: 1.30, fov: 48, spin: 0.10 },   // down onto the two of them
  { t: 2.2, dist: 10.2, pitch: 31, look: 1.50, fov: 50, spin: 0.20 },  // hold, while the sky flashes on them
  { t: 3.8, dist: 18.0, pitch: 42, look: 1.60, fov: 38, spin: 0.45 },  // out and around: the show arrives
  { t: 5.4, dist: 22.0, pitch: 45, look: 0.90, fov: 34, spin: 0.75 },  // wide, for the last of it
  { t: 7.0, dist: DISTANCE, pitch: 46, look: LOOK, fov: FOV, spin: 1.00 },
];
const KISS_TIME = KISS_CAM[KISS_CAM.length - 1].t;
const TURN = Math.PI * 2;
const smooth = (k) => k * k * (3 - 2 * k);

const kiss = { t: 0, running: false, at: new THREE.Vector3() };

/** Frame the two of them, and start. */
function startKissCam(a, b) {
  kiss.at.copy(a.position).add(b.position).multiplyScalar(0.5);
  kiss.t = 0;
  kiss.running = true;
}

/** Where the camera wants to be this frame, or null when it is just following. */
function kissCam(dt) {
  if (!kiss.running) return null;
  kiss.t += dt;
  if (kiss.t >= KISS_TIME) { kiss.running = false; return null; }

  let i = 0;
  while (i < KISS_CAM.length - 2 && kiss.t >= KISS_CAM[i + 1].t) i++;
  const a = KISS_CAM[i];
  const b = KISS_CAM[i + 1];
  const k = smooth((kiss.t - a.t) / (b.t - a.t));
  const mix = (key) => THREE.MathUtils.lerp(a[key], b[key], k);
  return {
    at: kiss.at,
    dist: mix('dist'),
    pitch: THREE.MathUtils.degToRad(mix('pitch')),
    look: mix('look'),
    fov: mix('fov'),
    yaw: mix('spin') * TURN,
  };
}

function updateCamera(dt) {
  const shot = kissCam(dt);
  const yaw = (YAW_INDEX * Math.PI) / 2 + (shot ? shot.yaw : 0);

  camOffset.set(
    0,
    Math.sin(shot ? shot.pitch : PITCH) * (shot ? shot.dist : DISTANCE),
    Math.cos(shot ? shot.pitch : PITCH) * (shot ? shot.dist : DISTANCE),
  );
  camOffset.applyAxisAngle(UP, yaw);

  // Following the player, or holding on the couple while the shot runs. The
  // same smoothing does both, and the way back is free: when the shot ends this
  // is already lerping at whoever it is now given, and the two points are half a
  // tile apart.
  camTarget.lerp(shot ? shot.at : player.position, 1 - Math.pow(0.0015, dt));
  camera.position.copy(camTarget).add(camOffset);
  camera.lookAt(camTarget.x, camTarget.y + (shot ? shot.look : LOOK), camTarget.z);

  // Only touched while the shot runs, and put back by its last keyframe.
  const fov = shot ? shot.fov : FOV;
  if (camera.fov !== fov) { camera.fov = fov; camera.updateProjectionMatrix(); }

  // Everything that turns to face the camera reads these. The angle is exact so
  // the slabs stay square to the lens; the quarter turn is rounded, because it
  // picks between four bitmaps and there is no fifth. See character.js.
  view.yaw = yaw;
  view.spin = Math.round((yaw - (YAW_INDEX * Math.PI) / 2) / (Math.PI / 2));

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
let dayShift = 0;                     // setDay() only moves this
let dayT = DAY_PHASE;
const readDay = () => (dayAt(sim.time) + dayShift + 1) % 1;

const TALK_KEYS = new Set(['KeyZ', 'KeyE', 'Enter', 'Space']);

/**
 * Every press the game understands, whoever sent it. The on-screen controls
 * synthesise codes and post them here rather than reaching for interact() and
 * step() themselves, so a rule written once — a conversation swallowing
 * movement, say — holds for a keyboard and a thumb alike.
 *
 * @returns whether the press was the game's, and so should not also be the
 *          browser's. Only a real key event has anything to preventDefault.
 */
function keyDown(code) {
  // Typing in the panel is not playing. Its field stops keys reaching here at
  // all, so this only catches the gap between clicking it and the first press.
  if (toolbar.typing) return false;
  // A conversation swallows input: arrow keys drive the choice cursor, not the
  // hero, and nothing walks off mid-sentence.
  if (dialogue.active) {
    held.clear();
    return dialogue.key(code);
  }
  // Nor is watching. A scene is playing — she is walking out of a door, or off
  // down the sand — and it is hers until it is over. Swallowed rather than
  // ignored, so nothing is left held down to fire the moment control comes back.
  if (story.busy) {
    held.clear();
    return true;
  }
  if (TALK_KEYS.has(code)) {
    interact();
    return true;
  }
  if (code in KEYMAP) {
    held.add(KEYMAP[code]);
    return true;
  }
  return false;
}

function keyUp(code) {
  if (code in KEYMAP) held.delete(KEYMAP[code]);
}

addEventListener('keydown', (e) => { if (keyDown(e.code)) e.preventDefault(); });
addEventListener('keyup', (e) => keyUp(e.code));

// A and B are Enter and Escape because those already mean the right thing in
// both states the box can be in — Enter confirms a villager's line and sends a
// written one, Escape closes either — so the buttons need no idea which is up.
const touch = TOUCH ? new TouchControls({ onKey: keyDown, onKeyUp: keyUp }) : null;

// Desktop only. A phone has neither the corner to spare nor the problem —
// its screen is the size of the thing it would be helping you look at.
const minimap = TOUCH ? null : new Minimap();

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
  // A thing on the ground holds its tile the same way a person does, so it
  // arrives here through the same lookup — see pickup.js. Tested before the
  // peer check because a Pickup has no `id` and would otherwise fall through to
  // nothing at all.
  if (who instanceof Pickup) return { verb: 'take', pickup: who };
  // Somebody real. They get the same verb as a villager — from where the player
  // is standing there is no difference worth advertising.
  if (who?.id != null) return { verb: 'talk', peer: who };
  if (tileAt(x, z) === 's') return { verb: 'read', sign: `${x},${z}` };
  return null;
}

function interact() {
  if (story.busy) return;
  const target = facing();
  if (!target) return;
  if (target.peer) {
    chat.talkTo(target.peer.id);
  } else if (target.npc) {
    const npc = target.npc;
    npc.talking = true;
    // How it ended, and where it ended, for anybody whose next conversation
    // depends on this one. A villager has no onDone and never notices.
    dialogue.start(scriptOf(npc), (why, ending) => {
      npc.talking = false;
      npc.onDone?.(why, ending);
    });
  } else if (target.pickup) {
    /*
      Picking something up says so in the same box a sign does, and for the same
      reason: it is the game telling you something rather than a person, so it
      gets no name plate. The toast above the bar is the other half of it — that
      one is for when your eyes are somewhere else entirely.

      A full bag refuses, and *says* it refuses, and the item stays exactly where
      it was. Silently declining to pick something up is the kind of bug people
      spend twenty minutes on.
    */
    const item = itemOf(target.pickup.id);
    if (!inventory.add(target.pickup.id)) {
      dialogue.start(message(`You are carrying too much already to pick up the ${item.name.toLowerCase()}.`));
    } else {
      target.pickup.take();
      dialogue.start(message(`You pick up the ${item.name.toLowerCase()}.`));
    }
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
  const indoors = here() !== ISLAND;
  weather.update(player.position);
  puddles.wet.value = weather.wet;
  applyTimeOfDay(dayT);

  /*
    Indoors the world is the floor and the dark around it. The sun still lights
    the room and a storm still dims it — the hour and the weather are as true in
    here as out there — but the sky, the horizon and the rain belong to outside,
    and the roof is the thing that says so.
  */
  scene.fog.near = indoors ? 60 : scene.fog.near;
  scene.fog.far = indoors ? 200 : scene.fog.far;
  if (indoors) scene.background.setHex(0x2a2f38);
  weather.rainField.mesh.visible = !indoors;
  weather.gusts.mesh.visible = !indoors;
  for (const house of HOUSES) house.group.visible = indoors && here() === house;

  /*
    A step that would take you through a door goes through it instead. Checked
    before the step rather than after, so you never stand in the doorway — the
    move and the arrival are the same move.
  */
  /*
    A step that would take you through a door goes through it instead. Taken
    before the step rather than after, so nobody ever stands in a doorway — the
    move and the arrival are the same move.
  */
  /*
    ...and nobody walks during the kiss either. Input is in screen space and is
    rotated into the world by the camera's quarter turn — which is a constant,
    and during the shot it is a lie. Pressing up halfway round the orbit would
    send you off in whatever direction up used to mean, so the answer is not to
    make the mapping continuous but to not be taking input at all. It is a
    cutscene; she has just kissed you.
  */
  const dir = dialogue.active || toolbar.typing || story.busy || kiss.running
    ? -1 : inputDirection();
  const through = dir >= 0 && !player.moving ? doorway(dir) : null;
  if (through) through();

  const walked = player.stepCount;
  player.update(dt, through ? -1 : dir, YAW_INDEX);
  // One message per step taken, sent as the step begins so everyone else walks
  // it at the same moment we do. Standing still costs nothing.
  if (player.stepCount !== walked) net.step(player.tileX, player.tileZ, player.facing, here().id);

  /*
    Somebody only looks up at you if you are in the same place they are.

    This used to be "nobody looks at you while you are indoors", which was right
    for as long as every villager was outdoors: a room has no villagers in it, so
    there was nobody in here to do the looking. Now that there is, the test has
    to be the one that was always meant — the room, not the roof. inBounds() asks
    it of wherever we currently are, and three hundred tiles of empty coordinate
    space between the places is what makes that answer free.
  */
  for (const npc of npcs) {
    npc.update(dt, YAW_INDEX, inBounds(npc.tileX, npc.tileZ) ? player : null);
  }
  for (const who of remotes.values()) who.update(dt, YAW_INDEX);
  // After the villagers, so a scene that ends on the step she has just finished
  // taking ends on the frame she finished it, not the one after.
  story.update(dt);
  fireworks.update(dt);
  dialogue.update(dt);
  // Anything said to us while the box was busy has been queued rather than
  // thrown on screen over the top of whatever was there; this is where it lands.
  chat.drain();
  toolbar.update();
  dialogue.showHint(!dialogue.active && !story.busy && !kiss.running && facing()?.verb);
  touch?.showBack(dialogue.active);
  if (minimap) minimap.el.root.hidden = indoors;
  if (!indoors) minimap?.update(player, remotes, npcs, net.id);
  updateCamera(dt);
  for (const p of pickups) p.update(t);
  for (const fn of animated) fn(t);

  const hours = (dayT * 24 + 6) % 24;
  hud.textContent = `${String(Math.floor(hours)).padStart(2, '0')}:${String(Math.floor((hours % 1) * 60)).padStart(2, '0')}`;
  // The puddles cannot be in their own reflection, and neither the rain nor the
  // swooshes belong in it — they are in front of the water, not above it.
  if (!indoors && puddles.mesh && weather.wet > 0.02) {
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

/*
  Why you are here, before you are here.

  Opened after the first frame rather than before it, so the box comes up over
  an island that is already drawn and lit — a wall of text on a blank canvas
  reads as a loading screen, and this is meant to read as the moment you step
  off the boat.

  It needs no input lock of its own. An open box already swallows movement and
  the talk key, and Escape already closes one — so somebody who has read it
  twice can skip it with the key that means "leave this alone" everywhere else
  in the game.
*/
dialogue.start(OPENING);

// convenience for poking at the scene from devtools; setDay(0.75) jumps to night
Object.assign(window, {
  THREE, scene, camera, renderer, player, npcs, dialogue, MAP_W, MAP_H,
  setDay: (t) => {
    dayShift = (t - sim.time / DAY_LENGTH - DAY_PHASE) % 1;
    dayT = readDay();
    applyTimeOfDay(dayT);
  },
  setWeather: (type) => weather.force(type),
  opening: () => dialogue.start(OPENING),
  reflection, puddles, sim, net, remotes, chat, channel, toolbar, touch, minimap,
  here, ISLAND, HOUSES, doorway,
  weather, story, fireworks,
  // The kiss shot, for tuning it: `kiss.t` is the second of it you are looking
  // at, so pinning that in a loop holds the camera on one frame of the move.
  kiss, startKissCam, KISS_CAM, camTarget, view,
});
