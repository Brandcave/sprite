import * as THREE from 'three';
import { voxelGeometry, voxelMaterial, vertexEmissive } from './voxel.js';
import { isBlocked, groundHeight, MAP_W, MAP_H } from './world.js';

/*
  Everything a tile-stepping character needs: the eight billboarded sprite
  meshes, the walk cadence, tile collision and the contact shadow. The hero and
  the NPCs differ only in who decides the next step — input for one, a timer for
  the other — so that decision is all the subclasses own.
*/

export const DIRS = [
  { name: 'up', dx: 0, dz: -1 },
  { name: 'right', dx: 1, dz: 0 },
  { name: 'down', dx: 0, dz: 1 },
  { name: 'left', dx: -1, dz: 0 },
];

const FACING_NAMES = ['up', 'right', 'down', 'left'];

// Tiles claimed by a character. A walker claims its destination the moment it
// starts moving, so two characters can never converge on the same tile — and
// the player cannot walk through an NPC, which is what makes it feel present.
const occupied = new Map();
const keyOf = (x, z) => x * 4096 + z;

export function tileOccupied(x, z, ignore = null) {
  const who = occupied.get(keyOf(x, z));
  return who !== undefined && who !== ignore;
}

/** Whoever is standing on (or walking into) that tile. */
export function characterAt(x, z) {
  return occupied.get(keyOf(x, z)) ?? null;
}

export class Character {
  constructor(scene, sprites, tileX, tileZ, {
    scale = 1.35,             // sprite height in tiles
    stepTime = 0.19,          // seconds per tile — GB walk cadence
    shadow = 0.34,
  } = {}) {
    this.group = new THREE.Group();
    this.pivot = new THREE.Group();   // billboards toward the camera
    this.group.add(this.pivot);
    scene.add(this.group);

    this.stepTime = stepTime;
    this.tileX = tileX;
    this.tileZ = tileZ;
    this.fromX = tileX;
    this.fromZ = tileZ;
    this.moveT = 1;
    this.facing = 2;                  // index into FACING_NAMES, in screen space
    this.frame = 0;
    this.stepCount = 0;
    occupied.set(keyOf(tileX, tileZ), this);

    // The sun deliberately sits behind the world, which leaves a camera-facing
    // billboard almost entirely backlit. Rather than flood the scene with fill
    // light (that would wash out the raking shadows), give characters a self-lit
    // floor tinted by their own pixels: emissive * vColor. The sprite keeps its
    // palette and stays readable no matter which way the sun points.
    const mat = vertexEmissive(voxelMaterial({ roughness: 0.9 }));
    this.material = mat;
    this.frames = {};
    for (const dir of FACING_NAMES) {
      this.frames[dir] = sprites[dir].map((rows) => {
        // every facing has its own bitmap, so nothing gets flipped here
        const geo = voxelGeometry(rows, { pixel: scale / 16, depth: 3 });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.visible = false;
        this.pivot.add(mesh);
        return mesh;
      });
    }

    // soft contact shadow so the sprite never looks like it is floating
    const blob = new THREE.Mesh(
      new THREE.CircleGeometry(shadow, 20),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.22, depthWrite: false }),
    );
    blob.rotation.x = -Math.PI / 2;
    blob.position.y = 0.02;
    this.group.add(blob);
    this.blob = blob;

    this.sync();
  }

  get moving() {
    return this.moveT < 1;
  }

  /** Can this character stand on that tile right now? */
  walkable(x, z) {
    return x >= 0 && z >= 0 && x < MAP_W && z < MAP_H
      && !isBlocked(x, z) && !tileOccupied(x, z, this);
  }

  /**
   * Turn to face `worldDir` and, if the tile ahead is free, start walking into
   * it. Returns whether the step was taken — a refused step still turns, which
   * is what makes bumping a wall read as a nudge rather than a freeze.
   */
  step(worldDir, cameraYawIndex) {
    this.face(worldDir, cameraYawIndex);
    const d = DIRS[worldDir];
    const nx = this.tileX + d.dx;
    const nz = this.tileZ + d.dz;
    if (!this.walkable(nx, nz)) return false;

    occupied.delete(keyOf(this.tileX, this.tileZ));
    this.fromX = this.tileX;
    this.fromZ = this.tileZ;
    this.tileX = nx;
    this.tileZ = nz;
    occupied.set(keyOf(nx, nz), this);   // claim the destination up front
    this.moveT = 0;
    this.stepCount++;
    return true;
  }

  /** Point the sprite along a world-space direction, in screen space. */
  face(worldDir, cameraYawIndex) {
    this.facing = (worldDir - cameraYawIndex + 8) % 4;
  }

  /** Advance the walk interpolation and pick the walk frame. */
  tick(dt) {
    if (this.moving) {
      this.moveT = Math.min(1, this.moveT + dt / this.stepTime);
      this.frame = this.moveT < 0.5 ? this.stepCount % 2 : (this.stepCount + 1) % 2;
    } else {
      this.frame = 0;
    }
    this.sync();
  }

  sync() {
    const t = this.moveT;
    const x = THREE.MathUtils.lerp(this.fromX, this.tileX, t) + 0.5;
    const z = THREE.MathUtils.lerp(this.fromZ, this.tileZ, t) + 0.5;
    const y = THREE.MathUtils.lerp(
      groundHeight(this.fromX, this.fromZ),
      groundHeight(this.tileX, this.tileZ),
      t,
    );
    // small hop through the middle of a step — sells the sprite as a solid body
    const hop = this.moving ? Math.sin(t * Math.PI) * 0.045 : 0;
    this.group.position.set(x, y, z);
    this.pivot.position.y = hop;

    const dirName = FACING_NAMES[this.facing];
    for (const key of Object.keys(this.frames)) {
      this.frames[key][0].visible = false;
      this.frames[key][1].visible = false;
    }
    this.frames[dirName][this.frame].visible = true;
  }

  get position() {
    return this.group.position;
  }
}
