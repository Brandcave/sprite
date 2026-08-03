import { spawn } from 'node:child_process';

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
const PORT = process.env.PORT ?? 8787;

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

const relay = spawn('node', ['server/index.js'], {
  env: { ...process.env, PORT },
  stdio: ['ignore', 'inherit', 'inherit'],
});

const tunnel = spawn('cloudflared', ['tunnel', '--url', `http://localhost:${PORT}`]);

let announced = false;
const watch = (chunk) => {
  const found = String(chunk).match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
  if (!found || announced) return;
  announced = true;

  const host = found[0].replace('https://', '');
  const link = `${SITE}/?epoch=${room.epoch}&seed=${room.seed}&server=wss://${host}`;

  console.log(`
  relay   ${found[0]}
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
