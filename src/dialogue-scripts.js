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

/*
  The drifter on the south beach. His opening line carries the same sixteen as
  the others, but doing double duty: the weather across, and how far through a
  bottle he is down. Sober and sore at first light, expansive by the afternoon,
  and by night talking mostly to the sea.

  npc.js works the same curve into how he walks — see drunkAt() — so the state
  of him is legible before he has said a word, and the line only confirms it.
*/
export const BRAM = {
  name: 'Bram',
  start: 'intro',
  nodes: {
    intro: {
      text: {
        clear: {
          morning: 'Morning. Head\'s a shipwreck. Whatever I said last night, I\'ve decided it didn\'t happen.',
          noon: 'Ahh, there he is. Sit down — sand\'s warm and I have got nowhere at all to be.',
          evening: 'Now — now the evening gets going. You\'ll have one? Course you will. Sit.',
          night: 'Shh. She\'s talking. Sea talks all night and there\'s nobody out here writing it down but me.',
        },
        wind: {
          morning: 'Wind off the water. Clears the head. Doesn\'t mend it. Clears it.',
          noon: 'Hold your — whoa. Hold your feet, friend. She\'ll have you over, this one.',
          evening: 'Wind\'s got a lean on it tonight. Or I have. One of the two, and I know which I\'d bet.',
          night: 'S\'blowing the roof off and I haven\'t got one! Ha. Think about it. Go on.',
        },
        rain: {
          morning: 'Rain. Good. Saves me a wash, and I wasn\'t going to.',
          noon: 'You\'ll get wet stood there. I\'m already wet. I\'ve committed to it.',
          evening: 'Rain\'s warm this time of year. Warm rain. That\'s the whole trick of this place, that is.',
          night: 'Been rained on in worse plashes than this. Lots worse. Couldn\'t name one. Not one.',
        },
        storm: {
          morning: 'Storm\'s up. Everything I own is under that log and it is staying there.',
          noon: 'Don\'t stand about on open sand in this! Even I know that, and look at the state of me.',
          evening: 'Whoa. Whoa. She\'s angry tonight. Gets like this. We have an arrangement, her and me.',
          night: 'Lightning — there! S\'like the sky\'s got the hiccups. Like me. Hic. See?',
        },
      },
      next: 'ask',
    },
    ask: {
      text: 'Here. You look like a man who knows things. Is the tide coming in, or going out?',
      choices: [
        { label: 'Coming in', next: 'in' },
        { label: 'Going out', next: 'out' },
        { label: 'No idea', next: 'dunno' },
      ],
    },
    in: {
      text: 'In. Right. Then I shall be moving further up the beach. Eventually. In a bit.',
      next: 'bye',
    },
    out: {
      text: 'Out! Then there\'ll be shells by the rocks. There\'s always shells when she goes out.',
      next: 'bye',
    },
    dunno: {
      text: 'Nobody does. That\'s the honest answer and you\'re the first man on this island to give it me.',
      next: 'bye',
    },
    bye: {
      text: {
        any: 'Go on then. Mind the sharp bits — this sand is full of them.',
        rain: 'Off you go. And don\'t sit under the palms in rain, they drop things.',
        storm: 'Go! I\'m fine. I\'m always fine. Been out in worse than this and I\'ll tell you about it never.',
      },
    },
  },
};

/*
  Amy — three conversations that happen in order, in three places, and are the
  only thing in this file that remembers it has already happened. See story.js
  for where she is standing for each one.

  The villagers above are ambient: you can have their conversation eleven times
  and it costs nothing, so every line is written to be worth hearing twice. These
  are not. Each one runs once, moves her somewhere else, and is gone — so they
  are written the other way round, for the single time you get them.

  Two things follow from that, and both are visible in the data:

  - The name plate changes line to line. Ambient dialogue is one person talking
    at you and needs no such thing; this is two people talking, and the plate is
    the cheapest possible way to say which of them is speaking. Nodes with
    `name: null` are neither of them — that is the game saying what happened,
    and it gets no plate at all because nobody said it.

  - Only the opening line of each carries a weather table. She is not here to
    tell you about the island, and a woman working up to something does not stop
    to mention the wind. But she does arrive into whatever the day is doing, and
    the first line is where that shows.

  The three endings of AMY_FOUNTAIN are named for the places she goes on to be at.
  That is not a coincidence to be tidied up later — story.js reads the ending id
  straight back as a place, which is what keeps the choice and its consequence
  from being written down twice and drifting apart.
*/

