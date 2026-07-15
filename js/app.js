/**
 * app.js
 * ------
 * Main application controller.
 * Wires together: image upload, collage settings, canvas renderer, templates, and export.
 *
 * How to run:
 *   Open index.html in a modern browser — no build step required.
 *
 * Key configurable constants are defined in collageRenderer.js (DEFAULT_* constants).
 */

/* ── Utilities ──────────────────────────────────────────────── */

/** Debounce helper: delays fn by `ms` milliseconds. */
function debounce(fn, ms = 120) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

/**
 * Show a toast notification.
 * @param {string} message
 * @param {'info'|'success'|'error'} type
 * @param {number} duration  ms before auto-dismiss (0 = sticky)
 */
function showToast(message, type = 'info', duration = 3000) {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  const icons = { success: '✓', error: '✕', info: 'ℹ' };
  const iconSpan = document.createElement('span');
  iconSpan.setAttribute('aria-hidden', 'true');
  iconSpan.textContent = icons[type] || '';
  toast.appendChild(iconSpan);
  toast.appendChild(document.createTextNode(' ' + message));
  container.appendChild(toast);

  if (duration > 0) {
    setTimeout(() => {
      toast.classList.add('fade-out');
      toast.addEventListener('animationend', () => toast.remove(), { once: true });
    }, duration);
  }
}

/* ── App state ──────────────────────────────────────────────── */

const state = {
  image1: null,   // HTMLImageElement
  image2: null,   // HTMLImageElement
  image1DataUrl: null,
  image2DataUrl: null,
  activeTemplateId: null,
  rendering: false,
  renderPending: false,
  batchFiles: [],
  batchOutputs: [],
};

/* ── DOM refs ───────────────────────────────────────────────── */

const $ = id => document.getElementById(id);

const dom = {
  dropZone:       $('dropZone'),
  fileInput:      $('fileInput'),
  fileInput1:     $('fileInput1'),
  fileInput2:     $('fileInput2'),
  preview1:       $('preview1'),
  preview2:       $('preview2'),
  slot1:          $('slot1'),
  slot2:          $('slot2'),
  clearImg1:      $('clearImg1'),
  clearImg2:      $('clearImg2'),
  swapBtn:        $('swapBtn'),
  canvas:         $('collageCanvas'),
  previewWrap:    $('previewWrap'),
  previewPlaceholder: $('previewPlaceholder'),
  previewStatus:  $('previewStatus'),
  downloadBtn:    $('downloadBtn'),
  exportFormat:   $('exportFormat'),
  exportQuality:  $('exportQuality'),

  // Canvas/layout controls
  canvasPreset:   $('canvasPreset'),
  customSizeRow:  $('customSizeRow'),
  canvasWidth:    $('canvasWidth'),
  canvasHeight:   $('canvasHeight'),
  lockAspect:     $('lockAspect'),
  gapSize:        $('gapSize'),
  gapSizeVal:     $('gapSizeVal'),
  margin:         $('margin'),
  marginVal:      $('marginVal'),
  alignLeft:      $('alignLeft'),
  alignCenter:    $('alignCenter'),
  alignRight:     $('alignRight'),

  // Tile controls
  cornerRadius:   $('cornerRadius'),
  cornerRadiusVal:$('cornerRadiusVal'),
  shadowEnabled:  $('shadowEnabled'),
  shadowControls: $('shadowControls'),
  shadowBlur:     $('shadowBlur'),
  shadowBlurVal:  $('shadowBlurVal'),
  shadowOpacity:  $('shadowOpacity'),
  shadowOpacityVal:$('shadowOpacityVal'),
  shadowColor:    $('shadowColor'),
  shadowOffsetX:  $('shadowOffsetX'),
  shadowOffsetXVal:$('shadowOffsetXVal'),
  shadowOffsetY:  $('shadowOffsetY'),
  shadowOffsetYVal:$('shadowOffsetYVal'),

  // Background controls
  bgSource:         $('bgSource'),
  bgImageControls:  $('bgImageControls'),
  bgColorControl:   $('bgColorControl'),
  bgBlur:           $('bgBlur'),
  bgBlurVal:        $('bgBlurVal'),
  bgDarken:         $('bgDarken'),
  bgDarkenVal:      $('bgDarkenVal'),
  bgColor:          $('bgColor'),

  // Templates
  templateList:     $('templateList'),
  templateName:     $('templateName'),
  saveTemplateBtn:  $('saveTemplateBtn'),
  resetDefaultBtn:  $('resetDefaultBtn'),

  // Batch
  batchInput:       $('batchInput'),
  runBatchBtn:      $('runBatchBtn'),
  clearBatchBtn:    $('clearBatchBtn'),
  downloadAllBatchBtn: $('downloadAllBatchBtn'),
  batchStatus:      $('batchStatus'),
  batchList:        $('batchList'),

  // Help
  openHelpBtn:      $('openHelpBtn'),
  helpDialog:       $('helpDialog'),
};

