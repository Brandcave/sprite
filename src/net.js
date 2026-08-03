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

function defaultUrl() {
  const params = new URLSearchParams(location.search);
  const given = params.get('server');
  if (given) return given;
  const secure = location.protocol === 'https:';
  return `${secure ? 'wss' : 'ws'}://${location.hostname}:8787`;
}

export class Net {
  constructor() {
    this.ws = null;
    this.id = null;
    this.online = false;
    this.rtt = 0;
    this.samples = [];
    this.onJoin = () => {};
    this.onMove = () => {};
    this.onLeave = () => {};
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
        for (const p of msg.players) this.onJoin(p);
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

  step(x, z, facing) {
    this.send({ t: 'step', x, z, f: facing });
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
