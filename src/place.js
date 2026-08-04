/*
  Where you are: the island, or a room inside one of its houses.

  Everything that walks — the hero, the villagers, everybody else in the room —
  asks the same three questions of the ground under it: how big is this, is that
  tile solid, and how high is it. Those answers used to come straight from the
  island's map, which is what made the island the only place there was. They now
  come from whichever place is current, and the walking code does not know or
  care which one that is.

  Places do not share coordinates. Each room is laid out hundreds of tiles away
  from the island and from every other room, which is not a rendering trick so
  much as a way of keeping one set of books: tile occupancy, positions and the
  scene graph stay a single flat space, so nothing has to be keyed by room or
  torn down and rebuilt when you walk through a door. Two people standing on the
  same tile of two different rooms is a bug that cannot happen, because there is
  no such pair of tiles.

  Who can *see* whom is a separate matter, and deliberately not distance —
  see the room id on the wire in net.js. Being three hundred tiles away is how
  the geometry stays simple; being in a different room is why you are not told
  about them.
*/

let current = null;

/** The place a character is standing in. */
export const here = () => current;

export function goTo(place) {
  current = place;
  return place;
}

export const isBlocked = (x, z) => current.isBlocked(x, z);
export const groundHeight = (x, z) => current.groundHeight(x, z);

/** Inside the edges of wherever we are. Rooms have walls; the island has sea. */
export function inBounds(x, z) {
  const { x0, z0, w, h } = current;
  return x >= x0 && z >= z0 && x < x0 + w && z < z0 + h;
}
