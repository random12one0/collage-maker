/**
 * collageRenderer.js
 * ------------------
 * Handles all canvas-based collage rendering.
 * Exports a single CollagRenderer class that accepts a settings object
 * and draws onto a provided <canvas> element.
 *
 * Settings schema (all keys optional — defaults shown):
 * {
 *   canvasWidth:   1080,
 *   canvasHeight:  1350,
 *   gap:           20,          // px between the two tiles
 *   margin:        40,          // px margin from canvas edges
 *   hAlign:        'center',    // 'left' | 'center' | 'right'
 *   cornerRadius:  16,          // px corner radius on tiles
 *   shadow: {
 *     enabled:     true,
 *     blur:        24,
 *     opacity:     0.6,         // 0–1
 *     color:       '#000000',
 *     offsetX:     0,
 *     offsetY:     4
 *   },
 *   background: {
 *     source:      'image1',    // 'image1' | 'image2' | 'color' | 'none'
 *     blur:        20,          // px
 *     darken:      0.30,        // 0–1
 *     color:       '#1a1a2e'
 *   }
 * }
 */

/* ── Constants ─────────────────────────────────────────────── */

/** Default canvas width in pixels */
const DEFAULT_CANVAS_WIDTH = 1080;
/** Default canvas height in pixels */
const DEFAULT_CANVAS_HEIGHT = 1350;
/** Default gap between the two image tiles (px) */
const DEFAULT_GAP = 20;
/** Default margin from canvas edges (px) */
const DEFAULT_MARGIN = 40;
/** Default tile corner radius (px) */
const DEFAULT_CORNER_RADIUS = 16;
/** Default background blur amount (px) */
const DEFAULT_BG_BLUR = 20;
/** Default background darkening overlay opacity (0-1) */
const DEFAULT_BG_DARKEN = 0.30;
/** Default shadow blur radius (px) */
const DEFAULT_SHADOW_BLUR = 24;
/** Default shadow opacity (0-1) */
const DEFAULT_SHADOW_OPACITY = 0.60;
/** Default shadow vertical offset (px) */
const DEFAULT_SHADOW_OFFSET_Y = 4;

/* ── CollagRenderer ─────────────────────────────────────────── */

class CollagRenderer {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {object} settings
   */
  constructor(canvas, settings = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.settings = settings;
    this._image1 = null;
    this._image2 = null;
  }

