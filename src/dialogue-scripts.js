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
  The opening, played once on load before the player has the island.

  Nobody speaks it, so it carries no name plate — the whole script is
  `name: null`, which the box reads as the game telling you something rather
  than a person telling you something. Same treatment as the kiss and the
  fireworks at the other end of the story, and for the same reason.

  It is doing one job beyond the mood, and the last two lines are it: a player
  dropped on an island with two houses and a fountain has no reason to walk
  into anybody's front door. After this they have one.

  Deliberately short. It is the only thing standing between opening the page and
  playing, it plays again on every reload while there is no saved progress, and
  six lines is about as long as anybody forgives twice.
*/
export const OPENING = {
  name: null,
  start: 'sea',
  nodes: {
    sea: {
      text: 'A year at sea now, and you had stopped counting the islands somewhere around the ninth.',
      next: 'boat',
    },
    boat: {
      text: 'Then this morning a boat crossed yours, close enough to hear its ropes — and there was a girl at the rail of it.',
      next: 'glimpse',
    },
    glimpse: {
      text: 'You caught her out of the corner of your eye. A moment of her, and the swell carried her past.',
      next: 'since',
    },
    since: {
      text: 'You have thought about very little else since.',
      next: 'ashore',
    },
    ashore: {
      text: 'Your hull touched sand an hour ago. Tidewatch: two houses, a fountain, and a road running north to the shore.',
      next: 'find',
    },
    find: {
      text: 'Her boat put in here as well. She is somewhere on this island, out of the weather. Go and find her.',
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

  And a note on her voice, because it is the whole of her and it is easy to write
  the wrong one by accident. Amy is strong and her language is soft. Those are
  not in tension — the strength is in what she will and will not have, and the
  softness is in how she says it. She asks rather than orders, she is openly glad
  to see you, she takes a compliment instead of batting it away, and when she
  stops you she does it gently and with her hand out.

  The first draft of these lines got that backwards: her strength was written as
  hardness, so she arrived clipped and arch and correcting people's grammar, and
  at one point announced that she does not soften anything. That is a woman you
  admire from a distance. It is not one you fall in love with, and falling in
  love with her is the only thing this script has to do.

  So: no barbs, no orders where an invitation will do, and nothing that scores a
  point off him. If a line of hers could be delivered with a raised eyebrow, it
  is the wrong line.

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
        clear: 'Oh — hello. I let myself in out of the sun; I hope that is all right. I did not think anybody else was out in it.',
        wind: 'Come in, come in — and pull that to behind you. Half the beach has followed me in as it is.',
        rain: 'You are soaked through. Come all the way in, there is dry floor over this side.',
        storm: 'Come in and sit down. Nobody should be out in that, and I would rather not be the only one in here listening to it.',
      },
      next: 'name',
    },
    name: {
      text: 'Amy. And no, this is not my house either — I came in off a boat, same as you did. We are both trespassing.',
      next: 'ask',
    },
    ask: {
      text: 'You have been standing in that doorway a while now. You are allowed to say something.',
      choices: [
        { label: 'You\'re beautiful', next: 'flat' },
        { label: 'Who are you?', next: 'who' },
        { label: 'Sorry — I\'ll go', next: 'go' },
      ],
    },
    flat: {
      text: 'Oh. Straight out with it, then. That is a kinder thing to hear than you know, and I will not pretend otherwise.',
      next: 'plain',
    },
    who: {
      text: 'Somebody sheltering, the same as you. Come in properly and I will tell you the rest of it.',
      next: 'plain',
    },
    go: {
      text: 'No — stay. I did not say you were in the way. I only said you had been standing there a while.',
      next: 'plain',
    },
    // The line that says who she is, and the one the whole register turns on.
    // It used to read "I do not soften it afterwards", which was the wrong woman.
    plain: {
      text: 'I will save you the guessing. I say what I mean — gently, I hope, but I do say it. Most people manage about a day of that.',
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
      text: 'They all think that on the first day. I would like to be wrong about you.',
      next: 'off',
    },
    off: {
      text: 'Anyway. I should go — I have been under a roof long enough for one afternoon.',
      next: 'bye',
    },
    bye: {
      text: 'The fountain, though. If you find yourself out that way. Everybody ends up at the fountain sooner or later.',
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
          morning: 'You came. And early, as well. I had half decided you would not, and I am glad to be wrong.',
          noon: 'You came, in all this heat. Come and sit on the curb — there is shade this side of it.',
          evening: 'You came, and at the best hour for it. Give it a minute and the whole plaza goes gold.',
          night: 'You came. This late, and all the way out here. That was either very sweet of you or very silly.',
        },
        any: 'You came. In this, of all things. That was either very sweet of you or very silly, and I have not settled which.',
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
      text: 'Others have said something close to that, stood just about where you are. I am not made of stone — I always liked hearing it.',
      next: 'special',
    },
    special: {
      text: 'But it will take somebody rather particular to win my heart. I hope that does not put you off — I would rather you knew.',
      next: 'try',
    },
    try: {
      name: 'You',
      text: 'Then I will try.',
      next: 'where',
    },
    where: {
      text: 'Then take me somewhere. Somewhere you have thought about. Where are we going?',
      choices: [
        { label: 'Dinner, indoors', next: 'dinner' },
        { label: 'Picnic at the lagoon', next: 'picnic' },
        { label: 'Stars, on the beach', next: 'stars' },
      ],
    },
    dinner: {
      text: 'The house with the long table, then. I will be there before you are — I am always early, it is a terrible habit.',
    },
    picnic: {
      text: 'The lagoon, then. Bring something to eat, and please do not go to any trouble over it.',
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
      text: 'Then let it get dark. The top of the road, where it runs out into the sand — I will be waiting at the end of it.',
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
      text: 'There you are. I have been here long enough to have named all six of these chairs, and I did not mind a bit.',
      next: 'dinner2',
    },
    dinner2: {
      name: 'You',
      text: 'You said you would be at the table before I got through the door. I was only making you honest.',
      next: 'dinner3',
    },
    dinner3: {
      text: 'Oh, I like that. I could get used to being answered back.',
      next: 'dinner4',
    },
    dinner4: {
      name: 'You',
      text: 'Then I will keep doing it.',
      next: 'dinner5',
    },
    dinner5: {
      text: 'Come and sit, then. And do stop looking at me like that — you will put me off my food.',
      next: 'never',
    },

    // ---- a picnic on the lip of the lagoon
    picnic: {
      text: 'You brought something. That was kind of you — I will admit I did not altogether expect it.',
      next: 'picnic2',
    },
    picnic2: {
      name: 'You',
      text: 'You said not to be clever about it. So it is bread, and it is fruit, and that is the whole of it.',
      next: 'picnic3',
    },
    picnic3: {
      text: 'That is the loveliest thing anybody has done for me all year, and you managed it by not trying.',
      next: 'picnic4',
    },
    picnic4: {
      name: 'You',
      text: 'I will remember that.',
      next: 'picnic5',
    },
    picnic5: {
      text: 'Oh, do not — you will ruin it. Come and sit; the water goes green just here when the light gets low.',
      next: 'never',
    },

    // ---- the end of the road, where it meets the north sand, after dark
    stars: {
      text: 'You came all the way back up the road in the dark. You did not have to do that.',
      next: 'stars2',
    },
    stars2: {
      name: 'You',
      text: 'You said the end of the road.',
      next: 'stars3',
    },
    stars3: {
      text: 'I did. I did not think anybody would take me at my word quite so exactly. It is a lovely feeling.',
      next: 'stars4',
    },
    stars4: {
      name: 'You',
      text: 'I am going to keep doing that.',
      next: 'stars5',
    },
    stars5: {
      text: 'Lie back with me, then. You cannot see them properly stood up — and I would rather not be the only one on this beach looking foolish.',
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
    // The turn of the whole story, and it has to be gentle. She is not shutting
    // him up; she is catching something before he has to carry it.
    stop: {
      text: 'Oh, stop. Stop there a moment — before you promise me something you would have to carry all your life.',
      next: 'happy',
    },
    happy: {
      text: 'I do not need a man to hand me a perfect life. I am happy already. I was happy long before you turned up.',
      next: 'partner',
    },
    partner: {
      text: 'What I would like is a partner. I want you whole on your own, so that the two of us are whole together.',
      next: 'fair',
    },
    fair: {
      name: 'You',
      text: 'That is fair. That is more than fair.',
      next: 'strong',
    },
    strong: {
      text: 'I would like somebody strong, the way my father was. And present, the way my mother was. Never one without the other.',
      next: 'legacy',
    },
    legacy: {
      text: 'And I would like us to be building something. Goals — for you, for me, for whatever the two of us turn out to be.',
      next: 'three',
    },
    three: {
      text: 'Three of them. The first is a godly spouse. The second, a godly family.',
      next: 'stretch',
    },
    stretch: {
      text: 'And the third, if I am very lucky — and I know it is a reach — something that outlasts the both of us. Generational wealth.',
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
    // Her words, kept exactly. The second sentence is the softness the line
    // needs to land as a hope rather than a condition — without it she reads as
    // setting a test, and she has never once been setting a test.
    last: {
      text: 'Come and find me when you are a complete man. I will be hoping that you do.',
    },
  },
};

/**
 * The date, entered by the door you chose on the beach. The spot names are the
 * node names are the place ids — one word, three jobs, and nothing in the middle
 * to fall out of step.
 */
export const amyDate = (spot) => ({ ...AMY_DATE, start: spot });
