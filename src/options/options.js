globalThis.QLENS = globalThis.QLENS || {};

(() => {
  let settings = null;

  function $(id) {
    return document.getElementById(id);
  }

  function iconSvg(markup) {
    const s = document.createElement('span');
    s.className = 'pill-icon';
    s.innerHTML = markup;
    return s;
  }

  function showToast(text) {
    let t = document.querySelector('.toast');
    if (!t) {
      t = document.createElement('div');
      t.className = 'toast';
      document.body.appendChild(t);
    }
    t.textContent = text;
    requestAnimationFrame(() => t.classList.add('show'));
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => t.classList.remove('show'), 1800);
  }

  function applyAppearance() {
    if (settings.theme === 'system') {
      document.documentElement.removeAttribute('data-theme');
    } else {
      document.documentElement.setAttribute('data-theme', settings.theme);
    }
    const hex = QLENS.CONFIG.ACCENTS[settings.accent] || QLENS.CONFIG.ACCENTS.indigo;
    document.documentElement.style.setProperty('--accent', hex);
    document.documentElement.style.setProperty('--accent-soft', hex + '1F');
    document.documentElement.style.setProperty('--accent-strong', hex + '38');
  }

  function renderDefaultEngines() {
    const wrap = $('default-engine');
    wrap.textContent = '';
    for (const id of settings.engineOrder) {
      const eng = QLENS.ENGINES[id];
      if (!eng) continue;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'pill' + (id === settings.defaultEngine ? ' active' : '');
      btn.dataset.engine = id;
      btn.setAttribute('role', 'radio');
      btn.setAttribute('aria-checked', String(id === settings.defaultEngine));
      btn.appendChild(iconSvg(QLENS.LOGOS[id]));
      btn.appendChild(document.createTextNode(eng.name));
      btn.addEventListener('click', async () => {
        settings = await QLENS.storage.setSettings({ defaultEngine: id });
        renderDefaultEngines();
      });
      wrap.appendChild(btn);
    }
  }

  function renderOrderList() {
    const list = $('order-list');
    list.textContent = '';
    settings.engineOrder.forEach((id, idx) => {
      const eng = QLENS.ENGINES[id];
      if (!eng) return;
      const li = document.createElement('li');
      li.className = 'order-item';
      li.draggable = true;
      li.dataset.engine = id;

      const grip = document.createElement('span');
      grip.className = 'grip';
      grip.setAttribute('aria-hidden', 'true');
      grip.textContent = '\u280F';

      const name = document.createElement('span');
      name.className = 'name';
      name.textContent = eng.name;

      const up = document.createElement('button');
      up.className = 'mv';
      up.type = 'button';
      up.textContent = '\u2191';
      up.setAttribute('aria-label', 'Move ' + eng.name + ' up');
      up.disabled = idx === 0;
      up.addEventListener('click', () => moveOrder(idx, -1));

      const down = document.createElement('button');
      down.className = 'mv';
      down.type = 'button';
      down.textContent = '\u2193';
      down.setAttribute('aria-label', 'Move ' + eng.name + ' down');
      down.disabled = idx === settings.engineOrder.length - 1;
      down.addEventListener('click', () => moveOrder(idx, 1));

      li.appendChild(grip);
      li.appendChild(name);
      li.appendChild(up);
      li.appendChild(down);
      list.appendChild(li);
    });
  }

  async function moveOrder(from, delta) {
    const to = from + delta;
    if (to < 0 || to >= settings.engineOrder.length) return;
    const order = settings.engineOrder.slice();
    const item = order.splice(from, 1)[0];
    order.splice(to, 0, item);
    await saveOrder(order);
  }

  async function saveOrder(order) {
    settings = await QLENS.storage.setSettings({ engineOrder: order });
    renderOrderList();
    renderDefaultEngines();
    showToast('Engine order saved');
  }

  function bindDnD() {
    const list = $('order-list');
    let dragItem = null;
    list.addEventListener('dragstart', (e) => {
      const li = e.target.closest('.order-item');
      if (!li) return;
      dragItem = li;
      li.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      try {
        e.dataTransfer.setData('text/plain', li.dataset.engine);
      } catch (err) {
        /* drag data is best-effort */
      }
    });
    list.addEventListener('dragover', (e) => {
      e.preventDefault();
      const li = e.target.closest('.order-item');
      if (!li || li === dragItem) return;
      const rect = li.getBoundingClientRect();
      const before = e.clientY < rect.top + rect.height / 2;
      list.insertBefore(dragItem, before ? li : li.nextSibling);
    });
    list.addEventListener('drop', (e) => {
      e.preventDefault();
      if (!dragItem) return;
      const order = Array.from(list.querySelectorAll('.order-item')).map((li) => li.dataset.engine);
      saveOrder(order);
    });
    list.addEventListener('dragend', () => {
      if (dragItem) dragItem.classList.remove('dragging');
      dragItem = null;
    });
  }

  function renderSeg(id) {
    const wrap = $(id);
    const value = id === 'theme' ? settings.theme : settings.contextMenuAction;
    for (const btn of wrap.querySelectorAll('.seg-btn')) {
      const v = btn.dataset.theme || btn.dataset.action;
      btn.classList.toggle('active', v === value);
      btn.setAttribute('aria-pressed', String(v === value));
    }
  }

  function bindSeg(id) {
    const wrap = $(id);
    wrap.addEventListener('click', async (e) => {
      const btn = e.target.closest('.seg-btn');
      if (!btn) return;
      if (id === 'theme') {
        settings = await QLENS.storage.setSettings({ theme: btn.dataset.theme });
        applyAppearance();
      } else {
        settings = await QLENS.storage.setSettings({ contextMenuAction: btn.dataset.action });
      }
      renderSeg(id);
    });
  }

  function renderSwatches() {
    const wrap = $('swatches');
    wrap.textContent = '';
    for (const name of Object.keys(QLENS.CONFIG.ACCENTS)) {
      const hex = QLENS.CONFIG.ACCENTS[name];
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'swatch' + (name === settings.accent ? ' active' : '');
      b.style.background = hex;
      b.dataset.accent = name;
      b.setAttribute('role', 'radio');
      b.setAttribute('aria-checked', String(name === settings.accent));
      b.setAttribute('aria-label', 'Accent ' + name);
      b.addEventListener('click', async () => {
        settings = await QLENS.storage.setSettings({ accent: name });
        applyAppearance();
        renderSwatches();
      });
      wrap.appendChild(b);
    }
  }

  const TOGGLE_MAP = {
    'opt-suggestions': 'suggestions',
    'opt-blurClose': 'blurClose',
    'opt-autoCopy': 'autoCopySelection'
  };

  function setToggleStates() {
    for (const elId of Object.keys(TOGGLE_MAP)) {
      $(elId).checked = Boolean(settings[TOGGLE_MAP[elId]]);
    }
  }

  function bindToggles() {
    for (const elId of Object.keys(TOGGLE_MAP)) {
      const input = $(elId);
      input.addEventListener('change', async () => {
        settings = await QLENS.storage.setSettings({ [TOGGLE_MAP[elId]]: input.checked });
      });
    }
  }

  function showShortcut() {
    QLENS.storage
      .getShortcut()
      .then((combo) => {
        $('shortcut-input').value = combo;
      })
      .catch(() => {});
  }

  function bindShortcutCapture() {
    const input = $('shortcut-input');
    const note = $('shortcut-note');
    let pending = null;
    input.addEventListener('focus', () => {
      note.textContent = 'Press the keys you want to use (Ctrl or Alt + a key), then click Save.';
    });
    input.addEventListener('keydown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.key === 'Escape') {
        input.blur();
        return;
      }
      const combo = QLENS.buildCombo(e, e.key, e.code);
      if (!combo) {
        note.textContent = 'Use a modifier (Ctrl or Alt) plus a letter, number, or F-key.';
        return;
      }
      pending = combo;
      input.value = combo;
      note.textContent = 'Shortcut: ' + combo + ' — click Save to apply.';
    });
    $('shortcut-save').addEventListener('click', async () => {
      const combo = pending || (input.value.trim() || '');
      if (!QLENS.isValidCombo(combo)) {
        note.textContent = 'Invalid shortcut. Use Ctrl or Alt plus a key.';
        return;
      }
      const ok = await QLENS.storage.setShortcut(combo);
      if (!ok) {
        note.textContent = 'Could not save the shortcut.';
        return;
      }
      pending = null;
      note.textContent = 'Saved — QLens now opens with ' + combo + ' on any page.';
      showToast('Shortcut updated');
    });
  }

  function showVersion() {
    let v = QLENS.CONFIG.VERSION;
    try {
      if (chrome && chrome.runtime && chrome.runtime.getManifest) {
        v = chrome.runtime.getManifest().version || v;
      }
    } catch (err) {
      v = QLENS.CONFIG.VERSION;
    }
    $('version').textContent = v;
    $('foot-version').textContent = 'QLens v' + v;
  }

  async function init() {
    try {
      settings = await QLENS.storage.getSettings();
    } catch (err) {
      settings = { ...QLENS.CONFIG.DEFAULT_SETTINGS };
    }
    applyAppearance();
    renderDefaultEngines();
    renderOrderList();
    renderSeg('theme');
    renderSeg('ctx');
    renderSwatches();
    setToggleStates();
    bindToggles();
    bindSeg('theme');
    bindSeg('ctx');
    bindDnD();
    bindData();
    showShortcut();
    bindShortcutCapture();
    showVersion();
  }

  function bindData() {
    $('reset-all').addEventListener('click', async () => {
      await QLENS.storage.resetAll();
      settings = await QLENS.storage.getSettings();
      applyAppearance();
      renderDefaultEngines();
      renderOrderList();
      renderSeg('theme');
      renderSeg('ctx');
      renderSwatches();
      setToggleStates();
      showToast('Reset to defaults');
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();