  /** Load an Image element from a src URL. Returns a Promise<HTMLImageElement>. */
  static loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = src;
    });
  }

  /**
   * Set the two source images.
   * @param {HTMLImageElement|null} img1
   * @param {HTMLImageElement|null} img2
   */
  setImages(img1, img2) {
    this._image1 = img1;
    this._image2 = img2;
  }

  /** Update settings and re-render. */
  updateSettings(settings) {
    this.settings = settings;
  }

  /**
   * Render the collage onto the canvas.
   * Returns a Promise that resolves when drawing is complete.
   */
  async render() {
    if (!this._image1 || !this._image2) return;

    const s = this._mergeDefaults(this.settings);
    const { ctx, canvas } = this;

    // Resize canvas
    canvas.width  = s.canvasWidth;
    canvas.height = s.canvasHeight;

    // ── Draw background ─────────────────────────────────────
    await this._drawBackground(s);

    // ── Compute tile positions ───────────────────────────────
    const tiles = this._computeTiles(s);

    // ── Draw tiles ───────────────────────────────────────────
    for (const tile of tiles) {
      this._drawTile(tile, s);
    }
  }

  /* ── Private helpers ───────────────────────────────────────── */

  _mergeDefaults(s) {
    return {
      canvasWidth:  s.canvasWidth  ?? DEFAULT_CANVAS_WIDTH,
      canvasHeight: s.canvasHeight ?? DEFAULT_CANVAS_HEIGHT,
      gap:          s.gap          ?? DEFAULT_GAP,
      margin:       s.margin       ?? DEFAULT_MARGIN,
      hAlign:       s.hAlign       ?? 'center',
      cornerRadius: s.cornerRadius ?? DEFAULT_CORNER_RADIUS,
      shadow: {
        enabled: s.shadow?.enabled  ?? true,
        blur:    s.shadow?.blur     ?? DEFAULT_SHADOW_BLUR,
        opacity: s.shadow?.opacity  ?? DEFAULT_SHADOW_OPACITY,
        color:   s.shadow?.color    ?? '#000000',
        offsetX: s.shadow?.offsetX  ?? 0,
        offsetY: s.shadow?.offsetY  ?? DEFAULT_SHADOW_OFFSET_Y,
      },
      background: {
        source: s.background?.source ?? 'image1',
        blur:   s.background?.blur   ?? DEFAULT_BG_BLUR,
        darken: s.background?.darken ?? DEFAULT_BG_DARKEN,
        color:  s.background?.color  ?? '#1a1a2e',
      },
    };
  }

  async _drawBackground(s) {
    const { ctx, canvas } = this;
    const { source, blur, darken, color } = s.background;

    if (source === 'none') {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }

    if (source === 'color') {
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      return;
    }

    const bgImage = source === 'image2' ? this._image2 : this._image1;
    if (!bgImage) {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      return;
    }

    // Draw blurred bg using an offscreen canvas for the blur
    const blurCanvas = document.createElement('canvas');
    blurCanvas.width  = canvas.width;
    blurCanvas.height = canvas.height;
    const bCtx = blurCanvas.getContext('2d');

    // Cover-fit the background image
    const { sx, sy, sw, sh } = this._coverFit(
      bgImage.naturalWidth, bgImage.naturalHeight,
      canvas.width, canvas.height
    );
    bCtx.filter = blur > 0 ? `blur(${blur}px)` : 'none';
    // Draw slightly oversized to avoid blur edge artefacts
    const pad = blur * 2;
    bCtx.drawImage(bgImage, sx, sy, sw, sh, -pad, -pad, canvas.width + pad * 2, canvas.height + pad * 2);
    bCtx.filter = 'none';

    ctx.drawImage(blurCanvas, 0, 0);

    // Darkening overlay
    if (darken > 0) {
      ctx.fillStyle = `rgba(0,0,0,${darken})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  }

  _computeTiles(s) {
    const { canvasWidth: W, canvasHeight: H, gap, margin, hAlign } = s;

    const tileW = W - margin * 2;
    const totalTileH = H - margin * 2 - gap;
    const tileH = Math.floor(totalTileH / 2);

    // Horizontal position
    let x;
    if (hAlign === 'left')   x = margin;
    else if (hAlign === 'right') x = W - margin - tileW;
    else                     x = margin; // center (tileW fills gap)

    return [
      { img: this._image1, x, y: margin,                w: tileW, h: tileH },
      { img: this._image2, x, y: margin + tileH + gap,  w: tileW, h: tileH },
    ];
  }

  _drawTile(tile, s) {
    const { ctx } = this;
    const { x, y, w, h, img } = tile;
    const r = Math.min(s.cornerRadius, w / 2, h / 2);

    // Shadow
    if (s.shadow.enabled) {
      const { blur, opacity, color, offsetX, offsetY } = s.shadow;
      const hexColor = this._hexToRgb(color);
      ctx.shadowColor   = `rgba(${hexColor},${opacity})`;
      ctx.shadowBlur    = blur;
      ctx.shadowOffsetX = offsetX;
      ctx.shadowOffsetY = offsetY;
    }

    // Clip region (rounded rect)
    ctx.save();
    this._roundedRect(ctx, x, y, w, h, r);
    ctx.clip();

    // Clear shadow inside clip so image doesn't get shadowed from inside
    ctx.shadowColor   = 'transparent';
    ctx.shadowBlur    = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    // Draw image (cover-fit within tile)
    const { sx, sy, sw, sh } = this._coverFit(
      img.naturalWidth, img.naturalHeight, w, h
    );
    ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);

    ctx.restore();

    // Reset shadow for next draw
    ctx.shadowColor   = 'transparent';
    ctx.shadowBlur    = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
  }

  /**
   * Build a rounded-rectangle path.
   */
  _roundedRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  /**
   * Compute cover-fit source rect: given naturalW/H of an image and
   * destination dw/dh, returns { sx, sy, sw, sh } for drawImage.
   */
  _coverFit(natW, natH, dw, dh) {
    const srcAspect = natW / natH;
    const dstAspect = dw / dh;
    let sw, sh, sx, sy;
    if (srcAspect > dstAspect) {
      // wider than destination — crop sides
      sh = natH;
      sw = natH * dstAspect;
      sx = (natW - sw) / 2;
      sy = 0;
    } else {
      // taller than destination — crop top/bottom
      sw = natW;
      sh = natW / dstAspect;
      sx = 0;
      sy = (natH - sh) / 2;
    }
    return { sx, sy, sw, sh };
  }

  /**
   * Convert a CSS hex colour string (#rrggbb or #rgb) to "r,g,b" string.
   */
  _hexToRgb(hex) {
    hex = hex.replace('#', '');
    if (hex.length === 3) {
      hex = hex.split('').map(c => c + c).join('');
    }
    const n = parseInt(hex, 16);
    return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
  }

  /**
   * Export the canvas as a Blob.
   * @param {string} mimeType  e.g. 'image/jpeg'
   * @param {number} quality   0–1
   * @returns {Promise<Blob>}
   */
  toBlob(mimeType = 'image/jpeg', quality = 0.9) {
    return new Promise((resolve, reject) => {
      this.canvas.toBlob(
        blob => blob ? resolve(blob) : reject(new Error('Export failed')),
        mimeType,
        quality
      );
    });
  }
}
