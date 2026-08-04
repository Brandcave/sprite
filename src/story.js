import { Npc } from './npc.js';
import { VILLAGERS } from './art.js';
import { DIRS, tileOccupied } from './character.js';
import { inBounds, isBlocked } from './place.js';
import { sim } from './sim.js';
import { dayAt, DAY_LENGTH } from './weather.js';
import { AMY_HOUSE, AMY_FOUNTAIN, amyDate } from './dialogue-scripts.js';

/*
  Amy, and the only thing on this island that happens in an order.

  Everything else here is a standing wave. The weather is a function of the
  clock, the villagers walk a schedule the clock decides, the hour is read rather
  than counted — so any two machines agree about all of it without exchanging a
  word, and a client that arrives an hour late catches up by computing what it
  missed. Nothing accumulates, so nothing can drift.

  This does not work that way and cannot be made to. A story is state: she is in
  the house until you have talked to her in the house, and no amount of knowing
  what time it is will tell you whether that has happened. So this is the one
  file that keeps something, and it is worth being plain about what that costs:

  - It is *yours*. Two people in the same room can be at different points of it,
    and will see her standing in different places, or not at all. That is the
    honest reading rather than a compromise — the conversation was with you, and
    a second player watching your love story resolve on their screen would be a
    stranger thing than them not seeing it.

  - She does not go on the wire, which is what keeps that from being a bug. The
    relay carries player steps and nothing else; villagers are not sent because
    every machine computes them, and she is not sent because no machine but this
    one has any business knowing where she is.

    The one exception is the sky. Choosing to watch the stars with her runs the
    world's clock down to night, and *that* is everybody's — see the nightfall
    cue below. Where she is standing is a private matter; what hour it is on the
    island is not.

  - It does not survive a reload, and for now that is on purpose. Refreshing the
    page puts her back in the house and starts the whole thing over. While the
    story is still being written that is the behaviour you want — every reload is
    a clean run of it — and it means nothing can get stranded in a state you
    cannot see or clear. A saved stage is a one-line change here when the story
    is finished enough to be worth keeping.

  Where she is standing for each beat is the whole of the state. Talk your way to
  the end of a conversation and she leaves — on her feet, out of the door or off
  down the sand, with the player held still until she has gone — which is the
  only way the world here has of saying that something happened.
*/

/*
  She never roams, so the tile she is put on is the tile she is on — which is
  why these can be written down as flat coordinates and trusted. The three date
  spots are keyed by the ending node of AMY_FOUNTAIN, so the choice in the script
  *is* the destination and there is no table mapping one to the other to keep in
  step. Adding a fourth place to go is adding a node and a line here.

  `exit` is where she walks when the scene is over: an offset for the outdoor
  spots, and for a room, the mat — which is the door, so she goes out of it. A
  room exit ends with her simply gone, because a door is a thing you can be on
  the other side of; outdoors she fades, because open sand is not.
*/
function spotsFor({ parlour, dining }) {
  return {
    // Middle of the parlour, three tiles up from the mat you come in on, facing
    // it. She leaves by the door she let herself in at.
    house: {
      x: parlour.x0 + 4, z: parlour.z0 + 2, facing: 2, script: AMY_HOUSE,
      exit: { ...parlour.mat, door: true },
    },
    /*
      The south edge of the fountain, in the middle of the plaza — the one place
      on this island everybody passes through, and squarely on the road out of
      the houses, so the second meeting is somewhere you walk to rather than
      somewhere you hunt for.

      Facing down the road, with the water behind her: the camera looks from the
      south, so the fountain fills the frame above her shoulder rather than
      sitting in front of her where it would be something to look past.
    */
    fountain: {
      x: 30, z: 27, facing: 2, script: AMY_FOUNTAIN,
      // Around the west side of the fountain and away up the plaza. The curb is
      // solid, so there is no straight line out of here — the route finds its
      // own way round, which is the whole reason it is a search and not a list.
      exit: { x: 26, z: 21 },
    },
    // At the long table, in the room that has one.
    dinner: {
      x: dining.x0 + 4, z: dining.z0 + 2, facing: 2, script: amyDate('dinner'),
      exit: { ...dining.mat, door: true },
    },
    // The sand on the north lip of the lagoon, water directly in front of her.
    picnic: {
      x: 34, z: 35, facing: 2, script: amyDate('picnic'),
      exit: { x: 34, z: 29 },                     // up the path, into the trees
    },
    /*
      The end of the road, where the island's one street runs out into the north
      sand — nine tiles west of where you met her, so it is somewhere you go
      rather than somewhere you turn round at, and the road takes you to it.

      Which of the road's six tiles is not arbitrary. The camera looks down from
      the south, so a palm *behind* a character is drawn above their head and one
      in *front* is drawn over the top of them outright — and a spot picked
      without checking gives you a woman standing under a tree rather than one
      standing at the end of a road. Of the six, 29 through 31 all have the palm
      at 30,7 sitting on her; 27, 28 and 32 are clear, and 28 is the one with the
      most open sand behind it.
    */
    stars: {
      x: 28, z: 10, facing: 2, script: amyDate('stars'),
      // Straight up the beach to the water's edge: away from the camera, which
      // is the direction a departure reads best in.
      exit: { x: 28, z: 4 },
    },
  };
}

