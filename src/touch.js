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
body.touch { -webkit-touch-callout: none; }
body.touch #view, body.touch { touch-action: none; overscroll-behavior: none; }

.tc-root {
  position: fixed; left: 0; right: 0; bottom: 0; z-index: 11;
  display: flex; align-items: flex-end; justify-content: space-between;
  padding: 0 22px calc(20px + env(safe-area-inset-bottom, 0px));
  pointer-events: none; user-select: none;
  font: 700 15px/1 ui-monospace, SFMono-Regular, Menlo, monospace;
}
.tc-root[hidden] { display: none; }

/* Opaque on purpose. A translucent control over a moving 3D scene changes
   colour as you walk and stops looking like a button you can trust. */
.tc-pad { display: grid; grid-template: repeat(3, 58px) / repeat(3, 58px); gap: 3px;
          pointer-events: auto; touch-action: none; }
.tc-key {
  background: #2a3142; border: 3px solid #101820; color: #eaf2ff;
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 4px 0 rgba(8, 12, 24, 0.55);
  pointer-events: auto; touch-action: none;
}
.tc-key[data-on] { background: #3860b8; transform: translateY(3px); box-shadow: 0 1px 0 rgba(8, 12, 24, 0.55); }
.tc-dir { border-radius: 7px; font-size: 19px; }
.tc-hub { background: #2a3142; border: 3px solid #101820; border-radius: 4px; }

.tc-face { display: grid; gap: 14px; justify-items: center; pointer-events: none; }
.tc-btn { width: 74px; height: 74px; border-radius: 50%; font-size: 20px; letter-spacing: 0.06em; }
.tc-a { background: #3860b8; }
.tc-a[data-on] { background: #6f97e8; }
.tc-b { background: #d8483c; }
.tc-b[data-on] { background: #ef7d6f; }
.tc-cap { font-size: 10px; letter-spacing: 0.14em; opacity: 0.8; margin-top: 4px; }

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
        ${BUTTON('tc-dir', 'ArrowLeft', '◀')}<div class="tc-hub"></div>${BUTTON('tc-dir', 'ArrowRight', '▶')}
        <div></div>${BUTTON('tc-dir', 'ArrowDown', '▼')}<div></div>
      </div>
      <div class="tc-face">
        ${BUTTON('tc-btn tc-b', 'Escape', 'B')}
        ${BUTTON('tc-btn tc-a', 'Enter', 'A')}
      </div>`;
    parent.appendChild(root);

    this.el = root;
    this.onKey = onKey;
    this.onKeyUp = onKeyUp;
    this.held = null;

    this.wirePad(root.querySelector('.tc-pad'));
    for (const btn of root.querySelectorAll('.tc-btn')) this.wireButton(btn);
    root.addEventListener('contextmenu', (e) => e.preventDefault());

    this.watchKeyboard();
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
