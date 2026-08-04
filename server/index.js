import { createServer } from 'node:http';
import { WebSocketServer } from 'ws';

/*
  The relay.

  It knows nothing about the island. It does not simulate the weather, it does
  not walk the villagers, it does not own a copy of the map — all of that is a
  function of the room's seed and clock, which every client computes for itself
  (see src/sim.js). What is left for a server to do is small enough to fit in
  one file:

    - say what time it is, so clients can correct for their own clock skew
    - pass on where people are walking
    - say who else is here
    - carry what one player types to the one they are talking to

  A room is identified by the epoch and seed already in the page URL, so the
  server does not even store what a room *is*. It stores who is in one.
*/

const PORT = process.env.PORT ? +process.env.PORT : 8787;

// The island, for bounds checking. A client can send anything it likes; the
// server's job is to make sure what it forwards is at least a legal position.
const MAP_W = 62;
const MAP_H = 56;
// Rooms are laid out well past the island in the same coordinate space, so the
// bound is generous rather than the island's own — see src/place.js.
const FAR = 1024;
const ROOMS = 8;
const STEP_RATE = 25;             // steps per second a client may send
const MAX_SAY = 120;              // characters in one message
const SAY_RATE = 4;               // messages per SAY_WINDOW
const SAY_WINDOW = 2000;
const HEARTBEAT = 10000;          // how often to check everyone is still there

const rooms = new Map();          // key -> Map<id, client>
/*
  key -> the room's clock rush, if anybody has run one.

  The one piece of world state this server holds, and it holds it for the same
  reason it holds nothing else: a rush cannot be worked out from the seed and the
  epoch, because it happened because somebody did something. Four numbers, kept
  so that whoever walks in next is told what hour it really is rather than the
  one their own arithmetic would give them. See sim.js.
*/
const clocks = new Map();
const RUSH_WINDOW = 5000;         // no more than one clock change per room per...
/*
  ...and a clock outlives the people in it. A room is its epoch and its seed —
  the pair in the URL — so walking out of one and back into it is returning to
  the same island, and an island that had its evening should still be having it.
  Dropping the clock when the last person left made a solo player's page refresh
  undo the sunset, which from the inside looks exactly like a bug.

  Swept on the heartbeat so this cannot grow without bound: a room nobody has
  been in for an hour is a room nobody is coming back to.
*/
const CLOCK_TTL = 60 * 60 * 1000;
let nextId = 1;

const send = (ws, msg) => {
  if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(msg));
};

function broadcast(room, msg, except = null) {
  for (const c of room.values()) {
    if (c.id !== except) send(c.ws, msg);
  }
}

/** The same, but only to the people standing in one particular room of it. */
function tell(room, r, msg, except = null) {
  for (const c of room.values()) {
    if (c.id !== except && c.r === r) send(c.ws, msg);
  }
}

const http = createServer((req, res) => {
  // A health check, and a way to see who is about.
  res.writeHead(200, { 'content-type': 'application/json' });
  res.end(JSON.stringify({
    ok: true,
    rooms: [...rooms].map(([key, r]) => ({ key, players: r.size })),
  }));
});

const wss = new WebSocketServer({ server: http });

