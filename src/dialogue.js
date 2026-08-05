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

  A node may also carry two things the script as a whole normally decides:

    name: 'YOU'   the plate over this line, when it is not the script's owner
                  speaking. `name: null` takes the plate away entirely, which is
                  the difference between somebody telling you something and the
                  game telling you something.
    cue: 'x'      a name handed to onCue when the line opens. The box does not
                  know or care what it means; it is how a script says "and this
                  is the moment the sky goes off" without the script having to
                  reach into the world to do it.
    give: 'x'     an item id handed to onGive when the line opens — the line
                  where somebody holds something out is the line you receive it
                  on. Deliberately not spelled as a cue, though it could have
                  been: a cue is a thing happening to the world and this is a
                  thing happening to you, they are answered by different parts
                  of the game, and a script saying `give: 'coconut'` is readable
                  by somebody who has never opened this file.

  And close() reports the node the script came to rest on, so a caller can tell
  which of three endings it reached without the box having to understand any of
  them. See story.js, where those ids are also place names.

  Long text is wrapped and paginated here, so scripts are written as prose and
  never have to care where the line breaks fall.

  The same box also takes typing — see ask(). A villager's lines are written
  months in advance and another player's are written while you wait, but there
  is no reason for them to arrive in different furniture, so they do not.
*/

const WRAP = 34;              // characters per line
const LINES = 2;              // lines visible at once
/*
  Horizontal padding, in characters rather than pixels — and that unit is the
  whole point of it.

  The box holds text that has already been wrapped to exactly WRAP characters, so
  its width is written in `ch` and moves with the type as the window narrows. The
  padding used to be 18px and did not. It was fixed while the thing it was
  padding was elastic, so the slack between the last character and the frame was
  whatever was left over after the padding took its cut — and the smaller the
  type got, the bigger a bite that fixed 18px each side took out of it. Measured:
  the left gap sat at 21px at every size, while the right fell from 25px on a
  wide window to 10px on a narrow one. Text nearly touching the frame on one side
  and comfortable on the other reads as a padding bug, and it is one, but the
  padding was never the asymmetric part. The units were.

  So the panel is now a whole number of characters wide — WRAP for the text and
  PAD either side of it — plus the six pixels of hard outline, which is the only
  part of it that has any business being fixed. Both gaps are the same fraction
  of a character at every size the type can be.
*/
const PAD = 1.5;              // ch, each side. 17px at the largest type, as before
const FRAME = 3;              // px — the hard outline, the one fixed part
const NAME_EM = 0.78;         // the name plate's type, against the box's
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

