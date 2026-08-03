/*
  The same game, played with thumbs.

  These controls do not have opinions of their own. Every button synthesises the
  key the desktop game already handles and posts it down the one input path in
  main.js — the d-pad sends arrows, A sends Enter, B sends Escape. That is the
  whole design, and it is worth stating because the alternative is tempting and
  wrong: a second input system that calls interact() and step() directly would
  work on the day it was written and then quietly drift, so that a rule added to
  the keyboard path — a conversation swallowing movement, say — would hold on a
  laptop and not on a phone.

  Enter and Escape are chosen rather than Z, because they already mean the right
  thing in both states the box can be in: Enter confirms a villager's line and
  sends a written one, and Escape closes either. So A and B need no idea which
  of those is on screen.
*/

const params = new URLSearchParams(location.search);
const forced = params.get('touch');

/**
 * Coarse pointers get the controls; `?touch=1` and `?touch=0` force the issue,
 * which is the only way to look at them on a desktop.
 */
export const TOUCH = forced === '1' ? true
  : forced === '0' ? false
  : matchMedia('(pointer: coarse)').matches;

// How much room the controls take at the bottom of the screen, so the dialogue
// box can sit above them rather than underneath a thumb.
const RESERVED = 210;
const KEYBOARD = 120;             // a viewport this much shorter is a keyboard

const CSS = `
/*
  A phone offers a handful of gestures the game has no use for and which are
  actively in the way: pinch and double-tap zoom, the long-press callout, the
  grey flash on tap, and a drag across the d-pad turning into a text selection
  that leaves the arrows highlighted blue. touch-action turns off the browser's
  own handling of the touch before it starts, which is the only thing that stops
  a gesture rather than merely tidying up after it.
*/
body.touch, body.touch #view, body.touch .tc-root, body.touch .dlg-root {
  touch-action: none;
  overscroll-behavior: none;
  -webkit-touch-callout: none;
  -webkit-tap-highlight-color: transparent;
  -webkit-user-select: none;
  user-select: none;
}

/*
  Except the one place typing happens. It also has to be at least 16px: a phone
  zooms the page in on any field smaller than that when it takes focus, which is
  the most annoying zoom of the lot because it fires every time you start a
  message. Larger than the lines above it is fine — what you are writing and
  what somebody said are worth telling apart anyway.
*/
body.touch .dlg-field {
  font-size: max(16px, 1em);
  touch-action: auto;
  -webkit-user-select: text;
  user-select: text;
}

.tc-root {
  position: fixed; left: 0; right: 0; bottom: 0; z-index: 11;
  display: flex; align-items: flex-end; justify-content: space-between;
  padding: 0 22px calc(20px + env(safe-area-inset-bottom, 0px));
  pointer-events: none; user-select: none;
  font: 700 15px/1 ui-monospace, SFMono-Regular, Menlo, monospace;
}
.tc-root[hidden] { display: none; }

.tc-pad { display: grid; grid-template: repeat(3, 58px) / repeat(3, 58px); gap: 6px;
          pointer-events: auto; touch-action: none; }

/*
  Frosted glass. The one thing it has to survive is the island moving underneath
  it — a tint alone would take on the colour of whatever is passing, so the blur
  does the work of holding a single surface, and the shape is drawn by its rim
  and its shadow rather than by its fill. Those keep the button legible over the
  dark of the sea and the glare of the noon path alike.
*/
.tc-key {
  background: rgba(20, 28, 48, 0.34);
  -webkit-backdrop-filter: blur(14px) saturate(160%);
  backdrop-filter: blur(14px) saturate(160%);
  border: 1px solid rgba(255, 255, 255, 0.3);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.42),
              inset 0 -1px 0 rgba(0, 0, 0, 0.22),
              0 8px 20px rgba(4, 8, 18, 0.35);
  color: #f4f8ff; text-shadow: 0 1px 3px rgba(0, 0, 0, 0.55);
  display: flex; align-items: center; justify-content: center;
  pointer-events: auto; touch-action: none;
  transition: background 90ms linear, transform 90ms linear, opacity 140ms ease;
}
.tc-key[data-on] {
  background: rgba(126, 170, 255, 0.52);
  border-color: rgba(255, 255, 255, 0.6);
  transform: translateY(2px);
}
.tc-dir { border-radius: 16px; font-size: 19px; }

.tc-face { display: grid; gap: 14px; justify-items: center; pointer-events: none; }
.tc-btn { width: 74px; height: 74px; border-radius: 50%; font-size: 20px; letter-spacing: 0.06em; }
.tc-a { background: rgba(56, 96, 184, 0.42); }
.tc-a[data-on] { background: rgba(132, 176, 255, 0.62); }
.tc-b { background: rgba(200, 66, 56, 0.40); }
.tc-b[data-on] { background: rgba(246, 132, 120, 0.62); }

/* B does nothing at all until there is something to back out of, so until then
   it is not there to be wondered about. */
.tc-off { opacity: 0; transform: scale(0.82); pointer-events: none; }

/* Keep the text box clear of the thumbs, and out from under the keyboard. */
body.touch .dlg-root { padding-bottom: ${RESERVED}px; }
body.touch .dlg-hint { bottom: ${RESERVED - 32}px; }
body.touch.tc-typing .dlg-root { padding-bottom: 18px; bottom: var(--tc-kb, 0px); }
body.tc-typing .tc-root { display: none; }
`;

