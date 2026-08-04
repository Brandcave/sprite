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
const STACK = 6;              // most lines on screen at once
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
  animation: ch-rise 260ms cubic-bezier(0.2, 0.9, 0.3, 1) both;
  transition: opacity ${FADE}ms ease, transform ${FADE}ms ease;
}
@keyframes ch-rise {
  from { opacity: 0; transform: translateY(14px); }
  to { opacity: 1; transform: none; }
}
.ch-bubble.ch-gone { opacity: 0; transform: translateY(-10px); }

.ch-head { font-size: 0.82em; letter-spacing: 0.06em; margin-bottom: 2px; }
.ch-who { color: #ffd47a; }
.ch-kind { opacity: 0.6; }
.ch-text { word-break: break-word; }

/* a word said to one person should not look like a word said to the room */
.ch-bubble[data-private] { border-color: rgba(159, 208, 255, 0.4); }
.ch-bubble[data-private] .ch-who { color: #9fd0ff; }

.ch-entry { display: flex; align-items: center; gap: 7px; padding: 8px 11px; pointer-events: auto; }
.ch-prompt { color: #ffd47a; }
.ch-field {
  flex: 1; min-width: 0; padding: 0;
  font: inherit; color: #f4f8ff; background: none; border: 0; outline: none;
  caret-color: #ffd47a;
  -webkit-user-select: text; user-select: text;
}
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
    root.innerHTML = `
      <div class="ch-stream"></div>
      <div class="ch-entry ch-pane">
        <span class="ch-prompt">›</span>
        <input class="ch-field" type="text" maxlength="${MAX_TEXT}"
               placeholder="say something to the room"
               autocomplete="off" autocapitalize="sentences" spellcheck="false">
      </div>`;
    parent.appendChild(root);

    this.net = net;
    this.el = {
      root,
      stream: root.querySelector('.ch-stream'),
      field: root.querySelector('.ch-field'),
    };
    this.visible = false;

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
        this.el.field.blur();
        e.preventDefault();
      }
    });
  }

  /** Whether the player is typing here, so the game can leave the keys alone. */
  get typing() {
    return document.activeElement === this.el.field;
  }

  send() {
    const text = this.el.field.value.trim();
    this.el.field.value = '';
    this.el.field.blur();
    if (text) this.net.sayAll(text);
  }

  /** Fade a line out and take it away once it has finished going. */
  retire(bubble) {
    if (bubble.dataset.going !== undefined) return;
    bubble.dataset.going = '';
    bubble.classList.add('ch-gone');
    setTimeout(() => bubble.remove(), FADE);
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
    // already know; who heard it is the part worth printing.
    who.textContent = to !== null && mine ? `You → ${nameOf(to)}`
      : mine ? 'You'
      : nameOf(from);

    const kind = document.createElement('span');
    kind.className = 'ch-kind';
    kind.textContent = to !== null ? ' (Private)' : ' (Public)';
    head.append(who, kind);

    const body = document.createElement('div');
    body.className = 'ch-text';
    // textContent: this is somebody else's typing, and it is going into a page.
    body.textContent = text;

    bubble.append(head, body);
    this.el.stream.append(bubble);
    setTimeout(() => this.retire(bubble), LIFE);

    // A flood should scroll off the top rather than grow down the screen.
    const live = [...this.el.stream.children].filter((b) => b.dataset.going === undefined);
    for (const old of live.slice(0, -STACK)) this.retire(old);
  }

  /**
   * Shown only when there is somebody to talk to — but never yanked away
   * mid-sentence, because losing a half-written line to the last person leaving
   * is a worse trade than a panel that lingers a moment.
   */
  show(on) {
    const keep = on || this.typing || this.el.field.value !== '';
    if (keep === this.visible) return;
    this.visible = keep;
    this.el.root.hidden = !keep;
  }
}