.dlg-box {
  position: relative;
  box-sizing: border-box;               /* the width below counts the frame in */
  width: calc(${WRAP + PAD * 2}ch + ${FRAME * 2}px); max-width: 100%;
  padding: 16px ${PAD}ch 18px;
}
.dlg-line { white-space: pre; min-height: 1.5em; }
/*
  The plate hangs four pixels left of the text it labels, at every size, which is
  what the old fixed 14px against a fixed 18px padding was doing.

  The divide is not decoration. A ch is the width of a zero *in the element's own
  font*, and this element sets its own smaller one — so 1.5ch here is not the
  1.5ch the box padding is, and writing it plainly would put the plate a good
  four pixels further out than intended. Dividing by the plate's own em factor
  converts the box's characters into the plate's.
*/
.dlg-name {
  position: absolute; top: -0.95em; left: calc(${(PAD / NAME_EM).toFixed(3)}ch - 4px);
  padding: 1px 10px 2px; border-radius: 6px;
  font-size: ${NAME_EM}em; letter-spacing: 0.14em; text-transform: uppercase;
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
.dlg-root.dlg-typing .dlg-box { pointer-events: auto; }
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
/* Same width as the box, so the list's right edge lands on the box's. */
.dlg-menu {
  align-self: center; box-sizing: border-box;
  width: calc(${WRAP + PAD * 2}ch + ${FRAME * 2}px); max-width: 100%;
  display: flex; justify-content: flex-end;
}
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

/*
  The day in quarters. Six hours each, and the names are the ones a villager
  would use rather than the ones a clock would — which is the whole point of
  having them, since these exist only to be spoken about.
*/
const QUARTERS = [
  { until: 6, name: 'night' },
  { until: 12, name: 'morning' },
  { until: 18, name: 'noon' },
  { until: 24, name: 'evening' },
];

export const partOfDay = (hours) => QUARTERS.find((q) => hours < q.until).name;

/*
  A line can be one string, or a table of them indexed by what the sky is doing
  and what time it is:

    text: {
      any:   'said whenever nothing below applies',
      rain:  'said in any rain',
      storm: { night: '...', any: '...' },
    }

  Both levels fall back to `any`, so a line that only cares about storms says so
  and stays two lines long, and only the lines worth varying carry a table.

  Both keys come from the shared clock, so this is a pure function of the room:
  two people talking to the same villager at the same moment are told the same
  thing, without a word of it crossing the wire.
*/
function pick(text, { weather = 'clear', time = 'morning' } = {}) {
  if (typeof text !== 'object' || text === null) return text ?? '';
  const forSky = text[weather] ?? text.any;
  if (forSky === undefined) return '';
  if (typeof forSky === 'string') return forSky;
  return forSky[time] ?? forSky.any ?? (typeof text.any === 'string' ? text.any : '');
}

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
  constructor(parent = document.body, keys = {}) {
    // What to call the buttons. A keyboard has Z and Escape, a phone has the
    // two circles under its right thumb, and the box should say so.
    this.keys = { confirm: 'Z', send: 'ENTER', cancel: 'ESC', ...keys };
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
      <div class="dlg-keys" hidden><b>${this.keys.send}</b> send &nbsp;·&nbsp; <b>${this.keys.cancel}</b> walk away</div>`;
    // Tapping the box puts the caret back. On a phone the keyboard only opens
    // for a focus that came from a touch, so there has to be something to
    // touch besides the one-line field itself.
    root.addEventListener('pointerdown', (e) => {
      if (!this.composing) return;
      e.preventDefault();
      this.el.field.focus();
    });
    parent.appendChild(root);

    const hint = document.createElement('div');
    hint.className = 'dlg-hint';
    hint.hidden = true;
    hint.innerHTML = `<b>${this.keys.confirm}</b> talk`;
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
    // What the sky and the clock are doing, for the tables above. Supplied by
    // the game; without it every line falls back to its plain form.
    this.context = () => ({});
    this.composing = false;
    this.onSend = null;
    this.onCancel = null;
    this.onClose = null;
    // What a `cue` on a node fires. One handler for the whole game, because a
    // cue is a thing happening in the world, not a thing happening in the box.
    this.onCue = null;
    // ...and what a `give` on a node hands over. Same shape, different half of
    // the game: a cue reaches the island, this reaches your bag.
    this.onGive = null;
    this.node = null;
    this.ending = null;     // the last node reached — reported by close()
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
      this.el.hint.innerHTML = `<b>${this.keys.confirm}</b> ${label}`;
    }
  }

  start(script, onClose = null) {
    this.script = script;
    this.composing = false;
    this.onClose = onClose;
    this.ending = null;
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
    this.el.root.classList.add('dlg-typing');
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
    this.ending = id;
    // Whoever is speaking this line, which is usually but not always the person
    // whose script it is: a conversation with two people in it has to be able to
    // put the other one's name up.
    const name = 'name' in node ? node.name : this.script.name;
    this.el.name.textContent = name ?? '';
    this.el.name.hidden = !name;
    this.pages = paginate(pick(node.text ?? '', this.context()));
    this.page = 0;
    this.hideChoices();
    this.openPage();
    if (node.cue) this.onCue?.(node.cue);
    if (node.give) this.onGive?.(node.give);
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
   *
   * The handler is also told the node it ended on, so a script can be read for
   * which way it went without anything here knowing what the ways are.
   */
  close(why = 'end') {
    this.script = null;
    this.node = null;
    this.composing = false;
    this.hideChoices();
    this.el.entry.hidden = true;
    this.el.keys.hidden = true;
    this.el.root.classList.remove('dlg-typing');
    if (document.activeElement === this.el.field) this.el.field.blur();
    this.el.root.hidden = true;
    const cb = this.onClose;
    const cancelled = why === 'escape' ? this.onCancel : null;
    this.onClose = null;
    this.onCancel = null;
    this.onSend = null;
    if (cb) cb(why, this.ending);
    if (cancelled) cancelled();
  }
}
