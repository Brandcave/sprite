/*
  The text box. Styled after the GBC-era originals — white panel, hard black
  outline, blue inner frame, two lines of monospace typed a character at a time
  — with one addition those games mostly reserved for shopkeepers: any line can
  branch into a multiple-choice answer.

  A script is plain data:

    {
      name: 'ANOKA',
      start: 'intro',
      nodes: {
        intro: { text: '...', next: 'ask' },
        ask:   { text: '...', choices: [{ label: 'Yes', next: 'yes' }, ...] },
        yes:   { text: '...' },                    // no next, no choices = end
      },
    }

  Long text is wrapped and paginated here, so scripts are written as prose and
  never have to care where the line breaks fall.

  The same box also takes typing — see ask(). A villager's lines are written
  months in advance and another player's are written while you wait, but there
  is no reason for them to arrive in different furniture, so they do not.
*/

const WRAP = 34;              // characters per line
const LINES = 2;              // lines visible at once
const CHAR_MS = 17;           // typewriter speed
const MAX_TEXT = 120;         // as much as anybody needs to say at once
const CONFIRM = new Set(['Enter', 'Space', 'KeyZ', 'KeyE']);
const SUBMIT = new Set(['Enter', 'NumpadEnter']);
const UP = new Set(['ArrowUp', 'KeyW']);
const DOWN = new Set(['ArrowDown', 'KeyS']);

const CSS = `
.dlg-root {
  position: fixed; left: 0; right: 0; bottom: 0;
  display: flex; flex-direction: column; align-items: center;
  gap: 10px; padding: 0 16px 22px;
  font: 500 clamp(13px, 1.7vw, 19px)/1.5 ui-monospace, SFMono-Regular, Menlo, monospace;
  color: #202028; user-select: none; pointer-events: none;
  z-index: 10;
}
.dlg-root[hidden] { display: none; }

/* white panel, hard outline, blue inner frame — the GBC dialogue look */
.dlg-panel {
  background: #f8f8f8;
  border: 3px solid #101820;
  border-radius: 9px;
  box-shadow: inset 0 0 0 3px #f8f8f8, inset 0 0 0 6px #3860b8,
              0 5px 0 rgba(8, 12, 24, 0.45);
}

.dlg-box { position: relative; width: ${WRAP + 4}ch; max-width: 100%; padding: 16px 18px 18px; }
.dlg-line { white-space: pre; min-height: 1.5em; }
.dlg-name {
  position: absolute; top: -0.95em; left: 14px;
  padding: 1px 10px 2px; border-radius: 6px;
  font-size: 0.78em; letter-spacing: 0.14em; text-transform: uppercase;
  box-shadow: inset 0 0 0 2px #f8f8f8, inset 0 0 0 4px #3860b8;
}
.dlg-more {
  position: absolute; right: 12px; bottom: 6px;
  font-size: 0.8em; color: #3860b8;
  animation: dlg-blink 0.9s steps(1, end) infinite;
}
.dlg-more[hidden] { display: none; }
@keyframes dlg-blink { 0%, 55% { opacity: 1; } 56%, 100% { opacity: 0; } }

/* the same two lines, but you are the one writing them */
.dlg-entry { display: flex; align-items: baseline; gap: 6px; min-height: 1.5em; }
.dlg-entry[hidden] { display: none; }
.dlg-entry .dlg-cur { visibility: visible; animation: dlg-blink 0.9s steps(1, end) infinite; }
.dlg-field {
  flex: 1; min-width: 0; padding: 0;
  font: inherit; color: inherit; background: none; border: 0; outline: none;
  caret-color: #3860b8;
  pointer-events: auto; user-select: text;
}
.dlg-keys {
  padding: 5px 12px; border-radius: 7px;
  background: rgba(10, 16, 30, 0.62);
  border: 1px solid rgba(255, 255, 255, 0.16);
  font-size: 0.66em; letter-spacing: 0.1em; color: #eaf2ff;
}
.dlg-keys[hidden] { display: none; }
.dlg-keys b { color: #ffd47a; }

/* the choice menu sits above the text, right-aligned, like a shop list */
.dlg-menu { align-self: center; width: ${WRAP + 4}ch; max-width: 100%; display: flex; justify-content: flex-end; }
.dlg-menu[hidden] { display: none; }
.dlg-menu-inner { padding: 12px 16px 12px 10px; min-width: 11ch; }
.dlg-opt { display: flex; align-items: baseline; gap: 6px; padding: 1px 0; }
.dlg-cur { width: 1ch; color: #3860b8; visibility: hidden; }
.dlg-opt[data-sel="true"] .dlg-cur { visibility: visible; }
.dlg-opt[data-sel="true"] { color: #101820; }

/* "press Z" affordance, shown only when you are actually facing someone */
.dlg-hint {
  position: fixed; left: 50%; bottom: 22px; transform: translateX(-50%);
  padding: 7px 14px; border-radius: 8px;
  background: rgba(10, 16, 30, 0.62);
  border: 1px solid rgba(255, 255, 255, 0.16);
  font: 12px/1 ui-monospace, SFMono-Regular, Menlo, monospace;
  letter-spacing: 0.1em; color: #eaf2ff;
  user-select: none; pointer-events: none; z-index: 9;
}
.dlg-hint[hidden] { display: none; }
.dlg-hint b { color: #ffd47a; }
`;

