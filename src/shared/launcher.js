globalThis.QLENS = globalThis.QLENS || {};

function launcherDefaults() {
  const d = QLENS.CONFIG && QLENS.CONFIG.DEFAULT_SETTINGS && QLENS.CONFIG.DEFAULT_SETTINGS.launcher;
  if (d && typeof d === 'object') {
    return {
      enabled: d.enabled === true,
      tabs: d.tabs === true,
      bookmarks: d.bookmarks === true,
      history: d.history === true,
      maxResults: typeof d.maxResults === 'number' ? d.maxResults : 6
    };
  }
  return { enabled: true, tabs: true, bookmarks: true, history: false, maxResults: 6 };
}

function sanitizeLauncher(raw) {
  const d = launcherDefaults();
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    return { enabled: d.enabled, tabs: d.tabs, bookmarks: d.bookmarks, history: d.history, maxResults: d.maxResults };
  }
  const toBool = (v, dflt) => (typeof v === 'boolean' ? v : dflt);
  let max = Math.floor(Number(raw.maxResults));
  if (!Number.isFinite(max)) max = d.maxResults;
  max = Math.min(10, Math.max(3, max));
  return {
    enabled: toBool(raw.enabled, d.enabled),
    tabs: toBool(raw.tabs, d.tabs),
    bookmarks: toBool(raw.bookmarks, d.bookmarks),
    history: toBool(raw.history, d.history),
    maxResults: max
  };
}

function launcherNormUrl(url) {
  if (typeof url !== 'string' || !url) return '';
  try {
    const u = new URL(url);
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return '';
    u.hash = '';
    let s = u.href;
    if (s.endsWith('/') && u.pathname === '/' && !u.search) s = s.slice(0, -1);
    return s.toLowerCase();
  } catch (err) {
    return '';
  }
}

function launcherHost(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '').toLowerCase();
  } catch (err) {
    return '';
  }
}

const LAUNCHER_SEPARATORS = ' -_/.:,()[]|';

/* Relevance bands, strongest first. A hostname hit outranks a title hit that
   only matched mid-word: "google.com" is a real signal, "my googly search" is
   mostly noise. The band is multiplied by 1000 so the sub-points below can
   never let a weaker match overtake a stronger one. */
const LAUNCHER_TIER_TITLE_EXACT = 6;
const LAUNCHER_TIER_TITLE_PREFIX = 5;
const LAUNCHER_TIER_TITLE_BOUNDARY = 4;
const LAUNCHER_TIER_URL_HOST_PREFIX = 3;
const LAUNCHER_TIER_TITLE_SUBSTRING = 2;
const LAUNCHER_TIER_URL_ANY = 1;

/* Kind only breaks ties. Tabs stay ahead of bookmarks and bookmarks ahead of
   history for an equally good match, but a clearly better bookmark still
   earns one of the limited slots ahead of a weak tab. */
const LAUNCHER_KIND_BONUS = { tab: 34, bookmark: 17, history: 0 };
const LAUNCHER_KIND_RANK = { tab: 0, bookmark: 1, history: 2 };

function launcherRelevancePrep(title, url) {
  const t = String(title == null ? '' : title).toLowerCase().trim();
  return { t, host: launcherHost(url), path: String(url == null ? '' : url).toLowerCase() };
}

function launcherRelevance(title, url, needle, prep) {
  const q = String(needle == null ? '' : needle).toLowerCase().trim();
  if (!q) return 0;
  const fields = prep || launcherRelevancePrep(title, url);
  const t = fields.t;
  const host = fields.host;
  const path = fields.path;
  const bare = q.indexOf('www.') === 0 ? q.slice(4) : q;
  let tier = 0;
  let depth = 0;
  if (t) {
    const at = t.indexOf(q);
    if (at === 0) {
      tier = t === q ? LAUNCHER_TIER_TITLE_EXACT : LAUNCHER_TIER_TITLE_PREFIX;
    } else if (at > 0) {
      tier = LAUNCHER_SEPARATORS.indexOf(t.charAt(at - 1)) !== -1
        ? LAUNCHER_TIER_TITLE_BOUNDARY
        : LAUNCHER_TIER_TITLE_SUBSTRING;
      depth = at;
    }
  }
  if (!tier && bare) {
    const at = host.indexOf(bare);
    if (at !== -1) {
      tier = at === 0 ? LAUNCHER_TIER_URL_HOST_PREFIX : LAUNCHER_TIER_URL_ANY;
      depth = at;
    }
  }
  if (!tier) {
    const at = path.indexOf(q);
    if (at === -1) return 0;
    tier = LAUNCHER_TIER_URL_ANY;
    depth = at;
  }
  const terms = q.split(/\s+/).filter(Boolean);
  let hits = 0;
  for (const term of terms) {
    if ((t && t.indexOf(term) !== -1) || (host && host.indexOf(term) !== -1)) hits++;
  }
  const coverage = terms.length ? hits / terms.length : 1;
  const hostHit = host && bare && host.indexOf(bare) !== -1 ? 30 : 0;
  /* Short titles concentrate the match: "Google" beats a 60-character tab
     title that merely starts with the same word. */
  const lengthBonus = Math.max(0, 40 - Math.round(t.length / 6));
  return tier * 1000
    + Math.round(coverage * 60)
    + hostHit
    + lengthBonus
    - Math.min(150, depth * 4);
}

