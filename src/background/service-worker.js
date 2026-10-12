importScripts(
  '../shared/config.js',
  '../shared/messaging.js',
  '../shared/engines.js',
  '../shared/launcher.js',
  '../shared/async.js',
  '../shared/storage.js',
  '../shared/image.js'
);

let injectNonce = '';
let openLastStart = 0;
// Dual-fire debounce (manifest command + in-page keydown for one keypress)
// settles in well under half a second even on a cold SW wake; 1500 ms also
// swallowed a real Esc-then-fast-reopen, which looks like a dead shortcut.
const OPEN_GUARD_MS = 400;

// Settings memo: warm at SW start, invalidated+re-primed on storage change.
// Lets openQuickSearch build the OPEN_OVERLAY payload with zero awaits on the
// hot path (fresh SW wake falls back to one storage read).
let settingsMemo = null;

function primeSettingsMemo() {
  Promise.all([
    QLENS.storage.getSettings().catch(() => null),
    QLENS.storage.getLastEngine().catch(() => null)
  ])
    .then(([settings, lastEngine]) => {
      settingsMemo = { settings, lastEngine };
    })
    .catch(() => {});
}

try {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    if (changes[QLENS.CONFIG.STORAGE_KEYS.SETTINGS] || changes[QLENS.CONFIG.STORAGE_KEYS.LAST_ENGINE]) {
      settingsMemo = null;
      primeSettingsMemo();
    }
  });
} catch (err) {
  /* onChanged unavailable — memo just stays cold */
}

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
    fontPromise = Promise.all(FONT_FILES.map(async (f) => {
      try {
        const resp = await fetch(chrome.runtime.getURL(f.url));
        if (!resp.ok) return null;
        return { weight: f.weight, base64: bytesToBase64(new Uint8Array(await resp.arrayBuffer())) };
      } catch (err) {
        return null;
      }
    })).then((items) => items.filter((item) => Boolean(item)));
  }
  return fontPromise;
}

const KEYDOWN_CS_ID = 'qlens-keydown';

function safeRemoveKeydownScript() {
  try {
    if (typeof chrome.scripting.unregisterContentScripts === 'function') {
      const p = chrome.scripting.unregisterContentScripts({ ids: [KEYDOWN_CS_ID] });
      if (p && typeof p.catch === 'function') p.catch(() => {});
      return;
    }
  } catch (err) {}
  try {
    if (typeof chrome.scripting.removeContentScripts === 'function') {
      const p = chrome.scripting.removeContentScripts([KEYDOWN_CS_ID]);
      if (p && typeof p.catch === 'function') p.catch(() => {});
      return;
    }
  } catch (err) {}
}

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
  if (resp && resp.ok === true) return true;
  if (resp && typeof resp.error === 'string' && resp.error) {
    try {
      console.warn('QLens: overlay open failed — ' + resp.error.slice(0, 300));
    } catch (e) {}
  }
  return false;
}

// Pages already carrying the manifest lean set must not get those files
// re-injected: re-running them re-`const`s top-level bindings (SyntaxError).
// Inject only the delta the overlay additionally needs -- plus the message
// bridge, which must be re-run on every open so a dead listener left behind by
// a previous extension instance gets repaired (see QLENS.MESSAGE_BRIDGE_FILES).
const KEYDOWN_DELTA_FILES = QLENS.CONTENT_FILES.filter(
  (f) => !QLENS.KEYDOWN_FILES.includes(f) || QLENS.MESSAGE_BRIDGE_FILES.includes(f)
);

let lastOpenWarn = '';

function warnOpen(reason, err) {
  const line = 'QLens: could not open overlay — ' + reason
    + (err ? ' (' + String((err && err.message) || err) + ')' : '');
  if (line === lastOpenWarn) return;
  lastOpenWarn = line;
  try { console.warn(line); } catch (e) {}
}

function clearOpenWarn() {
  lastOpenWarn = '';
}

async function injectContent(tabId) {
  try {
    // One round trip: stamp nonce AND probe what the page already has.
    // The probe must distinguish three states, because re-running a
    // const-bearing file in the same isolated world throws
    // "Identifier has already been declared" and aborts the whole batch —
    // including the bridge at the end, which is the one file we need most:
    //   lean=false            -> fresh page, inject CONTENT_FILES (all new)
    //   lean=true, no overlay -> first open, inject KEYDOWN_DELTA_FILES (all new)
    //   lean=true, overlay    -> overlay files already present (possibly from
    //                            an orphaned pre-reload instance); inject ONLY
    //                            the message bridge, which is re-runnable by
    //                            design and re-registers the live listener.
    const probe = await chrome.scripting.executeScript({
      target: { tabId },
      func: (nonce) => {
        try {
          window.__QLENS_EXPECTED_NONCE__ = nonce;
        } catch (err) {}
        let lean = false;
        let hasOverlay = false;
        try {
          lean = Boolean(window.QLENS && QLENS.CONFIG && QLENS.storage);
        } catch (err) {
          lean = false;
        }
        try {
          hasOverlay = Boolean(window.QLENS && QLENS.Overlay && typeof QLENS.Overlay.show === 'function');
        } catch (err) {
          hasOverlay = false;
        }
        return { lean, hasOverlay };
      },
      args: [injectNonce]
    });
    const result = probe && probe.length > 0 ? probe[0].result : null;
    // Defensive: very old injected probe returned a bare boolean.
    const leanPresent = result && typeof result === 'object' ? result.lean === true : result === true;
    const hasOverlay = result && typeof result === 'object' ? result.hasOverlay === true : false;
    let files;
    if (!leanPresent) {
      files = QLENS.CONTENT_FILES.slice();
    } else if (!hasOverlay) {
      files = KEYDOWN_DELTA_FILES.slice();
    } else {
      files = QLENS.MESSAGE_BRIDGE_FILES.slice();
    }
    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        files
      });
    } catch (err) {
      // Bulk failed (typically a redeclaration on an orphaned page that
      // already carries old consts). The bridge alone is always safe and is
      // sufficient when the overlay files are already present — retry it so
      // the listener still gets repaired instead of leaving a dead shortcut.
      if (files !== QLENS.MESSAGE_BRIDGE_FILES && !(files.length === 1 && files[0] === QLENS.MESSAGE_BRIDGE_FILES[0])) {
        try {
          await chrome.scripting.executeScript({
            target: { tabId },
            files: QLENS.MESSAGE_BRIDGE_FILES.slice()
          });
          return true;
        } catch (err2) {
          warnOpen('script injection failed', err2);
          return false;
        }
      }
      warnOpen('script injection failed', err);
      return false;
    }
    return true;
  } catch (err) {
    warnOpen('script injection failed', err);
    return false;
  }
}

