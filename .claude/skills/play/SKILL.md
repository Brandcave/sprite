---
name: play
description: Start the multiplayer relay for this game and hand back a link to send people. Use whenever the user wants to play with friends, share the game, open a room, get a link, or stop a session that is running.
---

# Opening the island to other people

The page is deployed to Vercel as static files. The relay is not deployed
anywhere — it runs on this laptop behind a tunnel, and its address travels in
the link. So "share the game" means: start the relay, wait for it to be
reachable, hand over one finished link.

`npm run play` does the mechanics. This is about running it on the user's
behalf and reporting the result, since the command is long-lived and its output
arrives a while after it starts.

## Starting a session

Run it in the background and read the log, rather than waiting on the command —
it never exits by design.

```bash
cd /Users/codymiles/Desktop/sprite-2
rm -f /tmp/play.log
(npm run play > /tmp/play.log 2>&1 &)
```

To return to the same island as a previous session, pass its link. Only the room
is taken from it; the relay address in an old link died with its tunnel:

```bash
(npm run play -- "<the old link>" > /tmp/play.log 2>&1 &)
```

Then wait for it to be ready. It prints the link only once the tunnel is
answering, so nothing is ready before this appears:

```bash
for i in $(seq 1 45); do grep -qE "Send this|never started" /tmp/play.log && break; sleep 1; done
sed -n '/relay  /,/Same island/p' /tmp/play.log
```

Give the user the link verbatim, and tell them it dies when the session stops.

## Checking on it, and stopping it

```bash
pgrep -f "scripts/play.mjs" >/dev/null && echo running || echo stopped
pkill -f "scripts/play.mjs"; pkill -f "cloudflared tunnel"; pkill -f "node server/index.js"
```

Stopping does not break anything for anybody still in the room — the game
treats being alone as a normal outcome, so their island quietly goes back to
single player.

## Things that will mislead you

**Do not verify the tunnel with a plain `curl`.** This machine's resolver is
Tailscale's MagicDNS, which returns NXDOMAIN for `trycloudflare.com` while the
rest of the world resolves it fine. Chrome is unaffected — it uses its own
secure DNS — so the browser is a truthful test and `curl` is not. If you must
check from the shell, bypass DNS the way the script does:

```bash
curl --resolve <host>:443:$(dig +short @1.1.1.1 <host> | head -1) https://<host>/
```

A healthy relay answers `{"ok":true,"rooms":[...]}`.

**A link with no room on it is not a shareable link.** The page mints a fresh
room in any browser that arrives without one, so the same roomless link sends
four people to four separate islands — each looking perfectly correct, each
empty. `npm run play` always prints a finished link; do not hand over a
hand-assembled one that is missing `epoch` and `seed`.

**An empty island is the failure mode, not an error.** Every way this can break
— dead tunnel, stopped relay, wrong room, laptop asleep — looks identical to
playing alone, because being alone is legitimate. The HUD saying `alone` rather
than `NAME · n here` is the only tell. So confirm a session works rather than
assuming it does.

## Confirming it actually works

Worth doing before handing the link over, if the browser tools are available.
Open the printed link and read the HUD:

```js
await new Promise(r => setTimeout(r, 4000));
({ online: net.online, hud: document.getElementById('net').textContent })
```

`online: true` and a HUD reading `NAME · 1 here · NNms` means it is live.
