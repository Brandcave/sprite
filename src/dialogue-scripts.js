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

  ---

  The villagers also notice the *story*, which is the other axis this file runs
  on. Each of them is not one script but four, keyed by how far along you are
  with Amy — see story.js for where those four names come from:

    searching  you have seen her once, from a boat, and she is somewhere here
    met        you have talked in the house; nothing is arranged
    date       the fountain is done and there is a plan for tonight
    gone       she has kissed you and sailed, and told you to come back whole

  `met` is the island as it was before any of this: the ambient conversation,
  unchanged, and it is deliberately the widest chapter because it is the one you
  spend the most time in. The other three are the village noticing.

  Two rules keep this from turning into a chorus:

  - They are not all equally informed, and that is most of the characterisation.
    Anoka is outdoors from first light and reasons about where a person *would*
    be; Tula sits on the plaza and simply watched her walk past; Bram has been
    staring at the sea all day and could not tell you one thing that was on it.
    Three answers to the same question, and only two of them are answers.

  - Nobody drops the weather to talk about her. A chapter changes what a villager
    is thinking about, not whether it is raining on them — so every chapter
    opening carries its own sixteen, exactly like the ambient one, and the
    deeper lines vary where the hour or the sky would change the sense of them.
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

/*
  Anoka, by the pond — and the one villager who is useful to a man looking for
  somebody, because she is outdoors from first light and thinks in terms of where
  a person would sensibly be. She does not claim to have seen Amy. She works out
  where she must have gone and sends you there, which is a different kind of help
  and the one that suits her.

  Her chapter openings each have a job beyond the mood:
    searching  she notices you are searching before you say so
    date       Amy has been down here twice, unable to talk about anything else
    gone       she saw the boat go, and has been waiting for you to come and ask
*/
const ANOKA_SEARCHING = {
  name: 'Anoka',
  start: 'intro',
  nodes: {
    intro: {
      text: {
        clear: {
          morning: 'You have been past this pond twice now, and both times you were looking at everything except the water.',
          noon: 'Nobody crosses this lawn at this hour unless they are after something. Get in the shade and tell me what.',
          evening: 'Copper light, flat sea, and you have not looked at either of them once. Who is it you are hunting for?',
          night: 'Out this late, walking along reading doors. Say who it is and save your feet.',
        },
        wind: {
          morning: 'Wind up early and you still out in it, up and down the path. That is a man looking for somebody.',
          noon: 'Hold that hat. And stop searching the treeline — whatever you have lost, it is not up a palm.',
          evening: 'It drops when the sun does, and then you will hear yourself think. Whatever you are chasing, chase it then.',
          night: 'The palms carrying on, and you wandering about underneath them. Neither of you will sleep at this rate.',
        },
        rain: {
          morning: 'Rain before noon and you are out walking in it. Either you like it or you are looking for somebody.',
          noon: 'You are as wet as I am, and I have got an excuse. Have you?',
          evening: 'Rain, lamplight, and a stranger going door to door. Go on, then. Ask me.',
          night: 'You will find nothing out here at this hour but puddles. Ask, and I will save you the wet.',
        },
        storm: {
          morning: 'Off the open path with you — no, do not tell me. You are looking for somebody. It is written all over you.',
          noon: 'Not a day for searching the shore. Whoever it is has had the sense to get in out of this.',
          evening: 'Get in off the path. And whoever you are after is under a roof, if they have any sense at all.',
          night: 'Storm, dark, and you out in the both of them. This had better be worth it.',
        },
      },
      next: 'q',
    },
    q: {
      name: 'You',
      text: 'There was a girl at the rail of a boat this morning. Hers put in here as well. I have been looking for her since.',
      next: 'ha',
    },
    ha: {
      text: 'A girl off a boat. And you have been up and down my path all this while working yourself up to asking.',
      next: 'ask',
    },
    ask: {
      text: 'Go on then. How much of her did you actually see?',
      choices: [
        { label: 'A moment of her', next: 'moment' },
        { label: 'Enough', next: 'enough' },
        { label: 'It sounds foolish', next: 'foolish' },
      ],
    },
    moment: {
      text: 'A moment. And here you are on somebody else\'s island because of it. I have heard worse reasons for a crossing.',
      next: 'where',
    },
    enough: {
      text: 'Enough. Well. People have built a whole life on less than they thought was enough, so I shall not argue with you.',
      next: 'where',
    },
    foolish: {
      text: 'It does. It also gets a boat across open water, which is more than sense has ever managed. Come on.',
      next: 'where',
    },
    // Where to look is the whole of the advice, so like her north shore
    // directions it cannot be the same answer at midnight as at dawn. She is
    // not reporting a sighting — she is reasoning about where a stranger goes.
    where: {
      text: {
        storm: 'Nobody is standing about in this. She will be in out of it, and there are only two roofs on this island worth the name — up the road.',
        rain: 'She will not be out in this. Try the two houses up the road; that is where the dry floor is.',
        any: {
          morning: 'Try the houses up the road. Somebody new goes indoors first and looks about afterwards — always the way.',
          noon: 'At this hour? Indoors, out of the sun, the same as anybody with sense. The two houses, up the road.',
          evening: 'Start at the houses up the road and work back down to the plaza. The lamps will be on before you have done both.',
          night: 'Not out here, not at this hour. The two houses up the road — knock or do not, nobody on this island locks anything.',
        },
      },
      next: 'bye',
    },
    bye: {
      text: {
        any: 'Go on. And when you find her, do not stand there saying nothing. That is the mistake they all make.',
        rain: 'Go on, before you catch something. And say something when you get there — that is the whole trick of it.',
        storm: 'Straight up the road with you. She will keep until you are dry.',
      },
    },
  },
};

