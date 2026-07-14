# Template Schema Reference — Collage Maker

## Storage

Templates are stored in the browser's `localStorage` under the key:

```
collageMaker_templates
```

The value is a **JSON array** of template objects. Only **user-created** templates are written; the built-in default template is always re-created at runtime and never stored.

---

## Template Object Schema

```jsonc
{
  // Unique identifier string (format: "tpl_<base36-timestamp>_<random>")
  // Reserved value "__default__" is used for the built-in default template.
  "id": "tpl_lxq3abc_xyz12",

  // Display name shown in the template list (max 40 characters).
  "name": "My Instagram Portrait",

  // true only for the built-in default template; always false for user templates.
  "isDefault": false,

  // Unix timestamp (ms) when the template was created.
  "createdAt": 1720000000000,

  "settings": {

    // ── Canvas ─────────────────────────────────────────────────
    // Canvas output width in pixels.
    "canvasWidth": 1080,

    // Canvas output height in pixels.
    "canvasHeight": 1350,

    // ── Layout ─────────────────────────────────────────────────
    // Vertical gap between the two image tiles, in pixels.
    "gap": 20,

    // Margin from all canvas edges to the tile area, in pixels.
    "margin": 40,

    // Horizontal alignment of the tile column.
    // Accepted values: "left" | "center" | "right"
    "hAlign": "center",

    // ── Tile Styling ────────────────────────────────────────────
    // Corner radius applied to each tile, in pixels.
    "cornerRadius": 16,

    "shadow": {
      // Whether the drop shadow is enabled.
      "enabled": true,

      // Shadow blur radius in pixels (canvas shadowBlur).
      "blur": 24,

      // Shadow opacity as a decimal between 0 and 1.
      "opacity": 0.6,

      // Shadow colour as a CSS hex string (e.g. "#000000").
      "color": "#000000",

      // Horizontal shadow offset in pixels (canvas shadowOffsetX).
      "offsetX": 0,

      // Vertical shadow offset in pixels (canvas shadowOffsetY).
      "offsetY": 4
    },

    // ── Background ──────────────────────────────────────────────
    "background": {
      // Which image (or colour) to use as the canvas background.
      // Accepted values:
      //   "image1" — use the first uploaded image, blurred/darkened
      //   "image2" — use the second uploaded image, blurred/darkened
      //   "color"  — use a solid colour (see `color` field below)
      //   "none"   — transparent background (useful for PNG export)
      "source": "image1",

      // Amount of CSS blur applied to the background image, in pixels.
      // Only used when source is "image1" or "image2".
      "blur": 20,

      // Opacity of the black darkening overlay (0 = no darkening, 1 = fully black).
      // Only used when source is "image1" or "image2".
      "darken": 0.3,

      // Solid background colour as a CSS hex string.
      // Only used when source is "color".
      "color": "#1a1a2e"
    }
  }
}
```

---

## Default Template (built-in, never stored)

```json
{
  "id": "__default__",
  "name": "Default two-image collage",
  "isDefault": true,
  "createdAt": 0,
  "settings": {
    "canvasWidth": 1080,
    "canvasHeight": 1350,
    "gap": 20,
    "margin": 40,
    "hAlign": "center",
    "cornerRadius": 16,
    "shadow": {
      "enabled": true,
      "blur": 24,
      "opacity": 0.6,
      "color": "#000000",
      "offsetX": 0,
      "offsetY": 4
    },
    "background": {
      "source": "image1",
      "blur": 20,
      "darken": 0.3,
      "color": "#1a1a2e"
    }
  }
}
```

---

## Validation Notes

- `id` must be a non-empty string. Any template with `id === "__default__"` is skipped when loading from storage (the built-in default is always injected at runtime).
- `name` is trimmed and truncated to 40 characters on save.
- Numeric fields (`canvasWidth`, `canvasHeight`, `gap`, `margin`, `cornerRadius`, `shadow.blur`, `shadow.offsetX`, `shadow.offsetY`, `background.blur`) are in pixels and must be non-negative integers.
- `shadow.opacity` and `background.darken` are floats in the range `[0, 1]`.
- `shadow.color` and `background.color` must be valid CSS hex colour strings (`#rrggbb` or `#rgb`).
- `hAlign` must be one of `"left"`, `"center"`, `"right"`.
- `background.source` must be one of `"image1"`, `"image2"`, `"color"`, `"none"`.

---

## Example: Stored localStorage Value

```json
[
  {
    "id": "tpl_lxq3abc_xyz12",
    "name": "Dark landscape",
    "isDefault": false,
    "createdAt": 1720000000000,
    "settings": {
      "canvasWidth": 1920,
      "canvasHeight": 1080,
      "gap": 12,
      "margin": 32,
      "hAlign": "center",
      "cornerRadius": 10,
      "shadow": { "enabled": true, "blur": 32, "opacity": 0.75, "color": "#000000", "offsetX": 0, "offsetY": 6 },
      "background": { "source": "image2", "blur": 30, "darken": 0.45, "color": "#1a1a2e" }
    }
  }
]
```
