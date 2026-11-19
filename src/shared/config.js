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
  SUGGESTION_TIMEOUT_MS: 800,
  SUGGESTION_CACHE_TTL_MS: 120000,
  SUGGESTION_CACHE_MAX: 48,
  MAX_SELECTION_MIN: 50,
  MAX_SELECTION_MAX: 1000,
  IMAGE_SEARCH_TIMEOUT_MS: 10000,
  // Hard bound on one whole image search (upload + fallback + tab open) so the
  // overlay always gets an answer instead of an indefinite spinner.
  IMAGE_SEARCH_TOTAL_MS: 24000,
  // Overlay-side cap: slightly above the SW's total so a slow answer still
  // arrives before the UI gives up on it.
  IMAGE_SEARCH_UI_WAIT_MS: 30000,
  IMAGE_MAX_BYTES: 5 * 1024 * 1024,
  IMAGE_MAX_DIM: 1600,
  IMAGE_JPEG_QUALITY: 0.82,
  IMAGE_WEBP_QUALITY: 0.85,
  IMAGE_CACHE_TTL_MS: 5 * 60 * 1000,
  IMAGE_CACHE_MAX: 20,
  LENS_WARM_URL: 'https://lens.google.com/generate_204',
  LENS_FILENAME: 'qlens-search.png',
  MAX_FAVORITES: 20
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

const PUNCTUATION_BY_CODE = {
  Minus: '-',
  Equal: '=',
  BracketLeft: '[',
  BracketRight: ']',
  Backslash: '\\',
  Semicolon: ';',
  Quote: "'",
  Comma: ',',
  Period: '.',
  Slash: '/',
  Backquote: '`'
};
const PUNCTUATION_KEYS = new Set(Object.values(PUNCTUATION_BY_CODE));
const NAMED_KEY_TOKENS = new Set(['Space', 'Enter']);

function normalizeKeyToken(key, code) {
  const k = typeof key === 'string' ? key : '';
  const c = typeof code === 'string' ? code : '';
  if (MODIFIER_NAMES.includes(k)) return null;
  if (/^[a-zA-Z]$/.test(k)) return k.toUpperCase();
  if (/^[0-9]$/.test(k)) return k;
  if (/^F([1-9]|1[0-2])$/.test(k)) return k;
  if (k === ' ') return 'Space';
  if (k === 'Enter') return 'Enter';
  if (PUNCTUATION_KEYS.has(k)) return k;
  if (/^Key[A-Z]$/.test(c)) return c.slice(3);
  if (/^Digit[0-9]$/.test(c)) return c.slice(5);
  if (/^F([1-9]|1[0-2])$/.test(c)) return c;
  if (c === 'Space') return 'Space';
  if (c === 'Enter') return 'Enter';
  if (PUNCTUATION_BY_CODE[c]) return PUNCTUATION_BY_CODE[c];
  return null;
}

function isMainKeyToken(token) {
  if (typeof token !== 'string' || !token) return false;
  return /^[A-Z0-9]$/.test(token)
    || /^F([1-9]|1[0-2])$/.test(token)
    || NAMED_KEY_TOKENS.has(token)
    || PUNCTUATION_KEYS.has(token);
}

function buildCombo(flags, key, code) {
  const main = normalizeKeyToken(key, code);
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
  if (!isMainKeyToken(main)) return false;
  const mods = parts.slice(0, -1);
  if (!mods.length || mods.some((m) => !MODIFIER_SET.has(m))) return false;
  if (new Set(mods).size !== mods.length) return false;
  // 'MacCtrl' can never match (matchesCombo has no such key) and 'Command'
  // only fires on macOS — reject savable-but-never-firing combos elsewhere.
  if (mods.includes('MacCtrl')) return false;
  if (mods.includes('Command') && !isMacPlatform()) return false;
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
  const token = normalizeKeyToken(e.key, e.code);
  return token !== null && token === main;
}

const CTRL_RESERVED = {
  'Ctrl+N': 'open a new window',
  'Ctrl+Shift+N': 'open a new Incognito window',
  'Ctrl+T': 'open a new tab',
  'Ctrl+Shift+T': 'reopen the last closed tab',
  'Ctrl+W': 'close the tab',
  'Ctrl+Shift+W': 'close the window',
  'Ctrl+Tab': 'switch tabs',
  'Ctrl+Shift+Tab': 'switch tabs',
  'Ctrl+PageUp': 'switch tabs',
  'Ctrl+PageDown': 'switch tabs',
  'Ctrl+L': 'focus the address bar',
  'Ctrl+K': 'focus the search bar',
  'Ctrl+E': 'focus the search bar',
  'Ctrl+D': 'bookmark the page',
  'Ctrl+Shift+D': 'bookmark all tabs',
  'Ctrl+H': 'open history',
  'Ctrl+J': 'open downloads',
  'Ctrl+F': 'open find in page',
  'Ctrl+G': 'find the next match',
  'Ctrl+Shift+G': 'find the previous match',
  'Ctrl+U': 'view page source',
  'Ctrl+P': 'print the page',
  'Ctrl+R': 'reload the page',
  'Ctrl+Shift+R': 'hard-reload the page',
  'Ctrl+F4': 'close the tab',
  'Ctrl+F5': 'hard-reload the page',
  'Ctrl+O': 'open a file',
  'Ctrl+S': 'save the page',
  'Ctrl+Shift+S': 'open the save dialog',
  'Ctrl+Shift+I': 'open DevTools',
  'Ctrl+Shift+J': 'open DevTools',
  'Ctrl+Shift+C': 'open the element inspector',
  'Ctrl+Shift+M': 'toggle the device toolbar',
  'Ctrl+Shift+B': 'toggle the bookmarks bar',
  'Ctrl+Shift+O': 'open the bookmark manager',
  'Ctrl+Shift+Delete': 'open clear browsing data',
  'Ctrl+=': 'zoom in',
  'Ctrl+-': 'zoom out',
  'Ctrl+0': 'reset zoom'
};