const ANOKA_MET = {
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
    /*
      The one line in the ambient dialogue that hands you something — see `give`
      in dialogue.js. It goes here rather than anywhere else because she has
      been talking about coconuts since the first conversation and this is the
      branch where you admit you do not know what she means; a woman who has
      just been asked "palms?" is a woman who is about to produce a coconut.

      Ambient dialogue runs as many times as you care to press Z, so this can
      hand out as many as you can carry. That is the right behaviour and not an
      oversight: she is standing next to an entire shore of them, and a villager
      who rations coconuts is a stranger thing than one who does not.
    */
    what: {
      text: 'Ha! Come on now. Whole northern shore is nothing but palms and coconuts. Here — take this one and see for yourself.',
      give: 'coconut',
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

const ANOKA_DATE = {
  name: 'Anoka',
  start: 'intro',
  nodes: {
    intro: {
      text: {
        clear: {
          morning: 'Your girl was down here at first light and told the pond, the palms and me. Three times, near enough.',
          noon: 'She stood here in the worst of the heat and never once mentioned it. That is a woman with her mind elsewhere.',
          evening: 'She came down at the gold hour and stood exactly where you are, telling me about this evening.',
          night: 'She has been past twice since dark on the excuse of nothing at all. You know quite well why.',
        },
        wind: {
          morning: 'She was down here in this wind holding her hair on with both hands and grinning about you.',
          noon: 'The wind had half of what she said before it got to me, and I still caught the gist. It is you.',
          evening: 'She told me the whole of it stood in this and did not notice the weather once.',
          night: 'Shutters going, palms going, and that girl out in the middle of it looking pleased with herself.',
        },
        rain: {
          morning: 'She stood in this rain laying out her plans and would not come under the tree for it.',
          noon: 'Wet through and beaming. I told her to get in the dry. She said she was perfectly fine.',
          evening: 'Rain, lamps, and a girl who cannot talk about anything but her evening. Guess whose.',
          night: 'She has been out in this once already tonight, and it was not for the water.',
        },
        storm: {
          morning: 'Even in this she was down here. I sent her back up the road twice and she came back both times.',
          noon: 'She came out in a storm to tell me about it. That is what you have gone and done to her.',
          evening: 'Weather coming in and she is worried about one thing only, and it is not the sky.',
          night: 'She will be indoors in this, thinking about it. Which is where you ought to be as well.',
        },
      },
      next: 'ask',
    },
    ask: {
      text: 'So. Have you given any thought at all to what you mean to say to her?',
      choices: [
        { label: 'Every word', next: 'every' },
        { label: 'Not one', next: 'none' },
        { label: 'I\'ll know when I see her', next: 'know' },
      ],
    },
    every: {
      text: 'Good. Now forget half of it. The half you forget will be the half that was for you and not for her.',
      next: 'bye',
    },
    none: {
      text: 'Ha! Honest, at least. She will not mind — she is not going for the speech, whatever you may think.',
      next: 'bye',
    },
    know: {
      text: 'That is either the bravest thing I have heard this year or the laziest, and we shall both find out which.',
      next: 'bye',
    },
    bye: {
      text: {
        any: 'Be where you said you would be, and be there first. That is the whole of it.',
        rain: 'Be there first, and be dry when she arrives, if you can manage the two together.',
        storm: 'Be there first. And if it keeps on like this, be there with something over your head.',
      },
    },
  },
};

const ANOKA_GONE = {
  name: 'Anoka',
  start: 'intro',
  nodes: {
    intro: {
      text: {
        clear: {
          morning: 'You have the look of a man who woke up and found the island one person short.',
          noon: 'She went at first light. I saw the sail off the point and I knew whose it was without being told.',
          evening: 'Copper light and nobody to point it out to. I know. I watched her go.',
          night: 'She is gone, and you have been walking since dark. Sit down here a minute.',
        },
        wind: {
          morning: 'The wind was behind her when she went. That is a good thing for a boat, whatever it is for you.',
          noon: 'Do not go out to the point looking. She is well past it, and has been for hours.',
          evening: 'The palms are the only thing on this island still going on about it. Come away from the path.',
          night: 'You will not hear a boat over this. Stop standing there listening for one.',
        },
        rain: {
          morning: 'She got out before the rain came in. Small mercy, and it is the only one I have got for you.',
          noon: 'Standing in the wet will not bring her back an hour sooner. I have tried it.',
          evening: 'I know. I saw her go, and I have been waiting all day for you to come down and ask me.',
          night: 'Get in out of it. She did not leave so that you could stand about catching cold over her.',
        },
        storm: {
          morning: 'She was gone before this came over, and I am glad of it. So should you be, when you can manage it.',
          noon: 'No. She is not out in this. She went well ahead of it, and cleanly.',
          evening: 'Off the path. Whatever you are turning over, you can turn it over under a roof.',
          night: 'She is somewhere dry tonight, wherever she is. Believe that, and go home.',
        },
      },
      next: 'ask',
    },
    ask: {
      text: 'Go on. Ask me the thing you came all the way down here to ask.',
      choices: [
        { label: 'Where did she go?', next: 'where' },
        { label: 'Did she say anything?', next: 'said' },
        { label: 'Is she coming back?', next: 'back' },
      ],
    },
    where: {
      text: 'North, past the point, and I did not ask further than that. She was not hiding it — nobody thought to ask her.',
      next: 'bye',
    },
    said: {
      text: 'She thanked me for nothing I had done. And she said your name the way people say a thing they have already decided.',
      next: 'bye',
    },
    back: {
      text: 'That is not mine to promise you. But she left the way people leave who mean to be seen again.',
      next: 'bye',
    },
    // The line that turns a departure into work. Her last words to him were
    // "come and find me when you are a complete man", and Anoka is the villager
    // who would hear that as an instruction rather than a goodbye.
    bye: {
      text: {
        any: 'She said come and find her when you are whole. So go and be whole. That is work, not waiting.',
        rain: 'Go and be whole, she said. You can start by getting in out of this.',
        storm: 'Go and be whole. And start by getting in off my path before the palms come down on you.',
      },
    },
  },
};

export const ANOKA = {
  searching: ANOKA_SEARCHING,
  met: ANOKA_MET,
  date: ANOKA_DATE,
  gone: ANOKA_GONE,
};

/*
  The one conversation on this island you do not walk up to and start. Amy has
  said her last line and gone, and before the game hands control back Anoka
  crosses the ground to him — see epilogue() in story.js for the staging.

  It is hers to say and nobody else's. Tula would be kind about it and Bram
  would be sentimental; Anoka is the one who hears "come and find me when you
  are a complete man" as a job of work rather than a goodbye, and she has been
  saying so in miniature since the first conversation. This is that, to his face,
  with the boat still in sight.

  The question at the end has one answer, which is the point of asking it. She is
  not offering him a choice — she is making him say it out loud, because a thing
  you have said out loud to somebody is harder to put down afterwards. A menu
  with one item in it looks like a menu right up until you read it, and then it
  is a man agreeing to something.
*/
export const ANOKA_LAST = {
  name: 'Anoka',
  start: 'over',
  nodes: {
    // Her only weather line here, and it earns it the way all of hers do: she is
    // the woman who is outdoors in it, so what the sky is doing is the first
    // thing she says about anything.
    over: {
      text: {
        any: 'I came over. You have the face of a man who has just been handed something and cannot yet tell what it weighs.',
        rain: 'I came over, and I am not going to stand here in the wet being tactful. You have that look about you.',
        storm: 'I came over before this gets any worse. You can stand about in it afterwards if you must.',
      },
      next: 'begin',
    },
    begin: {
      text: 'You think that was the end of something. It was not. That was the start of it, and you are stood on the line.',
      next: 'whole',
    },
    whole: {
      text: 'She asked you to come back whole. Nobody is handed whole. It gets built, by hand, and mostly on the days you would rather not.',
      next: 'work',
    },
    work: {
      text: 'That is the whole of it, and it is not a pretty thing to be told. It is work. It will be work for a long while yet.',
      next: 'ask',
    },
    ask: {
      text: 'So I will ask you plainly, and I would like it answered the same way. Are you up for it?',
      choices: [{ label: 'Yes', next: 'yes' }],
    },
    yes: {
      text: 'Good. Then go and start. Not tomorrow — a man who starts tomorrow starts tomorrow every day of his life.',
    },
  },
};

/*
  Tula, on the plaza bench, with the whole village walking past her all day.

  Where Anoka reasons, Tula simply *saw* — she is the eyewitness, and the pleasure
  she takes in knowing a thing before you do is the whole of her. So both women
  send you up the road to the houses and neither is repeating the other: one is
  telling you where a stranger would go, the other is telling you where this
  particular stranger went, and enjoying herself about it.

  She is also the one Amy actually talks to, which is what earns her the `date`
  chapter and makes the `gone` one land — the gossip is the one left holding the
  half of it she was asked not to pass on.
*/
const TULA_SEARCHING = {
  name: 'Tula',
  start: 'intro',
  nodes: {
    intro: {
      text: {
        clear: {
          morning: 'Two boats put in this morning and I have now met the both of you. Yours was the slower.',
          noon: 'Sit down before you say it. Whatever you are about to ask me, I already know the answer.',
          evening: 'The lamps are coming on and you have not stopped moving once. What is it you are after?',
          night: 'Wandering the plaza after dark on your first day. You are either lost or looking, and you do not look lost.',
        },
        wind: {
          morning: 'Hold this thread. Now say what you came over to say — you have been circling this bench a quarter of an hour.',
          noon: 'Cannot weave, cannot hear, and there you stand wanting something. Speak up.',
          evening: 'It drops at dusk. So will you, if you keep going up and down that road all evening.',
          night: 'Shutters banging and a stranger pacing the plaza. Delightful night, this.',
        },
        rain: {
          morning: 'Rain empties this plaza, and yet here you are. That is not a liking for weather. That is looking for somebody.',
          noon: 'Under the eaves with you. Then ask — you have had a question on your face since you came round the fountain.',
          evening: 'Wet stone, lit lamps, and a man reading every doorway but the one I am sitting in. Go on.',
          night: 'You will catch your death. Ask me whatever it is, and then go and be dry somewhere.',
        },
        storm: {
          morning: 'Nobody is out in this but me and whoever is looking for somebody. Which of those are you?',
          noon: 'A storm at midday and a stranger on the plaza. Sit. Ask.',
          evening: 'Get under the eaves and ask me properly. I am not shouting over that for anybody.',
          night: 'Out in this? Then it is a person you are after, and it matters to you. Out with it.',
        },
      },
      next: 'q',
    },
    q: {
      name: 'You',
      text: 'A girl came in off a boat this morning. I am trying to find her.',
      next: 'saw',
    },
    saw: {
      text: 'She did, and I saw her. Went up the road like she had been here before and did not ask one living soul for directions.',
      next: 'ask',
    },
    ask: {
      text: 'And what do you mean to do when you find her? I only ask because I shall hear about it either way.',
      choices: [
        { label: 'Tell her the truth', next: 'truth' },
        { label: 'I haven\'t got that far', next: 'notfar' },
        { label: 'That\'s between us', next: 'between' },
      ],
    },
    truth: {
      text: 'Good. She has the look of somebody who has been told a great many careful things and believed none of them.',
      next: 'where',
    },
    notfar: {
      text: 'Ha! Then find her slowly. You have got until she gets bored, and I would not bank on that being long.',
      next: 'where',
    },
    between: {
      text: 'It will not be. Nothing on this island is. But I like you the better for saying it.',
      next: 'where',
    },
    // The eyewitness answer — where she went, not where she'd be — so the hour
    // changes how much of it Tula can still vouch for.
    where: {
      text: {
        storm: 'Up the road, towards the two houses, and in this she will not have come out of one since.',
        rain: 'Up the road, towards the houses. She went in out of the wet and I have not seen her back.',
        any: {
          morning: 'Up the road, towards the houses. She went in out of the sun and has not been past me since.',
          noon: 'Up the road. She will not have come back out into this heat — nobody does, and she strikes me as sensible.',
          evening: 'Up the road, hours ago now. She has not come back down it, and I would have seen her if she had.',
          night: 'Up the road, and that was this morning. She has not passed this bench since, and I have been on it all day.',
        },
      },
      next: 'bye',
    },
    bye: {
      text: {
        any: 'Go on, then. And do come back and tell me how it went — I shall only invent something otherwise.',
        rain: 'Go on. And come back and tell me, or I shall make it up and mine will be worse.',
        storm: 'Go, before this gets any louder. And I want the whole of it afterwards, mind.',
      },
    },
  },
};

const TULA_MET = {
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

const TULA_DATE = {
  name: 'Tula',
  start: 'intro',
  nodes: {
    intro: {
      text: {
        clear: {
          morning: 'She came past this bench at first light walking about a foot off the ground. I did not have to ask why.',
          noon: 'She has been past three times in this heat with nowhere in particular to be. Three times.',
          evening: 'The lamps are coming on and half the plaza already knows about your evening. Not from me. Mostly not from me.',
          night: 'She was past here after dark, and she was not out for the air. You have got that girl thoroughly rattled.',
        },
        wind: {
          morning: 'She stopped in this wind to tell me a thing she could have told me tomorrow. That is how I know.',
          noon: 'I lost every third word of it to the wind and got the whole story anyway. It is about you.',
          evening: 'It will drop at dusk and then everybody comes out, and every one of them will have heard by supper.',
          night: 'Shutters banging, and that girl still out there somewhere too pleased to sit down.',
        },
        rain: {
          morning: 'She stood in the rain to tell me and would not come under the eaves for it. In the rain!',
          noon: 'Wet through and would not stop talking. I have never seen anybody so unbothered about being soaked.',
          evening: 'Rain and lamplight and the whole plaza whispering. That is the picture people take away of this place.',
          night: 'She has been out in this tonight already, and it was not the weather she came out for.',
        },
        storm: {
          morning: 'She came out in this to tell me. I said sit down, girl. She did not sit down.',
          noon: 'A storm at midday and she is worried about one thing, and the sky is not it.',
          evening: 'Get under cover. And then tell me you have not gone and made a mess of the arrangements.',
          night: 'Half the plaza is awake in this turning your evening over, and she will be one of them.',
        },
      },
      next: 'ask',
    },
    ask: {
      text: 'Now. She told me where the two of you are going. Do you want to know what she said about it?',
      choices: [
        { label: 'Tell me', next: 'tell' },
        { label: 'No — let me find out', next: 'no' },
        { label: 'You gossip', next: 'gossip' },
      ],
    },
    tell: {
      text: 'She said it was the one she was hoping you would pick. Then she made me swear not to repeat it, so do keep up.',
      next: 'bye',
    },
    no: {
      text: 'Oh, you are no fun at all. Go on then, go and be surprised, and I shall sit here knowing things.',
      next: 'bye',
    },
    gossip: {
      text: 'I am. Openly, and I have never once pretended otherwise. It is the only trade on this island that never slows down.',
      next: 'bye',
    },
    bye: {
      text: {
        any: 'Off with you. And be early — she will be, and she will not say a word about it if you are not.',
        rain: 'Off with you, and go the long way round the puddles. Turning up soaked is not the impression you want.',
        storm: 'Go on. And if this does not blow over, have the wit to say so first rather than stand about being brave.',
      },
    },
  },
};

const TULA_GONE = {
  name: 'Tula',
  start: 'intro',
  nodes: {
    intro: {
      text: {
        clear: {
          morning: 'She came down the road at first light with her bag on her shoulder, and she did not stop at this bench.',
          noon: 'You are the third person to come and stand here today. The other two only wanted to know. You want her back.',
          evening: 'The plaza goes gold in a minute and I have nobody to be smug at about it. She has gone, love.',
          night: 'Late again, and this time you are not looking for her. You are just walking. I know the difference.',
        },
        wind: {
          morning: 'She went out on this wind. It is the one thing about the whole business I can call good news.',
          noon: 'Do not stand out there in it. She is not going to come back over that hill because you waited in the wind.',
          evening: 'It will drop at dusk, and it will still be quiet, and you will still notice. I am sorry.',
          night: 'The shutters have been at it all night and I have not slept either. Sit down a minute.',
        },
        rain: {
          morning: 'She was away before this came in. She always did have the luck of the weather, that one.',
          noon: 'Under the eaves, come on. You are no use to anybody stood out there being rained on over a girl.',
          evening: 'Rain and lamplight and one fewer person on the plaza. It is a different picture entirely.',
          night: 'Get under here. She would have something to say about the state of you, and she would be right.',
        },
        storm: {
          morning: 'She was gone before the first of it. Whatever else you are carrying, you can set that part down.',
          noon: 'No, she is not out in that. She went hours ahead of it, and she went well.',
          evening: 'Get under cover. Whatever you are chewing over, you can chew it over dry.',
          night: 'A storm and an empty plaza. This island is a good deal larger than it was yesterday, is it not.',
        },
      },
      next: 'ask',
    },
    ask: {
      text: 'Ask me, then. Everybody else has, and none of them had the right to.',
      choices: [
        { label: 'Where did she go?', next: 'where' },
        { label: 'Did she say goodbye?', next: 'goodbye' },
        { label: 'Nothing. Never mind', next: 'nothing' },
      ],
    },
    where: {
      text: 'North, with the tide. She told me, which is not the same as telling me to pass it on — and here I am passing it on.',
      next: 'bye',
    },
    goodbye: {
      text: 'To me she did. To you she said something rather better than goodbye, and you were there for it, so I shall not repeat it.',
      next: 'bye',
    },
    nothing: {
      text: 'Never mind. Right. Sit down anyway — I shall talk about thread and you can let me, and that is a kindness both ways.',
      next: 'bye',
    },
    bye: {
      text: {
        any: 'She was not running off from you. She was giving you room, and there is a world of difference in it.',
        rain: 'She was giving you room, not running. Now go and be dry, and think about it under a roof.',
        storm: 'She was giving you room, not running. Now get in out of that, before I have two of you to worry about.',
      },
    },
  },
};

export const TULA = {
  searching: TULA_SEARCHING,
  met: TULA_MET,
  date: TULA_DATE,
  gone: TULA_GONE,
};

/*
  The drifter on the south beach. His opening line carries the same sixteen as
  the others, but doing double duty: the weather across, and how far through a
  bottle he is down. Sober and sore at first light, expansive by the afternoon,
  and by night talking mostly to the sea.

  npc.js works the same curve into how he walks — see drunkAt() — so the state
  of him is legible before he has said a word, and the line only confirms it.

  He has one chapter of his own and it is the searching one, where his whole
  contribution is that he has nothing to contribute. That is not him being cut
  out of the story — it is the joke, and it needs him: he is the one man on this
  island who has stared at the open sea from dawn to dusk, and he could not tell
  you a single thing that has been on it.

  So he gets no `date` and no `gone`. Nobody tells him anything, he was never
  going to notice on his own, and a drifter who suddenly has views on somebody
  else's love life is a different and much worse character. After the search he
  is simply the beach as it always was, which is its own kind of comfort at the
  end — see the bag below, where three of the four chapters are the same script.
*/
const BRAM_SEARCHING = {
  name: 'Bram',
  start: 'intro',
  nodes: {
    intro: {
      text: {
        clear: {
          morning: 'Morning. Whatever it is you are about to ask me, I was asleep for it. Just so we start honest.',
          noon: 'Ahh, sit down. You have got the face of a man with a question and I have got the entire afternoon.',
          evening: 'Now then. You will have one, and then you will tell me what you are after. That is the order it goes in.',
          night: 'Shh. She\'s talking. If you have lost something, ask her — everything on this beach has been hers at one time or another.',
        },
        wind: {
          morning: 'Wind off the water. Clears the head. Ask me twice, I shall only hear the second one.',
          noon: 'Whoa — hold your feet, friend. And hold your question, I am busy standing up.',
          evening: 'Wind\'s got a lean on it tonight. So have I. Ask me something easy.',
          night: 'S\'blowing! Ask me anything at all, I shall answer it wrong and we will both have a lovely time.',
        },
        rain: {
          morning: 'Rain. Good. And you want something. Everybody wants something in the rain.',
          noon: 'You will get wet stood there working out how to say it. I am already wet. Say it.',
          evening: 'Warm rain and a man with a question. Go on then, out with it.',
          night: 'Rain, dark, and you down here on the sand. Nobody comes down here on purpose. Nobody.',
        },
        storm: {
          morning: 'Storm\'s up and everything I own is under that log. Ask quick.',
          noon: 'Don\'t stand about on open sand in this! Ask me from over there, I shall lean.',
          evening: 'Whoa. Whoa. She\'s angry tonight. Whatever it is, it will keep, and so will I.',
          night: 'Lightning — there! Go on, ask me in the gaps. That\'s how we do it out here.',
        },
      },
      next: 'q',
    },
    q: {
      name: 'You',
      text: 'I am looking for a girl. She came in on a boat this morning.',
      next: 'boat',
    },
    boat: {
      text: 'A boat. This morning. Right. Right, right, right.',
      next: 'blank',
    },
    // The whole of him, in one line. He has had the best seat on the island all
    // day and has been looking at entirely the wrong thing with it.
    blank: {
      text: 'No. Nothing. I have watched that sea since the sun came up and I could not tell you one single thing that has been on it.',
      next: 'ask',
    },
    ask: {
      text: 'Go on though. Try me. Something might shake loose.',
      choices: [
        { label: 'You saw nothing?', next: 'nothing' },
        { label: 'It was a small boat', next: 'small' },
        { label: 'Never mind', next: 'mind' },
      ],
    },
    nothing: {
      text: 'Not a thing. In fairness, I was not looking for boats. I was looking at the sea. Different job entirely.',
      next: 'tula',
    },
    small: {
      text: 'They are all small from here. That is the trouble with here. Lovely place, no scale to it.',
      next: 'tula',
    },
    mind: {
      text: 'No, no — wait. I want to help. I do want to help. I am simply no use. Those are two separate things and I insist on both.',
      next: 'tula',
    },
    // He cannot answer, so he passes you to somebody who can. Even at his worst
    // he would rather you got where you were going.
    tula: {
      text: {
        any: 'Tula. Up on the plaza, on the bench. She sees everything and remembers the unkind half of it. Ask her.',
        storm: 'Tula — plaza — the bench under the eaves. She\'ll be out in this, she is always out in this. Go on.',
      },
      next: 'bye',
    },
    bye: {
      text: {
        any: 'Go on then. Mind the sharp bits, and I hope she is worth the walk. They generally are.',
        rain: 'Off you go. And don\'t shelter under the palms, they drop things on people in love.',
        storm: 'Go! I\'m fine. I\'m always fine. Find your girl and don\'t come back down here till you have.',
      },
    },
  },
};

const BRAM_MET = {
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

// Three of these are the same script on purpose — see the note above. The south
// beach does not hear about any of it, and would not have anything to say if it
// did.
export const BRAM = {
  searching: BRAM_SEARCHING,
  met: BRAM_MET,
  date: BRAM_MET,
  gone: BRAM_MET,
};

/**
 * Which of a villager's four scripts is the one for right now.
 *
 * Falls back to the ambient chapter rather than to nothing, so a stage that
 * grows a new name in story.js gets the island as it usually is instead of a
 * villager who has suddenly stopped being talkable.
 */
export const villager = (who, chapter) => who[chapter] ?? who.met;

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
    /*
      Two lines here make claims about the world, and a claim can be wrong. This
      one said "this morning" whatever the sky was doing and whatever hour you
      loaded into, so a player arriving at midnight was told about a morning that
      had not happened yet — which is the same failure the villagers' greetings
      are written to avoid, in the first minute of the game, where it is least
      affordable.

      Nobody speaks these, so there is no voice to keep. All that is wanted is
      that the sentence is not contradicted by what is out of the window.
    */
    boat: {
      // Time only, so the whole table hangs off `any` — the outer key is the
      // sky, and this line does not care what the sky is doing.
      text: {
        any: {
          morning: 'Then this morning a boat crossed yours, close enough to hear its ropes — and there was a girl at the rail of it.',
          noon: 'Then this morning a boat crossed yours, close enough to hear its ropes — and there was a girl at the rail of it.',
          evening: 'Then this afternoon a boat crossed yours, close enough to hear its ropes — and there was a girl at the rail of it.',
          night: 'Then, before the light went, a boat crossed yours, close enough to hear its ropes — and there was a girl at the rail of it.',
        },
      },
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
    // ...and the other one. "Out of the weather" is a fine thing to say about
    // somebody in a storm and an odd thing to say about somebody on a clear
    // afternoon, so the clear sky gets its own reason for her being indoors.
    find: {
      text: {
        clear: 'Her boat put in here as well. She is somewhere on this island, under one roof or another. Go and find her.',
        any: 'Her boat put in here as well. She is somewhere on this island, out of the weather. Go and find her.',
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

  - She takes the weather where the weather is in the room with her, and nowhere
    else. That is a narrower rule than the villagers work to and it is the whole
    of the difference between them: a villager's job is to be the island talking,
    so every line of theirs can afford to notice the sky. Hers is not.

    So the tables go on the beats that are physically happening — arriving,
    sheltering, sitting down, leaving, lying back in the sand to look at
    something that may or may not be there — and on the sky itself when it goes
    off over the water at the end. Between `never` and `in` there is not one,
    across sixteen lines, because that is the confession, and a woman working up
    to something does not stop to mention the wind. If a table there would put a
    remark about the rain between "my father was never there" and her answer to
    it, the line does not get a table.

    Read the other way round: everything she says that could be wrong about the
    world now varies, and nothing that would be interrupted by the world does.

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
    // She is sheltering in a stranger's house, so what she is sheltering *from*
    // is the first thing about her — and how odd it is to be doing it depends
    // entirely on the hour. At noon it is sensible. After dark it wants saying.
    intro: {
      text: {
        clear: {
          morning: 'Oh — hello. I let myself in out of the early sun; I hope that is all right. I did not think anybody else was up yet.',
          noon: 'Oh — hello. I let myself in out of the sun; I hope that is all right. I did not think anybody else was out in it.',
          evening: 'Oh — hello. Come in. The light through that window at this hour is the only reason I am still standing here.',
          night: 'Oh — hello. I know quite well how this looks, a stranger in a dark house. I came in to sit down and then I simply stayed.',
        },
        wind: {
          morning: 'Come in, come in — and pull that to behind you. It has been blowing since before it was properly light.',
          noon: 'Come in, come in — and pull that to behind you. Half the beach has followed me in as it is.',
          evening: 'Come in and shut it. It drops when the sun does, they keep telling me, and it has shown no sign of starting.',
          night: 'Come in. Those shutters have been going the whole night and I would rather not sit listening to them on my own.',
        },
        rain: {
          morning: 'You are soaked through, and it is barely light. Come all the way in, there is dry floor over this side.',
          noon: 'You are soaked through. Come all the way in, there is dry floor over this side.',
          evening: 'You are soaked through. Come in — it will be dark before this passes, and there is dry floor this side.',
          night: 'You are soaked, and it is black as anything out there. Come all the way in before you put a foot through something.',
        },
        storm: {
          morning: 'Come in and sit down. It has been like this since first light and nobody should be out in it.',
          noon: 'Come in and sit down. Nobody should be out in that, and I would rather not be the only one in here listening to it.',
          evening: 'Come in and sit down. It will be dark on top of all that shortly, and I would rather have the company before it is.',
          night: 'Come in. Storm and no light to speak of — I have been sat here listening to it, and I am very glad it is not only me any more.',
        },
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
    // Leaving is the other end of arriving, and it named the hour outright — she
    // cannot have been under a roof "for one afternoon" at first light. What she
    // is walking out into is hers to be stubborn about, which is what the two
    // wet variants are for.
    off: {
      text: {
        rain: 'Anyway. I should go — and no, do not look at me like that. A little rain has never drowned anybody.',
        storm: 'Anyway. I should go. Not far, and not into the worst of it, and I will not be talked out of it.',
        any: {
          morning: 'Anyway. I should go — I did not come the whole way here to spend the morning indoors.',
          noon: 'Anyway. I should go. I have been under a roof long enough for one afternoon.',
          evening: 'Anyway. I should go, while there is still light enough to see the road by.',
          night: 'Anyway. I should go. It is late, and I have been under this roof since the sun was up.',
        },
      },
      next: 'bye',
    },
    // The line that sets up the second meeting, so it had better sound like a
    // place worth walking to at whatever hour she says it.
    bye: {
      text: {
        rain: 'The fountain, though. Rain or no rain — everybody ends up at the fountain sooner or later, and I am no different.',
        storm: 'The fountain, though. When this has blown itself out. Everybody ends up there sooner or later.',
        any: {
          evening: 'The fountain, though. It goes gold when the lamps come on, and I should rather like somebody to see that with.',
          night: 'The fountain, though. It is lit all night. If you find yourself out that way — and I hope that you do.',
          any: 'The fountain, though. If you find yourself out that way. Everybody ends up at the fountain sooner or later.',
        },
      },
    },
  },
};

export const AMY_FOUNTAIN = {
  name: 'Amy',
  start: 'intro',
  nodes: {
    /*
      Sixteen ways of saying "you came", which is the only thing this line has to
      do. She asked him to be somewhere and he is, and what that cost him is
      entirely a question of what the sky was doing on the way over — so the
      worse the weather and the stranger the hour, the more it means, and the
      more she says about it.
    */
    intro: {
      text: {
        clear: {
          morning: 'You came. And early, as well. I had half decided you would not, and I am glad to be wrong.',
          noon: 'You came, in all this heat. Come and sit on the curb — there is shade this side of it.',
          evening: 'You came, and at the best hour for it. Give it a minute and the whole plaza goes gold.',
          night: 'You came. This late, and all the way out here. That was either very sweet of you or very silly.',
        },
        wind: {
          morning: 'You came, and in this. I have been holding my hair down since first light and I have entirely given it up.',
          noon: 'You came. Sit this side of the curb — the fountain throws half of itself at you on the other, in this.',
          evening: 'You came. It drops when the sun does, they keep promising me, and then this will be a lovely place to sit.',
          night: 'You came, in the dark and in this. I could hear the palms from here, and I still heard you coming up the road.',
        },
        rain: {
          morning: 'You came, and it is raining, and it is barely light. I do not know what to do with that except be glad.',
          noon: 'You came, in this. Sit down anyway — the curb is wet, I have been on it a while, and I do not mind a bit.',
          evening: 'You came. Rain, lamplight, and nobody else out at all. I could not have arranged it better if I had tried.',
          night: 'You came. In the rain, this late. That was either very sweet of you or very silly, and I have not settled which.',
        },
        storm: {
          morning: 'You came out in this, at this hour. I am not going to pretend I am anything other than pleased about it.',
          noon: 'You came out in a storm to sit by a fountain. I want that said plainly, so that we have both heard it.',
          evening: 'You came out in this. Stand this side of me — the wind is coming round the water and it is worse over there.',
          night: 'You came. Storm, dark, and the whole island indoors except the two of us. That was either very sweet or very silly.',
        },
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
      next: 'intent',
    },
    /*
      She makes him name it before she says one word about her own feelings, and
      that order is the whole of the scene. "I want more of it" is a lovely
      sentence that commits to nothing, and she has heard it before — see `tried`
      below, which is her saying so.

      No weather table on any of these four. The rest of this script is thick
      with them because she keeps glancing at the sky and the hour; here she is
      looking at him, and a woman asking a man what he actually wants does not
      break off to remark on the rain.

      All three doors lead to `tried`. What he says changes what she says back
      and nothing else — she was always going to warn him that it takes somebody
      particular, and an answer that skipped the warning would be her rewarding
      him for a good guess.
    */
    intent: {
      text: 'More of it. All right — then say what you mean by it. I have been guessed at before, and I did not care for it.',
      choices: [
        { label: 'I do not know', next: 'unsure' },
        { label: 'I want to date you', next: 'court' },
        { label: 'I want to marry you', next: 'marry' },
      ],
    },
    // Honest, and she takes it as honest rather than as a failure. There is no
    // wrong answer here and this is the one that most needs to feel like it.
    unsure: {
      text: 'You do not know. Good — that is the true one, and I would rather have it than something polished. We shall find out together.',
      next: 'tried',
    },
    court: {
      text: 'To be courted, then. In daylight, where the whole village can watch you doing it. I will not pretend I would not like that.',
      next: 'tried',
    },
    // She neither laughs at it nor accepts it. Believing that he meant it, and
    // saying plainly that meaning it is not the same as knowing her, is the only
    // answer that respects him and the question both.
    marry: {
      text: 'Straight to the end of it. You do not know me nearly well enough to mean that — and I think you meant it anyway, which is not nothing.',
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
    // All three doors stay open in all four weathers — refusing her the picnic
    // because it is raining would be the game overruling her, and she is not a
    // woman who checks the sky before deciding what she wants. What changes is
    // that she says so.
    where: {
      text: {
        rain: 'Then take me somewhere. Somewhere you have thought about — and I do not care in the least that it is raining. Where are we going?',
        storm: 'Then take me somewhere. Somewhere you have thought about. This will have blown itself out by then. Where are we going?',
        any: 'Then take me somewhere. Somewhere you have thought about. Where are we going?',
      },
      choices: [
        { label: 'Dinner, indoors', next: 'dinnerPlace' },
        { label: 'Picnic at the lagoon', next: 'picnicPlace' },
        { label: 'Stars, on the beach', next: 'starsPlace' },
      ],
    },
    /*
      Each choice is two nodes: where she will be, and then what she wants you to
      turn up holding. Split rather than run together because the second half has
      a job the first does not — see DATE_NEEDS below, and the gate in story.js
      that will hold you to it.

      The order of the pair is not arbitrary either. The place is the answer to
      the question she asked; the list is the thing she adds once the answer is
      settled, which is how people actually ask for something.

      And the *names* matter: story.js reads the node a script came to rest on to
      decide where she goes next, so the last node of each branch has to keep the
      spot's name. That is why the request is the terminal node and the place is
      the one that got renamed.
    */
    dinnerPlace: {
      text: {
        any: 'The house with the long table, then. I will be there before you are — I am always early, it is a terrible habit.',
        rain: 'The house with the long table, then. Somewhere with a roof on it — you have talked me into being sensible for once.',
        storm: 'The house with the long table, then. And thank you for picking the one with walls; I would not have.',
      },
      next: 'dinner',
    },
    dinner: {
      text: 'And bring me a flower. One, off the beds by the fountain — not a bunch. One that you stopped and chose.',
    },
    picnicPlace: {
      text: {
        any: 'The lagoon, then. Bring something to eat, and please do not go to any trouble over it.',
        rain: 'The lagoon, then, rain and all. Bring something to eat, and please do not go to any trouble over it.',
        storm: 'The lagoon, then — and if this is still doing that when you get there, we shall eat under a tree and call it an adventure.',
      },
      next: 'picnic',
    },
    picnic: {
      text: 'Bread, and something ripe off one of the trees. That is the whole list, and I will notice if your hands are empty.',
    },
    /*
      The one line in this file that reaches out of the box and changes the
      world: she wants stars, so the sun goes down — for everybody on the island,
      not only for whoever asked. See story.js, and sim.hurry() for the mechanism.
      It is cued here rather than arranged in code because it is part of what she
      said, and a line that turns out to have been a promise should be able to
      keep it from where it was spoken.

      The cue stays on the place rather than moving to the request, so the sun is
      already going down behind her while she is still telling you what to bring.
    */
    starsPlace: {
      text: {
        any: 'Then let it get dark. The top of the road, where it runs out into the sand — I will be waiting at the end of it.',
        rain: 'Then let it get dark, and let this pass over — it always does. The top of the road, where it runs out into the sand.',
        storm: 'Then let it get dark, and let this blow itself out. It always does. The top of the road, at the end of the sand.',
      },
      cue: 'nightfall',
      next: 'stars',
    },
    stars: {
      text: 'And bring chocolate. If I am to lie on cold sand half the night, I would like chocolate. That part is not negotiable.',
    },
  },
};

/*
  What each date asks you to turn up holding.

  This lives here, beside the prose, and not in story.js where it is enforced —
  because it is written twice in words and once in code, and the two places it is
  written in words are both in this file: the request at the end of AMY_FOUNTAIN,
  and the reminder in AMY_EMPTY below. A list that drifted out of step with her
  own lines is the only way this can really go wrong, and keeping all three
  within a screen of each other is what makes that unlikely.

  Keyed by spot, which is also the node name, which is also the place id — see
  amyDate() at the bottom of this file for the other three jobs that one word is
  already doing.

  Everything on these lists is findable on the island: the flower in the beds by
  the fountain, the bread on the step of the house with the long table, the fruit
  under the trees on the east lawn, the chocolate along the south beach. See the
  pickups in main.js — if you add a requirement, add somewhere to get it, or you
  have written a date that cannot happen.
*/
export const DATE_NEEDS = {
  dinner: ['flower'],
  picnic: ['bread', 'fruit'],
  stars: ['chocolate'],
};

/*
  Turning up with nothing.

  She is pleased to see him and she is not letting it go, and the whole of the
  scene is that those two things are not in tension. She is not sulking, she is
  not scoring a point, and she does not withdraw the invitation — she says what
  she wants, says why it is not about the food, and tells him she will be right
  here. The date is still on. It just has not started.

  It has to be her rather than the game. A grey line reading "you need bread and
  fruit" would do the same mechanical job and would be a different story: it
  would make her a lock and the items a key. So it is her voice, she gives the
  reason, and the reason is about being listened to.

  Three ways in, like AMY_DATE — the entry node is the one that knows which items
  she asked for, and everything after it is the same in all three places, because
  from the second line on it is the same objection wherever she is standing.
*/
export const AMY_EMPTY = {
  name: 'Amy',
  start: 'picnic',
  nodes: {
    dinner: {
      text: 'You came, and I am glad you did — and your hands are empty. I asked you for a flower. One flower.',
      next: 'notFood',
    },
    picnic: {
      text: 'You came all the way down here, and I am glad of it — and you have come with nothing. Bread, I said. And something ripe.',
      next: 'notFood',
    },
    stars: {
      text: 'You walked all the way up the road in the dark, and I am glad you did — and you have come with nothing. I asked for chocolate.',
      next: 'notFood',
    },
    notFood: {
      text: 'And before you apologise for it — it is not the food. I could eat or not eat this evening and think nothing of it either way.',
      next: 'heard',
    },
    heard: {
      text: 'It is that I asked you for something small, and you heard me ask, and here you are without it. That is the part I mind.',
      next: 'worth',
    },
    // The line the whole scene exists for. She names what she is doing while she
    // does it, which is the difference between a woman being difficult and a
    // woman who has decided she is allowed to ask for things.
    worth: {
      text: 'So I am going to be a little difficult about it. I do not enjoy being difficult. I am doing it because I am worth the asking.',
      next: 'go',
    },
    go: {
      text: 'Go on and fetch it. I am not cross and I am not going anywhere — come back holding it and we shall start this properly.',
    },
  },
};

/** The refusal, entered by the same door as the date it is standing in for. */
export const amyWants = (spot) => ({ ...AMY_EMPTY, start: spot });

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
    /*
      The three arrivals, and the three lines that hand over to the confession,
      are where the tables live. That is not an even sprinkling — it is the first
      and last thing said in each of the three places, and in between them there
      is nothing, because in between them she is not looking out of the window.

      Each spot takes the weather differently, which is most of the reason for
      having three: the long table has a roof and hears the rain on it, the
      lagoon has none and gets rained on, and the beach after dark was promised
      stars that a storm will simply not provide. She does not mind about the
      last one, and saying so out loud is the point of the variant.
    */

    // ---- dinner, at the long table
    dinner: {
      text: {
        rain: 'There you are, and dripping. Sit — it has been coming down on that roof the entire time and I have rather liked it.',
        storm: 'There you are. Shut it behind you and let the sky do as it likes. I have been in here naming all six of these chairs.',
        wind: 'There you are. Listen to it going round the eaves. I have been in here naming chairs, and it has been perfect.',
        any: {
          morning: 'There you are, and the sun is barely up. I have been here long enough to have named all six of these chairs.',
          noon: 'There you are. I have been here long enough to have named all six of these chairs, and I did not mind a bit.',
          evening: 'There you are, and the lamps have just gone on outside. I have named all six of these chairs waiting on you.',
          night: 'There you are. I have been sitting here in the dark naming chairs, and I got through all six of them.',
        },
      },
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
      text: {
        rain: 'You brought something, and you brought it through the rain. Sit down before you tell me it was no trouble.',
        storm: 'You came all the way down here in this, and you brought something. I am not going to say one word about the weather.',
        wind: 'You brought something, and the wind has had half of it off the cloth already. Sit on that corner for me, would you.',
        any: {
          morning: 'You brought something, and at this hour. That was kind of you — I will admit I did not altogether expect it.',
          noon: 'You brought something. That was kind of you — I will admit I did not altogether expect it.',
          evening: 'You brought something, and you have brought it at exactly the right hour. Look at the colour of that water.',
          night: 'You brought something, in the dark, down a path you have walked once in your life. That was kind of you.',
        },
      },
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
      text: {
        rain: 'Oh, do not — you will ruin it. Come and sit; the rain makes rings all over it and I could watch that all day.',
        storm: 'Oh, do not — you will ruin it. Come under here with me and let it blow. I have no intention of going back up that path.',
        any: {
          morning: 'Oh, do not — you will ruin it. Come and sit; the water goes green just here once the sun is properly up.',
          evening: 'Oh, do not — you will ruin it. Come and sit; the water goes green just here when the light gets low.',
          night: 'Oh, do not — you will ruin it. Come and sit; it goes green just here in the daytime, so you will have to take my word for it.',
          any: 'Oh, do not — you will ruin it. Come and sit; the water goes green just here when the light is right.',
        },
      },
      next: 'never',
    },

    // ---- the end of the road, where it meets the north sand, after dark
    /*
      Nearly always night — she asked for the stars and the sun was run down to
      get them, so `nightfall` has already happened by the time anybody walks up
      here. But it lands at 0.78 of the cycle and morning is at 1.0, which is
      about five real minutes away, and a player who wanders off to look at the
      lagoon on the way can spend them. So there is a dawn line, and it is the
      better one: she waited the whole night out and says so lightly.
    */
    stars: {
      text: {
        rain: 'You came all the way up the road in the rain, for stars, and there is not one to be had. Sit down anyway.',
        storm: 'You came all the way up here in this. There is not a star in the sky and I do not care in the least.',
        wind: 'You came all the way up the road in the dark, with this blowing sand at you the whole way. You did not have to do that.',
        any: {
          morning: 'You came all the way back up the road, and now the sky is going grey on us. You took your time. I waited.',
          any: 'You came all the way back up the road in the dark. You did not have to do that.',
        },
      },
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
    // She asked for stars and a storm has not got any. The whole of her is in
    // what she does about that: not a word of complaint, and the invitation
    // stands regardless — which is a better line than the one she gets on a
    // clear night, and it only exists because the sky is allowed to ruin things.
    stars5: {
      text: {
        rain: 'Lie back with me anyway. There is nothing at all to see and the sand is wet, and I would still rather be down here than not.',
        storm: 'Come and sit close, then, with your back to it. We shall have the stars another night — I am not going anywhere.',
        any: 'Lie back with me, then. You cannot see them properly stood up — and I would rather not be the only one on this beach looking foolish.',
      },
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
    /*
      The one line in the confession that gets a table, and it earns it by being
      about the sky. The fireworks go off into whatever is up there — so through
      rain they are better, and against a storm they are briefly louder than it,
      and neither of those is a remark she is making. It is the game saying what
      happened, which is why this node has no name plate.
    */
    sky: {
      name: null,
      text: {
        rain: 'And the sky over the water goes to pieces, through the rain, which is somehow better.',
        storm: 'And the sky over the water goes to pieces, and for a moment it is louder than the storm.',
        any: 'And the sky over the water goes to pieces.',
      },
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
