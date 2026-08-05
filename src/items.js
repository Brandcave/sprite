import { ITEMS } from './art.js';

/*
  What a thing is, once you are holding it.

  One table, and everything else in the game refers to an item by its id — a
  pickup on the sand, a line of dialogue that hands you something, a slot in the
  panel. That is the whole reason this file exists separately from the art: the
  bitmap is what it looks like, and this is what it *is*, and the second one is
  what the rest of the code has opinions about.

  `note` is not flavour text for its own sake. Everything in this world is
  written by somebody who lives here, and an inventory is the one place a game
  usually stops doing that and starts reading like a spreadsheet. So each note
  is a sentence in the same voice as the island, and half of them are pointing
  at a villager who would have something to say about it.

  `stacks` is false for the things that are worth exactly one. A single flower
  picked for somebody is a gesture; six of them in a slot marked ×6 is a
  harvest, and the difference matters more here than the saved space does.
*/
const CATALOGUE = {
  bread: {
    name: 'Bread',
    note: 'A small round loaf, still warm at the middle. Enough for two, if the two of you are not greedy.',
    art: ITEMS.bread,
  },
  fruit: {
    name: 'Fruit',
    note: 'Ripe to the point of being a decision rather than a snack. It will not keep another day.',
    art: ITEMS.fruit,
  },
  coconut: {
    name: 'Coconut',
    note: 'Heavier than it looks, and no obvious way in. Anoka would know; Anoka would also enjoy being asked.',
    art: ITEMS.coconut,
  },
  shell: {
    name: 'Shell',
    note: 'A fan shell, whole, both halves still hinged. Bram says there are always shells when the tide goes out, and for once he was right.',
    art: ITEMS.shell,
  },
  flower: {
    name: 'Flower',
    note: 'Picked from the beds by the fountain. It will be dead by morning, which is rather the point of picking one.',
    art: ITEMS.flower,
    stacks: false,
  },
};

/** What that id is, or null — an id nothing knows about is not a crash. */
export const itemOf = (id) => CATALOGUE[id] ?? null;

/** Every id there is, in the order they are declared, for anything listing them. */
export const ITEM_IDS = Object.keys(CATALOGUE);
