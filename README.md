# Collage Maker

A production-quality, fully client-side web app for creating customizable collages.

## Quick Start

Open `index.html` in any modern browser — no build step required.

## Features

- Drag-and-drop or click-to-browse image upload (JPG, PNG, WebP)
- Live collage preview with rounded corners, drop shadows, and blurred backgrounds
- Full customisation: canvas size, gap, margins, corner radius, shadow, background
- Template system with localStorage persistence
- Batch pair processing tab (process many 2-image collages in one run)
- Custom Collage Studio with advanced multi-image layouts (2-9 images)
- Project system (save/load/delete), autosave restore, and shareable state links
- Undo/redo history workflow
- Per-image transforms: zoom, pan, rotate, flip
- Reorder images and freeform tile frame editing
- Layout modes: grid, masonry, freeform
- Text overlays with style and position controls
- Before/after compare slider
- Background modes: solid, gradient, texture
- Filter stack: brightness, contrast, saturation, warmth
- Template JSON import/export and ZIP package export
- Output presets for social formats
- Built-in quality estimator and accessibility toggles
- Keyboard shortcuts + in-app shortcut help
- Installable/offline-ready web app (manifest + service worker)
- PNG / JPEG export

## Documentation

See the [`docs/`](docs/) folder for:

- [`docs/README.md`](docs/README.md) — Full feature documentation and usage guide
- [`docs/architecture.md`](docs/architecture.md) — Technical architecture and module breakdown
- [`docs/template-schema.md`](docs/template-schema.md) — Template JSON schema reference

## Project Structure

```
collage-maker/
├── index.html
├── custom.html
├── css/
│   ├── styles.css
│   └── custom.css
├── js/
│   ├── collageRenderer.js
│   ├── templateManager.js
│   ├── app.js
│   └── custom.js
├── manifest.webmanifest
├── sw.js
└── docs/
    ├── README.md
    ├── architecture.md
    └── template-schema.md
```
