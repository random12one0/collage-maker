# Collage Maker

A production-quality, fully client-side web app for creating customisable two-image collages.

## Quick Start

Open `index.html` in any modern browser — no build step required.

## Features

- Drag-and-drop or click-to-browse image upload (JPG, PNG, WebP)
- Live collage preview with rounded corners, drop shadows, and blurred backgrounds
- Full customisation: canvas size, gap, margins, corner radius, shadow, background
- Template system with localStorage persistence
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
├── css/styles.css
├── js/
│   ├── collageRenderer.js
│   ├── templateManager.js
│   └── app.js
└── docs/
    ├── README.md
    ├── architecture.md
    └── template-schema.md
```
