globalThis.QLENS = globalThis.QLENS || {};

(function () {
  const expected = window.__QLENS_EXPECTED_NONCE__;
  const registered = window.__QLENS_INJECTED__;
  let alive = false;
  try {
    alive = Boolean(chrome && chrome.runtime && chrome.runtime.id);
  } catch (err) {
    alive = false;
  }

  // Direct client-side opens (custom combo) stamp directAt; an OPEN_OVERLAY
  // echo routed through the SW (manifest command for a dual-configured combo)
  // inside the window is dropped instead of toggling the overlay shut.
  // 1500 ms covers a cold-SW wake (tabs.query + settings read + sendMessage);
  // 500 ms was short enough that a slow first open could toggle itself shut,
  // which looks exactly like "the shortcut does nothing".
  let directAt = 0;
  const ECHO_WINDOW_MS = 1500;

  function openOverlayDirect(openOnly) {
    if (!QLENS.Overlay) {
      try {
        chrome.runtime.sendMessage({ type: QLENS.MSG.OPEN_OVERLAY }).catch(() => {});
      } catch (err) {
        /* ignore */
      }
      return;
    }
    const visible = QLENS.Overlay.isVisible();
    if (visible && !openOnly) {
      QLENS.Overlay.destroy(true);
    } else if (!visible) {
      try {
        QLENS.Overlay.show({});
      } catch (err) {
        try {
          chrome.runtime.sendMessage({ type: QLENS.MSG.OPEN_OVERLAY }).catch(() => {});
        } catch (err2) {
          /* ignore */
        }
        return;
      }
      directAt = Date.now();
    }
    return;
  }

  function handleMessage(msg, sender, sendResponse) {
    if (!sender || sender.id !== chrome.runtime.id) return false;
    if (!msg || typeof msg.type !== 'string') return false;
    try {
      if (msg.type === QLENS.MSG.OPEN_OVERLAY) {
        if (Date.now() - directAt < ECHO_WINDOW_MS) {
          sendResponse({ ok: true });
          return false;
        }
        if (!QLENS.Overlay || typeof QLENS.Overlay.isVisible !== 'function' || typeof QLENS.Overlay.show !== 'function') {
          sendResponse({ ok: false, error: 'no overlay loaded' });
          return false;
        }
        if (QLENS.Overlay.isVisible()) {
          QLENS.Overlay.destroy(true);
          sendResponse({ ok: true, toggled: true });
        } else {
          QLENS.Overlay.show(msg.payload || {});
          sendResponse({ ok: true });
        }
        return false;
      }
      if (msg.type === QLENS.MSG.CLOSE_OVERLAY) {
        if (QLENS.Overlay && typeof QLENS.Overlay.isVisible === 'function' && QLENS.Overlay.isVisible()) {
          QLENS.Overlay.destroy(true);
        }
        sendResponse({ ok: true });
        return false;
      }
    } catch (err) {
      try {
        sendResponse({ ok: false, error: String(err) });
      } catch (err2) {
        return false;
      }
      return false;
    }
    return false;
  }

  function needsRegister() {
    if (!alive) return true;
    if (registered !== expected) return true;
    return typeof window.__QLENS_LISTENER__ !== 'function';
  }

  // Combo memoized so every keystroke on every page is a sync match — no
  // chrome.storage round trip in the hot path. ponytail: if stale-cache bugs
  // ever surface, fall back to per-keystroke getShortcut() (old behavior).
  // Optimistic default: the handler must work on the very first keypress,
  // before the async storage read below resolves. Starting at null/false
  // would ignore every keystroke in that cold window, which looks exactly
  // like "the shortcut does nothing" on fast machines and slow storage.
  let comboMemo = (QLENS.CONFIG && QLENS.CONFIG.SHORTCUT_DEFAULT) || 'Ctrl+Shift+K';
  let comboReady = true;

  function refreshCombo() {
    // Must never throw: this runs during script evaluation, and a synchronous
    // throw here would abort the IIFE before the keydown listener is attached,
    // silently disabling the shortcut for the life of the page. On failure fall
    // back to the default combo (now handled in-page) instead of leaving
    // comboReady false forever, which would ignore every keypress.
    try {
      const p = QLENS.storage && typeof QLENS.storage.getShortcut === 'function'
        ? QLENS.storage.getShortcut()
        : Promise.resolve(null);
      Promise.resolve(p)
        .then((combo) => {
          comboMemo = typeof combo === 'string' && combo ? combo : QLENS.CONFIG.SHORTCUT_DEFAULT;
          comboReady = true;
        })
        .catch(() => {
          comboMemo = QLENS.CONFIG.SHORTCUT_DEFAULT;
          comboReady = true;
        });
    } catch (err) {
      comboMemo = QLENS.CONFIG.SHORTCUT_DEFAULT;
      comboReady = true;
    }
  }

  function registerShortcutHandler() {
    if (typeof window.__QLENS_KEYHANDLER__ === 'function') return;
    refreshCombo();
    try {
      chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'local' && changes[QLENS.CONFIG.STORAGE_KEYS.SHORTCUT]) refreshCombo();
      });
    } catch (err) {
      /* onChanged unavailable — memo stays at load-time value */
    }
    window.__QLENS_KEYHANDLER__ = (e) => {
      if (e.defaultPrevented || (!e.ctrlKey && !e.metaKey && !e.altKey)) return;
      const combo = comboMemo;
      if (!combo || !comboReady) return;
      if (!QLENS.matchesCombo(e, combo)) return;
      if (combo === QLENS.CONFIG.SHORTCUT_DEFAULT) {
        // The default combo is normally delivered by the manifest command
        // (chrome.commands.onCommand in the SW), which only fires if Chrome
        // actually bound the shortcut. That binding can be absent — another
        // extension owns Ctrl+Shift+K, the user cleared it in
        // chrome://extensions/shortcuts, or it was dropped on reload — and
        // with no in-page path the shortcut was then permanently dead with no
        // way to recover. Handle it here too as a fallback.
        //
        // Both paths can fire for one keypress, so this is OPEN-ONLY: never
        // destroy, so whichever path runs second cannot toggle the overlay
        // shut. show() is a no-op when already visible, and directAt makes
        // the SW's OPEN_OVERLAY echo get dropped instead.
        openOverlayDirect(true);
        return;
      }
      openOverlayDirect(false);
    };
    document.addEventListener('keydown', window.__QLENS_KEYHANDLER__, true);
  }

  if (needsRegister()) {
    if (typeof window.__QLENS_LISTENER__ === 'function') {
      try {
        chrome.runtime.onMessage.removeListener(window.__QLENS_LISTENER__);
      } catch (err) {
        /* stale listener reference — ignore */
      }
    }
    window.__QLENS_LISTENER__ = handleMessage;
    window.__QLENS_INJECTED__ = expected;
    try {
      chrome.runtime.onMessage.addListener(window.__QLENS_LISTENER__);
    } catch (err) {
      /* registration failed — SW will retry injection */
    }
  }
  registerShortcutHandler();
})();