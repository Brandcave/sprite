import { nameOf } from './identity.js';

/*
  The chat panel: whatever has just been said that you were meant to hear.

  Two kinds of talk end up in the same stream. Something typed here goes to
  everyone in the room, which is what a channel is for. Something said face to
  face — walking up to somebody and pressing Z, see chat.js — goes to one person
  and appears here too, labelled, and only in the two streams it belongs in. The
  relay is what makes that true rather than the panel: an addressed message is
  delivered to the pair and to nobody else, so a stream can only ever show what
  its owner was sent.

  Nothing is kept, and not much is shown at once: three lines. Each rises from
  the field, holds long enough to be read, then lifts and bursts — so the panel
  is only ever as large as the conversation happening right now, and shrinks
  back to its icon when it stops. A log that accumulates would end the evening
  as a wall of text down one side of an island nobody can see any more.

  It is not there when you are alone, either. An empty chat box addressed to
  nobody is furniture, and this island is meant to be worth being alone on —
  which is now a matter of telling the toolbar this tool is unavailable, and
  letting it take the button away.

  This is a tool, in the sense toolbar.js means: an icon, a panel to type into,
  and a stream that stays on screen whichever tool is selected. Messages have to
  be readable while you are doing something else, so they are ambient rather
  than part of the panel.
*/

const LIFE = 14000;           // how long a line stays up
const POP = 460;              // and how long it takes to burst when it goes
const STACK = 3;              // most lines on screen at once
const MAX_TEXT = 120;         // the relay's cap, so the field cannot overrun it

const CSS = `
/* Bottom-anchored, so a new line arriving lifts the older ones rather than
   pushing the field down the screen. */
.ch-stream { display: flex; flex-direction: column; justify-content: flex-end; gap: 7px; }
.ch-stream[hidden] { display: none; }

.ch-bubble {
  padding: 8px 11px 9px;
  transform-origin: 20% 100%;
  animation: ch-rise 260ms cubic-bezier(0.2, 0.9, 0.3, 1) both;
}
@keyframes ch-rise {
  from { opacity: 0; transform: translateY(14px) scale(0.94); }
  to { opacity: 1; transform: none; }
}

/*
  One way out, whether it was read and ran out of time or was shoved off by a
  newer line: it lifts, swells and goes. The dip at the start is what sells it —
  a bubble tightens for an instant before it bursts, and without that beat the
  whole thing only reads as a fade.
*/
.ch-bubble.ch-pop {
  transform-origin: center;
  animation: ch-burst ${POP}ms cubic-bezier(0.3, 0, 0.2, 1) both;
}
@keyframes ch-burst {
  0% { transform: translateY(0) scale(1); opacity: 1; filter: none; }
  22% { transform: translateY(0) scale(0.92); opacity: 1; }
  100% { transform: translateY(-18px) scale(1.4); opacity: 0; filter: blur(2px); }
}

.ch-head { font-size: 0.82em; letter-spacing: 0.06em; margin-bottom: 2px; }
.ch-who { color: #ffd47a; }
.ch-kind { opacity: 0.6; }
.ch-text { word-break: break-word; }

/*
  A word said to one person should not look like a word said to the room, and
  with the label gone the styling is the only thing left saying so — a cooler
  pane and a brighter edge all the way round, which the eye reads as a
  different kind of thing without any one part of it announcing itself.
*/
.ch-bubble[data-private] {
  background: rgba(30, 52, 96, 0.42);
  border-color: rgba(159, 208, 255, 0.45);
}
.ch-bubble[data-private] .ch-who { color: #9fd0ff; }

.ch-entry { display: flex; align-items: center; gap: 8px; padding: 0 6px 0 2px; pointer-events: auto; }
.ch-prompt { color: #ffd47a; opacity: 0.8; }

.ch-field {
  flex: 1; min-width: 0; padding: 0;
  font: inherit; color: #f4f8ff; background: none; border: 0; outline: none;
  caret-color: #ffd47a;
  -webkit-user-select: text; user-select: text;
}
.ch-field::placeholder { color: rgba(234, 242, 255, 0.45); }

/*
  On a phone the bar is at the top and everything hangs below it, so the stream
  runs the other way up too: newest against the bar, older ones pushed down.
  Both directions keep the newest line nearest the thing you are looking at.
*/
body.touch .ch-stream { flex-direction: column-reverse; justify-content: flex-start; }

body.touch .ch-bubble { animation-name: ch-drop; }
@keyframes ch-drop {
  from { opacity: 0; transform: translateY(-14px) scale(0.94); }
  to { opacity: 1; transform: none; }
}

/* Specificity matters here: without the extra class this rule loses to the one
   above and a bursting line quietly plays the arriving animation instead. */
body.touch .ch-bubble.ch-pop { animation-name: ch-burst-down; }
@keyframes ch-burst-down {
  0% { transform: translateY(0) scale(1); opacity: 1; filter: none; }
  22% { transform: translateY(0) scale(0.92); opacity: 1; }
  100% { transform: translateY(18px) scale(1.4); opacity: 0; filter: blur(2px); }
}
`;

