    /* ========================================================
       КЕРУВАННЯ МЕНЮ ТА НАВІГАЦІЄЮ
       ======================================================== */
    function toggleNav() {
      document.body.classList.toggle('nav-open');
    }

    function closeNav() {
      document.body.classList.remove('nav-open');
    }

    function switchNavMode(mode) {
      const promptsView = document.getElementById('nav-prompts-view');
      const converterView = document.getElementById('nav-converter-view');
      const converterTabBtn = document.getElementById('converter-tab-btn');
      const mobileHeaderTitle = document.getElementById('mobile-header-title');

      if (mode === 'converter') {
        promptsView.style.display = 'none';
        converterView.style.display = 'flex';
        converterTabBtn.classList.add('active');
        if (mobileHeaderTitle) mobileHeaderTitle.innerText = 'Інструменти';
      } else {
        converterView.style.display = 'none';
        promptsView.style.display = 'flex';
        converterTabBtn.classList.remove('active');
        if (mobileHeaderTitle) mobileHeaderTitle.innerText = 'Промти для ШІ';
      }
    }

    function toggleConverterMenu() {
      const converterView = document.getElementById('nav-converter-view');
      if (converterView.style.display === 'none') {
        switchNavMode('converter');
      } else {
        switchNavMode('prompts');
      }
    }

    function escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }

    function formatFileSize(bytes) {
      if (bytes === 0) return '0 Байт';
      const k = 1024;
      const sizes = ['Байт', 'КБ', 'МБ', 'ГБ'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    function replaceExtension(fileName, newExt) {
      const lastDotIndex = fileName.lastIndexOf('.');
      if (lastDotIndex === -1) return `${fileName}.${newExt}`;
      return `${fileName.substring(0, lastDotIndex)}.${newExt}`;
    }

    /* ========================================================
       ВІДОБРАЖЕННЯ ПРОМТІВ ТА КОМБІНАЦІЙ
       ======================================================== */
    function showPrompt(title) {
      closeNav();
      const content = document.getElementById('content');
      if (prompts[title]) {
        const text = prompts[title];
        content.innerHTML = `
          <div class="prompt-title">${title}</div>
          <button class="copy-btn" onclick="copyText('${title}', this)">Копіювати</button>
          <div class="prompt-text" id="prompt-text">${escapeHtml(text)}</div>
        `;
      }
    }

    function showWorkflow(name) {
      closeNav();
      const content = document.getElementById('content');
      const steps = workflows[name];
      if (!steps) return;

      let html = `<div class="prompt-title">Комбінація: ${name}</div>`;
      steps.forEach((step, index) => {
        const promptText = prompts[step.promptKey] || '';
        html += `
          <div class="workflow-step">
            <h3 class="step-title">${step.title}</h3>
            <button class="copy-btn" onclick="copyText('${step.promptKey}', this)">Копіювати</button>
            <div class="prompt-text collapsed" id="wf-step-${index}">${escapeHtml(promptText)}</div>
            <button class="toggle-btn" onclick="toggleStep('wf-step-${index}', this)">Розгорнути ▼</button>
          </div>
        `;
      });

      content.innerHTML = html;

      steps.forEach((step, index) => {
        const el = document.getElementById(`wf-step-${index}`);
        const btn = el ? el.nextElementSibling : null;
        if (el && el.scrollHeight <= el.clientHeight + 4) {
          el.classList.remove('collapsed');
          if (btn && btn.classList.contains('toggle-btn')) {
            btn.style.display = 'none';
          }
        }
      });
    }

    function toggleStep(id, btn) {
      const el = document.getElementById(id);
      if (el.classList.contains('collapsed')) {
        el.classList.remove('collapsed');
        btn.innerText = 'Згорнути ▲';
      } else {
        el.classList.add('collapsed');
        btn.innerText = 'Розгорнути ▼';
      }
    }

    function copyText(title, btnElement) {
      const text = prompts[title];
      if (!text) return;
      navigator.clipboard.writeText(text);
      const btn = btnElement || document.querySelector('.copy-btn');
      if (btn) {
        const originalText = btn.innerText;
        btn.innerText = "Скопійовано!";
        setTimeout(() => btn.innerText = originalText, 1500);
      }
    }

