globalThis.QLENS = globalThis.QLENS || {};

const ENGINES = {
  google: {
    id: 'google',
    name: 'Google',
    base: 'https://www.google.com/',
    search: 'search?q={q}',
    // Google AI Mode — /search with udm=50 (plus ntc=1&cs=0&atvm=2&zs=1) is
    // the user-verified AI results surface; sxsrf is a per-session token and
    // must NOT be hardcoded. webhp?atvm=2 and /search?udm=2 both failed live.
    aiSearch: 'search?q={q}&udm=50&ntc=1&cs=0&atvm=2&zs=1',
    suggestion: 'https://suggestqueries.google.com/complete/search?client=firefox&q={q}',
    prefix: 'g'
  },
  brave: {
    id: 'brave',
    name: 'Brave',
    base: 'https://search.brave.com/',
    search: 'search?q={q}',
    prefix: 'b'
  },
  bing: {
    id: 'bing',
    name: 'Bing',
    base: 'https://www.bing.com/',
    search: 'search?q={q}',
    prefix: 'k'
  },
  duckduckgo: {
    id: 'duckduckgo',
    name: 'DuckDuckGo',
    base: 'https://duckduckgo.com/',
    search: '?q={q}',
    prefix: 'd'
  }
};

const ENGINE_PREFIXES = {
  g: 'google',
  b: 'brave',
  k: 'bing',
  d: 'duckduckgo'
};

const OMNIBOX_ENGINE_BANGS = {
  g: 'google',
  google: 'google',
  b: 'brave',
  brave: 'brave',
  k: 'bing',
  bing: 'bing',
  d: 'duckduckgo',
  ddg: 'duckduckgo',
  duckduckgo: 'duckduckgo'
};

function safeEncodeQuery(q) {
  const s = String(q == null ? '' : q);
  try {
    return encodeURIComponent(s);
  } catch (err) {
    try {
      const cleaned = s
        .replace(/([\uD800-\uDBFF])(?![\uDC00-\uDFFF])/g, '')
        .replace(/([^\uD800-\uDBFF]|^)([\uDC00-\uDFFF])/g, '$1');
      return encodeURIComponent(cleaned);
    } catch (err2) {
      return '';
    }
  }
}

function buildSearchUrl(engineId, query, modeId, ai, customEngines) {
  const q = String(query == null ? '' : query).trim();
  if (!q) return null;
  if (typeof engineId === 'string' && Array.isArray(customEngines)) {
    for (const c of customEngines) {
      if (c && c.id === engineId && typeof c.url === 'string') {
        return buildCustomSearchUrl(c, q);
      }
    }
  }
  const spec = ENGINES[engineId] || ENGINES.google;
  const tpl = ai && spec === ENGINES.google && spec.aiSearch ? spec.aiSearch : spec.search;
  let url;
  try {
    url = new URL(tpl.replace('{q}', safeEncodeQuery(q)), spec.base);
  } catch (err) {
    return null;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
  return url.href;
}

function suggestUrlFor(engineId, query) {
  const tpl = ENGINES.google.suggestion;
  return tpl.replace('{q}', safeEncodeQuery(String(query == null ? '' : query).trim()));
}
function parsePrefix(input) {
  const trimmed = String(input == null ? '' : input).trimStart();
  if (!trimmed) return null;
  const match = /^([gbkd])\s+/.exec(trimmed);
  if (match && ENGINE_PREFIXES[match[1]]) {
    return { type: 'engine', id: ENGINE_PREFIXES[match[1]], rest: trimmed.slice(match[0].length).trimStart() };
  }
  return null;
}

const CUSTOM_ENGINE_BANG_RE = /^[a-z0-9]{1,12}$/i;
const CUSTOM_ENGINE_MAX = 30;

const RESERVED_BANGS = new Set(Object.keys(OMNIBOX_ENGINE_BANGS));

const QLENS_QUERY_TOKEN = '__QLENS_Q__';

function isValidCustomEngine(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return false;
  const id = typeof obj.id === 'string' ? obj.id.trim().toLowerCase() : '';
  const bang = typeof obj.bang === 'string' ? obj.bang.trim().toLowerCase() : '';
  const name = typeof obj.name === 'string' ? obj.name.trim() : '';
  const url = typeof obj.url === 'string' ? obj.url.trim() : '';
  if (!CUSTOM_ENGINE_BANG_RE.test(id)) return false;
  if (!CUSTOM_ENGINE_BANG_RE.test(bang)) return false;
  if (!name || name.length > 40) return false;
  if (url.length < 12 || url.length > 2000 || !url.includes('{q}')) return false;
  try {
    const u = new URL(url.split('{q}').join('test'));
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return false;
  } catch (err) {
    return false;
  }
  if (Object.prototype.hasOwnProperty.call(ENGINES, id)) return false;
  if (Object.prototype.hasOwnProperty.call(ENGINE_PREFIXES, id)) return false;
  if (Object.prototype.hasOwnProperty.call(OMNIBOX_ENGINE_BANGS, bang)) return false;
  return true;
}

function sanitizeCustomEngines(raw) {
  if (!Array.isArray(raw)) return [];
  const seenIds = new Set();
  const seenBangs = new Set();
  const out = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
    const id = typeof item.id === 'string' ? item.id.trim().toLowerCase() : '';
    const bang = typeof item.bang === 'string' ? item.bang.trim().toLowerCase() : '';
    let name = typeof item.name === 'string' ? item.name.trim() : '';
    let url = typeof item.url === 'string' ? item.url.trim() : '';
    if (!CUSTOM_ENGINE_BANG_RE.test(id) || seenIds.has(id)) continue;
    if (!CUSTOM_ENGINE_BANG_RE.test(bang) || seenBangs.has(bang)) continue;
    if (!name) name = bang;
    if (name.length > 40) name = name.slice(0, 40);
    if (url.length < 12 || url.length > 2000 || !url.includes('{q}')) continue;
    try {
      const u = new URL(url.split('{q}').join(QLENS_QUERY_TOKEN));
      if (u.protocol !== 'https:' && u.protocol !== 'http:') continue;
      url = u.href.split(QLENS_QUERY_TOKEN).join('{q}');
    } catch (err) {
      continue;
    }
    if (Object.prototype.hasOwnProperty.call(ENGINES, id)) continue;
    if (Object.prototype.hasOwnProperty.call(ENGINE_PREFIXES, id)) continue;
    if (RESERVED_BANGS.has(bang)) continue;
    seenIds.add(id);
    seenBangs.add(bang);
    out.push({ id, name, url, bang });
    if (out.length >= CUSTOM_ENGINE_MAX) break;
  }
  return out;
}

