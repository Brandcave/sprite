import { itemOf } from './items.js';
import { bitmapDataUrl } from './voxel.js';

/*
  What you are carrying, and the drawer it lives in.

  Two things in one file, deliberately. The model is a Map of id to count and
  about thirty lines; splitting it out would give one file with no behaviour and
  another that imports it and does everything, which is two files pretending to
  be a boundary. The boundary that matters is the one at the top — nothing else
  in the game touches the Map, it calls add() and has() — and that is enforced
  by the shape of the class rather than by which file it sits in.

  It is a tool, in the sense toolbar.js means: an icon, and a panel that becomes
  the bar while you have it open. Unlike the chat it is always available, because
  an empty bag is still yours; a bag whose button disappears when you put your
  last coconut down is a bag you would stop trusting.

  Nothing here is on the wire. What you are carrying is yours, the same way the
  story is — see the note at the top of story.js, which this follows exactly.
  Two people in the same room have their own bags and neither can see into the
  other's, and that is the honest reading rather than a shortcut: the relay
  carries steps and speech, and an item that only one machine knows about cannot
  desync anything.
*/

const CSS = `
.inv-panel { display: flex; flex-direction: column; gap: 8px; padding: 10px 11px 11px; min-width: 0; }

.inv-grid {
  display: grid; grid-template-columns: repeat(5, 1fr); gap: 6px;
}

/*
  Every slot is drawn, filled or not. A grid that grows as you pick things up
  moves the thing you are looking at while you are looking at it, and an empty
  row is also the clearest possible statement of how much room is left.
*/
.inv-slot {
  position: relative; aspect-ratio: 1; border-radius: 8px;
  background: rgba(8, 14, 28, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.12);
  display: grid; place-items: center;
  cursor: default; pointer-events: auto;
  transition: border-color 140ms ease, background 140ms ease;
}
.inv-slot[data-full="true"] { background: rgba(16, 26, 48, 0.44); }
.inv-slot[data-sel="true"] {
  border-color: rgba(255, 212, 122, 0.85);
  background: rgba(40, 34, 20, 0.5);
}

.inv-slot img {
  width: 78%; height: 78%;
  image-rendering: pixelated;          /* it is a 16x16; let it be one */
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.55));
}

.inv-count {
  position: absolute; right: 3px; bottom: 1px;
  font-size: 10px; line-height: 1; color: #ffd47a;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.9);
}

/* the read-out under the grid: what the highlighted slot is */
.inv-read { min-height: 2.9em; }
.inv-name { color: #ffd47a; letter-spacing: 0.04em; }
.inv-note { opacity: 0.85; font-size: 12px; }
.inv-empty { opacity: 0.6; font-size: 12px; }

/*
  The one thing that happens whether the drawer is open or not: something
  arriving. It sits above the bar for a moment and goes. Without it, being
  handed something at the end of a conversation is completely silent — the box
  closes and a number you cannot see has gone up by one.
*/
.inv-toast { display: flex; align-items: center; gap: 9px; padding: 7px 12px 7px 8px; }
.inv-toast[hidden] { display: none; }
.inv-toast img { width: 26px; height: 26px; image-rendering: pixelated; }
.inv-toast b { color: #ffd47a; font-weight: 500; }
.inv-toast.inv-in { animation: inv-rise 300ms cubic-bezier(0.2, 0.9, 0.3, 1) both; }
@keyframes inv-rise {
  from { opacity: 0; transform: translateY(12px) scale(0.94); }
  to { opacity: 1; transform: none; }
}
`;

const SLOTS = 10;             // two rows of five
const TOAST = 2600;           // how long "you picked something up" stays up

const ICON = `<svg viewBox="0 0 24 24" width="19" height="19" fill="none"
  stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
  <path d="M4 8h16l-1.2 11.2a1.6 1.6 0 0 1-1.6 1.4H6.8a1.6 1.6 0 0 1-1.6-1.4Z"/>
  <path d="M8.6 8V6.2a3.4 3.4 0 0 1 6.8 0V8"/>
</svg>`;

export class Inventory {
  constructor() {
    const style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);

    /** id -> how many. An id with none of it left is deleted rather than zeroed. */
    this.held = new Map();
    /** Which slot the read-out is describing. */
    this.selected = 0;
    /** Told whenever what you are carrying changes. */
    this.onChange = null;

    // ---- the tool, as toolbar.js wants one
    this.id = 'bag';
    this.title = 'Bag';
    this.icon = ICON;

    const panel = document.createElement('div');
    panel.className = 'inv-panel';
    panel.innerHTML = `<div class="inv-grid"></div><div class="inv-read"></div>`;
    this.panel = panel;

    const toast = document.createElement('div');
    toast.className = 'inv-toast tb-pane';
    toast.hidden = true;
    this.ambient = toast;

