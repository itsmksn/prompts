    /* ========================================================
       КОНФІГУРАЦІЯ КОНВЕРТЕРА
       ======================================================== */
    const converterConfigs = {
      "audio-to-mp3": {
        title: "Конвертер: Будь-що в MP3",
        targetExt: "mp3",
        targetMime: "audio/mp3",
        desc: "Витягує аудіо з будь-яких відео (MP4, WebM, MOV тощо) або конвертує аудіофайли (WAV, OGG, M4A, FLAC) у формат MP3 із найвищою якістю 320 kbps.",
        accept: "audio/*,video/*"
      },
      "video-to-mp4": {
        title: "Конвертер: Будь-що в MP4",
        targetExt: "mp4",
        targetMime: "video/mp4",
        desc: "Конвертує відео (WebM, MKV, MOV, AVI тощо) у стандартний формат MP4 безпосередньо у вашому браузері без втрати роздільної здатності.",
        accept: "video/*"
      },
      "image-to-png": {
        title: "Конвертер: Будь-що в PNG",
        targetExt: "png",
        targetMime: "image/png",
        desc: "Конвертує будь-які зображення (JPG, WEBP, GIF, BMP, SVG, AVIF) у формат PNG зі 100% збереженням вихідної якості (lossless).",
        accept: "image/*"
      }
    };

    let currentSelectedFile = null;
    let currentConverterType = "audio-to-mp3";

    /* ========================================================
       ЕКРАН ТА ЛОГІКА КОНВЕРТЕРА
       ======================================================== */
    function openConverter(type) {
      closeNav();
      currentConverterType = type;
      currentSelectedFile = null;
      const config = converterConfigs[type];
      const content = document.getElementById('content');

      content.innerHTML = `
        <div class="converter-container">
          <div class="prompt-title">${config.title}</div>
          <div class="converter-desc">${config.desc}</div>

          <!-- Drag and drop zone -->
          <div class="drop-zone" id="drop-zone" onclick="triggerFileInput()">
            <input type="file" id="file-input" accept="${config.accept}" onchange="handleFileSelect(this.files)" />
            <svg class="drop-zone-icon" viewBox="0 0 24 24">
              <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z"/>
            </svg>
            <div class="drop-zone-text">Перетягніть файл сюди або клікніть для вибору</div>
            <div class="drop-zone-sub">Файл обробляється локально на вашому комп'ютері</div>
          </div>

          <!-- Інформація про обраний файл -->
          <div class="file-info-card" id="file-info-card" style="display: none;">
            <div class="file-info-details">
              <div class="file-name" id="selected-file-name">файл</div>
              <div class="file-size" id="selected-file-size">0 МБ</div>
            </div>
            <div class="action-controls">
              <button class="reset-btn" onclick="resetFileSelection()">Змінити</button>
              <button class="primary-convert-btn" id="start-convert-btn" onclick="startConversion()">Конвертувати</button>
            </div>
          </div>

          <!-- Прогрес конвертації -->
          <div class="progress-box" id="progress-box">
            <div class="progress-status">
              <span id="progress-status-text">Обробка файлу...</span>
              <span id="progress-percent">0%</span>
            </div>
            <div class="progress-track">
              <div class="progress-fill" id="progress-fill"></div>
            </div>
          </div>

          <!-- Результат конвертації -->
          <div class="result-box" id="result-box">
            <div class="result-header">
              <svg style="width:20px;height:20px;fill:currentColor;" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
              <span>Конвертацію успішно завершено!</span>
            </div>
            <div id="media-preview-area"></div>
            <a href="#" class="download-btn" id="download-btn" download="">Завантажити файл</a>
            <button class="reset-btn" onclick="resetFileSelection()" style="align-self: flex-start;">Конвертувати інший файл</button>
          </div>
        </div>
      `;

      initDragEvents();
    }

    function triggerFileInput() {
      const input = document.getElementById('file-input');
      if (input) input.click();
    }

    function initDragEvents() {
      const dropZone = document.getElementById('drop-zone');
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
          handleFileSelect(dt.files);
        }
      });
    }

    function handleFileSelect(files) {
      if (!files || files.length === 0) return;
      currentSelectedFile = files[0];

      const dropZone = document.getElementById('drop-zone');
      const fileInfoCard = document.getElementById('file-info-card');
      const selectedFileName = document.getElementById('selected-file-name');
      const selectedFileSize = document.getElementById('selected-file-size');
      const resultBox = document.getElementById('result-box');
      const progressBox = document.getElementById('progress-box');

      if (selectedFileName) selectedFileName.textContent = currentSelectedFile.name;
      if (selectedFileSize) selectedFileSize.textContent = formatFileSize(currentSelectedFile.size);

      if (dropZone) dropZone.style.display = 'none';
      if (fileInfoCard) fileInfoCard.style.display = 'flex';
      if (resultBox) resultBox.style.display = 'none';
      if (progressBox) progressBox.style.display = 'none';
    }

    function resetFileSelection() {
      currentSelectedFile = null;
      const dropZone = document.getElementById('drop-zone');
      const fileInfoCard = document.getElementById('file-info-card');
      const resultBox = document.getElementById('result-box');
      const progressBox = document.getElementById('progress-box');
      const fileInput = document.getElementById('file-input');

      if (fileInput) fileInput.value = '';
      if (dropZone) dropZone.style.display = 'block';
      if (fileInfoCard) fileInfoCard.style.display = 'none';
      if (resultBox) resultBox.style.display = 'none';
      if (progressBox) progressBox.style.display = 'none';
    }

    function updateProgress(percent, text) {
      const progressBox = document.getElementById('progress-box');
      const progressFill = document.getElementById('progress-fill');
      const progressPercent = document.getElementById('progress-percent');
      const progressStatusText = document.getElementById('progress-status-text');

      if (progressBox) progressBox.style.display = 'flex';
      if (progressFill) progressFill.style.width = `${percent}%`;
      if (progressPercent) progressPercent.innerText = `${percent}%`;
      if (text && progressStatusText) progressStatusText.innerText = text;
    }

    /* ========================================================
       АЛГОРИТМИ КОНВЕРТАЦІЇ В БРАУЗЕРІ
       ======================================================== */
    async function startConversion() {
      if (!currentSelectedFile) return;

      const convertBtn = document.getElementById('start-convert-btn');
      if (convertBtn) convertBtn.disabled = true;

      try {
        let outputBlob = null;
        const config = converterConfigs[currentConverterType];
        const newFileName = replaceExtension(currentSelectedFile.name, config.targetExt);

        if (currentConverterType === 'audio-to-mp3') {
          outputBlob = await convertToMp3(currentSelectedFile);
        } else if (currentConverterType === 'image-to-png') {
          outputBlob = await convertToPng(currentSelectedFile);
        } else if (currentConverterType === 'video-to-mp4') {
          outputBlob = await convertToMp4(currentSelectedFile);
        }

        displayResult(outputBlob, newFileName);
      } catch (err) {
        console.error(err);
        alert('Помилка під час конвертації: ' + (err.message || err));
        const progressBox = document.getElementById('progress-box');
        if (progressBox) progressBox.style.display = 'none';
      } finally {
        if (convertBtn) convertBtn.disabled = false;
      }
    }

    // 1. Конвертація Аудіо / Відео -> MP3 (320 kbps)
    async function convertToMp3(file) {
      updateProgress(10, "Зчитування файлу в пам'ять...");
      const arrayBuffer = await file.arrayBuffer();

      updateProgress(30, "Декодування звукової доріжки браузером...");
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

      updateProgress(50, "Кодування аудіо в MP3 (320 kbps)...");

      const channels = audioBuffer.numberOfChannels;
      const sampleRate = audioBuffer.sampleRate;
      
      // Ініціалізація LAME MP3 Encoder (максимальна якість 320 kbps)
      const mp3encoder = new lamejs.Mp3Encoder(channels > 1 ? 2 : 1, sampleRate, 320);
      const mp3Data = [];

      const left = audioBuffer.getChannelData(0);
      const right = channels > 1 ? audioBuffer.getChannelData(1) : left;

      // Конвертація Float32 в 16-бітний цілочисельний PCM
      const leftInt16 = new Int16Array(left.length);
      const rightInt16 = channels > 1 ? new Int16Array(right.length) : null;

      for (let i = 0; i < left.length; i++) {
        let s = Math.max(-1, Math.min(1, left[i]));
        leftInt16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        if (channels > 1) {
          let sr = Math.max(-1, Math.min(1, right[i]));
          rightInt16[i] = sr < 0 ? sr * 0x8000 : sr * 0x7FFF;
        }
      }

      const sampleBlockSize = 1152;
      for (let i = 0; i < leftInt16.length; i += sampleBlockSize) {
        const leftChunk = leftInt16.subarray(i, i + sampleBlockSize);
        let mp3buf;
        if (channels > 1) {
          const rightChunk = rightInt16.subarray(i, i + sampleBlockSize);
          mp3buf = mp3encoder.encodeBuffer(leftChunk, rightChunk);
        } else {
          mp3buf = mp3encoder.encodeBuffer(leftChunk);
        }

        if (mp3buf.length > 0) {
          mp3Data.push(mp3buf);
        }

        if (i % (sampleBlockSize * 15) === 0) {
          const percent = 50 + Math.round((i / leftInt16.length) * 45);
          updateProgress(percent, `Кодування MP3: ${percent}%`);
          await new Promise(r => setTimeout(r, 0)); // Даємо браузеру оновити UI
        }
      }

      const endBuf = mp3encoder.flush();
      if (endBuf.length > 0) {
        mp3Data.push(endBuf);
      }

      updateProgress(100, "Готово!");
      return new Blob(mp3Data, { type: 'audio/mp3' });
    }

    // 2. Конвертація Зображення -> PNG (Lossless)
    async function convertToPng(file) {
      updateProgress(20, "Завантаження зображення...");
      const imgBitmap = await createImageBitmap(file);

      updateProgress(50, "Рендеринг у формат PNG без втрати якості...");
      const canvas = document.createElement('canvas');
      canvas.width = imgBitmap.width;
      canvas.height = imgBitmap.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(imgBitmap, 0, 0);

      updateProgress(85, "Генерація фінального файлу PNG...");
      return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (blob) {
            updateProgress(100, "Готово!");
            resolve(blob);
          } else {
            reject(new Error("Не вдалося конвертувати зображення в PNG."));
          }
        }, 'image/png');
      });
    }

    // 3. Конвертація Відео -> MP4
    async function convertToMp4(file) {
      updateProgress(15, "Ініціалізація відеопотоку...");

      return new Promise((resolve, reject) => {
        const video = document.createElement('video');
        video.preload = 'auto';
        video.playsInline = true;
        const objectUrl = URL.createObjectURL(file);
        video.src = objectUrl;

        video.onloadedmetadata = async () => {
          try {
            const duration = video.duration || 1;
            let stream;
            if (video.captureStream) {
              stream = video.captureStream();
            } else if (video.mozCaptureStream) {
              stream = video.mozCaptureStream();
            } else {
              throw new Error("Ваш браузер не підтримує нативне захоплення потоку відео.");
            }

            // Налаштування аудіосупроводу
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const source = audioCtx.createMediaElementSource(video);
            const dest = audioCtx.createMediaStreamDestination();
            source.connect(dest);
            if (dest.stream.getAudioTracks().length > 0) {
              stream.addTrack(dest.stream.getAudioTracks()[0]);
            }

            // Вибір найкращого підтримуваного кодеку
            let mimeType = 'video/mp4';
            if (MediaRecorder.isTypeSupported('video/mp4;codecs=avc1,mp4a.40.2')) {
              mimeType = 'video/mp4;codecs=avc1,mp4a.40.2';
            } else if (MediaRecorder.isTypeSupported('video/mp4')) {
              mimeType = 'video/mp4';
            } else if (MediaRecorder.isTypeSupported('video/webm;codecs=h264')) {
              mimeType = 'video/webm;codecs=h264';
            }

            const recorder = new MediaRecorder(stream, {
              mimeType: mimeType,
              videoBitsPerSecond: 8000000 // 8 Mbps для збереження високої якості
            });

            const chunks = [];
            recorder.ondataavailable = (e) => {
              if (e.data && e.data.size > 0) chunks.push(e.data);
            };

            recorder.onstop = () => {
              URL.revokeObjectURL(objectUrl);
              updateProgress(100, "Готово!");
              resolve(new Blob(chunks, { type: 'video/mp4' }));
            };

            video.ontimeupdate = () => {
              const p = Math.min(99, Math.round((video.currentTime / duration) * 100));
              updateProgress(p, `Перекодування кадрів відео: ${p}%`);
            };

            video.onended = () => {
              recorder.stop();
            };

            recorder.start(100);
            video.playbackRate = 2.0; // Прискорена обробка в 2 рази для економії часу
            await video.play();
          } catch (e) {
            URL.revokeObjectURL(objectUrl);
            reject(e);
          }
        };

        video.onerror = () => {
          URL.revokeObjectURL(objectUrl);
          reject(new Error("Не вдалося завантажити даний формат відеофайлу."));
        };
      });
    }

    // Відображення результату та кнопки завантаження
    function displayResult(blob, fileName) {
      const progressBox = document.getElementById('progress-box');
      const resultBox = document.getElementById('result-box');
      const downloadBtn = document.getElementById('download-btn');
      const previewArea = document.getElementById('media-preview-area');
      const fileInfoCard = document.getElementById('file-info-card');

      if (progressBox) progressBox.style.display = 'none';
      if (fileInfoCard) fileInfoCard.style.display = 'none';
      if (resultBox) resultBox.style.display = 'flex';

      const blobUrl = URL.createObjectURL(blob);
      downloadBtn.href = blobUrl;
      downloadBtn.download = fileName;
      downloadBtn.innerText = `Завантажити ${fileName} (${formatFileSize(blob.size)})`;

      previewArea.innerHTML = '';
      if (fileName.endsWith('.mp3')) {
        const audio = document.createElement('audio');
        audio.controls = true;
        audio.src = blobUrl;
        audio.className = 'preview-media';
        previewArea.appendChild(audio);
      } else if (fileName.endsWith('.png')) {
        const img = document.createElement('img');
        img.src = blobUrl;
        img.className = 'preview-media';
        previewArea.appendChild(img);
      } else if (fileName.endsWith('.mp4')) {
        const vid = document.createElement('video');
        vid.controls = true;
        vid.src = blobUrl;
        vid.className = 'preview-media';
        previewArea.appendChild(vid);
      }
    }
