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

  Nothing is kept. Each line rises from the field, holds long enough to be read,
  and goes — so the panel is only ever as large as the conversation happening
  right now, and returns to a single line to type into when it stops. A log that
  accumulates would end the evening as a wall of text down one side of an island
  nobody can see any more.

  It is not there when you are alone, either. An empty chat box addressed to
  nobody is furniture, and this island is meant to be worth being alone on.
*/

const LIFE = 14000;           // how long a line stays up
const FADE = 600;             // and how long it takes to go
const POP = 380;              // and how long it takes to burst
const STACK = 4;              // most lines on screen at once
const BOUNCE = 420;           // opening and closing the field
const MAX_TEXT = 120;         // the relay's cap, so the field cannot overrun it

const CSS = `
.ch-root {
  position: fixed; left: 16px; bottom: 16px; z-index: 9;
  width: min(340px, 38vw);
  display: flex; flex-direction: column; justify-content: flex-end; gap: 7px;
  font: 500 13px/1.45 ui-monospace, SFMono-Regular, Menlo, monospace;
  pointer-events: none;
}
.ch-root[hidden] { display: none; }

/* frosted glass, the same as the touch controls */
.ch-pane {
  background: rgba(20, 28, 48, 0.34);
  -webkit-backdrop-filter: blur(14px) saturate(160%);
  backdrop-filter: blur(14px) saturate(160%);
  border: 1px solid rgba(255, 255, 255, 0.22);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.3), 0 8px 20px rgba(4, 8, 18, 0.35);
  border-radius: 12px;
  color: #eaf2ff; text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
}

/* Bottom-anchored, so a new line arriving lifts the older ones rather than
   pushing the field down the screen. */
.ch-stream { display: flex; flex-direction: column; justify-content: flex-end; gap: 7px; }

.ch-bubble {
  padding: 8px 11px 9px;
  transform-origin: 20% 100%;
  animation: ch-rise 260ms cubic-bezier(0.2, 0.9, 0.3, 1) both;
  transition: opacity ${FADE}ms ease, transform ${FADE}ms ease;
}
@keyframes ch-rise {
  from { opacity: 0; transform: translateY(14px) scale(0.94); }
  to { opacity: 1; transform: none; }
}

/* Two ways to leave, because they mean different things. Age drifts off the
   top, having been read. Being crowded out bursts on the spot — the line is
   not finished with, it has been shoved, and it should look shoved. */
.ch-bubble.ch-gone { opacity: 0; transform: translateY(-10px); }

/* The dip before the burst is what sells it: a bubble tightens for an instant
   before it goes, and without that beat this only reads as a fade. */
.ch-bubble.ch-pop {
  transform-origin: center;
  animation: ch-burst ${POP}ms cubic-bezier(0.3, 0, 0.2, 1) both;
}
@keyframes ch-burst {
  0% { transform: scale(1); opacity: 1; filter: none; }
  22% { transform: scale(0.92); opacity: 1; }
  100% { transform: scale(1.4); opacity: 0; filter: blur(2px); }
}

.ch-head { font-size: 0.82em; letter-spacing: 0.06em; margin-bottom: 2px; }
.ch-who { color: #ffd47a; }
.ch-kind { opacity: 0.6; }
.ch-text { word-break: break-word; }

/*
  A word said to one person should not look like a word said to the room, and
  with the label gone this is the only thing left saying so — hence a tinted
  pane and a rule down the edge rather than a shade of blue on the name alone.
*/
.ch-bubble[data-private] {
  background: rgba(30, 52, 96, 0.42);
  border-color: rgba(159, 208, 255, 0.45);
  box-shadow: inset 3px 0 0 rgba(159, 208, 255, 0.75),
              inset 0 1px 0 rgba(255, 255, 255, 0.26),
              0 8px 20px rgba(4, 8, 18, 0.35);
}
.ch-bubble[data-private] .ch-who { color: #9fd0ff; }

/*
  Idle it is a button the size of its own icon; open it is somewhere to write.
  The icon does not move between the two, so the panel grows out of the thing
  you pressed rather than replacing it.
*/
.ch-entry {
  display: flex; align-items: center; gap: 9px;
  align-self: flex-start; width: 100%; padding: 8px 12px;
  overflow: hidden; pointer-events: auto;
  transition: width ${BOUNCE}ms cubic-bezier(0.34, 1.56, 0.64, 1),
              padding ${BOUNCE}ms cubic-bezier(0.34, 1.56, 0.64, 1);
}
.ch-root[data-state="idle"] .ch-entry { width: 46px; padding: 8px; }

.ch-toggle {
  flex: none; display: grid; place-items: center;
  width: 26px; height: 26px; padding: 0;
  background: none; border: 0; color: #ffd47a; cursor: pointer;
  pointer-events: auto;
}
.ch-toggle svg { width: 19px; height: 19px; display: block; }

/* the whole thing springs a little as it opens and shuts */
.ch-entry.ch-boing { animation: ch-boing ${BOUNCE}ms cubic-bezier(0.34, 1.56, 0.64, 1); }
@keyframes ch-boing {
  0% { transform: scale(0.88); }
  55% { transform: scale(1.05); }
  100% { transform: scale(1); }
}

.ch-field {
  flex: 1; min-width: 0; padding: 0;
  font: inherit; color: #f4f8ff; background: none; border: 0; outline: none;
  caret-color: #ffd47a;
  -webkit-user-select: text; user-select: text;
  transition: opacity 180ms ease;
}
.ch-root[data-state="idle"] .ch-field { opacity: 0; pointer-events: none; }
.ch-field::placeholder { color: rgba(234, 242, 255, 0.45); }

/* clear of the thumbs on a phone, and out from under its keyboard */
body.touch .ch-root { bottom: 210px; width: min(300px, 62vw); }
body.touch.tc-typing .ch-root { bottom: calc(var(--tc-kb, 0px) + 12px); }
`;