function resolveActiveTab(tabId) {
  if (typeof tabId === 'number') {
    return chrome.tabs.get(tabId).catch(() => null);
  }
  return chrome.tabs
    .query({ active: true, lastFocusedWindow: true })
    .then((tabs) => (tabs && tabs[0] ? tabs[0] : null))
    .catch(() => null);
}

async function buildPayload(selectionText) {
  const payload = {};
  if (typeof selectionText === 'string' && selectionText.length > 0) payload.selection = selectionText;
  const memo = settingsMemo;
  if (memo && memo.settings) {
    payload.settings = memo.settings;
    if (typeof memo.lastEngine === 'string') payload.lastEngine = memo.lastEngine;
    return payload;
  }
  const [settings, lastEngine] = await Promise.all([
    QLENS.storage.getSettings().catch(() => null),
    QLENS.storage.getLastEngine().catch(() => null)
  ]);
  if (settings) payload.settings = settings;
  if (typeof lastEngine === 'string') payload.lastEngine = lastEngine;
  return payload;
}

function openFallbackSearchTab(selectionText) {
  let q = '';
  try {
    q = typeof selectionText === 'string' ? selectionText : '';
    const url = QLENS.buildFallbackPopupUrl(
      chrome.runtime.getURL('src/popup/popup.html'),
      q
    );
    chrome.tabs.create({ url, active: true }).catch(() => {});
  } catch (err) {
    /* restricted page — fallback open is best-effort, never throw */
  }
}

async function openQuickSearch(selectionText, tabId) {
  const now = Date.now();
  if (now - openLastStart < OPEN_GUARD_MS) return false;
  openLastStart = now;
  try {
    // Tab lookup and settings read run concurrently — the overlay message
    // goes out after a single await instead of two serial ones.
    const [tab, payload] = await Promise.all([resolveActiveTab(tabId), buildPayload(selectionText)]);
    if (!tab || typeof tab.id !== 'number') {
      // A command can wake the SW before the focused window is established, so
      // tabs.query can come back empty. Bail out to the popup tab rather than
      // returning in silence — a visible fallback beats a dead shortcut.
      warnOpen('no active tab could be resolved');
      openFallbackSearchTab(selectionText);
      return false;
    }
    if (!isAllowedTabUrl(tab.url)) {
      openFallbackSearchTab(selectionText);
      return false;
    }

    injectNonce = makeNonce();

    try {
      if (await sendOpenOverlay(tab.id, payload)) {
        clearOpenWarn();
        warmLens();
        return true;
      }
    } catch (err) {
      /* no live listener yet — inject below */
    }

    if (!(await injectContent(tab.id))) return false;

    // A wedged content script would stall sendMessage indefinitely and burn
    // SW lifetime — fail each attempt fast so the warn path stays responsive.
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const raced = await Promise.race([
          sendOpenOverlay(tab.id, payload),
          sleep(800).then(() => false)
        ]);
        if (raced) {
          clearOpenWarn();
          return true;
        }
      } catch (err) {
        /* retry after backoff */
      }
      await sleep(80);
    }
    // Allowed page but no listener answered: do NOT open a new tab here.
    // A fallback tab on an injectable website is the wrong surface — the user
    // asked for the in-page overlay. Name the cause so it can be diagnosed.
    warnOpen('no overlay listener answered after injection — reload the page');
    return false;
  } catch (err) {
    /* restricted page or transient error — never surface */
    warnOpen('unexpected error', err);
    return false;
  }
}

function payloadId(payload) {
  return payload && typeof payload.id === 'number' ? payload.id : -1;
}

async function handleOpenTab(payload) {
  const p = payload || {};
  const url = typeof p.url === 'string' ? p.url : '';
  if (!QLENS.isSafeHttpUrl(url)) return false;
  if (typeof p.engine === 'string' && p.engine) {
    const knownBuiltin = Boolean(QLENS.ENGINES[p.engine]);
    let knownCustom = false;
    if (!knownBuiltin && typeof QLENS.getCustomEngines === 'function') {
      try {
        const s = (settingsMemo && settingsMemo.settings)
          ? settingsMemo.settings
          : await QLENS.storage.getSettings().catch(() => null);
        knownCustom = QLENS.getCustomEngines(s).some((c) => c.id === p.engine);
      } catch (err) {
        knownCustom = false;
      }
    }
    if (knownBuiltin || knownCustom) {
      // Fire-and-forget: results tab must not wait on a storage write. The SW
      // stays alive for the duration of this message response, so the write lands.
      QLENS.storage.setLastEngine(p.engine).catch(() => {});
      if (settingsMemo) settingsMemo.lastEngine = p.engine;
    }
  }
  await chrome.tabs.create({ url, active: true });
  return true;
}

// Suggestion cache: normalized query -> { results, ts }. Repeat queries
// (backspace/retype, reopen) skip the network entirely.
const suggestCache = new Map();
const suggestFlights = new Map();

function suggestCacheGet(key) {
  if (typeof key !== 'string' || !key) return null;
  const entry = suggestCache.get(key);
  if (!entry) return null;
  const ttl = QLENS.CONFIG.SUGGESTION_CACHE_TTL_MS || 120000;
  try {
    if (Date.now() - entry.ts > ttl) suggestCache.delete(key);
    else return entry.results;
  } catch (err) {
    try { suggestCache.delete(key); } catch (e) {}
  }
  return null;
}

function suggestCacheSet(key, results) {
  if (typeof key !== 'string' || !key || !Array.isArray(results)) return;
  const max = QLENS.CONFIG.SUGGESTION_CACHE_MAX || 48;
  try {
    suggestCache.set(key, { results: results.slice(), ts: Date.now() });
    while (suggestCache.size > max) {
      const oldest = suggestCache.keys().next();
      if (oldest.done) break;
      suggestCache.delete(oldest.value);
    }
  } catch (err) {}
}

async function handleSuggestions(payload, tabId) {
  const p = payload || {};
  const engine = typeof p.engine === 'string' ? p.engine : '';
  const query = typeof p.query === 'string' ? p.query : '';
  if (!query.trim()) return [];
  const cacheKey = query.trim().toLowerCase();
  const cached = suggestCacheGet(cacheKey);
  if (cached) return cached.slice();
  const url = QLENS.suggestUrlFor(engine, query);
  // Suggestions are engine-agnostic (always the Google endpoint) — key the
  // single-flight abort on the tab alone so switching engines mid-flight
  // kills the stale request instead of leaving it running beside the new one.
  const flightKey = String(typeof tabId === 'number' ? tabId : '');
  const prev = suggestFlights.get(flightKey);
  if (prev) {
    try { prev.abort(); } catch (err) {}
  }
  const controller = new AbortController();
  suggestFlights.set(flightKey, controller);
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
    const out = list.filter((item) => {
      if (typeof item !== 'string') return false;
      const host = QLENS.bareHost(item);
      return Boolean(host) && !blocked.includes(host);
    }).slice(0, QLENS.CONFIG.MAX_SUGGESTIONS);
    // Never cache empties: a 1s network blip must not suppress suggestions
    // for the full 120s TTL. The per-tab abort above already prevents loops.
    if (out.length) suggestCacheSet(cacheKey, out);
    return out;
  } catch (err) {
    return [];
  } finally {
    clearTimeout(timer);
    if (suggestFlights.get(flightKey) === controller) suggestFlights.delete(flightKey);
  }
}