/* ── Renderer & Template manager ──────────────────────────── */

const renderer = new CollagRenderer(dom.canvas);
const templateManager = new TemplateManager();
const STORAGE_KEYS = {
  activeTab: 'collageMaker_activeTab',
  exportFormat: 'collageMaker_exportFormat',
  exportQuality: 'collageMaker_exportQuality',
};

function syncHeaderHeightVar() {
  const header = document.querySelector('.app-header');
  if (!header) return;
  document.documentElement.style.setProperty('--header-real-h', `${header.offsetHeight}px`);
}

/* ── Settings helpers ───────────────────────────────────────── */

/** Read the current UI control values and return a settings object. */
function readSettings() {
  const preset = dom.canvasPreset.value;
  let w, h;
  if (preset === 'custom') {
    w = parseInt(dom.canvasWidth.value, 10) || 1080;
    h = parseInt(dom.canvasHeight.value, 10) || 1350;
  } else {
    [w, h] = preset.split('x').map(Number);
  }

  // Active alignment button
  let hAlign = 'center';
  [dom.alignLeft, dom.alignCenter, dom.alignRight].forEach(btn => {
    if (btn.classList.contains('is-active')) hAlign = btn.dataset.align;
  });

  return {
    canvasWidth:  w,
    canvasHeight: h,
    gap:          parseInt(dom.gapSize.value, 10),
    margin:       parseInt(dom.margin.value, 10),
    hAlign,
    cornerRadius: parseInt(dom.cornerRadius.value, 10),
    shadow: {
      enabled: dom.shadowEnabled.checked,
      blur:    parseInt(dom.shadowBlur.value, 10),
      opacity: parseInt(dom.shadowOpacity.value, 10) / 100,
      color:   dom.shadowColor.value,
      offsetX: parseInt(dom.shadowOffsetX.value, 10),
      offsetY: parseInt(dom.shadowOffsetY.value, 10),
    },
    background: {
      source: dom.bgSource.value,
      blur:   parseInt(dom.bgBlur.value, 10),
      darken: parseInt(dom.bgDarken.value, 10) / 100,
      color:  dom.bgColor.value,
    },
  };
}

/** Apply a settings object to all UI controls. */
function applySettings(s) {
  // Canvas preset
  const presetVal = `${s.canvasWidth}x${s.canvasHeight}`;
  const matchingOption = [...dom.canvasPreset.options].find(o => o.value === presetVal);
  dom.canvasPreset.value = matchingOption ? presetVal : 'custom';
  dom.canvasWidth.value  = s.canvasWidth;
  dom.canvasHeight.value = s.canvasHeight;
  toggleCustomSizeRow();

  // Layout
  dom.gapSize.value  = s.gap;
  dom.gapSizeVal.textContent = `${s.gap}px`;
  dom.margin.value   = s.margin;
  dom.marginVal.textContent  = `${s.margin}px`;

  // Alignment
  [dom.alignLeft, dom.alignCenter, dom.alignRight].forEach(btn => {
    btn.classList.toggle('is-active', btn.dataset.align === s.hAlign);
    btn.setAttribute('aria-pressed', String(btn.dataset.align === s.hAlign));
  });

  // Tile
  dom.cornerRadius.value     = s.cornerRadius;
  dom.cornerRadiusVal.textContent = `${s.cornerRadius}px`;
  dom.shadowEnabled.checked  = s.shadow.enabled;
  dom.shadowControls.style.display = s.shadow.enabled ? '' : 'none';
  dom.shadowBlur.value       = s.shadow.blur;
  dom.shadowBlurVal.textContent = `${s.shadow.blur}px`;
  dom.shadowOpacity.value    = Math.round(s.shadow.opacity * 100);
  dom.shadowOpacityVal.textContent = `${Math.round(s.shadow.opacity * 100)}%`;
  dom.shadowColor.value      = s.shadow.color;
  dom.shadowOffsetX.value    = s.shadow.offsetX;
  dom.shadowOffsetXVal.textContent = `${s.shadow.offsetX}px`;
  dom.shadowOffsetY.value    = s.shadow.offsetY;
  dom.shadowOffsetYVal.textContent = `${s.shadow.offsetY}px`;

  // Background
  dom.bgSource.value = s.background.source;
  updateBgSourceVisibility();
  dom.bgBlur.value   = s.background.blur;
  dom.bgBlurVal.textContent  = `${s.background.blur}px`;
  dom.bgDarken.value = Math.round(s.background.darken * 100);
  dom.bgDarkenVal.textContent = `${Math.round(s.background.darken * 100)}%`;
  dom.bgColor.value  = s.background.color;
}