/** Greedy word wrap, then group the lines into pages of two. */
function paginate(text) {
  const lines = [];
  let cur = '';
  for (let word of String(text).split(/\s+/).filter(Boolean)) {
    while (word.length > WRAP) {          // a word longer than the box
      if (cur) { lines.push(cur); cur = ''; }
      lines.push(word.slice(0, WRAP));
      word = word.slice(WRAP);
    }
    if (!cur) cur = word;
    else if (cur.length + 1 + word.length <= WRAP) cur += ' ' + word;
    else { lines.push(cur); cur = word; }
  }
  if (cur) lines.push(cur);
  if (!lines.length) lines.push('');

  const pages = [];
  for (let i = 0; i < lines.length; i += LINES) pages.push(lines.slice(i, i + LINES));
  return pages;
}

/**
 * A script for one block of text and nothing else — what a sign is. Signs get
 * no name plate: there is nobody talking, which is the whole difference between
 * reading something and being told it.
 */
export function message(text, name = null) {
  return { name, start: 'text', nodes: { text: { text } } };
}

export class Dialogue {
  constructor(parent = document.body) {
    const style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);

    const root = document.createElement('div');
    root.className = 'dlg-root';
    root.hidden = true;
    root.innerHTML = `
      <div class="dlg-menu" hidden><div class="dlg-menu-inner dlg-panel"></div></div>
      <div class="dlg-box dlg-panel">
        <div class="dlg-name dlg-panel"></div>
        ${Array.from({ length: LINES }, () => '<div class="dlg-line"></div>').join('')}
        <div class="dlg-entry" hidden>
          <span class="dlg-cur">▶</span>
          <input class="dlg-field" type="text" maxlength="${MAX_TEXT}"
                 autocomplete="off" autocapitalize="off" spellcheck="false">
        </div>
        <div class="dlg-more" hidden>▼</div>
      </div>
      <div class="dlg-keys" hidden><b>ENTER</b> send &nbsp;·&nbsp; <b>ESC</b> walk away</div>`;
    parent.appendChild(root);

    const hint = document.createElement('div');
    hint.className = 'dlg-hint';
    hint.hidden = true;
    hint.innerHTML = '<b>Z</b> talk';
    parent.appendChild(hint);

    this.el = {
      root,
      hint,
      menu: root.querySelector('.dlg-menu'),
      menuInner: root.querySelector('.dlg-menu-inner'),
      name: root.querySelector('.dlg-name'),
      lines: [...root.querySelectorAll('.dlg-line')],
      more: root.querySelector('.dlg-more'),
      entry: root.querySelector('.dlg-entry'),
      field: root.querySelector('.dlg-field'),
      keys: root.querySelector('.dlg-keys'),
    };

