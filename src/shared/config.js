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
    contextMenuAction: 'overlay',
    viewportShadow: {
      enabled: true,
      layer1: { x: 0, y: 0, blur: 84, spread: -6, color: '#ad7aff', opacity: 44 },
      layer2: { enabled: true, blur: 160, spread: 4, color: '#4c1d95', opacity: 46 },
      frame: { radius: 0, borderOpacity: 0.3 }
    },
    favoriteSites: [
      { id: 'gh', label: 'GitHub', url: 'https://github.com', shortcut: 'gh' },
      { id: 'yt', label: 'YouTube', url: 'https://youtube.com', shortcut: 'yt' },
      { id: 'tw', label: 'X / Twitter', url: 'https://x.com', shortcut: 'tw' },
      { id: 'so', label: 'Stack Overflow', url: 'https://stackoverflow.com', shortcut: 'so' }
    ],
    launcher: {
      enabled: true,
      tabs: true,
      bookmarks: true,
      history: false,
      maxResults: 6
    },
    customEngines: [],
    edgeCollapsed: false
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
  MAX_SUGGESTIONS: 6,
  SUGGESTION_DEBOUNCE_MS: 150,
  LAUNCHER_DEBOUNCE_MS: 220,
  SUGGESTION_TIMEOUT_MS: 800,
  SUGGESTION_CACHE_TTL_MS: 120000,
  SUGGESTION_CACHE_MAX: 48,
  MAX_SELECTION_MIN: 50,
  MAX_SELECTION_MAX: 1000,
  IMAGE_SEARCH_TIMEOUT_MS: 15000,
  IMAGE_MAX_BYTES: 5 * 1024 * 1024,
  IMAGE_MAX_DIM: 1600,
  IMAGE_JPEG_QUALITY: 0.82,
  IMAGE_WEBP_QUALITY: 0.85,
  IMAGE_CACHE_TTL_MS: 5 * 60 * 1000,
  IMAGE_CACHE_MAX: 20,
  LENS_WARM_URL: 'https://www.google.com/generate_204',
  LENS_FILENAME: 'qlens-search.png',
  MAX_FAVORITES: 20,
  SHORTCUT_RE: /^[a-z0-9]{1,12}$/i
};

const MODIFIER_NAMES = ['Ctrl', 'Alt', 'Shift', 'Command', 'MacCtrl'];
const MODIFIER_SET = new Set(MODIFIER_NAMES);

function isMacPlatform() {
  try {
    const uaDataPlatform = (globalThis.navigator && globalThis.navigator.userAgentData)
      ? globalThis.navigator.userAgentData.platform
      : '';
    if (typeof uaDataPlatform === 'string' && uaDataPlatform) {
      return /mac/i.test(uaDataPlatform);
    }
    return /mac|darwin/i.test((globalThis.navigator && globalThis.navigator.platform) || '');
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
QLENS.isMacPlatform = isMacPlatform;

try {
  const manifestVersion = chrome.runtime.getManifest().version;
  if (typeof manifestVersion === 'string' && manifestVersion) {
    QLENS.CONFIG.VERSION = manifestVersion;
  }
} catch (err) {}