globalThis.QLENS = globalThis.QLENS || {};

QLENS.CONFIG = {
  VERSION: '1.0.0',
  NAME: 'QLens',
  SHORTCUT_DEFAULT: 'Ctrl+Shift+K',
  STORAGE_KEYS: {
    SETTINGS: 'settings',
    LAST_ENGINE: 'lastEngine',
    RECENT: 'recent'
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
    showRecent: true,
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
  MAX_RECENT: 10,
  MAX_SUGGESTIONS: 8,
  SUGGESTION_DEBOUNCE_MS: 250,
  SUGGESTION_TIMEOUT_MS: 1500,
  MAX_SELECTION_MIN: 50,
  MAX_SELECTION_MAX: 1000
};