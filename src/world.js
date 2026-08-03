import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { TILES, PROPS, BUILDING, TREE_VOLUME } from './art.js';
import {
  bitmapTexture, voxelGeometry, flatVoxelGeometry, voxelMaterial,
  vertexEmissive, windMaterial, volumeGeometry,
} from './voxel.js';

/*
  Legend
    .  grass          ,  path            ~  water/sea    _  beach sand
    T  tree           f  flower bed      "  tall grass   #  fence
    s  sign           o  rock            c  pond curb     X  building footprint

  The grid is the island; open sea past the shoreline is a single large plane
  (see 'ocean' below) so the horizon is not the edge of the tile map.
*/
const MAP = [
  '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
  '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
  '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
  '~~~~~~~~~~~~~~~~~~~~~~__________________~~~~~~~~~~~~~~~~~~~~~~',
  '~~~~~~~~~~~~~~~~~_____________________________~~~~~~~~~~~~~~~~',
  '~~~~~~~~~~~~~____________________________________~~~~~~~~~~~~~',
  '~~~~~~~~~~~________________________________________~~~~~~~~~~~',
  '~~~~~~~~~~__________________________________________~~~~~~~~~~',
  '~~~~~~~~~____________________________________________~~~~~~~~~',
  '~~~~~~~~______________________________________________~~~~~~~~',
  '~~~~~~~_________________..._______T____________________~~~~~~~',
  '~~~~~~_______________......,,,,,,.......T.T____________~~~~~~~',
  '~~~~~~___________..T.......,,,,,,....TT.....T___________~~~~~~',
  '~~~~~___________....T......,,,,,,...........T____________~~~~~',
  '~~~~~__________............,,,,,,..........o..___________~~~~~',
  '~~~~~_________T....XXXXXXX.,,,,,,...XXXXXXX...TT__________~~~~',
  '~~~~_________......XXXXXXX.,,,,,,...XXXXXXX.....T_________~~~~',
  '~~~~________TT.T...XXXXXXX.,,,,,,...XXXXXXX......_________~~~~',
  '~~~~________.......XXXXXXX.,,,,,,...XXXXXXX.......________~~~~',
  '~~~~________.T......,,,,,..,,,,,,....,,,,,........________~~~~',
  '~~~~________T.........,,,,,,,,,,,,,,,,,,..........________~~~~',
  '~~~_________T......s..,,,,,,cccc,,,,,,,,..s......T________~~~~',
  '~~~_________..........,,,,,c~~~~c,,,,,,...........________~~~~',
  '~~~_________T.....fff.,,,,,c~~~~c,,,,,,.fff......T_________~~~',
  '~~~_________......fff.,,,,,c~~~~c,,,,,,.fff......T_________~~~',
  '~~~_________......fff.,,,,,c~~~~c,,,,,,.fff.....T._________~~~',
  '~~~_________..........,,,,,,cccc,,,,,,,..........._________~~~',
  '~~~________.TT.............,,,,,,................._________~~~',
  '~~~________......""""""....,,,,,,....""""""......._________~~~',
  '~~~________......""""""....,,,,,,....""""""......T_________~~~',
  '~~~________......""""""....,,,,,,....""""""......._________~~~',
  '~~~________................,,,,,,.......o..........________~~~',
  '~~~~_______.T......######..,,,,,,..######.......T..________~~~',
  '~~~~________.T.............,,,,,,................T._______~~~~',
  '~~~~________...............,,,,,,.................._______~~~~',
  '~~~~________.........______,,,,,,______...........________~~~~',
  '~~~~_________........_~~~~~~~~~~~~~~~~_..........T________~~~~',
  '~~~~_________........_~~~~~~~~~~~~~~~~_.........._________~~~~',
  '~~~~_________........_~~~~~~~~~~~~~~~~_.........._________~~~~',
  '~~~~__________......._~~~~~~~~~~~~~~~~_.........T_________~~~~',
  '~~~~___________T.....__________________.........__________~~~~',
  '~~~~~__________................................__________~~~~~',
  '~~~~~___________..........................T..____________~~~~~',
  '~~~~~~___________...TT.......T.T.......T....____________~~~~~~',
  '~~~~~~_______________.T........T...T..TT..______________~~~~~~',
  '~~~~~~~________________________.T...T__________________~~~~~~~',
  '~~~~~~~~______________________________________________~~~~~~~~',
  '~~~~~~~~______________________________________________~~~~~~~~',
  '~~~~~~~~~~__________________________________________~~~~~~~~~~',
  '~~~~~~~~~~~________________________________________~~~~~~~~~~~',
  '~~~~~~~~~~~~~____________________________________~~~~~~~~~~~~~',
  '~~~~~~~~~~~~~~~~~______________________________~~~~~~~~~~~~~~~',
  '~~~~~~~~~~~~~~~~~~~~_____________________~~~~~~~~~~~~~~~~~~~~~',
  '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
  '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
  '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
];