function launcherNormalize(kind, raw) {
  if (!raw || typeof raw !== 'object') return null;
  const urlStr = typeof raw.url === 'string' ? raw.url.trim() : '';
  if (!urlStr) return null;
  if (typeof QLENS.isSafeHttpUrl === 'function' && !QLENS.isSafeHttpUrl(urlStr)) return null;
  const norm = launcherNormUrl(urlStr);
  if (!norm) return null;
  const title = typeof raw.title === 'string' && raw.title.trim() ? raw.title.trim().slice(0, 200) : '';
  const item = { kind, title: title || urlStr, url: urlStr, norm };
  if (kind === 'tab') {
    if (typeof raw.tabId === 'number') item.tabId = raw.tabId;
    else if (typeof raw.id === 'number') item.tabId = raw.id;
  } else if (raw.id != null) {
    item.id = raw.id;
  }
  return item;
}

function rankLauncherResults(query, tabsArr, bookmarksArr, historyArr, opts) {
  const o = opts && typeof opts === 'object' ? opts : {};
  const includeTabs = o.tabs !== false;
  const includeBookmarks = o.bookmarks !== false;
  const includeHistory = o.history !== false;
  let max = Math.floor(Number(o.maxResults));
  if (!Number.isFinite(max)) max = 6;
  max = Math.min(10, Math.max(3, max));
  const needle = String(query == null ? '' : query).trim().toLowerCase();
  const out = [];
  const seen = new Set();

  const sources = [];
  if (includeTabs && Array.isArray(tabsArr)) sources.push(['tab', tabsArr]);
  if (includeBookmarks && Array.isArray(bookmarksArr)) sources.push(['bookmark', bookmarksArr]);
  if (includeHistory && Array.isArray(historyArr)) sources.push(['history', historyArr]);

  /* No query: keep the historical ordering (kind, then source order) so the
     "recent everything" view the overlay opens with is unchanged. */
  if (!needle) {
    for (const [kind, arr] of sources) {
      for (const raw of arr) {
        if (out.length >= max) break;
        const item = launcherNormalize(kind, raw);
        if (!item || seen.has(item.norm)) continue;
        seen.add(item.norm);
        const picked = { kind: item.kind, title: item.title, url: item.url };
        if (typeof item.tabId === 'number') picked.tabId = item.tabId;
        if (item.id != null) picked.id = item.id;
        out.push(picked);
      }
    }
    return out;
  }

  /* With a query: score every candidate first and only then take the top N,
     so relevance decides who makes the cut instead of enumeration order. */
  const candidates = [];
  const prepCache = new Map();
  let order = 0;
  for (const [kind, arr] of sources) {
    for (const raw of arr) {
      if (candidates.length >= 100) break;
      const item = launcherNormalize(kind, raw);
      if (!item) continue;
      let prep = prepCache.get(item.norm);
      if (!prep) {
        prep = launcherRelevancePrep(item.title, item.url);
        prepCache.set(item.norm, prep);
      }
      const relevance = launcherRelevance(item.title, item.url, needle, prep);
      if (relevance <= 0) continue;
      item.score = relevance + (LAUNCHER_KIND_BONUS[kind] || 0);
      item.kindRank = LAUNCHER_KIND_RANK[kind];
      item.order = order++;
      candidates.push(item);
    }
  }
  candidates.sort((a, b) => (b.score - a.score) || (a.kindRank - b.kindRank) || (a.order - b.order));
  for (const item of candidates) {
    if (out.length >= max) break;
    if (seen.has(item.norm)) continue;
    seen.add(item.norm);
    const picked = { kind: item.kind, title: item.title, url: item.url };
    if (typeof item.tabId === 'number') picked.tabId = item.tabId;
    if (item.id != null) picked.id = item.id;
    out.push(picked);
  }
  return out;
}

QLENS.sanitizeLauncher = sanitizeLauncher;
QLENS.rankLauncherResults = rankLauncherResults;
QLENS.launcherRelevance = launcherRelevance;
