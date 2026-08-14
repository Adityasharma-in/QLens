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

  function handleMessage(msg, sender, sendResponse) {
    if (!sender || sender.id !== chrome.runtime.id) return false;
    if (!msg || typeof msg.type !== 'string') return false;
    try {
      if (msg.type === QLENS.MSG.OPEN_OVERLAY) {
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
})();