const LAUNCHER_HISTORY_DAYS = 14;
const LAUNCHER_HISTORY_MAX = 6;
const LAUNCHER_RECENT_BOOKMARKS = 6;

// The launcher used to hit chrome.tabs/bookmarks/history on every debounced
// keystroke. chrome.history.search in particular is a real DB read. These
// short TTLs absorb backspace/retype bursts and the repeat queries that come
// with re-opening the overlay, without changing what the user ever sees:
// tab/bookmark state only changes on a user action, so a sub-second snapshot
// is indistinguishable from a live read.
const LAUNCHER_TABS_TTL_MS = 1000;
const LAUNCHER_BOOKMARKS_TTL_MS = 5000;
const LAUNCHER_HISTORY_TTL_MS = 2000;
const LAUNCHER_MEM_MAX = 24;

function launcherCfg() {
  try {
    const s = settingsMemo && settingsMemo.settings ? settingsMemo.settings : null;
    if (s && s.launcher && typeof s.launcher === 'object' && typeof QLENS.sanitizeLauncher === 'function') {
      return QLENS.sanitizeLauncher(s.launcher);
    }
  } catch (err) {}
  return QLENS.sanitizeLauncher({});
}

function memoGet(store, key, ttlMs) {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > ttlMs) {
    store.delete(key);
    return null;
  }
  return entry.items;
}

function memoSet(store, key, items) {
  store.set(key, { items, ts: Date.now() });
  while (store.size > LAUNCHER_MEM_MAX) {
    const oldest = store.keys().next();
    if (oldest.done) break;
    store.delete(oldest.value);
  }
  return items;
}

let tabsSnapshot = null;

async function fetchLauncherTabs() {
  if (tabsSnapshot && Date.now() - tabsSnapshot.ts < LAUNCHER_TABS_TTL_MS) {
    return tabsSnapshot.items;
  }
  try {
    const tabs = await chrome.tabs.query({ url: ['http://*/*', 'https://*/*'] });
    const items = Array.isArray(tabs)
      ? tabs
        .filter((t) => t && !t.incognito && typeof t.url === 'string' && QLENS.isSafeHttpUrl(t.url))
        .map((t) => ({ title: typeof t.title === 'string' ? t.title : '', url: t.url, tabId: t.id }))
      : [];
    tabsSnapshot = { items, ts: Date.now() };
    return items;
  } catch (err) {
    return [];
  }
}

const bookmarksMemo = new Map();

function memoPrefixHit(store, key, ttlMs) {
  if (typeof key !== 'string' || !key) return null;
  let best = null;
  for (const [memKey, entry] of store) {
    if (!memKey || key.indexOf(memKey) !== 0) continue;
    if (Date.now() - entry.ts > ttlMs) {
      store.delete(memKey);
      continue;
    }
    if (!best || memKey.length > best.length) best = memKey;
  }
  if (!best) return null;
  const entry = store.get(best);
  if (!entry) return null;
  const needle = key.toLowerCase();
  return (entry.items || []).filter((item) => {
    if (!item || typeof item !== 'object') return false;
    const title = typeof item.title === 'string' ? item.title.toLowerCase() : '';
    const url = typeof item.url === 'string' ? item.url.toLowerCase() : '';
    return title.indexOf(needle) !== -1 || url.indexOf(needle) !== -1;
  });
}

async function fetchLauncherBookmarks(query) {
  const key = String(query == null ? '' : query).trim().toLowerCase();
  const hit = memoGet(bookmarksMemo, key, LAUNCHER_BOOKMARKS_TTL_MS);
  if (hit) return hit;
  // chrome.bookmarks.search is word-based: a longer query can match items its
  // prefix never returned, so the substring filter would drop real matches.
  // Only reuse the prefix cache for single-token queries; bypass on whitespace.
  if (key.indexOf(' ') === -1) {
    const prefix = memoPrefixHit(bookmarksMemo, key, LAUNCHER_BOOKMARKS_TTL_MS);
    if (prefix) return prefix;
  }
  try {
    if (!chrome.bookmarks || typeof chrome.bookmarks.search !== 'function') return [];
    // Revoked optional permission: fail fast instead of paying a throwing
    // DB call on every keystroke.
    try {
      if (chrome.permissions && typeof chrome.permissions.contains === 'function') {
        const granted = await chrome.permissions.contains({ permissions: ['bookmarks'] });
        if (!granted) return [];
      }
    } catch (err) {}
    let nodes = [];
    if (key) {
      nodes = await chrome.bookmarks.search(key);
    } else if (typeof chrome.bookmarks.getRecent === 'function') {
      nodes = await chrome.bookmarks.getRecent(LAUNCHER_RECENT_BOOKMARKS);
    }
    if (!Array.isArray(nodes)) return [];
    const flat = [];
    const walk = (list) => {
      for (const n of list) {
        if (!n || typeof n !== 'object') continue;
        if (typeof n.url === 'string' && n.url) flat.push({ title: typeof n.title === 'string' ? n.title : '', url: n.url, id: n.id });
        if (Array.isArray(n.children)) walk(n.children);
      }
    };
    walk(nodes);
    if (flat.length > 50) flat.length = 50;
    return memoSet(bookmarksMemo, key, flat);
  } catch (err) {
    return [];
  }
}

const historyMemo = new Map();

async function fetchLauncherHistory(query) {
  const key = String(query == null ? '' : query).trim().toLowerCase();
  if (!key) return [];
  const hit = memoGet(historyMemo, key, LAUNCHER_HISTORY_TTL_MS);
  if (hit) return hit;
  if (key.indexOf(' ') === -1) {
    const prefix = memoPrefixHit(historyMemo, key, LAUNCHER_HISTORY_TTL_MS);
    if (prefix) return prefix;
  }
  try {
    if (!chrome.history || typeof chrome.history.search !== 'function') return [];
    try {
      if (chrome.permissions && typeof chrome.permissions.contains === 'function') {
        const granted = await chrome.permissions.contains({ permissions: ['history'] });
        if (!granted) return [];
      }
    } catch (err) {}
    const items = await chrome.history.search({
      text: key,
      maxResults: LAUNCHER_HISTORY_MAX,
      startTime: Date.now() - LAUNCHER_HISTORY_DAYS * 24 * 60 * 60 * 1000
    });
    if (!Array.isArray(items)) return [];
    const flat = items
      .filter((h) => h && typeof h.url === 'string')
      .map((h) => ({ title: typeof h.title === 'string' ? h.title : '', url: h.url, id: h.id }));
    return memoSet(historyMemo, key, flat);
  } catch (err) {
    return [];
  }
}

