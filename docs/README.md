# Collage Maker — Documentation

## Table of Contents
1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [Feature List](#feature-list)
4. [Architecture](#architecture)
5. [Template System](#template-system)
6. [Configuration & Defaults](#configuration--defaults)
7. [Accessibility](#accessibility)
8. [Browser Compatibility](#browser-compatibility)
9. [Project Structure](#project-structure)
10. [Progress & Changelog](#progress--changelog)

---

## Overview

**Collage Maker** is a fully client-side, browser-based web application that lets users create customisable two-image collages. No server, no account, no data leaves the user's device.

Users upload two images (drag-and-drop or file browser), tune dozens of visual parameters in real time, save reusable "templates", and download the finished collage as a PNG or JPEG.

---

## Quick Start

1. Open `index.html` in any modern browser (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+).
2. Drop two images onto the **global drop zone** at the top, or use the individual **Image 1 / Image 2** upload cards.
3. Watch the live preview update automatically.
4. Adjust settings in the **Customize** panel on the right (or bottom on mobile).
5. Click **Download Collage** to save the result.

> No build step, no npm install, no server required.

---

## Feature List

### Image Upload
- Global drag-and-drop zone accepting up to two images at once.
- Individual per-slot upload buttons with their own file inputs.
- Per-slot drag-and-drop.
- Clear buttons to remove individual images.
- **Swap** button to exchange image 1 and image 2.
- Supports JPG, PNG, WebP.
- Error messages for unsupported file types.

### Collage Rendering
- All rendering happens on an HTML5 `<canvas>` element.
- Cover-fit crop: images fill their tile while maintaining aspect ratio.
- Rounded-corner tiles using canvas clipping paths.
- Configurable drop shadow / glow (blur, opacity, colour, X/Y offset).
- Blurred, optionally darkened background from one of the uploaded images.
- Solid colour or transparent background option.

### Customisation Controls
| Group | Controls |
|---|---|
| Canvas & Layout | Preset sizes, custom W×H, edge margin, gap between tiles, horizontal alignment |
| Tile Styling | Corner radius, shadow toggle, shadow blur, shadow opacity, shadow colour, shadow X/Y offset |
| Background | Source (image 1 / image 2 / colour / none), blur amount, darken overlay, colour picker |
| Export | Format (PNG/JPEG), quality selector, Download button |

### Template System
- Save any configuration with a custom name.
- Templates persist across sessions via `localStorage`.
- Apply, rename, or delete saved templates.
- Built-in **Default two-image collage** template (always present, cannot be deleted).
- Reset to defaults with a single button.

### UX
- Real-time (debounced) preview updates on every control change.
- Toast notifications for all user actions (save, apply, delete, download, errors).
- Loading/progress indicators during render and export.
- Fully responsive — two-column desktop, single-column mobile.
- Keyboard-accessible controls and ARIA labels throughout.

---

## Architecture

See [`architecture.md`](architecture.md) for a detailed breakdown.

**High-level:**

```
index.html
├── css/styles.css         — Design tokens + all component styles
└── js/
    ├── collageRenderer.js — Canvas drawing engine (pure class, no DOM deps)
    ├── templateManager.js — localStorage CRUD for templates
    └── app.js             — Controller: wires DOM ↔ renderer ↔ templateManager
```

---

## Template System

See [`template-schema.md`](template-schema.md) for the full JSON schema.

Templates are stored in `localStorage` under the key `collageMaker_templates` as a JSON array. The built-in default template is never written to storage — it is always re-added at runtime.

---

## Configuration & Defaults

All default values are defined as named constants at the top of `js/collageRenderer.js`:

| Constant | Default | Description |
|---|---|---|
| `DEFAULT_CANVAS_WIDTH` | `1080` | Canvas pixel width |
| `DEFAULT_CANVAS_HEIGHT` | `1350` | Canvas pixel height |
| `DEFAULT_GAP` | `20` | Gap between tiles (px) |
| `DEFAULT_MARGIN` | `40` | Edge margin (px) |
| `DEFAULT_CORNER_RADIUS` | `16` | Tile corner radius (px) |
| `DEFAULT_BG_BLUR` | `20` | Background blur (px) |
| `DEFAULT_BG_DARKEN` | `0.30` | Background darkening overlay (0–1) |
| `DEFAULT_SHADOW_BLUR` | `24` | Shadow blur radius (px) |
| `DEFAULT_SHADOW_OPACITY` | `0.60` | Shadow opacity (0–1) |
| `DEFAULT_SHADOW_OFFSET_Y` | `4` | Shadow vertical offset (px) |

To change any default, edit the corresponding constant in `js/collageRenderer.js` and update the default template object in `js/templateManager.js` to match.

---

## Accessibility

- Semantic HTML: `<header>`, `<main>`, `<footer>`, `<section>`, `<fieldset>`, `<legend>`, `<label>`.
- All interactive elements have visible labels (`aria-label` or `<label for="…">`).
- Drag-and-drop zones are also keyboard-operable (Enter/Space to open file picker).
- Alignment toggle buttons use `aria-pressed` state.
- Live regions (`aria-live="polite"`) for preview status and toast notifications.
- Focus-visible ring on all interactive elements (`:focus-visible`).
- Colour contrast: dark theme with ≥4.5:1 contrast ratio for body text against background.

---

## Browser Compatibility

| Browser | Minimum version |
|---|---|
| Chrome / Edge | 90+ |
| Firefox | 88+ |
| Safari | 14+ |

Requires: `<canvas>`, `FileReader`, `Blob`, `URL.createObjectURL`, CSS custom properties, CSS Grid, `filter: blur()`.

---

## Project Structure

```
collage-maker/
├── index.html                 Main application HTML
├── css/
│   └── styles.css             All styles (design tokens, components, layout, responsive)
├── js/
│   ├── collageRenderer.js     Canvas rendering engine
│   ├── templateManager.js     Template CRUD + localStorage persistence
│   └── app.js                 Application controller
├── docs/
│   ├── README.md              This file — overview and usage
│   ├── architecture.md        Detailed technical architecture
│   └── template-schema.md     Template JSON schema reference
└── README.md                  Repository readme
```

---

## Progress & Changelog

### v1.0.0 — Initial release
- Complete two-image collage creator.
- Drag-and-drop uploads (global and per-slot).
- Live preview with debounced updates.
- Full customisation panel (canvas, tiles, background).
- Template system with localStorage persistence.
- Built-in default template.
- PNG and JPEG export.
- Responsive design (desktop + mobile).
- Keyboard accessibility and ARIA attributes.
- Toast notification system.
