import { PALETTE, HERO, VILLAGERS } from './art.js';
import { TOUCH } from './touch.js';

/*
  The title screen: a Game Boy title card, drawn the way the game draws
  everything else — pixels first, scaled up hard.

  The whole card is composed into one low-resolution canvas — 144 rows, the
  GB's screen height, as many columns as the window's shape needs — and blown
  up to fill the window with image-rendering: pixelated, so every element
  shares one pixel grid and nothing can be accidentally crisp. The logo
  is not a font file: the text is rendered small, thresholded into a bitmap,
  and then inked in the three flat tones of the old cartridge logos — fill,
  hard outline, and a drop shadow of the whole silhouette.

  It sits over the game as a DOM overlay rather than living in the scene, so
  the island can finish loading and lighting itself behind the card, and
  dismissing it is nothing but removing a div — the game underneath was
  running the whole time.
*/

// The card fills the window edge to edge, like the game behind it. The layout
// is authored on the GB's 160x144 grid, and the canvas takes whatever extra
// the window's shape needs — more columns on a wide monitor, more rows on a
// portrait phone — with the authored block centred in it. Nothing is
// letterboxed, nothing is stretched, and the logo always fits: a phone held
// upright is narrower than the logo, so it is the grid that grows, not the
// letters that shrink.
const GRID_W = 160;
const GRID_H = 144;

// the cartridge palette: cream letters, navy ink, a lavender shadow
const INK = {
  fill: '#f8e070',
  outline: '#333066',
  shadow: '#9a94cc',
  text: '#181818',
  paper: '#f8f8f8',
};

/**
 * Render `text` into a 1-bit mask on the card's pixel grid. Drawn 4x and
 * downsampled by coverage, because text drawn small is antialiased into grey
 * mush — thresholding the big render is what gets back hard pixel edges.
 * @returns {{ w: number, h: number, at: (x: number, y: number) => boolean }}
 */
function textMask(text, px, font = '"Arial Black", "Arial Bold", sans-serif') {
  const S = 4;
  const c = document.createElement('canvas');
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.font = `bold ${px * S}px ${font}`;
  const w = Math.ceil(ctx.measureText(text).width / S) + 2;
  const h = Math.ceil(px * 1.35);
  c.width = w * S;
  c.height = h * S;
  ctx.font = `bold ${px * S}px ${font}`;
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#000';
  ctx.fillText(text, S, S);
  const data = ctx.getImageData(0, 0, c.width, c.height).data;

  const mask = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let hit = 0;
      for (let sy = 0; sy < S; sy++) {
        for (let sx = 0; sx < S; sx++) {
          hit += data[((y * S + sy) * c.width + (x * S + sx)) * 4 + 3] > 128 ? 1 : 0;
        }
      }
      mask[y * w + x] = hit >= (S * S) / 2 ? 1 : 0;
    }
  }
  // trim to the inked pixels so callers can centre on what is actually there
  let x0 = w, x1 = 0, y0 = h, y1 = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!mask[y * w + x]) continue;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  }
  if (x1 < x0) { x0 = y0 = 0; x1 = y1 = -1; }
  return {
    w: x1 - x0 + 1,
    h: y1 - y0 + 1,
    at: (x, y) => x >= 0 && y >= 0 && x <= x1 - x0 && y <= y1 - y0
      && !!mask[(y + y0) * w + (x + x0)],
  };
}

/** The largest font size at which `text` fits the card with room to breathe. */
function fitText(text, maxW, px) {
  let m = textMask(text, px);
  while (m.w > maxW && px > 6) m = textMask(text, --px);
  return m;
}

/**
 * Ink a mask onto the card in the cartridge style: fill, a one-pixel outline
 * around it, and the outlined silhouette dropped again as a flat shadow.
 */
function stampLogo(ctx, mask, ox, oy) {
  const sil = (x, y) => {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (mask.at(x + dx, y + dy)) return true;
      }
    }
    return false;
  };
  // shadow first, so the letters sit on top of it
  ctx.fillStyle = INK.shadow;
  for (let y = -1; y <= mask.h + 3; y++) {
    for (let x = -1; x <= mask.w + 1; x++) {
      if (sil(x + 1, y - 2)) ctx.fillRect(ox + x, oy + y, 1, 1);
    }
  }
  for (let y = -1; y <= mask.h + 1; y++) {
    for (let x = -1; x <= mask.w + 1; x++) {
      if (mask.at(x, y)) ctx.fillStyle = INK.fill;
      else if (sil(x, y)) ctx.fillStyle = INK.outline;
      else continue;
      ctx.fillRect(ox + x, oy + y, 1, 1);
    }
  }
}

/** Ink a mask flat, one colour — the small print. */
function stampText(ctx, mask, ox, oy, color) {
  ctx.fillStyle = color;
  for (let y = 0; y < mask.h; y++) {
    for (let x = 0; x < mask.w; x++) {
      if (mask.at(x, y)) ctx.fillRect(ox + x, oy + y, 1, 1);
    }
  }
}