/*
  How long the sun takes to go down when somebody asks it to, and how far into
  the night it goes. 0.78 of the cycle is a little after midnight — properly
  dark, stars out, and far enough past dusk that the light is not still moving
  while you are trying to have the conversation.

  Twelve seconds is long enough to be worth watching and short enough that
  anybody in the room who did not ask for it is not left waiting on it.
*/
const NIGHT = 0.78;
const NIGHTFALL = 12;
// Below this there is nothing worth watching — it is already night, or near
// enough that racing the last few minutes would just be a flicker.
const ALREADY_DARK = 0.04;

/** How long she stands in the doorway before she is through it. */
const AT_THE_DOOR = 0.4;
/** And how long she takes to fade, out in the open. */
const FADE = 0.8;

/**
 * A walk from one tile to another, as a list of directions, around anything
 * solid and around whoever is standing in the way.
 *
 * Breadth-first over the place we are in, which for a room is fifty-four tiles
 * and for the island is still nothing — this runs once, when a scene starts.
 * If the target cannot be reached at all it returns the route to the reachable
 * tile nearest it rather than nothing, so a player who has parked themselves in
 * a doorway gets a woman who walks as far as she can and then leaves from there,
 * instead of a cutscene that never ends and a hero who can never move again.
 */
function routeTo(who, to) {
  const key = (x, z) => x * 4096 + z;
  const start = { x: who.tileX, z: who.tileZ };
  const from = new Map([[key(start.x, start.z), null]]);
  const queue = [start];
  let best = start;
  let bestGap = Math.abs(start.x - to.x) + Math.abs(start.z - to.z);

  for (let head = 0; head < queue.length; head++) {
    const at = queue[head];
    const gap = Math.abs(at.x - to.x) + Math.abs(at.z - to.z);
    if (gap < bestGap) { bestGap = gap; best = at; }
    if (!gap) break;
    for (let dir = 0; dir < 4; dir++) {
      const x = at.x + DIRS[dir].dx;
      const z = at.z + DIRS[dir].dz;
      const k = key(x, z);
      if (from.has(k)) continue;
      if (!inBounds(x, z) || isBlocked(x, z) || tileOccupied(x, z, who)) continue;
      from.set(k, { x: at.x, z: at.z, dir });
      queue.push({ x, z });
    }
  }

  const route = [];
  for (let at = best; ; ) {
    const step = from.get(key(at.x, at.z));
    if (!step) break;
    route.unshift(step.dir);
    at = step;
  }
  return route;
}

export class Story {
  /**
   * @param rooms the two interiors, so the indoor beats can be written as room
   *              coordinates rather than as the raw tiles they happen to land on
   */
  constructor(scene, rooms) {
    this.spots = spotsFor(rooms);

    // Always from the top. Nothing is remembered between page loads.
    this.stage = 'house';
    const start = this.spots.house;
    /*
      An index of 3, after the three villagers. It seeds a schedule of decisions
      she never acts on — with a roam of 0 every destination she is ever given is
      the tile she is already on — but it keeps her out of their draw, which
      costs nothing and would be a genuinely baffling thing to debug later.
    */
    this.amy = new Npc(scene, start.x, start.z, {
      index: 3,
      roam: 0,
      script: start.script,
      sprites: VILLAGERS.amy,
      // Rose on the minimap, where every villager is teal. The last thing she
      // says is "come and find me", so the map had better help.
      dot: '#e8628c',
    });
    this.amy.face(start.facing, 0);
    this.amy.onDone = (why, ending) => this.done(why, ending);
    // Fading her out means fading her own materials, which is safe because a
    // Character builds its own rather than sharing one — but they still have to
    // be told they are allowed to be see-through before anybody tries.
    this.amy.material.transparent = true;

    /** The scene being played out, if any: nobody may walk while this is set. */
    this.scene = null;

    /** Fired by a `cue` in her script. Set by whoever owns the sky. */
    this.onFireworks = null;
    /** ...and by whoever can tell the rest of the world what hour it is. */
    this.onNightfall = null;
  }

  /** Nothing the player does reaches the world while a scene is running. */
  get busy() {
    return this.scene !== null;
  }

