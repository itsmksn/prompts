let lastSubtitleSegments = []; // Зберігаємо сегменти для миттєвого перемикання таймкодів
const DEFAULT_YTSUB_API = "http://127.0.0.1:8777/api/sub";

/* ========================================================
   ІНСТРУМЕНТ: КОПІЮВАННЯ СУБТИТРІВ YOUTUBE
   ======================================================== */
function openSubtitlesTool() {
  closeNav();
  lastSubtitleSegments = [];
  const content = document.getElementById('content');

  const isHttps = window.location.protocol === 'https:';

  content.innerHTML = `
    <div class="converter-container">
      <div class="prompt-title">Субтитри YouTube → Буфер обміну</div>
      <div class="converter-desc">
        Вставте посилання на відео, стрім або Shorts з YouTube. Інструмент автоматично зчитує субтитри через ваш локальний сервер <code>ytsub.py</code> та копіює їх у буфер.
      </div>

      ${isHttps ? `
      <div style="background: #2a1616; border: 1px solid #5c2626; color: #ffb4b0; padding: 0.8rem 1rem; border-radius: 8px; font-size: 0.85rem; line-height: 1.4;">
        ⚠️ <strong>Зверніть увагу:</strong> сторінка відкрита через HTTPS (${window.location.origin}). Сучасні браузери блокують звернення з HTTPS до локального <code>http://127.0.0.1</code> (Mixed Content).<br>
        👉 Для роботи з локальним сервером відкрийте <code>index.html</code> безпосередньо на комп'ютері (подвійним кліком через <code>file://</code> або локальний <code>http://localhost</code>).
      </div>
      ` : ''}

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

// Суворе витягування 11-символьного ID відео з будь-якого посилання YouTube
function extractCleanYouTubeId(rawInput) {
  if (!rawInput) return null;
  const trimmed = rawInput.trim();

  // Якщо передали одразу чистий 11-символьний ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  try {
    const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : 'https://' + trimmed;
    const parsed = new URL(withProtocol);
    const host = parsed.hostname.replace(/^(www\.|m\.|music\.)/i, '').toLowerCase();

    if (host === 'youtu.be') {
      const seg = parsed.pathname.split('/').filter(Boolean)[0];
      if (seg && /^[a-zA-Z0-9_-]{11}$/.test(seg)) return seg;
    }

    if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
      const vParam = parsed.searchParams.get('v');
      if (vParam && /^[a-zA-Z0-9_-]{11}$/.test(vParam)) return vParam;

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

function parseRawSegmentsFromText(rawText) {
  if (!rawText) return [];
  const lines = rawText.split('\n');
  const segments = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Перевіряємо чи є на початку рядка таймкод на кшталт "01:23" або "1:23:45"
    const tcMatch = trimmed.match(/^(\d{1,2}:)?\d{1,2}:\d{2}\b/);
    if (tcMatch) {
      const tcStr = tcMatch[0];
      const restText = trimmed.substring(tcStr.length).trim();
      const parts = tcStr.split(':').map(Number);
      let sec = 0;
      if (parts.length === 3) sec = parts[0] * 3600 + parts[1] * 60 + parts[2];
      else if (parts.length === 2) sec = parts[0] * 60 + parts[1];
      segments.push({ start: sec, text: restText, original: trimmed });
    } else {
      segments.push({ start: 0, text: trimmed, original: trimmed });
    }
  }

  return segments;
}

function buildFormattedTextFromSegments(segments, includeTimestamps) {
  return segments
    .map(seg => {
      const cleanLine = seg.text.replace(/\s+/g, ' ').trim();
      if (!cleanLine) return '';
      if (!includeTimestamps) return cleanLine;
      return seg.start > 0 ? `${formatTimecode(seg.start)} ${cleanLine}` : seg.original;
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

/* ========================================================
   ГОЛОВНА ФУНКЦІЯ ОТРИМАННЯ СУБТИТРІВ
   ======================================================== */
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
  if (inputEl) inputEl.value = cleanUrl;
  if (badgeEl) badgeEl.textContent = `ID відео: ${videoId}`;

  if (goBtn) goBtn.disabled = true;
  if (resultWrap) resultWrap.style.display = 'none';
  setYtStatus("⏳ Зчитую субтитри через локальний сервер, зачекайте…");
  const t0 = Date.now();

  try {
    const res = await fetch(DEFAULT_YTSUB_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: cleanUrl })
    });

    const data = await res.json();

    if (!data.ok) {
      setYtStatus("⚠️ " + (data.error || "Не вдалося отримати субтитри."), "err");
      return;
    }

    lastSubtitleSegments = parseRawSegmentsFromText(data.text);
    const formattedText = buildFormattedTextFromSegments(lastSubtitleSegments, includeTs);

    outEl.value = formattedText;
    resultWrap.style.display = 'flex';

    const secs = Math.max(1, Math.round((Date.now() - t0) / 1000));
    const head = `Готово: ${data.count || lastSubtitleSegments.length} реплік, мова ${data.lang || '—'}${data.auto ? " (авто)" : ""} · ${secs} с`;

    const copied = await copyToClipboardSafe(formattedText);
    const preview = formattedText.split("\n").slice(0, 6).join("\n") + "\n…";

    setYtStatus(
      `${head}\n${copied ? "✅ Скопійовано в буфер обміну!" : "⬇️ Натисніть «📋 Копіювати все» нижче."}\n\n${preview}`,
      "ok"
    );
  } catch (e) {
    console.error("Помилка зв'язку з сервером:", e);
    const isHttps = window.location.protocol === 'https:';
    let msg = `❌ Немає зв'язку з локальним сервером (${DEFAULT_YTSUB_API}).\n\n`;
    msg += `1. Перевірте, чи запущено в терміналі: python ytsub.py --serve\n`;
    if (isHttps) {
      msg += `2. ⚠️ Зараз цей сайт відкритий через HTTPS (${window.location.origin}). Браузер блокує запити до локального HTTP (Mixed Content).\n`;
      msg += `👉 Відкрийте index.html локально на комп'ютері (двічі клікніть на файл index.html або через localhost) — і все працюватиме!`;
    }
    setYtStatus(msg, "err");
  } finally {
    if (goBtn) goBtn.disabled = false;
  }
}