/* ── Image loading ──────────────────────────────────────────── */

/**
 * Load an image from a File object.
 * @param {File} file
 * @returns {Promise<{img: HTMLImageElement, dataUrl: string}>}
 */
function loadImageFile(file) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error(`"${file.name}" is not a supported image file (JPG, PNG, WebP).`));
      return;
    }
    const reader = new FileReader();
    reader.onload = async e => {
      try {
        const dataUrl = e.target.result;
        const img = await CollagRenderer.loadImage(dataUrl);
        resolve({ img, dataUrl });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error(`Could not read "${file.name}".`));
    reader.readAsDataURL(file);
  });
}

/** Update the slot preview with a loaded image. */
function setSlotImage(slot, imgEl, dataUrl) {
  if (slot === 1) {
    state.image1 = imgEl;
    state.image1DataUrl = dataUrl;
    renderSlotPreview(dom.preview1, dataUrl);
    dom.clearImg1.disabled = false;
    dom.slot1.classList.add('has-image');
  } else {
    state.image2 = imgEl;
    state.image2DataUrl = dataUrl;
    renderSlotPreview(dom.preview2, dataUrl);
    dom.clearImg2.disabled = false;
    dom.slot2.classList.add('has-image');
  }
  renderer.setImages(state.image1, state.image2);
  if (state.image1 && state.image2) setTimeout(scrollToCanvas, 200);
  scheduleRender();
}

function renderSlotPreview(previewEl, dataUrl) {
  // Remove old image if any
  const old = previewEl.querySelector('img');
  if (old) old.remove();
  previewEl.querySelector('.image-slot__placeholder')?.remove();
  previewEl.querySelector('.image-slot__placeholder-text')?.remove();

  const img = document.createElement('img');
  img.src = dataUrl;
  img.alt = 'Uploaded image preview';
  previewEl.insertBefore(img, previewEl.firstChild);
}

function clearSlotImage(slot) {
  if (slot === 1) {
    state.image1 = null;
    state.image1DataUrl = null;
    resetSlotPreview(dom.preview1, 'Upload image 1');
    dom.clearImg1.disabled = true;
    dom.slot1.classList.remove('has-image');
  } else {
    state.image2 = null;
    state.image2DataUrl = null;
    resetSlotPreview(dom.preview2, 'Upload image 2');
    dom.clearImg2.disabled = true;
    dom.slot2.classList.remove('has-image');
  }
  renderer.setImages(state.image1, state.image2);
  scheduleRender();
}

function resetSlotPreview(previewEl, labelText) {
  previewEl.querySelector('img')?.remove();

  if (!previewEl.querySelector('.image-slot__placeholder')) {
    const ph = document.createElement('span');
    ph.className = 'image-slot__placeholder';
    ph.setAttribute('aria-hidden', 'true');
    ph.textContent = '+';
    previewEl.insertBefore(ph, previewEl.firstChild);
  }
  if (!previewEl.querySelector('.image-slot__placeholder-text')) {
    const pt = document.createElement('span');
    pt.className = 'image-slot__placeholder-text';
    pt.textContent = labelText;
    previewEl.appendChild(pt);
  }
}

/* ── Render scheduling ──────────────────────────────────────── */

const scheduleRender = debounce(async () => {
  if (!state.image1 || !state.image2) {
    dom.canvas.classList.remove('visible');
    dom.previewPlaceholder.classList.remove('hidden');
    dom.downloadBtn.disabled = true;
    dom.previewStatus.textContent = '';
    return;
  }

  if (state.rendering) {
    state.renderPending = true;
    return;
  }
  state.rendering = true;

  dom.previewStatus.textContent = '⏳ Rendering…';
  dom.downloadBtn.disabled = true;

  try {
    const settings = readSettings();
    renderer.updateSettings(settings);
    await renderer.render();

    dom.canvas.classList.add('visible');
    dom.previewPlaceholder.classList.add('hidden');
    dom.downloadBtn.disabled = false;
    dom.previewStatus.textContent = '✓ Ready';
  } catch (err) {
    console.error('[CollageMaker] Render error:', err);
    showToast('Rendering failed. Please try again.', 'error');
    dom.previewStatus.textContent = '';
  } finally {
    state.rendering = false;
    if (state.renderPending) {
      state.renderPending = false;
      scheduleRender();
    }
  }
}, 150);