export const MAP_W = MAP[0].length;
export const MAP_H = MAP.length;

// Which tile texture sits under each map character, and how high its top is.
const GROUND = {
  '.': { tile: 'grass', h: 0.0 },
  T: { tile: 'grass', h: 0.0 },
  ',': { tile: 'path', h: 0.0 },
  c: { tile: 'stone', h: 0.32 },   // raised curb — a lip you step around, not into
  _: { tile: 'sand', h: 0.0 },
  '~': { tile: 'water', h: -0.28 },
  f: { tile: 'grass', h: 0.0 },
  '"': { tile: 'grass', h: 0.0 },
  '#': { tile: 'grass', h: 0.0 },
  s: { tile: 'grass', h: 0.0 },
  o: { tile: 'grass', h: 0.0 },
  X: { tile: 'stone', h: 0.0 },
};

const SOLID = new Set(['T', '~', '#', 's', 'o', 'X', 'c']);

export function tileAt(x, z) {
  if (x < 0 || z < 0 || x >= MAP_W || z >= MAP_H) return 'T';
  return MAP[z][x];
}

export function isBlocked(x, z) {
  return SOLID.has(tileAt(x, z));
}

export function groundHeight(x, z) {
  return GROUND[tileAt(x, z)]?.h ?? 0;
}

/** Deterministic per-tile jitter so props do not look stamped from a grid. */
function rand(x, z, salt = 0) {
  const n = Math.sin(x * 127.1 + z * 311.7 + salt * 74.7) * 43758.5453;
  return n - Math.floor(n);
}

