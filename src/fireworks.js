import * as THREE from 'three';
import { FIREWORK } from './art.js';
import { voxelGeometry } from './voxel.js';

/*
  A firework show: a dozen shells going up over wherever you are standing, once,
  and then nothing.

  Everything else that appears in the sky in this game is weather — rain, gusts,
  lightning — and weather is a *state* the world is in, rolled from the shared
  clock so that every machine is under the same sky without a word being sent.
  This is the opposite of that in every respect, and it is worth being clear
  about why rather than filing it next to the rain and hoping:

  A firework here is not something the island is doing. It is something that
  happened in one conversation, to one person, at the moment they got to the end
  of it — so it is fired by a cue in a script, it is centred on that player, and
  it is deliberately not on the wire. Somebody else standing on the same beach
  does not see it, and should not: they were not in the conversation.

  The shells are the same 16x16 pixel art as everything else, extruded and stood
  upright facing the camera, which is fixed — so there is no billboarding to do.
  They are drawn with a basic material rather than a lit one because a firework
  emits its own light; a shell shaded by a sun that set two hours ago would be a
  grey smudge exactly when the show is most worth having.
*/

// Colour is a multiply over the bitmap's own shading — see FIREWORK in art.js.
// Every one of these is bright enough to read against a noon sky, since the
// story does not get to choose what hour you finish it at.
const COLOURS = [0xffd45a, 0xff7ab0, 0x8fe4ff, 0xc79cff, 0xfff2cc];

const SHELLS = 12;
const LIFE = 1.5;             // seconds from bloom to gone
const BLOOM = 0.16;           // ...of which this much is the shell opening
const EMBERS = 0.42;          // and after this it is the falling sprite
/*
  A fully-open shell, in tiles across. 2.2 over a 16-pixel bitmap puts a firework
  pixel at a shade over two world pixels — chunkier than the ground and the
  sprites, which is on purpose for something this bright, but close enough that
  it still belongs to the same grid. The first pass at this was 3.8 and read as
  a handful of pale rectangles: past about double, the shape stops being a
  starburst and becomes its own blocks.
*/
const SIZE = 2.6;

/*
  Where a shell hangs, and this is the whole difficulty of the effect.

  There is no sky on screen. The camera is locked at a 46° pitch looking down
  from twenty-three tiles back, and its 32° frame is entirely full of ground:
  the top edge of the picture is the island about fourteen tiles ahead of you,
  and everything above that — the horizon, the actual sky, anything you would
  naturally hang a firework in — is off the top of the screen. Sending shells up
  where fireworks belong puts on a show nobody can see, which is exactly what
  the first version of this did.

  So they go up where they can be watched: a close arc overhead, five to eleven
  tiles up and slightly toward the camera, which lands them in the upper third of
  the frame with the dark night ground behind them. Read on screen it is a
  firework going off over your head rather than one a mile out to sea, and given
  a camera that cannot look up, over your head is the better of the two anyway.

  The arrangement itself is fixed rather than sampled. A show is a set piece —
  it wants to look composed — and the one thing an unseeded Math.random() here
  would reliably buy is the run where five of the twelve land on top of each
  other. Shells alternate sides so the eye is pulled across the frame, climb as
  the show goes on, and the whole arc is nudged by where it was fired from so
  two shows on the same beach are not stamped down in the same place.
*/
const SPREAD = 3.6;           // half the width of the arc, on screen

/**
 * How high a shell has to be to sit in the top third of the frame, given how
 * far toward the camera it is.
 *
 * Measured off the real camera rather than derived: with the fixed 46° pitch,
 * a shell moved one tile nearer the viewer has to climb about 0.72 of a tile to
 * hold its place on screen, and z = 2 wants a height of 6.3. `lift` is then a
 * pure vertical offset in the picture — about a tenth of the frame per tile —
 * which is what the arrangement below uses to fan the shells out.
 *
 * If the camera pitch or distance in main.js ever changes, this is the line
 * that has to be re-measured. It is the only thing here that knows about them.
 */
const heightAt = (z, lift) => 6.3 + 0.72 * (z - 2) + lift;

const PATTERN = Array.from({ length: SHELLS }, (_, i) => {
  const t = i / (SHELLS - 1);
  const side = i % 2 ? 1 : -1;
  // three depths, cycled: nearer shells read larger, which is the only sense of
  // distance a show packed into six tiles of sky is going to get
  const z = 1 + 3.5 * (i % 3);
  return {
    // Out from the middle, alternating, and widest through the middle of the
    // show. Narrowed for the nearer shells by how much closer to the camera they
    // are (which is 13.9 tiles back from z = 2), because a tile of sideways at
    // arm's length is a great deal more of the screen than a tile of sideways
    // further off, and without this the near ones fly out past the edges.
    x: side * SPREAD * (0.28 + 0.72 * Math.sin(t * Math.PI)) * (15.9 - z) / 13.9,
    y: heightAt(z, 1.4 * Math.sin(t * Math.PI * 1.7) + 1.8),
    z,
    at: t * 3.4 + (i % 3) * 0.11,          // when it goes off
    scale: 0.72 + 0.28 * ((i * 7) % 5) / 4,
    colour: COLOURS[i % COLOURS.length],
  };
});

