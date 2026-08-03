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

  A room is identified by the epoch and seed already in the page URL, so the
  server does not even store what a room *is*. It stores who is in one.
*/

const PORT = process.env.PORT ? +process.env.PORT : 8787;

// The island, for bounds checking. A client can send anything it likes; the
// server's job is to make sure what it forwards is at least a legal position.
const MAP_W = 62;
const MAP_H = 56;
const STEP_RATE = 25;             // steps per second a client may send
const HEARTBEAT = 10000;          // how often to check everyone is still there

const rooms = new Map();          // key -> Map<id, client>
let nextId = 1;

const send = (ws, msg) => {
  if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(msg));
};

function broadcast(room, msg, except = null) {
  for (const c of room.values()) {
    if (c.id !== except) send(c.ws, msg);
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
    // Which villager sprite this player wears, so a room full of people is not
    // a room full of the same person. Derived from the id, so everyone agrees.
    skin: nextId % 3,
    steps: 0,
    window: 0,
  };
  room.set(me.id, me);
  ws.alive = true;
  ws.on('pong', () => { ws.alive = true; });

  send(ws, {
    t: 'welcome',
    id: me.id,
    now: Date.now(),
    players: [...room.values()]
      .filter((c) => c.id !== me.id && c.x !== null)
      .map((c) => ({ id: c.id, x: c.x, z: c.z, f: c.f, skin: c.skin })),
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

    if (msg.t === 'step') {
      const x = msg.x | 0;
      const z = msg.z | 0;
      const f = msg.f | 0;
      if (x < 0 || z < 0 || x >= MAP_W || z >= MAP_H) return;
      if (f < 0 || f > 3) return;

      // One tile at a time, and not too many of them. Neither check makes this
      // secure — it is a toy on an open port — but they keep a stuck client or
      // a curious one from teleporting about or flooding the room.
      const now = Date.now();
      if (now - me.window > 1000) {
        me.window = now;
        me.steps = 0;
      }
      if (++me.steps > STEP_RATE) return;

      if (me.x !== null && Math.abs(x - me.x) + Math.abs(z - me.z) > 1) {
        // Out of step — most likely a client that was asleep in a background
        // tab. Let it through, but as a move rather than a walk.
        broadcast(room, { t: 'warp', id: me.id, x, z, f }, me.id);
      } else {
        broadcast(room, { t: 'move', id: me.id, x, z, f }, me.id);
      }

      const first = me.x === null;
      me.x = x;
      me.z = z;
      me.f = f;
      if (first) {
        broadcast(room, { t: 'join', id: me.id, x, z, f, skin: me.skin }, me.id);
      }
    }
  });

  const leave = () => {
    if (!room.has(me.id)) return;
    room.delete(me.id);
    broadcast(room, { t: 'bye', id: me.id });
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
}, HEARTBEAT);

http.listen(PORT, () => {
  console.log(`relay listening on :${PORT}`);
});