const BUTTON = (cls, key, label, cap = '') =>
  `<div class="tc-key ${cls}" data-key="${key}">${label}${cap ? `<span class="tc-cap">${cap}</span>` : ''}</div>`;

export class TouchControls {
  /**
   * @param onKey   called with a KeyboardEvent-style code on press
   * @param onKeyUp called with the same code on release
   */
  constructor({ onKey, onKeyUp }, parent = document.body) {
    document.body.classList.add('touch');

    const style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);

    const root = document.createElement('div');
    root.className = 'tc-root';
    root.innerHTML = `
      <div class="tc-pad">
        <div></div>${BUTTON('tc-dir', 'ArrowUp', '▲')}<div></div>
        ${BUTTON('tc-dir', 'ArrowLeft', '◀')}<div></div>${BUTTON('tc-dir', 'ArrowRight', '▶')}
        <div></div>${BUTTON('tc-dir', 'ArrowDown', '▼')}<div></div>
      </div>
      <div class="tc-face">
        ${BUTTON('tc-btn tc-b tc-off', 'Escape', 'B')}
        ${BUTTON('tc-btn tc-a', 'Enter', 'A')}
      </div>`;
    parent.appendChild(root);

    this.el = root;
    this.onKey = onKey;
    this.onKeyUp = onKeyUp;
    this.held = null;
    this.back = root.querySelector('.tc-b');
    this.backOn = false;

    this.wirePad(root.querySelector('.tc-pad'));
    for (const btn of root.querySelectorAll('.tc-btn')) this.wireButton(btn);
    root.addEventListener('contextmenu', (e) => e.preventDefault());

    this.refuseGestures();
    this.watchKeyboard();
  }

  /**
   * The CSS above covers most of it, but not iOS, which has ignored
   * user-scalable=no for years — a deliberate accessibility decision, and the
   * right one for a document. This is not a document: there is nothing to read
   * closer, and a stray second finger during a conversation leaves the island
   * magnified with the controls somewhere off the edge of the screen.
   *
   * gesture* are Safari's own pinch events. The touchmove guard is for the
   * browsers that have no such thing, and only ever fires on a second finger —
   * one finger is the game being played and is left alone.
   */
  refuseGestures() {
    const stop = (e) => e.preventDefault();
    for (const g of ['gesturestart', 'gesturechange', 'gestureend']) {
      document.addEventListener(g, stop, { passive: false });
    }
    document.addEventListener('touchmove', (e) => {
      if (e.touches.length > 1) e.preventDefault();
    }, { passive: false });
    document.addEventListener('dblclick', stop, { passive: false });
  }

  /**
   * Show B only while it means something. It sends Escape, which is how you
   * walk away from what somebody said without answering — and since A always
   * advances into the reply, B is the only way to decline. Standing in a field
   * there is nothing to escape from, so it goes.
   */
  showBack(on) {
    if (on === this.backOn) return;
    this.backOn = on;
    this.back.classList.toggle('tc-off', !on);
  }

  press(key) {
    if (key === this.held) return;
    this.release();
    this.held = key;
    if (!key) return;
    this.el.querySelector(`[data-key="${key}"]`)?.setAttribute('data-on', '');
    this.onKey(key);
  }

  release() {
    if (!this.held) return;
    this.el.querySelector(`[data-key="${this.held}"]`)?.removeAttribute('data-on');
    this.onKeyUp(this.held);
    this.held = null;
  }

  /**
   * One finger, hit-tested against whatever is under it. Sliding from one
   * direction to the next has to work without lifting — a d-pad you must lift
   * off to turn a corner is a d-pad that walks you into the sea.
   */
  wirePad(pad) {
    const under = (e) => document.elementFromPoint(e.clientX, e.clientY)
      ?.closest('.tc-dir')?.dataset.key ?? null;

    pad.addEventListener('pointerdown', (e) => {
      pad.setPointerCapture(e.pointerId);
      this.press(under(e));
      e.preventDefault();
    });
    pad.addEventListener('pointermove', (e) => {
      if (pad.hasPointerCapture(e.pointerId)) this.press(under(e));
    });
    for (const done of ['pointerup', 'pointercancel']) {
      pad.addEventListener(done, () => this.release());
    }
  }

  wireButton(btn) {
    const key = btn.dataset.key;
    btn.addEventListener('pointerdown', (e) => {
      // Keeping the default from running holds the caret — and so the on-screen
      // keyboard — in place while A sends what has been typed.
      e.preventDefault();
      btn.setAttribute('data-on', '');
      this.onKey(key);
      this.onKeyUp(key);
    });
    for (const done of ['pointerup', 'pointercancel', 'pointerleave']) {
      btn.addEventListener(done, () => btn.removeAttribute('data-on'));
    }
  }

  /**
   * The on-screen keyboard covers exactly the part of the screen the text box
   * lives in, and the browser does not reflow for it — visualViewport is the
   * only thing that reports it. When it is up the controls are underneath it
   * anyway, so they go away and the box comes up to meet the caret.
   */
  watchKeyboard() {
    const vv = visualViewport;
    if (!vv) return;
    const apply = () => {
      const lift = Math.max(0, innerHeight - vv.height - vv.offsetTop);
      document.documentElement.style.setProperty('--tc-kb', `${lift}px`);
      document.body.classList.toggle('tc-typing', lift > KEYBOARD);
    };
    vv.addEventListener('resize', apply);
    vv.addEventListener('scroll', apply);
    apply();
  }
}
