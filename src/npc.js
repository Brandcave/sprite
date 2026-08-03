import { VILLAGERS } from './art.js';
import { Character, DIRS } from './character.js';
import { sim, frac, TICK } from './sim.js';

/*
  A villager who potters around a home tile and looks up when you come near.

  Where they walk is decided by the shared clock, not by a local timer: every
  villager considers moving on a fixed cadence, and what it decides comes out of
  hash(seed, who, which decision). Two machines therefore walk them along
  identical paths without exchanging anything, and a client that arrives late
  replays the decisions it missed to catch up.

  Two rules keep that true, and both are worth stating because both are the kind
  of thing that quietly breaks it:

  - A villager never takes a player into account when choosing where to step.
    If it did, its path would depend on where everybody happened to be standing,
    which is exactly the sort of thing that differs between clients. Players are
    invisible to their pathing; noticing you only turns their head.

  - Villagers are advanced in a fixed order, because they do block each other,
    and who moves first decides who gets the tile.
*/

const NOTICE = 3;                 // tiles — inside this, the villager watches you
const DECIDE = 40;                // ticks between decisions (2 seconds)
const HOLD = 6;                   // decisions spent heading for one destination
const WARMUP = 120;               // decisions a fresh client replays to settle in

export class Npc extends Character {
  constructor(scene, tileX, tileZ, {
    index = 0, roam = 3, script = null, sprites = VILLAGERS.straw,
  } = {}) {
    // a slightly slower cadence than the hero, so the player reads as the quick one
    super(scene, sprites, tileX, tileZ, { stepTime: 0.26 });
    this.index = index;
    this.homeX = tileX;
    this.homeZ = tileZ;
    this.roam = roam;
    this.script = script;
    this.talking = false;
    this.decided = -1;

    // Walk the path this villager has already taken since the world began, so
    // it is standing where everyone else can see it standing.
    this.advanceTo(sim.tick, true);
  }

  /** Which decision number a tick belongs to; the offset staggers the cast. */
  decisionAt(tick) {
    return Math.floor((tick + this.index * 13) / DECIDE);
  }

  /**
   * Replay every decision up to `tick`. `silent` skips the walk animation, for
   * catching up on history nobody watched.
   */
  advanceTo(tick, silent = false) {
    const want = this.decisionAt(tick);
    if (this.decided < 0) this.decided = want - WARMUP;
    if (want - this.decided > WARMUP) this.decided = want - WARMUP;
    while (this.decided < want) {
      this.decide(++this.decided);
      if (silent) this.moveT = 1;      // history: arrive, do not stroll
    }
  }

  /**
   * Where this villager is heading. A destination is a pure function of the
   * clock, held for a few decisions at a time, and each decision takes one step
   * towards it.
   *
   * This is deliberately not a random walk. A random walk is a fold over every
   * step ever taken, so two clients only agree if they replay identical history
   * from the same starting point — and a client that arrives an hour late
   * cannot. Walking towards a shared destination is self-correcting instead:
   * however far apart two copies of a villager start, they are both heading for
   * the same tile, so they converge on it and stay converged. Drift washes out
   * on its own rather than accumulating forever.
   *
   * HOLD is set so a villager can reach a destination before it changes — if it
   * never arrives, two copies never meet, and the whole property is lost.
   */
  destination(n) {
    const g = Math.floor(n / HOLD);
    const span = this.roam * 2 + 1;
    return {
      x: this.homeX - this.roam + Math.floor(frac(sim.seed, 301, this.index, g) * span),
      z: this.homeZ - this.roam + Math.floor(frac(sim.seed, 302, this.index, g) * span),
    };
  }

  /** One decision: dawdle, or take a step towards the destination. */
  decide(n) {
    if (this.talking || this.moving) return;
    if (frac(sim.seed, 303, this.index, n) < 0.3) return;    // stand a while

    const to = this.destination(n);
    const dx = to.x - this.tileX;
    const dz = to.z - this.tileZ;
    if (!dx && !dz) return;                                  // arrived

    // Longer axis first, so the route reads as heading somewhere; ties broken
    // by the clock rather than by chance.
    const xFirst = Math.abs(dx) > Math.abs(dz)
      || (Math.abs(dx) === Math.abs(dz) && frac(sim.seed, 304, this.index, n) < 0.5);
    // -1 rather than a falsy 0, because 0 is a real direction here (up)
    const xDir = dx === 0 ? -1 : (dx > 0 ? 1 : 3);
    const zDir = dz === 0 ? -1 : (dz > 0 ? 2 : 0);

    for (const dir of xFirst ? [xDir, zDir] : [zDir, xDir]) {
      if (dir < 0) continue;
      // 0 for the camera yaw: facing is cosmetic and gets overwritten below
      if (this.step(dir, 0, true)) return;
    }
  }

  update(dt, cameraYawIndex, player) {
    if (!this.talking) this.advanceTo(sim.tick);

    // Noticing is cosmetic — it turns the head and nothing else, so it can
    // safely depend on where a player happens to be.
    if (this.talking) {
      this.lookAt(player, cameraYawIndex);
    } else if (!this.moving) {
      const near = Math.abs(player.tileX - this.tileX)
        + Math.abs(player.tileZ - this.tileZ) <= NOTICE;
      if (near) this.lookAt(player, cameraYawIndex);
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
}

export { TICK };
