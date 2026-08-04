/*
  Conversation trees. Data only — see dialogue.js for the shape and the runner.

  Branches converge more often than they split: every path through a script
  reaches an ending in two or three lines. A choice that only changes the reply
  you get is still worth having, and it is far cheaper to keep true than a tree
  that tries to remember what you picked.

  Lines that ought to notice the world are written as a table, indexed by what
  the sky is doing and which quarter of the day it is — see pick() in
  dialogue.js. The opening line carries the full sixteen, because it is the one
  line everybody gets every time, and a villager greeting you with "Morning!"
  while the lamps are lit and the rain is coming sideways is the fastest way to
  turn a world back into a set of props.

  Deeper lines mostly do not need it. Anoka's advice about the north shore does,
  because advice that ignores the hour is worse than no advice — she should not
  be sending anybody over the roots in the dark.
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
      text: {
        clear: {
          morning: 'Morning! Sea\'s flat as glass today. You can hear the palms from all the way up at the well.',
          noon: 'Hot one. I\'m for the shade of the leaning palm until the worst of it goes over.',
          evening: 'Best hour there is. Sun drops behind the palms and the whole shore turns copper.',
          night: 'Stars are all the way down to the water tonight. No moon to spoil them, either.',
        },
        wind: {
          morning: 'Wind\'s up early. Listen to the palms — that\'s the whole island talking at once.',
          noon: 'Hold on to that hat. Wind like this carries half the north shore up the path with it.',
          evening: 'It\'ll drop when the sun does. Always does. Then the lamps come on and it\'s still as a pond.',
          night: 'Can\'t sleep with the palms carrying on like this. Might as well be out here with them.',
        },
        rain: {
          morning: 'Rain before noon. Wonderful for the young palms. Terrible for this hat.',
          noon: 'Ha! You\'re as wet as I am. Rain doesn\'t much care what hour it keeps.',
          evening: 'Rain on warm sand — smell that? Best thing on this island and it lasts an hour.',
          night: 'Rain at night is the one that gets you. Can\'t see the puddles till you\'re standing in them.',
        },
        storm: {
          morning: 'Storm\'s come in early. Off the open path with you — the palms are bending double.',
          noon: 'Not a day for the north shore! Sea\'s throwing itself at the rocks out there.',
          evening: 'Get in off the path. The lamps won\'t do you the least bit of good in this.',
          night: 'Storm and no light but the lightning. Stay where the lamps are. I mean it.',
        },
      },
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
      // When to go is the whole of the advice, so it cannot be the same answer
      // at midnight as at dawn.
      text: {
        storm: 'Not while it\'s doing this. The shore path floods and then you\'re wading home.',
        any: {
          morning: 'Go before noon, then. The tide\'s out and the sand stays cool a while yet.',
          noon: 'Wait for the heat to break. Sand at this hour will take the skin off your feet.',
          evening: 'Go at first light instead. That shore at dawn is worth getting up for.',
          night: 'Not tonight. You\'ll turn an ankle on the roots and nobody will hear you shout.',
        },
      },
      next: 'bye',
    },
    what: {
      text: 'Ha! Come on now. Whole northern shore is nothing but palms and coconuts. Follow the sand and you can\'t miss them.',
      next: 'bye',
    },
    bye: {
      text: {
        any: 'Mind the tall grass on your way — something\'s been rustling about in it.',
        rain: 'Mind the puddles on the path. They sit deeper than they look.',
        storm: 'Straight home with you. The tall grass will keep till it blows over.',
      },
    },
  },
};

export const TULA = {
  name: 'Tula',
  start: 'intro',
  nodes: {
    intro: {
      text: {
        clear: {
          morning: 'You\'re not from one of these two houses, so you must have come off a boat.',
          noon: 'Sit in the shade a while. Nobody on this island does anything useful at this hour.',
          evening: 'There — heat\'s broken and the lamps are coming on. Whole plaza goes gold in a minute.',
          night: 'Late to be wandering, for someone who only just arrived. Keep to the lit path.',
        },
        wind: {
          morning: 'Wind\'s had my thread halfway to the pond twice already. Don\'t just stand there — hold this.',
          noon: 'Can\'t weave in this. Can\'t do much of anything in this, if I\'m honest.',
          evening: 'It drops at dusk and then everyone comes out at once. You\'ll see it happen.',
          night: 'Shutters banging the whole night through. You get used to it, or you get on a boat.',
        },
        rain: {
          morning: 'Rain empties the plaza. Suits me — I get the whole bench to myself.',
          noon: 'Under the eaves, come on. It\'ll have passed before the lamps come on.',
          evening: 'Rain and lamplight together. That\'s the picture people take away of this place.',
          night: 'You\'ll catch your death out in that. There\'s dry stone under the eaves here.',
        },
        storm: {
          morning: 'Nobody\'s out in this, and by rights neither should you be.',
          noon: 'A storm at midday. That\'s the sea telling the lot of us to sit down.',
          evening: 'Get under cover. The lamps flicker in this but they hold — they always hold.',
          night: 'Storm in the dark is the worst of them. Stay in, or stay where the lamps are.',
        },
      },
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
      text: {
        any: 'Anoka\'s down by the pond if you want the long version. Bring water.',
        rain: 'Anoka\'s down by the pond in this, I promise you. That woman does not come indoors.',
        storm: 'Anoka will be out in this, mark my words. Somebody ought to go and fetch her.',
      },
    },
  },
};
