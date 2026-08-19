importScripts(
  '../shared/config.js',
  '../shared/messaging.js',
  '../shared/engines.js',
  '../shared/storage.js'
);

let injectNonce = '';
let openInFlight = false;

const FONT_FILES = [400, 500, 600, 700].map((w) => ({
  weight: w,
  url: 'src/fonts/inter-latin-' + w + '-normal.woff2'
}));

function bytesToBase64(bytes) {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

let fontPromise = null;

function loadFontsOnce() {
  if (!fontPromise) {
    fontPromise = (async () => {
      const items = [];
      for (const f of FONT_FILES) {
        try {
          const resp = await fetch(chrome.runtime.getURL(f.url));
          if (!resp.ok) continue;
          items.push({ weight: f.weight, base64: bytesToBase64(new Uint8Array(await resp.arrayBuffer())) });
        } catch (err) {
          /* skip broken face */
        }
      }
      return items;
    })();
  }
  return fontPromise;
}

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

// Pages that still carry the lean set from a pre-eager-injection version
// (config/messaging/engines/storage/injector) must not get those files
// re-injected: re-running them re-`const`s top-level bindings (SyntaxError).
// Inject only the delta the overlay additionally needs.
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
    const payload = {};
    if (typeof selectionText === 'string' && selectionText.length > 0) payload.selection = selectionText;
    const [settings, lastEngine] = await Promise.all([
      QLENS.storage.getSettings().catch(() => null),
      QLENS.storage.getLastEngine().catch(() => null)
    ]);
    if (settings) payload.settings = settings;
    if (typeof lastEngine === 'string') payload.lastEngine = lastEngine;

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
    }, 60);
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
    const ownHosts = ['www.google.com'];
    if (QLENS.ENGINES[engine]) {
      try { ownHosts.push(new URL(QLENS.ENGINES[engine].base).hostname); } catch (err) { /* ignore */ }
    }
    const blocked = ownHosts.map((h) => QLENS.bareHost(h));
    return list.filter((item) => {
      if (typeof item !== 'string') return false;
      const host = QLENS.bareHost(item);
      return Boolean(host) && !blocked.includes(host);
    }).slice(0, QLENS.CONFIG.MAX_SUGGESTIONS);
  } catch (err) {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

const LENS_FALLBACK = 'https://lens.google.com/';

function decodeBase64ToBytes(base64Str) {
  try {
    const raw = globalThis.atob(base64Str);
    const n = raw.length;
    const out = new Uint8Array(n);
    for (let i = 0; i < n; i++) out[i] = raw.charCodeAt(i);
    return out;
  } catch (err) {
    return null;
  }
}

function lensUploadFunc(b64Data, queryText, fileName) {
  try {
    var raw = Uint8Array.from(atob(b64Data), function(c) { return c.charCodeAt(0); });
    var mime = 'image/jpeg';
    if (raw.length >= 8 && raw[0] === 0x89 && raw[1] === 0x50 && raw[2] === 0x4e && raw[3] === 0x47) mime = 'image/png';
    var form = new FormData();
    form.append('encoded_image', new Blob([raw], { type: mime }), 'qlens-search.' + (mime === 'image/png' ? 'png' : 'jpg'));
    if (queryText) form.append('image_content', queryText);
    return fetch('/searchbyimage/upload', {
      method: 'POST',
      body: form,
      redirect: 'follow',
      credentials: 'include'
    }).then(function(resp) { return resp.url || null; }).catch(function() { return null; });
  } catch (e) { return Promise.resolve(null); }
}

function applyLensText(url, text) {
  const q = typeof text === 'string' ? text.trim() : '';
  if (!q) return url;
  let u;
  try {
    u = new URL(url);
  } catch (err) {
    return url;
  }
  if (u.hostname !== 'www.google.com' || !u.pathname.startsWith('/search')) return url;
  const hasQ = u.searchParams.has('q') && u.searchParams.get('q') !== '';
  if (hasQ && u.searchParams.get('udm') === '24') return url;
  u.searchParams.set('udm', '24');
  u.searchParams.set('q', q);
  u.searchParams.set('lns_mode', 'mu');
  u.searchParams.set('oq', '');
  return u.toString();
}

function waitForGoogleTab(tabId, timeoutMs) {
  const GOOGLE_HOME = /^https:\/\/www\.google\.com\/?([?#].*)?$/;
  return new Promise((resolve) => {
    let settled = false;
    const ok = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      chrome.tabs.onUpdated.removeListener(onUpdated);
      resolve(true);
    };
    const bail = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      chrome.tabs.onUpdated.removeListener(onUpdated);
      resolve(false);
    };
    const timer = setTimeout(bail, timeoutMs || 8000);
    function onUpdated(id, info) {
      if (id !== tabId || info.status !== 'complete' || settled) return;
      chrome.tabs.get(tabId, (tab) => {
        if (chrome.runtime.lastError || !tab || typeof tab.url !== 'string' || !GOOGLE_HOME.test(tab.url)) return;
        ok();
      });
    }
    chrome.tabs.onUpdated.addListener(onUpdated);
    chrome.tabs.get(tabId, (tab) => {
      if (chrome.runtime.lastError || !tab || tab.status !== 'complete' || typeof tab.url !== 'string' || !GOOGLE_HOME.test(tab.url)) return;
      ok();
    });
  });
}

async function handleImageSearch(payload) {
  const p = payload || {};
  const b64 = typeof p.bytes === 'string' ? p.bytes : '';
  const text = typeof p.text === 'string' ? p.text : '';
  const name = typeof p.name === 'string' ? p.name : '';
  const rawMax = QLENS.CONFIG.IMAGE_MAX_BYTES || 5 * 1024 * 1024;
  if (!b64 || b64.length > Math.ceil(rawMax * 4 / 3) + 16) {
    try { await chrome.tabs.create({ url: LENS_FALLBACK, active: true }); } catch (err) { return false; }
    return true;
  }
  let tab;
  try {
    tab = await chrome.tabs.create({ url: 'https://www.google.com/', active: false });
  } catch (err) {
    return false;
  }
  if (!(await waitForGoogleTab(tab.id, 8000))) {
    try { await chrome.tabs.update(tab.id, { url: LENS_FALLBACK, active: true }); } catch (err2) { /* ignore */ }
    return true;
  }
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      world: 'MAIN',
      func: lensUploadFunc,
      args: [b64, text, name]
    });
    const lensUrl = results && results[0] && results[0].result;
    const target = typeof lensUrl === 'string' ? applyLensText(lensUrl, text) : null;
    if (typeof target === 'string' && /^https:\/\/www\.google\.com\/search\?/.test(target) && target !== QLENS.LENS_UPLOAD) {
      await chrome.tabs.update(tab.id, { url: target, active: true });
    } else {
      await chrome.tabs.update(tab.id, { url: LENS_FALLBACK, active: true });
    }
  } catch (err) {
    try { await chrome.tabs.update(tab.id, { url: LENS_FALLBACK, active: true }); } catch (err2) { /* ignore */ }
  }
  return true;
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
  if (msg.type === QLENS.MSG.IMAGE_SEARCH) {
    handleImageSearch(msg.payload)
      .then((ok) => sendResponse({ ok }))
      .catch((err) => sendResponse({ ok: false, error: String(err) }));
    return true;
  }
  if (msg.type === QLENS.MSG.FONT_FACE) {
    loadFontsOnce()
      .then((items) => sendResponse({ ok: true, items }))
      .catch(() => sendResponse({ ok: false, items: [] }));
    return true;
  }
  return false;
});

chrome.commands.onCommand.addListener((command) => {
  if (command === 'open-quick-search') {
    openQuickSearch();
  }
});

// Preload bundled Inter as base64 so the overlay's first binary FontFace
// apply is instant (page CSP cannot block binary fonts — it CAN block the
// chrome-extension: @font-face URL on strict sites like github.com).
loadFontsOnce().catch(() => {});

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
  if (contentScriptRemover) {
    contentScriptRemover([KEYDOWN_CS_ID]).catch(() => {});
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