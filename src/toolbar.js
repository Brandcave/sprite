/*
  The bar in the corner. Selecting a tool does not open something above it — the
  bar becomes that tool, in place, growing out of the buttons you pressed.

  A tool is a small object rather than a subclass — an icon, the content it puts
  in the bar, and a say in whether it belongs on screen at all:

    {
      id, title, icon,            // icon is an inline <svg>
      panel,                      // goes into the bar while this tool is chosen
      ambient,                    // sits above the bar (optional)
      available(),                // false hides its button entirely
      ambientShowing(),           // false while its ambient has nothing to say
      onOpen(), onClose(),        // chosen, and let go of
      typing(),                   // true while it wants the keyboard (optional)
    }

  `ambientShowing` exists because "this tool is available" and "this tool has
  something to show right now" are not the same question, and answering the
  second with the first is what put an empty pane above the bar. The chat is
  available exactly when it has a stream worth showing, so it never needed the
  distinction; the bag is available always and has something to say for about
  two seconds after you pick something up. Left out, it means yes, which is what
  every tool written before it assumed.

  Selecting swaps what the bar holds; selecting the chosen one puts it away and
  the bar shrinks back to its buttons. The contract is deliberately small: the
  next tool should be a file that knows about its own job and nothing about this
  one.

  The buttons stay put the whole time, which is the point of doing it in place.
  You can go from typing a message to holding a shovel without shutting anything
  first, and the bar never moves under the cursor on the way.

  One thing does sit above it. A panel is what you are *doing* — one at a time,
  and only while you have chosen it — but ambient content is what is happening
  whether you asked or not. Chat forced the distinction: messages have to stay
  readable while you are busy with something else, so the stream is ambient and
  only the field is a panel.
*/

const BOUNCE = 420;
const PAD = 6;                // the bar's own padding
const BTN = 34;               // a button, square
const GAP = 4;                // between buttons

const CSS = `
.tb-root {
  position: fixed; left: 16px; bottom: 16px; z-index: 9;
  width: min(340px, 38vw);
  display: flex; flex-direction: column; justify-content: flex-end;
  align-items: flex-start; gap: 7px;
  font: 500 13px/1.45 ui-monospace, SFMono-Regular, Menlo, monospace;
  pointer-events: none;
}
.tb-root[hidden] { display: none; }

.tb-pane {
  background: rgba(20, 28, 48, 0.34);
  -webkit-backdrop-filter: blur(14px) saturate(160%);
  backdrop-filter: blur(14px) saturate(160%);
  border: 1px solid rgba(255, 255, 255, 0.22);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.3), 0 8px 20px rgba(4, 8, 18, 0.35);
  border-radius: 12px;
  color: #eaf2ff; text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
}

.tb-ambient { align-self: stretch; }
.tb-ambient[hidden] { display: none; }

/*
  The width is set from JavaScript at both ends — the buttons' own width when
  shut, and the full column when open. A width cannot animate to or from auto,
  and this is the animation the whole thing is built around.
*/
/*
  Top-aligned rather than centred, which only shows once something is open: with
  the buttons centred against a tall panel, the icon you pressed drifted down to
  the middle of the bar and sat opposite nothing in particular. At the top it
  stays level with the first row of whatever it opened, and it does not move
  when the panel's contents change height. Shut, every child is the same height
  and this is indistinguishable from centred.
*/
.tb-bar {
  display: flex; align-items: flex-start; gap: ${GAP}px;
  padding: ${PAD}px; overflow: hidden; pointer-events: auto;
  transition: width ${BOUNCE}ms cubic-bezier(0.34, 1.56, 0.64, 1);
}
.tb-bar.tb-boing { animation: tb-boing ${BOUNCE}ms cubic-bezier(0.34, 1.56, 0.64, 1); }
@keyframes tb-boing {
  0% { transform: scale(0.9); }
  55% { transform: scale(1.04); }
  100% { transform: scale(1); }
}

.tb-btn {
  flex: none; display: grid; place-items: center;
  width: ${BTN}px; height: ${BTN}px; padding: 0;
  background: none; border: 0; border-radius: 9px;
  color: #ffd47a; cursor: pointer;
  transition: background 120ms ease, color 120ms ease;
}
.tb-btn svg { width: 19px; height: 19px; display: block; }
.tb-btn:hover { background: rgba(255, 255, 255, 0.09); }
/* The open tool's button brightens rather than growing a panel of its own. The
   bar has already opened; saying so twice draws a box inside a box. */
.tb-btn[aria-pressed="true"] { color: #ffe6ab; }
.tb-btn[hidden] { display: none; }

/* whatever the chosen tool put in the bar */
.tb-slot { flex: 1; min-width: 0; display: flex; align-items: center; }
.tb-slot:empty { display: none; }
.tb-slot > * { flex: 1; min-width: 0; }

/*
  A phone keeps its bar at the top, out from under the thumbs and the keyboard,
  with everything hanging below it — see the same flip in the chat stream.
*/
body.touch .tb-root {
  top: max(14px, env(safe-area-inset-top, 0px));
  bottom: auto;
  flex-direction: column-reverse;
  justify-content: flex-start;
  width: min(300px, 62vw);
}
`;