export class Fireworks {
  constructor(scene) {
    // One geometry per stage, shared by every shell. They differ only in colour,
    // and colour lives on the material.
    // Sprite geometry is built standing on its origin, which is right for a
    // person and wrong for an explosion: a shell wants to open *around* the
    // point it reached, not on top of it. Drop it half its height so position
    // means centre.
    const build = (rows) => {
      const g = voxelGeometry(rows, { pixel: SIZE / 16, depth: 2, shade: false });
      g.translate(0, -SIZE / 2, 0);
      g.computeBoundingSphere();
      return g;
    };
    const geo = { bloom: build(FIREWORK.bloom), embers: build(FIREWORK.embers) };
    this.geo = geo;

    this.group = new THREE.Group();
    this.group.visible = false;
    scene.add(this.group);

    this.shells = PATTERN.map((spec) => {
      const mat = new THREE.MeshBasicMaterial({
        vertexColors: true,
        color: new THREE.Color(spec.colour),
        transparent: true,
        // Additive, because burning things add light to what is behind them
        // rather than replacing it. It is what turns a flat pink cutout into
        // something that looks lit from inside, and it makes overlapping shells
        // brighten each other instead of one of them simply winning.
        blending: THREE.AdditiveBlending,
        depthWrite: false,           // shells overlap; none of them owns the sky
        fog: false,
      });
      const mesh = new THREE.Mesh(geo.bloom, mat);
      mesh.visible = false;
      this.group.add(mesh);
      return { spec, mesh, mat };
    });

    // One light for the whole show rather than one per shell: from the ground
    // what a firework does is wash everything a colour for half a second, and
    // twelve lights would say that no better and cost twelve times as much.
    this.light = new THREE.PointLight(0xffffff, 0, 30, 2);
    this.group.add(this.light);

    this.t = 0;
    this.running = false;
  }

  /** Start a show centred over `at`, a world position. */
  start(at) {
    this.at = at.clone();
    // Never twice in the same place: the origin is nudged by the position it was
    // fired from, so two shows on the same beach do not overlay each other.
    this.drift = (at.x * 0.37 + at.z * 0.21) % 3 - 1.5;
    this.t = 0;
    this.running = true;
    this.group.visible = true;
    for (const { mesh } of this.shells) mesh.visible = false;
  }

  update(dt) {
    if (!this.running) return;
    this.t += dt;

    let glow = 0;
    let lit = null;

    for (const shell of this.shells) {
      const { spec, mesh, mat } = shell;
      const age = this.t - spec.at;
      if (age < 0 || age > LIFE) {
        mesh.visible = false;
        continue;
      }

      const k = age / LIFE;
      // Open fast, then keep drifting outwards as it fades — the drift is what
      // stops the fade reading as somebody turning a dimmer down.
      const open = age < BLOOM
        ? 0.15 + 0.95 * (age / BLOOM)
        : 1.1 + 0.35 * ((age - BLOOM) / (LIFE - BLOOM));
      const fade = age < BLOOM ? 1 : Math.pow(1 - (age - BLOOM) / (LIFE - BLOOM), 1.6);

      const geo = age < EMBERS ? this.geo.bloom : this.geo.embers;
      if (mesh.geometry !== geo) mesh.geometry = geo;

      mesh.visible = true;
      mat.opacity = fade;
      mesh.scale.setScalar(open * spec.scale);
      mesh.position.set(
        this.at.x + spec.x + this.drift,
        // it sags a little as it dies, which is most of what sells it as
        // something that was thrown up there rather than switched on
        this.at.y + spec.y - k * k * 1.6,
        this.at.z + spec.z,
      );

      if (fade > glow) { glow = fade; lit = shell; }
    }

    if (lit) {
      this.light.position.copy(lit.mesh.position);
      this.light.color.setHex(lit.spec.colour);
      this.light.intensity = glow * glow * 16;
    } else {
      this.light.intensity = 0;
    }

    // The last shell to go up plus its own lifetime, and then the sky is a sky
    // again. Nothing else has to be told; it simply stops being drawn.
    if (this.t > PATTERN[SHELLS - 1].at + LIFE) {
      this.running = false;
      this.group.visible = false;
    }
  }
}
