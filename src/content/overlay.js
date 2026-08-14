globalThis.QLENS = globalThis.QLENS || {};

const CSS = `
:host {
  all: initial;
  --ql-accent: #6366F1;
  --ql-accent-soft: rgba(99,102,241,.10);
  --ql-accent-strong: rgba(99,102,241,.20);
  --ql-bg: rgba(255,255,255,.78);
  --ql-text: #191c26;
  --ql-text-dim: #5c6172;
  --ql-border: rgba(255,255,255,.6);
  --ql-border-soft: rgba(120,125,150,.18);
  --ql-hover: rgba(99,102,241,.09);
  --ql-shadow: 0 24px 60px -16px rgba(15,18,35,.38), 0 10px 20px -10px rgba(15,18,35,.22);
  --ql-backdrop: rgba(12,14,28,.34);
  position: fixed;
  inset: 0;
  z-index: 2147483647;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Inter, Arial, sans-serif;
  font-size: 15px;
  line-height: 1.4;
  color: var(--ql-text);
  text-align: left;
  letter-spacing: normal;
}

.ql-backdrop {
  position: absolute;
  inset: 0;
  background: var(--ql-backdrop);
  -webkit-backdrop-filter: blur(6px);
  backdrop-filter: blur(6px);
  animation: ql-fade 120ms ease;
}

.ql-panel {
  position: absolute;
  top: 8vh;
  left: 50%;
  width: min(680px, 92vw);
  transform: translate(-50%, 0);
  background: var(--ql-bg);
  -webkit-backdrop-filter: blur(24px) saturate(160%);
  backdrop-filter: blur(24px) saturate(160%);
  border: 1px solid var(--ql-border);
  border-radius: 20px;
  box-shadow: var(--ql-shadow);
  overflow: hidden;
  animation: ql-panel-in 200ms cubic-bezier(0.16, 1, 0.3, 1);
}

.ql-panel.ql-out {
  animation: ql-panel-out 120ms ease forwards;
}

@keyframes ql-panel-in {
  from { opacity: 0; transform: translate(-50%, -8px) scale(0.96); }
  to { opacity: 1; transform: translate(-50%, 0) scale(1); }
}

@keyframes ql-panel-out {
  from { opacity: 1; transform: translate(-50%, 0) scale(1); }
  to { opacity: 0; transform: translate(-50%, 0) scale(0.98); }
}

@keyframes ql-fade {
  from { opacity: 0; }
  to { opacity: 1; }
}

.ql-top {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-bottom: 1px solid var(--ql-border-soft);
}

.ql-input {
  flex: 1;
  min-width: 0;
  height: 44px;
  border: none;
  outline: none;
  background: transparent;
  color: var(--ql-text);
  font-size: 17px;
  font-family: inherit;
}

.ql-input::placeholder {
  color: var(--ql-text-dim);
  opacity: .75;
}

.ql-input:focus-visible {
  outline: 2px solid var(--ql-accent);
  outline-offset: -2px;
  border-radius: 10px;
}

.ql-chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 44px;
  padding: 0 14px 0 10px;
  border-radius: 999px;
  border: 1px solid var(--ql-border-soft);
  background: var(--ql-hover);
  color: var(--ql-text);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  flex: none;
}

.ql-chip:hover {
  background: var(--ql-accent-soft);
}

.ql-chip:focus-visible {
  outline: 2px solid var(--ql-accent);
  outline-offset: 2px;
}

.ql-icon {
  display: inline-flex;
  width: 20px;
  height: 20px;
  flex: none;
  color: var(--ql-text-dim);
}

.ql-icon svg {
  width: 100%;
  height: 100%;
  display: block;
}

.ql-clear {
  display: none;
  height: 44px;
  width: 44px;
  border: none;
  border-radius: 12px;
  background: transparent;
  color: var(--ql-text-dim);
  cursor: pointer;
  align-items: center;
  justify-content: center;
  flex: none;
}

.ql-clear:hover {
  background: var(--ql-hover);
  color: var(--ql-text);
}

.ql-clear:focus-visible {
  outline: 2px solid var(--ql-accent);
  outline-offset: 2px;
}

.ql-hint {
  height: 44px;
  min-width: 44px;
  padding: 0 12px;
  border: none;
  border-radius: 12px;
  background: transparent;
  color: var(--ql-text-dim);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: .12em;
  cursor: pointer;
  font-family: inherit;
  flex: none;
}

.ql-hint:hover {
  background: var(--ql-hover);
  color: var(--ql-text);
}

.ql-hint:focus-visible {
  outline: 2px solid var(--ql-accent);
  outline-offset: 2px;
}

.ql-enter {
  height: 36px;
  width: 36px;
  border-radius: 10px;
  background: var(--ql-accent);
  color: #ffffff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: none;
}

.ql-fromsel {
  margin: 10px 12px 0;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 14px;
  border-radius: 999px;
  background: var(--ql-accent-soft);
  color: var(--ql-text);
  font-size: 12.5px;
  font-weight: 600;
}

.ql-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 10px 12px 0;
}

.ql-mode-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 8px 12px 0;
}

.ql-pill {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  height: 44px;
  padding: 0 14px 0 10px;
  border-radius: 14px;
  border: 1px solid var(--ql-border-soft);
  background: transparent;
  color: var(--ql-text-dim);
  font-size: 13.5px;
  font-weight: 500;
  cursor: pointer;
  font-family: inherit;
}

.ql-pill:hover {
  background: var(--ql-hover);
}

.ql-pill.ql-active {
  border-color: var(--ql-accent);
  background: var(--ql-accent-soft);
  color: var(--ql-text);
  font-weight: 600;
}

.ql-pill:focus-visible {
  outline: 2px solid var(--ql-accent);
  outline-offset: 2px;
}

.ql-sections {
  padding: 10px 12px 12px;
  max-height: min(42vh, 320px);
  overflow-y: auto;
}

.ql-section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 4px 6px 6px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: .1em;
  text-transform: uppercase;
  color: var(--ql-text-dim);
}

.ql-section-note {
  text-transform: none;
  letter-spacing: 0;
  font-weight: 500;
}

.ql-link {
  background: none;
  border: none;
  color: var(--ql-accent);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  padding: 6px 8px;
  border-radius: 8px;
  min-height: 32px;
  font-family: inherit;
}

.ql-link:hover {
  background: var(--ql-hover);
}

.ql-link:focus-visible {
  outline: 2px solid var(--ql-accent);
  outline-offset: 2px;
}

.ql-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.ql-row {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  min-height: 44px;
  padding: 6px 10px;
  border: none;
  border-radius: 12px;
  background: transparent;
  color: var(--ql-text);
  font-size: 14.5px;
  text-align: left;
  cursor: pointer;
  font-family: inherit;
}

.ql-row:hover {
  background: var(--ql-hover);
}

.ql-row.ql-row-active {
  background: var(--ql-accent-soft);
}

.ql-row:focus-visible {
  outline: 2px solid var(--ql-accent);
  outline-offset: -2px;
}

.ql-row-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  min-width: 0;
}

.ql-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 11.5px;
  color: var(--ql-text-dim);
  background: var(--ql-hover);
  border-radius: 999px;
  padding: 3px 10px 3px 6px;
  flex: none;
}

.ql-badge .ql-icon {
  width: 14px;
  height: 14px;
}

.ql-recent {
  display: flex;
  align-items: center;
}

.ql-recent-del {
  flex: none;
  width: 40px;
  height: 44px;
  border: none;
  background: transparent;
  color: var(--ql-text-dim);
  border-radius: 10px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.ql-recent-del:hover {
  color: var(--ql-text);
  background: var(--ql-hover);
}

.ql-recent-del:focus-visible {
  outline: 2px solid var(--ql-accent);
  outline-offset: -2px;
}

.ql-row-enter {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: .1em;
  text-transform: uppercase;
  color: var(--ql-accent);
  flex: none;
}

.ql-hidden {
  display: none !important;
}

@media (prefers-color-scheme: dark) {
  :host {
    --ql-bg: rgba(28,30,44,.78);
    --ql-text: #eef0f8;
    --ql-text-dim: #a6abbf;
    --ql-border: rgba(255,255,255,.14);
    --ql-border-soft: rgba(255,255,255,.1);
    --ql-hover: rgba(255,255,255,.07);
    --ql-shadow: 0 24px 60px -16px rgba(0,0,0,.6), 0 10px 20px -10px rgba(0,0,0,.4);
    --ql-backdrop: rgba(5,6,12,.5);
  }
}

:host([data-theme="light"]) {
  --ql-bg: rgba(255,255,255,.78);
  --ql-text: #191c26;
  --ql-text-dim: #5c6172;
  --ql-border: rgba(255,255,255,.6);
  --ql-border-soft: rgba(120,125,150,.18);
  --ql-hover: rgba(99,102,241,.09);
  --ql-shadow: 0 24px 60px -16px rgba(15,18,35,.38), 0 10px 20px -10px rgba(15,18,35,.22);
  --ql-backdrop: rgba(12,14,28,.34);
}

:host([data-theme="dark"]) {
  --ql-bg: rgba(28,30,44,.78);
  --ql-text: #eef0f8;
  --ql-text-dim: #a6abbf;
  --ql-border: rgba(255,255,255,.14);
  --ql-border-soft: rgba(255,255,255,.1);
  --ql-hover: rgba(255,255,255,.07);
  --ql-shadow: 0 24px 60px -16px rgba(0,0,0,.6), 0 10px 20px -10px rgba(0,0,0,.4);
  --ql-backdrop: rgba(5,6,12,.5);
}

@media (prefers-reduced-motion: reduce) {
  .ql-panel,
  .ql-backdrop {
    animation: none !important;
  }
}
`;

