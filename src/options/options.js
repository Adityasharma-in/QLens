globalThis.QLENS = globalThis.QLENS || {};

(() => {
  let settings = null;
  let savedShortcut = QLENS.CONFIG.SHORTCUT_DEFAULT;
  let pendingShortcut = null;
  let capturingShortcut = false;
  let updateEdgeCollapseUI = null;
  let toastTimer = null;

  function $(id) {
    return document.getElementById(id);
  }

  function iconSvg(markup) {
    const s = document.createElement('span');
    s.className = 'pill-icon';
    s.setAttribute('aria-hidden', 'true');
    try {
      if (QLENS.setIcon && QLENS.setIcon(s, markup)) return s;
    } catch (err) {}
    try { s.textContent = ''; } catch (e2) {}
    return s;
  }

  function showToast(text) {
    let t = document.querySelector('.toast');
    if (!t) {
      t = document.createElement('div');
      t.className = 'toast';
      t.setAttribute('role', 'status');
      t.setAttribute('aria-live', 'polite');
      document.body.appendChild(t);
    }
    t.textContent = text;
    requestAnimationFrame(() => t.classList.add('show'));
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 1800);
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

  function engineSpecs() {
    const map = {};
    if (QLENS.ENGINES) {
      for (const id of Object.keys(QLENS.ENGINES)) map[id] = QLENS.ENGINES[id];
    }
    try {
      const customs = typeof QLENS.getCustomEngines === 'function'
        ? QLENS.getCustomEngines(settings)
        : [];
      for (const c of customs) {
        if (c && c.id && !map[c.id]) map[c.id] = { id: c.id, name: c.name };
      }
    } catch (err) {}
    return map;
  }

  function renderDefaultEngines() {
    const wrap = $('default-engine');
    wrap.textContent = '';
    const specs = engineSpecs();
    for (const id of settings.engineOrder) {
      const eng = specs[id];
      if (!eng) continue;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'pill' + (id === settings.defaultEngine ? ' active' : '');
      btn.dataset.engine = id;
      btn.setAttribute('role', 'radio');
      btn.setAttribute('aria-checked', String(id === settings.defaultEngine));
      btn.appendChild(iconSvg(QLENS.LOGOS[id] || QLENS.LOGOS.custom || ''));
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
    const specs = engineSpecs();
    settings.engineOrder.forEach((id, idx) => {
      const eng = specs[id];
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
      btn.setAttribute('aria-checked', String(v === value));
    }
  }

  function bindSeg(id) {
    const wrap = $(id);
    if (!wrap || wrap.dataset.segBound === '1') return;
    wrap.dataset.segBound = '1';
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
      const el = $(elId);
      if (!el) continue;
      el.checked = Boolean(settings[TOGGLE_MAP[elId]]);
    }
  }

  function bindToggles() {
    for (const elId of Object.keys(TOGGLE_MAP)) {
      const input = $(elId);
      if (!input) continue;
      input.addEventListener('change', async () => {
        settings = await QLENS.storage.setSettings({ [TOGGLE_MAP[elId]]: input.checked });
      });
    }
  }

  function showShortcut() {
    return QLENS.storage
      .getShortcut()
      .then((combo) => {
        savedShortcut = combo;
        const el = $('shortcut-input');
        if (el && !capturingShortcut && !pendingShortcut) {
          el.value = combo;
          el.classList.remove('is-pending');
        }
      })
      .catch(() => {});
  }

  function bindShortcutCapture() {
    const input = $('shortcut-input');
    const note = $('shortcut-note');
    const saveBtn = $('shortcut-save');
    const resetBtn = $('shortcut-reset');
    const testBtn = $('shortcut-test');
    if (!input || !note) return;

    const setNote = (text, tone) => {
      note.textContent = text;
      if (tone) note.dataset.tone = tone;
      else delete note.dataset.tone;
    };
    const clearPending = () => {
      pendingShortcut = null;
      input.classList.remove('is-pending');
      if (saveBtn) saveBtn.disabled = true;
    };
    const rejectCombo = (text) => {
      clearPending();
      input.value = savedShortcut;
      setNote(text, 'error');
    };
    const setPending = (combo) => {
      pendingShortcut = combo;
      input.value = combo;
      input.classList.add('is-pending');
      if (saveBtn) saveBtn.disabled = false;
      setNote('Shortcut: ' + combo + ' — click Save to apply.', 'ok');
    };

    input.addEventListener('focus', () => {
      capturingShortcut = true;
      input.classList.add('is-recording');
      setNote('Listening… press Ctrl/Alt/Cmd + a key. Esc cancels, Tab moves on.', 'recording');
    });
    input.addEventListener('blur', () => {
      capturingShortcut = false;
      input.classList.remove('is-recording');
      if (pendingShortcut) {
        setNote('Unsaved: ' + pendingShortcut + ' — click Save to apply.', 'ok');
      } else {
        input.value = savedShortcut;
        setNote('Current: ' + savedShortcut + '. Click the field and press a new combo to change it.');
      }
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') return;
      e.preventDefault();
      e.stopPropagation();
      if (e.repeat) return;
      if (e.key === 'Escape') {
        clearPending();
        input.value = savedShortcut;
        input.blur();
        return;
      }
      if (e.key === 'Control' || e.key === 'Shift' || e.key === 'Alt' || e.key === 'Meta') return;
      const combo = QLENS.buildCombo(e, e.key, e.code);
      if (!combo) {
        rejectCombo('Hold Ctrl or Alt (Cmd on Mac) and press a letter, number, F-key, Space, or punctuation key.');
        return;
      }
      if (typeof QLENS.reservedComboReason === 'function') {
        const reason = QLENS.reservedComboReason(combo);
        if (reason) {
          rejectCombo(reason);
          return;
        }
      }
      if (!QLENS.isValidCombo(combo)) {
        rejectCombo('That combo cannot be saved. Use Ctrl or Alt plus one key.');
        return;
      }
      setPending(combo);
    });
    if (saveBtn) saveBtn.addEventListener('click', async () => {
      const combo = pendingShortcut || (input.value.trim() || '');
      if (!QLENS.isValidCombo(combo)) {
        rejectCombo('Invalid shortcut. Use Ctrl or Alt plus a key.');
        return;
      }
      const reason = typeof QLENS.reservedComboReason === 'function'
        ? QLENS.reservedComboReason(combo)
        : null;
      if (reason) {
        rejectCombo(reason);
        return;
      }
      const ok = await QLENS.storage.setShortcut(combo);
      if (!ok) {
        setNote('Could not save the shortcut. Try again.', 'error');
        return;
      }
      savedShortcut = combo;
      clearPending();
      input.value = combo;
      setNote('Saved — press ' + combo + ' on any normal website tab. Chrome blocks the overlay on settings pages.', 'ok');
      showToast('Shortcut updated');
    });
    if (resetBtn) resetBtn.addEventListener('click', async () => {
      const combo = QLENS.CONFIG.SHORTCUT_DEFAULT;
      const ok = await QLENS.storage.setShortcut(combo);
      if (!ok) {
        setNote('Could not restore the default shortcut.', 'error');
        return;
      }
      savedShortcut = combo;
      clearPending();
      input.value = combo;
      setNote('Default restored — press ' + combo + ' on any normal website tab.', 'ok');
      showToast('Default shortcut restored');
    });
    if (testBtn) testBtn.addEventListener('click', async () => {
      if (pendingShortcut) {
        setNote('Save ' + pendingShortcut + ' first, then test it on a normal page.', 'error');
        showToast('Save the shortcut first');
        return;
      }
      try {
        await chrome.tabs.create({ url: 'https://example.com/', active: true });
        showToast('Press ' + savedShortcut + ' on the new tab');
      } catch (err) {
        showToast('Could not open a test tab');
      }
    });
    if (saveBtn) saveBtn.disabled = true;
    const openBtn = $('shortcut-open');
    if (openBtn) openBtn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText('chrome://extensions/shortcuts');
        showToast('Address copied — paste it into your address bar');
      } catch (e) {
        showToast('Copy failed — type chrome://extensions/shortcuts manually');
      }
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

  // ---------- Edge Glow Studio ----------
  const EDGE_PRESETS = {
    subtle: { x:0,y:0,blur:72,spread:10,color:'#0a0a0f',opacity:58, blur2:140,spread2:18,color2:'#000000',opacity2:38, radius:0, border:8 },
    deep:   { x:0,y:14,blur:96,spread:16,color:'#000000',opacity:72, blur2:180,spread2:26,color2:'#000000',opacity2:52, radius:0, border:10 },
    neon:   { x:0,y:0,blur:84,spread:-6,color:'#ad7aff',opacity:44, blur2:160,spread2:4,color2:'#4c1d95',opacity2:46, radius:0, border:30 },
    paper:  { x:0,y:8,blur:36,spread:14,color:'#0f172a',opacity:18, blur2:90,spread2:10,color2:'#1e293b',opacity2:14, radius:0, border:14 }
  };

  function hexToRgba(hex, a) {
    const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || '').trim());
    if (!m) return 'rgba(173,122,255,' + a.toFixed(3) + ')';
    const n = parseInt(m[1], 16);
    const r = (n >> 16) & 255;
    const g = (n >> 8) & 255;
    const b = n & 255;
    return 'rgba(' + r + ',' + g + ',' + b + ',' + a.toFixed(3) + ')';
  }

  function getVS() {
    return settings && settings.viewportShadow ? settings.viewportShadow : QLENS.CONFIG.DEFAULT_SETTINGS.viewportShadow;
  }

  function buildVSShadow(vs) {
    const l1 = vs.layer1;
    const l2 = vs.layer2;
    const c1 = hexToRgba(l1.color, l1.opacity / 100);
    const c2 = hexToRgba(l2.color, l2.opacity / 100);
    const parts = [];
    parts.push('inset ' + l1.x + 'px ' + l1.y + 'px ' + l1.blur + 'px ' + l1.spread + 'px ' + c1);
    if (l2.enabled) parts.push('inset 0 0 ' + l2.blur + 'px ' + l2.spread + 'px ' + c2);
    parts.push('inset 0 1px 0 rgba(255,255,255,0.06)');
    return parts.join(', ');
  }

  function syncEdgeUI() {
    const vs = getVS();
    const l1 = vs.layer1;
    const l2 = vs.layer2;
    const f = vs.frame;
    $('opt-edgeEnabled').checked = Boolean(vs.enabled);
    $('opt-edgeLayer2').checked = Boolean(l2.enabled);
    const controls = $('edge-controls');
    if (controls) {
      controls.classList.toggle('is-disabled', !vs.enabled);
      const stateEl = $('edge-layer2-state');
      if (stateEl) { stateEl.textContent = l2.enabled ? 'ON' : 'OFF'; stateEl.style.color = l2.enabled ? 'var(--accent)' : 'var(--text-dim)'; }
      const l2c = $('edge-layer2-controls');
      if (l2c) { l2c.style.opacity = l2.enabled ? '1' : '0.42'; l2c.style.pointerEvents = l2.enabled ? 'auto' : 'none'; l2c.style.filter = l2.enabled ? 'none' : 'grayscale(.2)'; }
    }
    const setVal = (id, v) => { const e = $(id); if (e) e.value = String(v); };
    const setText = (id, t) => { const e = $(id); if (e) e.textContent = t; };
    setVal('edge-x', l1.x); setText('edge-v-x', l1.x + ' px');
    setVal('edge-y', l1.y); setText('edge-v-y', l1.y + ' px');
    setVal('edge-blur', l1.blur); setText('edge-v-blur', l1.blur + ' px');
    setVal('edge-spread', l1.spread); setText('edge-v-spread', l1.spread + ' px');
    setVal('edge-color', l1.color);
    const s1 = $('edge-swatch1'); if (s1) s1.style.background = l1.color;
    const ch1 = $('edge-colorHex'); if (ch1) ch1.textContent = l1.color.toUpperCase();
    setText('edge-v-opacity', l1.opacity + '%'); setText('edge-v-opacity2', l1.opacity + '%');
    setVal('edge-opacity', l1.opacity);
    setVal('edge-blur2', l2.blur); setText('edge-v-blur2', l2.blur + ' px');
    setVal('edge-spread2', l2.spread); setText('edge-v-spread2', l2.spread + ' px');
    setVal('edge-color2', l2.color);
    const s2 = $('edge-swatch2'); if (s2) s2.style.background = l2.color;
    const ch2 = $('edge-colorHex2'); if (ch2) ch2.textContent = l2.color.toUpperCase();
    setText('edge-v-opacity2b', l2.opacity + '%'); setText('edge-v-opacity2c', l2.opacity + '%');
    setVal('edge-opacity2', l2.opacity);
    setVal('edge-radius', f.radius); setText('edge-v-radius', f.radius + ' px');
    const bPerc = Math.round(f.borderOpacity * 100);
    setVal('edge-border', bPerc); setText('edge-v-border', f.borderOpacity.toFixed(2));
    document.querySelectorAll('.edge-preset').forEach(btn => {
      const key = btn.dataset.preset;
      const p = EDGE_PRESETS[key];
      const isActive = p && l1.blur === p.blur && l1.spread === p.spread && l1.color === p.color && l1.opacity === p.opacity;
      btn.classList.toggle('active', Boolean(isActive));
    });
    updateEdgePreview();
    updateEdgeCode();
  }

  function updateEdgePreview(vs) {
    const preview = $('edge-preview');
    if (!preview) return;
    vs = vs || getVS();
    if (!vs.enabled) {
      preview.style.boxShadow = 'none';
      preview.style.borderColor = 'var(--border)';
      preview.style.borderRadius = vs.frame.radius + 'px';
      preview.style.opacity = '0.55';
      return;
    }
    preview.style.opacity = '1';
    preview.style.borderRadius = vs.frame.radius + 'px';
    preview.style.borderColor = 'rgba(255,255,255,' + Number(vs.frame.borderOpacity).toFixed(2) + ')';
    preview.style.borderWidth = '1px';
    preview.style.borderStyle = 'solid';
    preview.style.boxShadow = buildVSShadow(vs);
  }

  function updateEdgeCode(vs) {
    const codeEl = $('edge-code');
    if (!codeEl) return;
    vs = vs || getVS();
    const shadow = buildVSShadow(vs);
    const f = vs.frame;
    const frameCss = '.ql-viewport-frame {\n  border-radius: ' + f.radius + 'px;\n  border: 1px solid rgba(255,255,255, ' + Number(f.borderOpacity).toFixed(2) + ');\n  box-shadow: ' + shadow + ';\n}';
    const pretty = shadow.split(', ').map((s,i)=> i===0 ? s : '           ' + s).join(',\n');
    const display = '/* Inner Shadow — copy this */\n.ql-viewport-frame {\n  border-radius: ' + f.radius + 'px;\n  border: 1px solid rgba(255,255,255, ' + Number(f.borderOpacity).toFixed(2) + ');\n  box-shadow: ' + pretty + ';\n}';
    codeEl.textContent = display;
    codeEl.dataset.raw = frameCss + '\n\n/* alternative — as CSS variable */\n:root {\n  --inner-shadow: ' + shadow + ';\n}';
    codeEl.dataset.config = JSON.stringify(vs, null, 2);
  }

  let edgeSaveTimer = 0;
  let pendingEdgePatch = null;

  function mergeEdgePatch(base, patch) {
    return {
      enabled: patch.enabled !== undefined ? patch.enabled : base.enabled,
      layer1: { ...base.layer1, ...(patch.layer1 || {}) },
      layer2: { ...base.layer2, ...(patch.layer2 || {}) },
      frame: { ...base.frame, ...(patch.frame || {}) }
    };
  }

  function mergeEdgePatches(a, b) {
    const out = { ...(a || {}) };
    if (!b) return out;
    if (b.enabled !== undefined) out.enabled = b.enabled;
    ['layer1', 'layer2', 'frame'].forEach((k) => {
      if (b[k]) out[k] = { ...((a && a[k]) || {}), ...b[k] };
    });
    return out;
  }

  function edgeText(ids, text) {
    (Array.isArray(ids) ? ids : [ids]).forEach((id) => {
      if (!id) return;
      const el = $(id);
      if (el) el.textContent = text;
    });
  }

  function previewEdge(patch) {
    const vs = mergeEdgePatch(getVS(), mergeEdgePatches(pendingEdgePatch, patch));
    updateEdgePreview(vs);
    updateEdgeCode(vs);
  }

  function queueSaveEdge(patch) {
    pendingEdgePatch = mergeEdgePatches(pendingEdgePatch, patch);
    clearTimeout(edgeSaveTimer);
    edgeSaveTimer = setTimeout(() => {
      const p = pendingEdgePatch;
      pendingEdgePatch = null;
      edgeSaveTimer = 0;
      saveEdge(p);
    }, 200);
  }

  function flushEdgeSave() {
    const p = pendingEdgePatch;
    pendingEdgePatch = null;
    clearTimeout(edgeSaveTimer);
    edgeSaveTimer = 0;
    if (!p) return Promise.resolve();
    return saveEdge(p);
  }

  async function saveEdge(patch) {
    clearTimeout(edgeSaveTimer);
    edgeSaveTimer = 0;
    // A preset click racing a pending slider flush must merge, not discard:
    // the debounce holds the latest slider patch and saveEdge holds the preset.
    const pending = pendingEdgePatch;
    pendingEdgePatch = null;
    const base = getVS();
    let next = base;
    const mergedPatch = mergeEdgePatches(pending, patch);
    if (mergedPatch && typeof mergedPatch === 'object' && Object.keys(mergedPatch).length) {
      next = mergeEdgePatch(base, mergedPatch);
    } else if (typeof patch === 'function') {
      next = patch(base);
    }
    settings = await QLENS.storage.setSettings({ viewportShadow: next });
    syncEdgeUI();
  }

  function bindEdgeStudio() {
    const enabledEl = $('opt-edgeEnabled');
    if (enabledEl) enabledEl.addEventListener('change', async () => {
      await saveEdge({ enabled: enabledEl.checked });
      showToast(enabledEl.checked ? 'Edge glow enabled' : 'Edge glow disabled');
    });

    const layer2El = $('opt-edgeLayer2');
    if (layer2El) layer2El.addEventListener('change', async () => {
      await saveEdge({ layer2: { enabled: layer2El.checked } });
    });

    const bindRange = (id, patchOf, valueId, format) => {
      const e = $(id);
      if (!e) return;
      e.addEventListener('input', () => {
        const patch = patchOf(e.value);
        edgeText(valueId, format(e.value));
        previewEdge(patch);
        queueSaveEdge(patch);
      });
      e.addEventListener('change', () => { flushEdgeSave(); });
    };

    bindRange('edge-x', (v) => ({ layer1: { x: parseInt(v, 10) } }), 'edge-v-x', (v) => v + ' px');
    bindRange('edge-y', (v) => ({ layer1: { y: parseInt(v, 10) } }), 'edge-v-y', (v) => v + ' px');
    bindRange('edge-blur', (v) => ({ layer1: { blur: parseInt(v, 10) } }), 'edge-v-blur', (v) => v + ' px');
    bindRange('edge-spread', (v) => ({ layer1: { spread: parseInt(v, 10) } }), 'edge-v-spread', (v) => v + ' px');
    bindRange('edge-opacity', (v) => ({ layer1: { opacity: parseInt(v, 10) } }), ['edge-v-opacity', 'edge-v-opacity2'], (v) => v + '%');
    bindRange('edge-blur2', (v) => ({ layer2: { blur: parseInt(v, 10) } }), 'edge-v-blur2', (v) => v + ' px');
    bindRange('edge-spread2', (v) => ({ layer2: { spread: parseInt(v, 10) } }), 'edge-v-spread2', (v) => v + ' px');
    bindRange('edge-opacity2', (v) => ({ layer2: { opacity: parseInt(v, 10) } }), ['edge-v-opacity2b', 'edge-v-opacity2c'], (v) => v + '%');
    bindRange('edge-radius', (v) => ({ frame: { radius: parseInt(v, 10) } }), 'edge-v-radius', (v) => v + ' px');
    bindRange('edge-border', (v) => ({ frame: { borderOpacity: parseInt(v, 10) / 100 } }), 'edge-v-border', (v) => (parseInt(v, 10) / 100).toFixed(2));

    const c1 = $('edge-color');
    if (c1) {
      c1.addEventListener('input', (e) => { previewEdge({ layer1: { color: e.target.value } }); queueSaveEdge({ layer1: { color: e.target.value } }); });
      c1.addEventListener('change', () => { flushEdgeSave(); });
    }
    const c2 = $('edge-color2');
    if (c2) {
      c2.addEventListener('input', (e) => { previewEdge({ layer2: { color: e.target.value } }); queueSaveEdge({ layer2: { color: e.target.value } }); });
      c2.addEventListener('change', () => { flushEdgeSave(); });
    }

    document.querySelectorAll('.edge-preset').forEach(btn => {
      btn.addEventListener('click', async () => {
        const key = btn.dataset.preset;
        const p = EDGE_PRESETS[key];
        if (!p) return;
        await saveEdge({
          layer1: { x:p.x, y:p.y, blur:p.blur, spread:p.spread, color:p.color, opacity:p.opacity },
          layer2: { enabled:true, blur:p.blur2, spread:p.spread2, color:p.color2, opacity:p.opacity2 },
          frame: { radius:p.radius, borderOpacity: p.border/100 }
        });
        showToast('Preset — ' + key);
      });
    });

    const copyCss = $('edge-copy-css');
    if (copyCss) copyCss.addEventListener('click', async () => {
      const codeEl = $('edge-code');
      const raw = codeEl ? codeEl.dataset.raw : '';
      try { await navigator.clipboard.writeText(raw); showToast('CSS copied'); } catch(e) { showToast('Copy failed'); }
    });
    const copyCfg = $('edge-copy-config');
    if (copyCfg) copyCfg.addEventListener('click', async () => {
      const codeEl = $('edge-code');
      const cfg = codeEl ? codeEl.dataset.config : '';
      try { await navigator.clipboard.writeText(cfg); showToast('Config copied'); } catch(e) { showToast('Copy failed'); }
    });
    const copyAll = $('edge-copy-all');
    if (copyAll) copyAll.addEventListener('click', async () => {
      const codeEl = $('edge-code');
      const raw = codeEl ? codeEl.dataset.raw : '';
      const cfg = codeEl ? codeEl.dataset.config : '';
      const all = raw + '\n\n/* Config JSON */\n' + cfg;
      try { await navigator.clipboard.writeText(all); showToast('CSS + config copied & saved'); } catch(e) { showToast('Copy failed'); }
    });
    const rand = $('edge-randomize');
    if (rand) rand.addEventListener('click', async () => {
      const rnd = (a,b)=> Math.floor(Math.random()*(b-a+1))+a;
      const colors = ['#ad7aff','#4c1d95','#0a0a0f','#1e1b4b','#6366f1','#8b5cf6','#0f172a'];
      await saveEdge({
        layer1: { x: rnd(-18,18), y: rnd(-12,18), blur: rnd(40,140), spread: rnd(-10,28), color: colors[rnd(0,colors.length-1)], opacity: rnd(28,76) },
        layer2: { enabled: Math.random()>0.2, blur: rnd(80,220), spread: rnd(-8,36), color: colors[rnd(0,colors.length-1)], opacity: rnd(18,52) },
        frame: { radius: rnd(0,12), borderOpacity: rnd(8,30)/100 }
      });
      showToast('Randomized — new edge');
    });
    const reset = $('edge-reset');
    if (reset) reset.addEventListener('click', async () => {
      const p = EDGE_PRESETS.neon;
      await saveEdge({
        layer1: { x:p.x, y:p.y, blur:p.blur, spread:p.spread, color:p.color, opacity:p.opacity },
        layer2: { enabled:true, blur:p.blur2, spread:p.spread2, color:p.color2, opacity:p.opacity2 },
        frame: { radius:p.radius, borderOpacity: p.border/100 }
      });
      showToast('Reset to Neon');
    });

    // collapse
    const collapseBtn = $('edge-collapse-btn');
    const edgeCard = $('card-edge');
    const updateCollapseUI = () => {
      const collapsed = Boolean(settings.edgeCollapsed);
      if (edgeCard) edgeCard.classList.toggle('is-collapsed', collapsed);
      if (collapseBtn) {
        collapseBtn.setAttribute('aria-expanded', String(!collapsed));
        const lab = collapseBtn.querySelector('.collapse-label');
        if (lab) lab.textContent = collapsed ? 'Expand' : 'Collapse';
      }
    };
    if (collapseBtn && edgeCard) {
      collapseBtn.addEventListener('click', async () => {
        const next = !settings.edgeCollapsed;
        settings = await QLENS.storage.setSettings({ edgeCollapsed: next });
        updateCollapseUI();
        showToast(next ? 'Edge lab collapsed' : 'Edge lab expanded');
      });
    }
    // module-scoped hook for sync/reset paths
    updateEdgeCollapseUI = updateCollapseUI;
    updateCollapseUI();
  }

  // ---------- Quick Commands ----------
  let editingFavId = null;

  function renderFavList() {
    const list = $('fav-list');
    const empty = $('fav-empty');
    const countEl = $('fav-count');
    const statEl = $('stat-commands');
    const favs = settings && Array.isArray(settings.favoriteSites) ? settings.favoriteSites : QLENS.CONFIG.DEFAULT_SETTINGS.favoriteSites;
    if (countEl) countEl.textContent = String(favs.length);
    if (statEl) statEl.textContent = String(favs.length);
    if (!list) return;
    list.textContent = '';
    if (!favs.length) {
      if (empty) empty.hidden = false;
      return;
    }
    if (empty) empty.hidden = true;
    favs.forEach((site, idx) => {
      const li = document.createElement('li');
      li.className = 'fav-item';
      li.draggable = true;
      li.dataset.id = site.id;
      const shortcut = document.createElement('div');
      shortcut.className = 'fav-shortcut';
      shortcut.textContent = '/' + site.shortcut;
      const main = document.createElement('div');
      main.className = 'fav-main';
      const label = document.createElement('div');
      label.className = 'fav-label';
      label.textContent = site.label;
      const url = document.createElement('div');
      url.className = 'fav-url';
      url.textContent = site.url;
      main.append(label, url);
      const actions = document.createElement('div');
      actions.className = 'fav-actions-item';
      const edit = document.createElement('button');
      edit.className = 'icon-btn';
      edit.type = 'button';
      edit.setAttribute('aria-label', 'Edit ' + site.label);
      edit.textContent = '✎';
      edit.addEventListener('click', () => openFavForm(site.id));
      const del = document.createElement('button');
      del.className = 'icon-btn danger';
      del.type = 'button';
      del.setAttribute('aria-label', 'Delete ' + site.label);
      del.textContent = '✕';
      del.addEventListener('click', async () => {
        if (!confirm('Delete "' + site.label + '" (' + '/' + site.shortcut + ')?')) return;
        const next = favs.filter((s) => s.id !== site.id);
        settings = await QLENS.storage.setSettings({ favoriteSites: next });
        renderFavList();
        showToast('Command deleted');
      });
      const up = document.createElement('button');
      up.className = 'icon-btn';
      up.type = 'button';
      up.textContent = '↑';
      up.disabled = idx === 0;
      up.addEventListener('click', async () => {
        const arr = favs.slice();
        const tmp = arr[idx]; arr[idx]=arr[idx-1]; arr[idx-1]=tmp;
        settings = await QLENS.storage.setSettings({ favoriteSites: arr });
        renderFavList();
      });
      const down = document.createElement('button');
      down.className = 'icon-btn';
      down.type = 'button';
      down.textContent = '↓';
      down.disabled = idx === favs.length - 1;
      down.addEventListener('click', async () => {
        const arr = favs.slice();
        const tmp = arr[idx]; arr[idx]=arr[idx+1]; arr[idx+1]=tmp;
        settings = await QLENS.storage.setSettings({ favoriteSites: arr });
        renderFavList();
      });
      actions.append(up, down, edit, del);
      // grip
      const grip = document.createElement('span');
      grip.textContent = '⋮';
      grip.style.color = 'var(--text-faint)';
      grip.style.cursor = 'grab';
      grip.style.padding = '0 4px';
      li.append(grip, shortcut, main, actions);
      // drag
      li.addEventListener('dragstart', (e) => {
        li.classList.add('dragging');
        e.dataTransfer.setData('text/plain', site.id);
      });
      li.addEventListener('dragend', () => li.classList.remove('dragging'));
      list.appendChild(li);
    });
  }

  function openFavForm(id) {
    const form = $('fav-form');
    const title = $('fav-form-title');
    const label = $('fav-label');
    const shortcut = $('fav-shortcut');
    const url = $('fav-url');
    const err = $('fav-error');
    if (!form || !label || !shortcut || !url) return;
    editingFavId = id || null;
    const favs = settings.favoriteSites;
    const site = id ? favs.find((s) => s.id === id) : null;
    if (site) {
      title.textContent = 'Edit command';
      label.value = site.label;
      shortcut.value = site.shortcut;
      url.value = site.url;
    } else {
      title.textContent = 'Add command';
      label.value = '';
      shortcut.value = '';
      url.value = '';
    }
    if (err) err.textContent = '';
    form.classList.remove('is-hidden');
    label.focus();
  }

  function closeFavForm() {
    const form = $('fav-form');
    if (form) form.classList.add('is-hidden');
    editingFavId = null;
    const err = $('fav-error');
    if (err) err.textContent = '';
  }

  function bindFav() {
    const addBtn = $('fav-add-btn');
    const closeBtn = $('fav-form-close');
    const cancel = $('fav-cancel');
    const form = $('fav-form');
    if (addBtn) addBtn.addEventListener('click', () => openFavForm(null));
    if (closeBtn) closeBtn.addEventListener('click', closeFavForm);
    if (cancel) cancel.addEventListener('click', (e) => { e.preventDefault(); closeFavForm(); });
    if (form) form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const labelEl = $('fav-label');
      const shortcutEl = $('fav-shortcut');
      const urlEl = $('fav-url');
      const err = $('fav-error');
      if (!labelEl || !shortcutEl || !urlEl) return;
      const label = labelEl.value.trim();
      const shortcut = shortcutEl.value.trim().toLowerCase();
      let url = urlEl.value.trim();
      if (!label) { if (err) err.textContent = 'Label is required.'; return; }
      if (!/^[a-z0-9]{1,12}$/i.test(shortcut)) { if (err) err.textContent = 'Shortcut must be 1–12 letters/numbers, no spaces.'; return; }
      try { const u = new URL(url); if (u.protocol !== 'https:' && u.protocol !== 'http:') throw new Error('bad'); url = u.href; } catch (ex) { if (err) err.textContent = 'Enter a valid https:// URL.'; return; }
      const favs = settings.favoriteSites.slice();
      const exists = favs.find((s) => s.shortcut.toLowerCase() === shortcut && s.id !== editingFavId);
      if (exists) { if (err) err.textContent = 'Shortcut "/' + shortcut + '" already used for "' + exists.label + '".'; return; }
      if (editingFavId) {
        const idx = favs.findIndex((s) => s.id === editingFavId);
        if (idx !== -1) favs[idx] = { id: editingFavId, label, url, shortcut };
      } else {
        if (favs.length >= QLENS.CONFIG.MAX_FAVORITES) { if (err) err.textContent = 'Max ' + QLENS.CONFIG.MAX_FAVORITES + ' commands.'; return; }
        const id = shortcut;
        favs.push({ id, label, url, shortcut });
      }
      settings = await QLENS.storage.setSettings({ favoriteSites: favs });
      renderFavList();
      closeFavForm();
      showToast(editingFavId ? 'Command updated' : 'Command added — type "/' + shortcut + '" in the lens');
    });
    const favList = $('fav-list');
    if (favList && !favList.dataset.dndBound) {
      favList.dataset.dndBound = '1';
      favList.addEventListener('dragover', (e) => {
        e.preventDefault();
        const dragging = favList.querySelector('.dragging');
        if (!dragging) return;
        const after = Array.from(favList.children).find((child) => {
          const rect = child.getBoundingClientRect();
          return e.clientY < rect.top + rect.height / 2;
        });
        if (after && after !== dragging) favList.insertBefore(dragging, after);
        else if (!after) favList.appendChild(dragging);
      });
      favList.addEventListener('drop', async (e) => {
        e.preventDefault();
        const favs = settings && Array.isArray(settings.favoriteSites) ? settings.favoriteSites : [];
        const ids = Array.from(favList.children).map((li) => li.dataset.id);
        const favsMap = new Map(favs.map((s) => [s.id, s]));
        const ordered = ids.map((id) => favsMap.get(id)).filter(Boolean);
        favs.forEach((s) => { if (!ids.includes(s.id)) ordered.push(s); });
        settings = await QLENS.storage.setSettings({ favoriteSites: ordered });
        renderFavList();
      });
    }
    // live stats
    renderFavList();
  }

  // ---------- Custom Engines ----------
  let editingEngId = null;

  function getCustoms() {
    try {
      if (settings && typeof QLENS.getCustomEngines === 'function') {
        return QLENS.getCustomEngines(settings);
      }
    } catch (err) {}
    return [];
  }

  function validateEngineFields(name, bang, url, excludeId) {
    const n = String(name == null ? '' : name).trim();
    const b = String(bang == null ? '' : bang).trim().toLowerCase();
    const u = String(url == null ? '' : url).trim();
    if (!n) return 'Name is required.';
    if (n.length > 40) return 'Name must be 40 chars or fewer.';
    if (!/^[a-z0-9]{1,12}$/i.test(b)) return 'Bang must be 1–12 letters/numbers, no spaces.';
    if (u.length < 12 || u.length > 2000 || !u.includes('{q}')) return 'URL must include {q} where the query goes.';
    try {
      const parsed = new URL(u.replace('{q}', 'test'));
      if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return 'Enter a valid http(s):// URL.';
    } catch (ex) {
      return 'Enter a valid http(s):// URL.';
    }
    const engineBangs = QLENS.OMNIBOX_ENGINE_BANGS || { g: 1, b: 1, k: 1, d: 1, google: 1, brave: 1, bing: 1, duckduckgo: 1, ddg: 1 };
    const modeBangs = { w: 1, wiki: 1, wikipedia: 1, images: 1, image: 1, videos: 1, video: 1, news: 1, yt: 1, youtube: 1 };
    if (QLENS.ENGINES && QLENS.ENGINES[b]) return 'Bang "!' + b + '" is reserved for a built-in engine.';
    if ((QLENS.ENGINE_PREFIXES && QLENS.ENGINE_PREFIXES[b]) || engineBangs[b]) return 'Bang "!' + b + '" is reserved for a built-in shortcut.';
    if ((QLENS.RESERVED_BANGS && QLENS.RESERVED_BANGS.has(b)) || modeBangs[b]) return 'Bang "!' + b + '" is reserved for a quick mode.';
    const customs = getCustoms();
    const clash = customs.find((c) => (c.bang.toLowerCase() === b || c.id === b) && c.id !== excludeId);
    if (clash) return 'Bang "!' + b + '" already used for "' + clash.name + '".';
    return null;
  }

  function renderEngList() {
    const list = $('eng-list');
    const empty = $('eng-empty');
    const countEl = $('eng-count');
    const customs = getCustoms();
    if (countEl) countEl.textContent = String(customs.length);
    if (!list) return;
    list.textContent = '';
    if (!customs.length) {
      if (empty) empty.hidden = false;
      return;
    }
    if (empty) empty.hidden = true;
    customs.forEach((eng) => {
      const li = document.createElement('li');
      li.className = 'fav-item';
      li.dataset.id = eng.id;
      const shortcut = document.createElement('div');
      shortcut.className = 'fav-shortcut';
      shortcut.textContent = '!' + eng.bang;
      const main = document.createElement('div');
      main.className = 'fav-main';
      const label = document.createElement('div');
      label.className = 'fav-label';
      label.textContent = eng.name;
      const url = document.createElement('div');
      url.className = 'fav-url';
      url.textContent = eng.url;
      main.append(label, url);
      const actions = document.createElement('div');
      actions.className = 'fav-actions-item';
      const edit = document.createElement('button');
      edit.className = 'icon-btn';
      edit.type = 'button';
      edit.setAttribute('aria-label', 'Edit ' + eng.name);
      edit.textContent = '✎';
      edit.addEventListener('click', () => openEngForm(eng.id));
      const del = document.createElement('button');
      del.className = 'icon-btn danger';
      del.type = 'button';
      del.setAttribute('aria-label', 'Delete ' + eng.name);
      del.textContent = '✕';
      del.addEventListener('click', async () => {
        if (!window.confirm('Delete "' + eng.name + '" (!' + eng.bang + ')?')) return;
        const next = getCustoms().filter((c) => c.id !== eng.id);
        settings = await QLENS.storage.setSettings({ customEngines: next });
        refreshEngineViews();
        showToast('Engine deleted');
      });
      actions.append(edit, del);
      const grip = document.createElement('span');
      grip.textContent = '!';
      grip.style.color = 'var(--text-faint)';
      grip.style.padding = '0 4px';
      li.append(grip, shortcut, main, actions);
      list.appendChild(li);
    });
  }

  function openEngForm(id) {
    const form = $('eng-form');
    const title = $('eng-form-title');
    const nameEl = $('eng-name');
    const bangEl = $('eng-bang');
    const urlEl = $('eng-url');
    const err = $('eng-error');
    if (!form || !nameEl || !bangEl || !urlEl) return;
    editingEngId = id || null;
    const eng = id ? getCustoms().find((c) => c.id === id) : null;
    if (eng) {
      title.textContent = 'Edit engine';
      nameEl.value = eng.name;
      bangEl.value = eng.bang;
      urlEl.value = eng.url;
    } else {
      title.textContent = 'Add engine';
      nameEl.value = '';
      bangEl.value = '';
      urlEl.value = '';
    }
    if (err) err.textContent = '';
    form.classList.remove('is-hidden');
    nameEl.focus();
  }

  function closeEngForm() {
    const form = $('eng-form');
    if (form) form.classList.add('is-hidden');
    editingEngId = null;
    const err = $('eng-error');
    if (err) err.textContent = '';
  }

  function refreshEngineViews() {
    renderEngList();
    renderDefaultEngines();
    renderOrderList();
    const statEng = document.getElementById('stat-engines');
    if (statEng) statEng.textContent = String(settings.engineOrder ? settings.engineOrder.length : 4);
  }

  function bindEng() {
    const addBtn = $('eng-add-btn');
    const closeBtn = $('eng-form-close');
    const cancel = $('eng-cancel');
    const form = $('eng-form');
    if (addBtn) addBtn.addEventListener('click', () => openEngForm(null));
    if (closeBtn) closeBtn.addEventListener('click', closeEngForm);
    if (cancel) cancel.addEventListener('click', (e) => { e.preventDefault(); closeEngForm(); });
    if (form) form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const nameEl = $('eng-name');
      const bangEl = $('eng-bang');
      const urlEl = $('eng-url');
      const err = $('eng-error');
      if (!nameEl || !bangEl || !urlEl) return;
      const name = nameEl.value.trim();
      const bang = bangEl.value.trim().toLowerCase();
      const url = urlEl.value.trim();
      const problem = validateEngineFields(name, bang, url, editingEngId);
      if (problem) { if (err) err.textContent = problem; return; }
      const customs = getCustoms().slice();
      if (editingEngId) {
        const idx = customs.findIndex((c) => c.id === editingEngId);
        if (idx !== -1) {
          const oldId = customs[idx].id;
          const newId = editingEngId === bang ? editingEngId : bang;
          customs[idx] = { id: newId, name, url, bang };
          // A rename changes the engine id (id follows bang): remap order
          // and default in the same write or sanitizeSettings drops the old
          // id, appends the new one at the end, and resets a pointed default.
          if (oldId !== newId) {
            const order = Array.isArray(settings.engineOrder) ? settings.engineOrder.slice() : [];
            const at = order.indexOf(oldId);
            if (at !== -1) order[at] = newId;
            else order.push(newId);
            const patch = { customEngines: customs, engineOrder: order };
            if (settings.defaultEngine === oldId) patch.defaultEngine = newId;
            settings = await QLENS.storage.setSettings(patch);
            refreshEngineViews();
            closeEngForm();
            showToast('Engine updated');
            return;
          }
        }
      } else {
        if (customs.length >= (QLENS.CUSTOM_ENGINE_MAX || 30)) {
          if (err) err.textContent = 'Max ' + (QLENS.CUSTOM_ENGINE_MAX || 30) + ' custom engines.';
          return;
        }
        customs.push({ id: bang, name, url, bang });
      }
      settings = await QLENS.storage.setSettings({ customEngines: customs });
      refreshEngineViews();
      closeEngForm();
      showToast(editingEngId ? 'Engine updated' : 'Engine added — type "!' + bang + ' query" in the lens');
    });
    renderEngList();
  }

  async function init() {
    try {
      settings = await QLENS.storage.getSettings();
    } catch (err) {
      settings = JSON.parse(JSON.stringify(QLENS.CONFIG.DEFAULT_SETTINGS));
    }
    applyAppearance();
    renderDefaultEngines();
    renderOrderList();
    bindEng();
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
    bindEdgeStudio();
    syncEdgeUI();
    if (updateEdgeCollapseUI) updateEdgeCollapseUI();
    renderFavList();
    bindFav();
    bindRail();
    bindMast();
    updateMastStats();
  }

  function updateMastStats() {
    const statEng = document.getElementById('stat-engines');
    if (statEng) statEng.textContent = String(settings.engineOrder ? settings.engineOrder.length : 4);
    const railVer = document.getElementById('rail-version');
    if (railVer) railVer.textContent = 'v' + (QLENS.CONFIG.VERSION || '1.1.0');
  }

  function bindRail() {
    const links = Array.from(document.querySelectorAll('.rail-link'));
    const cards = links.map((a) => document.querySelector(a.getAttribute('href'))).filter(Boolean);
    if (!links.length || !cards.length) return;
    const onScroll = () => {
      const y = window.scrollY + 120;
      let activeId = cards[0].id;
      for (const c of cards) {
        if (c.offsetTop <= y) activeId = c.id;
      }
      links.forEach((a) => a.classList.toggle('is-active', a.getAttribute('href') === '#' + activeId));
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    links.forEach((a) => {
      a.addEventListener('click', (e) => {
        e.preventDefault();
        const id = a.getAttribute('href');
        const el = document.querySelector(id);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  }

  function bindMast() {
    const btn = document.getElementById('mast-quick-commands');
    if (btn) btn.addEventListener('click', () => {
      const el = document.getElementById('card-commands');
      if (!el) return;
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      // pulse the quick commands card
      el.style.transition = 'box-shadow .3s';
      el.style.boxShadow = '0 0 0 3px var(--accent-soft), 0 18px 50px -20px rgba(0,0,0,.45)';
      setTimeout(() => { el.style.boxShadow = ''; }, 700);
      showToast('Try "/" + shortcut in the lens — e.g. "/gh"');
    });
  }

  function bindData() {
    $('reset-all').addEventListener('click', async () => {
      await QLENS.storage.resetAll();
      settings = await QLENS.storage.getSettings();
      applyAppearance();
      renderDefaultEngines();
      renderOrderList();
      renderEngList();
      renderSeg('theme');
      renderSeg('ctx');
      renderSwatches();
      setToggleStates();
      syncEdgeUI();
      if (updateEdgeCollapseUI) updateEdgeCollapseUI();
      renderFavList();
      updateMastStats();
      showShortcut();
      closeFavForm();
      closeEngForm();
      showToast('Reset to defaults');
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
