---
name: play
description: Start the multiplayer relay for this game and hand back a link to send people. Use whenever the user wants to play with friends, share the game, open a room, get a fresh link, work out why nobody is showing up, or stop a session that is running.
---

# Opening the island to other people

The page is deployed to Vercel as static files. The relay is not deployed
anywhere — it runs on this laptop behind a tunnel, and its address travels in
the link. So "share the game" means: start the relay, wait until it is genuinely
reachable, hand over one finished link.

`npm run play` owns the mechanics: it picks a free port, waits until the tunnel
answers before printing anything, copies the link to the clipboard, and takes a
new address if the old one dies. This file is about running it on the user's
behalf and reporting honestly, because the command never exits and every way it
fails looks like ordinary solitude.

## The one thing to understand first

**Every failure here looks identical to playing alone.** Dead link, sleeping
laptop, changed network, withdrawn tunnel name, truncated URL, wrong room — all
of them open a perfectly normal island with nobody on it, because being alone is
a legitimate outcome the game supports on purpose. Nothing throws. Nothing goes
red.

So never infer that a session is working, and do not ask the user to tell you
either. **There is no connection indicator in the game.** There was one — a HUD
reading `ROWAN · 1 here · 296ms`, or `alone` — and it was taken out in 6466313,
"The clock tells the time and nothing else". Only the clock is left. Anything in
this file or in a code comment that tells you to read a HUD is describing a
version of the game that no longer exists.

What that leaves:

- **Ask the relay.** It is the only authority, it is one curl, and it can tell
  the difference between the three states that matter. See the block below.
- **The minimap**, for the user. Another player is a *large* dot in their own
  colour; villagers are small teal ones and Amy is rose. So "is he here yet" is
  "is there a second big dot". Two caveats worth saying out loud: the minimap is
  hidden indoors, and it only draws where that player has already uncovered
  ground, so a friend who has just landed somewhere they have not walked yet is
  genuinely not on it.

Never make the user the instrument. Asking someone to interpret an empty island
is asking them to guess, and their guess and yours will both be wrong.

## Starting a session

It never exits, so run it in the background and read the log.

```bash
cd /Users/codymiles/Desktop/sprite-2
rm -f /tmp/play.log
(npm run play > /tmp/play.log 2>&1 &)
```

To keep the same island as a previous session, pass its link — only the room is
taken from it, the relay address in an old link is dead by definition:

```bash
(npm run play -- "<the old link>" > /tmp/play.log 2>&1 &)
```

Wait for readiness. The link is printed only once the tunnel answers, so nothing
before this line means anything:

```bash
for i in $(seq 1 50); do grep -qE "Copied to your clipboard|never started" /tmp/play.log && break; sleep 1; done
sed -n '/relay  /,/npm run play/p' /tmp/play.log
```

Then tell the user it is on their clipboard, and give the link in a fenced code
block, on its own line, exactly as printed. **Never re-indent or re-wrap it.** A
wrapped line does not survive being copied — it comes away with the tail missing
and nothing to say so, and the truncated URL then fails by looking like an empty
island. This cost a real evening.

## When they say the link stopped working

Almost always the laptop slept or changed network. A quick tunnel does not keep
its name across either, so the address in their link stops existing while every
process here stays up and healthy.

Diagnose before restarting — a restart invalidates the link they are holding, so
do not do it reflexively:

```bash
cd /Users/codymiles/Desktop/sprite-2
LINK=$(grep -oE 'https://sprite-rho\.vercel\.app/\?epoch=[0-9]+&seed=[0-9]+&server=wss://[a-z0-9-]+\.trycloudflare\.com' /tmp/play.log | tail -1)
H=$(echo "$LINK" | grep -oE '[a-z0-9-]+\.trycloudflare\.com')
IP=$(dig +short @1.1.1.1 "$H" | head -1)
echo "$H -> ${IP:-DEAD, no longer resolves}"
[ -n "$IP" ] && curl -s --max-time 12 --resolve "$H:443:$IP" "https://$H/"
```

- `{"ok":true,"rooms":[...]}` — the relay is fine and the link works. The
  problem is at their end: an older link. Ask them to paste what is actually in
  their address bar; there are usually several dead links in the conversation
  and only the newest works.
- Unresolvable, or no answer — the address is gone. Restart, passing the old
  link so they keep their island.

