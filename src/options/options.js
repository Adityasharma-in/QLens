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

  function updateEdgePreview() {
    const preview = $('edge-preview');
    if (!preview) return;
    const vs = getVS();
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

  function updateEdgeCode() {
    const codeEl = $('edge-code');
    if (!codeEl) return;
    const vs = getVS();
    const shadow = buildVSShadow(vs);
    const f = vs.frame;
    const frameCss = '.ql-viewport-frame {\n  border-radius: ' + f.radius + 'px;\n  border: 1px solid rgba(255,255,255, ' + Number(f.borderOpacity).toFixed(2) + ');\n  box-shadow: ' + shadow + ';\n}';
    const pretty = shadow.split(', ').map((s,i)=> i===0 ? s : '           ' + s).join(',\n');
    const display = '/* Inner Shadow — copy this */\n.ql-viewport-frame {\n  border-radius: ' + f.radius + 'px;\n  border: 1px solid rgba(255,255,255, ' + Number(f.borderOpacity).toFixed(2) + ');\n  box-shadow: ' + pretty + ';\n}';
    codeEl.textContent = display;
    codeEl.dataset.raw = frameCss + '\n\n/* alternative — as CSS variable */\n:root {\n  --inner-shadow: ' + shadow + ';\n}';
    codeEl.dataset.config = JSON.stringify(vs, null, 2);
  }

  async function saveEdge(patch) {
    const base = getVS();
    let next = base;
    if (patch && typeof patch === 'object') {
      next = {
        enabled: patch.enabled !== undefined ? patch.enabled : base.enabled,
        layer1: { ...base.layer1, ...(patch.layer1 || {}) },
        layer2: { ...base.layer2, ...(patch.layer2 || {}) },
        frame: { ...base.frame, ...(patch.frame || {}) }
      };
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

    const bindRange = (id, handler) => {
      const e = $(id);
      if (!e) return;
      e.addEventListener('input', handler);
    };

    bindRange('edge-x', async (e) => { await saveEdge({ layer1: { x: parseInt(e.target.value,10) } }); });
    bindRange('edge-y', async (e) => { await saveEdge({ layer1: { y: parseInt(e.target.value,10) } }); });
    bindRange('edge-blur', async (e) => { await saveEdge({ layer1: { blur: parseInt(e.target.value,10) } }); });
    bindRange('edge-spread', async (e) => { await saveEdge({ layer1: { spread: parseInt(e.target.value,10) } }); });
    bindRange('edge-opacity', async (e) => { await saveEdge({ layer1: { opacity: parseInt(e.target.value,10) } }); });
    bindRange('edge-blur2', async (e) => { await saveEdge({ layer2: { blur: parseInt(e.target.value,10) } }); });
    bindRange('edge-spread2', async (e) => { await saveEdge({ layer2: { spread: parseInt(e.target.value,10) } }); });
    bindRange('edge-opacity2', async (e) => { await saveEdge({ layer2: { opacity: parseInt(e.target.value,10) } }); });
    bindRange('edge-radius', async (e) => { await saveEdge({ frame: { radius: parseInt(e.target.value,10) } }); });
    bindRange('edge-border', async (e) => { const v = parseInt(e.target.value,10); await saveEdge({ frame: { borderOpacity: v/100 } }); });

    const c1 = $('edge-color');
    if (c1) c1.addEventListener('input', async (e) => { await saveEdge({ layer1: { color: e.target.value } }); });
    const c2 = $('edge-color2');
    if (c2) c2.addEventListener('input', async (e) => { await saveEdge({ layer2: { color: e.target.value } }); });

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
      syncEdgeUI();
      showToast('Reset to defaults');
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