export const CHAT_ICON = `
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7"
       stroke-linejoin="round" aria-hidden="true">
    <path d="M3 5.5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H8l-4 3.5V13.5a2 2 0 0 1-1-1.8z"/>
  </svg>`;

export class Channel {
  /** @param hasCompany () => whether there is anybody here to talk to */
  constructor({ net, hasCompany }) {
    const style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);

    const stream = document.createElement('div');
    stream.className = 'ch-stream';

    const entry = document.createElement('div');
    entry.className = 'ch-entry tb-pane';
    entry.innerHTML = `
      <span class="ch-prompt">›</span>
      <input class="ch-field" type="text" maxlength="${MAX_TEXT}"
             placeholder="say something to the room"
             autocomplete="off" autocapitalize="sentences" spellcheck="false">`;

    this.net = net;
    this.hasCompany = hasCompany;
    this.el = { stream, entry, field: entry.querySelector('.ch-field') };

    // The tool, as toolbar.js wants one.
    this.id = 'chat';
    this.title = 'Chat';
    this.icon = CHAT_ICON;
    this.panel = entry;
    this.ambient = stream;

    /*
      Keystrokes stop here. The game listens for keys on the window, so without
      this a message about heading north would walk you there while you typed
      it. Enter sends and hands control back — you are far more likely to want
      to move after speaking than to say a second thing.
    */
    this.el.field.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.code === 'Enter' || e.code === 'NumpadEnter') {
        this.send();
        e.preventDefault();
      } else if (e.code === 'Escape') {
        this.close();
        e.preventDefault();
      }
    });
  }

  /*
    Only worth being here when somebody else is. The toolbar takes the button
    away otherwise — and the stream with it, since it is this tool's too.
  */
  available() {
    return this.hasCompany() || this.typing() || this.el.field.value !== '';
  }

  onOpen() {
    this.el.field.focus();
  }

  onClose() {
    this.el.field.blur();
  }

  /** Whether the player is typing here, so the game can leave the keys alone. */
  typing() {
    return document.activeElement === this.el.field;
  }

  /** Set by the toolbar so sending can put the panel away. */
  close() {
    this.onCloseRequest?.();
  }

  send() {
    const text = this.el.field.value.trim();
    this.el.field.value = '';
    this.close();
    if (text) this.net.sayAll(text);
  }

  /** See it off. */
  retire(bubble) {
    if (bubble.dataset.going !== undefined) return;
    bubble.dataset.going = '';
    bubble.classList.add('ch-pop');
    setTimeout(() => bubble.remove(), POP);
  }

  /**
   * One line. `to` is set on a face-to-face message and null on one the room
   * heard, which is the whole of the difference between them — and it is worth
   * saying outright rather than by a shade of blue, because the cost of
   * thinking a private word was public runs one way only.
   */
  add({ from, text, to = null, me = null }) {
    const mine = from === me;
    const bubble = document.createElement('div');
    bubble.className = 'ch-bubble tb-pane';
    if (to !== null) bubble.dataset.private = '';

    const head = document.createElement('div');
    head.className = 'ch-head';

    const who = document.createElement('span');
    who.className = 'ch-who';
    // On something you sent privately, your own name is the one thing you
    // already know; who heard it is the part worth printing — and with no
    // label any more, "You to HOLLY" is also the only thing on the line saying
    // the room did not hear it.
    who.textContent = to !== null && mine ? `You to ${nameOf(to)}`
      : mine ? 'You'
      : nameOf(from);

    head.append(who);

    const body = document.createElement('div');
    body.className = 'ch-text';
    // textContent: this is somebody else's typing, and it is going into a page.
    body.textContent = text;

    bubble.append(head, body);
    this.el.stream.append(bubble);
    setTimeout(() => this.retire(bubble), LIFE);

    // Three at a time; anything older goes early.
    const live = [...this.el.stream.children].filter((b) => b.dataset.going === undefined);
    for (const old of live.slice(0, -STACK)) this.retire(old);
  }

}