export const AMY_HOUSE = {
  name: 'Amy',
  start: 'intro',
  nodes: {
    intro: {
      text: {
        clear: 'Oh — hello. I let myself in out of the sun. I did not expect anybody else to be wandering about in it.',
        wind: 'Shut that behind you, would you? Half the beach has already come in with me as it is.',
        rain: 'You are dripping on somebody\'s floor. Come in properly or go back out, but do pick one.',
        storm: 'Sit down. Nobody sensible is going back out in that, and I have decided that you are sensible.',
      },
      next: 'name',
    },
    name: {
      text: 'Amy. And no, I do not live here. I came in off a boat, the same as you did.',
      next: 'ask',
    },
    ask: {
      text: 'Well? You have been stood in that doorway a while now.',
      choices: [
        { label: 'You\'re beautiful', next: 'flat' },
        { label: 'Who are you?', next: 'who' },
        { label: 'Sorry — I\'ll go', next: 'go' },
      ],
    },
    flat: {
      text: 'Ha. Straight out with it. Men have said prettier things to me and meant a great deal less by them.',
      next: 'plain',
    },
    who: {
      text: 'Somebody who does not care to be asked that from a doorway. Come in, and then ask me.',
      next: 'plain',
    },
    go: {
      text: 'I did not tell you to leave. I said you had been standing there. Those are two different sentences.',
      next: 'plain',
    },
    plain: {
      text: 'I will save you the guessing. I say what I mean, and I do not soften it afterwards. Most people manage about a day of that.',
      next: 'stare',
    },
    stare: {
      name: null,
      text: 'You cannot think of a single thing to say back that would be worth her hearing.',
      next: 'longer',
    },
    longer: {
      name: 'You',
      text: 'I think I could manage more than a day.',
      next: 'amused',
    },
    amused: {
      text: 'Everyone thinks that. On the first day.',
      next: 'off',
    },
    off: {
      text: 'Anyhow. I am off — I have been under a roof long enough, and the day does not wait about for a conversation.',
      next: 'bye',
    },
    bye: {
      text: 'The fountain, if you are still standing there once I have gone. Everyone ends up at the fountain.',
    },
  },
};

export const AMY_FOUNTAIN = {
  name: 'Amy',
  start: 'intro',
  nodes: {
    intro: {
      text: {
        clear: {
          morning: 'You came. Early, as well. I had you down for the sort who turns up at noon.',
          noon: 'You came. In this heat, too. Sit on the curb before you fall down.',
          evening: 'You came. Good — this is the hour worth being out in. Whole plaza goes gold in a minute.',
          night: 'You came. This late, and out to the fountain of all places. That is either very sweet or very stupid.',
        },
        any: 'You came. In this, of all things. That is either very sweet or very stupid and I have not settled which.',
      },
      next: 'say',
    },
    say: {
      name: 'You',
      text: 'There is something I did not say in the house.',
      next: 'more',
    },
    more: {
      name: 'You',
      text: 'I would like to know you more. I am enamoured by you. Whatever this is — I want more of it.',
      next: 'tried',
    },
    tried: {
      text: 'Many men have said something close to that, stood about where you are stood now.',
      next: 'special',
    },
    special: {
      text: 'It is going to take someone special to win my heart. I am not sorry about that.',
      next: 'try',
    },
    try: {
      name: 'You',
      text: 'Then I will try.',
      next: 'where',
    },
    where: {
      text: 'Then take me somewhere, and be there before I am. Where are we going?',
      choices: [
        { label: 'Dinner, indoors', next: 'dinner' },
        { label: 'Picnic at the lagoon', next: 'picnic' },
        { label: 'Stars, on the beach', next: 'stars' },
      ],
    },
    dinner: {
      text: 'The house with the long table, then. I will be sat at it before you are through the door.',
    },
    picnic: {
      text: 'The lagoon, then. Bring something worth eating, and do not be clever about it.',
    },
    /*
      The one line in this file that reaches out of the box and changes the
      world: she wants stars, so the sun goes down — for everybody on the island,
      not only for whoever asked. See story.js, and sim.hurry() for the mechanism.
      It is cued here rather than arranged in code because it is part of what she
      said, and a line that turns out to have been a promise should be able to
      keep it from where it was spoken.
    */
    stars: {
      text: 'Then let it get dark. The top of the road, where it runs out into the sand — I will be stood at the end of it.',
      cue: 'nightfall',
    },
  },
};

