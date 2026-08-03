import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { TILES, PROPS, BUILDING, TREE_VOLUME, PALM_VOLUME } from './art.js';
import {
  bitmapTexture, voxelGeometry, flatVoxelGeometry, voxelMaterial,
  vertexEmissive, windMaterial, volumeGeometry,
} from './voxel.js';

/*
  Legend
    .  grass          ,  path            ~  water/sea    _  beach sand
    T  tree           f  flower bed      "  tall grass   #  fence
    Y  palm tree (beach only — it stands in sand)
    l  street lamp (flanking the north-south road; lights after dusk)
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
  '~~~~~~~~~~____________________Y_____________________~~~~~~~~~~',
  '~~~~~~~~~_____Y_________________________Y____________~~~~~~~~~',
  '~~~~~~~~____________Y__________________________Y______~~~~~~~~',
  '~~~~~~~_____Y___________..._______T______________Y_____~~~~~~~',
  '~~~~~~_______________......,,,,,,.......T.T____________~~~~~~~',
  '~~~~~~___________..T.......,,,,,,....TT.....T___________~~~~~~',
  '~~~~~__Y________....T.....l,,,,,,l..........T____________~~~~~',
  '~~~~~__________............,,,,,,..........o..___________~~~~~',
  '~~~~~_________T..XXXXXXX...,,,,,,...XXXXXXX...TT__________~~~~',
  '~~~~__Y______....XXXXXXX...,,,,,,...XXXXXXX.....T_________~~~~',
  '~~~~________TT.T.XXXXXXX...,,,,,,...XXXXXXX......_________~~~~',
  '~~~~________.....XXXXXXX...,,,,,,...XXXXXXX.......________~~~~',
  '~~~~________.T....,,,,,....,,,,,,....,,,,,........________~~~~',
  '~~~~___Y____T.........,,,,,,,,,,,,,,,,,,..........________~~~~',
  '~~~_________T......s..,,,,,,cccc,,,,,,,,..s......T________~~~~',
  '~~~_________..........,,,,,c~~~~c,,,,,,...........________~~~~',
  '~~~_________T.....fff.,,,,,c~~~~c,,,,,,.fff......T_________~~~',
  '~~~_________......fff.,,,,,c~~~~c,,,,,,.fff......T_________~~~',
  '~~~_________......fff.,,,,,c~~~~c,,,,,,.fff.....T.___Y_____~~~',
  '~~~_________..........,,,,,,cccc,,,,,,,..........._________~~~',
  '~~~________.TT.............,,,,,,................._________~~~',
  '~~~________......""""""....,,,,,,....""""""......._________~~~',
  '~~~________......""""""....,,,,,,....""""""......T____Y____~~~',
  '~~~________......""""""....,,,,,,....""""""......._________~~~',
  '~~~________................,,,,,,.......o..........________~~~',
  '~~~~_______.T......######..,,,,,,..######.......T..________~~~',
  '~~~~________.T.............,,,,,,................T.____Y__~~~~',
  '~~~~________..............l,,,,,,l................._______~~~~',
  '~~~~________........._Y____,,,,,,____Y_...........________~~~~',
  '~~~~_________........_~~~~~~~~~~~~~~~~_..........T________~~~~',
  '~~~~_________........_~~~~~~~~~~~~~~~~_.........._________~~~~',
  '~~~~_________........_~~~~~~~~~~~~~~~~_.........._________~~~~',
  '~~~~__________......._~~~~~~~~~~~~~~~~_.........T_________~~~~',
  '~~~~___________T.....__Y____________Y__.........__________~~~~',
  '~~~~~__________................................__________~~~~~',
  '~~~~~___________..........................T..____________~~~~~',
  '~~~~~~___________...TT.......T.T.......T....____________~~~~~~',
  '~~~~~~______________Y.T........T...T..TT..______________~~~~~~',
  '~~~~~~~________________________.T...T________Y_________~~~~~~~',
  '~~~~~~~~_________________Y____________________________~~~~~~~~',
  '~~~~~~~~__________________________________Y___________~~~~~~~~',
  '~~~~~~~~~~_______Y__________________________________~~~~~~~~~~',
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
  Y: { tile: 'sand', h: 0.0 },
  '~': { tile: 'water', h: -0.28 },
  f: { tile: 'grass', h: 0.0 },
  '"': { tile: 'grass', h: 0.0 },
  '#': { tile: 'grass', h: 0.0 },
  s: { tile: 'grass', h: 0.0 },
  o: { tile: 'grass', h: 0.0 },
  l: { tile: 'grass', h: 0.0 },
  X: { tile: 'stone', h: 0.0 },
};

const SOLID = new Set(['T', 'Y', '~', '#', 's', 'o', 'l', 'X', 'c']);

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
  // The beach is ~1250 tiles and this lands 28 shells on it — enough that you
  // come across one now and then, far short of enough to look strewn. (The hash
  // is not uniform, so the count is measured, not 1250/35.)
  const SHELL_CHANCE = 1 / 35;
  const SHELLS = ['sanddollar', 'scallop', 'conch'];

  // Street lamps: the ironwork merges into one mesh, the glass into another, and
  // each lamp keeps a point light so the day cycle can switch them on at dusk.
  const LAMP_H = 2.4;                   // total height, in tiles
  const lampPx = px * LAMP_H;           // 16 pixels tall, so this is one pixel
  const lampGeos = { post: [], glass: [] };
  const lamps = [];
  const lampMask = (rows, keep) =>
    rows.map((r) => [...r].map((c) => (keep === (c === 'y') ? c : '.')).join(''));

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
      } else if (ch === 'Y') {
        // Palms are lanky, so the height scale is per-variant rather than one
        // jittered number: a sprout at a tall palm's scale reads as a bush.
        const r = rand(x, z, 21);
        const variant = r < 0.55 ? 'tall' : r < 0.85 ? 'short' : 'sprout';
        const s = ({ tall: 5.0, short: 3.6, sprout: 2.0 })[variant] * (0.92 + rand(x, z, 2) * 0.16);
        const g = volumeGeometry({
          size: PALM_VOLUME.size,
          pixel: (px * s * 16) / PALM_VOLUME.size,
          colorAt: PALM_VOLUME.at(rand(x, z, 13) * 10, variant),
        });
        g.rotateY(rand(x, z, 1) * Math.PI * 2);
        g.translate(cx, y, cz);
        push('palm', g);
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
      } else if (ch === 'l') {
        for (const part of ['post', 'glass']) {
          const g = voxelGeometry(lampMask(PROPS.lamp, part === 'glass'), {
            pixel: lampPx,
            depth: 3,          // near enough the post's width to read as a post
          });
          g.translate(cx, y, cz);
          lampGeos[part].push(g);
        }
        // the glass sits ~13.5 pixels up from the base of the bitmap
        const glow = new THREE.PointLight(0xffc060, 0, 10, 2);
        glow.position.set(cx, y + 13.5 * lampPx, cz);
        world.add(glow);
        // brighter than a house window: it is further off the ground, and the
        // pool it throws on the road is the whole reason the lamp is there
        lamps.push({ glow, power: 3.2 });
      } else if (ch === '_' && rand(x, z, 41) < SHELL_CHANCE) {
        // Scattered rather than placed: a shell is too small to be worth a map
        // character, and hand-placing them would read as a pattern. They do not
        // block anything — you walk over them.
        const kind = SHELLS[Math.floor(rand(x, z, 43) * SHELLS.length)];
        const s = 0.85 + rand(x, z, 45) * 0.25;
        const g = flatVoxelGeometry(PROPS[kind], { pixel: px * s, depth: 2, lift: 0.015 });
        g.rotateY(rand(x, z, 47) * Math.PI * 2);
        g.translate(cx + (rand(x, z, 49) - 0.5) * 0.5, y, cz + (rand(x, z, 51) - 0.5) * 0.5);
        push('shell', g);
      } else if (ch === 'o') {
        const g = flatVoxelGeometry(PROPS.rock, { pixel: px * 1.1, depth: 8, lift: 0.12 });
        g.rotateY(rand(x, z, 5) * 3);
        g.translate(cx, y, cz);
        push('prop', g);
      }
    }
  }

  let lampMetal = null;
  if (lampGeos.post.length) {
    // Painted metal has nowhere to get light from here: the sun is behind the
    // world, so the faces we can see are all turned away from it, and the lamp
    // is small enough that its own shadow lands entirely on itself. Both of
    // those read as black sides on a silver lamp. So: no self-shadowing, and the
    // same self-lit floor the hero uses (emissive tinted by its own pixels),
    // faded by the day cycle so it is silver by day and not glowing at night.
    lampMetal = vertexEmissive(voxelMaterial({ roughness: 0.6 }));
    const post = new THREE.Mesh(mergeGeometries(lampGeos.post), lampMetal);
    post.castShadow = true;
    post.receiveShadow = false;
    post.name = 'props:lamp';
    world.add(post);

    // One shared glass material for every lamp on the island — the day cycle
    // fades its emissive up at dusk, and they all come on together. The emissive
    // is tinted by the pane's own pixels rather than a flat warm white, which is
    // what keeps a lit lamp gold instead of blowing out to a white blob.
    const glassMat = vertexEmissive(voxelMaterial());
    const glass = new THREE.Mesh(mergeGeometries(lampGeos.glass), glassMat);
    glass.castShadow = true;
    glass.name = 'props:lamp-glass';
    world.add(glass);
    for (const lamp of lamps) lamp.mat = glassMat;
  }

  /* ----------------------------------------------------------------- puddles */
  // Every puddle the ground could ever hold is built once, up front, and the
  // whole field is one mesh. What changes with the weather is a single uniform:
  // each puddle grows out of its own centre and fades in as the ground wets,
  // at its own threshold, so they arrive scattered over the shower rather than
  // all switching on together. Nothing here is rebuilt when it starts raining.
  const puddleWet = { value: 0 };
  const PUDDLE_ON = new Set(['.', ',', '_']);   // open ground only
  const PUDDLES = ['puddleWide', 'puddleRound', 'puddleSplit'];
  const puddleGeos = [];

  for (let z = 0; z < MAP_H; z++) {
    for (let x = 0; x < MAP_W; x++) {
      if (!PUDDLE_ON.has(tileAt(x, z))) continue;
      if (rand(x, z, 61) >= 1 / 13) continue;

      const kind = PUDDLES[Math.floor(rand(x, z, 63) * PUDDLES.length)];
      const s = 0.8 + rand(x, z, 65) * 0.7;
      const g = flatVoxelGeometry(PROPS[kind], { pixel: px * s, depth: 1, lift: 0.012 });
      g.rotateY(rand(x, z, 67) * Math.PI * 2);
      const cx = x + 0.5 + (rand(x, z, 69) - 0.5) * 0.4;
      const cz = z + 0.5 + (rand(x, z, 71) - 0.5) * 0.4;
      const cy = groundHeight(x, z);
      g.translate(cx, cy, cz);

      // Where this puddle grows from, and how wet the ground has to get before
      // it starts. Both are per-vertex because the field is merged into one
      // mesh and the shader has nowhere else to read them from.
      const n = g.attributes.position.count;
      const centre = new Float32Array(n * 3);
      const seed = new Float32Array(n);
      const threshold = rand(x, z, 73) * 0.7;
      for (let i = 0; i < n; i++) {
        centre[i * 3] = cx;
        centre[i * 3 + 1] = cy + 0.012;
        centre[i * 3 + 2] = cz;
        seed[i] = threshold;
      }
      g.setAttribute('aCentre', new THREE.Float32BufferAttribute(centre, 3));
      g.setAttribute('aSeed', new THREE.Float32BufferAttribute(seed, 1));
      puddleGeos.push(g);
    }
  }

  if (puddleGeos.length) {
    const mat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.22,
      metalness: 0.2,
      transparent: true,
      depthWrite: false,
    });
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uWet = puddleWet;
      shader.vertexShader =
        'attribute vec3 aCentre;\nattribute float aSeed;\nuniform float uWet;\nvarying float vGrow;\n'
        + shader.vertexShader.replace('#include <begin_vertex>', `
          #include <begin_vertex>
          vGrow = smoothstep(aSeed, aSeed + 0.35, uWet);
          transformed = mix(aCentre, transformed, vGrow);
        `);
      shader.fragmentShader =
        'varying float vGrow;\n'
        + shader.fragmentShader.replace(
          '#include <color_fragment>',
          '#include <color_fragment>\n\tdiffuseColor.a *= vGrow;',
        );
    };
    mat.customProgramCacheKey = () => 'puddle';

    const puddles = new THREE.Mesh(mergeGeometries(puddleGeos), mat);
    puddles.receiveShadow = true;      // but never casts: it is a film of water
    puddles.renderOrder = 1;
    puddles.name = 'props:puddles';
    world.add(puddles);
  }

  // How much each prop type sways, and how tall it is for the sway falloff.
  const WIND = {
    tallgrass: { amplitude: 0.075, height: 0.95 },
    flower: { amplitude: 0.055, height: 0.55 },
    tree: { amplitude: 0.05, height: 2.0 },
    // Taller and looser than the inland tree — the fronds are the point, and the
    // sway weight is keyed off the crown height so the trunk barely moves.
    palm: { amplitude: 0.11, height: 4.5 },
  };
  const foliage = [];
  const windUniforms = [];

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
      // the weather drives the wind clock — see Weather.update()
      windUniforms.push(uniforms);
      foliage.push(mat);
    }

    world.add(mesh);
  }

  /* --------------------------------------------------------------- buildings */
  // Footprints tagged 'X' in the map; placed by hand so doors face the path.
  // both houses sit three tiles back from the road, mirrored about its centre
  lamps.push(...buildHouse(world, { x: 17, z: 15, w: 7, d: 4, doorAt: 3 }));
  lamps.push(...buildHouse(world, { x: 36, z: 15, w: 7, d: 4, doorAt: 3 }));

  return { world, animated, lamps, foliage, lampMetal, windUniforms, puddleWet };
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