/* ── Event handlers ─────────────────────────────────────────── */

// ── Global drag & drop ────────────────────────────────────────

function handleFileDrop(files, targetSlot) {
  const imageFiles = [...files].filter(f => f.type.startsWith('image/'));
  if (imageFiles.length === 0) {
    showToast('No valid image files found. Use JPG, PNG or WebP.', 'error');
    return;
  }
  if (imageFiles.length > 2) {
    showToast('Please drop at most two images at a time.', 'error');
    return;
  }

  if (targetSlot) {
    // Targeted slot
    loadImageFile(imageFiles[0])
      .then(({ img, dataUrl }) => setSlotImage(targetSlot, img, dataUrl))
      .catch(err => showToast(err.message, 'error'));
  } else {
    // Global drop zone: assign to empty slots first
    const slots = [
      { slot: 1, empty: !state.image1 },
      { slot: 2, empty: !state.image2 },
    ];
    const targets = imageFiles.length === 2
      ? [{ slot: 1 }, { slot: 2 }]
      : [slots.find(s => s.empty) || { slot: 1 }];

    targets.forEach((t, i) => {
      if (!imageFiles[i]) return;
      loadImageFile(imageFiles[i])
        .then(({ img, dataUrl }) => setSlotImage(t.slot, img, dataUrl))
        .catch(err => showToast(err.message, 'error'));
    });
  }
}

// Global drop zone
dom.dropZone.addEventListener('dragover', e => { e.preventDefault(); dom.dropZone.classList.add('drag-over'); });
dom.dropZone.addEventListener('dragleave', () => dom.dropZone.classList.remove('drag-over'));
dom.dropZone.addEventListener('drop', e => {
  e.preventDefault();
  dom.dropZone.classList.remove('drag-over');
  handleFileDrop(e.dataTransfer.files, null);
});
dom.dropZone.addEventListener('keydown', e => {
  if (e.key === 'Enter' || e.key === ' ') dom.fileInput.click();
});
dom.fileInput.addEventListener('change', e => {
  handleFileDrop(e.target.files, null);
  e.target.value = ''; // reset so same file can be re-selected
});

// Slot-specific file inputs
dom.fileInput1.addEventListener('change', e => {
  if (e.target.files.length) {
    loadImageFile(e.target.files[0])
      .then(({ img, dataUrl }) => setSlotImage(1, img, dataUrl))
      .catch(err => showToast(err.message, 'error'));
    e.target.value = '';
  }
});
dom.fileInput2.addEventListener('change', e => {
  if (e.target.files.length) {
    loadImageFile(e.target.files[0])
      .then(({ img, dataUrl }) => setSlotImage(2, img, dataUrl))
      .catch(err => showToast(err.message, 'error'));
    e.target.value = '';
  }
});

// Slot preview click (keyboard accessibility)
dom.preview1.addEventListener('keydown', e => {
  if (e.key === 'Enter' || e.key === ' ') dom.fileInput1.click();
});
dom.preview2.addEventListener('keydown', e => {
  if (e.key === 'Enter' || e.key === ' ') dom.fileInput2.click();
});

// Slot drag & drop
[
  { el: dom.preview1, slot: 1 },
  { el: dom.preview2, slot: 2 },
].forEach(({ el, slot }) => {
  el.addEventListener('dragover', e => { e.preventDefault(); el.classList.add('drag-over'); });
  el.addEventListener('dragleave', () => el.classList.remove('drag-over'));
  el.addEventListener('drop', e => {
    e.preventDefault();
    el.classList.remove('drag-over');
    handleFileDrop(e.dataTransfer.files, slot);
  });
});

// Clear buttons
dom.clearImg1.addEventListener('click', () => clearSlotImage(1));
dom.clearImg2.addEventListener('click', () => clearSlotImage(2));

// Swap button
dom.swapBtn.addEventListener('click', () => {
  const tmpImg = state.image1;
  const tmpUrl = state.image1DataUrl;
  state.image1    = state.image2;
  state.image1DataUrl = state.image2DataUrl;
  state.image2    = tmpImg;
  state.image2DataUrl = tmpUrl;

  // Swap UI previews
  if (state.image1DataUrl) renderSlotPreview(dom.preview1, state.image1DataUrl);
  else resetSlotPreview(dom.preview1, 'Upload image 1');

  if (state.image2DataUrl) renderSlotPreview(dom.preview2, state.image2DataUrl);
  else resetSlotPreview(dom.preview2, 'Upload image 2');

  // Sync slot border states
  dom.slot1.classList.toggle('has-image', !!state.image1);
  dom.slot2.classList.toggle('has-image', !!state.image2);
  dom.clearImg1.disabled = !state.image1;
  dom.clearImg2.disabled = !state.image2;

  renderer.setImages(state.image1, state.image2);
  scheduleRender();
});