    this.el = {
      grid: panel.querySelector('.inv-grid'),
      read: panel.querySelector('.inv-read'),
      toast,
    };

    this.buildSlots();
    this.render();
  }

  /* ------------------------------------------------------------ the model */

  /** How many of that you have. */
  count(id) {
    return this.held.get(id) ?? 0;
  }

  has(id, n = 1) {
    return this.count(id) >= n;
  }

  /** What you are carrying, in a stable order, as [id, count] pairs. */
  list() {
    return [...this.held.entries()];
  }

  /**
   * Take something. Returns whether it went in — a full bag is the one way this
   * can fail, and the caller has to know, because a pickup that reports success
   * and then vanishes is worse than one you cannot carry.
   *
   * Something that does not stack takes a slot per copy, and something unknown
   * is refused outright rather than filed under a name nothing can draw.
   */
  add(id, n = 1) {
    const item = itemOf(id);
    if (!item) return false;
    const already = this.held.has(id);
    if (!already && this.held.size >= SLOTS) return false;
    if (already && item.stacks === false) return false;

    this.held.set(id, this.count(id) + n);
    this.changed();
    this.announce(id);
    return true;
  }

  /** Put something down, or use it up. */
  remove(id, n = 1) {
    const left = this.count(id) - n;
    if (left < 0) return false;
    if (left === 0) this.held.delete(id);
    else this.held.set(id, left);
    // Keep the read-out pointing at something that still exists.
    this.selected = Math.min(this.selected, Math.max(0, this.held.size - 1));
    this.changed();
    return true;
  }

  get full() {
    return this.held.size >= SLOTS;
  }

  changed() {
    this.render();
    this.onChange?.();
  }

  /* --------------------------------------------------------------- the UI */

  buildSlots() {
    this.el.grid.innerHTML = Array.from({ length: SLOTS }, (_, i) => `
      <div class="inv-slot" data-i="${i}">
        <img alt="" hidden>
        <span class="inv-count"></span>
      </div>`).join('');
    // Hovering reads a slot rather than clicking it: there is nothing to *do*
    // with an item yet, and a click that selects but does not act is a promise
    // the game has not made.
    for (const slot of this.el.grid.children) {
      slot.addEventListener('pointerenter', () => {
        this.selected = +slot.dataset.i;
        this.render();
      });
    }
  }

  render() {
    const held = this.list();
    [...this.el.grid.children].forEach((slot, i) => {
      const entry = held[i];
      const img = slot.querySelector('img');
      const count = slot.querySelector('.inv-count');
      slot.dataset.full = String(!!entry);
      slot.dataset.sel = String(!!entry && i === this.selected);
      if (!entry) {
        img.hidden = true;
        count.textContent = '';
        return;
      }
      const [id, n] = entry;
      const item = itemOf(id);
      // add() refuses an id the catalogue has never heard of, so this cannot
      // happen through the front door — but itemOf promises that an unknown id
      // is not a crash, and a drawer that throws while drawing itself would take
      // the whole frame loop with it. An id with nothing behind it draws as an
      // empty slot and the game carries on.
      if (!item) {
        img.hidden = true;
        count.textContent = '';
        slot.dataset.full = 'false';
        return;
      }
      // Only redrawn when the slot changes hands, because building a data URL
      // is not free and this runs on every pick-up and every hover.
      if (img.dataset.id !== id) {
        img.src = bitmapDataUrl(item.art);
        img.dataset.id = id;
        img.alt = item.name;
      }
      img.hidden = false;
      count.textContent = n > 1 ? `×${n}` : '';
    });

    const entry = held[this.selected];
    if (entry && !itemOf(entry[0])) {
      this.el.read.innerHTML = `<div class="inv-empty">Nothing in that one.</div>`;
      return;
    }
    if (!entry) {
      this.el.read.innerHTML = held.length
        ? `<div class="inv-empty">Nothing in that one.</div>`
        : `<div class="inv-empty">You are carrying nothing at all.</div>`;
      return;
    }
    const item = itemOf(entry[0]);
    this.el.read.innerHTML = `<div class="inv-name">${item.name}</div>`
      + `<div class="inv-note">${item.note}</div>`;
  }

  /** A moment's notice that something arrived, wherever you were looking. */
  announce(id) {
    const item = itemOf(id);
    const el = this.el.toast;
    el.innerHTML = `<img src="${bitmapDataUrl(item.art)}" alt=""><span>Got <b>${item.name}</b></span>`;
    el.hidden = false;
    // Restart the animation even if one is already running, so two things
    // picked up quickly both register instead of the second arriving silently.
    el.classList.remove('inv-in');
    void el.offsetWidth;
    el.classList.add('inv-in');
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => { el.hidden = true; }, TOAST);
  }

  /* ------------------------------------------------- the rest of the tool */

  available() {
    return true;
  }

  typing() {
    return false;
  }

  onOpen() {
    this.render();
  }

  onClose() {}
}
