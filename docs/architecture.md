# Architecture — Collage Maker

## Overview

Collage Maker is a **single-page application** (SPA) built with plain HTML, CSS, and JavaScript — no framework, no build tools, no server required. The entire app is served from `index.html` and runs entirely in the user's browser.

---

## Module Responsibilities

### `index.html`
The application shell. Contains:
- Semantic HTML structure (header, main, footer).
- All DOM elements referenced by `app.js`.
- Script tags that load the three JS modules in dependency order:
  1. `collageRenderer.js` (no deps)
  2. `templateManager.js` (no deps)
  3. `app.js` (depends on both above)

### `css/styles.css`
A single, self-contained stylesheet. Structure:
1. **Reset & base** — `box-sizing`, font, body.
2. **Design tokens** — CSS custom properties (`--color-*`, `--space-*`, `--radius-*`, `--shadow-*`) defined on `:root`.
3. **Typography** — heading scales.
4. **Component styles** — header, panels, drop zone, image slots, canvas preview, form elements, buttons, templates, toasts, spinner, footer.
5. **Responsive overrides** — `@media (max-width: 900px)` and `@media (max-width: 600px)`.

### `js/collageRenderer.js`
The **canvas drawing engine**. Exposes one class: `CollagRenderer`.

```
CollagRenderer
├── constructor(canvas, settings)
├── static loadImage(src) → Promise<HTMLImageElement>
├── setImages(img1, img2)
├── updateSettings(settings)
├── render() → Promise<void>
├── toBlob(mimeType, quality) → Promise<Blob>
└── private helpers:
    ├── _mergeDefaults(s) — fills in defaults for any missing setting
    ├── _drawBackground(s) — blurred/darkened/solid/transparent bg
    ├── _computeTiles(s)   — calculates x/y/w/h for each tile
    ├── _drawTile(tile, s) — clips, shadows, draws one image tile
    ├── _roundedRect(ctx, x, y, w, h, r) — rounded rect path helper
    ├── _coverFit(natW, natH, dw, dh) — cover-fit source rect calculation
    └── _hexToRgb(hex) — hex to "r,g,b" for rgba() strings
```

**Key design decisions:**
- All drawing is synchronous except the background (which uses an offscreen canvas to apply CSS `filter: blur()`).
- Shadow is applied via canvas `shadowColor/shadowBlur/shadowOffsetX/shadowOffsetY` **before** the tile clip, then reset inside the clip so the image itself is not shadowed from the inside.
- Background blur uses a separate offscreen canvas drawn oversized (padded by `blur * 2`) to avoid visible edge artefacts from the CSS blur filter.

### `js/templateManager.js`
The **persistence layer**. Exposes one class: `TemplateManager`.

```
TemplateManager
├── constructor()        — loads from localStorage on creation
├── getAll()             — returns all templates (default + user)
├── getById(id)          — lookup by id
├── save(name, settings) — persist a new user template
├── rename(id, newName)  — update template name
├── delete(id)           — remove a user template
└── private:
    ├── _load()          — reads localStorage, merges with built-in default
    ├── _persist()       — writes user templates to localStorage
    └── _uid()           — generates a unique id string
```

**Storage strategy:**
- User templates are stored in `localStorage['collageMaker_templates']` as a JSON array.
- The built-in default template is **never** written to storage — it is always injected at the front of the list at runtime. This ensures the default is always present even if storage is cleared.
- If `localStorage` is unavailable (e.g., private browsing restrictions), the app degrades gracefully with in-memory templates only.

### `js/app.js`
The **application controller**. Responsibilities:
- Holds application state (`state` object: two `HTMLImageElement` refs, data URLs, active template id, rendering flag).
- Exposes `readSettings()` to snapshot the current UI into a settings object.
- Exposes `applySettings(s)` to update all UI controls from a settings object.
- Wires all DOM event listeners:
  - Drag-and-drop (global drop zone + per-slot)
  - File input `change` events
  - Swap and clear buttons
  - All range sliders (with live badge updates)
  - Canvas preset + custom size inputs
  - Shadow toggle
  - Background source select
  - Alignment button group
  - Download button
  - Template save/apply/rename/delete
  - Reset to defaults