export class Toolbar {
  constructor(tools, parent = document.body) {
    const style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);

    const root = document.createElement('div');
    root.className = 'tb-root';
    root.hidden = true;

    const ambient = document.createElement('div');
    ambient.className = 'tb-ambient';

    const bar = document.createElement('div');
    bar.className = 'tb-bar tb-pane';

    const slot = document.createElement('div');
    slot.className = 'tb-slot';

    root.append(ambient, bar);
    parent.append(root);

    this.el = { root, ambient, bar, slot };
    this.tools = tools;
    this.active = null;
    this.buttons = new Map();
    /*
      What each tool last said about itself. Kept rather than asked for, because
      which buttons belong on the bar is now decided in two places — every frame
      as tools come and go, and the instant one is chosen — and re-running every
      tool's available() from inside select() would be asking a question in the
      middle of answering it.
    */
    this.availability = new Map(tools.map((t) => [t, true]));

    for (const tool of tools) {
      if (tool.ambient) ambient.append(tool.ambient);

      const btn = document.createElement('button');
      btn.className = 'tb-btn';
      btn.type = 'button';
      btn.title = tool.title;
      btn.setAttribute('aria-label', tool.title);
      btn.setAttribute('aria-pressed', 'false');
      btn.innerHTML = tool.icon;
      btn.addEventListener('click', () => this.select(this.active === tool ? null : tool));

      // A tool that finishes its own job puts itself away — sending a message,
      // say. It should not have to know what a toolbar is to do that.
      tool.onCloseRequest = () => { if (this.active === tool) this.select(null); };
      bar.append(btn);
      this.buttons.set(tool, btn);
    }

    bar.append(slot);
    this.resize();
  }

  /** Whether anything here wants the keyboard, so the game leaves the keys be. */
  get typing() {
    return this.tools.some((t) => t.typing?.());
  }

  /**
   * Which buttons belong on the bar.
   *
   * Available, and — once something is open — only that one. The bar has become
   * the tool at that point, and the other icons are an offer to throw away what
   * you are in the middle of; the one that stays is the way back out, which is
   * the only thing you can usefully press. It keeps its place in the row rather
   * than moving to the front, so the button you pressed is still under the
   * cursor when it becomes the button that closes.
   */
  refreshButtons() {
    for (const tool of this.tools) {
      const btn = this.buttons.get(tool);
      const hide = !this.availability.get(tool)
        || (this.active !== null && this.active !== tool);
      if (btn.hidden !== hide) btn.hidden = hide;
    }
  }

  /** As wide as its buttons when shut, and the whole column when open. */
  resize() {
    const showing = [...this.buttons.values()].filter((b) => !b.hidden).length;
    this.el.bar.style.width = this.active
      ? '100%'
      : `${PAD * 2 + showing * BTN + Math.max(0, showing - 1) * GAP}px`;
  }

  select(tool) {
    if (tool === this.active) return;

    const leaving = this.active;
    this.active = tool;
    if (leaving) {
      this.buttons.get(leaving).setAttribute('aria-pressed', 'false');
      leaving.panel.remove();
      leaving.onClose?.();
    }
    if (tool) {
      this.buttons.get(tool).setAttribute('aria-pressed', 'true');
      this.el.slot.append(tool.panel);
    }

    this.refreshButtons();
    this.resize();
    this.el.bar.classList.remove('tb-boing');
    void this.el.bar.offsetWidth;          // let the animation run again
    this.el.bar.classList.add('tb-boing');
    tool?.onOpen?.();
  }

  /**
   * Called every frame. A tool that has stopped being relevant loses its button
   * — and the bar, if it was the one holding it — and a bar with nothing left on
   * it is not a bar, so the whole thing goes.
   */
  update() {
    let any = false;
    for (const tool of this.tools) {
      const ok = tool.available ? tool.available() : true;
      this.availability.set(tool, ok);
      // Available *and* with something to say. A tool that is always available
      // and only occasionally has anything to show — the bag — would otherwise
      // hold an empty pane above the bar for the whole game.
      if (tool.ambient) {
        tool.ambient.hidden = !ok || !(tool.ambientShowing?.() ?? true);
      }
      if (!ok && this.active === tool) this.select(null);
      any = any || ok;
    }
    this.refreshButtons();
    this.el.root.hidden = !any;
    if (!this.active) this.resize();
  }
}
