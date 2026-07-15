(function () {
  const $ = id => document.getElementById(id);
  const PRESETS = {
    'insta-square': { w: 1080, h: 1080 },
    'insta-portrait': { w: 1080, h: 1350 },
    'story': { w: 1080, h: 1920 },
    'youtube': { w: 1280, h: 720 },
    'landscape-hd': { w: 1920, h: 1080 },
  };
  const STORAGE = {
    projects: 'collageStudio_projects',
    autosave: 'collageStudio_autosave',
    seenTips: 'collageStudio_seen_tips',
  };

  const dom = {
    projectName: $('projectName'),
    projectSelect: $('projectSelect'),
    newProjectBtn: $('newProjectBtn'),
    saveProjectBtn: $('saveProjectBtn'),
    loadProjectBtn: $('loadProjectBtn'),
    deleteProjectBtn: $('deleteProjectBtn'),
    undoBtn: $('undoBtn'),
    redoBtn: $('redoBtn'),
    shareBtn: $('shareBtn'),
    shareUrl: $('shareUrl'),
    tipsBtn: $('tipsBtn'),
    tipsDialog: $('tipsDialog'),

    outputPreset: $('outputPreset'),
    preset: $('preset'),
    customSize: $('customSize'),
    width: $('width'),
    height: $('height'),
    imageCount: $('imageCount'),
    layoutMode: $('layoutMode'),
    gap: $('gap'),
    margin: $('margin'),
    gapVal: $('gapVal'),
    marginVal: $('marginVal'),
    showGuides: $('showGuides'),
    compareEnabled: $('compareEnabled'),
    compareWrap: $('compareWrap'),
    compareSplit: $('compareSplit'),
    compareVal: $('compareVal'),

    bgMode: $('bgMode'),
    bgColor1: $('bgColor1'),
    bgColor2: $('bgColor2'),
    brightness: $('brightness'),
    contrast: $('contrast'),
    saturation: $('saturation'),
    warmth: $('warmth'),
    briVal: $('briVal'),
    conVal: $('conVal'),
    satVal: $('satVal'),
    warmVal: $('warmVal'),

    files: $('files'),
    imageList: $('imageList'),
    selectedImage: $('selectedImage'),
    moveUpBtn: $('moveUpBtn'),
    moveDownBtn: $('moveDownBtn'),
    zoom: $('zoom'),
    panX: $('panX'),
    panY: $('panY'),
    rotate: $('rotate'),
    flipH: $('flipH'),
    flipV: $('flipV'),
    zoomVal: $('zoomVal'),
    panXVal: $('panXVal'),
    panYVal: $('panYVal'),
    rotVal: $('rotVal'),
    freeformEditor: $('freeformEditor'),
    frameX: $('frameX'),
    frameY: $('frameY'),
    frameW: $('frameW'),
    frameH: $('frameH'),
    fxVal: $('fxVal'),
    fyVal: $('fyVal'),
    fwVal: $('fwVal'),
    fhVal: $('fhVal'),

    textList: $('textList'),
    addTextBtn: $('addTextBtn'),
    removeTextBtn: $('removeTextBtn'),
    selectedText: $('selectedText'),
    textContent: $('textContent'),
    textSize: $('textSize'),
    textColor: $('textColor'),
    textAlign: $('textAlign'),
    textX: $('textX'),
    textY: $('textY'),

    exportTemplateBtn: $('exportTemplateBtn'),
    importTemplateBtn: $('importTemplateBtn'),
    templateInput: $('templateInput'),
    format: $('format'),
    quality: $('quality'),
    downloadBtn: $('downloadBtn'),
    downloadZipBtn: $('downloadZipBtn'),
    a11yContrast: $('a11yContrast'),
    a11yLargeUi: $('a11yLargeUi'),
    a11yReduceMotion: $('a11yReduceMotion'),
    status: $('status'),
    qualityHint: $('qualityHint'),
    canvas: $('canvas'),
    empty: $('empty'),
  };

  const state = {
    projectName: 'My collage project',
    canvas: { preset: '1080x1080', outputPreset: 'custom', width: 1080, height: 1080 },
    layout: { imageCount: 4, mode: 'grid', gap: 16, margin: 24, guides: false },
    compare: { enabled: false, split: 50 },
    background: { mode: 'solid', color1: '#111827', color2: '#1f2937' },
    filters: { brightness: 100, contrast: 100, saturation: 100, warmth: 0 },
    images: [],
    selectedImage: 0,
    texts: [],
    selectedTextId: null,
    export: { format: 'image/jpeg', quality: 0.9 },
    a11y: { contrast: false, largeUi: false, reduceMotion: false },
    historyPast: [],
    historyFuture: [],
  };
  let applyingState = false;

  function uid(prefix) {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
  }
  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }
  function debounce(fn, ms = 280) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), ms);
    };
  }
  function setStatus(msg) {
    dom.status.textContent = msg;
  }

  function makeDefaultImageEntry(src, name, img) {
    return {
      id: uid('img'),
      src,
      name: name || 'image',
      img: img || null,
      transform: { zoom: 100, panX: 0, panY: 0, rotate: 0, flipH: false, flipV: false },
      frame: { x: 0, y: 0, w: 30, h: 30 },
    };
  }

  async function loadImageFromSrc(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Could not decode image.'));
      img.src = src;
    });
  }

  async function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('Could not read file.'));
      reader.readAsDataURL(file);
    });
  }

  function outputPresetToSize(v) {
    if (!PRESETS[v]) return null;
    return PRESETS[v];
  }

  function normalizeImageCount() {
    const target = clamp(state.layout.imageCount, 2, 9);
    while (state.images.length < target) {
      state.images.push(makeDefaultImageEntry('', `Slot ${state.images.length + 1}`, null));
    }
    if (state.images.length > target) state.images = state.images.slice(0, target);
    state.layout.imageCount = target;
    state.selectedImage = clamp(state.selectedImage, 0, target - 1);
  }

  function ensureFreeformFrames() {
    if (state.layout.mode !== 'freeform') return;
    const cols = Math.ceil(Math.sqrt(state.layout.imageCount));
    const rows = Math.ceil(state.layout.imageCount / cols);
    for (let i = 0; i < state.layout.imageCount; i++) {
      const item = state.images[i];
      if (!item) continue;
      if (!item.frame || !isFinite(item.frame.w) || !isFinite(item.frame.h)) {
        const col = i % cols;
        const row = Math.floor(i / cols);
        item.frame = {
          x: (col * (100 / cols)) + 2,
          y: (row * (100 / rows)) + 2,
          w: (100 / cols) - 4,
          h: (100 / rows) - 4,
        };
      }
      item.frame.x = clamp(item.frame.x, 0, 100);
      item.frame.y = clamp(item.frame.y, 0, 100);
      item.frame.w = clamp(item.frame.w, 10, 100);
      item.frame.h = clamp(item.frame.h, 10, 100);
      if (item.frame.x + item.frame.w > 100) item.frame.x = 100 - item.frame.w;
      if (item.frame.y + item.frame.h > 100) item.frame.y = 100 - item.frame.h;
    }
  }

  function serializableState() {
    return {
      projectName: state.projectName,
      canvas: state.canvas,
      layout: state.layout,
      compare: state.compare,
      background: state.background,
      filters: state.filters,
      images: state.images.map(i => ({
        id: i.id,
        src: i.src,
        name: i.name,
        transform: i.transform,
        frame: i.frame,
      })),
      selectedImage: state.selectedImage,
      texts: state.texts,
      selectedTextId: state.selectedTextId,
      export: state.export,
      a11y: state.a11y,
    };
  }

  async function applySerializableState(next) {
    applyingState = true;
    try {
      state.projectName = next.projectName || 'My collage project';
      state.canvas = { ...state.canvas, ...(next.canvas || {}) };
      state.layout = { ...state.layout, ...(next.layout || {}) };
      state.compare = { ...state.compare, ...(next.compare || {}) };
      state.background = { ...state.background, ...(next.background || {}) };
      state.filters = { ...state.filters, ...(next.filters || {}) };
      state.export = { ...state.export, ...(next.export || {}) };
      state.a11y = { ...state.a11y, ...(next.a11y || {}) };
      state.selectedImage = next.selectedImage || 0;
      state.texts = Array.isArray(next.texts) ? next.texts : [];
      state.selectedTextId = next.selectedTextId || (state.texts[0]?.id || null);

      const incoming = Array.isArray(next.images) ? next.images : [];
      state.images = [];
      for (const i of incoming) {
        const img = i.src ? await loadImageFromSrc(i.src).catch(() => null) : null;
        state.images.push({
          id: i.id || uid('img'),
          src: i.src || '',
          name: i.name || 'image',
          img,
          transform: { zoom: 100, panX: 0, panY: 0, rotate: 0, flipH: false, flipV: false, ...(i.transform || {}) },
          frame: { x: 0, y: 0, w: 30, h: 30, ...(i.frame || {}) },
        });
      }
      normalizeImageCount();
      ensureFreeformFrames();
      syncUIFromState();
      render();
    } finally {
      applyingState = false;
    }
  }

  function pushHistory() {
    if (applyingState) return;
    const snap = JSON.stringify(serializableState());
    state.historyPast.push(snap);
    if (state.historyPast.length > 80) state.historyPast.shift();
    state.historyFuture = [];
    updateHistoryButtons();
  }
  const pushHistoryDebounced = debounce(pushHistory, 300);

  function updateHistoryButtons() {
    dom.undoBtn.disabled = state.historyPast.length === 0;
    dom.redoBtn.disabled = state.historyFuture.length === 0;
  }

  async function undo() {
    if (!state.historyPast.length) return;
    const current = JSON.stringify(serializableState());
    const prev = state.historyPast.pop();
    state.historyFuture.push(current);
    updateHistoryButtons();
    await applySerializableState(JSON.parse(prev));
  }

  async function redo() {
    if (!state.historyFuture.length) return;
    const current = JSON.stringify(serializableState());
    const next = state.historyFuture.pop();
    state.historyPast.push(current);
    updateHistoryButtons();
    await applySerializableState(JSON.parse(next));
  }

  function coverBox(imgW, imgH, boxW, boxH) {
    const srcAspect = imgW / imgH;
    const boxAspect = boxW / boxH;
    if (srcAspect > boxAspect) {
      return { w: boxH * srcAspect, h: boxH };
    }
    return { w: boxW, h: boxW / srcAspect };
  }

  function computeFrames(width, height) {
    const n = state.layout.imageCount;
    const gap = state.layout.gap;
    const margin = state.layout.margin;
    const mode = state.layout.mode;

    if (mode === 'freeform') {
      ensureFreeformFrames();
      return state.images.slice(0, n).map(i => ({
        x: Math.round((i.frame.x / 100) * width),
        y: Math.round((i.frame.y / 100) * height),
        w: Math.max(1, Math.round((i.frame.w / 100) * width)),
        h: Math.max(1, Math.round((i.frame.h / 100) * height)),
      }));
    }

    if (mode === 'masonry') {
      const cols = n <= 4 ? 2 : 3;
      const colW = Math.floor((width - margin * 2 - gap * (cols - 1)) / cols);
      const colHeights = new Array(cols).fill(margin);
      const frames = [];
      for (let i = 0; i < n; i++) {
        let bestCol = 0;
        for (let c = 1; c < cols; c++) {
          if (colHeights[c] < colHeights[bestCol]) bestCol = c;
        }
        const item = state.images[i];
        const ratio = item?.img ? (item.img.naturalHeight / Math.max(1, item.img.naturalWidth)) : 0.75;
        const h = clamp(Math.round(colW * ratio), 120, Math.round(height * 0.55));
        const x = margin + bestCol * (colW + gap);
        const y = colHeights[bestCol];
        frames.push({ x, y, w: colW, h });
        colHeights[bestCol] += h + gap;
      }
      return frames;
    }

    const cols = Math.ceil(Math.sqrt(n));
    const rows = Math.ceil(n / cols);
    const tileW = Math.floor((width - margin * 2 - gap * (cols - 1)) / cols);
    const tileH = Math.floor((height - margin * 2 - gap * (rows - 1)) / rows);
    const out = [];
    for (let i = 0; i < n; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      out.push({
        x: margin + col * (tileW + gap),
        y: margin + row * (tileH + gap),
        w: tileW,
        h: tileH,
      });
    }
    return out;
  }

  function drawBackground(ctx, width, height) {
    if (state.background.mode === 'gradient') {
      const g = ctx.createLinearGradient(0, 0, width, height);
      g.addColorStop(0, state.background.color1);
      g.addColorStop(1, state.background.color2);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, width, height);
      return;
    }
    if (state.background.mode === 'texture') {
      ctx.fillStyle = state.background.color1;
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = state.background.color2 + '88';
      for (let i = 0; i < 1400; i++) {
        const x = Math.random() * width;
        const y = Math.random() * height;
        const s = Math.random() * 2 + 0.4;
        ctx.fillRect(x, y, s, s);
      }
      return;
    }
    ctx.fillStyle = state.background.color1;
    ctx.fillRect(0, 0, width, height);
  }

  function imageFilterString() {
    return `brightness(${state.filters.brightness}%) contrast(${state.filters.contrast}%) saturate(${state.filters.saturation}%)`;
  }

  function drawSingleImage(ctx, item, frame, withFilters) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(frame.x, frame.y, frame.w, frame.h);
    ctx.clip();

    if (item?.img) {
      if (withFilters) ctx.filter = imageFilterString();
      const t = item.transform;
      const centerX = frame.x + frame.w / 2 + t.panX;
      const centerY = frame.y + frame.h / 2 + t.panY;
      const sgnX = t.flipH ? -1 : 1;
      const sgnY = t.flipV ? -1 : 1;
      const cover = coverBox(item.img.naturalWidth, item.img.naturalHeight, frame.w, frame.h);

      ctx.translate(centerX, centerY);
      ctx.rotate((t.rotate * Math.PI) / 180);
      ctx.scale((t.zoom / 100) * sgnX, (t.zoom / 100) * sgnY);
      ctx.drawImage(item.img, -cover.w / 2, -cover.h / 2, cover.w, cover.h);
      ctx.filter = 'none';
    } else {
      ctx.fillStyle = '#111827';
      ctx.fillRect(frame.x, frame.y, frame.w, frame.h);
      ctx.strokeStyle = '#4b5563';
      ctx.strokeRect(frame.x + 1, frame.y + 1, frame.w - 2, frame.h - 2);
      ctx.fillStyle = '#9ca3af';
      ctx.font = '600 20px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Empty', frame.x + frame.w / 2, frame.y + frame.h / 2);
    }
    ctx.restore();
  }

  function drawWarmthOverlay(ctx, width, height) {
    if (state.filters.warmth === 0) return;
    const amt = Math.abs(state.filters.warmth) / 100;
    if (state.filters.warmth > 0) {
      ctx.fillStyle = `rgba(255,153,64,${amt})`;
    } else {
      ctx.fillStyle = `rgba(64,140,255,${amt})`;
    }
    ctx.fillRect(0, 0, width, height);
  }

  function drawGuides(ctx, width, height) {
    if (!state.layout.guides) return;
    ctx.save();
    ctx.strokeStyle = 'rgba(148,163,184,0.35)';
    ctx.lineWidth = 1;
    for (let p = 10; p < 100; p += 10) {
      const x = (p / 100) * width;
      const y = (p / 100) * height;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawTexts(ctx, width, height) {
    state.texts.forEach(t => {
      ctx.save();
      ctx.fillStyle = t.color || '#fff';
      ctx.font = `700 ${clamp(t.size || 52, 10, 240)}px sans-serif`;
      ctx.textAlign = t.align || 'center';
      ctx.textBaseline = 'middle';
      const x = (clamp(t.x || 50, 0, 100) / 100) * width;
      const y = (clamp(t.y || 12, 0, 100) / 100) * height;
      ctx.shadowColor = 'rgba(0,0,0,.45)';
      ctx.shadowBlur = 8;
      ctx.fillText(t.text || '', x, y);
      ctx.restore();
    });
  }

  function drawScene(ctx, width, height, withFilters) {
    drawBackground(ctx, width, height);
    const frames = computeFrames(width, height);
    for (let i = 0; i < state.layout.imageCount; i++) {
      drawSingleImage(ctx, state.images[i], frames[i], withFilters);
    }
    if (withFilters) drawWarmthOverlay(ctx, width, height);
    drawTexts(ctx, width, height);
    drawGuides(ctx, width, height);
  }

  function estimateQuality(frames) {
    let minRatio = Infinity;
    for (let i = 0; i < state.layout.imageCount; i++) {
      const item = state.images[i];
      const f = frames[i];
      if (!item?.img || !f) continue;
      const zoom = Math.max(0.01, item.transform.zoom / 100);
      const effectiveW = f.w * zoom;
      const effectiveH = f.h * zoom;
      const ratioW = item.img.naturalWidth / Math.max(1, effectiveW);
      const ratioH = item.img.naturalHeight / Math.max(1, effectiveH);
      minRatio = Math.min(minRatio, ratioW, ratioH);
    }
    if (!isFinite(minRatio)) {
      dom.qualityHint.textContent = 'Quality estimator: add images for quality analysis.';
      dom.qualityHint.className = 'quality-hint';
      return;
    }
    if (minRatio >= 1.6) {
      dom.qualityHint.textContent = `Quality estimator: Excellent (${minRatio.toFixed(2)}x source detail).`;
      dom.qualityHint.className = 'quality-hint good';
    } else if (minRatio >= 1.1) {
      dom.qualityHint.textContent = `Quality estimator: Good (${minRatio.toFixed(2)}x source detail).`;
      dom.qualityHint.className = 'quality-hint warn';
    } else {
      dom.qualityHint.textContent = `Quality estimator: Low (${minRatio.toFixed(2)}x). Export may look soft.`;
      dom.qualityHint.className = 'quality-hint bad';
    }
  }

  function render() {
    normalizeImageCount();
    ensureFreeformFrames();

    const W = state.canvas.width;
    const H = state.canvas.height;
    dom.canvas.width = W;
    dom.canvas.height = H;
    const ctx = dom.canvas.getContext('2d');

    if (state.compare.enabled) {
      const beforeCanvas = document.createElement('canvas');
      beforeCanvas.width = W;
      beforeCanvas.height = H;
      const bctx = beforeCanvas.getContext('2d');
      drawScene(bctx, W, H, false);

      const afterCanvas = document.createElement('canvas');
      afterCanvas.width = W;
      afterCanvas.height = H;
      const actx = afterCanvas.getContext('2d');
      drawScene(actx, W, H, true);

      ctx.drawImage(afterCanvas, 0, 0);
      const splitX = Math.round((state.compare.split / 100) * W);
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, splitX, H);
      ctx.clip();
      ctx.drawImage(beforeCanvas, 0, 0);
      ctx.restore();
      ctx.strokeStyle = '#60a5fa';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(splitX, 0);
      ctx.lineTo(splitX, H);
      ctx.stroke();
    } else {
      drawScene(ctx, W, H, true);
    }

    dom.canvas.classList.add('visible');
    dom.empty.classList.add('hidden');
    dom.downloadBtn.disabled = false;
    dom.downloadZipBtn.disabled = false;
    estimateQuality(computeFrames(W, H));
  }

  function syncA11yClasses() {
    document.body.classList.toggle('hc', !!state.a11y.contrast);
    document.body.classList.toggle('large-ui', !!state.a11y.largeUi);
    document.body.classList.toggle('reduce-motion', !!state.a11y.reduceMotion);
  }

  function syncLists() {
    dom.imageList.innerHTML = '';
    dom.selectedImage.innerHTML = '';
    state.images.forEach((img, idx) => {
      const row = document.createElement('div');
      row.className = `image-item${idx === state.selectedImage ? ' is-selected' : ''}`;
      row.draggable = true;
      row.innerHTML = `<span>${idx + 1}. ${escapeHtml(img.name || 'Image')}</span><button type="button">Select</button>`;
      row.querySelector('button').addEventListener('click', () => {
        state.selectedImage = idx;
        syncLists();
        syncImageControls();
      });
      row.addEventListener('dragstart', e => {
        e.dataTransfer.setData('text/plain', String(idx));
      });
      row.addEventListener('dragover', e => e.preventDefault());
      row.addEventListener('drop', e => {
        e.preventDefault();
        const from = parseInt(e.dataTransfer.getData('text/plain'), 10);
        const to = idx;
        if (!isFinite(from) || from === to) return;
        const moved = state.images.splice(from, 1)[0];
        state.images.splice(to, 0, moved);
        state.selectedImage = to;
        syncLists();
        syncImageControls();
        pushHistoryDebounced();
        autoSave();
        render();
      });
      dom.imageList.appendChild(row);

      const op = document.createElement('option');
      op.value = String(idx);
      op.textContent = `${idx + 1}. ${img.name || 'Image'}`;
      dom.selectedImage.appendChild(op);
    });
    dom.selectedImage.value = String(state.selectedImage);

    dom.textList.innerHTML = '';
    dom.selectedText.innerHTML = '';
    state.texts.forEach(t => {
      const row = document.createElement('div');
      row.className = `text-item${t.id === state.selectedTextId ? ' is-selected' : ''}`;
      row.innerHTML = `<span>${escapeHtml((t.text || 'Text').slice(0, 26))}</span><button type="button">Select</button>`;
      row.querySelector('button').addEventListener('click', () => {
        state.selectedTextId = t.id;
        syncLists();
        syncTextControls();
      });
      dom.textList.appendChild(row);

      const op = document.createElement('option');
      op.value = t.id;
      op.textContent = (t.text || 'Text').slice(0, 30);
      dom.selectedText.appendChild(op);
    });
    if (state.selectedTextId) dom.selectedText.value = state.selectedTextId;
  }

  function syncImageControls() {
    const i = state.images[state.selectedImage];
    if (!i) return;
    dom.zoom.value = String(i.transform.zoom);
    dom.panX.value = String(i.transform.panX);
    dom.panY.value = String(i.transform.panY);
    dom.rotate.value = String(i.transform.rotate);
    dom.flipH.checked = !!i.transform.flipH;
    dom.flipV.checked = !!i.transform.flipV;
    dom.zoomVal.textContent = `${i.transform.zoom}%`;
    dom.panXVal.textContent = String(i.transform.panX);
    dom.panYVal.textContent = String(i.transform.panY);
    dom.rotVal.textContent = `${i.transform.rotate}°`;

    const f = i.frame || { x: 0, y: 0, w: 30, h: 30 };
    dom.frameX.value = String(Math.round(f.x));
    dom.frameY.value = String(Math.round(f.y));
    dom.frameW.value = String(Math.round(f.w));
    dom.frameH.value = String(Math.round(f.h));
    dom.fxVal.textContent = `${Math.round(f.x)}%`;
    dom.fyVal.textContent = `${Math.round(f.y)}%`;
    dom.fwVal.textContent = `${Math.round(f.w)}%`;
    dom.fhVal.textContent = `${Math.round(f.h)}%`;
  }

  function syncTextControls() {
    const t = state.texts.find(x => x.id === state.selectedTextId);
    if (!t) return;
    dom.textContent.value = t.text || '';
    dom.textSize.value = String(t.size || 52);
    dom.textColor.value = t.color || '#ffffff';
    dom.textAlign.value = t.align || 'center';
    dom.textX.value = String(t.x || 50);
    dom.textY.value = String(t.y || 12);
  }

  function syncUIFromState() {
    dom.projectName.value = state.projectName;
    dom.outputPreset.value = state.canvas.outputPreset;
    dom.preset.value = state.canvas.preset;
    dom.width.value = String(state.canvas.width);
    dom.height.value = String(state.canvas.height);
    dom.customSize.hidden = state.canvas.preset !== 'custom';
    dom.imageCount.value = String(state.layout.imageCount);
    dom.layoutMode.value = state.layout.mode;
    dom.gap.value = String(state.layout.gap);
    dom.margin.value = String(state.layout.margin);
    dom.gapVal.textContent = `${state.layout.gap}px`;
    dom.marginVal.textContent = `${state.layout.margin}px`;
    dom.showGuides.checked = !!state.layout.guides;
    dom.compareEnabled.checked = !!state.compare.enabled;
    dom.compareWrap.hidden = !state.compare.enabled;
    dom.compareSplit.value = String(state.compare.split);
    dom.compareVal.textContent = `${state.compare.split}%`;
    dom.bgMode.value = state.background.mode;
    dom.bgColor1.value = state.background.color1;
    dom.bgColor2.value = state.background.color2;
    dom.brightness.value = String(state.filters.brightness);
    dom.contrast.value = String(state.filters.contrast);
    dom.saturation.value = String(state.filters.saturation);
    dom.warmth.value = String(state.filters.warmth);
    dom.briVal.textContent = `${state.filters.brightness}%`;
    dom.conVal.textContent = `${state.filters.contrast}%`;
    dom.satVal.textContent = `${state.filters.saturation}%`;
    dom.warmVal.textContent = `${state.filters.warmth}%`;
    dom.format.value = state.export.format;
    dom.quality.value = String(state.export.quality);
    dom.a11yContrast.checked = !!state.a11y.contrast;
    dom.a11yLargeUi.checked = !!state.a11y.largeUi;
    dom.a11yReduceMotion.checked = !!state.a11y.reduceMotion;
    dom.freeformEditor.hidden = state.layout.mode !== 'freeform';
    syncA11yClasses();
    syncLists();
    syncImageControls();
    syncTextControls();
  }

  function autoSave() {
    try {
      localStorage.setItem(STORAGE.autosave, JSON.stringify(serializableState()));
    } catch (_) {}
  }
  const autoSaveDebounced = debounce(autoSave, 260);

  function loadProjectsStore() {
    try {
      const raw = localStorage.getItem(STORAGE.projects);
      const parsed = raw ? JSON.parse(raw) : {};
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (_) {
      return {};
    }
  }
  function saveProjectsStore(store) {
    try { localStorage.setItem(STORAGE.projects, JSON.stringify(store)); } catch (_) {}
  }
  function refreshProjectSelect() {
    const store = loadProjectsStore();
    dom.projectSelect.innerHTML = '';
    const names = Object.keys(store).sort();
    if (names.length === 0) {
      const op = document.createElement('option');
      op.value = '';
      op.textContent = 'No saved projects';
      dom.projectSelect.appendChild(op);
      return;
    }
    names.forEach(n => {
      const op = document.createElement('option');
      op.value = n;
      op.textContent = n;
      dom.projectSelect.appendChild(op);
    });
    if (names.includes(state.projectName)) dom.projectSelect.value = state.projectName;
  }

  function saveProject() {
    const name = (dom.projectName.value || '').trim();
    if (!name) {
      setStatus('Project name is required.');
      return;
    }
    state.projectName = name;
    const store = loadProjectsStore();
    store[name] = serializableState();
    saveProjectsStore(store);
    refreshProjectSelect();
    setStatus(`Saved project "${name}".`);
  }

  async function loadProject(name) {
    const store = loadProjectsStore();
    const data = store[name];
    if (!data) {
      setStatus('Project not found.');
      return;
    }
    state.historyPast = [];
    state.historyFuture = [];
    await applySerializableState(data);
    updateHistoryButtons();
    setStatus(`Loaded project "${name}".`);
  }

  function deleteProject(name) {
    const store = loadProjectsStore();
    if (!store[name]) return;
    delete store[name];
    saveProjectsStore(store);
    refreshProjectSelect();
    setStatus(`Deleted project "${name}".`);
  }

  function newProject() {
    const next = {
      projectName: 'My collage project',
      canvas: { preset: '1080x1080', outputPreset: 'custom', width: 1080, height: 1080 },
      layout: { imageCount: 4, mode: 'grid', gap: 16, margin: 24, guides: false },
      compare: { enabled: false, split: 50 },
      background: { mode: 'solid', color1: '#111827', color2: '#1f2937' },
      filters: { brightness: 100, contrast: 100, saturation: 100, warmth: 0 },
      images: [],
      selectedImage: 0,
      texts: [],
      selectedTextId: null,
      export: { format: 'image/jpeg', quality: 0.9 },
      a11y: { contrast: false, largeUi: false, reduceMotion: false },
    };
    state.historyPast = [];
    state.historyFuture = [];
    applySerializableState(next);
    updateHistoryButtons();
    setStatus('Started new project.');
  }

  function exportTemplateJson() {
    const blob = new Blob([JSON.stringify(serializableState(), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(state.projectName || 'collage').replace(/\s+/g, '-').toLowerCase()}.cmproj.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function escapeHtml(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  async function renderToBlob(mime, quality) {
    render();
    return new Promise((resolve, reject) => {
      dom.canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Export failed')), mime, quality);
    });
  }

  async function downloadCurrent() {
    if (!state.images.some(i => i.img)) {
      setStatus('Upload at least one image first.');
      return;
    }
    const blob = await renderToBlob(state.export.format, state.export.quality);
    const ext = state.export.format === 'image/png' ? 'png' : 'jpg';
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `custom-collage-${Date.now()}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
    setStatus('Downloaded collage.');
  }

  function crc32(bytes) {
    let c = ~0;
    for (let i = 0; i < bytes.length; i++) {
      c ^= bytes[i];
      for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xEDB88320 & -(c & 1));
    }
    return ~c >>> 0;
  }
  function u16(v) { return [v & 255, (v >>> 8) & 255]; }
  function u32(v) { return [v & 255, (v >>> 8) & 255, (v >>> 16) & 255, (v >>> 24) & 255]; }
  function strBytes(s) { return new TextEncoder().encode(s); }
  function concat(chunks) {
    const len = chunks.reduce((n, c) => n + c.length, 0);
    const out = new Uint8Array(len);
    let o = 0;
    chunks.forEach(c => { out.set(c, o); o += c.length; });
    return out;
  }

  async function makeZip(files) {
    const local = [];
    const central = [];
    let offset = 0;
    for (const f of files) {
      const name = strBytes(f.name);
      const data = new Uint8Array(await f.blob.arrayBuffer());
      const crc = crc32(data);

      const localHeader = new Uint8Array([
        ...u32(0x04034b50), ...u16(20), ...u16(0), ...u16(0), ...u16(0), ...u16(0),
        ...u32(crc), ...u32(data.length), ...u32(data.length), ...u16(name.length), ...u16(0),
      ]);
      local.push(localHeader, name, data);

      const centralHeader = new Uint8Array([
        ...u32(0x02014b50), ...u16(20), ...u16(20), ...u16(0), ...u16(0), ...u16(0), ...u16(0),
        ...u32(crc), ...u32(data.length), ...u32(data.length),
        ...u16(name.length), ...u16(0), ...u16(0), ...u16(0), ...u16(0),
        ...u32(0), ...u32(offset),
      ]);
      central.push(centralHeader, name);
      offset += localHeader.length + name.length + data.length;
    }
    const centralBytes = concat(central.map(c => c instanceof Uint8Array ? c : new Uint8Array(c)));
    const localBytes = concat(local.map(c => c instanceof Uint8Array ? c : new Uint8Array(c)));
    const end = new Uint8Array([
      ...u32(0x06054b50), ...u16(0), ...u16(0), ...u16(files.length), ...u16(files.length),
      ...u32(centralBytes.length), ...u32(localBytes.length), ...u16(0),
    ]);
    return new Blob([localBytes, centralBytes, end], { type: 'application/zip' });
  }

  async function exportZipPackage() {
    if (!state.images.some(i => i.img)) {
      setStatus('Upload at least one image first.');
      return;
    }
    setStatus('Building ZIP package...');
    const jpg = await renderToBlob('image/jpeg', 0.92);
    const png = await renderToBlob('image/png', 1);
    const project = new Blob([JSON.stringify(serializableState(), null, 2)], { type: 'application/json' });

    const zipBlob = await makeZip([
      { name: 'collage.jpg', blob: jpg },
      { name: 'collage.png', blob: png },
      { name: 'project.cmproj.json', blob: project },
    ]);
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(state.projectName || 'collage').replace(/\s+/g, '-').toLowerCase()}-package.zip`;
    a.click();
    URL.revokeObjectURL(url);
    setStatus('ZIP package exported.');
  }

  function updateShareUrl() {
    const json = JSON.stringify(serializableState());
    const b64 = btoa(unescape(encodeURIComponent(json))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
    const url = `${location.origin}${location.pathname}#state=${b64}`;
    dom.shareUrl.value = url;
    return url;
  }

  async function loadFromHashIfPresent() {
    const m = location.hash.match(/state=([^&]+)/);
    if (!m) return false;
    try {
      const base = m[1].replace(/-/g, '+').replace(/_/g, '/');
      const pad = base + '==='.slice((base.length + 3) % 4);
      const json = decodeURIComponent(escape(atob(pad)));
      const parsed = JSON.parse(json);
      await applySerializableState(parsed);
      setStatus('Loaded project from shared link.');
      return true;
    } catch (_) {
      setStatus('Could not parse shared link state.');
      return false;
    }
  }

  function onAnyChange(commit = true) {
    syncUIFromState();
    render();
    if (commit) {
      pushHistoryDebounced();
      autoSaveDebounced();
      updateShareUrl();
    }
  }

  async function handleUpload(files) {
    const picked = [...files].filter(f => f.type.startsWith('image/'));
    if (picked.length === 0) return;
    setStatus(`Loading ${picked.length} image(s)...`);
    for (const file of picked) {
      const src = await fileToDataUrl(file);
      const img = await loadImageFromSrc(src);
      state.images.push(makeDefaultImageEntry(src, file.name, img));
    }
    normalizeImageCount();
    state.selectedImage = clamp(state.selectedImage, 0, state.layout.imageCount - 1);
    setStatus(`Loaded ${picked.length} image(s).`);
    onAnyChange(true);
  }

  function bindEvents() {
    dom.newProjectBtn.addEventListener('click', () => newProject());
    dom.saveProjectBtn.addEventListener('click', () => saveProject());
    dom.loadProjectBtn.addEventListener('click', () => {
      if (dom.projectSelect.value) loadProject(dom.projectSelect.value);
    });
    dom.deleteProjectBtn.addEventListener('click', () => {
      if (dom.projectSelect.value) deleteProject(dom.projectSelect.value);
    });
    dom.undoBtn.addEventListener('click', () => undo());
    dom.redoBtn.addEventListener('click', () => redo());
    dom.shareBtn.addEventListener('click', async () => {
      const url = updateShareUrl();
      try {
        await navigator.clipboard.writeText(url);
        setStatus('Share link copied to clipboard.');
      } catch (_) {
        setStatus('Share link ready below. Copy manually if needed.');
      }
    });

    dom.projectName.addEventListener('input', () => {
      state.projectName = dom.projectName.value.trim() || 'My collage project';
      updateShareUrl();
      autoSaveDebounced();
    });

    dom.outputPreset.addEventListener('change', () => {
      state.canvas.outputPreset = dom.outputPreset.value;
      const p = outputPresetToSize(dom.outputPreset.value);
      if (p) {
        state.canvas.width = p.w;
        state.canvas.height = p.h;
        state.canvas.preset = 'custom';
      }
      onAnyChange(true);
    });
    dom.preset.addEventListener('change', () => {
      state.canvas.preset = dom.preset.value;
      if (dom.preset.value !== 'custom') {
        const [w, h] = dom.preset.value.split('x').map(Number);
        state.canvas.width = w;
        state.canvas.height = h;
      }
      onAnyChange(true);
    });
    dom.width.addEventListener('input', () => {
      state.canvas.width = clamp(parseInt(dom.width.value, 10) || 1080, 200, 8000);
      onAnyChange(true);
    });
    dom.height.addEventListener('input', () => {
      state.canvas.height = clamp(parseInt(dom.height.value, 10) || 1080, 200, 8000);
      onAnyChange(true);
    });
    dom.imageCount.addEventListener('change', () => {
      state.layout.imageCount = parseInt(dom.imageCount.value, 10);
      normalizeImageCount();
      onAnyChange(true);
    });
    dom.layoutMode.addEventListener('change', () => {
      state.layout.mode = dom.layoutMode.value;
      onAnyChange(true);
    });
    dom.gap.addEventListener('input', () => {
      state.layout.gap = parseInt(dom.gap.value, 10);
      dom.gapVal.textContent = `${state.layout.gap}px`;
      onAnyChange(true);
    });
    dom.margin.addEventListener('input', () => {
      state.layout.margin = parseInt(dom.margin.value, 10);
      dom.marginVal.textContent = `${state.layout.margin}px`;
      onAnyChange(true);
    });
    dom.showGuides.addEventListener('change', () => {
      state.layout.guides = dom.showGuides.checked;
      onAnyChange(true);
    });
    dom.compareEnabled.addEventListener('change', () => {
      state.compare.enabled = dom.compareEnabled.checked;
      onAnyChange(true);
    });
    dom.compareSplit.addEventListener('input', () => {
      state.compare.split = parseInt(dom.compareSplit.value, 10);
      dom.compareVal.textContent = `${state.compare.split}%`;
      onAnyChange(false);
    });
    dom.compareSplit.addEventListener('change', () => {
      pushHistoryDebounced();
      autoSaveDebounced();
    });

    dom.bgMode.addEventListener('change', () => { state.background.mode = dom.bgMode.value; onAnyChange(true); });
    dom.bgColor1.addEventListener('input', () => { state.background.color1 = dom.bgColor1.value; onAnyChange(true); });
    dom.bgColor2.addEventListener('input', () => { state.background.color2 = dom.bgColor2.value; onAnyChange(true); });
    dom.brightness.addEventListener('input', () => {
      state.filters.brightness = parseInt(dom.brightness.value, 10);
      dom.briVal.textContent = `${state.filters.brightness}%`;
      onAnyChange(true);
    });
    dom.contrast.addEventListener('input', () => {
      state.filters.contrast = parseInt(dom.contrast.value, 10);
      dom.conVal.textContent = `${state.filters.contrast}%`;
      onAnyChange(true);
    });
    dom.saturation.addEventListener('input', () => {
      state.filters.saturation = parseInt(dom.saturation.value, 10);
      dom.satVal.textContent = `${state.filters.saturation}%`;
      onAnyChange(true);
    });
    dom.warmth.addEventListener('input', () => {
      state.filters.warmth = parseInt(dom.warmth.value, 10);
      dom.warmVal.textContent = `${state.filters.warmth}%`;
      onAnyChange(true);
    });

    dom.files.addEventListener('change', e => {
      handleUpload(e.target.files).catch(err => {
        console.error(err);
        setStatus('Could not load one or more images.');
      });
      e.target.value = '';
    });
    dom.selectedImage.addEventListener('change', () => {
      state.selectedImage = parseInt(dom.selectedImage.value, 10) || 0;
      syncLists();
      syncImageControls();
    });

    function withSelectedImage(fn) {
      const i = state.images[state.selectedImage];
      if (!i) return;
      fn(i);
      onAnyChange(true);
    }
    dom.zoom.addEventListener('input', () => withSelectedImage(i => { i.transform.zoom = parseInt(dom.zoom.value, 10); }));
    dom.panX.addEventListener('input', () => withSelectedImage(i => { i.transform.panX = parseInt(dom.panX.value, 10); }));
    dom.panY.addEventListener('input', () => withSelectedImage(i => { i.transform.panY = parseInt(dom.panY.value, 10); }));
    dom.rotate.addEventListener('input', () => withSelectedImage(i => { i.transform.rotate = parseInt(dom.rotate.value, 10); }));
    dom.flipH.addEventListener('change', () => withSelectedImage(i => { i.transform.flipH = dom.flipH.checked; }));
    dom.flipV.addEventListener('change', () => withSelectedImage(i => { i.transform.flipV = dom.flipV.checked; }));
    dom.frameX.addEventListener('input', () => withSelectedImage(i => { i.frame.x = parseInt(dom.frameX.value, 10); }));
    dom.frameY.addEventListener('input', () => withSelectedImage(i => { i.frame.y = parseInt(dom.frameY.value, 10); }));
    dom.frameW.addEventListener('input', () => withSelectedImage(i => { i.frame.w = parseInt(dom.frameW.value, 10); }));
    dom.frameH.addEventListener('input', () => withSelectedImage(i => { i.frame.h = parseInt(dom.frameH.value, 10); }));

    dom.moveUpBtn.addEventListener('click', () => {
      const i = state.selectedImage;
      if (i <= 0) return;
      const t = state.images[i - 1];
      state.images[i - 1] = state.images[i];
      state.images[i] = t;
      state.selectedImage = i - 1;
      onAnyChange(true);
    });
    dom.moveDownBtn.addEventListener('click', () => {
      const i = state.selectedImage;
      if (i >= state.layout.imageCount - 1) return;
      const t = state.images[i + 1];
      state.images[i + 1] = state.images[i];
      state.images[i] = t;
      state.selectedImage = i + 1;
      onAnyChange(true);
    });

    dom.addTextBtn.addEventListener('click', () => {
      const t = { id: uid('txt'), text: 'New text', size: 52, color: '#ffffff', x: 50, y: 12, align: 'center' };
      state.texts.push(t);
      state.selectedTextId = t.id;
      onAnyChange(true);
    });
    dom.removeTextBtn.addEventListener('click', () => {
      if (!state.selectedTextId) return;
      state.texts = state.texts.filter(t => t.id !== state.selectedTextId);
      state.selectedTextId = state.texts[0]?.id || null;
      onAnyChange(true);
    });
    dom.selectedText.addEventListener('change', () => {
      state.selectedTextId = dom.selectedText.value || null;
      syncLists();
      syncTextControls();
    });
    function withSelectedText(fn) {
      const t = state.texts.find(x => x.id === state.selectedTextId);
      if (!t) return;
      fn(t);
      onAnyChange(true);
    }
    dom.textContent.addEventListener('input', () => withSelectedText(t => { t.text = dom.textContent.value; }));
    dom.textSize.addEventListener('input', () => withSelectedText(t => { t.size = clamp(parseInt(dom.textSize.value, 10) || 52, 10, 240); }));
    dom.textColor.addEventListener('input', () => withSelectedText(t => { t.color = dom.textColor.value; }));
    dom.textAlign.addEventListener('change', () => withSelectedText(t => { t.align = dom.textAlign.value; }));
    dom.textX.addEventListener('input', () => withSelectedText(t => { t.x = parseInt(dom.textX.value, 10); }));
    dom.textY.addEventListener('input', () => withSelectedText(t => { t.y = parseInt(dom.textY.value, 10); }));

    dom.exportTemplateBtn.addEventListener('click', () => exportTemplateJson());
    dom.importTemplateBtn.addEventListener('click', () => dom.templateInput.click());
    dom.templateInput.addEventListener('change', async e => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const txt = await file.text();
        const parsed = JSON.parse(txt);
        await applySerializableState(parsed);
        setStatus('Template imported.');
      } catch (_) {
        setStatus('Template import failed.');
      }
      e.target.value = '';
    });

    dom.format.addEventListener('change', () => { state.export.format = dom.format.value; autoSaveDebounced(); });
    dom.quality.addEventListener('change', () => { state.export.quality = parseFloat(dom.quality.value); autoSaveDebounced(); });
    dom.downloadBtn.addEventListener('click', () => downloadCurrent().catch(err => {
      console.error(err);
      setStatus('Download failed.');
    }));
    dom.downloadZipBtn.addEventListener('click', () => exportZipPackage().catch(err => {
      console.error(err);
      setStatus('ZIP export failed.');
    }));

    dom.a11yContrast.addEventListener('change', () => { state.a11y.contrast = dom.a11yContrast.checked; onAnyChange(true); });
    dom.a11yLargeUi.addEventListener('change', () => { state.a11y.largeUi = dom.a11yLargeUi.checked; onAnyChange(true); });
    dom.a11yReduceMotion.addEventListener('change', () => { state.a11y.reduceMotion = dom.a11yReduceMotion.checked; onAnyChange(true); });

    dom.tipsBtn.addEventListener('click', () => dom.tipsDialog.showModal());

    window.addEventListener('keydown', e => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        saveProject();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo(); else undo();
      }
      if (e.key === 'Delete') {
        if (document.activeElement === dom.selectedText || document.activeElement === dom.textContent) return;
        if (state.selectedTextId) {
          state.texts = state.texts.filter(t => t.id !== state.selectedTextId);
          state.selectedTextId = state.texts[0]?.id || null;
          onAnyChange(true);
        }
      }
    });
  }

  async function boot() {
    refreshProjectSelect();
    normalizeImageCount();
    state.texts = [{ id: uid('txt'), text: 'Your title', size: 52, color: '#ffffff', x: 50, y: 12, align: 'center' }];
    state.selectedTextId = state.texts[0].id;
    syncUIFromState();
    updateShareUrl();
    updateHistoryButtons();

    const loadedFromHash = await loadFromHashIfPresent();
    if (!loadedFromHash) {
      try {
        const raw = localStorage.getItem(STORAGE.autosave);
        if (raw) {
          await applySerializableState(JSON.parse(raw));
          setStatus('Restored autosaved project.');
        }
      } catch (_) {}
    }

    if (!localStorage.getItem(STORAGE.seenTips)) {
      dom.tipsDialog.showModal();
      localStorage.setItem(STORAGE.seenTips, '1');
    }

    bindEvents();
    syncUIFromState();
    render();
    updateShareUrl();

    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js?v=20260714-4').catch(err => {
          console.error('[CustomStudio] SW registration failed:', err);
        });
      });
    }
  }

  boot();
})();
