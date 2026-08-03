import * as THREE from 'three';
import { HERO } from './art.js';
import { voxelGeometry, voxelMaterial, vertexEmissive } from './voxel.js';
import { isBlocked, groundHeight, MAP_W, MAP_H } from './world.js';

const SCALE = 1.35;                 // sprite height in tiles
const STEP_TIME = 0.19;             // seconds per tile — GB walk cadence
const DIRS = [
  { name: 'up', dx: 0, dz: -1 },
  { name: 'right', dx: 1, dz: 0 },
  { name: 'down', dx: 0, dz: 1 },
  { name: 'left', dx: -1, dz: 0 },
];

export class Player {
  constructor(scene, tileX, tileZ) {
    this.group = new THREE.Group();
    this.pivot = new THREE.Group();   // billboards toward the camera
    this.group.add(this.pivot);
    scene.add(this.group);

    this.tileX = tileX;
    this.tileZ = tileZ;
    this.fromX = tileX;
    this.fromZ = tileZ;
    this.moveT = 1;
    this.facing = 2;                  // index into DIRS, in screen space
    this.frame = 0;
    this.stepCount = 0;

    // The sun deliberately sits behind the world, which leaves a camera-facing
    // billboard almost entirely backlit. Rather than flood the scene with fill
    // light (that would wash out the raking shadows), give the hero alone a
    // self-lit floor tinted by its own pixels: emissive * vColor. The sprite
    // keeps its palette and stays readable no matter which way the sun points.
    const mat = vertexEmissive(voxelMaterial({ roughness: 0.9 }));
    this.material = mat;
    this.frames = {};
    for (const dir of ['down', 'up', 'left', 'right']) {
      this.frames[dir] = HERO[dir].map((rows) => {
        // every facing has its own bitmap now, so nothing gets flipped here
        const geo = voxelGeometry(rows, { pixel: SCALE / 16, depth: 3 });
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
      new THREE.CircleGeometry(0.34, 20),
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

  /** @param inputDir world-space direction index, or -1 for idle */
  update(dt, inputDir, cameraYawIndex) {
    if (!this.moving && inputDir >= 0) {
      const d = DIRS[inputDir];
      this.facing = (inputDir - cameraYawIndex + 8) % 4;
      const nx = this.tileX + d.dx;
      const nz = this.tileZ + d.dz;
      if (nx >= 0 && nz >= 0 && nx < MAP_W && nz < MAP_H && !isBlocked(nx, nz)) {
        this.fromX = this.tileX;
        this.fromZ = this.tileZ;
        this.tileX = nx;
        this.tileZ = nz;
        this.moveT = 0;
        this.stepCount++;
      } else {
        // bumped a wall: still turn, and tick the frame so it reads as a nudge
        this.frame = (this.stepCount + Math.floor(performance.now() / 160)) % 2;
      }
    }

    if (this.moving) {
      this.moveT = Math.min(1, this.moveT + dt / STEP_TIME);
      this.frame = this.moveT < 0.5 ? this.stepCount % 2 : (this.stepCount + 1) % 2;
    } else {
      this.frame = 0;
    }

    this.sync();
    this.pivot.rotation.y = (cameraYawIndex * Math.PI) / 2;
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
    this.blob.position.y = y === 0 ? 0.02 : 0.02;

    const dirName = ['up', 'right', 'down', 'left'][this.facing];
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

export { DIRS };
