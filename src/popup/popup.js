globalThis.QLENS = globalThis.QLENS || {};

(function () {
  function $(id) {
    return document.getElementById(id);
  }

  let settings = { ...QLENS.CONFIG.DEFAULT_SETTINGS };
  let chosenEngine = null;

  function applyAppearance() {
    const theme = settings.theme === 'system' ? 'system' : settings.theme;
    document.documentElement.dataset.theme = theme;
    const hex = QLENS.CONFIG.ACCENTS[settings.accent] || QLENS.CONFIG.ACCENTS.indigo;
    document.documentElement.style.setProperty('--accent', hex);
    document.documentElement.style.setProperty('--accent-soft', hex + '1F');
    for (const btn of document.querySelectorAll('#pop-theme .seg-btn')) {
      btn.classList.toggle('active', btn.dataset.value === settings.theme);
    }
  }

  function renderPills() {
    const wrap = $('pop-pills');
    wrap.textContent = '';
    for (const id of settings.engineOrder) {
      const eng = QLENS.ENGINES[id];
      if (!eng) continue;
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'pop-pill' + (id === (chosenEngine || settings.defaultEngine) ? ' active' : '');
      b.dataset.engine = id;
      b.setAttribute('role', 'radio');
      b.setAttribute('aria-checked', String(id === (chosenEngine || settings.defaultEngine)));
      b.setAttribute('aria-label', 'Search with ' + eng.name);
      const icon = document.createElement('span');
      icon.innerHTML = QLENS.LOGOS[id] || '';
      b.appendChild(icon);
      b.appendChild(document.createTextNode(eng.name));
      b.addEventListener('click', () => {
        chosenEngine = id;
        renderPills();
      });
      wrap.appendChild(b);
    }
  }

  function renderSwatches() {
    const wrap = $('pop-swatches');
    wrap.textContent = '';
    for (const name of Object.keys(QLENS.CONFIG.ACCENTS)) {
      const s = document.createElement('button');
      s.type = 'button';
      s.className = 'swatch' + (name === settings.accent ? ' active' : '');
      s.style.background = QLENS.CONFIG.ACCENTS[name];
      s.dataset.accent = name;
      s.setAttribute('role', 'radio');
      s.setAttribute('aria-checked', String(name === settings.accent));
      s.setAttribute('aria-label', 'Accent ' + name);
      s.addEventListener('click', async () => {
        settings = await QLENS.storage.setSettings({ accent: name });
        applyAppearance();
        renderSwatches();
      });
      wrap.appendChild(s);
    }
  }

  function bindTheme() {
    for (const btn of document.querySelectorAll('#pop-theme .seg-btn')) {
      btn.addEventListener('click', async () => {
        settings = await QLENS.storage.setSettings({ theme: btn.dataset.value });
        applyAppearance();
      });
    }
  }

  function bindSuggestions() {
    const input = $('pop-suggestions');
    input.checked = Boolean(settings.suggestions);
    input.addEventListener('change', async () => {
      settings = await QLENS.storage.setSettings({ suggestions: input.checked });
    });
  }

  async function doSearch() {
    const q = $('pop-query').value.trim();
    if (!q) return;
    const engine = chosenEngine || settings.defaultEngine;
    const url = QLENS.buildSearchUrl(engine, q);
    if (!url) return;
    try {
      await chrome.runtime.sendMessage({
        type: QLENS.MSG.OPEN_TAB,
        payload: { url, query: q, engine }
      });
    } catch (err) {
      return;
    }
    window.close();
  }

  function showShortcut() {
    QLENS.storage
      .getShortcut()
      .then((combo) => {
        $('pop-shortcut').textContent = combo;
      })
      .catch(() => {});
  }

  async function init() {
    try {
      settings = await QLENS.storage.getSettings();
    } catch (err) {
      settings = { ...QLENS.CONFIG.DEFAULT_SETTINGS };
    }
    applyAppearance();
    renderPills();
    renderSwatches();
    bindTheme();
    bindSuggestions();
    $('pop-query').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        doSearch();
      }
    });
    $('pop-go').addEventListener('click', doSearch);
    $('pop-settings').addEventListener('click', () => {
      if (chrome && chrome.runtime && typeof chrome.runtime.openOptionsPage === 'function') {
        chrome.runtime.openOptionsPage();
      }
    });
    showShortcut();
    $('pop-query').focus();
  }

  document.addEventListener('DOMContentLoaded', init);
})();