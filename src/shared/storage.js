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
      : d.contextMenuAction
  };
}

async function getSettings() {
  try {
    const res = await chrome.storage.local.get(KEY_SETTINGS);
    const raw = res[KEY_SETTINGS];
    if (isPlainObject(raw)) return sanitizeSettings(raw);
    return { ...QLENS.CONFIG.DEFAULT_SETTINGS };
  } catch (err) {
    return { ...QLENS.CONFIG.DEFAULT_SETTINGS };
  }
}

async function setSettings(patch) {
  const current = await getSettings();
  const next = sanitizeSettings({ ...current, ...patch });
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