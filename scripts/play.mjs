import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { request } from 'node:https';
import { Resolver } from 'node:dns/promises';

/*
  Open the island to other people for as long as this is running.

  The deployed page is static files on a CDN, which is all it needs to be — the
  world is a function of the seed in its URL, so the weather and the villagers
  and the clock all work with no server at all. The one thing that cannot be
  computed from a seed is other people, and carrying them needs a socket held
  open, which a CDN cannot do.

  So: the relay runs here, a tunnel gives it a public address, and the address
  travels in the link. Nothing is deployed and nothing is paid for, and when you
  close this the island goes back to being single player rather than broken —
  which is the whole reason the game treats being alone as a normal outcome.

  The room travels in the link too, and that is not a nicety. A link with no
  room on it mints a fresh one in every browser that opens it, so handing the
  same one to four people puts the four of them on four separate islands, each
  of which looks perfectly correct and is completely empty. So the link this
  prints is finished: site, room and relay, ready to send.
*/

const SITE = (process.env.SITE ?? 'https://sprite-rho.vercel.app').replace(/\/+$/, '');

/*
  Yesterday's link, if you pass one, to go back to the same island rather than
  waking up on a new one. Only the room is taken from it — the relay address in
  an old link died with the tunnel that issued it.
*/
function roomFrom(link) {
  try {
    const q = new URL(link).searchParams;
    const epoch = q.get('epoch');
    const seed = q.get('seed');
    if (epoch && seed) return { epoch, seed, reused: true };
  } catch {
    console.error(`could not read a room out of ${link} — minting a new one\n`);
  }
  return null;
}

const room = (process.argv[2] && roomFrom(process.argv[2])) ?? {
  epoch: Date.now(),
  seed: crypto.getRandomValues(new Uint32Array(1))[0],
  reused: false,
};

/*
  8787 is not always ours — an editor or a previous run may be sitting on it.

  The probe listens the way the relay does, on every interface, and that detail
  is the whole test: bound to 127.0.0.1 it reports a free port while the relay
  is holding *:8787, because the two do not collide. The relay would then fail
  to bind and the tunnel would point at nothing.
*/
const free = (port) => new Promise((resolve) => {
  const probe = createServer()
    .once('error', () => resolve(false))
    .once('listening', () => probe.close(() => resolve(true)))
    .listen(port);
});

async function pickPort(from) {
  for (let port = from; port < from + 20; port++) {
    if (await free(port)) return port;
  }
  throw new Error(`nothing free between ${from} and ${from + 20}`);
}

/*
  Is the address actually carrying anything yet?

  Two reasons this is not a plain fetch. The tunnel is registered with
  Cloudflare a good few seconds before its name is answerable at the edge, so a
  link handed over the moment it is printed can arrive as a 1016 and read to
  whoever clicked it as an ordinary empty island. And the machine's own resolver
  may not know the name at all — a VPN or a filtering resolver that declines to
  look up tunnel domains will NXDOMAIN it while the rest of the world resolves
  it perfectly — so the lookup goes to a public resolver, and the connection is
  made to that address with the name carried in SNI and the Host header. Which
  is the whole of what `curl --resolve` does.
*/
async function serving(host) {
  const resolver = new Resolver();
  resolver.setServers(['1.1.1.1', '8.8.8.8']);
  const [address] = await resolver.resolve4(host);

  const body = await new Promise((resolve, reject) => {
    const req = request(
      { host: address, servername: host, headers: { Host: host }, path: '/', timeout: 8000 },
      (res) => {
        let text = '';
        res.on('data', (c) => { text += c; });
        res.on('end', () => resolve(text));
      },
    );
    req.on('timeout', () => req.destroy(new Error('timeout')));
    req.on('error', reject);
    req.end();
  });
  return body.includes('"ok":true');
}

async function waitUntilServing(host, tries = 20) {
  for (let i = 0; i < tries; i++) {
    try {
      if (await serving(host)) return true;
    } catch {
      // not up yet, or not resolvable yet
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  return false;
}

const PORT = await pickPort(+(process.env.PORT ?? 8787));

const relay = spawn('node', ['server/index.js'], {
  env: { ...process.env, PORT },
  stdio: ['ignore', 'inherit', 'inherit'],
});

const tunnel = spawn('cloudflared', ['tunnel', '--url', `http://localhost:${PORT}`]);

let announced = false;
const watch = async (chunk) => {
  const found = String(chunk).match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
  if (!found || announced) return;
  announced = true;

  const host = found[0].replace('https://', '');
  const link = `${SITE}/?epoch=${room.epoch}&seed=${room.seed}&server=wss://${host}`;

  process.stdout.write('\n  waiting for the tunnel to answer');
  const ready = await waitUntilServing(host);
  process.stdout.write('\n');

  if (!ready) {
    console.log(`
  The tunnel never started answering. The relay is running on :${PORT} and the
  address is ${found[0]} — worth a look before sending anyone anything.
`);
    return;
  }

  console.log(`
  relay   ${found[0]}  (serving, on :${PORT})
  room    ${room.epoch} · ${room.seed}${room.reused ? '  (the one you came back to)' : ''}

  Send this:

  ${link}

  Everyone who opens it lands on the same island, in the same weather, and
  can see each other. It stops working when you stop this — the tunnel takes
  a new address every time, so tomorrow needs a new link.

  Same island tomorrow:  npm run play -- "${link}"
`);
};
tunnel.stdout.on('data', watch);
tunnel.stderr.on('data', watch);

const stop = () => {
  relay.kill();
  tunnel.kill();
  process.exit(0);
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