async function handleLauncherQuery(payload) {
  const p = payload || {};
  const query = typeof p.query === 'string' ? p.query : '';
  let cfg;
  try {
    // Stored settings are authoritative: a stale renderer must not be able
    // to re-enable history/bookmark reads the user disabled (privacy), and
    // re-sanitizing per keystroke is wasted work on a hot path.
    cfg = launcherCfg();
  } catch (err) {
    cfg = QLENS.sanitizeLauncher({});
  }
  if (!cfg.enabled) return [];
  if (!String(query == null ? '' : query).trim()) return [];
  const [tabs, bookmarks, history] = await Promise.all([
    cfg.tabs ? fetchLauncherTabs() : Promise.resolve([]),
    cfg.bookmarks ? fetchLauncherBookmarks(query) : Promise.resolve([]),
    cfg.history ? fetchLauncherHistory(query) : Promise.resolve([])
  ]);
  try {
    return QLENS.rankLauncherResults(query, tabs, bookmarks, history, cfg) || [];
  } catch (err) {
    return [];
  }
}

async function handleLauncherActivate(payload) {
  const p = payload || {};
  try {
    if (typeof p.tabId === 'number' && chrome.tabs && typeof chrome.tabs.update === 'function') {
      const tab = await chrome.tabs.update(p.tabId, { active: true }).catch(() => null);
      if (tab && typeof tab.windowId === 'number' && chrome.windows && typeof chrome.windows.update === 'function') {
        await chrome.windows.update(tab.windowId, { focused: true }).catch(() => {});
      }
      return true;
    }
  } catch (err) {
    return false;
  }
  return false;
}

async function handleLauncherClose(payload) {
  const p = payload || {};
  if (typeof p.tabId !== 'number') return false;
  try {
    if (chrome.tabs && typeof chrome.tabs.remove === 'function') {
      await chrome.tabs.remove(p.tabId);
      return true;
    }
  } catch (err) {
    return false;
  }
  return false;
}

const SW_LENS_FALLBACK = 'https://lens.google.com/';
const SW_LENS_UPLOAD = 'https://lens.google.com/v3/upload';
const SW_LENS_UPLOAD_ALT = (globalThis.QLENS && QLENS.LENS_UPLOAD) ? QLENS.LENS_UPLOAD : 'https://www.google.com/searchbyimage/upload';
const IMAGE_UPLOAD_TIMEOUT_MS = QLENS.CONFIG.IMAGE_SEARCH_TIMEOUT_MS || 20000;

// Fire-and-forget TLS warm-up so the Lens upload connects instantly.
let lensWarmed = false;
function warmLens() {
  if (lensWarmed) return;
  lensWarmed = true;
  try {
    fetch(QLENS.CONFIG.LENS_WARM_URL || 'https://www.google.com/generate_204', { mode: 'no-cors', credentials: 'omit', cache: 'no-store', keepalive: true }).catch(() => {});
  } catch (err) {}
}

// Session cache: hash -> { url, ts }
const lensCache = new Map();

function cacheGet(hash) {
  if (typeof hash !== 'string' || !hash) return null;
  const entry = lensCache.get(hash);
  if (!entry) return null;
  const ttl = QLENS.CONFIG.IMAGE_CACHE_TTL_MS || 5 * 60 * 1000;
  try {
    if (Date.now() - entry.ts > ttl) lensCache.delete(hash);
    else return entry.url;
  } catch (err) {
    try { lensCache.delete(hash); } catch (e) {}
  }
  return null;
}

function cacheSet(hash, url) {
  if (typeof hash !== 'string' || !hash || typeof url !== 'string' || !url) return;
  const max = QLENS.CONFIG.IMAGE_CACHE_MAX || 20;
  try {
    lensCache.set(hash, { url: url, ts: Date.now() });
    while (lensCache.size > max) {
      const oldest = lensCache.keys().next();
      if (oldest.done) break;
      lensCache.delete(oldest.value);
    }
  } catch (err) {}
}

// Single-flight guard (keyed by image hash)
let imageInFlight = false;
let imageFlightKey = '';

function imageHashKey(p, b64, bytes, text, name) {
  const h = p && typeof p.hash === 'string' ? p.hash : '';
  // 1-char hex keys collide across images — require enough entropy to be a key.
  if (h && h.length >= 4 && h.length <= 64 && /^[0-9a-fA-F]+$/.test(h)) return h;
  try {
    if (QLENS.ImageEngine && typeof QLENS.ImageEngine.fnv1a32 === 'function') {
      const input = bytes && bytes.length ? bytes : (b64 || '');
      if (input && input.length) {
        const fh = QLENS.ImageEngine.fnv1a32(input);
        if (typeof fh === 'string' && fh) return fh;
        if (typeof fh === 'number' && isFinite(fh)) return String(fh >>> 0);
      }
    }
  } catch (err) {}
  let prefix = b64 ? b64.slice(0, 64) : '';
  if (!prefix && bytes && bytes.length) {
    try { prefix = bytesToBase64(bytes.subarray(0, 48)); } catch (err) {}
  }
  return prefix + '|' + text + '|' + name;
}

async function settleJobTab(jobTab, finalUrl) {
  if (jobTab && typeof jobTab.id === 'number') {
    try {
      // If the user closed the interstitial mid-upload, respect the cancel:
      // do NOT reopen a new tab they already dismissed.
      const live = await chrome.tabs.get(jobTab.id).catch(() => null);
      if (!live) return false;
      await chrome.tabs.update(jobTab.id, { url: finalUrl });
      return true;
    } catch (err) {}
  }
  try {
    await chrome.tabs.create({ url: finalUrl, active: true });
  } catch (err) {
    return false;
  }
  return true;
}

function safeLensFilename(name, mimeFallback) {
  try {
    if (QLENS.ImageEngine && typeof QLENS.ImageEngine.buildLensFilename === 'function') {
      return QLENS.ImageEngine.buildLensFilename(name, mimeFallback || 'image/jpeg');
    }
  } catch (err) {}
  const safe = typeof name === 'string' && name.trim() ? name.trim().split('/').pop().split('\\').pop().replace(/[^a-z0-9._-]/gi, '_').slice(0, 80) : 'qlens-search.jpg';
  return safe || 'qlens-search.jpg';
}

