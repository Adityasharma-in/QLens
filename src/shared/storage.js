globalThis.QLENS = globalThis.QLENS || {};

const KEY_SETTINGS = QLENS.CONFIG.STORAGE_KEYS.SETTINGS;
const KEY_LAST_ENGINE = QLENS.CONFIG.STORAGE_KEYS.LAST_ENGINE;
const KEY_SHORTCUT = QLENS.CONFIG.STORAGE_KEYS.SHORTCUT;

const VALID_THEMES = ['system', 'light', 'dark'];
const VALID_ACTIONS = ['overlay', 'direct'];

function engineIds() {
  return Object.keys(QLENS.ENGINES);
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

function sanitizeSettings(raw) {
  const d = QLENS.CONFIG.DEFAULT_SETTINGS;
  const ids = engineIds();
  let order = Array.isArray(raw.engineOrder) ? raw.engineOrder.filter((id) => ids.includes(id)) : [];
  order = order.filter((id, i) => order.indexOf(id) === i);
  for (const id of ids) {
    if (!order.includes(id)) order.push(id);
  }
  const defaultEngine = typeof raw.defaultEngine === 'string' && ids.includes(raw.defaultEngine)
    ? raw.defaultEngine
    : d.defaultEngine;
  if (!order.includes(defaultEngine)) order.unshift(defaultEngine);
  return {
    defaultEngine,
    engineOrder: order,
    theme: typeof raw.theme === 'string' && VALID_THEMES.includes(raw.theme) ? raw.theme : d.theme,
    accent: typeof raw.accent === 'string' && QLENS.CONFIG.ACCENTS[raw.accent] ? raw.accent : d.accent,
    blurClose: toBool(raw.blurClose, d.blurClose),
    autoCopySelection: toBool(raw.autoCopySelection, d.autoCopySelection),
    suggestions: toBool(raw.suggestions, d.suggestions),
    maxSelection: toInt(raw.maxSelection, d.maxSelection, QLENS.CONFIG.MAX_SELECTION_MIN, QLENS.CONFIG.MAX_SELECTION_MAX),
    contextMenuAction: typeof raw.contextMenuAction === 'string' && VALID_ACTIONS.includes(raw.contextMenuAction)
      ? raw.contextMenuAction
      : d.contextMenuAction,
    viewportShadow: sanitizeViewportShadow(raw.viewportShadow)
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

async function setSettings(patch) {
  const current = await getSettings();
  let merged = { ...current, ...patch };
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
  const next = sanitizeSettings(merged);
  try {
    await chrome.storage.local.set({ [KEY_SETTINGS]: next });
  } catch (err) {
    return current;
  }
  return next;
}

async function getLastEngine() {
  const ids = engineIds();
  try {
    const res = await chrome.storage.local.get(KEY_LAST_ENGINE);
    const id = res[KEY_LAST_ENGINE];
    if (typeof id === 'string' && ids.includes(id)) return id;
  } catch (err) {
    return QLENS.CONFIG.DEFAULT_SETTINGS.defaultEngine;
  }
  const settings = await getSettings();
  return ids.includes(settings.defaultEngine) ? settings.defaultEngine : ids[0];
}

async function setLastEngine(id) {
  if (!engineIds().includes(id)) return;
  try {
    await chrome.storage.local.set({ [KEY_LAST_ENGINE]: id });
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