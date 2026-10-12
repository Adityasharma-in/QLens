globalThis.QLENS = globalThis.QLENS || {};

QLENS.MSG = {
  OPEN_OVERLAY: 'QLENS_OPEN_OVERLAY',
  CLOSE_OVERLAY: 'QLENS_CLOSE_OVERLAY',
  OPEN_TAB: 'QLENS_OPEN_TAB',
  FETCH_SUGGESTIONS: 'QLENS_FETCH_SUGGESTIONS',
  IMAGE_SEARCH: 'QLENS_IMAGE_SEARCH',
  FONT_FACE: 'QLENS_FONT_FACE',
  LAUNCHER_QUERY: 'QLENS_LAUNCHER_QUERY',
  LAUNCHER_ACTIVATE: 'QLENS_LAUNCHER_ACTIVATE',
  LAUNCHER_CLOSE: 'QLENS_LAUNCHER_CLOSE',
  OPEN_OPTIONS: 'QLENS_OPEN_OPTIONS'
};

QLENS.CONTENT_FILES = [
  'src/shared/config.js',
  'src/shared/messaging.js',
  'src/shared/engines.js',
  'src/shared/launcher.js',
  'src/shared/logos.js',
  'src/shared/async.js',
  'src/shared/storage.js',
  'src/shared/image.js',
  'src/content/selection.js',
  'src/content/overlay.js',
  'src/content/injector.js'
];

// Lean set parsed on EVERY http(s) page at document_idle. All it needs is the
// custom-combo keydown: MSG + CONFIG (matchesCombo/isValidCombo) + the
// shortcut reader + the listener. engines.js/launcher.js are deliberately NOT
// here — the keydown path never touches them, and dropping them takes ~15KB of
// parse+execute off every single page load. They ride along in the delta that
// injectContent() sends on first overlay open.
QLENS.KEYDOWN_FILES = [
  'src/shared/config.js',
  'src/shared/messaging.js',
  'src/shared/storage.js',
  'src/content/injector.js'
];

// Files that must be re-run even when the lean set is already present.
// injector.js owns the chrome.runtime.onMessage bridge, and the lean probe
// cannot tell a live bridge from an orphaned one: after the extension is
// reloaded the old content script keeps its bindings (so the probe still sees
// QLENS.CONFIG + QLENS.storage) but its extension context is dead, so nothing
// can deliver OPEN_OVERLAY and the shortcut does nothing at all.
//
// injector.js is safe to re-run because it declares no top-level bindings --
// it is one globalThis assignment plus a single IIFE, so there is no redeclaration
// SyntaxError. Its own __QLENS_KEYHANDLER__ / needsRegister() guards plus
// onMessage.removeListener() guarantee exactly one listener afterwards.
QLENS.MESSAGE_BRIDGE_FILES = [
  'src/content/injector.js'
];