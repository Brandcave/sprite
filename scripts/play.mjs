import { spawn } from 'node:child_process';

/*
  Open the island to other people for as long as this is running.

  The deployed page is static files on a CDN, which is all it needs to be — the
  world is a function of the seed in its URL, so the weather and the villagers
  and the clock all work with no server at all. The one thing that cannot be
  computed from a seed is other people, and carrying them needs a socket held
  open, which a CDN cannot do.

  So: the relay runs here, a tunnel gives it a public address, and the address
  travels in the link you send. Nothing is deployed and nothing is paid for, and
  when you close this the island goes back to being single player rather than
  broken — which is the whole reason the game treats being alone as a normal
  outcome rather than an error.
*/

const SITE = process.env.SITE ?? 'https://sprite-rho.vercel.app';
const PORT = process.env.PORT ?? 8787;

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
  console.log(`
  relay   ${found[0]}
  send    ${SITE}/?server=wss://${host}

  Open that, and the room you land in is written into the address bar —
  epoch, seed and all. Send people what you see there rather than the line
  above, or they arrive on a different island on the same day.
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
