import { sim } from './sim.js';

/*
  The wire.

  Almost nothing goes over it. The weather, the day, the villagers and every
  blade of grass are computed from the room's seed and clock, identically on
  every machine, so the only things worth sending are the things a server cannot
  work out for itself: where the other people are, and what time it really is.

  That comes to one message per completed step — about five a second while
  someone is walking, none at all while they stand still.

  If there is no server the game runs exactly as before, alone. Multiplayer is
  an enhancement here, not a dependency: connect() resolves either way.
*/

const CONNECT_TIMEOUT = 1500;
const SYNC_PINGS = 5;             // clock samples on connect
const RESYNC_MS = 30000;          // and one every half minute after

/*
  Where the relay lives.

  Not with the game, is the short answer. The page is static files and can go on
  any CDN, but the relay is a process that holds a socket open for as long as
  somebody is standing in the room, which is the one thing a static host or a
  serverless function cannot do. So its address is baked in at build time —
  VITE_RELAY — and the two halves are deployed separately.

  Unset, it guesses the machine serving the page, which is right in development
  and wrong everywhere else. That failure is quiet by design: connect() resolves
  false and the island opens alone, which is a perfectly good outcome and the
  reason nothing here throws.

  It is quieter than it used to be. This once said "and the HUD says so", and
  there was a HUD that said so; it went when the clock stopped reporting
  anything but the time, and nothing replaced it. So there is now no way to tell
  from inside the game whether you are connected — the only tells are another
  player's dot on the minimap, and the relay's own / endpoint, which lists the
  rooms and who is in them.

  Worth knowing when a deployment looks synchronised but empty: the weather, the
  clock and the villagers are all functions of the seed in the URL and agree
  with themselves perfectly happily without a server, so two people on a dead
  relay see an identical world with nobody in it.
*/
function defaultUrl() {
  const params = new URLSearchParams(location.search);
  const given = params.get('server');
  if (given) return given;
  if (import.meta.env.VITE_RELAY) return import.meta.env.VITE_RELAY;
  const secure = location.protocol === 'https:';
  return `${secure ? 'wss' : 'ws'}://${location.hostname}:8787`;
}

export class Net {
  constructor() {
    this.ws = null;
    this.id = null;
    this.roster = [];
    this.rush = null;             // the room's clock, if it has been run on
    this.online = false;
    this.rtt = 0;
    this.samples = [];
    this.onJoin = () => {};
    this.onMove = () => {};
    this.onLeave = () => {};
    this.onDrop = () => {};
    this.onSay = () => {};
    this.onRush = () => {};
  }

  /**
   * Try to reach the relay. Resolves with `true` if we are in a room and
   * `false` if we are on our own — never rejects, because being alone on the
   * island is a perfectly good outcome.
   */
  connect(url = defaultUrl()) {
    return new Promise((resolve) => {
      let settled = false;
      const done = (ok) => {
        if (settled) return;
        settled = true;
        this.online = ok;
        resolve(ok);
      };

      let ws;
      const openedAt = Date.now();
      try {
        ws = new WebSocket(`${url}?epoch=${sim.epoch}&seed=${sim.seed}`);
      } catch {
        done(false);
        return;
      }
      this.openedAt = openedAt;
      this.ws = ws;
      const timer = setTimeout(() => { if (!settled) { ws.close(); done(false); } }, CONNECT_TIMEOUT);

      ws.onmessage = (ev) => {
        let msg;
        try {
          msg = JSON.parse(ev.data);
        } catch {
          return;
        }
        this.handle(msg, () => { clearTimeout(timer); done(true); });
      };
      ws.onerror = () => { clearTimeout(timer); done(false); };
      ws.onclose = () => {
        // Everyone we could see is now hearsay: clear them out rather than
        // leave a room full of statues nobody can walk through.
        if (this.online) this.onDrop();
        this.online = false;
        clearTimeout(timer);
        done(false);
      };
    });
  }

