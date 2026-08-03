# Voxel Kanto — proof of concept

A GB/GBC-style overworld rendered in real 3D with three.js: flat 16×16 pixel art
extruded into voxels, an upright billboarded sprite for the hero, and an actual
sun with shadow maps and a day/night cycle.

```bash
npm install
npm run dev
```

## Controls

| Input | Action |
| --- | --- |
| WASD / arrows | walk, one tile per step |

That's the whole input surface. The camera is locked — fixed yaw, pitch and
distance, following the player — and the clock is not scrubbable.

## How it works

**Pixels → voxels.** `src/art.js` holds every asset as a char grid plus a shared
GBC palette. `src/voxel.js` turns a grid into geometry: one cube per opaque
pixel, with faces between adjacent opaque pixels culled, so a full 16×16 sprite
is ~250 quads instead of 1536. Side faces get a fixed shade multiplier baked
into vertex colours, which keeps the hard-edged pixel look under smooth lighting.

Extrusion is right for anything read flat-on, but the tree is seen large and
from several sides at once, where an extruded bitmap reads as a coin standing on
edge. So `volumeGeometry()` takes a `colorAt(x, y, z)` predicate over a 16³ grid
and emits only the faces touching empty space — the interior is free, and a
solid blob costs just its shell. `TREE_VOLUME` is a lumpy ellipsoid crown on a
trunk, seeded per tile so no two are alike, with the leaf colour driven by
height plus a hash quantised to 2-voxel clumps (per-voxel noise alone reads as
static rather than as foliage).

**Ground.** Each map tile is a box whose top carries a nearest-filtered 16×16
canvas texture. Boxes are merged per tile type, so the whole 48×44 island is a
handful of draw calls. Tile height is per type — the pond curb stands proud of
the path, water sits sunk below the sand.

**Water.** Water tiles emit no box at all. Instead one large plane at the water
line is *every* body of water — the open sea, the lagoon and the pond — showing
through holes in the terrain. It extends far past the fog, so the sea reads as a
horizon rather than as the edge of the tile grid, and there is no seam where the
map ends. Its texture scrolls, and the island's shoreline is just the exposed
side faces of the beach tiles dropping past the waterline.

**Wind.** Foliage materials get a vertex-shader displacement whose amplitude
scales with `y²`, so bases stay rooted and only tips travel; the phase comes from
world XZ, so gusts roll across the field instead of everything ticking in
lockstep. Each also gets a matching `customDepthMaterial` — without it the shadow
pass renders un-swayed geometry and the shadows visibly detach.

**The hero.** A voxel slab that billboards around Y toward the camera, with four
facings × two walk frames swapped by visibility. It casts a real shadow, so it
reads as a physical object standing in the world rather than a decal. Movement
is grid-locked with a short eased step and a mid-step hop.

**Lighting.** One directional sun (2048² PCF-soft shadow map, frustum pinned to
the player), a hemisphere light for sky/ground bounce, and a camera-side fill.
The day cycle interpolates sun colour/intensity/elevation, sky tint, fog, and
tone-map exposure across four keyframes. After dusk the house windows turn
emissive and the hero's lantern point light takes over.

One full cycle takes **24 real minutes** and runs continuously (1 real second =
1 in-game minute). `theta` advances a full turn per day, so `t = 1` resolves to
exactly the same sun direction as `t = 0`, and the keyframe table repeats its
first entry at `t = 1.00` — the wrap is seamless in both direction and colour.
Max per-frame change anywhere in the cycle is ~1e-4.

The sun is deliberately parked on the **far** side of the world from the camera
(note the fixed negative Z in `sunDir`). That backlights everything, so shadows
rake *toward* the viewer instead of hiding behind the objects casting them —
it's the difference between a flat-looking scene and a dimensional one. The
camera being locked is what lets the sun be authored against one known framing.

The cost of backlighting is that a camera-facing billboard gets no direct light
at all. Rather than crank a global fill (which would flatten the very shadows we
just bought), the hero's material carries a self-lit floor: `emissive * vColor`,
patched in via `onBeforeCompile`. The sprite keeps its own palette and stays
readable at any sun angle, and the floor scales down at night so the lantern
still does the work. Note that three.js light *layers* can't do this — lights are
filtered by the **camera's** layers, not per-object, so a "hero-only light" is
silently never collected.

Roughly 23 draw calls / 250k triangles for the whole scene.

## Art & assets

Tiles and props are original art in the Game Boy Color idiom (4-ish shades per
material, hard outlines, no anti-aliasing). The hero's four facings were
transcribed from supplied reference renders down to a 16×16 char grid with three
inked colours — the same constraint the source hardware had.

The pipeline is asset-agnostic: any 16×16 char grid, or a decoded PNG converted
to the same `{rows, palette}` shape, drops straight into `voxelGeometry()`.

## Obvious next steps

- Spritesheet loader so bitmaps come from PNG instead of source strings
- Tall-grass encounter trigger, ledges you can hop down, doors that enter interiors
- NPCs reusing the `Player` billboard class with a walk script
- Frustum-cull props by chunk once the map is larger than a screen or two