wss.on('connection', (ws, req) => {
  const url = new URL(req.url, 'http://localhost');
  const epoch = +url.searchParams.get('epoch');
  const seed = +url.searchParams.get('seed');
  if (!Number.isFinite(epoch) || !Number.isFinite(seed)) {
    send(ws, { t: 'error', why: 'room needs epoch and seed' });
    ws.close();
    return;
  }

  const key = `${epoch}:${seed}`;
  if (!rooms.has(key)) rooms.set(key, new Map());
  const room = rooms.get(key);

  const me = {
    id: nextId++,
    ws,
    key,
    x: null,
    z: null,
    f: 2,
    r: 0,                           // which room: 0 is the island, 1+ a house
    steps: 0,
    window: 0,
    says: 0,
    sayWindow: 0,
  };
  room.set(me.id, me);
  ws.alive = true;
  ws.on('pong', () => { ws.alive = true; });

  send(ws, {
    t: 'welcome',
    id: me.id,
    now: Date.now(),
    rush: clocks.get(key)?.rush ?? null,
    players: [...room.values()]
      .filter((c) => c.id !== me.id && c.x !== null && c.r === me.r)
      .map((c) => ({ id: c.id, x: c.x, z: c.z, f: c.f })),
  });

  ws.on('message', (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }

    if (msg.t === 'ping') {
      // Half of a clock handshake: echo the client's stamp back alongside ours
      // so it can work out the round trip and the offset between us.
      send(ws, { t: 'pong', c: msg.c, s: Date.now() });
      return;
    }

    if (msg.t === 'rush') {
      /*
        Somebody is running the world's clock forward. Everyone gets it,
        including whoever asked: they applied it locally the moment they asked,
        and being handed the stored copy back is what makes sure that the room
        ends up on one clock rather than on several that nearly agree.

        The bounds are not security — this is a toy on an open port — but a
        stuck or curious client should not be able to shove the island a year
        into the future or hold everybody in a permanent sunrise, and one rush
        every few seconds is more than any story needs.
      */
      const r = msg.rush ?? {};
      const num = (v, lo, hi) => Number.isFinite(v) && v >= lo && v <= hi;
      if (!num(r.at, -1e9, 1e9) || !num(r.from, 0, 864000)
          || !num(r.by, 0, 86400) || !num(r.over, 0.5, 300)) return;

      const now = Date.now();
      const held = clocks.get(key);
      if (held && now - held.when < RUSH_WINDOW) return;

      const rush = { at: r.at, from: r.from, by: r.by, over: r.over };
      clocks.set(key, { rush, when: now });
      broadcast(room, { t: 'rush', rush });
      return;
    }

    if (msg.t === 'say') {
      // Collapse whitespace and drop control characters: this lands in a fixed
      // two-line box on somebody else's screen, and a stray newline or a run of
      // tabs makes a mess of theirs rather than the sender's.
      const text = String(msg.text ?? '')
        .replace(/[\u0000-\u001f\u007f]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, MAX_SAY);
      if (!text) return;

      const now = Date.now();
      if (now - me.sayWindow > SAY_WINDOW) {
        me.sayWindow = now;
        me.says = 0;
      }
      if (++me.says > SAY_RATE) return;

      /*
        An addressee or nobody, and that is the whole difference between the two
        kinds of talk this carries. Addressed, it reaches exactly two people —
        which is what makes a private conversation private, here rather than in
        any client, since a client can only ever show what it was sent. Speaking
        to the room reaches the room.

        Either way the sender is sent their own words back, rather than echoing
        them locally, so that everybody's list is in the order the relay saw and
        not the order their own machine guessed at.
      */
      if (msg.to !== undefined && msg.to !== null) {
        const to = room.get(msg.to | 0);
        if (!to || to.id === me.id) return;
        const line = { t: 'said', from: me.id, to: to.id, text };
        send(to.ws, line);
        send(ws, line);
      } else {
        broadcast(room, { t: 'said', from: me.id, text });
      }
      return;
    }

    if (msg.t === 'step') {
      const x = msg.x | 0;
      const z = msg.z | 0;
      const f = msg.f | 0;
      const r = msg.r | 0;
      if (x < 0 || z < 0 || x >= FAR || z >= FAR) return;
      if (f < 0 || f > 3) return;
      if (r < 0 || r > ROOMS) return;

      // One tile at a time, and not too many of them. Neither check makes this
      // secure — it is a toy on an open port — but they keep a stuck client or
      // a curious one from teleporting about or flooding the room.
      const now = Date.now();
      if (now - me.window > 1000) {
        me.window = now;
        me.steps = 0;
      }
      if (++me.steps > STEP_RATE) return;

      /*
        Walking through a door is a room change, and from everybody else's point
        of view it is an arrival or a departure: the people you were with are
        told you have gone, and the people you have joined are told you are
        here. Which is the same pair of messages they would get if you had
        closed the tab and opened it again somewhere else, so nothing on the
        other end needs to know doors exist.
      */
      if (r !== me.r) {
        if (me.x !== null) tell(room, me.r, { t: 'bye', id: me.id }, me.id);
        me.r = r;
        me.x = x;
        me.z = z;
        me.f = f;
        tell(room, r, { t: 'join', id: me.id, x, z, f }, me.id);
        for (const c of room.values()) {
          if (c.id !== me.id && c.r === r && c.x !== null) {
            send(ws, { t: 'join', id: c.id, x: c.x, z: c.z, f: c.f });
          }
        }
        return;
      }

      if (me.x !== null && Math.abs(x - me.x) + Math.abs(z - me.z) > 1) {
        // Out of step — most likely a client that was asleep in a background
        // tab. Let it through, but as a move rather than a walk.
        tell(room, r, { t: 'warp', id: me.id, x, z, f }, me.id);
      } else {
        tell(room, r, { t: 'move', id: me.id, x, z, f }, me.id);
      }

      const first = me.x === null;
      me.x = x;
      me.z = z;
      me.f = f;
      if (first) {
        tell(room, r, { t: 'join', id: me.id, x, z, f }, me.id);
      }
    }
  });

  const leave = () => {
    if (!room.has(me.id)) return;
    room.delete(me.id);
    tell(room, me.r, { t: 'bye', id: me.id });
    // The room goes; its clock stays until the sweep gives up on it.
    if (room.size === 0) rooms.delete(key);
  };
  ws.on('close', leave);
  ws.on('error', leave);
});

/*
  Not everyone says goodbye. A crashed tab, a closed laptop or a dropped
  connection leaves a socket that looks open and will never speak again, and the
  player behind it stands in the room forever — which since players block each
  other means a permanent invisible wall on a tile nobody can use. So: ping
  everybody on a timer and hang up on whoever fails to answer. terminate()
  raises 'close', so they leave by the same door as everybody else.
*/
setInterval(() => {
  for (const ws of wss.clients) {
    if (!ws.alive) {
      ws.terminate();
      continue;
    }
    ws.alive = false;
    ws.ping();
  }

  // And forget the hour in rooms nobody has stood in for a long time.
  const now = Date.now();
  for (const [key, clock] of clocks) {
    if (!rooms.has(key) && now - clock.when > CLOCK_TTL) clocks.delete(key);
  }
}, HEARTBEAT);

http.listen(PORT, () => {
  console.log(`relay listening on :${PORT}`);
});