// ── Canvas preset & custom size ───────────────────────────────

function toggleCustomSizeRow() {
  dom.customSizeRow.style.display = dom.canvasPreset.value === 'custom' ? 'flex' : 'none';
}

dom.canvasPreset.addEventListener('change', () => {
  toggleCustomSizeRow();
  if (dom.canvasPreset.value !== 'custom') {
    const [w, h] = dom.canvasPreset.value.split('x').map(Number);
    dom.canvasWidth.value  = w;
    dom.canvasHeight.value = h;
  }
  scheduleRender();
});

let _aspectRatio = (parseInt(dom.canvasWidth.value, 10) || 1080) / (parseInt(dom.canvasHeight.value, 10) || 1350);
dom.canvasWidth.addEventListener('input', () => {
  const w = parseInt(dom.canvasWidth.value, 10) || 0;
  const h = parseInt(dom.canvasHeight.value, 10) || 0;
  if (dom.lockAspect.checked) {
    if (_aspectRatio > 0) dom.canvasHeight.value = Math.round(w / _aspectRatio);
  } else {
    if (h > 0) _aspectRatio = w / h;
  }
  scheduleRender();
});
dom.canvasHeight.addEventListener('input', () => {
  const w = parseInt(dom.canvasWidth.value, 10) || 0;
  const h = parseInt(dom.canvasHeight.value, 10) || 0;
  if (dom.lockAspect.checked) {
    if (_aspectRatio > 0) dom.canvasWidth.value = Math.round(h * _aspectRatio);
  } else {
    if (h > 0) _aspectRatio = w / h;
  }
  scheduleRender();
});

// ── Range sliders ─────────────────────────────────────────────

const rangeControls = [
  { el: dom.gapSize,       badge: dom.gapSizeVal,        fmt: v => `${v}px` },
  { el: dom.margin,        badge: dom.marginVal,          fmt: v => `${v}px` },
  { el: dom.cornerRadius,  badge: dom.cornerRadiusVal,    fmt: v => `${v}px` },
  { el: dom.shadowBlur,    badge: dom.shadowBlurVal,      fmt: v => `${v}px` },
  { el: dom.shadowOpacity, badge: dom.shadowOpacityVal,   fmt: v => `${v}%` },
  { el: dom.shadowOffsetX, badge: dom.shadowOffsetXVal,   fmt: v => `${v}px` },
  { el: dom.shadowOffsetY, badge: dom.shadowOffsetYVal,   fmt: v => `${v}px` },
  { el: dom.bgBlur,        badge: dom.bgBlurVal,          fmt: v => `${v}px` },
  { el: dom.bgDarken,      badge: dom.bgDarkenVal,        fmt: v => `${v}%` },
];

rangeControls.forEach(({ el, badge, fmt }) => {
  el.addEventListener('input', () => {
    badge.textContent = fmt(el.value);
    scheduleRender();
  });
});

// ── Shadow toggle ─────────────────────────────────────────────

dom.shadowEnabled.addEventListener('change', () => {
  dom.shadowControls.style.display = dom.shadowEnabled.checked ? '' : 'none';
  scheduleRender();
});

// ── Shadow/BG color pickers ───────────────────────────────────

dom.shadowColor.addEventListener('input', scheduleRender);
dom.bgColor.addEventListener('input', scheduleRender);

// ── Background source ─────────────────────────────────────────

function updateBgSourceVisibility() {
  const isColor = dom.bgSource.value === 'color';
  const isNone  = dom.bgSource.value === 'none';
  dom.bgImageControls.style.display = (!isColor && !isNone) ? '' : 'none';
  dom.bgColorControl.style.display  = isColor ? '' : 'none';
}
dom.bgSource.addEventListener('change', () => {
  updateBgSourceVisibility();
  scheduleRender();
});

function switchToTab(target) {
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabPanels = document.querySelectorAll('.tab-panel');
  let found = false;

  tabBtns.forEach(b => {
    const isActive = b.dataset.tab === target;
    b.classList.toggle('is-active', isActive);
    b.setAttribute('aria-selected', String(isActive));
    if (isActive) found = true;
  });
  tabPanels.forEach(p => { p.hidden = true; });

  const panel = document.getElementById(`panel-${target}`);
  if (panel) panel.hidden = false;
  if (found) {
    try { localStorage.setItem(STORAGE_KEYS.activeTab, target); } catch (_) {}
  }
}

