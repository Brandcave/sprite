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
| Z / E / Space / Enter | talk to whoever you are facing; advance the text |
| Arrows, then Z | pick an answer when a villager asks something |

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

`PALM_VOLUME` inverts that: a palm is mostly empty space, so rather than test
every cell against a field it stamps a curved trunk and a set of drooping fronds
into a sparse map and looks cells up. Three variants stand along the beach and
the lagoon shore, and they sway harder and higher than the inland tree — the
fronds are the point, the trunk barely moves.

Shells are the one prop with no map character at all: they are scattered by the
same per-tile hash across sand only, about one tile in thirty-five, which lands
28 of them on a 1250-tile beach. Hand-placing that many would read as a pattern,
and they are too small to be worth a tile you cannot walk on. Like the lamp they
carry no outline — at five pixels across, a ring of dark edge is half the sprite
and the whole thing reads as grit rather than as something bleached.

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

**Weather.** Two or three spells a day — wind, rain, or a storm with lightning —
rolled fresh each morning, one per equal slice of the day so they never stack.
Each ramps in over ten seconds, holds for a minute or two, and ramps out; the
ramps are most of what makes it read as weather rather than as a switch.

`src/weather.js` is a director owning three numbers: `wind`, `rain` and `flash`.
Nothing in the scene knows what a storm is — the foliage reads `wind`, the rain
field reads `rain`, the lighting reads all three.

Wind is a thing that travels, not a state the world sits in. You see it as pale
swooshes that sweep past at knee height and are gone — sporadic when it is calm,
several at a time in a gale, never a steady stream. Nothing leans permanently
and there is no ambient haze, because a gust that never ends stops reading as a
gust. The swoosh that is currently passing also publishes its position to the
foliage shader as a band, and plants bow inside that band and spring back as the
front moves on, scaled by their own height so a palm crown swings a long way and
a tuft of grass only ducks. So the grass reacts to the thing you can actually
see going past rather than to a global number.

The wind clock is accumulated rather than absolute, so a gale can speed the sway
up without the phase jumping.

Rain is one instanced field — a single draw call, with the falling, the drifting
and the wrapping all done in the vertex shader, so the cost never depends on the
size of the world. Density is a uniform: every drop carries a random, and the
ones above the current amount collapse off screen.

**Puddles** pool while it rains and linger after it stops, on a separate
wetness value that lags the rain — water takes a while to gather and longer to
go. Every puddle the ground could hold is built once at startup and merged into
a single mesh; nothing is created when the weather turns. What changes is one
uniform. Each puddle carries its own centre and its own threshold as vertex
attributes, so it grows out of its own middle and fades in when the ground gets
wet enough for it — which means they arrive scattered across the shower and,
better, the shallow ones dry up first while the deep ones are still sitting
there.

They are **one sheet of water, not a scatter of blobs.** A sprite per tile meant
that wherever several landed together you could see every one of them —
overlapping rims, doubled alpha, a crowd of circles instead of a pool. So the
island's water is rasterised into a single grid, eight cells to a tile, and a
cell is wet when the ground under it is low enough. Neighbouring wet cells are
just neighbouring quads, so a hollow spanning four tiles comes out as one body
of water with one edge round it. Low ground is smooth noise over a few tiles
plus a finer octave that does nothing but rough up the outline.

Each cell's depth is baked in as an attribute and the shader draws only the
cells under the current water level, so a pool fills from its deepest point
outwards and drains back to it, and the rim is drawn wherever the waterline
currently is rather than wherever the art put it.

**They reflect.** All the puddles lie on the same plane, so one mirrored render
of the scene serves every one of them — a pass per frame rather than a pass per
puddle, and only on frames where the ground is wet. `src/reflection.js` builds
the virtual camera (reflecting the up vector too, or the image comes out
inside-out) and skews the projection so its near plane sits exactly on the
water; without that the reflection is nothing but the underside of the terrain,
which hangs a full unit below every tile. Fog is switched off for the pass: the
mirrored camera is half again as far from everything, and in rain, with the fog
pulled right in, the reflection comes back as a flat sheet of grey.

One deliberate lie. A true mirror under a camera looking down at 46° reflects
the sky and almost nothing else, which is honest and reads as a blue sticker.
The virtual camera is pulled part-way toward the water instead, flattening its
view until the palms and lamps and houses actually turn up in the puddle —
`flatten` on the reflection, 1 being a true mirror.

The lighting layers *on top of* the day cycle rather than replacing it.
`applyTimeOfDay()` writes the clear-sky baseline for the hour, then the weather
multiplies it down — before anything derived from `sun.intensity` is computed.
Rain at dawn is therefore dim orange and rain at noon flat grey, with no
combinations to author, and a heavy storm drags the sun low enough that the
existing dusk test trips and the street lamps come on by themselves.

Lightning flashes the hemisphere light and the background, never the sun: the
sun owns the shadow direction, and flashing it swings every shadow in the scene.
Its envelope is a hard hit, a fast fall, then a second smaller pop — a single
linear fade reads as somebody switching a lamp on.

`setWeather('clear' | 'wind' | 'rain' | 'storm')` forces a condition, since
waiting eight minutes for a scheduled one is not a way to work.

**Characters.** A voxel slab that billboards around Y toward the camera, with
four facings × two walk frames swapped by visibility. It casts a real shadow, so
it reads as a physical object standing in the world rather than a decal.
Movement is grid-locked with a short eased step and a mid-step hop.

`src/character.js` owns all of that; the hero and the villagers differ only in
who picks the next step — input for one, a wander timer for the other. Every
character claims its destination tile the moment it starts moving, so nothing
can walk through anything else. Villagers roam a fixed radius around a home tile
and stop to face you when you come within three tiles.

Villager sprites live in `VILLAGERS`, one entry per design, and an NPC picks
one. They follow the hero's rules — 16×16, hard outline, a handful of inked
colours — and separate from each other by silhouette rather than detail: one is
a wide straw brim, the other is hair and a flared hem. The straw brim costs a
row of face, because at the camera's ~46° pitch a brim three pixels deep
swallows whatever sits directly under it, so those eyes sit on the *second* row
below it. The weaver has no legs to swap for her walk frame, so the hem swings a
pixel instead.

**Talking.** Face a villager and press <kbd>Z</kbd>. `src/dialogue.js` is the box
— white panel, hard outline, blue inner frame, two lines typed a character at a
time — plus the one thing the originals mostly saved for shopkeepers: any line
can branch into a multiple-choice answer, driven with the arrow keys and picked
with <kbd>Z</kbd>. A conversation swallows input, so nothing walks off
mid-sentence, and the villager holds still and keeps looking at you until it
ends.

Scripts (`src/dialogue-scripts.js`) are plain data: named nodes with text and
either a `next` or a list of `choices`. Wrapping and pagination happen in the
box, so a script is written as prose and never has to care where the lines
break.

**Lighting.** One directional sun (2048² PCF-soft shadow map, frustum pinned to
the player), a hemisphere light for sky/ground bounce, and a camera-side fill.
The day cycle interpolates sun colour/intensity/elevation, sky tint, fog, and
tone-map exposure across four keyframes. After dusk the house windows turn
emissive and the hero's lantern point light takes over.

Street lamps flank the north–south road, two pairs of them, and run off the same
switch as the house windows. Each is authored as a single bitmap whose glass
pixels are split off at build time into a second mesh, so the ironwork can stay
iron while the panes turn emissive after dusk — tinted by their own pixels, or a
lit pane blows out to a white blob instead of going gold.

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
