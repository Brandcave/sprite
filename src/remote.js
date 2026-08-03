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

  They hold their tile like anyone else: you cannot stand where somebody else is
  standing. The blocking is each client's own — nobody asks the server for
  permission to step — which keeps walking instant, at the cost of one honest
  edge case. Two people who step into the same square within a round trip of
  each other will both succeed and overlap for a moment, because neither had
  been told about the other yet. It resolves itself: from the instant the
  messages land, neither can step into the other again, and the square empties
  as soon as one of them walks on.

  The alternative is asking the server to arbitrate every step, which is
  correct, and which makes every step wait a round trip or snap back afterwards.
  Not worth it to win a tie nobody is trying to win.
*/

const SKINS = [HERO, VILLAGERS.straw, VILLAGERS.weaver];

export class RemotePlayer extends Character {
  constructor(scene, { id, x, z, f = 2, skin = 0 }) {
    super(scene, SKINS[skin % SKINS.length], x, z);
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
    if (warp || far) this.placeAt(x, z);
    else this.walkInto(x, z);
  }

  update(dt, cameraYawIndex) {
    this.tick(dt);
    this.pivot.rotation.y = (cameraYawIndex * Math.PI) / 2;
  }

  remove(scene) {
    this.dispose();                // hand back the tile they were standing on
    scene.remove(this.group);
    this.group.traverse((o) => {
      if (o.isMesh && o.geometry) o.geometry.dispose();
    });
  }
}
