import { HERO, VILLAGERS } from './art.js';
import { Character } from './character.js';

/*
  Somebody else, walking about.

  A third kind of Character: the hero is driven by input, a villager by the
  clock, and this one by the wire. It inherits the same stepping and the same
  0.19-second cadence, which is what makes remote players look right without any
  prediction or smoothing — because movement is grid-locked and time-boxed by
  design, replaying someone's step *is* the animation. There is nothing to
  interpolate and nothing to correct.

  Remote players claim no tiles. Under any latency at all, two people can decide
  to walk into the same square at the same moment, and a shared occupancy map
  would turn that into a phantom wall for whoever's packet arrived second.
  Walking through each other is the friendlier bargain, and it is the one nearly
  every game of this shape makes.
*/

const SKINS = [HERO, VILLAGERS.straw, VILLAGERS.weaver];

export class RemotePlayer extends Character {
  constructor(scene, { id, x, z, f = 2, skin = 0 }) {
    super(scene, SKINS[skin % SKINS.length], x, z, { ghost: true });
    this.id = id;
    this.isPlayer = true;        // villagers ignore us, as they do the local hero
    this.facing = f;
    this.sync();
  }

  /**
   * They moved. If it is the next tile along, walk it — that plays out over the
   * same fifth of a second their own machine is playing it over. If it is
   * further than that, they were asleep in a background tab and have come back:
   * put them where they are rather than skating them across the island.
   */
  moveTo(x, z, facing, warp = false) {
    this.facing = facing;
    const far = Math.abs(x - this.tileX) + Math.abs(z - this.tileZ) > 1;
    if (warp || far) {
      this.tileX = this.fromX = x;
      this.tileZ = this.fromZ = z;
      this.moveT = 1;
      this.sync();
      return;
    }
    this.fromX = this.tileX;
    this.fromZ = this.tileZ;
    this.tileX = x;
    this.tileZ = z;
    this.moveT = 0;
    this.stepCount++;
  }

  update(dt, cameraYawIndex) {
    this.tick(dt);
    this.pivot.rotation.y = (cameraYawIndex * Math.PI) / 2;
  }

  remove(scene) {
    scene.remove(this.group);
    this.group.traverse((o) => {
      if (o.isMesh && o.geometry) o.geometry.dispose();
    });
  }
}