export function buildWorld(scene) {
  const world = new THREE.Group();
  scene.add(world);

  const animated = [];

  /* ------------------------------------------------------------ ground slabs */
  const byTile = new Map();
  for (let z = 0; z < MAP_H; z++) {
    for (let x = 0; x < MAP_W; x++) {
      // Water tiles get no box at all — the ocean plane below is the single
      // water surface for the sea, the lagoon and the pond alike. Emitting
      // tiles too would leave a seam where the grid ends and the plane begins.
      if (tileAt(x, z) === '~') continue;
      const g = GROUND[tileAt(x, z)] ?? GROUND['.'];
      const depth = 1.0 + g.h;
      const box = new THREE.BoxGeometry(1, depth, 1);
      box.translate(x + 0.5, g.h - depth / 2, z + 0.5);
      if (!byTile.has(g.tile)) byTile.set(g.tile, []);
      byTile.get(g.tile).push(box);
    }
  }

  const waterMaterials = [];
  for (const [name, geos] of byTile) {
    const map = bitmapTexture(TILES[name]);
    const isWater = name === 'water';
    const mat = new THREE.MeshStandardMaterial({
      map,
      roughness: isWater ? 0.25 : 0.98,
      metalness: isWater ? 0.15 : 0.0,
    });
    if (isWater) waterMaterials.push(map);
    const mesh = new THREE.Mesh(mergeGeometries(geos), mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.name = `ground:${name}`;
    world.add(mesh);
  }

  /* ------------------------------------------------------------------ ocean */
  // One plane is every body of water in the scene — the sea, the lagoon and the
  // pond. It runs well past the fog far-plane so the sea reads as a horizon
  // rather than as an edge you can see the end of, and inland water is just this
  // same surface showing through a hole in the terrain.
  const OCEAN_SIZE = 420;
  const oceanTex = bitmapTexture(TILES.water);
  oceanTex.repeat.set(OCEAN_SIZE, OCEAN_SIZE);   // one texture tile per world unit
  oceanTex.minFilter = THREE.LinearMipmapLinearFilter;  // distant sea would shimmer
  oceanTex.anisotropy = 8;
  waterMaterials.push(oceanTex);

  const ocean = new THREE.Mesh(
    new THREE.PlaneGeometry(OCEAN_SIZE, OCEAN_SIZE),
    new THREE.MeshStandardMaterial({ map: oceanTex, roughness: 0.25, metalness: 0.15 }),
  );
  ocean.rotation.x = -Math.PI / 2;
  ocean.position.set(MAP_W / 2, GROUND['~'].h, MAP_H / 2);
  ocean.receiveShadow = true;
  ocean.name = 'ocean';
  world.add(ocean);

  if (waterMaterials.length) {
    animated.push((t) => {
      for (const m of waterMaterials) {
        m.offset.set(Math.sin(t * 0.35) * 0.04, (t * 0.06) % 1);
      }
    });
  }

  /* ------------------------------------------------------------------- props */
  const propBatches = new Map(); // key -> geometry list
  const push = (key, geo) => {
    if (!propBatches.has(key)) propBatches.set(key, []);
    propBatches.get(key).push(geo);
  };

  const px = 1 / 16;
  const FLOWER_H = 0.55;                // flower cluster height, in tiles

  for (let z = 0; z < MAP_H; z++) {
    for (let x = 0; x < MAP_W; x++) {
      const ch = tileAt(x, z);
      const cx = x + 0.5;
      const cz = z + 0.5;
      const y = groundHeight(x, z);

      if (ch === 'T') {
        // a real voxel volume, seeded per tile so every crown is a bit different
        const s = 1.85 + rand(x, z) * 0.35;
        const g = volumeGeometry({
          size: TREE_VOLUME.size,
          pixel: (px * s * 16) / TREE_VOLUME.size,
          colorAt: TREE_VOLUME.at(rand(x, z, 11) * 10),
        });
        g.rotateY(rand(x, z, 1) * Math.PI * 2);
        g.translate(cx, y, cz);
        push('tree', g);
      } else if (ch === 'f') {
        // knee-high so the player still reads as walking through them
        for (let i = 0; i < 2; i++) {
          const s = FLOWER_H * (0.88 + rand(x, z, i + 5) * 0.24);
          const g = voxelGeometry(PROPS.flower, { pixel: px * s, depth: 3 });
          g.rotateY(rand(x, z, i + 1) * Math.PI * 2);
          g.translate(cx + (rand(x, z, i) - 0.5) * 0.44, y, cz + (rand(x, z, i + 9) - 0.5) * 0.44);
          push('flower', g);
        }
      } else if (ch === '"') {
        // two crossed tufts per tile, kept near 90° apart and under a full tile
        // wide — random angles made neighbouring tiles knit into a scribble
        const jitter = (rand(x, z, 3) - 0.5) * 0.3;
        for (let i = 0; i < 2; i++) {
          const s = 0.82 + rand(x, z, i + 7) * 0.16;
          const g = voxelGeometry(PROPS.tallgrass, { pixel: px * s, depth: 3 });
          g.rotateY(jitter + i * (Math.PI / 2));
          g.translate(cx + (rand(x, z, i) - 0.5) * 0.16, y, cz + (rand(x, z, i + 3) - 0.5) * 0.16);
          push('tallgrass', g);
        }
      } else if (ch === '#') {
        const g = voxelGeometry(PROPS.fence, { pixel: px, depth: 3 });
        g.translate(cx, y, cz);
        push('prop', g);
      } else if (ch === 's') {
        const g = voxelGeometry(PROPS.sign, { pixel: px, depth: 3 });
        g.translate(cx, y, cz);
        push('prop', g);
      } else if (ch === 'o') {
        const g = flatVoxelGeometry(PROPS.rock, { pixel: px * 1.1, depth: 8, lift: 0.12 });
        g.rotateY(rand(x, z, 5) * 3);
        g.translate(cx, y, cz);
        push('prop', g);
      }
    }
  }

  // How much each prop type sways, and how tall it is for the sway falloff.
  const WIND = {
    tallgrass: { amplitude: 0.075, height: 0.95 },
    flower: { amplitude: 0.055, height: 0.55 },
    tree: { amplitude: 0.05, height: 2.0 },
  };
  const foliage = [];

  for (const [key, geos] of propBatches) {
    const mat = voxelMaterial({ roughness: key === 'flower' ? 0.8 : 0.95 });
    const mesh = new THREE.Mesh(mergeGeometries(geos), mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.name = `props:${key}`;

    if (WIND[key]) {
      // living things get a self-lit floor too: with the sun behind them, leaves
      // read as light bleeding through rather than as silhouettes
      vertexEmissive(mat);
      const { uniforms, depthMaterial } = windMaterial(mat, WIND[key]);
      mesh.customDepthMaterial = depthMaterial;
      animated.push((t) => { uniforms.uWindTime.value = t; });
      foliage.push(mat);
    }

    world.add(mesh);
  }

  /* --------------------------------------------------------------- buildings */
  // Footprints tagged 'X' in the map; placed by hand so doors face the path.
  const lamps = [];
  lamps.push(...buildHouse(world, { x: 19, z: 15, w: 7, d: 4, doorAt: 3 }));
  lamps.push(...buildHouse(world, { x: 36, z: 15, w: 7, d: 4, doorAt: 3 }));

  return { world, animated, lamps, foliage };
}

/* ---------------------------------------------------------------- buildings */

function buildHouse(parent, { x, z, w, d, doorAt }) {
  const group = new THREE.Group();
  const wallH = 2.2;
  const roofH = 0.9;

  const wallTex = bitmapTexture(BUILDING.wall, { repeat: 1 });
  const roofTex = bitmapTexture(BUILDING.roof, { repeat: 1 });
  wallTex.repeat.set(w, wallH);
  roofTex.repeat.set(w + 0.6, d + 0.6);

  const walls = new THREE.Mesh(
    new THREE.BoxGeometry(w, wallH, d),
    new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.95 }),
  );
  walls.position.set(x + w / 2, wallH / 2, z + d / 2);
  walls.castShadow = walls.receiveShadow = true;
  group.add(walls);

  const roof = new THREE.Mesh(
    new THREE.BoxGeometry(w + 0.6, roofH, d + 0.6),
    new THREE.MeshStandardMaterial({ map: roofTex, roughness: 0.9 }),
  );
  roof.position.set(x + w / 2, wallH + roofH / 2, z + d / 2);
  roof.castShadow = roof.receiveShadow = true;
  group.add(roof);

  const eave = new THREE.Mesh(
    new THREE.BoxGeometry(w + 0.9, 0.18, d + 0.9),
    new THREE.MeshStandardMaterial({ color: 0x5c3a18, roughness: 0.95 }),
  );
  eave.position.set(x + w / 2, wallH + 0.09, z + d / 2);
  eave.castShadow = eave.receiveShadow = true;
  group.add(eave);

  // door + windows, extruded a few pixels proud of the wall
  const face = z + d + 0.001;
  const door = new THREE.Mesh(
    voxelGeometry(BUILDING.door, { pixel: 1 / 16 * 1.5, depth: 2 }),
    voxelMaterial(),
  );
  door.position.set(x + doorAt + 0.5, 0, face);
  door.castShadow = true;
  group.add(door);

  // windows keep a handle on their material + a point light so the day/night
  // cycle can switch the house from "dark box" to "someone is home"
  const lamps = [];
  for (const wx of [1, w - 2]) {
    const mat = voxelMaterial({ emissive: new THREE.Color(0xffc860), emissiveIntensity: 0 });
    const win = new THREE.Mesh(
      voxelGeometry(BUILDING.window, { pixel: 1 / 16 * 1.4, depth: 2 }),
      mat,
    );
    win.position.set(x + wx + 0.5, 0.85, face);
    win.castShadow = true;
    group.add(win);

    const glow = new THREE.PointLight(0xffc060, 0, 6, 2);
    glow.position.set(x + wx + 0.5, 1.5, face + 0.35);
    group.add(glow);
    lamps.push({ mat, glow });
  }

  parent.add(group);
  return lamps;
}
