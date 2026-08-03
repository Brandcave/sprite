import { PLAYER_SKINS } from './art.js';

/*
  Who somebody is, worked out from the one thing the relay assigns them: an id.

  Nothing here travels over the wire. Every client derives the same name and the
  same colours from the same number, exactly as it derives the weather and the
  villagers from the room's seed — so there is no field to keep in step, no
  chance of two clients disagreeing about who is in the green cap, and nothing
  to send when somebody arrives beyond the id they already have.

  It also means you look to yourself the way you look to everybody else, which
  matters the moment anyone says "the one in the blue cap".
*/

const NAMES = [
  'ROWAN', 'MIRA', 'JUNO', 'ODA', 'PELL', 'SABLE', 'TIKO', 'VESPER',
  'ASH', 'BRYN', 'CALLA', 'DRIFT', 'ELM', 'FENN', 'GALE', 'HOLLY',
];

/** Ids start at 1 and the room is small; wrapping is only a problem in a crowd. */
const slot = (id, n) => (((id ?? 1) - 1) % n + n) % n;

export const nameOf = (id) => (id == null ? 'YOU' : NAMES[slot(id, NAMES.length)]);

export const skinFor = (id) => PLAYER_SKINS[slot(id, PLAYER_SKINS.length)];