const SEARCH_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>';
const CLOCK_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>';
const X_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
const ENTER_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="9 10 4 15 9 20"/><path d="M20 4v7a4 4 0 0 1-4 4H4"/></svg>';
const SITE_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="15 3 21 3 21 9"/><path d="M10 14L21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>';

function iconSvg(markup) {
  const wrap = document.createElement('span');
  wrap.className = 'ql-icon';
  wrap.setAttribute('aria-hidden', 'true');
  wrap.innerHTML = markup;
  return wrap;
}

const Overlay = (() => {
  let host = null;
  let root = null;
  let panel = null;
  let backdropEl = null;
  let inputEl = null;
  let clearBtn = null;
  let hintBtn = null;
  let engineChipBtn = null;
  let pillsRow = null;
  let modeRow = null;
  let sectionsEl = null;
  let selectionChipEl = null;
  let prevFocusEl = null;
  let settings = null;
  let engineId = null;
  let initialEngineId = null;
  let modeId = null;
  let engineOrder = [];
  let suggestionTimer = null;
  let suggestionReqId = 0;
  let suggestions = [];
  let suggestionHighlight = -1;
  let recentItems = [];
  let actionSite = null;
  let selectionText = null;
  let selectionActive = false;
  let closing = false;

  function el(tag, cls, text) {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text != null) node.textContent = text;
    return node;
  }

  function applyStyles(shadow) {
    if (typeof CSSStyleSheet !== 'undefined' && 'adoptedStyleSheets' in shadow) {
      try {
        const sheet = new CSSStyleSheet();
        sheet.replaceSync(CSS);
        shadow.adoptedStyleSheets = [sheet];
        return;
      } catch (err) {
        /* fall through to style element */
      }
    }
    const style = document.createElement('style');
    style.textContent = CSS;
    shadow.appendChild(style);
  }

  function svgLogo(id) {
    return QLENS.LOGOS[id] || '';
  }

  function build() {
    host = document.createElement('div');
    host.setAttribute('role', 'dialog');
    host.setAttribute('aria-modal', 'true');
    host.setAttribute('aria-label', 'Quick search');
    root = host.attachShadow({ mode: 'open' });
    applyStyles(root);

    backdropEl = el('div', 'ql-backdrop');
    root.appendChild(backdropEl);

    panel = el('div', 'ql-panel');
    root.appendChild(panel);

    const topRow = el('div', 'ql-top');
    panel.appendChild(topRow);

    engineChipBtn = el('button', 'ql-chip');
    engineChipBtn.type = 'button';
    engineChipBtn.setAttribute('aria-label', 'Switch search engine');
    topRow.appendChild(engineChipBtn);

    inputEl = el('input', 'ql-input');
    inputEl.type = 'text';
    inputEl.setAttribute('aria-label', 'Search query');
    inputEl.setAttribute('autocomplete', 'off');
    inputEl.setAttribute('spellcheck', 'false');
    inputEl.placeholder = 'Search the web \u2014 ' + QLENS.CONFIG.SHORTCUT_DEFAULT;
    topRow.appendChild(inputEl);

    clearBtn = el('button', 'ql-clear');
    clearBtn.type = 'button';
    clearBtn.setAttribute('aria-label', 'Clear query');
    clearBtn.appendChild(iconSvg(X_SVG));
    topRow.appendChild(clearBtn);

    hintBtn = el('button', 'ql-hint');
    hintBtn.type = 'button';
    hintBtn.setAttribute('aria-label', 'Switch engine');
    hintBtn.textContent = 'TAB';
    topRow.appendChild(hintBtn);

    const enterBadge = el('div', 'ql-enter');
    enterBadge.setAttribute('aria-hidden', 'true');
    enterBadge.appendChild(iconSvg(ENTER_SVG));
    topRow.appendChild(enterBadge);

    selectionChipEl = el('div', 'ql-fromsel ql-hidden');
    selectionChipEl.appendChild(iconSvg(SEARCH_SVG));
    selectionChipEl.appendChild(el('span', null, 'From selection'));
    panel.appendChild(selectionChipEl);

    pillsRow = el('div', 'ql-pills');
    panel.appendChild(pillsRow);

    modeRow = el('div', 'ql-mode-row ql-hidden');
    panel.appendChild(modeRow);

    sectionsEl = el('div', 'ql-sections');
    panel.appendChild(sectionsEl);

    document.documentElement.appendChild(host);

    renderEngineChip();
    renderPills();
    addListeners();
  }

  function renderEngineChip() {
    if (!engineChipBtn) return;
    engineChipBtn.textContent = '';
    const spec = modeId && QLENS.QUICK_MODES[modeId]
      ? QLENS.QUICK_MODES[modeId]
      : QLENS.ENGINES[engineId] || QLENS.ENGINES[QLENS.CONFIG.DEFAULT_SETTINGS.defaultEngine];
    const logo = modeId ? SEARCH_SVG : svgLogo(spec.id);
    engineChipBtn.appendChild(iconSvg(logo));
    engineChipBtn.appendChild(el('span', null, spec.name));
  }

  function renderPills() {
    if (!pillsRow) return;
    pillsRow.textContent = '';
    for (const id of engineOrder) {
      const eng = QLENS.ENGINES[id];
      if (!eng) continue;
      const pill = el('button', 'ql-pill');
      pill.type = 'button';
      pill.dataset.engine = id;
      pill.setAttribute('aria-label', 'Search with ' + eng.name);
      if (id === engineId && !modeId) pill.classList.add('ql-active');
      pill.appendChild(iconSvg(svgLogo(id)));
      pill.appendChild(el('span', null, eng.name));
      pillsRow.appendChild(pill);
    }
    modeRow.textContent = '';
    const modeKeys = Object.keys(QLENS.QUICK_MODES);
    for (const id of modeKeys) {
      const mode = QLENS.QUICK_MODES[id];
      const pill = el('button', 'ql-pill');
      pill.type = 'button';
      pill.dataset.mode = id;
      pill.setAttribute('aria-label', 'Search ' + mode.name);
      if (id === modeId) pill.classList.add('ql-active');
      pill.appendChild(el('span', null, mode.name));
      modeRow.appendChild(pill);
    }
  }

  function applyTheme(s) {
    if (s.theme === 'system') {
      host.removeAttribute('data-theme');
    } else {
      host.setAttribute('data-theme', s.theme);
    }
    const hex = QLENS.CONFIG.ACCENTS[s.accent] || QLENS.CONFIG.ACCENTS.indigo;
    host.style.setProperty('--ql-accent', hex);
    host.style.setProperty('--ql-accent-soft', hex + '17');
    host.style.setProperty('--ql-accent-strong', hex + '2E');
  }

  function addListeners() {
    root.addEventListener('keydown', onKeyDown);
    inputEl.addEventListener('input', onInput);
    clearBtn.addEventListener('click', () => {
      inputEl.value = '';
      inputEl.focus();
      updateInputState();
    });
    hintBtn.addEventListener('click', () => {
      cycleEngine();
    });
    engineChipBtn.addEventListener('click', () => {
      cycleEngine();
      inputEl.focus();
    });
    pillsRow.addEventListener('click', (e) => {
      const pill = e.target.closest('[data-engine]');
      if (!pill) return;
      setEngine(pill.dataset.engine);
      inputEl.focus();
    });
    modeRow.addEventListener('click', (e) => {
      const pill = e.target.closest('[data-mode]');
      if (!pill) return;
      setMode(pill.dataset.mode);
      inputEl.focus();
    });
    sectionsEl.addEventListener('click', onSectionClick);
    backdropEl.addEventListener('click', (e) => {
      if (e.target === backdropEl) destroy(true);
    });
  }

  function onInput() {
    updateInputState();
  }

  function onKeyDown(e) {
    if (e.key === 'Escape') {
      e.preventDefault();
      destroy(true);
      return;
    }
    if (e.key === 'Tab') {
      handleTab(e);
      return;
    }
    if (e.target !== inputEl) return;
    if (e.key === 'Enter') {
      if (e.isComposing) return;
      e.preventDefault();
      if (suggestionHighlight >= 0 && suggestions[suggestionHighlight] && suggestions[suggestionHighlight].dataset.query) {
        submitQuery(suggestions[suggestionHighlight].dataset.query);
      } else if (actionSite) {
        goToSite(actionSite);
      } else {
        submitQuery(inputEl.value);
      }
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      moveHighlight(1);
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      moveHighlight(-1);
    }
  }

  function handleTab(e) {
    const focusables = getFocusables();
    if (e.target === inputEl) {
      e.preventDefault();
      if (e.shiftKey) {
        const idx = focusables.indexOf(inputEl);
        const prev = idx <= 0 ? focusables[focusables.length - 1] : focusables[idx - 1];
        if (prev) prev.focus();
      } else {
        cycleEngine();
      }
      return;
    }
    e.preventDefault();
    const idx = focusables.indexOf(e.target);
    let next = e.shiftKey ? idx - 1 : idx + 1;
    if (next < 0) next = focusables.length - 1;
    if (next >= focusables.length) next = 0;
    const target = focusables[next];
    if (target) target.focus();
  }

  function getFocusables() {
    return Array.from(panel.querySelectorAll('button, input')).filter((n) => !n.disabled && n.getClientRects().length > 0);
  }

  function cycleEngine() {
    if (!engineOrder.length) return;
    const idx = engineOrder.indexOf(engineId);
    const next = engineOrder[(idx + 1) % engineOrder.length];
    if (next) setEngine(next);
    inputEl.focus();
  }

  function setEngine(id) {
    engineId = id;
    modeId = null;
    renderEngineChip();
    renderPills();
    QLENS.storage.setLastEngine(id);
  }

  function setMode(id) {
    modeId = id;
    renderEngineChip();
    renderPills();
  }

  function updateInputState() {
    if (!host) return;
    const value = inputEl.value;
    clearBtn.style.display = value ? 'flex' : 'none';
    if (selectionActive && value.trim() !== selectionText) {
      selectionActive = false;
      selectionChipEl.classList.add('ql-hidden');
    }
    const parsed = QLENS.parsePrefix(value);
    if (parsed) {
      applyPrefix(parsed);
      return;
    }
    modeRow.classList.toggle('ql-hidden', !value.trim());
    const site = QLENS.detectSmartUrl(value);
    if (site) {
      hideRecent();
      hideSuggestions();
      renderActionRow(site);
    } else if (value.trim()) {
      hideAction();
      if (settings && settings.suggestions) {
        scheduleSuggestions();
      } else {
        hideSuggestions();
      }
    } else {
      hideAction();
      hideSuggestions();
      if (settings && settings.showRecent) {
        renderRecentList();
      }
    }
  }

  function applyPrefix(parsed) {
    if (parsed.type === 'engine') {
      if (parsed.id !== engineId || modeId) {
        setEngine(parsed.id);
      }
    } else if (parsed.type === 'mode') {
      if (parsed.id !== modeId) {
        setMode(parsed.id);
      }
    }
    if (parsed.rest !== inputEl.value) {
      inputEl.value = parsed.rest;
      placeCaretEnd();
    }
    updateInputState();
  }

  function placeCaretEnd() {
    try {
      inputEl.setSelectionRange(inputEl.value.length, inputEl.value.length);
    } catch (err) {
      /* caret placement is best-effort */
    }
  }

  function focusInput() {
    try {
      inputEl.focus();
    } catch (err) {
      return;
    }
    placeCaretEnd();
  }

  function scheduleSuggestions() {
    clearTimeout(suggestionTimer);
    suggestionTimer = setTimeout(() => {
      fetchSuggestions(inputEl.value, modeId || engineId);
    }, QLENS.CONFIG.SUGGESTION_DEBOUNCE_MS);
  }

  async function fetchSuggestions(query, engine) {
    const reqId = ++suggestionReqId;
    let results = [];
    try {
      const resp = await chrome.runtime.sendMessage({
        type: QLENS.MSG.FETCH_SUGGESTIONS,
        payload: { engine, query, id: reqId }
      });
      if (resp && resp.ok && resp.id === reqId) {
        results = Array.isArray(resp.results) ? resp.results : [];
      }
    } catch (err) {
      results = [];
    }
    if (reqId !== suggestionReqId) return;
    if (!host || inputEl.value.trim() !== query.trim()) return;
    renderSuggestions(results, query);
  }

  function renderSuggestions(list, query) {
    if (!host) return;
    if (sectionsEl.dataset.mode === 'recent') sectionsEl.dataset.mode = '';
    sectionsEl.textContent = '';
    hideAction();
    const sec = el('div', 'ql-section');
    const head = el('div', 'ql-section-head');
    head.appendChild(el('span', null, 'Suggestions'));
    const engineDef = QLENS.ENGINES[engineId];
    if (engineDef && engineDef.suggestionLabel) {
      head.appendChild(el('span', 'ql-section-note', engineDef.suggestionLabel));
    }
    sec.appendChild(head);
    const listEl = el('ul', 'ql-list');
    sec.appendChild(listEl);

    const searchRow = el('button', 'ql-row');
    searchRow.type = 'button';
    searchRow.id = 'ql-sug-0';
    searchRow.dataset.action = 'suggest';
    searchRow.dataset.query = query;
    searchRow.appendChild(iconSvg(SEARCH_SVG));
    searchRow.appendChild(el('span', 'ql-row-text', 'Search for "' + query + '"'));
    listEl.appendChild(searchRow);
    const rows = [searchRow];

    const count = Math.min(list.length, QLENS.CONFIG.MAX_SUGGESTIONS);
    for (let i = 0; i < count; i++) {
      const item = list[i];
      const row = el('button', 'ql-row');
      row.type = 'button';
      row.id = 'ql-sug-' + (i + 1);
      row.dataset.action = 'suggest';
      row.dataset.query = item;
      row.appendChild(iconSvg(SEARCH_SVG));
      row.appendChild(el('span', 'ql-row-text', item));
      listEl.appendChild(row);
      rows.push(row);
    }
    sectionsEl.appendChild(sec);
    suggestions = rows;
    suggestionHighlight = -1;
  }

  function hideSuggestions() {
    suggestions = [];
    suggestionHighlight = -1;
    inputEl.removeAttribute('aria-activedescendant');
  }

  function moveHighlight(dir) {
    if (!suggestions.length) return;
    const n = suggestions.length;
    let idx = suggestionHighlight + dir;
    if (idx < 0) idx = n - 1;
    if (idx >= n) idx = 0;
    setHighlight(idx);
  }

  function setHighlight(idx) {
    for (let i = 0; i < suggestions.length; i++) {
      suggestions[i].classList.toggle('ql-row-active', i === idx);
    }
    suggestionHighlight = idx;
    if (idx >= 0 && suggestions[idx]) {
      inputEl.setAttribute('aria-activedescendant', suggestions[idx].id);
    } else {
      inputEl.removeAttribute('aria-activedescendant');
    }
  }

  function renderActionRow(site) {
    sectionsEl.textContent = '';
    actionSite = site;
    const sec = el('div', 'ql-section');
    const row = el('button', 'ql-row ql-row-action');
    row.type = 'button';
    row.dataset.action = 'site';
    row.appendChild(iconSvg(SITE_SVG));
    row.appendChild(el('span', 'ql-row-text', 'Go to site \u2014 ' + site));
    row.appendChild(el('span', 'ql-row-enter', 'Enter'));
    sec.appendChild(row);
    sectionsEl.appendChild(sec);
  }

  function hideAction() {
    actionSite = null;
  }

  function hideRecent() {
    recentItems = [];
    if (sectionsEl) {
      sectionsEl.textContent = '';
    }
  }

  async function renderRecent() {
    let items = [];
    try {
      items = await QLENS.storage.getRecent();
    } catch (err) {
      items = [];
    }
    if (!host) return;
    recentItems = items;
    renderRecentList();
  }

  function renderRecentList() {
    if (!host) return;
    if (inputEl.value.trim()) return;
    sectionsEl.textContent = '';
    if (!recentItems.length) return;
    const sec = el('div', 'ql-section');
    const head = el('div', 'ql-section-head');
    head.appendChild(el('span', null, 'Recent'));
    const clearAll = el('button', 'ql-link');
    clearAll.type = 'button';
    clearAll.textContent = 'Clear all';
    clearAll.addEventListener('click', async () => {
      try {
        await QLENS.storage.clearRecent();
      } catch (err) {
        return;
      }
      recentItems = [];
      renderRecentList();
    });
    head.appendChild(clearAll);
    sec.appendChild(head);
    const listEl = el('ul', 'ql-list');
    for (const item of recentItems) {
      const li = el('li', 'ql-recent');
      const main = el('button', 'ql-row');
      main.type = 'button';
      main.dataset.action = 'recent';
      main.dataset.query = item.query;
      main.dataset.engine = item.engine;
      main.appendChild(iconSvg(CLOCK_SVG));
      main.appendChild(el('span', 'ql-row-text', item.query));
      const badge = engineBadge(item.engine);
      if (badge) main.appendChild(badge);
      const del = el('button', 'ql-recent-del');
      del.type = 'button';
      del.dataset.action = 'recent-del';
      del.dataset.query = item.query;
      del.setAttribute('aria-label', 'Remove from history');
      del.appendChild(iconSvg(X_SVG));
      li.appendChild(main);
      li.appendChild(del);
      listEl.appendChild(li);
    }
    sec.appendChild(listEl);
    sectionsEl.appendChild(sec);
  }

  function engineBadge(id) {
    if (QLENS.ENGINES[id]) {
      const badge = el('span', 'ql-badge');
      badge.appendChild(iconSvg(svgLogo(id)));
      badge.appendChild(el('span', null, QLENS.ENGINES[id].name));
      return badge;
    }
    if (QLENS.QUICK_MODES[id]) {
      const badge = el('span', 'ql-badge');
      badge.appendChild(el('span', null, QLENS.QUICK_MODES[id].name));
      return badge;
    }
    return null;
  }

  function onSectionClick(e) {
    const row = e.target.closest('[data-action]');
    if (!row) return;
    const action = row.dataset.action;
    if (action === 'suggest') {
      if (row.dataset.query) submitQuery(row.dataset.query);
    } else if (action === 'recent') {
      if (row.dataset.query) {
        submitQuery(row.dataset.query, row.dataset.engine || undefined);
      }
    } else if (action === 'recent-del') {
      const q = row.dataset.query;
      QLENS.storage.removeRecent(q).then(() => {
        recentItems = recentItems.filter((item) => item.query.toLowerCase() !== q.toLowerCase());
        renderRecentList();
      }).catch(() => {});
    } else if (action === 'site') {
      if (actionSite) goToSite(actionSite);
    }
  }

  function submitQuery(query, engineOverride) {
    const q = String(query == null ? '' : query).trim();
    if (!q) return;
    const engine = engineOverride || engineId;
    const url = QLENS.buildSearchUrl(engine, q, modeId);
    if (!url) return;
    openTab(url, q, engine);
  }

  function goToSite(url) {
    if (!QLENS.isSafeHttpUrl(url)) return;
    openTab(url, null, null);
  }

  function openTab(url, query, engine) {
    const payload = { url };
    if (query) payload.query = query;
    if (engine) payload.engine = engine;
    try {
      chrome.runtime.sendMessage({ type: QLENS.MSG.OPEN_TAB, payload }).catch(() => {});
    } catch (err) {
      /* send is best-effort; overlay still destroyed */
    }
    destroy(false);
  }

  function show(payload) {
    if (host) return;
    prevFocusEl = document.activeElement;
    engineId = QLENS.CONFIG.DEFAULT_SETTINGS.defaultEngine;
    initialEngineId = engineId;
    modeId = null;
    actionSite = null;
    suggestions = [];
    suggestionHighlight = -1;
    recentItems = [];
    selectionText = null;
    selectionActive = false;
    settings = null;

    const p = payload || {};
    let text = null;
    if (typeof p.selection === 'string' && p.selection.trim()) {
      text = QLENS.Selection.truncate(p.selection, QLENS.CONFIG.DEFAULT_SETTINGS.maxSelection);
    } else {
      text = QLENS.Selection.capture(QLENS.CONFIG.DEFAULT_SETTINGS.maxSelection);
    }

    build();
    if (text) {
      selectionText = text;
      selectionActive = true;
      inputEl.value = text;
      selectionChipEl.classList.remove('ql-hidden');
    }
    focusInput();
    updateInputState();
    hydrate();
  }

  async function hydrate() {
    let s = null;
    try {
      s = await QLENS.storage.getSettings();
    } catch (err) {
      s = { ...QLENS.CONFIG.DEFAULT_SETTINGS };
    }
    if (!host) return;
    settings = s;
    engineOrder = s.engineOrder.slice();
    applyTheme(s);
    const last = await QLENS.storage.getLastEngine();
    if (!host) return;
    if (engineId === initialEngineId) {
      setEngine(last);
    }
    if (selectionActive && inputEl.value) {
      const t = QLENS.Selection.truncate(selectionText, s.maxSelection);
      if (t !== inputEl.value) {
        inputEl.value = t;
        placeCaretEnd();
        updateInputState();
      }
    }
    if (s.autoCopySelection && selectionActive && selectionText) {
      try {
        await navigator.clipboard.writeText(selectionText);
      } catch (err) {
        /* clipboard denied — silently skipped */
      }
    }
    if (s.blurClose) {
      root.addEventListener('focusout', onFocusOut);
    }
    if (s.showRecent && !inputEl.value.trim()) {
      renderRecent();
    }
  }

  function onFocusOut(e) {
    if (!settings || !settings.blurClose) return;
    const related = e.relatedTarget;
    if (related && host && host.contains(related)) return;
    setTimeout(() => {
      if (!host) return;
      const active = document.activeElement;
      if (!host.contains(active)) destroy(true);
    }, 0);
  }

  function destroy(animate) {
    if (!host || closing) return;
    closing = true;
    clearTimeout(suggestionTimer);
    suggestionTimer = null;
    suggestionReqId++;
    let reduced = false;
    try {
      reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch (err) {
      reduced = false;
    }
    if (animate && !reduced) {
      panel.classList.add('ql-out');
      setTimeout(removeHost, 150);
    } else {
      removeHost();
    }
  }

  function removeHost() {
    if (host && host.parentNode) {
      try {
        host.parentNode.removeChild(host);
      } catch (err) {
        /* host already detached */
      }
    }
    host = null;
    root = null;
    panel = null;
    backdropEl = null;
    inputEl = null;
    clearBtn = null;
    hintBtn = null;
    engineChipBtn = null;
    pillsRow = null;
    modeRow = null;
    sectionsEl = null;
    selectionChipEl = null;
    closing = false;
    suggestions = [];
    suggestionHighlight = -1;
    restoreFocus();
  }

  function restoreFocus() {
    const target = prevFocusEl;
    prevFocusEl = null;
    if (target && target.isConnected && typeof target.focus === 'function') {
      try {
        target.focus();
      } catch (err) {
        /* focus restore is best-effort */
      }
    }
  }

  return {
    show,
    destroy,
    isVisible: () => Boolean(host)
  };
})();

QLENS.Overlay = Overlay;