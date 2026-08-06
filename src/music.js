/*
  Background music: one song, looped forever with a crossfade at the seam.

  An <audio loop> tag can't do this — it rejoins the start with a hard cut (and
  on some browsers a gap). So the song is decoded into an AudioBuffer and each
  pass through it is its own BufferSource: while one pass plays its final FADE
  seconds and ramps out, the next pass has already started ramping in on top of
  it. Scheduling rides the AudioContext clock, with a setTimeout that only has
  to wake up *near* the seam — the sample-accurate part is done by the ramps.

  It should be playing over the title screen, and mostly it can be: the
  context is created and the song fetched and decoded the moment the page
  loads, and if the browser permits autoplay — it does for a site it trusts —
  the music simply starts, card up, nothing pressed. A browser that refuses
  leaves the context suspended rather than erroring, so the fallback is to
  resume it on the first gesture of any kind. Those listeners are registered
  here, synchronously, before the title screen builds its own keydown handler
  — the card stops a press dead once it has seen it, and the resume must
  already have happened by then. Either way the song is decoded and waiting,
  and begins the instant it is allowed to.
*/

const FADE = 2.5;       // seconds of overlap at the loop seam
const VOLUME = 0.35;    // background music, not a concert

export function startMusic(url) {
  const ctx = new AudioContext();

  const resume = () => ctx.resume().catch(() => {});
  addEventListener('keydown', resume);
  addEventListener('pointerdown', resume);
  ctx.addEventListener('statechange', () => {
    if (ctx.state !== 'running') return;
    removeEventListener('keydown', resume);
    removeEventListener('pointerdown', resume);
  });

  play(ctx, url).catch(() => {});   // no music is not worth breaking the game over
}

async function play(ctx, url) {
  const master = ctx.createGain();
  master.gain.value = VOLUME;
  master.connect(ctx.destination);

  const data = await (await fetch(url)).arrayBuffer();
  const buffer = await ctx.decodeAudioData(data);
  const period = Math.max(buffer.duration - FADE, FADE);

  // Nothing is scheduled against a suspended clock — currentTime is frozen
  // while blocked, and a pass started against it would be stale by the time
  // the context wakes. resume() is retried here too: on a browser that allows
  // autoplay it succeeds outright and no gesture is ever needed.
  if (ctx.state !== 'running') {
    await new Promise((ready) => {
      ctx.addEventListener('statechange', function armed() {
        if (ctx.state !== 'running') return;
        ctx.removeEventListener('statechange', armed);
        ready();
      });
      ctx.resume().catch(() => {});
    });
  }

  // Start one pass at `when` (context time). The very first pass skips the
  // fade-in — the song should just begin — every later one rises out of the
  // previous pass's tail.
  const passAt = (when, fadeIn) => {
    const gain = ctx.createGain();
    gain.connect(master);
    if (fadeIn) {
      gain.gain.setValueAtTime(0, when);
      gain.gain.linearRampToValueAtTime(1, when + FADE);
    } else {
      gain.gain.setValueAtTime(1, when);
    }
    const end = when + buffer.duration;
    gain.gain.setValueAtTime(1, end - FADE);
    gain.gain.linearRampToValueAtTime(0, end);

    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.connect(gain);
    src.start(when);
    src.onended = () => gain.disconnect();

    // Wake up a second before the seam to schedule the next pass; the ramps
    // above make the actual handoff exact regardless of timer jitter.
    const next = when + period;
    setTimeout(() => passAt(next, true), (next - ctx.currentTime - 1) * 1000);
  };

  passAt(ctx.currentTime, false);
}