const COMMAND_RESERVED = {
  'Command+N': 'open a new window',
  'Command+Shift+N': 'open a new Incognito window',
  'Command+T': 'open a new tab',
  'Command+Shift+T': 'reopen the last closed tab',
  'Command+W': 'close the tab',
  'Command+Shift+W': 'close the window',
  'Command+Tab': 'switch apps',
  'Command+Shift+Tab': 'switch apps',
  'Command+L': 'focus the address bar',
  'Command+K': 'focus the search bar',
  'Command+E': 'focus the search bar',
  'Command+D': 'bookmark the page',
  'Command+Shift+D': 'bookmark all tabs',
  'Command+H': 'hide Chrome',
  'Command+J': 'open downloads',
  'Command+F': 'open find in page',
  'Command+G': 'find the next match',
  'Command+Shift+G': 'find the previous match',
  'Command+U': 'view page source',
  'Command+P': 'print the page',
  'Command+R': 'reload the page',
  'Command+Shift+R': 'hard-reload the page',
  'Command+O': 'open a file',
  'Command+S': 'save the page',
  'Command+Shift+S': 'open the save dialog',
  'Command+Alt+I': 'open DevTools',
  'Command+Alt+J': 'open DevTools',
  'Command+Alt+C': 'open the element inspector',
  'Command+Shift+Delete': 'open clear browsing data',
  'Command+=': 'zoom in',
  'Command+-': 'zoom out',
  'Command+0': 'reset zoom',
  'Command+Space': 'open Spotlight',
  'Command+Q': 'quit Chrome',
  'Command+[': 'go back',
  'Command+]': 'go forward'
};

const ALT_RESERVED = {
  'Alt+F4': 'close the window',
  'Alt+Tab': 'switch apps',
  'Alt+Shift+Tab': 'switch apps',
  'Alt+Left': 'go back',
  'Alt+Right': 'go forward',
  'Alt+Home': 'open the home page',
  'Alt+D': 'focus the address bar',
  'Alt+E': 'open the Chrome menu',
  'Alt+F': 'open the Chrome menu'
};

function reservedComboReason(combo) {
  const c = typeof combo === 'string' ? combo.trim() : '';
  if (!c) return null;
  const parts = c.split('+').filter(Boolean);
  if (parts.length < 2) return null;
  const main = parts[parts.length - 1];
  const mods = parts.slice(0, -1);
  const order = ['Ctrl', 'Alt', 'Shift', 'Command'];
  const sorted = order.filter((m) => mods.includes(m));
  if (sorted.length !== mods.length) return null;
  const normalized = sorted.concat(main).join('+');
  if (CTRL_RESERVED[normalized]) {
    return 'Chrome uses ' + normalized + ' to ' + CTRL_RESERVED[normalized] + '. Pick another combo.';
  }
  if (COMMAND_RESERVED[normalized]) {
    return 'Chrome uses ' + normalized + ' to ' + COMMAND_RESERVED[normalized] + '. Pick another combo.';
  }
  if (ALT_RESERVED[normalized]) {
    return 'Your system uses ' + normalized + ' to ' + ALT_RESERVED[normalized] + '. Pick another combo.';
  }
  if (/^(Ctrl|Command)\+[1-8]$/.test(normalized)) {
    return 'Chrome uses ' + normalized + ' to switch tabs. Pick another combo.';
  }
  if (/^Ctrl\+9$/.test(normalized) || /^Command\+9$/.test(normalized)) {
    return 'Chrome uses ' + normalized + ' to jump to the last tab. Pick another combo.';
  }
  if (!isMacPlatform() && normalized === 'Alt+Space') {
    return 'Windows uses Alt+Space to open the window menu. Pick another combo.';
  }
  return null;
}

QLENS.buildCombo = buildCombo;
QLENS.isValidCombo = isValidCombo;
QLENS.matchesCombo = matchesCombo;
QLENS.reservedComboReason = reservedComboReason;
QLENS.isMacPlatform = isMacPlatform;

try {
  const manifestVersion = chrome.runtime.getManifest().version;
  if (typeof manifestVersion === 'string' && manifestVersion) {
    QLENS.CONFIG.VERSION = manifestVersion;
  }
} catch (err) {}