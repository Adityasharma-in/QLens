globalThis.QLENS = globalThis.QLENS || {};

(function () {
  function $(id) {
    return document.getElementById(id);
  }

  let settings = { ...QLENS.CONFIG.DEFAULT_SETTINGS };
  let chosenEngine = null;

  function applyAppearance() {
    if (settings.theme === 'system') {
      document.documentElement.removeAttribute('data-theme');
    } else {
      document.documentElement.setAttribute('data-theme', settings.theme);
    }
    const hex = QLENS.CONFIG.ACCENTS[settings.accent] || QLENS.CONFIG.ACCENTS.indigo;
    document.documentElement.style.setProperty('--accent', hex);
    document.documentElement.style.setProperty('--accent-soft', hex + '1F');
    for (const btn of document.querySelectorAll('#pop-theme .seg-btn')) {
      btn.classList.toggle('active', btn.dataset.value === settings.theme);
      btn.setAttribute('aria-checked', String(btn.dataset.value === settings.theme));
    }
  }

  function allEngineSpecs() {
    const map = {};
    try {
      if (QLENS.ENGINES) {
        for (const id of Object.keys(QLENS.ENGINES)) map[id] = QLENS.ENGINES[id];
      }
      const customs = typeof QLENS.getCustomEngines === 'function'
        ? QLENS.getCustomEngines(settings)
        : [];
      for (const c of customs) {
        if (c && c.id && !map[c.id]) map[c.id] = { id: c.id, name: c.name };
      }
    } catch (err) {}
    return map;
  }

  function renderPills() {
    const wrap = $('pop-pills');
    wrap.textContent = '';
    const specs = allEngineSpecs();
    for (const id of settings.engineOrder) {
      const eng = specs[id];
      if (!eng) continue;
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'pop-pill' + (id === (chosenEngine || settings.defaultEngine) ? ' active' : '');
      b.dataset.engine = id;
      b.setAttribute('role', 'radio');
      b.setAttribute('aria-checked', String(id === (chosenEngine || settings.defaultEngine)));
      b.setAttribute('aria-label', 'Search with ' + eng.name);
      const icon = document.createElement('span');
      try {
        if (!(QLENS.setIcon && QLENS.setIcon(icon, QLENS.LOGOS[id] || QLENS.LOGOS.custom || ''))) icon.textContent = '';
      } catch (err) { try { icon.textContent = ''; } catch (e2) {} }
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
    const host = document.getElementById('pop-theme');
    if (!host || host.dataset.themeBound === '1') return;
    host.dataset.themeBound = '1';
    for (const btn of document.querySelectorAll('#pop-theme .seg-btn')) {
      btn.addEventListener('click', async () => {
        settings = await QLENS.storage.setSettings({ theme: btn.dataset.value });
        applyAppearance();
      });
    }
  }

  function bindSuggestions() {
    const input = $('pop-suggestions');
    if (!input) return;
    input.checked = Boolean(settings.suggestions);
    input.addEventListener('change', async () => {
      settings = await QLENS.storage.setSettings({ suggestions: input.checked });
    });
  }

  function getCustoms() {
    try {
      return typeof QLENS.getCustomEngines === 'function'
        ? QLENS.getCustomEngines(settings)
        : [];
    } catch (err) {
      return [];
    }
  }

  async function doSearch() {
    const qEl = $('pop-query');
    if (!qEl) return;
    const raw = qEl.value.trim();
    if (!raw) return;
    const customs = getCustoms();
    // Same query language as the overlay: !bangs, g/b/k/d prefixes,
    // quick modes (images:, yt:…), and smart-URL direct open.
    let parsed = null;
    try {
      parsed = typeof QLENS.parseOmniboxInput === 'function'
        ? QLENS.parseOmniboxInput(raw, customs)
        : null;
    } catch (err) {
      parsed = null;
    }
    if (parsed && parsed.url && QLENS.isSafeHttpUrl(parsed.url)) {
      let opened = false;
      try {
        const res = await chrome.runtime.sendMessage({
          type: QLENS.MSG.OPEN_TAB,
          payload: { url: parsed.url }
        });
        opened = Boolean(res && res.ok !== false);
      } catch (err) {
        opened = false;
      }
      // Keep the popup open on failure so the dead click is diagnosable
      // instead of looking like a success that opened nothing.
      if (!opened) {
        try {
          qEl.setAttribute('aria-invalid', 'true');
          qEl.title = 'Could not open a new tab.';
        } catch (err) {}
        return;
      }
      window.close();
      return;
    }
    const q = parsed && typeof parsed.query === 'string' && parsed.query.trim()
      ? parsed.query
      : raw;
    if (!q.trim()) return;
    const engine = (parsed && parsed.engineId) || chosenEngine || settings.defaultEngine;
    const modeId = parsed && parsed.modeId ? parsed.modeId : null;
    let url = null;
    try {
      url = QLENS.buildSearchUrl(engine, q, modeId, false, customs);
    } catch (err) {
      url = null;
    }
    if (!url) return;
    let sent = false;
    try {
      const res = await chrome.runtime.sendMessage({
        type: QLENS.MSG.OPEN_TAB,
        payload: { url, query: q, engine }
      });
      sent = Boolean(res && res.ok !== false);
    } catch (err) {
      sent = false;
    }
    if (!sent) {
      try {
        qEl.setAttribute('aria-invalid', 'true');
        qEl.title = 'Could not open a new tab.';
      } catch (err) {}
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

  // Restricted-page fallback: popup opened as a full tab via
  // ?q=<selection>&fallback=1 — pre-fill the query, focus, show notice.
  function applyFallbackParams(qEl) {
    let q = '';
    let isFallback = false;
    try {
      const params = new URLSearchParams(window.location.search);
      q = params.get('q') || '';
      isFallback = params.get('fallback') === '1';
    } catch (err) {
      return;
    }
    if (q && qEl) {
      qEl.value = q.slice(0, 2000);
    }
    if (isFallback) {
      try { document.documentElement.classList.add('ql-tab'); } catch (err) {}
      const notice = $('pop-fallback');
      if (notice) notice.hidden = false;
      const x = $('pop-fallback-x');
      if (x) {
        x.addEventListener('click', () => {
          const n = $('pop-fallback');
          if (n) n.hidden = true;
          if (qEl) { try { qEl.focus(); } catch (e) {} }
        });
      }
    }
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
    const qEl = $('pop-query');
    const goEl = $('pop-go');
    const settingsEl = $('pop-settings');
    if (qEl) qEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        doSearch();
      }
    });
    if (goEl) goEl.addEventListener('click', doSearch);
    if (settingsEl) settingsEl.addEventListener('click', () => {
      // Mirror the overlay fallback: openOptionsPage can be unavailable or
      // reject in popup context, in which case the SW opens Options as a tab.
      const viaSw = () => {
        try {
          chrome.runtime.sendMessage({ type: QLENS.MSG.OPEN_OPTIONS }).catch(() => {});
        } catch (err) {}
      };
      if (chrome && chrome.runtime && typeof chrome.runtime.openOptionsPage === 'function') {
        try {
          const p = chrome.runtime.openOptionsPage();
          if (p && typeof p.catch === 'function') p.catch(viaSw);
        } catch (err) {
          viaSw();
        }
      } else {
        viaSw();
      }
    });
    showShortcut();
    applyFallbackParams(qEl);
    if (qEl) { try { qEl.focus(); } catch (e) {} }
  }

  document.addEventListener('DOMContentLoaded', init);
})();