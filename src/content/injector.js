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

  // Captured once: after an extension update the page keeps its old QLENS
  // object, so these must not depend on a live module registry.
  const config = QLENS.CONFIG || {};
  const shortcutDefault = config.SHORTCUT_DEFAULT || 'Ctrl+Shift+K';
  const shortcutKey = (config.STORAGE_KEYS && config.STORAGE_KEYS.SHORTCUT) || 'shortcut';
  const openOverlayType = (QLENS.MSG && QLENS.MSG.OPEN_OVERLAY) || 'QLENS_OPEN_OVERLAY';

  function openOverlayDirect(openOnly) {
    const overlay = QLENS.Overlay;
    if (!overlay || typeof overlay.isVisible !== 'function' || typeof overlay.show !== 'function') {
      try {
        chrome.runtime.sendMessage({ type: openOverlayType }).catch(() => {});
      } catch (err) {
        /* ignore */
      }
      return;
    }
    const visible = overlay.isVisible();
    if (visible && !openOnly) {
      if (typeof overlay.destroy === 'function') overlay.destroy(true);
    } else if (!visible) {
      try {
        overlay.show({});
      } catch (err) {
        try {
          chrome.runtime.sendMessage({ type: openOverlayType }).catch(() => {});
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

  // Combo memoized so every keystroke on every page is a sync match - no
  // chrome.storage round trip in the hot path. It is re-read through the live
  // extension APIs. QLENS.storage belongs to the script set loaded with the
  // page, and after an extension update that copy's chrome context is dead: it
  // silently resolves to the default combo, which looks exactly like a custom
  // shortcut that stopped working. The storage read below runs in the newly
  // injected (live) context instead.
  let comboMemo = shortcutDefault;
  let comboReady = true;

  function sanitizeCombo(combo) {
    if (typeof combo !== 'string' || !combo) return shortcutDefault;
    try {
      if (typeof QLENS.isValidCombo === 'function' && !QLENS.isValidCombo(combo)) return shortcutDefault;
    } catch (err) {
      return shortcutDefault;
    }
    return combo;
  }

  function readCombo() {
    try {
      if (chrome && chrome.storage && chrome.storage.local && typeof chrome.storage.local.get === 'function') {
        return Promise.resolve(chrome.storage.local.get(shortcutKey))
          .then((res) => sanitizeCombo(res && res[shortcutKey]), () => shortcutDefault);
      }
    } catch (err) {
      /* fall through to the page's copy */
    }
    try {
      if (QLENS.storage && typeof QLENS.storage.getShortcut === 'function') {
        return Promise.resolve(QLENS.storage.getShortcut()).then(sanitizeCombo, () => shortcutDefault);
      }
    } catch (err) {
      /* fall through to the default */
    }
    return Promise.resolve(shortcutDefault);
  }

  function refreshCombo() {
    // Must never throw: this runs during script evaluation, and a synchronous
    // throw here would abort the IIFE before the keydown listener is attached,
    // silently disabling the shortcut for the life of the page. On failure fall
    // back to the default combo (now handled in-page) instead of leaving
    // comboReady false forever, which would ignore every keypress.
    try {
      Promise.resolve(readCombo())
        .then((combo) => {
          comboMemo = sanitizeCombo(combo);
          comboReady = true;
        })
        .catch(() => {
          comboMemo = shortcutDefault;
          comboReady = true;
        });
    } catch (err) {
      comboMemo = shortcutDefault;
      comboReady = true;
    }
  }

  function registerShortcutHandler() {
    // Always replace, never early-return: the service worker re-injects this
    // file into already-open tabs after an extension update (and after a
    // shortcut change). The old handler and its storage listener belong to the
    // dead context, so they would keep matching the previous combo forever.
    if (typeof window.__QLENS_STORAGE_LISTENER__ === 'function') {
      try {
        chrome.storage.onChanged.removeListener(window.__QLENS_STORAGE_LISTENER__);
      } catch (err) {
        /* old context — its listener is dead anyway */
      }
    }
    window.__QLENS_STORAGE_LISTENER__ = (changes, area) => {
      if (area === 'local' && changes && changes[shortcutKey]) refreshCombo();
    };
    refreshCombo();
    try {
      chrome.storage.onChanged.addListener(window.__QLENS_STORAGE_LISTENER__);
    } catch (err) {
      /* onChanged unavailable — memo stays at load-time value */
    }
    if (typeof window.__QLENS_KEYHANDLER__ === 'function') {
      try {
        document.removeEventListener('keydown', window.__QLENS_KEYHANDLER__, true);
      } catch (err) {
        /* ignore */
      }
    }
    window.__QLENS_KEYHANDLER__ = (e) => {
      if (!e || e.defaultPrevented || (!e.ctrlKey && !e.metaKey && !e.altKey)) return;
      const combo = comboMemo;
      if (!combo || !comboReady) return;
      if (typeof QLENS.matchesCombo !== 'function' || !QLENS.matchesCombo(e, combo)) return;
      if (combo === shortcutDefault) {
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
    try {
      document.addEventListener('keydown', window.__QLENS_KEYHANDLER__, true);
    } catch (err) {
      /* ignore */
    }
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