/** Draw one 16x16 character bitmap at `scale` pixels per pixel. */
function stampSprite(ctx, rows, ox, oy, scale) {
  for (let y = 0; y < rows.length; y++) {
    for (let x = 0; x < rows[y].length; x++) {
      const color = PALETTE[rows[y][x]];
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect(ox + x * scale, oy + y * scale, scale, scale);
    }
  }
}

const START_KEYS = new Set(['Space', 'Enter', 'KeyZ']);

export class Title {
  constructor() {
    this.active = true;
    this.onStart = null;

    this.root = document.createElement('div');
    Object.assign(this.root.style, {
      position: 'fixed', inset: '0', zIndex: '1000',
      background: '#0d1426',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      transition: 'opacity 0.45s ease',
    });

    this.canvas = document.createElement('canvas');
    Object.assign(this.canvas.style, {
      imageRendering: 'pixelated', width: '100%', height: '100%',
    });
    this.root.appendChild(this.canvas);
    document.body.appendChild(this.root);

    this.ctx = this.canvas.getContext('2d');

    // The logo and the small print never change, so they are inked once here;
    // the animation loop only repaints the strip the characters walk in.
    this.masks = {
      line1: fitText('CHASING', 118, 26),
      line2: fitText('AMY', 92, 32),
      press: fitText(TOUCH ? 'TAP TO START' : 'PRESS SPACE', 72, 9),
      legal: fitText("©'26 Cody Miles", 118, 9),
    };

    // Phones have no spacebar; a tap is the same request.
    this.root.addEventListener('pointerdown', () => this.dismiss());

    /*
      The card listens for its own start key rather than waiting for the game's
      input handler: that handler is not wired up until the relay handshake has
      finished, and a press during that first second must not fall on the
      floor. Registered before the game's listener, so while the card is up it
      speaks first — and stops the event there, or the same press would carry
      on into the handler behind it and be spent twice.
    */
    this._onKey = (e) => {
      if (!this.active) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      if (START_KEYS.has(e.code)) this.dismiss();
    };
    addEventListener('keydown', this._onKey);

    const fit = () => {
      const aspect = innerWidth / Math.max(1, innerHeight);
      this.canvas.width = Math.round(Math.max(GRID_W, GRID_H * aspect));
      this.canvas.height = Math.round(Math.max(GRID_H, GRID_W / aspect));
    };
    this._fit = fit;
    addEventListener('resize', fit);
    fit();

    const loop = (now) => {
      if (!this.root.isConnected) return;
      this.draw(now / 1000);
      this._raf = requestAnimationFrame(loop);
    };
    this._raf = requestAnimationFrame(loop);
  }

  /** A press forwarded from the game's input handler. True if it was ours. */
  key(code) {
    if (!this.active) return false;
    if (START_KEYS.has(code)) this.dismiss();
    return true;   // the card swallows everything: nobody walks behind it
  }

  draw(t) {
    const { ctx, masks } = this;
    const { width: W, height: canvasH } = this.canvas;
    const cx = W >> 1;
    const oy = (canvasH - GRID_H) >> 1;   // centre the authored block vertically
    ctx.fillStyle = INK.paper;
    ctx.fillRect(0, 0, W, canvasH);

    stampLogo(ctx, masks.line1, cx - (masks.line1.w >> 1), oy + 6);
    stampLogo(ctx, masks.line2, cx - (masks.line2.w >> 1), oy + 10 + masks.line1.h);

    /*
      The pair of them, in the space the cartridge kept for the trainer and his
      starter: the hero and Amy side by side, looking straight out of the card
      at whoever is holding the controller. The walk frames still swap on the
      GB cadence, so they idle on the spot rather than stand frozen.
    */
    const frame = Math.floor(t / 0.28) % 2;
    stampSprite(ctx, HERO.down[frame], cx - 34, oy + 78, 2);
    stampSprite(ctx, VILLAGERS.amy.down[frame], cx + 2, oy + 78, 2);

    if (Math.floor(t / 0.55) % 2 === 0) {
      stampText(ctx, masks.press, cx - (masks.press.w >> 1), oy + 121, INK.text);
    }
    stampText(ctx, masks.legal, cx - (masks.legal.w >> 1), oy + 134, INK.text);
  }

  dismiss() {
    if (!this.active) return;
    this.active = false;
    cancelAnimationFrame(this._raf);
    removeEventListener('resize', this._fit);
    removeEventListener('keydown', this._onKey);
    // Start the game under the card and let the card melt off it: the hero's
    // arrival is already playing as the white fades away.
    this.onStart?.();
    this.root.style.opacity = '0';
    setTimeout(() => this.root.remove(), 500);
  }
}
