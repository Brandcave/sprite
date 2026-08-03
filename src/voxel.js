import * as THREE from 'three';
import { PALETTE } from './art.js';

const W = 16; // every bitmap is normalised to 16x16

/** Pad / trim a char-grid so it is exactly 16x16. */
export function normalize(rows) {
  const out = [];
  for (let y = 0; y < W; y++) {
    const r = rows[y] ?? '';
    out.push((r + '................').slice(0, W));
  }
  return out;
}

const colorCache = new Map();
function colorOf(ch) {
  if (!colorCache.has(ch)) {
    const hex = PALETTE[ch];
    colorCache.set(ch, hex ? new THREE.Color(hex).convertSRGBToLinear() : null);
  }
  return colorCache.get(ch);
}

/* ------------------------------------------------------------------ textures */

/** Render a bitmap to a nearest-filtered CanvasTexture (used for ground tiles). */
export function bitmapTexture(rows, { repeat = 1, transparent = false } = {}) {
  const grid = normalize(rows);
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = W;
  const ctx = canvas.getContext('2d');
  if (!transparent) {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, W);
  }
  for (let y = 0; y < W; y++) {
    for (let x = 0; x < W; x++) {
      const hex = PALETTE[grid[y][x]];
      if (!hex) continue;
      ctx.fillStyle = hex;
      ctx.fillRect(x, y, 1, 1);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestMipmapNearestFilter;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat, repeat);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/* -------------------------------------------------------------------- voxels */

/**
 * Extrude a 16x16 bitmap into voxels — one cube per opaque pixel — and emit a
 * single BufferGeometry with vertex colours. Interior faces between adjacent
 * opaque pixels are skipped, so a full 16x16 sprite is ~250 quads, not 1536.
 *
 * The sprite is built in the XY plane (origin: bottom-centre) with `depth`
 * pixels of thickness along Z, so it can stand upright like a cardboard cutout.
 */
export function voxelGeometry(rows, {
  pixel = 1 / 16,     // world size of one pixel
  depth = 3,          // thickness in pixels
  mirror = false,
} = {}) {
  let grid = normalize(rows);
  if (mirror) grid = grid.map((r) => [...r].reverse().join(''));

  const pos = [];
  const nrm = [];
  const col = [];
  const idx = [];

  const solid = (x, y) => x >= 0 && y >= 0 && x < W && y < W && PALETTE[grid[y][x]];

  const dz = (depth * pixel) / 2;

  const quad = (verts, normal, color, shade) => {
    const start = pos.length / 3;
    for (const v of verts) {
      pos.push(v[0], v[1], v[2]);
      nrm.push(normal[0], normal[1], normal[2]);
      col.push(color.r * shade, color.g * shade, color.b * shade);
    }
    idx.push(start, start + 1, start + 2, start, start + 2, start + 3);
  };

  for (let y = 0; y < W; y++) {
    for (let x = 0; x < W; x++) {
      const ch = grid[y][x];
      const c = colorOf(ch);
      if (!c) continue;

      // world-space bounds of this pixel (origin bottom-centre of the sprite)
      const x0 = (x - W / 2) * pixel;
      const x1 = x0 + pixel;
      const y1 = (W - y) * pixel;
      const y0 = y1 - pixel;

      // front / back always visible
      quad([[x0, y0, dz], [x1, y0, dz], [x1, y1, dz], [x0, y1, dz]], [0, 0, 1], c, 1.0);
      quad([[x1, y0, -dz], [x0, y0, -dz], [x0, y1, -dz], [x1, y1, -dz]], [0, 0, -1], c, 0.88);

      if (!solid(x + 1, y))
        quad([[x1, y0, dz], [x1, y0, -dz], [x1, y1, -dz], [x1, y1, dz]], [1, 0, 0], c, 0.92);
      if (!solid(x - 1, y))
        quad([[x0, y0, -dz], [x0, y0, dz], [x0, y1, dz], [x0, y1, -dz]], [-1, 0, 0], c, 0.92);
      if (!solid(x, y - 1))
        quad([[x0, y1, dz], [x1, y1, dz], [x1, y1, -dz], [x0, y1, -dz]], [0, 1, 0], c, 1.0);
      if (!solid(x, y + 1))
        quad([[x0, y0, -dz], [x1, y0, -dz], [x1, y0, dz], [x0, y0, dz]], [0, -1, 0], c, 0.75);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geo.setIndex(idx);
  geo.computeBoundingSphere();
  return geo;
}

/**
 * Build geometry from a true 3D voxel volume rather than an extruded bitmap.
 * `colorAt(x, y, z)` returns a palette char (or null for empty) over an
 * `size`-cubed grid. Only faces touching empty space are emitted, so the whole
 * interior costs nothing and a solid blob is just its shell.
 *
 * Extruding a 2D sprite is fine for flat things, but anything you see from
 * several sides at once — a tree crown — reads as a coin on edge. This gives it
 * actual volume while keeping the voxels exactly the same size as everything
 * else, so it still belongs to the same world.
 *
 * Origin is bottom-centre, matching voxelGeometry().
 */
export function volumeGeometry({ size = 16, pixel = 1 / 16, colorAt }) {
  const S = size;
  const grid = new Array(S * S * S);
  for (let y = 0; y < S; y++) {
    for (let z = 0; z < S; z++) {
      for (let x = 0; x < S; x++) grid[(y * S + z) * S + x] = colorAt(x, y, z) || null;
    }
  }
  const at = (x, y, z) =>
    (x < 0 || y < 0 || z < 0 || x >= S || y >= S || z >= S) ? null : grid[(y * S + z) * S + x];

  const pos = [];
  const nrm = [];
  const col = [];
  const idx = [];

  const quad = (verts, normal, c, shade) => {
    const start = pos.length / 3;
    for (const v of verts) {
      pos.push(v[0], v[1], v[2]);
      nrm.push(normal[0], normal[1], normal[2]);
      col.push(c.r * shade, c.g * shade, c.b * shade);
    }
    idx.push(start, start + 1, start + 2, start, start + 2, start + 3);
  };

  const half = (S * pixel) / 2;
  for (let y = 0; y < S; y++) {
    for (let z = 0; z < S; z++) {
      for (let x = 0; x < S; x++) {
        const ch = at(x, y, z);
        if (!ch) continue;
        const c = colorOf(ch);
        if (!c) continue;

        const x0 = x * pixel - half, x1 = x0 + pixel;
        const y0 = y * pixel, y1 = y0 + pixel;
        const z0 = z * pixel - half, z1 = z0 + pixel;

        if (!at(x, y + 1, z))
          quad([[x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0]], [0, 1, 0], c, 1.0);
        if (!at(x, y - 1, z))
          quad([[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]], [0, -1, 0], c, 0.68);
        if (!at(x, y, z + 1))
          quad([[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], [0, 0, 1], c, 0.97);
        if (!at(x, y, z - 1))
          quad([[x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0]], [0, 0, -1], c, 0.85);
        if (!at(x + 1, y, z))
          quad([[x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1]], [1, 0, 0], c, 0.93);
        if (!at(x - 1, y, z))
          quad([[x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]], [-1, 0, 0], c, 0.89);
      }
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geo.setIndex(idx);
  geo.computeBoundingSphere();
  return geo;
}

/**
 * Same extrusion, but laid flat on the ground (XZ plane) — for things that grow
 * out of the floor a little: flowers, tall grass, puddles.
 */
export function flatVoxelGeometry(rows, opts = {}) {
  const geo = voxelGeometry(rows, opts);
  geo.rotateX(-Math.PI / 2);
  // after the rotation the sprite spans z:[-1,0] and is centred on x — recentre,
  // then lift it clear of the floor so it does not z-fight with the tile top.
  geo.translate(0, opts.lift ?? 0, 0.5);
  geo.computeBoundingSphere();
  return geo;
}

export const voxelMaterial = (extra = {}) =>
  new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.95,
    metalness: 0.0,
    ...extra,
  });

/* ------------------------------------------------------------ shader tweaks */

/**
 * Tint the emissive term by each vertex's own colour, turning `emissiveIntensity`
 * into a self-lit floor that preserves the sprite's palette instead of greying
 * it out. Used for anything the backlit sun leaves facing away from the light —
 * the hero, and foliage (where it reads as light bleeding through leaves).
 */
export function vertexEmissive(mat) {
  mat.emissive = new THREE.Color(0xffffff);
  mat.emissiveIntensity = 0;
  const prev = mat.onBeforeCompile;
  mat.onBeforeCompile = (shader, renderer) => {
    if (prev) prev(shader, renderer);
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <emissivemap_fragment>',
      '#include <emissivemap_fragment>\n\ttotalEmissiveRadiance *= vColor;',
    );
  };
  return mat;
}

const WIND_CHUNK = /* glsl */ `
  // Sway weight rises with height, so the base stays planted and only the tips
  // travel. Phase comes from world XZ (the geometry is baked in world space),
  // which makes gusts roll across the field instead of every clump ticking in
  // lockstep.
  float wSway = clamp(transformed.y / uWindHeight, 0.0, 1.0);
  wSway *= wSway;
  float wPhase = transformed.x * 0.55 + transformed.z * 0.42;
  float wGust = 0.65 + 0.35 * sin(uWindTime * 0.31 + wPhase * 0.18);
  transformed.x += sin(uWindTime * 1.9 + wPhase) * uWindAmp * wSway * wGust;
  transformed.z += sin(uWindTime * 1.3 + wPhase * 1.7 + 1.3) * uWindAmp * 0.55 * wSway * wGust;
`;

/**
 * Displace a material's vertices to sway in the wind. Returns the shared uniform
 * object so a caller can drive `uWindTime`.
 *
 * Also builds the matching `customDepthMaterial` — without it the shadow pass
 * uses un-swayed geometry and the shadows visibly detach from the grass.
 */
export function windMaterial(mat, { amplitude = 0.06, height = 1.0 } = {}) {
  const uniforms = {
    uWindTime: { value: 0 },
    uWindAmp: { value: amplitude },
    uWindHeight: { value: height },
  };

  const patch = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader =
      'uniform float uWindTime;\nuniform float uWindAmp;\nuniform float uWindHeight;\n' +
      shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n' + WIND_CHUNK);
  };

  const key = `wind:${amplitude}:${height}`;
  const prev = mat.onBeforeCompile;
  mat.onBeforeCompile = (shader, renderer) => {
    if (prev) prev(shader, renderer);
    patch(shader);
  };
  mat.customProgramCacheKey = () => key;

  const depth = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });
  depth.onBeforeCompile = patch;
  depth.customProgramCacheKey = () => `${key}:depth`;

  return { uniforms, depthMaterial: depth };
}
