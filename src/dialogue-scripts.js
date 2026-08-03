/*
  Conversation trees. Data only — see dialogue.js for the shape and the runner.

  Branches converge more often than they split: every path through a script
  reaches an ending in two or three lines. A choice that only changes the reply
  you get is still worth having, and it is far cheaper to keep true than a tree
  that tries to remember what you picked.
*/

/*
  Signs, keyed by the tile they stand on — the 's' tiles in the map. A sign with
  no entry still reads; it just says so, which beats a silent press of the key.
*/
export const SIGNS = {
  '19,21': 'TIDEWATCH VILLAGE. Founded long before anyone thought to write the date down.',
  '42,21': 'NORTH: the palm shore, and the lookout. SOUTH: the lagoon. Do not swim at night.',
};

export const WORN_SIGN = 'The paint has worn off. Salt air gets everything eventually.';

export const ANOKA = {
  name: 'Anoka',
  start: 'intro',
  nodes: {
    intro: {
      text: 'Morning! Sea\'s flat as glass today. You can hear the palms from all the way up at the well.',
      next: 'ask',
    },
    ask: {
      text: 'Have you been out to the north shore since the young palms took?',
      choices: [
        { label: 'I have', next: 'been' },
        { label: 'Not yet', next: 'notyet' },
        { label: 'Palms?', next: 'what' },
      ],
    },
    been: {
      text: 'Then you saw the leaning one. Storm bent it as a sprout and it never straightened. Best shade on the island.',
      next: 'bye',
    },
    notyet: {
      text: 'Go before noon, then. The tide\'s out and the sand stays cool a while yet.',
      next: 'bye',
    },
    what: {
      text: 'Ha! Come on now. Whole northern shore is nothing but palms and coconuts. Follow the sand and you can\'t miss them.',
      next: 'bye',
    },
    bye: {
      text: 'Mind the tall grass on your way — something\'s been rustling about in it.',
    },
  },
};

export const TULA = {
  name: 'Tula',
  start: 'intro',
  nodes: {
    intro: {
      text: 'You\'re not from one of these two houses, so you must have come off a boat.',
      next: 'ask',
    },
    ask: {
      text: 'Well? What do you make of our island so far?',
      choices: [
        { label: 'Beautiful', next: 'kind' },
        { label: 'Very quiet', next: 'quiet' },
        { label: 'Just passing', next: 'passing' },
      ],
    },
    kind: {
      text: 'It is, isn\'t it. Wait until the lamps come on — the whole plaza goes gold.',
      next: 'bye',
    },
    quiet: {
      text: 'Quiet! Come back at dusk and say that again. Everyone turns out once the heat breaks.',
      next: 'bye',
    },
    passing: {
      text: 'Everyone says that. Then the sun goes down and suddenly there\'s no hurry at all.',
      next: 'bye',
    },
    bye: {
      text: 'Anoka\'s down by the pond if you want the long version. Bring water.',
    },
  },
};
