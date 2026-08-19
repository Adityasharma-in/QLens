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
  let directAt = 0;
  const ECHO_WINDOW_MS = 500;

  function openOverlayDirect() {
    if (!QLENS.Overlay) {
      try {
        chrome.runtime.sendMessage({ type: QLENS.MSG.OPEN_OVERLAY }).catch(() => {});
      } catch (err) {
        /* ignore */
      }
      return;
    }
    directAt = Date.now();
    if (QLENS.Overlay.isVisible()) {
      QLENS.Overlay.destroy(true);
    } else {
      QLENS.Overlay.show({});
    }
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
        if (QLENS.Overlay.isVisible()) {
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

  function registerShortcutHandler() {
    if (typeof window.__QLENS_KEYHANDLER__ === 'function') return;
    window.__QLENS_KEYHANDLER__ = (e) => {
      if (e.defaultPrevented) return;
      QLENS.storage
        .getShortcut()
        .then((combo) => {
          if (!combo || !QLENS.matchesCombo(e, combo)) return;
          if (combo === QLENS.CONFIG.SHORTCUT_DEFAULT) return;
          openOverlayDirect();
        })
        .catch(() => {});
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