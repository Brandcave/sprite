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

    .  floor        b  bed        t  table
    v  television   p  plant      D  the doormat you arrive on and leave by
*/

const ROOM = [
  'bb...tttt',
  'bb.......',
  '.........',
  '..v....p.',
  '.........',
  '....D....',
];

const SOLID = new Set(['b', 't', 'v', 'p']);

// Everything is a box or two. The reference is blocky and so is this world, so
// there is nothing here a box cannot say.
const FURNITURE = {
  b: [{ h: 0.42, colour: PALETTE.c }, { h: 0.10, y: 0.42, colour: PALETTE.m, inset: 0.08 }],
  t: [{ h: 0.62, colour: PALETTE.y }, { h: 0.06, y: 0.62, colour: PALETTE.o, inset: -0.04 }],
  v: [{ h: 0.34, colour: PALETTE.e }, { h: 0.46, y: 0.34, colour: PALETTE.K, inset: 0.1, face: PALETTE.w }],
  p: [{ h: 0.24, colour: PALETTE.o, inset: 0.24 }, { h: 0.44, y: 0.24, colour: PALETTE.G, inset: 0.12 }],
};

export const ROOM_W = ROOM[0].length;
export const ROOM_H = ROOM.length;

/** Where the mat is, in room coordinates — you arrive here and leave from here. */
const MAT = (() => {
  for (let z = 0; z < ROOM_H; z++) {
    const x = ROOM[z].indexOf('D');
    if (x >= 0) return { x, z };
  }
  throw new Error('a room with no way out');
})();

/**
 * Build one room and hand back the place it is — see place.js. `id` picks its
 * pitch in the shared coordinate space; nothing is ever built where anything
 * else is, so occupancy, positions and the scene graph stay one flat set of
 * books.
 */
export function buildInterior(scene, id, { door, step }) {
  const x0 = 300 + (id - 1) * 40;
  const z0 = 300;

  const group = new THREE.Group();

  // the floor, one slab with the tile repeated across it
  const tex = bitmapTexture(TILES.floor, { repeat: 1 });
  tex.repeat.set(ROOM_W, ROOM_H);
  const floor = new THREE.Mesh(
    new THREE.BoxGeometry(ROOM_W, 0.3, ROOM_H),
    new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 }),
  );
  floor.position.set(x0 + ROOM_W / 2, -0.15, z0 + ROOM_H / 2);
  floor.receiveShadow = true;
  group.add(floor);

  for (let z = 0; z < ROOM_H; z++) {
    for (let x = 0; x < ROOM_W; x++) {
      const parts = FURNITURE[ROOM[z][x]];
      if (!parts) continue;
      for (const { h, y = 0, colour, inset = 0.06, face } of parts) {
        const box = new THREE.Mesh(
          new THREE.BoxGeometry(1 - inset * 2, h, 1 - inset * 2),
          new THREE.MeshStandardMaterial({ color: new THREE.Color(colour), roughness: 0.85 }),
        );
        box.position.set(x0 + x + 0.5, y + h / 2, z0 + z + 0.5);
        box.castShadow = box.receiveShadow = true;
        group.add(box);

        // a screen, for the one piece of furniture that has one
        if (face) {
          const screen = new THREE.Mesh(
            new THREE.PlaneGeometry(0.52, h * 0.55),
            new THREE.MeshStandardMaterial({
              color: new THREE.Color(face),
              emissive: new THREE.Color(face),
              emissiveIntensity: 0.5,
              roughness: 0.6,
            }),
          );
          screen.position.set(x0 + x + 0.5, y + h * 0.58, z0 + z + 1 - inset + 0.001);
          group.add(screen);
        }
      }
    }
  }

  scene.add(group);

  return {
    id,
    x0, z0, w: ROOM_W, h: ROOM_H,
    group,
    /** Out through the bottom of the room, back onto the step outside. */
    mat: { x: x0 + MAT.x, z: z0 + MAT.z },
    door,                        // the tile you walk into from the path
    step,                        // and the one you are put back down on
    isBlocked: (x, z) => {
      const row = ROOM[z - z0];
      return !row || SOLID.has(row[x - x0]);
    },
    groundHeight: () => 0,
  };
}
