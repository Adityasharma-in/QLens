globalThis.QLENS = globalThis.QLENS || {};

QLENS.MSG = {
  OPEN_OVERLAY: 'QLENS_OPEN_OVERLAY',
  CLOSE_OVERLAY: 'QLENS_CLOSE_OVERLAY',
  OPEN_TAB: 'QLENS_OPEN_TAB',
  FETCH_SUGGESTIONS: 'QLENS_FETCH_SUGGESTIONS',
  SUGGESTIONS_RESULT: 'QLENS_SUGGESTIONS_RESULT',
  OVERLAY_READY: 'QLENS_OVERLAY_READY',
  IMAGE_SEARCH: 'QLENS_IMAGE_SEARCH',
  FONT_FACE: 'QLENS_FONT_FACE'
};

QLENS.CONTENT_FILES = [
  'src/shared/config.js',
  'src/shared/messaging.js',
  'src/shared/engines.js',
  'src/shared/logos.js',
  'src/shared/storage.js',
  'src/content/selection.js',
  'src/content/overlay.js',
  'src/content/injector.js'
];

// Lean set injected by the SW on http(s) pages ONLY while a custom
// shortcut is configured: carries the keydown handler so the custom
// combo works before the overlay has ever been opened.
QLENS.KEYDOWN_FILES = [
  'src/shared/config.js',
  'src/shared/messaging.js',
  'src/shared/engines.js',
  'src/shared/storage.js',
  'src/content/injector.js'
];