/*
  The one that matters — and from `never` onwards it is the same wherever she is
  sat, which is the point of letting you choose. What she has to say to you does
  not depend on whether there is a table under it.

  What does depend on it is the first minute. Arriving somewhere is its own small
  scene: there is a thing to say about the chairs, or the food you brought, or
  the walk in the dark, and none of those three sentences work in the other two
  places. So each spot opens with its own bit of banter and then hands over.

  One script rather than three, with three doors into it: amyDate() below picks
  which one you came in by. Three scripts that happened to share fourteen nodes
  would be three scripts that slowly stopped sharing them.
*/
export const AMY_DATE = {
  name: 'Amy',
  start: 'dinner',
  nodes: {
    // ---- dinner, at the long table
    dinner: {
      text: 'You are late. I have been sat here long enough to have named all six of these chairs.',
      next: 'dinner2',
    },
    dinner2: {
      name: 'You',
      text: 'You said you would be at the table before I got through the door. I was only making you honest.',
      next: 'dinner3',
    },
    dinner3: {
      text: 'Careful. I could get used to being answered back.',
      next: 'dinner4',
    },
    dinner4: {
      name: 'You',
      text: 'Then I will keep doing it.',
      next: 'dinner5',
    },
    dinner5: {
      text: 'Sit down. And stop looking at me like that — the food is over here.',
      next: 'never',
    },

    // ---- a picnic on the lip of the lagoon
    picnic: {
      text: 'You brought something. I will be honest, I did not entirely expect you to bring something.',
      next: 'picnic2',
    },
    picnic2: {
      name: 'You',
      text: 'You said not to be clever about it. So it is bread, and it is fruit, and that is the whole of it.',
      next: 'picnic3',
    },
    picnic3: {
      text: 'That is the most romantic thing anybody has managed all year, and you did it by not trying.',
      next: 'picnic4',
    },
    picnic4: {
      name: 'You',
      text: 'I will remember that.',
      next: 'picnic5',
    },
    picnic5: {
      text: 'Do not, you will ruin it. Sit — the water goes green just here when the light is low.',
      next: 'never',
    },

    // ---- the end of the road, where it meets the north sand, after dark
    stars: {
      text: 'You came all the way back up the road in the dark, then.',
      next: 'stars2',
    },
    stars2: {
      name: 'You',
      text: 'You said the end of the road.',
      next: 'stars3',
    },
    stars3: {
      text: 'I did. I did not think you would take me at my word quite so exactly.',
      next: 'stars4',
    },
    stars4: {
      name: 'You',
      text: 'I am going to keep doing that.',
      next: 'stars5',
    },
    stars5: {
      text: 'Lie back, then. You cannot see them properly stood up, and I refuse to be the only one on this beach looking foolish.',
      next: 'never',
    },

    never: {
      name: 'You',
      text: 'I have never met a girl like you before.',
      next: 'fit',
    },
    fit: {
      name: 'You',
      text: 'And I am not sure I am the right fit. I come with a great deal of baggage.',
      next: 'father',
    },
    father: {
      name: 'You',
      text: 'My father was never there. And home was not a safe place to be, most days of it.',
      next: 'chance',
    },
    chance: {
      name: 'You',
      text: 'But if you would give me a chance, I would do anything to build you a perfect life.',
      next: 'stop',
    },
    stop: {
      text: 'Stop. Stop there.',
      next: 'happy',
    },
    happy: {
      text: 'I do not need a man to hand me a perfect life. I am happy. I was happy long before you turned up.',
      next: 'partner',
    },
    partner: {
      text: 'What I want is a partner. I want you whole on your own — so that the two of us are whole together.',
      next: 'fair',
    },
    fair: {
      name: 'You',
      text: 'That is fair. That is more than fair.',
      next: 'strong',
    },
    strong: {
      text: 'I need somebody strong, like my father. And present, like my mother. One without the other is no use to me.',
      next: 'legacy',
    },
    legacy: {
      text: 'And I am not doing this without something to build. Goals — for you, for me, for whatever the two of us turn out to be.',
      next: 'three',
    },
    three: {
      text: 'Three of them. One, a godly spouse. Two, a godly family.',
      next: 'stretch',
    },
    stretch: {
      text: 'And three, if I am lucky — and this one is a stretch — something that outlasts the both of us. Generational wealth.',
      next: 'in',
    },
    in: {
      name: 'You',
      text: 'I am in. I am in forever.',
      next: 'kiss',
    },
    // The cue goes on the kiss rather than on the line after it, so the sky is
    // already going by the time you have read the sentence.
    kiss: {
      name: null,
      text: 'She kisses you.',
      cue: 'fireworks',
      next: 'sky',
    },
    sky: {
      name: null,
      text: 'And the sky over the water goes to pieces.',
      next: 'last',
    },
    // The last line, and then the box closes and she simply walks off — which
    // is why there is no "and she is gone" node here any more. Watching somebody
    // leave beats being told they left, and the walk is already written: see
    // leave() in story.js.
    last: {
      text: 'Come and find me when you are a complete man.',
    },
  },
};

/**
 * The date, entered by the door you chose on the beach. The spot names are the
 * node names are the place ids — one word, three jobs, and nothing in the middle
 * to fall out of step.
 */
export const amyDate = (spot) => ({ ...AMY_DATE, start: spot });
