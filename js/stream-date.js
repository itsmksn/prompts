/* ========================================================
   ІНСТРУМЕНТ: ДАТА СТРІМУ НА ПРЕВ'Ю (LIQUID GLASS)
   ======================================================== */

let streamDateOriginalFile = null;
let streamDateLoadedImage = null;
let streamDateLastResultBlob = null;
let streamDateLastResultUrl = null;
let streamDateLastOutputName = '';

function openStreamDateTool() {
  closeNav();
  streamDateOriginalFile = null;
  streamDateLoadedImage = null;
  if (streamDateLastResultUrl) {
    URL.revokeObjectURL(streamDateLastResultUrl);
    streamDateLastResultUrl = null;
  }

  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="converter-container">
      <div class="prompt-title">Дата стріму на зображення</div>
      <div class="converter-desc">
        Автоматично адаптує прев'ю під 16:9 та накладає дату стріму у фірмовому стилі Liquid Glass (рідке скло з ефектом лінзи, розсіяною фаскою та м'яким блумом).
      </div>

      <!-- Зона завантаження зображення -->
      <div class="drop-zone" id="sd-drop-zone" onclick="triggerSdFileInput()">
        <input type="file" id="sd-file-input" accept="image/*" onchange="handleSdFileSelect(this.files)" />
        <svg class="drop-zone-icon" viewBox="0 0 24 24">
          <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
        </svg>
        <div class="drop-zone-text">Оберіть або перетягніть прев'ю стріму</div>
        <div class="drop-zone-sub">Підтримуються JPG, PNG, WEBP та інші формати зображень</div>
      </div>

      <!-- Панель налаштування та введення дати (з'являється після вибору файлу) -->
      <div class="sd-config-card" id="sd-config-card" style="display: none;">
        <div class="sd-preview-box">
          <img id="sd-thumb-preview" class="sd-thumb-display" alt="Обране зображення" />
          <div class="sd-file-meta-row">
            <div class="file-info-details" style="min-width: 0; overflow: hidden;">
              <div class="file-name" id="sd-file-name">зображення.jpg</div>
              <div class="file-size" id="sd-file-size">0 МБ · 1920×1080 px</div>
            </div>
            <button class="reset-btn" onclick="resetSdTool()">Змінити фото</button>
          </div>
        </div>

        <div class="sd-input-section">
          <label for="sd-date-input" class="sd-input-label">Введіть або відредагуйте дату стріму:</label>
          <div class="sd-input-wrap">
            <input
              type="text"
              id="sd-date-input"
              class="sd-text-input"
              placeholder="наприклад: 24.11 / 19:00"
              autocomplete="off"
              spellcheck="false"
              onkeydown="if(event.key === 'Enter') { event.preventDefault(); processStreamDateImage(); }"
            />
            <button class="primary-convert-btn" id="sd-ok-btn" onclick="processStreamDateImage()">
              ОК
            </button>
          </div>
        </div>
      </div>

      <!-- Індикатор прогресу обробки -->
      <div class="progress-box" id="sd-progress-box">
        <div class="progress-status">
          <span id="sd-progress-text">Генерація Liquid Glass...</span>
          <span id="sd-progress-percent">50%</span>
        </div>
        <div class="progress-track">
          <div class="progress-fill" id="sd-progress-fill" style="width: 50%;"></div>
        </div>
      </div>

      <!-- Результат обробки -->
      <div class="result-box" id="sd-result-box">
        <div class="result-header">
          <svg style="width:20px;height:20px;fill:currentColor;" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
          </svg>
          <span>Дату успішно додано! Завантаження розпочато автоматично.</span>
        </div>
        
        <div class="sd-preview-container">
          <img id="sd-result-img" class="sd-result-preview" alt="Результат" />
        </div>

        <div class="action-controls" style="margin-top: 0.5rem; flex-wrap: wrap;">
          <a href="#" class="download-btn" id="sd-download-btn" download="">
            Завантажити ще раз (.jpg)
          </a>
          <button class="reset-btn" onclick="openDateChangeSection()">
            Змінити дату на цьому ж фото
          </button>
          <button class="reset-btn" onclick="resetSdTool()">
            Додати дату на інше зображення
          </button>
        </div>
      </div>
    </div>
  `;

  initSdDragEvents();
}

function triggerSdFileInput() {
  const input = document.getElementById('sd-file-input');
  if (input) input.click();
}

function initSdDragEvents() {
  const dropZone = document.getElementById('sd-drop-zone');
  if (!dropZone) return;

  ['dragenter', 'dragover'].forEach(eventName => {
    dropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.add('dragover');
    });
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.remove('dragover');
    });
  });

  dropZone.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    if (dt && dt.files && dt.files.length > 0) {
      handleSdFileSelect(dt.files);
    }
  });
}

function handleSdFileSelect(files) {
  if (!files || files.length === 0) return;
  const file = files[0];
  if (!file.type.startsWith('image/')) {
    alert("Будь ласка, оберіть файл зображення (JPG, PNG, WEBP тощо).");
    return;
  }

  streamDateOriginalFile = file;

  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      streamDateLoadedImage = img;
      displaySdConfig(file, img);
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function displaySdConfig(file, img) {
  const dropZone = document.getElementById('sd-drop-zone');
  const configCard = document.getElementById('sd-config-card');
  const resultBox = document.getElementById('sd-result-box');
  const thumbPreview = document.getElementById('sd-thumb-preview');
  const fileNameEl = document.getElementById('sd-file-name');
  const fileSizeEl = document.getElementById('sd-file-size');
  const dateInput = document.getElementById('sd-date-input');

  if (dropZone) dropZone.style.display = 'none';
  if (resultBox) resultBox.style.display = 'none';
  if (configCard) configCard.style.display = 'flex';

  if (thumbPreview) thumbPreview.src = img.src;
  if (fileNameEl) fileNameEl.textContent = file.name;
  if (fileSizeEl) {
    fileSizeEl.textContent = `${formatFileSize(file.size)} · ${img.naturalWidth}×${img.naturalHeight} px`;
  }

  if (dateInput) {
    dateInput.focus();
    // Якщо поле пусте, спробуємо зчитати з буфера, або залишимо фокус
    if (!dateInput.value) {
      tryReadClipboardToInput(dateInput);
    } else {
      dateInput.select();
    }
  }
}

async function tryReadClipboardToInput(inputEl) {
  try {
    if (navigator.clipboard && navigator.clipboard.readText) {
      const clip = await navigator.clipboard.readText();
      if (clip && clip.trim().length > 0 && clip.trim().length <= 30) {
        inputEl.value = clip.trim();
        inputEl.select();
      }
    }
  } catch (e) {
    // Ігноруємо відмову в доступі до буфера
  }
}

function openDateChangeSection() {
  const configCard = document.getElementById('sd-config-card');
  const dateInput = document.getElementById('sd-date-input');
  if (configCard) configCard.style.display = 'flex';
  if (dateInput) {
    dateInput.focus();
    dateInput.select();
  }
}

function resetSdTool() {
  streamDateOriginalFile = null;
  streamDateLoadedImage = null;
  if (streamDateLastResultUrl) {
    URL.revokeObjectURL(streamDateLastResultUrl);
    streamDateLastResultUrl = null;
  }

  const dropZone = document.getElementById('sd-drop-zone');
  const configCard = document.getElementById('sd-config-card');
  const resultBox = document.getElementById('sd-result-box');
  const progressBox = document.getElementById('sd-progress-box');
  const fileInput = document.getElementById('sd-file-input');

  if (fileInput) fileInput.value = '';
  if (dropZone) dropZone.style.display = 'block';
  if (configCard) configCard.style.display = 'none';
  if (resultBox) resultBox.style.display = 'none';
  if (progressBox) progressBox.style.display = 'none';
}

/* ========================================================
   АЛГОРИТМ РЕНДЕРИНГУ LIQUID GLASS (100% ВІДПОВІДНІСТЬ PYTHON)
   ======================================================== */

async function processStreamDateImage() {
  if (!streamDateLoadedImage || !streamDateOriginalFile) return;

  const dateInput = document.getElementById('sd-date-input');
  const dateText = dateInput ? dateInput.value.trim() : '';
  if (!dateText) {
    alert("Будь ласка, введіть дату стріму (наприклад: 24.11 / 19:00).");
    if (dateInput) dateInput.focus();
    return;
  }

  const okBtn = document.getElementById('sd-ok-btn');
  const progressBox = document.getElementById('sd-progress-box');
  const progressText = document.getElementById('sd-progress-text');
  const progressFill = document.getElementById('sd-progress-fill');
  const progressPercent = document.getElementById('sd-progress-percent');

  if (okBtn) okBtn.disabled = true;
  if (progressBox) progressBox.style.display = 'flex';
  if (progressText) progressText.innerText = "Адаптація 16:9 та розрахунок геометрії...";
  if (progressFill) progressFill.style.width = "25%";
  if (progressPercent) progressPercent.innerText = "25%";

  await new Promise(r => setTimeout(r, 20));

  try {
    const rawImg = streamDateLoadedImage;
    const rawW = rawImg.naturalWidth;
    const rawH = rawImg.naturalHeight;

    // 1. Адаптація під 16:9 (кадрування по центру як у Python)
    const targetRatio = 16 / 9;
    const currentRatio = rawW / rawH;

    let cropX = 0, cropY = 0, cropW = rawW, cropH = rawH;
    if (Math.abs(currentRatio - targetRatio) > 0.01) {
      if (currentRatio > targetRatio) {
        cropW = Math.round(rawH * targetRatio);
        cropX = Math.round((rawW - cropW) / 2);
      } else {
        cropH = Math.round(rawW / targetRatio);
        cropY = Math.round((rawH - cropH) / 2);
      }
    }

    const w = cropW;
    const h = cropH;

    // Створюємо основне полотно з обрізаним 16:9 зображенням
    const mainCanvas = document.createElement('canvas');
    mainCanvas.width = w;
    mainCanvas.height = h;
    const ctx = mainCanvas.getContext('2d');
    ctx.drawImage(rawImg, cropX, cropY, cropW, cropH, 0, 0, w, h);

    if (progressText) progressText.innerText = "Розрахунок капсули Liquid Glass...";
    if (progressFill) progressFill.style.width = "50%";
    if (progressPercent) progressPercent.innerText = "50%";
    await new Promise(r => setTimeout(r, 10));

    // 2. Геометрія шрифту та капсули
    const fontSize = Math.round(h * 0.095);
    // Використовуємо напівжирний якісний шрифт
    const fontStr = `800 ${fontSize}px Inter, "Segoe UI", -apple-system, Roboto, "Helvetica Neue", Arial, sans-serif`;
    ctx.font = fontStr;
    ctx.textBaseline = "alphabetic";

    const metrics = ctx.measureText(dateText);
    const textW = Math.ceil(metrics.width);
    // Висота тексту за метриками літер
    const ascent = metrics.actualBoundingBoxAscent || (fontSize * 0.75);
    const descent = metrics.actualBoundingBoxDescent || (fontSize * 0.2);
    const textH = Math.ceil(ascent + descent);

    const paddingX = Math.round(fontSize * 0.50);
    const paddingY = Math.round(fontSize * 0.22);
    const marginLeft = Math.round(w * 0.015);
    const marginBottom = Math.round(h * 0.015);

    const rectX1 = marginLeft;
    const rectY1 = h - marginBottom - textH - (paddingY * 2);
    const rectX2 = rectX1 + textW + (paddingX * 2);
    const rectY2 = h - marginBottom;

    const bw = rectX2 - rectX1;
    const bh = rectY2 - rectY1;
    const radius = bh / 2; // Капсула

    if (progressText) progressText.innerText = "Рендеринг оптичної лінзи та блуму...";
    if (progressFill) progressFill.style.width = "75%";
    if (progressPercent) progressPercent.innerText = "75%";
    await new Promise(r => setTimeout(r, 10));

    // 3. М'яка глибинна тінь під капсулою
    const shadowOffsetY = Math.max(2, Math.round(bh * 0.07));
    const shadowBlur = Math.max(4, Math.round(bh * 0.14));

    ctx.save();
    ctx.shadowColor = "rgba(0, 0, 0, 0.32)";
    ctx.shadowBlur = shadowBlur;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = shadowOffsetY;

    ctx.fillStyle = "rgba(0, 0, 0, 0.32)";
    ctx.beginPath();
    ctx.roundRect(rectX1, rectY1 + shadowOffsetY, bw, bh, radius);
    ctx.fill();
    ctx.restore();

    // 4. Оптична лінза: захоплення фону з легким зумом 1.07
    const zoom = 1.07;
    const cx = (rectX1 + rectX2) / 2.0;
    const cy = (rectY1 + rectY2) / 2.0;
    const cropLensW = bw / zoom;
    const cropLensH = bh / zoom;

    const srcX1 = Math.max(0, cx - cropLensW / 2.0);
    const srcY1 = Math.max(0, cy - cropLensH / 2.0);
    const srcX2 = Math.min(w, cx + cropLensW / 2.0);
    const srcY2 = Math.min(h, cy + cropLensH / 2.0);

    const subtleBlur = Math.max(2, Math.round(bh * 0.025));

    // Окреме полотно під капсулу
    const glassCanvas = document.createElement('canvas');
    glassCanvas.width = bw;
    glassCanvas.height = bh;
    const gCtx = glassCanvas.getContext('2d');

    // Кліпуємо форму капсули
    gCtx.beginPath();
    gCtx.roundRect(0, 0, bw, bh, radius);
    gCtx.clip();

    // Малюємо розмите соковите скло з зумом
    gCtx.filter = `blur(${subtleBlur}px) brightness(104%) saturate(120%)`;
    gCtx.drawImage(
      rawImg,
      cropX + srcX1,
      cropY + srcY1,
      srcX2 - srcX1,
      srcY2 - srcY1,
      0,
      0,
      bw,
      bh
    );
    gCtx.filter = "none";

    // Легкий напівпрозорий білий блиск тіла скла (tint 22/255 ≈ 0.086)
    gCtx.fillStyle = "rgba(255, 255, 255, 0.086)";
    gCtx.fillRect(0, 0, bw, bh);

    // 5. М'який світловий блум у верхньому лівому кутку
    const glW = bw * 0.65;
    const glH = bh * 0.55;
    const glX = bw * 0.06;
    const glY = -bh * 0.18;

    const radialGrad = gCtx.createRadialGradient(
      glX + glW / 2, glY + glH / 2, 2,
      glX + glW / 2, glY + glH / 2, Math.max(glW, glH) / 1.4
    );
    radialGrad.addColorStop(0, "rgba(255, 255, 255, 0.32)");
    radialGrad.addColorStop(0.6, "rgba(255, 255, 255, 0.12)");
    radialGrad.addColorStop(1, "rgba(255, 255, 255, 0)");

    gCtx.fillStyle = radialGrad;
    gCtx.fillRect(0, 0, bw, bh);

    // 6. Розсіяна делікатна фаска (Diffuse Rim Glow)
    const rimGrad = gCtx.createLinearGradient(0, 0, 0, bh);
    rimGrad.addColorStop(0, "rgba(255, 255, 255, 0.55)");
    rimGrad.addColorStop(0.5, "rgba(255, 255, 255, 0.28)");
    rimGrad.addColorStop(1, "rgba(255, 255, 255, 0.14)");

    gCtx.lineWidth = Math.max(1.5, bh * 0.022);
    gCtx.strokeStyle = rimGrad;
    gCtx.beginPath();
    gCtx.roundRect(gCtx.lineWidth / 2, gCtx.lineWidth / 2, bw - gCtx.lineWidth, bh - gCtx.lineWidth, radius - gCtx.lineWidth / 2);
    gCtx.stroke();

    // Накладаємо підготовлену капсулу скла на основне полотно
    ctx.drawImage(glassCanvas, rectX1, rectY1);

    // 7. М'яка тінь для читабельності літер
    const textX = rectX1 + paddingX;
    const textY = rectY1 + paddingY + ascent;

    ctx.font = fontStr;
    ctx.save();
    ctx.shadowColor = "rgba(0, 0, 0, 0.63)";
    ctx.shadowBlur = Math.max(2, Math.round(fontSize * 0.05));
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 2;
    ctx.fillStyle = "rgba(0, 0, 0, 0.63)";
    ctx.fillText(dateText, textX, textY);
    ctx.restore();

    // 8. Чистий білий текст
    ctx.fillStyle = "#FFFFFF";
    ctx.fillText(dateText, textX, textY);

    if (progressText) progressText.innerText = "Експорт у високій якості (JPEG 98%)...";
    if (progressFill) progressFill.style.width = "95%";
    if (progressPercent) progressPercent.innerText = "95%";
    await new Promise(r => setTimeout(r, 10));

    // Генерація фінального файлу
    mainCanvas.toBlob((blob) => {
      if (!blob) {
        throw new Error("Не вдалося створити фінальний файл зображення.");
      }

      if (progressBox) progressBox.style.display = 'none';

      streamDateLastResultBlob = blob;
      if (streamDateLastResultUrl) URL.revokeObjectURL(streamDateLastResultUrl);
      streamDateLastResultUrl = URL.createObjectURL(blob);

      const baseName = streamDateOriginalFile.name.replace(/\.[^/.]+$/, "");
      streamDateLastOutputName = `${baseName}_ready.jpg`;

      // Відображаємо результат
      displaySdResult(streamDateLastResultUrl, streamDateLastOutputName, blob.size);

      // Автоматичне завантаження як зазначено в вимогах
      triggerAutomaticDownload(streamDateLastResultUrl, streamDateLastOutputName);
    }, 'image/jpeg', 0.98);

  } catch (err) {
    console.error(err);
    alert("Помилка під час обробки зображення: " + (err.message || err));
    if (progressBox) progressBox.style.display = 'none';
  } finally {
    if (okBtn) okBtn.disabled = false;
  }
}

function displaySdResult(url, fileName, sizeBytes) {
  const resultBox = document.getElementById('sd-result-box');
  const resultImg = document.getElementById('sd-result-img');
  const downloadBtn = document.getElementById('sd-download-btn');

  if (resultBox) resultBox.style.display = 'flex';
  if (resultImg) resultImg.src = url;
  if (downloadBtn) {
    downloadBtn.href = url;
    downloadBtn.download = fileName;
    downloadBtn.innerText = `Завантажити ще раз (${formatFileSize(sizeBytes)})`;
  }
}

function triggerAutomaticDownload(url, fileName) {
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
