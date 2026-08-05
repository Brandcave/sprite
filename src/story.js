import { Npc } from './npc.js';
import { VILLAGERS } from './art.js';
import { DIRS, tileOccupied } from './character.js';
import { inBounds, isBlocked } from './place.js';
import { sim } from './sim.js';
import { dayAt, DAY_LENGTH } from './weather.js';
import {
  AMY_HOUSE, AMY_FOUNTAIN, amyDate, amyWants, DATE_NEEDS, ANOKA_LAST,
} from './dialogue-scripts.js';
import { blanket, tableSetting } from './setting.js';

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
    /*
      The end of the south road, where it runs out at the lagoon.

      She was on the sand off the east side of it, which is beside the water
      rather than at the end of anything: you arrived from the side, the road
      went past her instead of to her, and the shot had no line to lead in on.

      The road is six tiles wide, 27 through 32, and stops dead at z 35 with
      water at 36 — so this is both the end of the road and the water's edge,
      and x 30 is the road's own centre line. It is the line the fountain stands
      on too, eight tiles up: the same road that took you to her the second time
      takes you to her the fourth, which is worth more than a nicer patch of
      sand.

      Nothing is overhead here. The street lamps flank the road at 26 and 33
      rather than stand on it, and the palms on the lip are further out still at
      22 and 37 — worth stating because the camera draws anything north of her
      above her head, and the spot was picked by checking rather than by eye.
    */
    picnic: {
      x: 30, z: 35, facing: 2, script: amyDate('picnic'),
      // Back up the road she came down, away from the camera, which is the
      // direction a departure reads best in.
      exit: { x: 30, z: 29 },
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
   * @param cast  the two people the last scene needs who are not Amy — the
   *              villager who walks up at the end of it, and whoever she is
   *              walking up to — and the bag, which the dates ask questions of.
   *              Handed in rather than reached for, because all three already
   *              exist by the time this is built and a story that has to go
   *              looking for its cast is a story that can fail to find it.
   *
   *              `bag` is used through two methods, has() and remove(), and
   *              nothing here should ever want a third. With no bag at all every
   *              date simply opens, which is the right way for this to degrade:
   *              a missing inventory should not make the story unfinishable.
   */
  constructor(scene, rooms, { anoka = null, player = null, bag = null } = {}) {
    this.spots = spotsFor(rooms);
    this.anoka = anoka;
    this.player = player;
    this.bag = bag;

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

    /*
      What she has laid out, keyed by the beat it belongs to — see setting.js.

      Built once here rather than when she arrives, because building a mesh is
      the sort of thing that costs a frame the first time it is drawn, and the
      first time it would be drawn is the moment you walk up to her. So they are
      made now, while nothing is happening, and only shown later.

      Three beats have one and the other two do not: she is sheltering in the
      house rather than hosting, and the fountain is a place she asked you to
      come to, not a thing she prepared.
    */
    this.settings = {
      /*
        Three across, two deep, and pushed a half tile back off her — she stands
        at 35, whose middle is 35.5, and the lagoon begins at 36. Centring on
        35.0 puts the near edge exactly on the waterline and the far edge two
        tiles up the road, so the cloth runs right to the water without a corner
        of it afloat, and she is sitting at the front of it rather than the
        middle. Which is where you would sit.
      */
      picnic: blanket(scene, { cx: 30.5, cz: 35.0, w: 3, d: 2 }),
      /*
        Open sand and nothing to clear, so this one is simply centred on her —
        28.5, 10.5 is the middle of her tile. Three deep rather than two because
        it is the one they lie back on, and because whichever side you walk up
        on, you arrive onto it.
      */
      stars: blanket(scene, { cx: 28.5, cz: 10.5, w: 3, d: 3 }),
      // A plate each and a candle between them, on the near edge of the table.
      dinner: tableSetting(rooms.dining, { plates: [[3, 1], [5, 1]], flame: [4, 1] }),
    };
    // Fading her out means fading her own materials, which is safe because a
    // Character builds its own rather than sharing one — but they still have to
    // be told they are allowed to be see-through before anybody tries.
    this.amy.material.transparent = true;

    /** The scene being played out, if any: nobody may walk while this is set. */
    this.scene = null;
    /** An epilogue owed but not yet playable — see epilogue(). */
    this.pending = false;

    /** Fired by a `cue` in her script. Set by whoever owns the sky. */
    this.onFireworks = null;
    /** ...and by whoever can tell the rest of the world what hour it is. */
    this.onNightfall = null;
    /**
     * Open the text box on somebody's behalf, for a conversation the player did
     * not start. Set by whoever owns the box: `(who, script, done) => {}`.
     */
    this.onSay = null;
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
      /*
        A date. Or the conversation where she sends you back for what she asked
        for, and those two are told apart by asking the bag rather than by
        reading which script just ran — because the bag is the thing that decided
        which script it was, and it cannot have changed in between. Talking to
        somebody has never yet put bread in anybody's hands.

        Turned away, nothing happened: she stays where she is, the stage does not
        move, and coming back is simply having the conversation again.
      */
      if (!this.ready(this.stage)) return;
      this.spend(this.stage);
      this.leave(() => this.finish());
    }
  }

  /**
   * Whether you are carrying what this beat asked you to bring.
   *
   * A beat with nothing on its list is always ready, which is every beat that is
   * not a date — the house and the fountain are places she asked you to come to,
   * not things she asked you to prepare for.
   */
  ready(stage) {
    const needs = DATE_NEEDS[stage];
    if (!needs || !this.bag) return true;
    return needs.every((id) => this.bag.has(id));
  }

  /**
   * ...and what the evening costs, once it has happened.
   *
   * Spent at the end of the conversation rather than at the start of it, so
   * walking away halfway through leaves you holding everything — the same
   * reading as done() takes of walking away, and for the same reason. Nothing
   * you did not finish should have taken anything from you.
   */
  spend(stage) {
    for (const id of DATE_NEEDS[stage] ?? []) this.bag?.remove(id);
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
    // The last scene is owed the moment she is gone, but it cannot always be
    // played then — see epilogue(). So it is asked for on every frame until it
    // takes, which costs one comparison and saves a great deal of bookkeeping
    // about doors.
    if (this.pending && !this.scene) this.epilogue();

    const s = this.scene;
    // 'walk' and 'talk' are both driven from elsewhere — by the route she is
    // following, and by the box she is speaking into — so there is nothing for
    // a clock to do about either of them.
    if (!s || s.phase === 'walk' || s.phase === 'talk') return;

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

  /** Only what belongs to the beat we are on is out; everything else is away. */
  layOut(stage) {
    for (const [name, group] of Object.entries(this.settings)) {
      group.visible = name === stage;
    }
  }

  moveTo(stage) {
    const spot = this.spots[stage];
    this.stage = stage;
    this.layOut(stage);
    // homeX/homeZ as well as the tile: home is what her schedule walks her back
    // towards, and leaving it behind in the last room would have her spend the
    // rest of the game trying to get there.
    this.amy.homeX = spot.x;
    this.amy.homeZ = spot.z;
    this.amy.placeAt(spot.x, spot.z);
    this.amy.face(spot.facing, 0);
    /*
      A date carries a function rather than a script, so what she says is decided
      at the moment you press Z rather than when she sat down — see scriptOf() in
      npc.js, which exists for exactly this. It has to be that late: the whole
      point is that you can walk away, find the bread, and come back to a
      different conversation without anything having to notice that you did.
    */
    this.amy.script = DATE_NEEDS[stage]
      ? () => (this.ready(stage) ? spot.script : amyWants(stage))
      : spot.script;
    this.show();
  }

  finish() {
    this.stage = 'gone';
    // She takes it with her. A blanket left on the sand after she has sailed is
    // a lovely thought and an odd object — it would sit there for the rest of
    // the game with nobody to pick it up, and read as something forgotten by the
    // engine rather than by her.
    this.layOut(null);
    this.vanish();
    // ...and the player does not get to walk off yet. update() picks this up.
    this.pending = true;
  }

  /**
   * The last scene, which is not hers.
   *
   * Amy has said her line and gone, and before control comes back Anoka crosses
   * the ground to him and tells him what that line actually costs. She is not
   * summoned and she does not appear: she walks, from wherever her schedule had
   * her standing, which is why it can be a long walk and why that is right. The
   * player holds still for it exactly as he holds still for Amy leaving.
   *
   * Two things make this safe to do to a villager who is otherwise a pure
   * function of the shared clock:
   *
   * - Her home is not touched. follow() suspends the schedule for the length of
   *   a route and hands her straight back to it afterwards, so when the box
   *   closes she is a villager again, standing somewhere unusual, walking back
   *   towards the pond of her own accord. Nothing has to remember to send her.
   *   Other people's copies of her never left the pond and reconverge on it —
   *   the drift washes out, which is the property npc.js is built around.
   *
   * - It waits for open ground. After the dinner date he is indoors, and a room
   *   is three hundred tiles from her lawn with no route between them: she would
   *   set off, fail to find a single walkable step, and deliver the speech of
   *   her life from another postcode. So the scene is owed rather than played,
   *   and it happens on the step outside — which is a better staging of it than
   *   the one I would have written on purpose.
   */
  epilogue() {
    const her = this.anoka;
    // Nobody to say it, nowhere to say it, or she is not in the place we are
    // standing in. The first two mean this island was built without an epilogue
    // and should simply not have one; the last means "not yet".
    if (!her || !this.player || !this.onSay) return void (this.pending = false);
    if (!inBounds(her.tileX, her.tileZ)) return;

    this.pending = false;
    this.scene = { phase: 'walk', t: 0 };
    /*
      His own tile, which she can never reach — he is standing on it, and
      routeTo() treats whoever is in the way as solid. So the search runs out at
      the nearest tile it *can* reach, which is the one beside him. That is not a
      fallback being tolerated: it is how you ask for "come and stand next to
      him" without having to pick which of the four sides is free.
    */
    her.follow(routeTo(her, { x: this.player.tileX, z: this.player.tileZ }), () => {
      this.scene = { phase: 'talk', t: 0 };
      // `talking` is what keeps her head turned to him for the length of it —
      // see npc.update() — as well as what keeps her schedule from walking her
      // off mid-sentence.
      this.onSay(her, ANOKA_LAST, () => { this.scene = null; });
    });
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
    this.pending = false;
    this.amy.route = null;
    this.moveTo('house');
  }
}