function applyLensText(url, text) {
  const q = typeof text === 'string' ? text.trim().slice(0, 2000) : '';
  if (!q) return url;
  let u;
  try { u = new URL(url); } catch (err) { return url; }
  if (!isGoogleSearchHost(u.hostname) || !u.pathname.startsWith('/search')) return url;
  const hasQ = u.searchParams.has('q') && u.searchParams.get('q') !== '';
  if (hasQ && u.searchParams.get('udm') === '24') return url;
  u.searchParams.set('udm', '24');
  u.searchParams.set('q', q);
  u.searchParams.set('lns_mode', 'mu');
  u.searchParams.set('oq', '');
  return u.toString();
}

// Legacy tab-based path kept as fallback only (if direct fetch is blocked)
// Serialized into the page by executeScript, so it must stay self-contained.
// Posts to the absolute Lens endpoint: the old relative /searchbyimage/upload
// now 302s to a dead-end prompt page, and a relative fetch against a
// slow-loading tab can resolve against about:blank instead of google.com.
function lensUploadFunc(b64Data, queryText, fileName) {
  try {
    const raw = Uint8Array.from(atob(b64Data), function(c) { return c.charCodeAt(0); });
    let mime = 'image/jpeg';
    if (raw.length >= 8 && raw[0] === 0x89 && raw[1] === 0x50 && raw[2] === 0x4e && raw[3] === 0x47) mime = 'image/png';
    else if (raw.length >= 3 && raw[0] === 0xff && raw[1] === 0xd8 && raw[2] === 0xff) mime = 'image/jpeg';
    else if (raw.length >= 4 && raw[0] === 0x47 && raw[1] === 0x49 && raw[2] === 0x46 && raw[3] === 0x38) mime = 'image/gif';
    const fname = typeof fileName === 'string' && fileName ? fileName : ('qlens-search.' + (mime === 'image/png' ? 'png' : 'jpg'));
    const form = new FormData();
    form.append('encoded_image', new Blob([raw], { type: mime }), fname);
    if (queryText) form.append('image_content', queryText);
    const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    let timer = 0;
    try {
      if (ctrl) timer = setTimeout(function() { try { ctrl.abort(); } catch (e2) {} }, 10000);
    } catch (e2) {}
    const opts = { method: 'POST', body: form, redirect: 'follow', credentials: 'include' };
    if (ctrl) opts.signal = ctrl.signal;
    return fetch('https://lens.google.com/v3/upload', opts)
      .then(function(resp) { return resp.url || null; })
      .catch(function() { return null; })
      .then(function(url) { try { if (timer) clearTimeout(timer); } catch (e3) {} return url; });
  } catch (e) { return Promise.resolve(null); }
}

function b64ToBytesSW(b64) {
  try {
    if (QLENS.ImageEngine && typeof QLENS.ImageEngine.base64ToBytes === 'function') return QLENS.ImageEngine.base64ToBytes(b64);
  } catch (err) {}
  try {
    const raw = atob(b64);
    const out = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
    return out;
  } catch (err) { return null; }
}

function sniffMimeSW(bytes) {
  try {
    if (QLENS.ImageEngine && typeof QLENS.ImageEngine.sniffMime === 'function') return QLENS.ImageEngine.sniffMime(bytes) || 'image/jpeg';
  } catch (err) {}
  if (!bytes || bytes.length < 2) return 'image/jpeg';
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return 'image/png';
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if (bytes.length >= 4 && bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38) return 'image/gif';
  return 'image/jpeg';
}

// Google result-URL gate shared by every Lens return path. The hostname must
// END with google.<tld> — a bare substring test would accept google.evil.com.
function isGoogleSearchHost(host) {
  const parts = String(host || '').toLowerCase().split('.');
  const i = parts.indexOf('google');
  if (i < 0 || i === parts.length - 1) return false;
  const tail = parts.slice(i + 1);
  if (tail.length === 1) return /^[a-z]{2,}$/.test(tail[0]);
  if (tail.length === 2) return tail[0] === 'co' && /^[a-z]{2}$/.test(tail[1]);
  return false;
}

function isLensResultUrl(s) {
  if (typeof s !== 'string' || !s) return false;
  let u;
  try {
    u = new URL(s);
  } catch (err) {
    return false;
  }
  if (u.protocol !== 'https:') return false;
  if (u.hostname === 'lens.google.com') return true;
  return u.pathname.startsWith('/search') && isGoogleSearchHost(u.hostname);
}

// --- LIGHTSPEED direct path: no hidden tab, no google.com flash ---
function searchResultUrl(resp, endpoint) {
  let finalUrl = null;
  try {
    if (resp && typeof resp.url === 'string' && resp.url) finalUrl = resp.url;
    if (!finalUrl || finalUrl === endpoint) {
      try { finalUrl = resp.headers.get('location') || null; } catch (e) {}
    }
  } catch (err) {
    return null;
  }
  // Broaden: accept any google TLD and lens.google.com (user region may be google.co.in)
  if (!isLensResultUrl(finalUrl)) return null;
  return finalUrl;
}

async function postLensUpload(endpoint, raw, mime, fname, q) {
  let form = null;
  try {
    form = new FormData();
    form.append('encoded_image', new Blob([raw], { type: mime }), fname);
    if (q) form.append('image_content', q);
  } catch (err) {
    return { status: 'fatal' };
  }
  const ctrl = new AbortController();
  const timer = setTimeout(() => { try { ctrl.abort(); } catch (e) {} }, IMAGE_UPLOAD_TIMEOUT_MS);
  try {
    const resp = await fetch(endpoint, {
      method: 'POST',
      body: form,
      redirect: 'follow',
      credentials: 'include',
      cache: 'no-store',
      signal: ctrl.signal
    });
    return { status: 'ok', resp: resp };
  } catch (err) {
    try {
      if (ctrl.signal.aborted) return { status: 'aborted' };
    } catch (e) {}
    return { status: 'threw' };
  } finally {
    clearTimeout(timer);
  }
}

