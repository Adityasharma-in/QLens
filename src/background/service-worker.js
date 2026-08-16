importScripts(
  '../shared/config.js',
  '../shared/messaging.js',
  '../shared/engines.js',
  '../shared/storage.js'
);

let injectNonce = '';
let openInFlight = false;

const KEYDOWN_CS_ID = 'qlens-keydown';

function scriptRemoverApi() {
  try {
    if (typeof chrome.scripting.removeContentScripts === 'function') return chrome.scripting.removeContentScripts;
    if (typeof chrome.scripting.unregisterContentScripts === 'function') return chrome.scripting.unregisterContentScripts;
  } catch (err) {
    return null;
  }
  return null;
}

const contentScriptRemover = scriptRemoverApi();

async function syncKeydownContent() {
  if (
    !chrome.scripting ||
    typeof chrome.scripting.getRegisteredContentScripts !== 'function' ||
    typeof chrome.scripting.registerContentScripts !== 'function' ||
    !contentScriptRemover
  ) {
    return;
  }
  const custom = (await QLENS.storage.getShortcut()) !== QLENS.CONFIG.SHORTCUT_DEFAULT;
  try {
    const registered = await chrome.scripting.getRegisteredContentScripts();
    const have = registered && registered.some((s) => s.id === KEYDOWN_CS_ID);
    if (custom && !have) {
      await chrome.scripting.registerContentScripts([
        {
          id: KEYDOWN_CS_ID,
          matches: ['http://*/*', 'https://*/*'],
          runAt: 'document_idle',
          persistAcrossSessions: true,
          js: QLENS.KEYDOWN_FILES.slice()
        }
      ]);
    } else if (!custom && have) {
      await contentScriptRemover([KEYDOWN_CS_ID]);
    }
  } catch (err) {
    /* best-effort; on-demand injection remains the fallback */
  }
}

syncKeydownContent();

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isAllowedTabUrl(url) {
  return typeof url === 'string' && /^https?:\/\//i.test(url);
}

function makeNonce() {
  if (globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function') {
    try {
      return globalThis.crypto.randomUUID();
    } catch (err) {
      return fallbackNonce();
    }
  }
  return fallbackNonce();
}

function fallbackNonce() {
  return String(Date.now()) + '-' + Math.random().toString(36).slice(2);
}

async function sendOpenOverlay(tabId, payload) {
  const resp = await chrome.tabs.sendMessage(tabId, {
    type: QLENS.MSG.OPEN_OVERLAY,
    payload: payload || {}
  });
  return resp && resp.ok === true;
}

// Files already guaranteed on the page when the keydown (lean) dynamic content
// script is registered: re-injecting them would re-`const` their top-level
// bindings (SyntaxError: Identifier already declared). Inject only the delta.
const KEYDOWN_DELTA_FILES = QLENS.CONTENT_FILES.filter(
  (f) => !QLENS.KEYDOWN_FILES.includes(f)
);

async function injectContent(tabId) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      func: (nonce) => {
        window.__QLENS_EXPECTED_NONCE__ = nonce;
      },
      args: [injectNonce]
    });
    // Probe: is the lean set (config/storage/injector) already evaluated on this
    // page? If so, only inject what the overlay additionally needs (logos,
    // selection, overlay). Otherwise inject the full set as before.
    const probe = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => Boolean(window.QLENS && QLENS.CONFIG && QLENS.storage)
    });
    const leanPresent = probe && probe.length > 0 && probe[0].result === true;
    const files = leanPresent ? KEYDOWN_DELTA_FILES : QLENS.CONTENT_FILES.slice();
    await chrome.scripting.executeScript({
      target: { tabId },
      files
    });
    return true;
  } catch (err) {
    return false;
  }
}

