import * as THREE from 'three';
import { TILES, PALETTE } from './art.js';
import { bitmapTexture } from './voxel.js';

/*
  What Amy has put out before you get there.

  She says she is always early and calls it a terrible habit, and until now that
  was only a line — you walked up to a woman standing on bare sand. This is the
  line made true: a blanket laid out on the beach and at the lagoon, and the
  table laid for two indoors. You never see her do it. You arrive and it is
  already done, which is the whole point of her being early.

  Three rules hold these together, and they are what keeps a prop from reading
  as scenery that happened to be lying about:

  - They are hers, not the world's. Everything here is built once, hidden, and
    shown only while she is standing at that spot — see story.js, which owns the
    state and does the showing. They arrive when she does and go when she goes.
    Nothing is left on the beach afterwards.

  - They are laid out around where she stands rather than beside it, so walking
    up to her puts you on the blanket too. A blanket you cannot get onto is a
    picture of a date rather than one.

  - Nothing here is solid. None of it registers with tileOccupied, so none of it
    can block her exit walk or wedge the player against the water. A candle you
    can walk through is a far better bug than a doorway you cannot leave by.
*/

/*
  A tenth of a tile up, which is enough to beat the ground and not enough to
  read as floating. The ground under both spots is flat — sand, and the end of
  the road, both at height 0 — so one plane does for the whole thing rather than
  a strip per tile.
*/
const LIFT = 0.02;

/**
 * The blanket: `w` tiles across, `d` deep, centred on the world point (cx, cz).
 *
 * Placed by its centre rather than by her tile, which is worth the small
 * awkwardness at the call site. A tile is a square of the world from n to n+1
 * and a character stands at its middle, n + 0.5 — so "under her, but reaching
 * a bit further back because there is water in front" is a sentence about
 * halves of tiles, and every way of saying it in whole tiles was a rule with an
 * exception. The centre is one number, it is exact, and the caller can work it
 * out against whatever it has to clear.
 */
export function blanket(scene, { cx, cz, w, d }) {
  const group = new THREE.Group();

  const tex = bitmapTexture(TILES.blanket, { repeat: 1 });
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(w, d),
    new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95 }),
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(cx, LIFT, cz);
  mesh.receiveShadow = true;
  group.add(mesh);

  group.visible = false;
  scene.add(group);
  return group;
}

/*
  The table, laid.

  Everything sits at the height of the tabletop, which is the table box (0.62)
  plus its lip (0.06). That number is worked out in interior.js and is not
  exported, because nothing else has ever needed to put anything down — so it is
  written here as well, and this is the one place it would go wrong if the table
  were ever rebuilt taller.
*/
const TOP = 0.68;

/** A flat disc of a thing on the table — a plate. */
function plate(x, z) {
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.19, 0.17, 0.035, 12),
    new THREE.MeshStandardMaterial({ color: new THREE.Color(PALETTE.m), roughness: 0.55 }),
  );
  mesh.position.set(x, TOP + 0.018, z);
  mesh.castShadow = mesh.receiveShadow = true;
  return mesh;
}

/**
 * A candle: a stick, and a flame that is its own small light.
 *
 * The flame is emissive *and* carries a point light, which is one more light
 * than this scene otherwise spends on anything but the sun, the player's
 * lantern and the fireworks. It earns it: the dinner is the one date that
 * happens indoors, the room is lit by a sun it cannot see, and an unlit candle
 * on a dark table is a small grey stick. The light is deliberately weak and
 * short-range — it is there to put a warm edge on the two of them across the
 * table, not to light the room.
 */
function candle(x, z) {
  const group = new THREE.Group();

  const stick = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.055, 0.26, 8),
    new THREE.MeshStandardMaterial({ color: new THREE.Color(PALETTE.m), roughness: 0.7 }),
  );
  stick.position.set(x, TOP + 0.13, z);
  stick.castShadow = true;
  group.add(stick);

  const flame = new THREE.Mesh(
    new THREE.ConeGeometry(0.038, 0.11, 8),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(PALETTE.y), fog: false }),
  );
  flame.position.set(x, TOP + 0.31, z);
  group.add(flame);

  const light = new THREE.PointLight(0xffc46a, 1.5, 4.2, 2);
  light.position.set(x, TOP + 0.34, z);
  group.add(light);

  return group;
}

/**
 * Two plates and a candle between them, on the near edge of the long table.
 *
 * The near edge, because the camera looks from the south and the far row would
 * be read through whatever is standing on the near one. Two plates rather than
 * six: the table seats six and there are two of you, and the empty four are the
 * point — she has laid it for exactly the number of people she is expecting.
 *
 * @param room the interior, for its group and its corner — these are its
 *             children, so they inherit its visibility and are not drawn at all
 *             while you are outside
 * @param at   tiles within the room to put things on
 */
export function tableSetting(room, { plates, flame }) {
  const group = new THREE.Group();
  for (const [x, z] of plates) group.add(plate(room.x0 + x + 0.5, room.z0 + z + 0.5));
  group.add(candle(room.x0 + flame[0] + 0.5, room.z0 + flame[1] + 0.5));
  group.visible = false;
  room.group.add(group);
  return group;
}
