globalThis.QLENS = globalThis.QLENS || {};

QLENS.CONFIG = {
  VERSION: '1.1.0',
  NAME: 'QLens',
  SHORTCUT_DEFAULT: 'Ctrl+Shift+K',
  SHORTCUT_COMMAND: 'open-quick-search',
  STORAGE_KEYS: {
    SETTINGS: 'settings',
    LAST_ENGINE: 'lastEngine',
    SHORTCUT: 'shortcut'
  },
  DEFAULT_SETTINGS: {
    defaultEngine: 'google',
    engineOrder: ['google', 'brave', 'bing', 'duckduckgo'],
    theme: 'system',
    accent: 'indigo',
    blurClose: false,
    autoCopySelection: false,
    suggestions: true,
    maxSelection: 200,
    contextMenuAction: 'overlay'
  },
  ACCENTS: {
    indigo: '#6366F1',
    violet: '#8B5CF6',
    emerald: '#10B981',
    rose: '#F43F5E',
    amber: '#F59E0B',
    sky: '#0EA5E9'
  },
  FONT_FAMILY: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif",
  MAX_SUGGESTIONS: 8,
  SUGGESTION_DEBOUNCE_MS: 250,
  SUGGESTION_TIMEOUT_MS: 1500,
  MAX_SELECTION_MIN: 50,
  MAX_SELECTION_MAX: 1000,
  IMAGE_SEARCH_TIMEOUT_MS: 20000,
  IMAGE_MAX_BYTES: 5 * 1024 * 1024,
  IMAGE_MAX_DIM: 2048,
  IMAGE_JPEG_QUALITY: 0.9,
  LENS_FILENAME: 'qlens-search.png'
};

const MODIFIER_NAMES = ['Ctrl', 'Alt', 'Shift', 'Command', 'MacCtrl'];
const MODIFIER_SET = new Set(MODIFIER_NAMES);

function isMacPlatform() {
  try {
    return /mac|darwin/i.test(navigator.platform || '');
  } catch (err) {
    return false;
  }
}

function buildCombo(flags, key, code) {
  const k = typeof key === 'string' ? key : '';
  if (!k || MODIFIER_NAMES.includes(k)) return null;
  let main = null;
  if (/^[a-zA-Z]$/.test(k)) {
    main = k.toUpperCase();
  } else if (/^[0-9]$/.test(k)) {
    main = k;
  } else if (/^F([1-9]|1[0-2])$/.test(k)) {
    main = k;
  }
  if (!main) return null;
  const f = flags || {};
  const parts = [];
  if (f.ctrlKey) parts.push('Ctrl');
  if (f.altKey) parts.push('Alt');
  if (f.shiftKey) parts.push('Shift');
  if (f.metaKey && isMacPlatform()) parts.push('Command');
  if (!parts.some((p) => p === 'Ctrl' || p === 'Alt' || p === 'Command')) return null;
  parts.push(main);
  return parts.join('+');
}

function isValidCombo(combo) {
  const c = typeof combo === 'string' ? combo.trim() : '';
  if (!c || c.length > 60) return false;
  const parts = c.split('+').filter(Boolean);
  if (parts.length < 2) return false;
  const main = parts[parts.length - 1];
  if (!/^[A-Z0-9]$/.test(main) && !/^F([1-9]|1[0-2])$/.test(main)) return false;
  const mods = parts.slice(0, -1);
  if (!mods.length || mods.some((m) => !MODIFIER_SET.has(m))) return false;
  if (new Set(mods).size !== mods.length) return false;
  return mods.some((m) => m === 'Ctrl' || m === 'Alt' || m === 'Command');
}

function matchesCombo(e, combo) {
  if (!e || typeof e !== 'object' || typeof combo !== 'string') return false;
  const parts = combo.split('+').filter(Boolean);
  if (parts.length < 2) return false;
  const main = parts[parts.length - 1];
  const mods = parts.slice(0, -1);
  const pressed = {
    Ctrl: e.ctrlKey === true,
    Alt: e.altKey === true,
    Shift: e.shiftKey === true,
    Command: isMacPlatform() && e.metaKey === true
  };
  for (const m of mods) {
    if (!pressed[m]) return false;
  }
  for (const m of Object.keys(pressed)) {
    if (pressed[m] && !mods.includes(m)) return false;
  }
  const key = String(e.key || '');
  if (/^[a-zA-Z]$/.test(main)) return key.toUpperCase() === main;
  return key === main;
}

QLENS.buildCombo = buildCombo;
QLENS.isValidCombo = isValidCombo;
QLENS.matchesCombo = matchesCombo;