export class Channel {
  constructor({ net }, parent = document.body) {
    const style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);

    const root = document.createElement('div');
    root.className = 'ch-root';
    root.hidden = true;
    root.dataset.state = 'idle';
    root.innerHTML = `
      <div class="ch-stream"></div>
      <div class="ch-entry ch-pane">
        <button class="ch-toggle" type="button" aria-label="Chat">
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7"
               stroke-linejoin="round" aria-hidden="true">
            <path d="M3 5.5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H8l-4 3.5V13.5a2 2 0 0 1-1-1.8z"/>
          </svg>
        </button>
        <input class="ch-field" type="text" maxlength="${MAX_TEXT}"
               placeholder="say something to the room"
               autocomplete="off" autocapitalize="sentences" spellcheck="false">
      </div>`;
    parent.appendChild(root);

    this.net = net;
    this.el = {
      root,
      stream: root.querySelector('.ch-stream'),
      entry: root.querySelector('.ch-entry'),
      field: root.querySelector('.ch-field'),
      toggle: root.querySelector('.ch-toggle'),
    };
    this.visible = false;
    this.open = false;

    this.el.toggle.addEventListener('click', () => this.setOpen(!this.open));

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
        this.setOpen(false);
        e.preventDefault();
      }
    });
  }

  /**
   * Open to write, shut to play. Shut it is the size of its own icon, which is
   * all a chat needs to be while nobody is saying anything — the lines still
   * rise above it either way, so closing it never costs you the conversation,
   * only the keyboard.
   */
  setOpen(on) {
    if (on === this.open) return;
    this.open = on;
    this.el.root.dataset.state = on ? 'open' : 'idle';

    this.el.entry.classList.remove('ch-boing');
    void this.el.entry.offsetWidth;          // let the animation start again
    this.el.entry.classList.add('ch-boing');

    if (on) this.el.field.focus();
    else this.el.field.blur();
  }

  /** Whether the player is typing here, so the game can leave the keys alone. */
  get typing() {
    return document.activeElement === this.el.field;
  }

  send() {
    const text = this.el.field.value.trim();
    this.el.field.value = '';
    this.setOpen(false);
    if (text) this.net.sayAll(text);
  }

  /** See it off, either by drifting away or by bursting. */
  retire(bubble, how = 'gone') {
    if (bubble.dataset.going !== undefined) return;
    bubble.dataset.going = '';
    bubble.classList.add(`ch-${how}`);
    setTimeout(() => bubble.remove(), how === 'pop' ? POP : FADE);
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
    bubble.className = 'ch-bubble ch-pane';
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

    // Four at a time. Anything older bursts rather than drifting, because it is
    // being shoved off rather than running out.
    const live = [...this.el.stream.children].filter((b) => b.dataset.going === undefined);
    for (const old of live.slice(0, -STACK)) this.retire(old, 'pop');
  }

  /**
   * Shown only when there is somebody to talk to — but never yanked away
   * mid-sentence, because losing a half-written line to the last person leaving
   * is a worse trade than a panel that lingers a moment.
   */
  show(on) {
    const keep = on || this.open || this.el.field.value !== '';
    if (keep === this.visible) return;
    this.visible = keep;
    this.el.root.hidden = !keep;
  }
}
