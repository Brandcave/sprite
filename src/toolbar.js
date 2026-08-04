/*
  The bar in the corner, and whatever the selected tool wants above it.

  A tool is a small object rather than a subclass — an icon, a panel, and a say
  in whether it belongs on screen at all:

    {
      id, title, icon,            // icon is an inline <svg>
      panel,                      // shown while this tool is the selected one
      ambient,                    // shown whenever the tool is available (optional)
      available(),                // false hides its button entirely
      onOpen(), onClose(),        // selected, and deselected
      typing(),                   // true while it wants the keyboard (optional)
    }

  Selecting a button swaps the panel; selecting the selected one puts it away.
  That is the whole contract, and it is deliberately small: the next tool should
  be a file that knows about its own job and nothing about this one.

  Two kinds of content, because they answer different questions. A panel is what
  you are doing — only one at a time, and only while you have chosen it. Ambient
  is what is happening whether or not you asked: chat arriving is the case that
  forced the distinction, since messages have to be readable while you are
  holding a shovel.
*/

const BOUNCE = 420;

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

.tb-ambient, .tb-panel { align-self: stretch; }
.tb-panel[hidden], .tb-ambient[hidden] { display: none; }

/* the panel springs out of the bar it was opened from */
.tb-panel.tb-boing { animation: tb-boing ${BOUNCE}ms cubic-bezier(0.34, 1.56, 0.64, 1); }
@keyframes tb-boing {
  0% { opacity: 0; transform: scale(0.88) translateY(6px); }
  55% { transform: scale(1.03); }
  100% { opacity: 1; transform: none; }
}

.tb-bar { display: flex; align-items: center; gap: 4px; padding: 6px; pointer-events: auto; }
.tb-btn {
  display: grid; place-items: center;
  width: 34px; height: 34px; padding: 0;
  background: none; border: 0; border-radius: 9px;
  color: #ffd47a; cursor: pointer;
  transition: background 120ms ease, color 120ms ease;
}
.tb-btn svg { width: 19px; height: 19px; display: block; }
.tb-btn:hover { background: rgba(255, 255, 255, 0.09); }
.tb-btn[aria-pressed="true"] { background: rgba(255, 212, 122, 0.16); color: #ffe6ab; }
.tb-btn[hidden] { display: none; }

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

    const panel = document.createElement('div');
    panel.className = 'tb-panel';
    panel.hidden = true;

    const bar = document.createElement('div');
    bar.className = 'tb-bar tb-pane';

    root.append(ambient, panel, bar);
    parent.append(root);

    this.el = { root, ambient, panel, bar };
    this.tools = tools;
    this.active = null;
    this.buttons = new Map();

    for (const tool of tools) {
      if (tool.ambient) ambient.append(tool.ambient);
      // A tool that finishes on its own — a message sent — puts itself away.
      tool.onCloseRequest = () => this.select(null);

      const btn = document.createElement('button');
      btn.className = 'tb-btn';
      btn.type = 'button';
      btn.title = tool.title;
      btn.setAttribute('aria-label', tool.title);
      btn.setAttribute('aria-pressed', 'false');
      btn.innerHTML = tool.icon;
      btn.addEventListener('click', () => this.select(this.active === tool ? null : tool));
      bar.append(btn);
      this.buttons.set(tool, btn);
    }
  }

  /** Whether anything here wants the keyboard, so the game leaves the keys be. */
  get typing() {
    return this.tools.some((t) => t.typing?.());
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

    const { panel } = this.el;
    panel.hidden = !tool;
    if (!tool) return;

    this.buttons.get(tool).setAttribute('aria-pressed', 'true');
    panel.append(tool.panel);
    panel.classList.remove('tb-boing');
    void panel.offsetWidth;               // let the animation run again
    panel.classList.add('tb-boing');
    tool.onOpen?.();
  }

  /**
   * Called every frame. A tool that has stopped being relevant loses its button
   * — and its panel, if it was the one open — and a bar with nothing left on it
   * is not a bar, so the whole thing goes.
   */
  update() {
    let any = false;
    for (const tool of this.tools) {
      const ok = tool.available ? tool.available() : true;
      this.buttons.get(tool).hidden = !ok;
      if (tool.ambient) tool.ambient.hidden = !ok;
      if (!ok && this.active === tool) this.select(null);
      any = any || ok;
    }
    this.el.root.hidden = !any;
  }
}
