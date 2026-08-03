import { NPC } from './art.js';
import { Character, DIRS } from './character.js';

/*
  A villager who potters around a home tile and stops to look at you when you
  get close. That is the whole behaviour, and it is deliberately small: the
  point of an NPC at this scale is that the world is not empty, so what matters
  is that it never wanders off the map, never walks into the sea, and always
  turns to face the player instead of ignoring them.
*/

const NOTICE = 3;                 // tiles — inside this, the villager watches you

export class Npc extends Character {
  constructor(scene, tileX, tileZ, { roam = 3, pause = [1.2, 3.4], script = null } = {}) {
    // a slightly slower cadence than the hero, so the player reads as the quick one
    super(scene, NPC, tileX, tileZ, { stepTime: 0.26 });
    this.homeX = tileX;
    this.homeZ = tileZ;
    this.roam = roam;
    this.pauseRange = pause;
    this.script = script;
    this.talking = false;
    this.wait = this.nextWait();
  }

  nextWait() {
    const [lo, hi] = this.pauseRange;
    return lo + Math.random() * (hi - lo);
  }

  update(dt, cameraYawIndex, player) {
    if (this.talking) {
      // mid-conversation: hold still and keep looking at whoever is talking
      this.lookAt(player, cameraYawIndex);
    } else if (!this.moving) {
      const near = Math.abs(player.tileX - this.tileX) + Math.abs(player.tileZ - this.tileZ) <= NOTICE;
      if (near) {
        this.lookAt(player, cameraYawIndex);
        this.wait = this.nextWait();     // stand still for as long as you are here
      } else {
        this.wait -= dt;
        if (this.wait <= 0) {
          this.wait = this.nextWait();
          this.wander(cameraYawIndex);
        }
      }
    }

    this.tick(dt);
    this.pivot.rotation.y = (cameraYawIndex * Math.PI) / 2;
  }

  /**
   * Turn toward someone, along whichever axis they are further away on — a
   * diagonal has no sprite, so pick the one that reads.
   */
  lookAt(who, cameraYawIndex) {
    const dx = who.tileX - this.tileX;
    const dz = who.tileZ - this.tileZ;
    const dir = Math.abs(dx) > Math.abs(dz) ? (dx > 0 ? 1 : 3) : (dz > 0 ? 2 : 0);
    this.face(dir, cameraYawIndex);
  }

  /** One step in a random direction that stays inside the roam radius. */
  wander(cameraYawIndex) {
    const start = Math.floor(Math.random() * 4);
    for (let i = 0; i < 4; i++) {
      const dir = (start + i) % 4;
      const d = DIRS[dir];
      const nx = this.tileX + d.dx;
      const nz = this.tileZ + d.dz;
      if (Math.abs(nx - this.homeX) > this.roam || Math.abs(nz - this.homeZ) > this.roam) continue;
      if (this.step(dir, cameraYawIndex)) return;
    }
  }
}