`rooms` also answers "has anybody joined?" — `[]` means nobody has connected
at all, `"players":2` means two people are in. That distinguishes "they have not
clicked yet" from "something is broken", which guessing from an empty island
cannot.

**Check the room key, not just that a room exists.** The key is `epoch:seed`,
and it has to match the link the user is actually holding. A running session
serving `1785809379008:3482809601` while they are on a link for
`1785788722648:2312858667` is two people in two different worlds with every
process healthy — and `rooms` is non-empty the whole time, so a glance at it
says everything is fine. Compare the numbers.

**A running session is not a working one.** `pgrep -f scripts/play.mjs` finding
something proves only that the script is alive, and its whole job is to survive
failure by taking a new address. It will sit in a loop — new address, fail its
own readiness check, new address — indefinitely. Read the tail of the log, not
the process list:

```bash
tail -20 /tmp/play.log
```

Repeated `the address stopped answering — taking a new one` with no link after
it is that loop. Before restarting into the same hole, check whether the pieces
work on their own — this loop has been the script's probe failing while
cloudflared and DNS were both fine:

```bash
cloudflared tunnel --url http://localhost:8787 --no-autoupdate > /tmp/cft-probe.log 2>&1 &
sleep 18; grep -E "trycloudflare.com|ERR|failed" /tmp/cft-probe.log | head
```

A hostname and `Registered tunnel connection` means cloudflared is healthy and
the fault is the script's; kill the probe and restart the session cleanly.

## Verifying it yourself

Do not open the link in a browser to check it. A verification tab is a real
player standing in their world, it inflates the count so the one other person
they see is you, and it is easy to walk away and leave it there.

Connect the way the game does instead — a real `wss://` upgrade into the exact
room from the link, which is the thing that has to work and the one thing the
curl above does not prove. It disconnects itself:

```bash
cd /Users/codymiles/Desktop/sprite-2
node -e "
import('ws').then(({default: WS}) => {
  const ws = new WS('wss://<host>.trycloudflare.com?epoch=<epoch>&seed=<seed>');
  const t = setTimeout(() => { console.log('TIMEOUT'); process.exit(1); }, 15000);
  ws.on('open', () => console.log('wss upgrade: OK'));
  ws.on('message', m => { console.log(m.toString()); clearTimeout(t); ws.close(); setTimeout(()=>process.exit(0), 300); });
  ws.on('error', e => { console.log('ERROR:', e.message); process.exit(1); });
});
"
```

`wss upgrade: OK` followed by a `{"t":"welcome",...}` is a verified link. HTTP
answering while the upgrade fails is a real shape of failure — the tunnel is
fine and the game still cannot connect — and only this catches it.

## Stopping, and checking

```bash
pgrep -f "scripts/play.mjs" >/dev/null && echo running || echo stopped
pkill -f "scripts/play.mjs"; pkill -f "cloudflared tunnel"; pkill -f "node server/index.js"
```

Stopping strands nobody: everyone still in the room quietly returns to single
player.

## Traps

**`curl` cannot resolve `trycloudflare.com` on this machine.** Tailscale's
MagicDNS returns NXDOMAIN for it while the rest of the world resolves it fine.
Chrome is unaffected — it uses its own secure DNS — so the browser is a truthful
test and a bare `curl` is not. Use the `--resolve` form above, which is what the
script does internally.

**A link without a room is not shareable.** The page mints a fresh room in any
browser arriving without one, so the same roomless link sends four people to
four separate islands. Always hand over what the script printed; never assemble
one by hand.

**Do not restart to "refresh" things.** Each restart kills the address the user
is holding. Restart only when the address is confirmed dead.

## The permanent fix, if it comes up

All of this churn exists because a quick tunnel is disposable — it says so on
the way up. Tailscale Funnel would give a fixed address
(`codys-macbook-pro-1.tail88db8.ts.net`) to set once as `VITE_RELAY` in Vercel,
after which plain `sprite-rho.vercel.app` works forever, survives sleep, and
needs no query string. It needs two one-time toggles the user must click:

- https://login.tailscale.com/f/serve?node=ng91H44XZu11CNTRL
- https://login.tailscale.com/f/funnel?node=ng91H44XZu11CNTRL

Offer it once. Do not keep raising it while they are trying to play.