async function openQuickSearch(selectionText, tabId) {
  if (openInFlight) return;
  openInFlight = true;
  try {
    let tab = null;
    if (typeof tabId === 'number') {
      try {
        tab = await chrome.tabs.get(tabId);
      } catch (err) {
        tab = null;
      }
    }
    if (!tab) {
      const tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
      tab = tabs && tabs[0] ? tabs[0] : null;
    }
    if (!tab || typeof tab.id !== 'number') return;
    if (!isAllowedTabUrl(tab.url)) return;

    injectNonce = makeNonce();
    const payload = typeof selectionText === 'string' && selectionText.length > 0
      ? { selection: selectionText }
      : {};

    try {
      if (await sendOpenOverlay(tab.id, payload)) return;
    } catch (err) {
      /* no live listener yet — inject below */
    }

    if (!(await injectContent(tab.id))) return;

    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        if (await sendOpenOverlay(tab.id, payload)) return;
      } catch (err) {
        /* retry after backoff */
      }
      await sleep(100);
    }
  } catch (err) {
    /* restricted page or transient error — never surface */
  } finally {
    setTimeout(() => {
      openInFlight = false;
    }, 150);
  }
}

function payloadId(payload) {
  return payload && typeof payload.id === 'number' ? payload.id : -1;
}

async function handleOpenTab(payload) {
  const p = payload || {};
  const url = typeof p.url === 'string' ? p.url : '';
  if (!QLENS.isSafeHttpUrl(url)) return false;
  if (typeof p.engine === 'string' && QLENS.ENGINES[p.engine]) {
    await QLENS.storage.setLastEngine(p.engine);
  }
  await chrome.tabs.create({ url, active: true });
  return true;
}

async function handleSuggestions(payload) {
  const p = payload || {};
  const engine = typeof p.engine === 'string' ? p.engine : '';
  const query = typeof p.query === 'string' ? p.query : '';
  if (!query.trim()) return [];
  const url = QLENS.suggestUrlFor(engine, query);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), QLENS.CONFIG.SUGGESTION_TIMEOUT_MS);
  try {
    const resp = await fetch(url, { signal: controller.signal, cache: 'no-store' });
    if (!resp.ok) return [];
    const data = await resp.json();
    const list = Array.isArray(data) ? (Array.isArray(data[1]) ? data[1] : data) : [];
    return list.filter((item) => typeof item === 'string').slice(0, QLENS.CONFIG.MAX_SUGGESTIONS);
  } catch (err) {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!sender || sender.id !== chrome.runtime.id) return false;
  if (!msg || typeof msg.type !== 'string') return false;
  if (msg.type === QLENS.MSG.OPEN_TAB) {
    handleOpenTab(msg.payload)
      .then((ok) => sendResponse({ ok }))
      .catch((err) => sendResponse({ ok: false, error: String(err) }));
    return true;
  }
  if (msg.type === QLENS.MSG.OPEN_OVERLAY) {
    openQuickSearch();
    sendResponse({ ok: true });
    return true;
  }
  if (msg.type === QLENS.MSG.FETCH_SUGGESTIONS) {
    handleSuggestions(msg.payload)
      .then((results) => sendResponse({ ok: true, id: payloadId(msg.payload), results }))
      .catch(() => sendResponse({ ok: false, id: payloadId(msg.payload), results: [] }));
    return true;
  }
  return false;
});

chrome.commands.onCommand.addListener((command) => {
  if (command === 'open-quick-search') {
    openQuickSearch();
  }
});

const MENU_ID = 'qlens-search-selection';

function ensureContextMenu() {
  try {
    chrome.contextMenus.removeAll(() => {
      try {
        chrome.contextMenus.create({
          id: MENU_ID,
          title: 'Search with QLens',
          contexts: ['selection']
        });
      } catch (err) {
        /* context menu unavailable — non-fatal */
      }
    });
  } catch (err) {
    /* context menu unavailable — non-fatal */
  }
}

chrome.runtime.onInstalled.addListener(() => {
  ensureContextMenu();
  syncKeydownContent();
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes[QLENS.CONFIG.STORAGE_KEYS.SHORTCUT]) {
    syncKeydownContent();
  }
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (!info || info.menuItemId !== MENU_ID) return;
  const text = typeof info.selectionText === 'string' ? info.selectionText.trim() : '';
  if (!text) return;
  const tabId = tab && typeof tab.id === 'number' ? tab.id : undefined;
  QLENS.storage
    .getSettings()
    .then((settings) => {
      if (settings.contextMenuAction === 'direct') {
        const url = QLENS.buildSearchUrl(settings.defaultEngine, text);
        if (!url) return;
        chrome.tabs.create({ url, active: true }).catch(() => {});
      } else {
        openQuickSearch(text, tabId);
      }
    })
    .catch(() => openQuickSearch(text, tabId));
});