- Implements `scheduleRender()` — a debounced (150 ms) async function that calls `renderer.render()` and updates the preview state.
- Implements `showToast()` utility for non-blocking user feedback.
- Implements `renderTemplateList()` to rebuild the template list DOM on every change.

---

## Data Flow

```
User action (drag/click/slider)
        │
        ▼
app.js event handler
        │
        ├─── updates DOM controls (if needed)
        │
        ▼
scheduleRender() [debounced 150ms]
        │
        ▼
readSettings() → settings object
        │
        ▼
renderer.updateSettings(settings)
renderer.render()
        │
        ├─── _drawBackground() — blurred bg on offscreen canvas → main canvas
        ├─── _computeTiles()  — geometry calculations
        └─── _drawTile() × 2 — shadow + clip + cover-fit image
        │
        ▼
canvas visible, download button enabled
```

---

## Rendering Pipeline Detail

```
render()
 └─ _drawBackground()
     ├─ source === 'none'    → clearRect
     ├─ source === 'color'   → fillRect with hex colour
     └─ source === 'image*'  → offscreen canvas with filter:blur
         ├─ cover-fit source image to canvas size
         ├─ draw padded (+blur*2 on each side) to hide blur edges
         └─ draw darkening overlay (rgba black at darken opacity)
 └─ _computeTiles()
     ├─ tileW  = canvasWidth − margin*2
     ├─ tileH  = floor((canvasHeight − margin*2 − gap) / 2)
     ├─ tile1: { x: margin, y: margin }
     └─ tile2: { x: margin, y: margin + tileH + gap }
 └─ _drawTile() × 2
     ├─ Set ctx shadow (blur, opacity, colour, offsets)
     ├─ Build rounded-rect clip path
     ├─ ctx.clip()
     ├─ Reset shadow (inside clip)
     └─ drawImage with cover-fit source rect
```

---

## Responsive Layout

```
Desktop (> 900px):
┌─────────────────────────────────────────────────────┐
│  Header                                             │
├─────────────────────────────┬───────────────────────┤
│  Left column                │  Right column         │
│  ┌─────────────────────┐    │  ┌─────────────────┐  │
│  │  Upload panel       │    │  │  Controls panel  │  │
│  │  (drop zone +       │    │  │  (canvas, tiles, │  │
│  │   image slots)      │    │  │   background)    │  │
│  └─────────────────────┘    │  └─────────────────┘  │
│  ┌─────────────────────┐    │  ┌─────────────────┐  │
│  │  Preview + export   │    │  │  Templates panel │  │
│  └─────────────────────┘    │  └─────────────────┘  │
├─────────────────────────────┴───────────────────────┤
│  Footer                                             │
└─────────────────────────────────────────────────────┘

Mobile (≤ 900px):
┌─────────────────────┐
│  Header             │
├─────────────────────┤
│  Controls panel     │  ← stacked first (order: -1)
├─────────────────────┤
│  Templates panel    │
├─────────────────────┤
│  Upload panel       │
├─────────────────────┤
│  Preview + export   │
├─────────────────────┤
│  Footer             │
└─────────────────────┘
```

---

## Security Notes

- No network requests are made by the application.
- Images are read via `FileReader` and stored only in memory (as `HTMLImageElement` objects and data URLs).
- `localStorage` stores only text (JSON-serialised settings) — no images are persisted.
- User-provided template names are HTML-escaped before insertion into the DOM (`escHtml()` in `app.js`).
- The `prompt()` / `confirm()` browser dialogs used for rename and delete are acceptable given the single-user, no-server nature of the app.