  /*
    The same state, read the way the rest of the island cares about it.

    A stage says where Amy is standing, which is the only thing this file needs
    to know. A villager needs something coarser — how far along the two of you
    are — and the three date spots are one answer to that rather than three, so
    the mapping is not the identity and should not pretend to be.

    Written as a fold rather than a table so that adding a fourth place to take
    her, which is otherwise a node and a line in spotsFor(), stays exactly that:
    anything that is not one of the named beats is somewhere she is waiting for
    you, and the village already has the right thing to say about it.
  */
  get chapter() {
    if (this.stage === 'house') return 'searching';
    if (this.stage === 'fountain') return 'met';
    if (this.stage === 'gone') return 'gone';
    return 'date';
  }

  /**
   * The end of one of her conversations.
   *
   * Only a conversation that ran all the way out moves her on. Walking away
   * halfway through leaves everything exactly as it was, which is the right
   * reading of walking away: you can go back and have it again.
   */
  done(why, ending) {
    if (why !== 'end') return;
    if (this.stage === 'house') {
      this.leave(() => this.moveTo('fountain'));
    } else if (this.stage === 'fountain') {
      const next = this.spots[ending] ? ending : 'stars';
      this.leave(() => this.moveTo(next));
    } else {
      this.leave(() => this.finish());
    }
  }

  /**
   * She goes. On her feet, to the door or off down the shore, and the player
   * holds still until she has — which is the whole difference between a person
   * leaving and a sprite being switched off.
   */
  leave(after) {
    const spot = this.spots[this.stage];
    const exit = spot?.exit;
    if (!exit) return after();

    this.scene = { phase: 'walk', t: 0, door: !!exit.door, after };
    /*
      Home moves with her, and it has to. A route is walked with the schedule
      switched off, but the moment it runs out she is back on it — and her
      schedule's one instruction is "be at home", so she would turn round on the
      doorstep and walk all the way back to the middle of the room while the
      player watched her fade.
    */
    this.amy.homeX = exit.x;
    this.amy.homeZ = exit.z;
    this.amy.follow(routeTo(this.amy, exit), () => {
      // Facing out of the room as she goes through the door, or on down the
      // beach: whichever way she was last walking is already right, and the one
      // case that is not is arriving with nowhere to have walked from.
      this.scene.phase = this.scene.door ? 'door' : 'fade';
      this.scene.t = 0;
    });
  }

  /** Drives whatever scene is running. Called every frame; usually does nothing. */
  update(dt) {
    const s = this.scene;
    if (!s || s.phase === 'walk') return;

    s.t += dt;
    if (s.phase === 'fade') {
      const k = Math.max(0, 1 - s.t / FADE);
      this.amy.material.opacity = k;
      this.amy.blob.material.opacity = 0.22 * k;
    }
    if (s.t < (s.phase === 'door' ? AT_THE_DOOR : FADE)) return;

    this.scene = null;
    const after = s.after;
    after();
  }

  moveTo(stage) {
    const spot = this.spots[stage];
    this.stage = stage;
    // homeX/homeZ as well as the tile: home is what her schedule walks her back
    // towards, and leaving it behind in the last room would have her spend the
    // rest of the game trying to get there.
    this.amy.homeX = spot.x;
    this.amy.homeZ = spot.z;
    this.amy.placeAt(spot.x, spot.z);
    this.amy.face(spot.facing, 0);
    this.amy.script = spot.script;
    this.show();
  }

  finish() {
    this.stage = 'gone';
    this.vanish();
  }

  /** Back on her feet and fully opaque, wherever she has just been put. */
  show() {
    this.amy.material.opacity = 1;
    this.amy.blob.material.opacity = 0.22;
    this.amy.group.visible = true;
  }

  /**
   * Off the island entirely: no sprite, no tile, nothing to walk up to and press
   * a key at. She is not hidden somewhere for later — this is the end of it.
   */
  vanish() {
    this.amy.script = null;
    this.amy.dispose();
    this.amy.group.visible = false;
  }

  /** A cue reached in one of her scripts — see dialogue.js. */
  cue(name) {
    if (name === 'fireworks') this.onFireworks?.();
    if (name === 'nightfall') this.nightfall();
  }

  /**
   * Run the sun down, for the whole island.
   *
   * She asks for the stars, so the stars are what there had better be. This is
   * the only thing in the story that leaves this machine: the hour is a property
   * of the world rather than of anybody's afternoon, so if there are three other
   * people out on the sand, the sun goes down on them too. See sim.hurry() for
   * the shape of it and net.hurry() for the one message it takes.
   *
   * Already dark, and there is nothing to do — the sky is holding up its end.
   */
  nightfall() {
    const gap = (NIGHT - dayAt(sim.time) + 1) % 1;
    if (gap < ALREADY_DARK) return;
    this.onNightfall?.(sim.rushNow(gap * DAY_LENGTH, NIGHTFALL));
  }

  /** For the console: put her back at the beginning. */
  reset() {
    this.scene = null;
    this.amy.route = null;
    this.moveTo('house');
  }
}
