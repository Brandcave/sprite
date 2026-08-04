import * as THREE from 'three';
import { TILES, PALETTE } from './art.js';
import { bitmapTexture } from './voxel.js';

/*
  The inside of a house: a lit floor with furniture on it, and dark everywhere
  else.

  There are no walls, and that is the look rather than an omission — the floor
  simply ends, the room hangs in the dark, and the camera keeps the quarter turn
  it has outside. It reads as an interior because of what is on the floor and
  what is missing around it, which is cheaper and better than four walls the
  camera would spend its whole time looking through.

  Rooms are laid out hundreds of tiles from the island and from each other, so
  every place in the world shares one flat coordinate space — see place.js for
  why that is worth more than it looks. It also means the sun that lights the
  island lights these too; what makes them read as indoors is that the fog and
  the sky are taken away while you are in one.

    .  floor        b  bed        t  table    h  chair
    v  television   p  plant      T  the table tile the bowl sits on
    D  the doormat you arrive on and leave by

  With no walls there is also no door to see, so the mat is drawn — a rug, in
  the one loud colour indoors. Standing on it and walking down puts you back
  outside, and now you can tell which tile that is without walking the room.
*/

const ROOMS = [
  // A bedroom: bed in the corner, counter along the top, telly and a plant.
  [
    'bb...tttt',
    'bb.......',
    '.........',
    '..v....p.',
    '.........',
    '....D....',
  ],
  // A dining room, which is what most of these houses are: one big table with
  // chairs down both long sides and a bowl left out in the middle of it.
  [
    '..hTtth..',
    '..httth..',
    '.........',
    'p.......p',
    '.........',
    '....D....',
  ],
];

const SOLID = new Set(['b', 't', 'T', 'v', 'p', 'h']);

// Everything is a box or two. The reference is blocky and so is this world, so
// there is nothing here a box cannot say.
const TABLE = [
  { h: 0.62, colour: PALETTE.y },
  { h: 0.06, y: 0.62, colour: PALETTE.o, inset: -0.04 },
];
const FURNITURE = {
  b: [{ h: 0.42, colour: PALETTE.c }, { h: 0.10, y: 0.42, colour: PALETTE.m, inset: 0.08 }],
  t: TABLE,
  // the same table, with something left out on it
  T: [...TABLE, { h: 0.10, y: 0.68, colour: PALETTE.E, inset: 0.34 }],
  // low, dark, and a pale seat so a row of them does not read as one dark bar
  h: [{ h: 0.30, colour: PALETTE.K, inset: 0.16 }, { h: 0.06, y: 0.30, colour: PALETTE.m, inset: 0.2 }],
  v: [{ h: 0.34, colour: PALETTE.e }, { h: 0.46, y: 0.34, colour: PALETTE.K, inset: 0.1, face: PALETTE.w }],
  p: [{ h: 0.24, colour: PALETTE.o, inset: 0.24 }, { h: 0.44, y: 0.24, colour: PALETTE.G, inset: 0.12 }],
};

/** Where the mat is, in room coordinates — you arrive here and leave from here. */
function matOf(room) {
  for (let z = 0; z < room.length; z++) {
    const x = room[z].indexOf('D');
    if (x >= 0) return { x, z };
  }
  throw new Error('a room with no way out');
}

/**
 * Build one room and hand back the place it is — see place.js. `id` picks its
 * pitch in the shared coordinate space and which of the layouts above it is;
 * nothing is ever built where anything else is, so occupancy, positions and the
 * scene graph stay one flat set of books.
 */
export function buildInterior(scene, id, { door, step }) {
  const room = ROOMS[(id - 1) % ROOMS.length];
  const w = room[0].length;
  const h = room.length;
  const x0 = 300 + (id - 1) * 40;
  const z0 = 300;

  const group = new THREE.Group();

  // the floor, one slab with the tile repeated across it
  const tex = bitmapTexture(TILES.floor, { repeat: 1 });
  tex.repeat.set(w, h);
  const floor = new THREE.Mesh(
    new THREE.BoxGeometry(w, 0.3, h),
    new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 }),
  );
  floor.position.set(x0 + w / 2, -0.15, z0 + h / 2);
  floor.receiveShadow = true;
  group.add(floor);

  const mat = matOf(room);

  // The rug, laid flat on the floor a hair above it. A plane rather than a slab
  // because nothing ever stands on it — you only ever stand *on top of* it. It
  // is two tiles wide and one deep so that it still shows either side of whoever
  // is stood on it, which is exactly when you most want to see where the door is.
  const rug = new THREE.Mesh(
    new THREE.PlaneGeometry(2, 1),
    new THREE.MeshStandardMaterial({ map: bitmapTexture(TILES.rug, { repeat: 1 }), roughness: 0.95 }),
  );
  rug.rotation.x = -Math.PI / 2;
  rug.position.set(x0 + mat.x + 0.5, 0.015, z0 + mat.z + 0.5);
  rug.receiveShadow = true;
  group.add(rug);

  for (let z = 0; z < h; z++) {
    for (let x = 0; x < w; x++) {
      const parts = FURNITURE[room[z][x]];
      if (!parts) continue;
      for (const { h: ph, y = 0, colour, inset = 0.06, face } of parts) {
        const box = new THREE.Mesh(
          new THREE.BoxGeometry(1 - inset * 2, ph, 1 - inset * 2),
          new THREE.MeshStandardMaterial({ color: new THREE.Color(colour), roughness: 0.85 }),
        );
        box.position.set(x0 + x + 0.5, y + ph / 2, z0 + z + 0.5);
        box.castShadow = box.receiveShadow = true;
        group.add(box);

        // a screen, for the one piece of furniture that has one
        if (face) {
          const screen = new THREE.Mesh(
            new THREE.PlaneGeometry(0.52, ph * 0.55),
            new THREE.MeshStandardMaterial({
              color: new THREE.Color(face),
              emissive: new THREE.Color(face),
              emissiveIntensity: 0.5,
              roughness: 0.6,
            }),
          );
          screen.position.set(x0 + x + 0.5, y + ph * 0.58, z0 + z + 1 - inset + 0.001);
          group.add(screen);
        }
      }
    }
  }

  scene.add(group);

  return {
    id,
    x0, z0, w, h,
    group,
    /** Out through the bottom of the room, back onto the step outside. */
    mat: { x: x0 + mat.x, z: z0 + mat.z },
    door,                        // the tile you walk into from the path
    step,                        // and the one you are put back down on
    isBlocked: (x, z) => {
      const row = room[z - z0];
      return !row || SOLID.has(row[x - x0]);
    },
    groundHeight: () => 0,
  };
}