// ── Alignment buttons ─────────────────────────────────────────

[dom.alignLeft, dom.alignCenter, dom.alignRight].forEach(btn => {
  btn.addEventListener('click', () => {
    [dom.alignLeft, dom.alignCenter, dom.alignRight].forEach(b => {
      b.classList.remove('is-active');
      b.setAttribute('aria-pressed', 'false');
    });
    btn.classList.add('is-active');
    btn.setAttribute('aria-pressed', 'true');
    scheduleRender();
  });
});

// ── Download ──────────────────────────────────────────────────

dom.downloadBtn.addEventListener('click', async () => {
  if (!state.image1 || !state.image2) {
    showToast('Please upload two images first.', 'error');
    return;
  }

  dom.downloadBtn.disabled = true;
  dom.downloadBtn.innerHTML = '<span class="spinner"></span> Exporting…';

  try {
    const mimeType = dom.exportFormat.value;
    const quality  = parseFloat(dom.exportQuality.value);

    // Re-render at full resolution (canvas is already at target size)
    await renderer.render();
    const blob = await renderer.toBlob(mimeType, quality);
    const ext  = mimeType === 'image/png' ? 'png' : 'jpg';
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `collage-${Date.now()}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Collage downloaded successfully!', 'success');
  } catch (err) {
    console.error('[CollageMaker] Export error:', err);
    showToast('Export failed. Please try again.', 'error');
  } finally {
    dom.downloadBtn.disabled = false;
    dom.downloadBtn.innerHTML = '<span aria-hidden="true">⬇</span> Download Collage';
  }
});

dom.exportFormat.addEventListener('change', () => {
  try { localStorage.setItem(STORAGE_KEYS.exportFormat, dom.exportFormat.value); } catch (_) {}
});
dom.exportQuality.addEventListener('change', () => {
  try { localStorage.setItem(STORAGE_KEYS.exportQuality, dom.exportQuality.value); } catch (_) {}
});

/* ── Templates ──────────────────────────────────────────────── */

function renderTemplateList() {
  const templates = templateManager.getAll();
  dom.templateList.innerHTML = '';

  if (templates.length === 0) {
    const empty = document.createElement('p');
    empty.style.cssText = 'font-size:.78rem;color:var(--color-text-muted);text-align:center;padding:8px 0';
    empty.textContent = 'No templates saved yet.';
    dom.templateList.appendChild(empty);
    return;
  }

  templates.forEach(tpl => {
    const item = document.createElement('div');
    item.className = 'template-item';
    if (tpl.id === state.activeTemplateId) item.classList.add('is-active');
    item.setAttribute('role', 'listitem');

    item.innerHTML = `
      <span class="template-item__name" title="${escHtml(tpl.name)}" tabindex="0" role="button"
            aria-label="Apply template: ${escHtml(tpl.name)}">
        ${escHtml(tpl.name)}
      </span>
      ${tpl.isDefault ? '<span class="template-item__default">DEFAULT</span>' : ''}
      <div class="template-item__actions">
        ${!tpl.isDefault ? `<button class="template-item__btn template-item__btn--rename" aria-label="Rename template ${escHtml(tpl.name)}">✎</button>` : ''}
        ${!tpl.isDefault ? `<button class="template-item__btn template-item__btn--delete" aria-label="Delete template ${escHtml(tpl.name)}">✕</button>` : ''}
      </div>
    `;

    const nameEl = item.querySelector('.template-item__name');
    nameEl.addEventListener('click', () => applyTemplate(tpl.id));
    nameEl.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') applyTemplate(tpl.id);
    });

    const renameBtn = item.querySelector('.template-item__btn--rename');
    if (renameBtn) {
      renameBtn.addEventListener('click', e => {
        e.stopPropagation();
        const newName = prompt('Rename template:', tpl.name);
        if (newName !== null && newName.trim()) {
          templateManager.rename(tpl.id, newName.trim());
          renderTemplateList();
          showToast('Template renamed.', 'success');
        }
      });
    }

    const deleteBtn = item.querySelector('.template-item__btn--delete');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', e => {
        e.stopPropagation();
        if (confirm(`Delete template "${tpl.name}"?`)) {
          templateManager.delete(tpl.id);
          if (state.activeTemplateId === tpl.id) state.activeTemplateId = null;
          renderTemplateList();
          showToast('Template deleted.', 'info');
        }
      });
    }

    dom.templateList.appendChild(item);
  });
}

function applyTemplate(id) {
  const tpl = templateManager.getById(id);
  if (!tpl) return;
  state.activeTemplateId = id;
  applySettings(tpl.settings);
  renderTemplateList();
  scheduleRender();
  showToast(`Template "${tpl.name}" applied.`, 'success');
}

dom.saveTemplateBtn.addEventListener('click', () => {
  const name = dom.templateName.value.trim();
  if (!name) {
    showToast('Please enter a template name.', 'error');
    dom.templateName.focus();
    return;
  }
  const settings = readSettings();
  const tpl = templateManager.save(name, settings);
  state.activeTemplateId = tpl.id;
  dom.templateName.value = '';
  renderTemplateList();
  showToast(`Template "${tpl.name}" saved.`, 'success');
});

dom.resetDefaultBtn.addEventListener('click', () => {
  const defaultTpl = templateManager.getById('__default__');
  if (defaultTpl) {
    applyTemplate('__default__');
    showToast('Reset to default settings.', 'info');
  }
});

/* ── Batch processing ─────────────────────────────────────────── */

function releaseBatchUrls() {
  state.batchOutputs.forEach(out => URL.revokeObjectURL(out.url));
  state.batchOutputs = [];
}

function renderBatchList() {
  if (!dom.batchList) return;
  dom.batchList.innerHTML = '';

  if (state.batchOutputs.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'batch-help';
    empty.textContent = 'No processed batch output yet.';
    dom.batchList.appendChild(empty);
    dom.downloadAllBatchBtn.disabled = true;
    return;
  }

  state.batchOutputs.forEach(out => {
    const row = document.createElement('div');
    row.className = 'batch-row';
    row.innerHTML = `
      <div>
        <div class="batch-row__name">${escHtml(out.name)}</div>
        <div class="batch-row__meta">${formatBytes(out.size)}</div>
      </div>
      <button class="btn btn--secondary" type="button">Download</button>
    `;
    row.querySelector('button').addEventListener('click', () => {
      const a = document.createElement('a');
      a.href = out.url;
      a.download = out.name;
      a.click();
    });
    dom.batchList.appendChild(row);
  });

  dom.downloadAllBatchBtn.disabled = false;
}

async function runBatchProcessing() {
  if (!dom.batchInput || state.batchFiles.length < 2) {
    showToast('Select at least 2 images for batch mode.', 'error');
    return;
  }

  const totalPairs = Math.floor(state.batchFiles.length / 2);
  if (totalPairs === 0) {
    showToast('Need pairs of images (2 files per collage).', 'error');
    return;
  }

  dom.runBatchBtn.disabled = true;
  dom.batchStatus.textContent = `Processing ${totalPairs} pairs...`;
  releaseBatchUrls();
  renderBatchList();

  const settings = readSettings();
  const mimeType = dom.exportFormat.value;
  const quality = parseFloat(dom.exportQuality.value);
  const ext = mimeType === 'image/png' ? 'png' : 'jpg';

  try {
    for (let i = 0; i < totalPairs; i++) {
      const fileA = state.batchFiles[i * 2];
      const fileB = state.batchFiles[i * 2 + 1];
      dom.batchStatus.textContent = `Processing pair ${i + 1} of ${totalPairs}...`;

      const [{ img: img1 }, { img: img2 }] = await Promise.all([
        loadImageFile(fileA),
        loadImageFile(fileB),
      ]);

      const canvas = document.createElement('canvas');
      const localRenderer = new CollagRenderer(canvas, settings);
      localRenderer.setImages(img1, img2);
      await localRenderer.render();
      const blob = await localRenderer.toBlob(mimeType, quality);
      const url = URL.createObjectURL(blob);
      state.batchOutputs.push({
        name: `collage-pair-${i + 1}.${ext}`,
        url,
        size: blob.size,
      });
    }

    dom.batchStatus.textContent = `Done: ${state.batchOutputs.length} collages ready.`;
    renderBatchList();
    showToast('Batch processing complete.', 'success');
  } catch (err) {
    console.error('[CollageMaker] Batch error:', err);
    dom.batchStatus.textContent = 'Batch processing failed.';
    showToast('Batch processing failed. Please try different files.', 'error');
  } finally {
    dom.runBatchBtn.disabled = false;
  }
}

if (dom.batchInput) {
  dom.batchInput.addEventListener('change', e => {
    state.batchFiles = [...(e.target.files || [])].filter(f => f.type.startsWith('image/'));
    const pairCount = Math.floor(state.batchFiles.length / 2);
    const hasOdd = state.batchFiles.length % 2 === 1;
    dom.batchStatus.textContent = `${state.batchFiles.length} files selected (${pairCount} pairs).${hasOdd ? ' Last image will be ignored.' : ''}`;
  });
}

if (dom.runBatchBtn) {
  dom.runBatchBtn.addEventListener('click', runBatchProcessing);
}

if (dom.clearBatchBtn) {
  dom.clearBatchBtn.addEventListener('click', () => {
    if (dom.batchInput) dom.batchInput.value = '';
    state.batchFiles = [];
    dom.batchStatus.textContent = 'Cleared.';
    releaseBatchUrls();
    renderBatchList();
  });
}

if (dom.downloadAllBatchBtn) {
  dom.downloadAllBatchBtn.addEventListener('click', () => {
    if (state.batchOutputs.length === 0) return;
    state.batchOutputs.forEach((out, idx) => {
      setTimeout(() => {
        const a = document.createElement('a');
        a.href = out.url;
        a.download = out.name;
        a.click();
      }, idx * 250);
    });
  });
}

window.addEventListener('beforeunload', releaseBatchUrls);

/* ── Helpers ─────────────────────────────────────────────────── */

function escHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/* ── Init ─────────────────────────────────────────────────────── */

function init() {
  syncHeaderHeightVar();
  window.addEventListener('resize', syncHeaderHeightVar);
  window.addEventListener('orientationchange', syncHeaderHeightVar);
  // Restore lightweight user preferences
  try {
    const savedFormat = localStorage.getItem(STORAGE_KEYS.exportFormat);
    const savedQuality = localStorage.getItem(STORAGE_KEYS.exportQuality);
    if (savedFormat && [...dom.exportFormat.options].some(o => o.value === savedFormat)) {
      dom.exportFormat.value = savedFormat;
    }
    if (savedQuality && [...dom.exportQuality.options].some(o => o.value === savedQuality)) {
      dom.exportQuality.value = savedQuality;
    }
  } catch (_) {}

  // Apply default settings on load
  const defaultTpl = templateManager.getById('__default__');
  if (defaultTpl) {
    applySettings(defaultTpl.settings);
    state.activeTemplateId = '__default__';
  }

  // Render template list
  renderTemplateList();

  // Init visibility
  toggleCustomSizeRow();
  updateBgSourceVisibility();
  dom.shadowControls.style.display = dom.shadowEnabled.checked ? '' : 'none';
  renderBatchList();

  // Restore last active tab
  let preferredTab = 'layout';
  try {
    preferredTab = localStorage.getItem(STORAGE_KEYS.activeTab) || 'layout';
  } catch (_) {}
  switchToTab(preferredTab);

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js?v=20260714-4').catch(err => {
        console.error('[CollageMaker] SW registration failed:', err);
      });
    });
  }
}

init();

/* ── Tab switching ─────────────────────────────────────────────── */

(function initTabs() {
  const tabBtns   = document.querySelectorAll('.tab-btn');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      switchToTab(btn.dataset.tab);
    });
  });
})();

if (dom.openHelpBtn && dom.helpDialog) {
  dom.openHelpBtn.addEventListener('click', () => {
    if (dom.helpDialog.open) dom.helpDialog.close();
    else dom.helpDialog.showModal();
  });
}

window.addEventListener('keydown', e => {
  // Ignore if typing in form controls
  const tag = (document.activeElement?.tagName || '').toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

  if (e.key === '?') {
    e.preventDefault();
    if (dom.helpDialog) {
      if (dom.helpDialog.open) dom.helpDialog.close();
      else dom.helpDialog.showModal();
    }
    return;
  }

  const tabMap = { '1': 'layout', '2': 'style', '3': 'bg', '4': 'tpl', '5': 'batch' };
  if (tabMap[e.key]) {
    e.preventDefault();
    switchToTab(tabMap[e.key]);
    return;
  }

  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
    e.preventDefault();
    if (!dom.downloadBtn.disabled) dom.downloadBtn.click();
    return;
  }

  if (e.key.toLowerCase() === 'x') {
    e.preventDefault();
    dom.swapBtn.click();
    return;
  }

  if (e.key.toLowerCase() === 'u') {
    e.preventDefault();
    dom.fileInput.click();
  }
});

/* ── Mobile: auto-scroll canvas into view when both images loaded ── */

function scrollToCanvas() {
  if (window.innerWidth < 800) {
    document.getElementById('previewWrap')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}
