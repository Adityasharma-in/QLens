globalThis.QLENS = globalThis.QLENS || {};

const KEY_SETTINGS = QLENS.CONFIG.STORAGE_KEYS.SETTINGS;
const KEY_LAST_ENGINE = QLENS.CONFIG.STORAGE_KEYS.LAST_ENGINE;
const KEY_SHORTCUT = QLENS.CONFIG.STORAGE_KEYS.SHORTCUT;

const VALID_THEMES = ['system', 'light', 'dark'];
const VALID_ACTIONS = ['overlay', 'direct'];

function engineIds(extraCustoms) {
  const base = QLENS.ENGINES && typeof QLENS.ENGINES === 'object' ? Object.keys(QLENS.ENGINES) : [];
  const ids = base.length ? base.slice() : ['google', 'brave', 'bing', 'duckduckgo'];
  if (Array.isArray(extraCustoms)) {
    for (const c of extraCustoms) {
      if (c && typeof c.id === 'string' && !ids.includes(c.id)) ids.push(c.id);
    }
  }
  return ids;
}

function isPlainObject(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

function toBool(v, dflt) {
  return typeof v === 'boolean' ? v : dflt;
}

function toInt(v, dflt, min, max) {
  const n = Math.floor(Number(v));
  if (!Number.isFinite(n)) return dflt;
  return Math.min(max, Math.max(min, n));
}

function toFloat(v, dflt, min, max) {
  const n = Number(v);
  if (!Number.isFinite(n)) return dflt;
  return Math.min(max, Math.max(min, n));
}

function toHexColor(v, dflt) {
  if (typeof v === 'string' && /^#([0-9a-fA-F]{6})$/.test(v.trim())) return v.trim().toLowerCase();
  return dflt;
}

function sanitizeViewportShadow(raw) {
  const d = QLENS.CONFIG.DEFAULT_SETTINGS.viewportShadow;
  if (!isPlainObject(raw)) return { enabled: d.enabled, layer1: { ...d.layer1 }, layer2: { ...d.layer2 }, frame: { ...d.frame } };
  const l1 = isPlainObject(raw.layer1) ? raw.layer1 : {};
  const l2 = isPlainObject(raw.layer2) ? raw.layer2 : {};
  const f = isPlainObject(raw.frame) ? raw.frame : {};
  return {
    enabled: toBool(raw.enabled, d.enabled),
    layer1: {
      x: toInt(l1.x, d.layer1.x, -60, 60),
      y: toInt(l1.y, d.layer1.y, -60, 60),
      blur: toInt(l1.blur, d.layer1.blur, 0, 180),
      spread: toInt(l1.spread, d.layer1.spread, -40, 80),
      color: toHexColor(l1.color, d.layer1.color),
      opacity: toInt(l1.opacity, d.layer1.opacity, 0, 100)
    },
    layer2: {
      enabled: toBool(l2.enabled, d.layer2.enabled),
      blur: toInt(l2.blur, d.layer2.blur, 0, 260),
      spread: toInt(l2.spread, d.layer2.spread, -60, 100),
      color: toHexColor(l2.color, d.layer2.color),
      opacity: toInt(l2.opacity, d.layer2.opacity, 0, 100)
    },
    frame: {
      radius: toInt(f.radius, d.frame.radius, 0, 48),
      borderOpacity: toFloat(f.borderOpacity, d.frame.borderOpacity, 0, 1)
    }
  };
}

function sanitizeFavoriteSites(raw) {
  const d = QLENS.CONFIG.DEFAULT_SETTINGS.favoriteSites;
  if (!Array.isArray(raw)) return d.map((s) => ({ ...s }));
  const seen = new Set();
  const out = [];
  for (const item of raw) {
    if (!isPlainObject(item)) continue;
    const shortcut = typeof item.shortcut === 'string' ? item.shortcut.trim().toLowerCase() : '';
    if (!/^[a-z0-9]{1,12}$/i.test(shortcut)) continue;
    if (seen.has(shortcut)) continue;
    seen.add(shortcut);
    let url = typeof item.url === 'string' ? item.url.trim() : '';
    try {
      const u = new URL(url);
      if (u.protocol !== 'https:' && u.protocol !== 'http:') continue;
      url = u.href;
    } catch (e) { continue; }
    let label = typeof item.label === 'string' ? item.label.trim() : '';
    if (!label) label = shortcut;
    if (label.length > 40) label = label.slice(0, 40);
    let id = typeof item.id === 'string' && item.id.trim() ? item.id.trim().toLowerCase() : shortcut;
    if (!/^[a-z0-9]{1,12}$/i.test(id)) id = shortcut;
    out.push({ id, label, url, shortcut });
    if (out.length >= QLENS.CONFIG.MAX_FAVORITES) break;
  }
  return out;
}

function sanitizeSettings(raw) {
  const d = QLENS.CONFIG.DEFAULT_SETTINGS;
  const customs = typeof QLENS.sanitizeCustomEngines === 'function'
    ? QLENS.sanitizeCustomEngines(raw.customEngines)
    : [];
  const cids = customs.map((c) => c.id);
  const ids = engineIds(customs);
  const builtinIds = engineIds();
  let order = Array.isArray(raw.engineOrder) ? raw.engineOrder.filter((id) => ids.includes(id)) : [];
  order = order.filter((id, i) => order.indexOf(id) === i);
  for (const id of builtinIds) {
    if (!order.includes(id)) order.push(id);
  }
  for (const id of cids) {
    if (!order.includes(id)) order.push(id);
  }
  const defaultEngine = typeof raw.defaultEngine === 'string' && ids.includes(raw.defaultEngine)
    ? raw.defaultEngine
    : d.defaultEngine;
  if (!order.includes(defaultEngine)) order.unshift(defaultEngine);
  return {
    defaultEngine,
    engineOrder: order,
    customEngines: customs,
    theme: typeof raw.theme === 'string' && VALID_THEMES.includes(raw.theme) ? raw.theme : d.theme,
    accent: typeof raw.accent === 'string' && QLENS.CONFIG.ACCENTS[raw.accent] ? raw.accent : d.accent,
    blurClose: toBool(raw.blurClose, d.blurClose),
    autoCopySelection: toBool(raw.autoCopySelection, d.autoCopySelection),
    suggestions: toBool(raw.suggestions, d.suggestions),
    maxSelection: toInt(raw.maxSelection, d.maxSelection, QLENS.CONFIG.MAX_SELECTION_MIN, QLENS.CONFIG.MAX_SELECTION_MAX),
    contextMenuAction: typeof raw.contextMenuAction === 'string' && VALID_ACTIONS.includes(raw.contextMenuAction)
      ? raw.contextMenuAction
      : d.contextMenuAction,
    viewportShadow: sanitizeViewportShadow(raw.viewportShadow),
    favoriteSites: sanitizeFavoriteSites(raw.favoriteSites),
    launcher: typeof QLENS.sanitizeLauncher === 'function'
      ? QLENS.sanitizeLauncher(raw.launcher)
      : { enabled: true, tabs: true, bookmarks: true, history: true, maxResults: 6 },
    edgeCollapsed: toBool(raw.edgeCollapsed, d.edgeCollapsed)
  };
}

async function getSettings() {
  try {
    const res = await chrome.storage.local.get(KEY_SETTINGS);
    const raw = res[KEY_SETTINGS];
    if (isPlainObject(raw)) return sanitizeSettings(raw);
    return sanitizeSettings({});
  } catch (err) {
    return sanitizeSettings({});
  }
}

let settingsTail = Promise.resolve();

function setSettings(patch) {
  const run = () => doSetSettings(patch);
  const next = settingsTail.then(run, run);
  settingsTail = next.catch(() => {});
  return next;
}

async function doSetSettings(patch) {
  const current = await getSettings();
  const merged = { ...current, ...patch };
  if (isPlainObject(patch.viewportShadow) && isPlainObject(current.viewportShadow)) {
    const pv = current.viewportShadow;
    const pw = patch.viewportShadow;
    merged.viewportShadow = sanitizeViewportShadow({
      enabled: pw.enabled !== undefined ? pw.enabled : pv.enabled,
      layer1: { ...pv.layer1, ...(isPlainObject(pw.layer1) ? pw.layer1 : {}) },
      layer2: { ...pv.layer2, ...(isPlainObject(pw.layer2) ? pw.layer2 : {}) },
      frame: { ...pv.frame, ...(isPlainObject(pw.frame) ? pw.frame : {}) }
    });
  }
  if (Array.isArray(patch.favoriteSites)) {
    merged.favoriteSites = sanitizeFavoriteSites(patch.favoriteSites);
  }
  if (isPlainObject(patch.launcher)) {
    const cur = isPlainObject(current.launcher) ? current.launcher : {};
    merged.launcher = QLENS.sanitizeLauncher({ ...cur, ...patch.launcher });
  }
  if (Array.isArray(patch.customEngines) && typeof QLENS.sanitizeCustomEngines === 'function') {
    merged.customEngines = QLENS.sanitizeCustomEngines(patch.customEngines);
  }
  const next = sanitizeSettings(merged);
  try {
    await chrome.storage.local.set({ [KEY_SETTINGS]: next });
  } catch (err) {
    return current;
  }
  return next;
}

let lastEngineKnown = null;

async function getLastEngine(preSettings) {
  const readSettings = async () => (
    preSettings && isPlainObject(preSettings) ? preSettings : getSettings()
  );
  if (typeof lastEngineKnown === 'string' && lastEngineKnown) {
    try {
      const s = await readSettings();
      if (engineIds(s.customEngines).includes(lastEngineKnown)) return lastEngineKnown;
    } catch (err) {
      /* fall through and re-read */
    }
    lastEngineKnown = null;
  }
  try {
    const res = await chrome.storage.local.get(KEY_LAST_ENGINE);
    const id = res[KEY_LAST_ENGINE];
    const settings = await readSettings();
    const ids = engineIds(settings.customEngines);
    if (typeof id === 'string' && id && ids.includes(id)) {
      lastEngineKnown = id;
      return id;
    }
    return ids.includes(settings.defaultEngine) ? settings.defaultEngine : ids[0];
  } catch (err) {
    return QLENS.CONFIG.DEFAULT_SETTINGS.defaultEngine;
  }
}

async function setLastEngine(id) {
  if (typeof id !== 'string' || !id) return;
  if (id === lastEngineKnown) return;
  // Fire-and-forget validation: the hot paths (overlay Enter, SW OPEN_TAB)
  // must not stall on a storage read. A stored unknown id is harmless —
  // getLastEngine re-validates against settings on every read.
  if (!Object.prototype.hasOwnProperty.call(QLENS.ENGINES || {}, id)) {
    try {
      const res = await chrome.storage.local.get(KEY_SETTINGS);
      const raw = res && res[KEY_SETTINGS];
      const customs = raw && Array.isArray(raw.customEngines) ? raw.customEngines : [];
      const ok = customs.some((c) => c && c.id === id);
      if (!ok) return;
    } catch (err) {
      return;
    }
  }
  try {
    await chrome.storage.local.set({ [KEY_LAST_ENGINE]: id });
    lastEngineKnown = id;
  } catch (err) {
    return;
  }
}

async function getShortcut() {
  try {
    const res = await chrome.storage.local.get(KEY_SHORTCUT);
    const combo = res[KEY_SHORTCUT];
    if (typeof combo === 'string' && QLENS.isValidCombo(combo)) return combo;
  } catch (err) {
    return QLENS.CONFIG.SHORTCUT_DEFAULT;
  }
  return QLENS.CONFIG.SHORTCUT_DEFAULT;
}

async function setShortcut(combo) {
  if (typeof combo !== 'string' || !QLENS.isValidCombo(combo)) return false;
  try {
    await chrome.storage.local.set({ [KEY_SHORTCUT]: combo });
    return true;
  } catch (err) {
    return false;
  }
}

async function resetAll() {
  try {
    await chrome.storage.local.remove([KEY_SETTINGS, KEY_LAST_ENGINE, KEY_SHORTCUT]);
  } catch (err) {
    return;
  }
}

QLENS.storage = {
  getSettings,
  setSettings,
  getLastEngine,
  setLastEngine,
  getShortcut,
  setShortcut,
  resetAll
};