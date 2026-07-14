/**
 * templateManager.js
 * ------------------
 * Manages collage templates stored in localStorage.
 *
 * Template JSON schema:
 * {
 *   id:          string,        // UUID-like unique identifier
 *   name:        string,        // User-facing display name (max 40 chars)
 *   isDefault:   boolean,       // true for the built-in default (cannot be deleted)
 *   createdAt:   number,        // Date.now() timestamp
 *   settings: {
 *     canvasWidth:   number,    // canvas pixel width
 *     canvasHeight:  number,    // canvas pixel height
 *     gap:           number,    // px gap between tiles
 *     margin:        number,    // px margin from canvas edges
 *     hAlign:        string,    // 'left' | 'center' | 'right'
 *     cornerRadius:  number,    // px corner radius
 *     shadow: {
 *       enabled:   boolean,
 *       blur:      number,
 *       opacity:   number,      // 0–1
 *       color:     string,      // CSS hex
 *       offsetX:   number,
 *       offsetY:   number
 *     },
 *     background: {
 *       source:  string,        // 'image1' | 'image2' | 'color' | 'none'
 *       blur:    number,
 *       darken:  number,        // 0–1
 *       color:   string         // CSS hex (used when source === 'color')
 *     }
 *   }
 * }
 *
 * Storage key: 'collageMaker_templates'  (array of template objects)
 */

const STORAGE_KEY = 'collageMaker_templates';

/** Built-in default template (cannot be deleted). */
const DEFAULT_TEMPLATE = {
  id: '__default__',
  name: 'Default two-image collage',
  isDefault: true,
  createdAt: 0,
  settings: {
    canvasWidth:  1080,
    canvasHeight: 1350,
    gap:          20,
    margin:       40,
    hAlign:       'center',
    cornerRadius: 16,
    shadow: {
      enabled: true,
      blur:    24,
      opacity: 0.60,
      color:   '#000000',
      offsetX: 0,
      offsetY: 4,
    },
    background: {
      source: 'image1',
      blur:   20,
      darken: 0.30,
      color:  '#1a1a2e',
    },
  },
};

class TemplateManager {
  constructor() {
    /** @type {Array<object>} */
    this._templates = [];
    this._load();
  }

  /* ── Public API ──────────────────────────────────────────── */

  /** Returns all templates (default first, then user templates by creation date). */
  getAll() {
    return [...this._templates];
  }

  /** Returns a single template by id, or null. */
  getById(id) {
    return this._templates.find(t => t.id === id) ?? null;
  }

  /**
   * Save a new user template.
   * @param {string} name
   * @param {object} settings
   * @returns {object} the saved template
   */
  save(name, settings) {
    const tpl = {
      id:        this._uid(),
      name:      (name || 'Untitled').trim().slice(0, 40),
      isDefault: false,
      createdAt: Date.now(),
      settings:  JSON.parse(JSON.stringify(settings)), // deep clone
    };
    this._templates.push(tpl);
    this._persist();
    return tpl;
  }

  /**
   * Rename a template.
   * @param {string} id
   * @param {string} newName
   * @returns {boolean} success
   */
  rename(id, newName) {
    const tpl = this._templates.find(t => t.id === id);
    if (!tpl || tpl.isDefault) return false;
    tpl.name = (newName || 'Untitled').trim().slice(0, 40);
    this._persist();
    return true;
  }

  /**
   * Delete a user template by id.
   * @param {string} id
   * @returns {boolean} success
   */
  delete(id) {
    const idx = this._templates.findIndex(t => t.id === id);
    if (idx === -1 || this._templates[idx].isDefault) return false;
    this._templates.splice(idx, 1);
    this._persist();
    return true;
  }

  /* ── Private ─────────────────────────────────────────────── */

  _load() {
    // Always start with the built-in default
    this._templates = [DEFAULT_TEMPLATE];
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          // Merge user-saved templates (skip anything with reserved id)
          const userTpls = parsed.filter(t => t.id !== '__default__' && t.id && t.settings);
          this._templates.push(...userTpls);
        }
      }
    } catch (_) {
      // localStorage unavailable or corrupt — fall back to defaults only
    }
  }

  _persist() {
    try {
      // Only persist user templates (default is always re-added at load time)
      const toSave = this._templates.filter(t => !t.isDefault);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    } catch (_) {
      // Storage quota exceeded or unavailable — silently ignore
    }
  }

  /** Generate a simple unique id string. */
  _uid() {
    return `tpl_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
  }
}