  handle(msg, ready) {
    switch (msg.t) {
      case 'welcome':
        this.id = msg.id;
        // A first, coarse clock reading, timed from when we opened the socket:
        // it carries the whole connection handshake in its round trip, so it
        // over-estimates. It is enough to build the world on, and the pings
        // below will beat it on round trip and replace it within a second.
        this.sample(this.openedAt, msg.now, Date.now());

        // We are in the room the moment we are welcomed, so say so *now*
        // rather than after the clock has been refined. Waiting on a chain of
        // timers cost us the connection outright in a background tab, where
        // browsers clamp setTimeout to a second and five 60ms pings took five.
        ready();
        this.sync(SYNC_PINGS);
        // Whoever is already standing about. This arrives inside connect(),
        // which is over before the game has built a scene to put them in, so it
        // is kept rather than announced — see the caller, which replays it once
        // it is ready. Handing it straight to onJoin drops the lot on the floor,
        // and a player who is standing still sends nothing else to give
        // themselves away: they stay invisible until they happen to walk.
        this.roster = msg.players ?? [];
        /*
          Whatever the room has already done to its clock. This is why a rush is
          a description rather than an event: somebody who arrives an hour after
          the sun raced down is handed the same four numbers and lands on the
          same hour, having watched none of it.

          Kept rather than announced, like the roster above and for the same
          reason — this lands inside connect(), before the caller has had a
          chance to say what to do with it. It matters more here than it does
          for the roster: the weather and the villagers are built from the clock
          the moment connect() returns, so this has to be applied before that
          rather than announced after it.
        */
        this.rush = msg.rush ?? null;
        break;
      case 'pong':
        this.sample(msg.c, msg.s, Date.now());
        break;
      case 'join':
        this.onJoin(msg);
        break;
      case 'move':
        this.onMove(msg, false);
        break;
      case 'warp':
        this.onMove(msg, true);
        break;
      case 'said':
        // `to` present means it was addressed; absent means the room heard it.
        this.onSay(msg.from | 0, String(msg.text ?? ''), msg.to ?? null);
        break;
      case 'rush':
        this.rush = msg.rush ?? null;
        if (this.rush) this.onRush(this.rush);
        break;
      case 'bye':
        this.onLeave(msg.id);
        break;
      default:
        break;
    }
  }

  /**
   * One clock sample. The offset is the server's time minus the midpoint of our
   * send and receive stamps — the usual trick, and it assumes the trip took the
   * same time each way, which is why we keep the sample with the shortest round
   * trip and throw the rest away.
   */
  sample(sent, server, received) {
    const rtt = received - sent;
    const offset = server - (sent + received) / 2;
    this.samples.push({ rtt, offset });
    const best = this.samples.reduce((a, b) => (b.rtt < a.rtt ? b : a));
    this.rtt = best.rtt;
    sim.configure({ offset: best.offset });
  }

  sync(times) {
    if (times <= 0) return;
    this.send({ t: 'ping', c: Date.now() });
    setTimeout(() => this.sync(times - 1), 120);
  }

  send(msg) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  /**
   * Where we are, and which room we are in. The room matters as much as the
   * coordinates: the relay tells people about each other only when both are in
   * the same one, which is what makes a house something you are actually inside
   * rather than somewhere the walls happen to hide you.
   */
  step(x, z, facing, room = 0) {
    this.send({ t: 'step', x, z, f: facing, r: room });
  }

  /**
   * Say something to one person. Addressed rather than broadcast: the relay
   * hands it to that player and nobody else, so standing next to two people
   * does not mean talking to both. It comes back to us too, so our own list
   * holds what we said.
   */
  say(to, text) {
    this.send({ t: 'say', to, text });
  }

  /** Say something to the whole room. */
  sayAll(text) {
    this.send({ t: 'say', text });
  }

  /**
   * Push the world's clock forward for everybody in the room — see sim.hurry().
   *
   * The only message here that changes something other than where a person is
   * standing, and the only one that reaches people in other rooms of the world:
   * you can be indoors while somebody out on the sand runs the sun down, and the
   * light through your window ought to know about it.
   */
  hurry(rush) {
    this.send({ t: 'rush', rush });
  }

  /**
   * Leave properly when the page goes away, and come back when it returns.
   *
   * This is not belt and braces — without it a departing player haunts the room
   * indefinitely. A browser navigating away can put the whole page in its
   * back/forward cache: frozen, no JavaScript running, but the socket still
   * open, and still answering the server's pings, because a protocol-level pong
   * is sent by the browser itself and needs no page to be awake. So the server
   * cannot tell the difference, the heartbeat never fires, and since players
   * block each other the ghost is a permanent wall on a tile.
   *
   * pagehide is the event that fires as the page is frozen or unloaded, which
   * makes it the only reliable moment to say goodbye.
   */
  watchPage(reannounce) {
    addEventListener('pagehide', () => this.ws?.close());
    addEventListener('pageshow', async (e) => {
      if (!e.persisted || this.online) return;    // restored from the cache
      if (await this.connect()) reannounce();
    });
  }

  /** Re-measure the clock now and then: skew creeps, and tabs get suspended. */
  start() {
    if (!this.online) return;
    setInterval(() => {
      if (this.samples.length > 12) this.samples = this.samples.slice(-4);
      this.send({ t: 'ping', c: Date.now() });
    }, RESYNC_MS);
  }
}