function getCustomEngines(settings) {
  try {
    const list = settings && Array.isArray(settings.customEngines)
      ? settings.customEngines
      : [];
    return sanitizeCustomEngines(list);
  } catch (err) {
    return [];
  }
}

function buildCustomSearchUrl(custom, query) {
  const q = String(query == null ? '' : query).trim();
  if (!q || !custom || typeof custom.url !== 'string' || !custom.url.includes('{q}')) return null;
  const tpl = custom.url.replace(/\{q\}/g, safeEncodeQuery(q));
  let url;
  try {
    url = new URL(tpl);
  } catch (err) {
    return null;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
  return url.href;
}

function parseBang(input, customEngines) {
  const trimmed = String(input == null ? '' : input).trimStart();
  if (!trimmed || trimmed.charAt(0) !== '!') return null;
  const m = /^!([A-Za-z0-9]{1,24})(?:\s+(.*))?$/.exec(trimmed);
  if (!m) return null;
  const key = m[1].toLowerCase();
  const rest = typeof m[2] === 'string' ? m[2].trimStart() : '';
  if (Array.isArray(customEngines)) {
    for (const c of customEngines) {
      if (c && typeof c.bang === 'string' && c.bang.toLowerCase() === key && typeof c.id === 'string') {
        return { type: 'engine', id: c.id, custom: true, rest };
      }
    }
  }
  if (Object.prototype.hasOwnProperty.call(OMNIBOX_ENGINE_BANGS, key)) {
    return { type: 'engine', id: OMNIBOX_ENGINE_BANGS[key], rest };
  }
  return null;
}

function parseOmniboxInput(input, customEngines) {
  const raw = String(input == null ? '' : input);
  const text = raw.trim();
  if (!text) return { engineId: null, modeId: null, query: '', url: null };
  const bang = parseBang(text, customEngines);
  if (bang) {
    return { engineId: bang.id, modeId: null, query: bang.rest, url: null };
  }
  const prefix = parsePrefix(text);
  if (prefix) {
    return { engineId: prefix.id, modeId: null, query: prefix.rest, url: null };
  }
  const site = detectSmartUrl(text);
  if (site) return { engineId: null, modeId: null, query: text, url: site };
  return { engineId: null, modeId: null, query: text, url: null };
}

function buildFallbackPopupUrl(popupUrl, selectionText) {
  const base = String(popupUrl == null ? '' : popupUrl);
  const q = typeof selectionText === 'string' ? selectionText : '';
  return base + '?q=' + safeEncodeQuery(q) + '&fallback=1';
}

const HOST_LABEL = /^[a-z0-9_\u00a1-\uffff](?:[a-z0-9_\u00a1-\uffff-]*[a-z0-9_\u00a1-\uffff])?$/i;
const HOST_TLD = /^[a-z\u00a1-\uffff]{2,}$/i;
const HOST_IPV4 = /^\d{1,3}(?:\.\d{1,3}){3}$/;

function validHostLabel(label) {
  return typeof label === 'string' && label.length > 0 && label.length <= 63 && HOST_LABEL.test(label);
}

function isNavigableHost(hostRaw) {
  const host = String(hostRaw == null ? '' : hostRaw);
  if (!host) return false;
  const lower = host.toLowerCase();
  if (lower === 'localhost' || lower.endsWith('.localhost')) return true;
  if (HOST_IPV4.test(host)) {
    return host.split('.').every((octet) => Number(octet) <= 255);
  }
  if (host.indexOf(':') !== -1) return false;
  const labels = host.split('.');
  if (labels.length < 2) return false;
  if (!labels.every(validHostLabel)) return false;
  return HOST_TLD.test(labels[labels.length - 1]);
}

function detectSmartUrl(input) {
  let text = String(input == null ? '' : input).trim();
  if (!text) return null;
  text = text.replace(/[.,!?;:]+$/, '');
  while (text.endsWith(')')) {
    const opens = (text.match(/\(/g) || []).length;
    const closes = (text.match(/\)/g) || []).length;
    if (closes > opens) text = text.slice(0, -1);
    else break;
  }
  if (!text || /\s/.test(text)) return null;
  let candidate = null;
  if (/^https?:\/\//i.test(text)) {
    candidate = text;
  } else {
    const m = /^([^:/?#]+)(?::(\d{1,5}))?(?:[/?#].*)?$/.exec(text);
    if (!m || !isNavigableHost(m[1])) return null;
    candidate = 'https://' + text;
  }
  let url;
  try {
    url = new URL(candidate);
  } catch (err) {
    return null;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
  return url.href;
}

function isSafeHttpUrl(url) {
  if (typeof url !== 'string' || !url) return false;
  try {
    const u = new URL(url);
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch (err) {
    return false;
  }
}

function bareHost(value) {
  let s = String(value == null ? '' : value).trim().toLowerCase();
  s = s.replace(/^https?:\/\//, '');
  s = s.split('/')[0];
  s = s.split('@').pop();
  s = s.split(':')[0];
  s = s.replace(/^www\./, '');
  return s;
}

function isOwnHost(url, engineId, modeId) {
  const spec = ENGINES[engineId] || ENGINES.google;
  let baseHost;
  try {
    baseHost = new URL(spec.base).hostname;
  } catch (err) {
    return false;
  }
  return Boolean(bareHost(url)) && bareHost(url) === bareHost(baseHost);
}

const LENS_UPLOAD = 'https://www.google.com/searchbyimage/upload';

QLENS.ENGINES = ENGINES;
QLENS.ENGINE_PREFIXES = ENGINE_PREFIXES;
QLENS.ENGINE_ORDER = Object.keys(ENGINES);
QLENS.OMNIBOX_ENGINE_BANGS = OMNIBOX_ENGINE_BANGS;
QLENS.RESERVED_BANGS = RESERVED_BANGS;
QLENS.buildSearchUrl = buildSearchUrl;
QLENS.safeEncodeQuery = safeEncodeQuery;
QLENS.buildCustomSearchUrl = buildCustomSearchUrl;
QLENS.isValidCustomEngine = isValidCustomEngine;
QLENS.sanitizeCustomEngines = sanitizeCustomEngines;
QLENS.getCustomEngines = getCustomEngines;
QLENS.CUSTOM_ENGINE_MAX = CUSTOM_ENGINE_MAX;
QLENS.suggestUrlFor = suggestUrlFor;
QLENS.parsePrefix = parsePrefix;
QLENS.parseBang = parseBang;
QLENS.parseOmniboxInput = parseOmniboxInput;
QLENS.buildFallbackPopupUrl = buildFallbackPopupUrl;
QLENS.detectSmartUrl = detectSmartUrl;
QLENS.isSafeHttpUrl = isSafeHttpUrl;
QLENS.bareHost = bareHost;
QLENS.isOwnHost = isOwnHost;
QLENS.LENS_UPLOAD = LENS_UPLOAD;