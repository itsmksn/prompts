let lastSubtitleSegments = []; // Зберігаємо сегменти для миттєвого перемикання таймкодів

    /* ========================================================
       ІНСТРУМЕНТ: КОПІЮВАННЯ СУБТИТРІВ YOUTUBE
       ======================================================== */
    function openSubtitlesTool() {
      closeNav();
      lastSubtitleSegments = [];
      const content = document.getElementById('content');

      content.innerHTML = `
        <div class="converter-container">
          <div class="prompt-title">Субтитри YouTube → Буфер обміну</div>
          <div class="converter-desc">
            Вставте будь-яке посилання на відео, стрім або Shorts з YouTube. Інструмент автоматично очистить посилання від зайвих параметрів (таймкодів, плейлистів), зчитає субтитри та скопіює їх у буфер.
          </div>

          <div class="yt-input-group">
            <input
              id="yt-url-input"
              class="yt-url-input"
              type="url"
              inputmode="url"
              autocomplete="off"
              spellcheck="false"
              placeholder="https://www.youtube.com/watch?v=..."
              onkeydown="if(event.key === 'Enter') { event.preventDefault(); fetchYouTubeSubtitles(); }"
            />
            <button id="yt-go-btn" class="primary-convert-btn" onclick="fetchYouTubeSubtitles()">
              Зчитати субтитри
            </button>
          </div>

          <div class="yt-options-row">
            <label class="yt-checkbox-label">
              <input type="checkbox" id="yt-include-timestamps" checked onchange="reformatExistingSubtitles()" />
              <span>Додавати таймкоди до рядків (напр. 01:25)</span>
            </label>
            <span id="yt-clean-id-badge" style="color: #888; font-size: 0.82rem;"></span>
          </div>

          <div id="yt-status" class="yt-status-box"></div>

          <div id="yt-result-wrap" style="display: none; flex-direction: column; gap: 0.8rem;">
            <div class="yt-result-actions">
              <button id="yt-copy-btn" class="primary-convert-btn" style="background-color: #16a34a;" onclick="copySubtitlesOutput()">
                📋 Копіювати все
              </button>
              <button class="reset-btn" onclick="downloadSubtitlesTxt()">
                💾 Завантажити .txt
              </button>
            </div>
            <textarea id="yt-out" class="yt-textarea" readonly></textarea>
          </div>
        </div>
      `;

      const input = document.getElementById('yt-url-input');
      if (input) input.focus();
    }

    // Суворе витягування ТІЛЬКИ 11-символьного ID відео з будь-якого посилання YouTube
    function extractCleanYouTubeId(rawInput) {
      if (!rawInput) return null;
      const trimmed = rawInput.trim();

      try {
        const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : 'https://' + trimmed;
        const parsed = new URL(withProtocol);
        const host = parsed.hostname.replace(/^(www\.|m\.|music\.)/i, '').toLowerCase();

        if (host === 'youtu.be') {
          const seg = parsed.pathname.split('/').filter(Boolean)[0];
          if (seg && /^[a-zA-Z0-9_-]{11}$/.test(seg)) return seg;
        }

        if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
          // Звичайне відео ?v=XXXXXXXXXXX (ігнорує &list=, &t=, &index= тощо)
          const vParam = parsed.searchParams.get('v');
          if (vParam && /^[a-zA-Z0-9_-]{11}$/.test(vParam)) return vParam;

          // Підтримка /live/ID, /shorts/ID, /embed/ID, /v/ID
          const parts = parsed.pathname.split('/').filter(Boolean);
          if (parts.length >= 2 && ['shorts', 'live', 'embed', 'v', 'watch'].includes(parts[0])) {
            const candidate = parts[1];
            if (candidate && /^[a-zA-Z0-9_-]{11}$/.test(candidate)) return candidate;
          }
        }
      } catch (e) {
        // Ігноруємо помилку парсингу URL
      }

      return null;
    }

    function setYtStatus(text, type = "") {
      const statusEl = document.getElementById('yt-status');
      if (!statusEl) return;
      statusEl.style.display = text ? 'block' : 'none';
      statusEl.className = 'yt-status-box' + (type ? ' ' + type : '');
      statusEl.textContent = text;
    }

    function formatTimecode(seconds) {
      const totalSec = Math.max(0, Math.floor(Number(seconds) || 0));
      const h = Math.floor(totalSec / 3600);
      const m = Math.floor((totalSec % 3600) / 60);
      const s = totalSec % 60;
      if (h > 0) {
        return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
      }
      return `${m}:${String(s).padStart(2, '0')}`;
    }

    function decodeHtmlEntities(str) {
      const txt = document.createElement('textarea');
      txt.innerHTML = str;
      return txt.value;
    }

    function buildFormattedTextFromSegments(segments, includeTimestamps) {
      return segments
        .map(seg => {
          const cleanLine = seg.text.replace(/\s+/g, ' ').trim();
          if (!cleanLine) return '';
          return includeTimestamps ? `${formatTimecode(seg.start)} ${cleanLine}` : cleanLine;
        })
        .filter(Boolean)
        .join('\n');
    }

    function reformatExistingSubtitles() {
      if (!lastSubtitleSegments || lastSubtitleSegments.length === 0) return;
      const includeTs = document.getElementById('yt-include-timestamps')?.checked ?? true;
      const outEl = document.getElementById('yt-out');
      if (outEl) {
        outEl.value = buildFormattedTextFromSegments(lastSubtitleSegments, includeTs);
      }
    }

    async function copyToClipboardSafe(text) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch (e) {
        const out = document.getElementById('yt-out');
        if (out) {
          out.focus();
          out.select();
          try {
            return document.execCommand('copy');
          } catch (err) {
            return false;
          }
        }
        return false;
      }
    }

    async function copySubtitlesOutput() {
      const out = document.getElementById('yt-out');
      const copyBtn = document.getElementById('yt-copy-btn');
      if (!out || !out.value) return;

      const ok = await copyToClipboardSafe(out.value);
      if (ok && copyBtn) {
        const orig = copyBtn.innerText;
        copyBtn.innerText = "✅ Скопійовано!";
        setTimeout(() => copyBtn.innerText = orig, 1800);
      }
    }

    function downloadSubtitlesTxt() {
      const out = document.getElementById('yt-out');
      if (!out || !out.value) return;
      const blob = new Blob([out.value], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `subtitles-${Date.now()}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    }

    // Допоміжна функція запиту з таймаутом
    async function fetchWithTimeout(url, options = {}, timeoutMs = 12000) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        return await fetch(url, { ...options, signal: controller.signal });
      } finally {
        clearTimeout(timer);
      }
    }

    // Обхід CORS через публічні проксі для роботи прямо з GitHub Pages
    async function fetchViaCorsProxies(targetUrl) {
      const proxyGenerators = [
        url => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
        url => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
        url => `https://corsproxy.io/?url=${encodeURIComponent(url)}`
      ];

      let lastErr = null;
      for (const makeProxyUrl of proxyGenerators) {
        try {
          const res = await fetchWithTimeout(makeProxyUrl(targetUrl), {}, 14000);
          if (res.ok) {
            const text = await res.text();
            if (text && text.length > 10) return text;
          }
        } catch (e) {
          lastErr = e;
        }
      }
      throw lastErr || new Error("Не вдалося отримати дані через хмарні проксі.");
    }

    // Парсер XML/JSON3/VTT субтитрів YouTube
    function parseRawSubtitlePayload(rawText) {
      const trimmed = rawText.trim();
      const segments = [];

      // 1. Якщо JSON3 формат YouTube
      if (trimmed.startsWith('{')) {
        try {
          const data = JSON.parse(trimmed);
          if (Array.isArray(data.events)) {
            for (const ev of data.events) {
              if (!ev.segs) continue;
              const line = ev.segs.map(s => s.utf8 || '').join('').replace(/\n/g, ' ').trim();
              if (line) {
                segments.push({
                  start: (ev.tStartMs || 0) / 1000,
                  text: decodeHtmlEntities(line)
                });
              }
            }
            if (segments.length > 0) return segments;
          }
        } catch (e) {}
      }

      // 2. Якщо XML формат YouTube (<transcript><text start=".."> або <timedtext><body><p t="..">)
      if (trimmed.startsWith('<')) {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(trimmed, "text/xml");

        const textNodes = Array.from(xmlDoc.getElementsByTagName('text'));
        if (textNodes.length > 0) {
          for (const node of textNodes) {
            const start = parseFloat(node.getAttribute('start') || '0');
            const content = decodeHtmlEntities(node.textContent || '').replace(/\s+/g, ' ').trim();
            if (content) segments.push({ start, text: content });
          }
          if (segments.length > 0) return segments;
        }

        const pNodes = Array.from(xmlDoc.getElementsByTagName('p'));
        if (pNodes.length > 0) {
          for (const node of pNodes) {
            const startMs = parseFloat(node.getAttribute('t') || '0');
            const content = decodeHtmlEntities(node.textContent || '').replace(/\s+/g, ' ').trim();
            if (content) segments.push({ start: startMs / 1000, text: content });
          }
          if (segments.length > 0) return segments;
        }
      }

      // 3. Якщо WebVTT формат
      if (trimmed.includes('-->')) {
        const lines = trimmed.split(/\r?\n/);
        let currentStart = 0;
        let buffer = [];

        const parseVttTime = (tStr) => {
          const parts = tStr.trim().split(':');
          if (parts.length === 3) {
            return parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseFloat(parts[2]);
          }
          return parseInt(parts[0]) * 60 + parseFloat(parts[1]);
        };

        for (const line of lines) {
          if (line.includes('-->')) {
            if (buffer.length > 0) {
              segments.push({ start: currentStart, text: buffer.join(' ') });
              buffer = [];
            }
            const startPart = line.split('-->')[0];
            currentStart = parseVttTime(startPart);
          } else if (line.trim() && !line.startsWith('WEBVTT') && !/^\d+$/.test(line.trim())) {
            const clean = line.replace(/<[^>]+>/g, '').trim();
            if (clean) buffer.push(decodeHtmlEntities(clean));
          }
        }
        if (buffer.length > 0) {
          segments.push({ start: currentStart, text: buffer.join(' ') });
        }
      }

      return segments;
    }

    // Вибір найкращої доріжки субтитрів (пріоритет: українська -> англійська -> будь-яка інша доступна крім російської)
    function pickBestCaptionTrack(tracks) {
      if (!Array.isArray(tracks) || tracks.length === 0) return null;
      // Відфільтровуємо російські доріжки
      const filtered = tracks.filter(t => {
        const lang = (t.languageCode || t.code || '').toLowerCase();
        return !lang.startsWith('ru');
      });
      const candidates = filtered.length > 0 ? filtered : tracks;
      const priorityLangs = ['uk', 'uk-UA', 'en', 'en-US'];

      // Спочатку шукаємо ручні субтитри пріоритетною мовою
      for (const lang of priorityLangs) {
        const manual = candidates.find(t => (t.languageCode === lang || t.code === lang) && t.kind !== 'asr');
        if (manual) return manual;
      }
      // Потім авто-субтитри пріоритетною мовою
      for (const lang of priorityLangs) {
        const auto = candidates.find(t => t.languageCode === lang || t.code === lang);
        if (auto) return auto;
      }
      return candidates[0];
    }

    // Хмарний метод отримання субтитрів без локального сервера
    async function fetchSubtitlesCloud(videoId) {
      // Спроба A: Витягування captionTracks зі сторінки YouTube через проксі
      try {
        const watchUrl = `https://www.youtube.com/watch?v=${videoId}&hl=uk`;
        const html = await fetchViaCorsProxies(watchUrl);

        const match = html.match(/"captionTracks":\s*(\[[\s\S]*?\])\s*,\s*"audioTracks"/);
        if (match && match[1]) {
          const tracks = JSON.parse(match[1]);
          const chosen = pickBestCaptionTrack(tracks);
          if (chosen && chosen.baseUrl) {
            const xmlUrl = chosen.baseUrl.replace(/\\u0026/g, '&');
            const subPayload = await fetchViaCorsProxies(xmlUrl);
            const segments = parseRawSubtitlePayload(subPayload);
            if (segments.length > 0) {
              return {
                segments,
                lang: chosen.name?.simpleText || chosen.languageCode || 'uk',
                auto: chosen.kind === 'asr'
              };
            }
          }
        }
      } catch (e) {
        console.warn("Спроба через сторінку YouTube не вдалася, пробуємо резервні API...", e);
      }

      // Спроба B: Резервні публічні Piped API інстанси
      const pipedInstances = [
        "https://pipedapi.kavin.rocks",
        "https://pipedapi.tokhmi.xyz",
        "https://pipedapi.syncpundit.io"
      ];

      for (const instance of pipedInstances) {
        try {
          const res = await fetchWithTimeout(`${instance}/streams/${videoId}`, {}, 8000);
          if (!res.ok) continue;
          const data = await res.json();
          if (Array.isArray(data.subtitles) && data.subtitles.length > 0) {
            const chosen = pickBestCaptionTrack(data.subtitles);
            if (chosen && chosen.url) {
              const subRes = await fetchWithTimeout(chosen.url, {}, 10000);
              const subText = await subRes.text();
              const segments = parseRawSubtitlePayload(subText);
              if (segments.length > 0) {
                return {
                  segments,
                  lang: chosen.code || 'auto',
                  auto: Boolean(chosen.autoGenerated)
                };
              }
            }
          }
        } catch (e) {}
      }

      throw new Error("Не вдалося знайти субтитри у цьому відео (можливо, вони вимкнені автором або ще не згенеровані YouTube).");
    }

    async function fetchYouTubeSubtitles() {
      const inputEl = document.getElementById('yt-url-input');
      const goBtn = document.getElementById('yt-go-btn');
      const resultWrap = document.getElementById('yt-result-wrap');
      const outEl = document.getElementById('yt-out');
      const badgeEl = document.getElementById('yt-clean-id-badge');
      const includeTs = document.getElementById('yt-include-timestamps')?.checked ?? true;

      const rawUrl = inputEl ? inputEl.value.trim() : '';
      if (!rawUrl) {
        setYtStatus("⚠️ Спочатку вставте посилання на YouTube.", "err");
        return;
      }

      const videoId = extractCleanYouTubeId(rawUrl);
      if (!videoId) {
        setYtStatus("⚠️ Некоректне посилання! Приймаються лише посилання на відео/стріми YouTube.", "err");
        if (badgeEl) badgeEl.textContent = "";
        return;
      }

      const cleanUrl = `https://www.youtube.com/watch?v=${videoId}`;
      if (inputEl) inputEl.value = cleanUrl; // Автоматично очищаємо поле вводу від сміття
      if (badgeEl) badgeEl.textContent = `ID відео: ${videoId}`;

      if (goBtn) goBtn.disabled = true;
      if (resultWrap) resultWrap.style.display = 'none';
      setYtStatus("⏳ Зчитую субтитри, зачекайте кілька секунд...");
      const t0 = Date.now();

      try {
        // 1. Спочатку швидка перевірка: якщо запущений локальний ytsub.py (127.0.0.1:8777)
        let handledByLocal = false;
        try {
          const localRes = await fetchWithTimeout("http://127.0.0.1:8777/api/sub", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: cleanUrl })
          }, 1800);

          const localData = await localRes.json();
          if (localData && localData.ok && localData.text) {
            handledByLocal = true;
            lastSubtitleSegments = localData.text.split('\n').map(line => ({ start: 0, text: line }));
            outEl.value = localData.text;
            resultWrap.style.display = 'flex';

            const secs = Math.max(1, Math.round((Date.now() - t0) / 1000));
            const head = `Готово (локальний сервер): ${localData.count} реплік, мова ${localData.lang}${localData.auto ? " (авто)" : ""} · ${secs} с`;
            const copied = await copyToClipboardSafe(localData.text);
            setYtStatus(head + (copied ? "\n✅ Автоматично скопійовано в буфер обміну!" : "\nНатисніть «Копіювати все» нижче."), "ok");
          }
        } catch (localErr) {
          // Локальний сервер не запущений — переходимо на вбудований хмарний метод
        }

        // 2. Якщо локальний сервер вимкнений — працюємо автономно прямо через браузер (GitHub Pages)
        if (!handledByLocal) {
          const cloudResult = await fetchSubtitlesCloud(videoId);
          lastSubtitleSegments = cloudResult.segments;

          const formattedText = buildFormattedTextFromSegments(lastSubtitleSegments, includeTs);
          outEl.value = formattedText;
          resultWrap.style.display = 'flex';

          const secs = Math.max(1, Math.round((Date.now() - t0) / 1000));
          const head = `Готово: ${lastSubtitleSegments.length} реплік, мова: ${cloudResult.lang}${cloudResult.auto ? " (авто)" : ""} · ${secs} с`;
          const preview = formattedText.split("\n").slice(0, 6).join("\n") + "\n…";

          const copied = await copyToClipboardSafe(formattedText);
          setYtStatus(
            `${head}\n${copied ? "✅ Скопійовано в буфер обміну!" : "⬇️ Натисніть «Копіювати все» нижче."}\n\n${preview}`,
            "ok"
          );
        }
      } catch (err) {
        console.error(err);
        setYtStatus(
          "❌ " + (err.message || "Не вдалося отримати субтитри.") +
          "\nПеревірте, чи у відео є субтитри, або запустіть локальний скрипт: python ytsub.py --serve",
          "err"
        );
      } finally {
        if (goBtn) goBtn.disabled = false;
      }
    }