async function handleImageSearchDirect(raw, text, name) {
  if (!(raw instanceof Uint8Array) || !raw.length) return null;
  const mime = sniffMimeSW(raw);
  const fname = safeLensFilename(name, mime);
  const q = typeof text === 'string' ? text.trim().slice(0, 2000) : '';
  // Primary endpoint only; the alt is a network-failure fallback, NOT a
  // bad-page fallback (a non-search page means the upload was rejected).
  const primary = await postLensUpload(SW_LENS_UPLOAD, raw, mime, fname, q);
  if (primary.status === 'fatal') return null;
  if (primary.status === 'ok') {
    const url = searchResultUrl(primary.resp, SW_LENS_UPLOAD);
    if (url) return applyLensText(url, q) || url;
    return null;
  }
  // A timeout/abort means the network path itself is wedged — retrying the
  // alt would just double the stall. Only a network throw tries the alt once.
  if (primary.status !== 'threw') return null;
  // Primary fetch THREW (network-level TypeError) — try the alt once.
  const alt = await postLensUpload(SW_LENS_UPLOAD_ALT, raw, mime, fname, q);
  if (alt.status !== 'ok') return null;
  const url = searchResultUrl(alt.resp, SW_LENS_UPLOAD_ALT);
  if (url) return applyLensText(url, q) || url;
  return null;
}

async function handleImageSearchFallback(b64, text, name) {
  // Only if direct fetch blocked — reuse hidden tab directly (no double-tab flash)
  let tab = null;
  try {
    tab = await chrome.tabs.create({ url: 'https://www.google.com/', active: false });
  } catch (err) { return null; }
  if (!tab || typeof tab.id !== 'number') return null;
  // Readiness gate: injecting into a still-loading google.com tab makes the
  // page-world fetch resolve against about:blank and fail. Wait for a
  // committed google.com load first (8 s cap), then run the upload attempts.
  for (let w = 0; w < 80; w++) {
    let cur = null;
    try {
      cur = await chrome.tabs.get(tab.id);
    } catch (e) {
      return null;
    }
    if (cur && cur.status === 'complete' && typeof cur.url === 'string' && /^https:\/\/www\.google\.com/i.test(cur.url)) break;
    if (w === 79) {
      try { await chrome.tabs.remove(tab.id); } catch (e) {}
      return null;
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  for (let i = 0; i < 12; i++) {
    try {
      const res = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        world: 'MAIN',
        func: lensUploadFunc,
        args: [b64, text, safeLensFilename(name, 'image/jpeg')]
      });
      const url = res && res[0] && res[0].result;
      if (isLensResultUrl(url)) {
        const finalUrl = applyLensText(url, text) || url;
        try {
          await chrome.tabs.update(tab.id, { url: finalUrl, active: true });
        } catch (e) {
          try { await chrome.tabs.create({ url: finalUrl, active: true }); } catch (e2) {}
          try { await chrome.tabs.remove(tab.id); } catch (e3) {}
        }
        return finalUrl; // signal reused
      }
    } catch (e) {}
    await new Promise((r) => setTimeout(r, 120));
  }
  try { await chrome.tabs.remove(tab.id); } catch (e) {}
  return null;
}

async function handleImageSearch(payload) {
  const p = payload || {};
  const text = typeof p.text === 'string' ? p.text.trim().slice(0, 2000) : '';
  const name = typeof p.name === 'string' ? p.name : '';
  warmLens();
  // Payload intake: `bytes` is the base64 transport (overlay comment notes
  // extension messaging is JSON-only — typed arrays do not survive clone, so
  // base64 is the primary and only safe transport for the image payload).
  const b64 = typeof p.bytes === 'string' ? p.bytes : '';
  const rawMax = QLENS.CONFIG.IMAGE_MAX_BYTES || 5 * 1024 * 1024;
  const maxB64 = Math.ceil(rawMax * 4 / 3) + 64;
  // Invalid payload: report failure so the caller can surface the true cause.
  // Opening the Lens homepage here would mask oversize/corrupt pastes as success.
  if (!b64 || b64.length > maxB64) return false;
  if (!/^[A-Za-z0-9+/=]+$/.test(b64)) return false;
  const raw = b64ToBytesSW(b64);
  if (!raw) return false;
  const b64ForFallback = b64;
  // --- Hash key: payload.hash > fnv1a32 (feature-detected) > legacy slice ---
  const key = imageHashKey(p, b64, raw, text, name);
  if (imageInFlight) {
    if (imageFlightKey === key) return true;
    // A second image while one is uploading: report busy instead of throwing
    // so the caller can surface it. The overlay re-opens with the message.
    return { ok: false, busy: true };
  }
  // --- Cache hit: zero upload, instant ---
  try {
    const cached = cacheGet(key);
    if (cached && QLENS.isSafeHttpUrl(cached)) {
      try {
        await chrome.tabs.create({ url: cached, active: true });
      } catch (err) {
        return false;
      }
      return true;
    }
  } catch (err) {}
  imageInFlight = true;
  imageFlightKey = key;
  const flightTimer = setTimeout(() => { imageInFlight = false; imageFlightKey = ''; }, IMAGE_UPLOAD_TIMEOUT_MS + 2000);
  // --- Instant interstitial FIRST (perceived flash <100ms), upload after ---
  let jobTab = null;
  try {
    jobTab = await chrome.tabs.create({ url: chrome.runtime.getURL('src/lens/loading.html'), active: true }).catch(() => null);
  } catch (err) {
    jobTab = null;
  }
  try {
    // LIGHTSPEED: direct SW fetch — zero google.com flash, zero waitFor tab
    const directTarget = await handleImageSearchDirect(raw, text, name);
    if (directTarget) {
      const valid = isLensResultUrl(directTarget) && directTarget !== SW_LENS_UPLOAD && QLENS.isSafeHttpUrl(directTarget);
      const finalUrl = valid ? directTarget : SW_LENS_FALLBACK;
      if (valid) {
        try { cacheSet(key, finalUrl); } catch (err) {}
      }
      await settleJobTab(jobTab, finalUrl);
      return true;
    }
    // Direct fetch unavailable/blocked — last-resort hidden-tab fallback
    let fallbackUrl = null;
    try {
      if (b64ForFallback) fallbackUrl = await handleImageSearchFallback(b64ForFallback, text, name);
    } catch (err) {
      fallbackUrl = null;
    }
    if (fallbackUrl) {
      // Hidden-tab path already reused/closed its tab; jobTab interstitial is spare.
      try {
        if (jobTab && typeof jobTab.id === 'number') await chrome.tabs.remove(jobTab.id);
      } catch (err) {}
      try { cacheSet(key, fallbackUrl); } catch (err) {}
      return true;
    }
    try {
      await settleJobTab(jobTab, SW_LENS_FALLBACK);
    } catch (err) {
      return false;
    }
    return true;
  } finally {
    clearTimeout(flightTimer);
    setTimeout(() => { imageInFlight = false; imageFlightKey = ''; }, 400);
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
    // Prefer the sender tab when the message comes from a content script:
    // tabs.query can come back empty when a command wakes a cold SW before
    // the focused window is established, but the sender is already known.
    // Falling back to the query keeps the manifest-command path working.
    let senderTabId;
    try {
      senderTabId = sender && sender.tab && typeof sender.tab.id === 'number' ? sender.tab.id : undefined;
    } catch (err) {
      senderTabId = undefined;
    }
    openQuickSearch(undefined, senderTabId)
      .then((ok) => sendResponse({ ok: ok === true }))
      .catch((err) => sendResponse({ ok: false, error: String((err && err.message) || err) }));
    return true;
  }
  if (msg.type === QLENS.MSG.FETCH_SUGGESTIONS) {
    let suggestTabId;
    try {
      suggestTabId = sender && sender.tab && typeof sender.tab.id === 'number' ? sender.tab.id : undefined;
    } catch (err) {
      suggestTabId = undefined;
    }
    handleSuggestions(msg.payload, suggestTabId)
      .then((results) => sendResponse({ ok: true, id: payloadId(msg.payload), results }))
      .catch(() => sendResponse({ ok: false, id: payloadId(msg.payload), results: [] }));
    return true;
  }
  if (msg.type === QLENS.MSG.IMAGE_SEARCH) {
    handleImageSearch(msg.payload)
      .then((r) => sendResponse(r && typeof r === 'object' ? r : { ok: r }))
      .catch((err) => sendResponse({ ok: false, error: String(err) }));
    return true;
  }
  if (msg.type === QLENS.MSG.FONT_FACE) {
    loadFontsOnce()
      .then((items) => sendResponse({ ok: true, items }))
      .catch(() => sendResponse({ ok: false, items: [] }));
    return true;
  }
  if (msg.type === QLENS.MSG.LAUNCHER_QUERY) {
    handleLauncherQuery(msg.payload)
      .then((results) => sendResponse({ ok: true, id: payloadId(msg.payload), results }))
      .catch(() => sendResponse({ ok: false, id: payloadId(msg.payload), results: [] }));
    return true;
  }
  if (msg.type === QLENS.MSG.LAUNCHER_ACTIVATE) {
    handleLauncherActivate(msg.payload)
      .then((ok) => sendResponse({ ok }))
      .catch(() => sendResponse({ ok: false }));
    return true;
  }
  if (msg.type === QLENS.MSG.LAUNCHER_CLOSE) {
    handleLauncherClose(msg.payload)
      .then((ok) => sendResponse({ ok }))
      .catch(() => sendResponse({ ok: false }));
    return true;
  }
  if (msg.type === QLENS.MSG.OPEN_OPTIONS) {
    try {
      if (chrome.runtime && typeof chrome.runtime.openOptionsPage === 'function') {
        const p = chrome.runtime.openOptionsPage();
        if (p && typeof p.then === 'function') {
          p.then(() => sendResponse({ ok: true })).catch(() => sendResponse({ ok: false }));
          return true;
        }
        sendResponse({ ok: true });
        return false;
      }
    } catch (err) {}
    // openOptionsPage missing/rejected (restricted setups): open as a tab.
    try {
      chrome.tabs.create({ url: chrome.runtime.getURL('src/options/options.html'), active: true })
        .then(() => sendResponse({ ok: true }), () => sendResponse({ ok: false }));
      return true;
    } catch (err) {
      sendResponse({ ok: false });
      return false;
    }
  }
  return false;
});