    this.script = null;
    this.composing = false;
    this.onSend = null;
    this.onCancel = null;
    this.onClose = null;
    this.node = null;
    this.pages = [];
    this.page = 0;
    this.shown = 0;         // characters revealed on the current page
    this.total = 0;
    this.choices = null;
    this.selected = 0;
  }

  get active() {
    return this.script !== null || this.composing;
  }

  get typing() {
    return this.shown < this.total;
  }

  /**
   * Show the "press Z" nudge, labelled for whatever is in front of you — `talk`
   * for a villager, `read` for a sign. Falsy hides it, as does an open box.
   */
  showHint(label) {
    this.el.hint.hidden = !label || this.active;
    if (label && this.hintLabel !== label) {
      this.hintLabel = label;
      this.el.hint.innerHTML = `<b>Z</b> ${label}`;
    }
  }

  start(script, onClose = null) {
    this.script = script;
    this.composing = false;
    this.onClose = onClose;
    this.el.name.textContent = script.name ?? '';
    this.el.name.hidden = !script.name;
    this.el.entry.hidden = true;
    this.el.keys.hidden = true;
    this.el.root.hidden = false;
    this.el.hint.hidden = true;
    this.goto(script.start ?? Object.keys(script.nodes)[0]);
  }

  /**
   * Hand the box over to the player and let them write the next line.
   *
   * `keep` leaves whatever is on screen where it is, which is what you want
   * when replying: their sentence stays above your answer while you type it,
   * the way it would if you were standing there.
   */
  ask(name, { onSend, onCancel = null, keep = false } = {}) {
    this.script = null;
    this.node = null;
    this.composing = true;
    this.onSend = onSend;
    this.onCancel = onCancel;
    this.hideChoices();
    if (!keep) for (const el of this.el.lines) el.textContent = '';
    this.el.name.textContent = name ?? '';
    this.el.name.hidden = !name;
    this.el.more.hidden = true;
    this.el.entry.hidden = false;
    this.el.keys.hidden = false;
    this.el.root.hidden = false;
    this.el.hint.hidden = true;
    this.el.field.value = '';
    this.el.field.focus();
  }

  /** Enter, with something written. Nothing written means you thought better of it. */
  submit() {
    const text = this.el.field.value.trim();
    if (!text) return this.close('escape');
    const send = this.onSend;
    this.onCancel = null;
    this.close('sent');
    send?.(text);
  }

  goto(id) {
    const node = id ? this.script.nodes[id] : null;
    if (!node) return this.close();
    this.node = node;
    this.pages = paginate(node.text ?? '');
    this.page = 0;
    this.hideChoices();
    this.openPage();
  }

  openPage() {
    this.total = this.pages[this.page].join('\n').length;
    this.shown = 0;
    this.render();
  }

  /** Confirm pressed, or the page finished: what happens next. */
  advance() {
    if (this.typing) {                    // still typing — dump the rest
      this.shown = this.total;
      this.render();
      return;
    }
    if (this.page < this.pages.length - 1) {
      this.page++;
      this.openPage();
      return;
    }
    if (this.node.choices?.length) {
      this.showChoices(this.node.choices);
      return;
    }
    if (this.node.next) this.goto(this.node.next);
    else this.close();
  }

  showChoices(choices) {
    this.choices = choices;
    this.selected = 0;
    this.el.menuInner.innerHTML = choices
      .map((c, i) => `<div class="dlg-opt" data-sel="${i === 0}"><span class="dlg-cur">▶</span><span>${c.label}</span></div>`)
      .join('');
    this.el.menu.hidden = false;
    this.el.more.hidden = true;
  }

  hideChoices() {
    this.choices = null;
    this.el.menu.hidden = true;
  }

  moveCursor(delta) {
    const n = this.choices.length;
    this.selected = (this.selected + delta + n) % n;
    [...this.el.menuInner.children].forEach((el, i) => {
      el.dataset.sel = String(i === this.selected);
    });
  }

  /** @returns whether the key was consumed */
  key(code) {
    if (!this.active) return false;
    if (code === 'Escape') { this.close('escape'); return true; }
    if (this.composing) {
      // A click on the canvas takes the caret away; take it back rather than
      // silently swallowing what they type next.
      if (document.activeElement !== this.el.field) this.el.field.focus();
      if (SUBMIT.has(code)) { this.submit(); return true; }
      return false;             // everything else is theirs to type
    }
    if (this.choices) {
      if (UP.has(code)) { this.moveCursor(-1); return true; }
      if (DOWN.has(code)) { this.moveCursor(1); return true; }
      if (CONFIRM.has(code)) {
        const choice = this.choices[this.selected];
        this.hideChoices();
        if (choice.next) this.goto(choice.next);
        else this.close();
        return true;
      }
      return false;
    }
    if (CONFIRM.has(code)) { this.advance(); return true; }
    return false;
  }

  update(dt) {
    if (!this.script || this.choices) return;
    if (this.typing) {
      this.shown = Math.min(this.total, this.shown + (dt * 1000) / CHAR_MS);
      this.render();
    }
  }

  render() {
    const page = this.pages[this.page];
    let left = Math.floor(this.shown);
    this.el.lines.forEach((el, i) => {
      const line = page[i] ?? '';
      el.textContent = line.slice(0, Math.max(0, left));
      left -= line.length + 1;              // +1 for the newline between lines
    });
    // the arrow means "waiting on you" — another page, a question, or the end
    this.el.more.hidden = this.typing;
  }

  /**
   * `why` is 'end' when the text simply ran out, 'sent' when they wrote
   * something, and 'escape' when they walked away from it — which is the
   * difference between a conversation that wants a reply and one that does not.
   */
  close(why = 'end') {
    this.script = null;
    this.node = null;
    this.composing = false;
    this.hideChoices();
    this.el.entry.hidden = true;
    this.el.keys.hidden = true;
    if (document.activeElement === this.el.field) this.el.field.blur();
    this.el.root.hidden = true;
    const cb = this.onClose;
    const cancelled = why === 'escape' ? this.onCancel : null;
    this.onClose = null;
    this.onCancel = null;
    this.onSend = null;
    if (cb) cb(why);
    if (cancelled) cancelled();
  }
}
