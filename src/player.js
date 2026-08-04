import { Character, DIRS } from './character.js';
import { skinFor } from './identity.js';

export class Player extends Character {
  constructor(scene, tileX, tileZ, id = null) {
    super(scene, skinFor(id), tileX, tileZ);
    this.isPlayer = true;      // villagers path straight through us; see character.js
  }

  /** @param inputDir world-space direction index, or -1 for idle */
  update(dt, inputDir, cameraYawIndex) {
    if (!this.moving && inputDir >= 0) {
      if (!this.step(inputDir, cameraYawIndex)) {
        // bumped a wall: still turned, and tick the frame so it reads as a nudge
        this.frame = (this.stepCount + Math.floor(performance.now() / 160)) % 2;
      }
    }

    this.tick(dt);
    this.billboard();
  }
}

export { DIRS };