chrome.commands.onCommand.addListener((command, tab) => {
  if (command === 'open-quick-search') {
    // Chrome hands us the tab the shortcut was pressed on: use it directly so
    // a cold-SW empty tabs.query can never leave the command path tab-less.
    let tabId;
    try {
      tabId = tab && typeof tab.id === 'number' ? tab.id : undefined;
    } catch (err) {
      tabId = undefined;
    }
    openQuickSearch(undefined, tabId);
  }
});

// If Chrome never bound the manifest shortcut, onCommand can never fire and the
// failure is completely invisible — the shortcut just does nothing. Warn once so
// the cause is nameable. The content script still handles the default combo
// in-page as a fallback, but only an open (never a toggle), so this diagnostic
// and that fallback cannot fight each other.
let warnedUnbound = false;

async function warnIfCommandUnbound() {
  if (warnedUnbound) return;
  try {
    if (typeof chrome.commands.getAll !== 'function') return;
    const all = await chrome.commands.getAll();
    const cmd = (all || []).find((c) => c.name === QLENS.CONFIG.SHORTCUT_COMMAND);
    if (!cmd) return;
    if (cmd.shortcut) {
      warnedUnbound = true;
      return;
    }
    warnedUnbound = true;
    console.warn(
      'QLens: Chrome has not assigned a keyboard shortcut to "'
      + QLENS.CONFIG.SHORTCUT_COMMAND
      + '" (another extension may own Ctrl+Shift+K, or it was cleared in'
      + ' chrome://extensions/shortcuts). Assign one there, or use the QLens'
      + ' toolbar button / the "ql" omnibox keyword.'
    );
  } catch (err) {
    /* getAll unavailable — diagnostic only, never fatal */
  }
}

// --- Omnibox keyword (`ql`): same buildSearchUrl() source of truth ---
function getMemoCustoms() {
  try {
    const s = settingsMemo && settingsMemo.settings ? settingsMemo.settings : null;
    if (s && typeof QLENS.getCustomEngines === 'function') {
      return QLENS.getCustomEngines(s);
    }
  } catch (err) {}
  return [];
}

