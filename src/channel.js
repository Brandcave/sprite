import { nameOf } from './identity.js';

/*
  The chat panel: everything anybody has said that you were meant to hear.

  Two kinds of talk end up in the same list. Something typed here goes to
  everyone in the room, which is what a channel is for. Something said face to
  face — walking up to somebody and pressing Z, see chat.js — goes to one person
  and appears here as well, marked, and only in the two lists it belongs in. The
  relay is what makes the second part true rather than the panel: an addressed
  message is delivered to the pair and nobody else, so a list can only ever show
  what its owner was sent.

  It is not there when you are alone. An empty chat box addressed to nobody is
  furniture, and this island is meant to be worth being alone on.

  It opens as one line — somewhere to type — and grows as things are said,
  because a log with nothing in it should take up no more room than the invitation
  to start one.
*/

const KEEP = 60;              // lines held before the oldest fall off
const MAX_TEXT = 120;         // the relay's cap, so the field cannot overrun it

const CSS = `
.ch-root {
  position: fixed; left: 16px; bottom: 16px; z-index: 9;
  width: min(340px, 38vw);
  display: flex; flex-direction: column; align-items: stretch; gap: 6px;
  font: 500 13px/1.45 ui-monospace, SFMono-Regular, Menlo, monospace;
  pointer-events: none;
}
.ch-root[hidden] { display: none; }

/* the same frosted glass as the touch controls */
.ch-pane {
  background: rgba(20, 28, 48, 0.34);
  -webkit-backdrop-filter: blur(14px) saturate(160%);
  backdrop-filter: blur(14px) saturate(160%);
  border: 1px solid rgba(255, 255, 255, 0.22);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.3), 0 8px 20px rgba(4, 8, 18, 0.35);
  border-radius: 12px;
  color: #eaf2ff; text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
}

/* no lines, no box — the log has no height of its own until it earns one */
.ch-log {
  display: flex; flex-direction: column; gap: 3px;
  max-height: min(38vh, 300px); overflow-y: auto; overscroll-behavior: contain;
  padding: 9px 11px; pointer-events: auto;
  scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.25) transparent;
}
.ch-log:empty { display: none; }
.ch-line { word-break: break-word; }
.ch-who { color: #ffd47a; }
.ch-line[data-private] { color: #cfe0ff; }
.ch-line[data-private] .ch-who { color: #9fd0ff; }
.ch-tag { opacity: 0.65; font-size: 0.85em; }

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
      <div class="ch-log ch-pane"></div>
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
      log: root.querySelector('.ch-log'),
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

  /**
   * One line. `to` is set on a face-to-face message and null on a public one,
   * which is the whole difference in how it reads: a name alone means the room
   * heard it, and an arrow means two people did.
   */
  add({ from, text, to = null, me = null }) {
    const line = document.createElement('div');
    line.className = 'ch-line';

    const who = document.createElement('span');
    who.className = 'ch-who';
    who.textContent = from === me ? 'you' : nameOf(from);
    line.append(who);

    if (to !== null) {
      const tag = document.createElement('span');
      tag.className = 'ch-tag';
      tag.textContent = ` → ${to === me ? 'you' : nameOf(to)}`;
      line.append(tag);
      line.dataset.private = '';
    }

    // textContent throughout: this is somebody else's typing, and it is going
    // into a page.
    line.append(document.createTextNode(`  ${text}`));

    const { log } = this.el;
    log.append(line);
    while (log.children.length > KEEP) log.firstChild.remove();
    log.scrollTop = log.scrollHeight;
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
