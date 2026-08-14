globalThis.QLENS = globalThis.QLENS || {};

const ENGINES = {
  google: {
    id: 'google',
    name: 'Google',
    base: 'https://www.google.com/',
    search: 'search?q={q}',
    suggestion: 'https://suggestqueries.google.com/complete/search?client=firefox&q={q}',
    prefix: 'g'
  },
  brave: {
    id: 'brave',
    name: 'Brave',
    base: 'https://search.brave.com/',
    search: 'search?q={q}',
    suggestion: 'https://suggestqueries.google.com/complete/search?client=firefox&q={q}',
    suggestionLabel: 'via Google',
    prefix: 'b'
  },
  bing: {
    id: 'bing',
    name: 'Bing',
    base: 'https://www.bing.com/',
    search: 'search?q={q}',
    suggestion: 'https://api.bing.com/osjson.aspx?query={q}',
    prefix: 'k'
  },
  duckduckgo: {
    id: 'duckduckgo',
    name: 'DuckDuckGo',
    base: 'https://duckduckgo.com/',
    search: '?q={q}',
    suggestion: 'https://duckduckgo.com/ac/?q={q}',
    prefix: 'd'
  }
};

const ENGINE_PREFIXES = {
  g: 'google',
  b: 'brave',
  k: 'bing',
  d: 'duckduckgo'
};

const QUICK_MODES = {
  images: {
    id: 'images',
    name: 'Images',
    prefix: 'images:',
    base: 'https://www.google.com/',
    search: 'search?tbm=isch&q={q}'
  },
  videos: {
    id: 'videos',
    name: 'Videos',
    prefix: 'videos:',
    base: 'https://www.google.com/',
    search: 'search?tbm=vid&q={q}'
  },
  news: {
    id: 'news',
    name: 'News',
    prefix: 'news:',
    base: 'https://news.google.com/',
    search: 'search?q={q}'
  },
  yt: {
    id: 'yt',
    name: 'YouTube',
    prefix: 'yt:',
    base: 'https://www.youtube.com/',
    search: 'results?search_query={q}'
  },
  wiki: {
    id: 'wiki',
    name: 'Wikipedia',
    prefix: 'wiki:',
    base: 'https://en.wikipedia.org/w/',
    search: 'index.php?search={q}'
  }
};

function buildSearchUrl(engineId, query, modeId) {
  const q = String(query == null ? '' : query).trim();
  if (!q) return null;
  const spec = (modeId && QUICK_MODES[modeId]) || ENGINES[engineId] || ENGINES.google;
  let url;
  try {
    url = new URL(spec.search.replace('{q}', encodeURIComponent(q)), spec.base);
  } catch (err) {
    return null;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
  return url.href;
}

function suggestUrlFor(engineId, query) {
  const eng = ENGINES[engineId] || ENGINES.google;
  const tpl = eng.suggestion || ENGINES.google.suggestion;
  return tpl.replace('{q}', encodeURIComponent(String(query == null ? '' : query).trim()));
}

function parsePrefix(input) {
  const trimmed = String(input == null ? '' : input).trimStart();
  if (!trimmed) return null;
  const modeKeys = Object.keys(QUICK_MODES);
  for (let i = 0; i < modeKeys.length; i++) {
    const mode = QUICK_MODES[modeKeys[i]];
    if (trimmed.startsWith(mode.prefix)) {
      return { type: 'mode', id: modeKeys[i], rest: trimmed.slice(mode.prefix.length).trimStart() };
    }
  }
  const match = /^([gbkd])\s+/.exec(trimmed);
  if (match && ENGINE_PREFIXES[match[1]]) {
    return { type: 'engine', id: ENGINE_PREFIXES[match[1]], rest: trimmed.slice(match[0].length).trimStart() };
  }
  return null;
}

function detectSmartUrl(input) {
  let text = String(input == null ? '' : input).trim();
  if (!text) return null;
  text = text.replace(/[.,!?;:)]+$/, '');
  if (!text || /\s/.test(text)) return null;
  let candidate = null;
  if (/^https?:\/\//i.test(text)) {
    candidate = text;
  } else if (/^\w+\.\w{2,}\/?/.test(text)) {
    candidate = 'https://' + text;
  }
  if (!candidate) return null;
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

QLENS.ENGINES = ENGINES;
QLENS.QUICK_MODES = QUICK_MODES;
QLENS.ENGINE_PREFIXES = ENGINE_PREFIXES;
QLENS.ENGINE_ORDER = Object.keys(ENGINES);
QLENS.buildSearchUrl = buildSearchUrl;
QLENS.suggestUrlFor = suggestUrlFor;
QLENS.parsePrefix = parsePrefix;
QLENS.detectSmartUrl = detectSmartUrl;
QLENS.isSafeHttpUrl = isSafeHttpUrl;