function escapeOmniboxText(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function describeOmniboxSuggestion(parsed, rawQuery) {
  const q = typeof rawQuery === 'string' ? rawQuery.trim() : '';
  if (!q) return 'Type a query —QLens searches your default engine';
  if (parsed && parsed.url) return 'Go to ' + escapeOmniboxText(parsed.url) + ' — QLens';
  const label = (parsed && parsed.engineId && QLENS.ENGINES[parsed.engineId]
    ? QLENS.ENGINES[parsed.engineId].name
    : (parsed && parsed.engineId ? 'Custom engine' : 'Default engine'));
  const qText = (parsed && typeof parsed.query === 'string' && parsed.query) ? parsed.query : q;
  return 'Search ' + label + ' for "' + escapeOmniboxText(qText).slice(0, 80) + '" — QLens';
}

async function handleOmniboxEntered(text, disposition) {
  let customList = [];
  try {
    const s0 = (settingsMemo && settingsMemo.settings)
      ? settingsMemo.settings
      : await QLENS.storage.getSettings().catch(() => null);
    if (s0 && typeof QLENS.getCustomEngines === 'function') {
      customList = QLENS.getCustomEngines(s0);
    }
  } catch (err) {
    customList = [];
  }
  const customIds = new Set(customList.map((c) => c.id));
  let parsed = null;
  try {
    parsed = typeof QLENS.parseOmniboxInput === 'function'
      ? QLENS.parseOmniboxInput(text, customList)
      : { engineId: null, modeId: null, query: String(text == null ? '' : text).trim(), url: null };
  } catch (err) {
    parsed = { engineId: null, modeId: null, query: String(text == null ? '' : text).trim(), url: null };
  }
  try {
    if (parsed && parsed.url && QLENS.isSafeHttpUrl(parsed.url)) {
      if (disposition === 'currentTab') {
        chrome.tabs.update({ url: parsed.url }).catch(() => {
          chrome.tabs.create({ url: parsed.url, active: true }).catch(() => {});
        });
      } else {
        chrome.tabs.create({ url: parsed.url, active: disposition !== 'newBackgroundTab' }).catch(() => {});
      }
      return;
    }
    let engineId = parsed && parsed.engineId ? parsed.engineId : null;
    const query = parsed && typeof parsed.query === 'string' ? parsed.query : '';
    if (!query.trim()) return;
    if (!engineId) {
      try {
        const settings = (settingsMemo && settingsMemo.settings)
          ? settingsMemo.settings
          : await QLENS.storage.getSettings().catch(() => null);
        if (settings && typeof settings.defaultEngine === 'string'
          && (QLENS.ENGINES[settings.defaultEngine] || customIds.has(settings.defaultEngine))) {
          engineId = settings.defaultEngine;
        }
      } catch (err) {
        /* fall through to buildSearchUrl default */
      }
    }
    let url = null;
    try {
      url = QLENS.buildSearchUrl(engineId || 'google', query, null, false, customList);
    } catch (err) {
      url = null;
    }
    if (!url || !QLENS.isSafeHttpUrl(url)) return;
    // Same last-engine persistence as the overlay/popup path so Tab-cycle
    // and reopen behavior stay consistent across entry points.
    try {
      const known = engineId && (QLENS.ENGINES[engineId] || customIds.has(engineId));
      if (known) QLENS.storage.setLastEngine(engineId).catch(() => {});
    } catch (err) {}
    if (disposition === 'currentTab') {
      chrome.tabs.update({ url }).catch(() => {
        chrome.tabs.create({ url, active: true }).catch(() => {});
      });
    } else {
      chrome.tabs.create({ url, active: disposition !== 'newBackgroundTab' }).catch(() => {});
    }
  } catch (err) {
    /* omnibox entry — never throw */
  }
}

try {
  if (chrome.omnibox && typeof chrome.omnibox.onInputEntered.addListener === 'function') {
    chrome.omnibox.onInputChanged.addListener((text, suggest) => {
      const customs = getMemoCustoms();
      let parsed = null;
      try {
        parsed = typeof QLENS.parseOmniboxInput === 'function' ? QLENS.parseOmniboxInput(text, customs) : null;
      } catch (err) {
        parsed = null;
      }
      const raw = String(text == null ? '' : text);
      const q = raw.trim();
      const out = [];
      try {
        if (q && QLENS.ENGINES) {
          for (const id of Object.keys(QLENS.ENGINES)) {
            const eng = QLENS.ENGINES[id];
            if (!eng) continue;
            out.push({
              content: eng.prefix + ' ' + q,
              description: 'Search ' + eng.name + ' for "' + escapeOmniboxText(q).slice(0, 80) + '"'
            });
          }
          for (const c of customs.slice(0, 4)) {
            out.push({
              content: '!' + c.bang + ' ' + q,
              description: 'Search ' + escapeOmniboxText(c.name) + ' for "' + escapeOmniboxText(q).slice(0, 80) + '"'
            });
          }
          out.push({
            content: raw,
            description: describeOmniboxSuggestion(parsed, raw)
          });
        }
      } catch (err) {
        /* suggestions are best-effort */
      }
      try {
        chrome.omnibox.setDefaultSuggestion({
          description: describeOmniboxSuggestion(parsed, raw)
        });
      } catch (err) {
        /* older Chrome — ignore */
      }
      try {
        suggest(out.slice(0, 6));
      } catch (err) {
        /* ignore */
      }
    });
    chrome.omnibox.onInputEntered.addListener((text, disposition) => {
      handleOmniboxEntered(text, disposition);
    });
  }
} catch (err) {
  /* omnibox unavailable — non-fatal */
}

// Fonts stay lazy: preloading 4 woff2 as base64 on every SW wake stalls
// browser startup for an overlay the user may never open. The first
// FONT_FACE request warms the cache (parallel fetch above); later opens reuse it.
primeSettingsMemo();
warnIfCommandUnbound();

const MENU_ID = 'qlens-search-selection';

function ensureContextMenu() {
  try {
    chrome.contextMenus.removeAll(() => {
      try {
        if (chrome.runtime.lastError) return;
        chrome.contextMenus.create({
          id: MENU_ID,
          title: 'Search with QLens',
          contexts: ['selection']
        }, () => {
          try {
            if (chrome.runtime.lastError) return;
          } catch (err) {}
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
  safeRemoveKeydownScript();
});

try {
  if (chrome.runtime.onStartup && typeof chrome.runtime.onStartup.addListener === 'function') {
    chrome.runtime.onStartup.addListener(() => {
      ensureContextMenu();
    });
  }
} catch (err) {}

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (!info || info.menuItemId !== MENU_ID) return;
  // Truncate like the overlay does: a multi-KB selection would build a URL
  // tabs.create rejects, and the .catch swallows it into a silent no-op.
  let text = typeof info.selectionText === 'string' ? info.selectionText.trim() : '';
  if (!text) return;
  if (text.length > 500) text = text.slice(0, 500);
  const tabId = tab && typeof tab.id === 'number' ? tab.id : undefined;
  QLENS.storage
    .getSettings()
    .then((settings) => {
      if (settings.contextMenuAction === 'direct') {
        let customs = [];
        try {
          if (typeof QLENS.getCustomEngines === 'function') customs = QLENS.getCustomEngines(settings);
        } catch (err) {}
        // Smart-URL first, like overlay/popup/omnibox: right-clicking a URL
        // navigates instead of searching for the URL string.
        let site = null;
        try {
          site = QLENS.detectSmartUrl(text);
        } catch (err) {
          site = null;
        }
        if (site && QLENS.isSafeHttpUrl(site)) {
          chrome.tabs.create({ url: site, active: true }).catch(() => {});
          return;
        }
        const url = QLENS.buildSearchUrl(settings.defaultEngine, text, null, false, customs);
        if (!url) return;
        chrome.tabs.create({ url, active: true }).catch(() => {});
        try {
          QLENS.storage.setLastEngine(settings.defaultEngine).catch(() => {});
        } catch (err) {}
      } else {
        openQuickSearch(text, tabId);
      }
    })
    .catch(() => openQuickSearch(text, tabId));
});