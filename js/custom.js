(function () {
  const $ = id => document.getElementById(id);
  const dom = {
    preset: $('preset'),
    customSize: $('customSize'),
    width: $('width'),
    height: $('height'),
    imageCount: $('imageCount'),
    files: $('files'),
    gap: $('gap'),
    margin: $('margin'),
    gapVal: $('gapVal'),
    marginVal: $('marginVal'),
    bgColor: $('bgColor'),
    format: $('format'),
    quality: $('quality'),
    downloadBtn: $('downloadBtn'),
    status: $('status'),
    canvas: $('canvas'),
    empty: $('empty'),
  };

  const state = {
    images: [],
  };

  function readSize() {
    if (dom.preset.value !== 'custom') {
      const [w, h] = dom.preset.value.split('x').map(Number);
      return { w, h };
    }
    return {
      w: Math.max(200, parseInt(dom.width.value, 10) || 1080),
      h: Math.max(200, parseInt(dom.height.value, 10) || 1080),
    };
  }

  function coverFit(natW, natH, dw, dh) {
    const srcAspect = natW / natH;
    const dstAspect = dw / dh;
    if (srcAspect > dstAspect) {
      const sw = natH * dstAspect;
      return { sx: (natW - sw) / 2, sy: 0, sw, sh: natH };
    }
    const sh = natW / dstAspect;
    return { sx: 0, sy: (natH - sh) / 2, sw: natW, sh };
  }

  async function loadImage(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('Could not decode image.'));
        img.src = reader.result;
      };
      reader.onerror = () => reject(new Error('Could not read file.'));
      reader.readAsDataURL(file);
    });
  }

  function drawPlaceholder(ctx, x, y, w, h, i) {
    ctx.fillStyle = '#1f2937';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
    ctx.fillStyle = '#9ca3af';
    ctx.font = '600 24px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(i + 1), x + w / 2, y + h / 2);
  }

  function render() {
    const count = parseInt(dom.imageCount.value, 10);
    const { w: W, h: H } = readSize();
    const gap = parseInt(dom.gap.value, 10);
    const margin = parseInt(dom.margin.value, 10);

    const canvas = dom.canvas;
    const ctx = canvas.getContext('2d');
    canvas.width = W;
    canvas.height = H;

    ctx.fillStyle = dom.bgColor.value;
    ctx.fillRect(0, 0, W, H);

    const cols = Math.ceil(Math.sqrt(count));
    const rows = Math.ceil(count / cols);
    const tileW = Math.floor((W - margin * 2 - gap * (cols - 1)) / cols);
    const tileH = Math.floor((H - margin * 2 - gap * (rows - 1)) / rows);

    for (let i = 0; i < count; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = margin + col * (tileW + gap);
      const y = margin + row * (tileH + gap);
      const img = state.images[i];

      if (!img) {
        drawPlaceholder(ctx, x, y, tileW, tileH, i);
        continue;
      }

      const { sx, sy, sw, sh } = coverFit(img.naturalWidth, img.naturalHeight, tileW, tileH);
      ctx.drawImage(img, sx, sy, sw, sh, x, y, tileW, tileH);
    }

    dom.canvas.classList.add('visible');
    dom.empty.classList.add('hidden');
    dom.downloadBtn.disabled = false;
  }

  function setStatus(text) {
    dom.status.textContent = text;
  }

  async function handleFiles(fileList) {
    const wanted = parseInt(dom.imageCount.value, 10);
    const imageFiles = [...fileList].filter(f => f.type.startsWith('image/')).slice(0, wanted);
    if (imageFiles.length === 0) {
      setStatus('Please select image files.');
      return;
    }

    setStatus(`Loading ${imageFiles.length} image(s)...`);
    state.images = await Promise.all(imageFiles.map(loadImage));
    render();
    setStatus(`Ready: loaded ${state.images.length}/${wanted} image slots.`);
  }

  function updatePresetUi() {
    dom.customSize.hidden = dom.preset.value !== 'custom';
  }

  dom.preset.addEventListener('change', () => {
    updatePresetUi();
    if (state.images.length) render();
  });
  dom.imageCount.addEventListener('change', () => {
    if (state.images.length) render();
  });
  dom.gap.addEventListener('input', () => {
    dom.gapVal.textContent = `${dom.gap.value}px`;
    if (state.images.length) render();
  });
  dom.margin.addEventListener('input', () => {
    dom.marginVal.textContent = `${dom.margin.value}px`;
    if (state.images.length) render();
  });
  dom.bgColor.addEventListener('input', () => {
    if (state.images.length) render();
  });
  dom.width.addEventListener('input', () => { if (state.images.length) render(); });
  dom.height.addEventListener('input', () => { if (state.images.length) render(); });
  dom.files.addEventListener('change', e => {
    handleFiles(e.target.files).catch(err => {
      console.error('[CustomStudio] file load error', err);
      setStatus('Could not load one or more files.');
    });
  });

  dom.downloadBtn.addEventListener('click', () => {
    if (!state.images.length) return;
    const mimeType = dom.format.value;
    const quality = parseFloat(dom.quality.value);
    const ext = mimeType === 'image/png' ? 'png' : 'jpg';
    dom.canvas.toBlob(blob => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `custom-collage-${Date.now()}.${ext}`;
      a.click();
      URL.revokeObjectURL(url);
    }, mimeType, quality);
  });

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js?v=20260714-1').catch(err => {
        console.error('[CustomStudio] SW registration failed:', err);
      });
    });
  }

  updatePresetUi();
})();
