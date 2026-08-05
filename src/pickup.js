import * as THREE from 'three';
import { itemOf } from './items.js';
import { voxelGeometry, voxelMaterial, vertexEmissive } from './voxel.js';
import { occupy, vacate, view } from './character.js';
import { groundHeight } from './place.js';

/*
  A thing lying on a tile, waiting to be picked up.

  It is the same bitmap the bag draws, extruded — so what you walk up to and
  what ends up in the slot are one drawing, and there is no way for them to
  drift apart. It billboards to the camera for the same reason a villager does:
  it is a slab three voxels thick, and the camera goes round during the kiss.

  It holds its tile, which is the decision worth explaining. Not holding it and
  picking things up by walking over them was the alternative, and it is wrong
  for this game: everything else here is "stand in front of it and press Z" —
  signs, villagers, doors — and an item you collect by treading on it is a
  different verb the player has to be taught. Holding the tile means it is
  simply another thing you can be facing, and facing() finds it the same way it
  finds anybody else.

  It also means villagers path around it rather than through it, which is free:
  they already avoid occupied squares, and none of them has to know what a
  coconut is.
*/

/** How far it lifts and settles, and how long a full breath takes. */
const BOB = 0.055;
const PERIOD = 2.6;
/** Sprite height in tiles — smaller than a person, and by a lot. */
const SCALE = 0.62;

export class Pickup {
  /**
   * @param at the tile it sits on. It stays there; nothing here ever moves,
   *           which is why the tile is claimed once and the position is set once.
   */
  constructor(scene, id, { x, z }) {
    this.id = id;
    this.tileX = x;
    this.tileZ = z;
    this.taken = false;

    const item = itemOf(id);
    this.group = new THREE.Group();
    this.pivot = new THREE.Group();
    this.group.add(this.pivot);

    // Its own material, like a Character's, so it can be faded or tinted later
    // without every other item on the island going with it.
    const mat = vertexEmissive(voxelMaterial({ roughness: 0.9 }));
    this.material = mat;
    const mesh = new THREE.Mesh(
      voxelGeometry(item.art, { pixel: SCALE / 16, depth: 3 }),
      mat,
    );
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.pivot.add(mesh);

    this.group.position.set(x + 0.5, groundHeight(x, z), z + 0.5);
    scene.add(this.group);
    this.scene = scene;

    // A phase per tile, so two things lying near each other do not rise and fall
    // in lockstep and read as one mechanism.
    this.phase = (x * 0.7 + z * 1.3) % PERIOD;

    occupy(x, z, this);
  }

  update(t) {
    if (this.taken) return;
    const k = (t + this.phase) * ((Math.PI * 2) / PERIOD);
    this.pivot.position.y = BOB * (1 + Math.sin(k)) * 0.5 + 0.06;
    this.pivot.rotation.y = view.yaw;
  }

  /** Off the tile, out of the scene, and gone. */
  take() {
    if (this.taken) return null;
    this.taken = true;
    vacate(this.tileX, this.tileZ, this);
    this.scene.remove(this.group);
    this.material.dispose();
    for (const m of this.pivot.children) m.geometry.dispose();
    return this.id;
  }
}
