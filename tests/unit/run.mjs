import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import assert from 'node:assert/strict';
import vm from 'node:vm';

const ROOT = decodeURIComponent(new URL('../..', import.meta.url).pathname).replace(/^\/([A-Za-z]:)\//, '$1/');
const results = { pass: 0, fail: 0, failures: [] };
const textDecoder = new TextDecoder();

function loadScript(relPath) {
  const code = readFileSync(join(ROOT, relPath), 'utf8');
  vm.compileFunction(code, [], { filename: relPath })();
}

function loadWithChromeStub(relPath, storageData) {
  const backing = new Map(Object.entries(storageData || {}));
  const storageArea = {
    async get(keys) {
      if (keys == null) return Object.fromEntries(backing);
      const list = typeof keys === 'string' ? [keys] : Array.isArray(keys) ? keys : Object.keys(keys);
      const out = {};
      for (const k of list) if (backing.has(k)) out[k] = backing.get(k);
      return out;
    },
    async set(items) {
      for (const [k, v] of Object.entries(items)) backing.set(k, v);
    },
    async remove(keys) {
      const list = typeof keys === 'string' ? [keys] : keys;
      for (const k of list) backing.delete(k);
    },
    backing
  };
  globalThis.chrome = {
    storage: { local: storageArea, sync: storageArea },
    runtime: { id: 'test-extension-id' }
  };
  loadScript(relPath);
  return storageArea;
}

function test(name, fn) {
  try {
    fn();
    results.pass++;
    console.log('PASS ' + name);
  } catch (err) {
    results.fail++;
    results.failures.push({ name, err });
    console.log('FAIL ' + name);
    console.log('     ' + String(err.message).split('\n').join('\n     '));
  }
}

async function testAsync(name, fn) {
  try {
    await fn();
    results.pass++;
    console.log('PASS ' + name);
  } catch (err) {
    results.fail++;
    results.failures.push({ name, err });
    console.log('FAIL ' + name);
    console.log('     ' + String(err.message).split('\n').join('\n     '));
  }
}

loadScript('src/shared/config.js');
loadScript('src/shared/messaging.js');
loadScript('src/shared/engines.js');
loadScript('src/shared/launcher.js');
loadScript('src/shared/async.js');
const Q = globalThis.QLENS;

test('engines: google url', () => {
  assert.equal(Q.buildSearchUrl('google', 'cats'), 'https://www.google.com/search?q=cats');
});
test('engines: brave url', () => {
  assert.equal(Q.buildSearchUrl('brave', 'cats'), 'https://search.brave.com/search?q=cats');
});
test('engines: bing url', () => {
  assert.equal(Q.buildSearchUrl('bing', 'cats'), 'https://www.bing.com/search?q=cats');
});
test('engines: ddg url', () => {
  assert.equal(Q.buildSearchUrl('duckduckgo', 'cats'), 'https://duckduckgo.com/?q=cats');
});
test('engines: encodeURIComponent everywhere', () => {
  assert.equal(
    Q.buildSearchUrl('google', 'a&b c+d "q" é😀'),
    'https://www.google.com/search?q=a%26b%20c%2Bd%20%22q%22%20%C3%A9%F0%9F%98%80'
  );
});
test('engines: modeId is inert (quick modes were removed)', () => {
  // buildSearchUrl keeps the modeId slot in its signature for call-site
  // stability, but no mode table exists anymore — the flag is ignored.
  assert.equal(Q.buildSearchUrl('google', 'cats', 'images'), 'https://www.google.com/search?q=cats');
  assert.equal(Q.buildSearchUrl('google', 'cats', 'bogusmode'), 'https://www.google.com/search?q=cats');
});
test('engines: empty query returns null', () => {
  assert.equal(Q.buildSearchUrl('google', '   '), null);
  assert.equal(Q.buildSearchUrl('google', ''), null);
  assert.equal(Q.buildSearchUrl('google', null), null);
});
test('engines: ai flag uses Google AI Mode URL', () => {
  assert.equal(
    Q.buildSearchUrl('google', 'cats', null, true),
    'https://www.google.com/search?q=cats&udm=50&ntc=1&cs=0&atvm=2&zs=1'
  );
});
test('engines: ai flag ignored off google', () => {
  assert.equal(
    Q.buildSearchUrl('brave', 'cats', null, true),
    'https://search.brave.com/search?q=cats'
  );
  assert.equal(
    Q.buildSearchUrl('bing', 'cats', null, true),
    'https://www.bing.com/search?q=cats'
  );
});
test('engines: ai still wins when a stale modeId is passed', () => {
  assert.equal(
    Q.buildSearchUrl('google', 'cats', 'images', true),
    'https://www.google.com/search?q=cats&udm=50&ntc=1&cs=0&atvm=2&zs=1'
  );
});
test('engines: ai empty query still null', () => {
  assert.equal(Q.buildSearchUrl('google', '', null, true), null);
});
test('engines: bogus engine with ai falls back to google ai', () => {
  assert.equal(
    Q.buildSearchUrl('bogus', 'x', null, true),
    'https://www.google.com/search?q=x&udm=50&ntc=1&cs=0&atvm=2&zs=1'
  );
});
test('engines: unknown engine falls back to default', () => {
  assert.equal(Q.buildSearchUrl('bogus', 'x'), 'https://www.google.com/search?q=x');
});
test('engines: bogus mode falls back to engine search', () => {
  assert.equal(Q.buildSearchUrl('google', 'x', 'bogusmode'), 'https://www.google.com/search?q=x');
});
test('engines: colon prefixes are plain text, not modes', () => {
  // "images: cats" used to be a quick mode. No mode table ships any more, so
  // parsePrefix must not claim it and must leave the text alone.
  assert.equal(Q.parsePrefix('images: cats'), null);
  assert.equal(Q.parsePrefix('wiki:cats'), null);
  assert.equal(Q.parsePrefix('yt: flutter'), null);
});
test('engines: suggest urls always google', () => {
  assert.equal(Q.suggestUrlFor('google', 'c'), 'https://suggestqueries.google.com/complete/search?client=firefox&q=c');
  assert.equal(Q.suggestUrlFor('brave', 'c'), 'https://suggestqueries.google.com/complete/search?client=firefox&q=c');
  assert.equal(Q.suggestUrlFor('bing', 'c'), 'https://suggestqueries.google.com/complete/search?client=firefox&q=c');
  assert.equal(Q.suggestUrlFor('duckduckgo', 'c'), 'https://suggestqueries.google.com/complete/search?client=firefox&q=c');
  assert.equal(Q.suggestUrlFor('bogus', 'c'), 'https://suggestqueries.google.com/complete/search?client=firefox&q=c');
});
test('engines: prefix parse engine', () => {
  assert.deepEqual(Q.parsePrefix('b cats'), { type: 'engine', id: 'brave', rest: 'cats' });
  assert.deepEqual(Q.parsePrefix('k cats'), { type: 'engine', id: 'bing', rest: 'cats' });
  assert.deepEqual(Q.parsePrefix('d cats'), { type: 'engine', id: 'duckduckgo', rest: 'cats' });
  assert.deepEqual(Q.parsePrefix('g cats'), { type: 'engine', id: 'google', rest: 'cats' });
});
test('engines: prefix parse modes', () => {
  assert.deepEqual(Q.parsePrefix('b cats'), { type: 'engine', id: 'brave', rest: 'cats' });
  assert.deepEqual(Q.parsePrefix('  g  cats'), { type: 'engine', id: 'google', rest: 'cats' });
  assert.equal(Q.parsePrefix('cats'), null);
  assert.equal(Q.parsePrefix(''), null);
});
test('omnibox: plain query defaults, engine prefix routes', () => {
  assert.deepEqual(Q.parseOmniboxInput('cats'), { engineId: null, modeId: null, query: 'cats', url: null });
  assert.deepEqual(Q.parseOmniboxInput('g cats'), { engineId: 'google', modeId: null, query: 'cats', url: null });
});
test('omnibox: bang routes engine when parseBang exists', () => {
  if (typeof Q.parseBang !== 'function') return;
  assert.deepEqual(Q.parseBang('!gh hooks'), null);
  const parsed = Q.parseOmniboxInput('!gh hooks');
  assert.deepEqual(parsed, { engineId: null, modeId: null, query: '!gh hooks', url: null });
});
test('custom engines: sanitize keeps valid, drops bad/dupes/caps', () => {
  const list = Q.sanitizeCustomEngines([
    { id: 'kagi', name: 'Kagi', url: 'https://kagi.com/search?q={q}', bang: 'kagi' },
    { id: 'gh', name: 'GitHub', url: 'https://github.com/search?q={q}', bang: 'gh' },
    { id: 'local', name: 'Dev', url: 'http://localhost:3000/search?q={q}', bang: 'dev' },
    { id: 'bad1', name: 'x'.repeat(50), url: 'https://ok.com/?q={q}', bang: 'ok1' },
    { id: 'bad2', name: 'NoQ', url: 'https://ok.com/', bang: 'ok2' },
    { id: 'bad3', name: 'JS', url: 'javascript:alert({q})', bang: 'ok3' },
    { id: 'google', name: 'Clash', url: 'https://ok.com/?q={q}', bang: 'ok4' },
    { id: 'kagi', name: 'DupeId', url: 'https://ok.com/?q={q}', bang: 'ok5' },
    { id: 'ok6', name: 'DupeBang', url: 'https://ok.com/?q={q}', bang: 'kagi' },
    null,
    'nope'
  ]);
  assert.equal(list.length, 4);
  assert.deepEqual(list[0], { id: 'kagi', name: 'Kagi', url: 'https://kagi.com/search?q={q}', bang: 'kagi' });
  assert.equal(list[3].name.length <= 40, true);
  assert.deepEqual(Q.sanitizeCustomEngines('nope'), []);
  assert.deepEqual(Q.sanitizeCustomEngines(null), []);
});
test('custom engines: isValid flags reserved + malformed', () => {
  assert.equal(Q.isValidCustomEngine({ id: 'kagi', name: 'Kagi', url: 'https://kagi.com/search?q={q}', bang: 'kagi' }), true);
  assert.equal(Q.isValidCustomEngine({ id: 'google', name: 'X', url: 'https://ok.com/?q={q}', bang: 'x1' }), false);
  assert.equal(Q.isValidCustomEngine({ id: 'x2', name: 'X', url: 'https://ok.com/?q={q}', bang: 'g' }), false);
  assert.equal(Q.isValidCustomEngine({ id: 'x3', name: 'X', url: 'https://ok.com/', bang: 'x3' }), false);
  assert.equal(Q.isValidCustomEngine({ id: 'x4', name: '', url: 'https://ok.com/?q={q}', bang: 'x4' }), false);
  assert.equal(Q.isValidCustomEngine({ id: 'has space', name: 'X', url: 'https://ok.com/?q={q}', bang: 'x5' }), false);
});
test('custom engines: buildSearchUrl routes custom id + encodes', () => {
  const customs = Q.sanitizeCustomEngines([
    { id: 'kagi', name: 'Kagi', url: 'https://kagi.com/search?q={q}', bang: 'kagi' },
    { id: 'local', name: 'Dev', url: 'http://localhost:3000/search?q={q}', bang: 'dev' }
  ]);
  assert.equal(Q.buildSearchUrl('kagi', 'cats & dogs', null, false, customs), 'https://kagi.com/search?q=cats%20%26%20dogs');
  assert.equal(Q.buildSearchUrl('local', 'x', null, false, customs), 'http://localhost:3000/search?q=x');
  assert.equal(Q.buildSearchUrl('kagi', '   ', null, false, customs), null);
  assert.equal(Q.buildSearchUrl('google', 'cats', null, false, customs), 'https://www.google.com/search?q=cats');
  assert.equal(Q.buildSearchUrl('unknown', 'cats', null, false, customs), 'https://www.google.com/search?q=cats');
});
test('custom engines: buildCustomSearchUrl multi-{q} + rejects non-http', () => {
  assert.equal(
    Q.buildCustomSearchUrl({ id: 'a', name: 'A', url: 'https://ok.com/?a={q}&b={q}', bang: 'a' }, 'x y'),
    'https://ok.com/?a=x%20y&b=x%20y'
  );
  assert.equal(Q.buildCustomSearchUrl({ id: 'b', name: 'B', url: 'javascript:alert({q})', bang: 'b' }, 'x'), null);
  assert.equal(Q.buildCustomSearchUrl({ id: 'c', name: 'C', url: 'https://ok.com/', bang: 'c' }, 'x'), null);
  assert.equal(Q.buildCustomSearchUrl(null, 'x'), null);
});
test('custom engines: parseBang hits customs first, builtins intact', () => {
  const customs = Q.sanitizeCustomEngines([
    { id: 'kagi', name: 'Kagi', url: 'https://kagi.com/search?q={q}', bang: 'kagi' },
    { id: 'gh', name: 'GitHub', url: 'https://github.com/search?q={q}', bang: 'gh' }
  ]);
  assert.deepEqual(Q.parseBang('!kagi fast search', customs), { type: 'engine', id: 'kagi', custom: true, rest: 'fast search' });
  assert.deepEqual(Q.parseBang('!gh react hooks', customs), { type: 'engine', id: 'gh', custom: true, rest: 'react hooks' });
  assert.deepEqual(Q.parseBang('!g cats', []), { type: 'engine', id: 'google', rest: 'cats' });
  assert.equal(Q.parseBang('!w cats', []), null, 'wiki quick mode removed — !w is unreserved');
  assert.equal(Q.parseBang('!nope cats', customs), null);
  assert.equal(Q.parseBang('cats', customs), null);
  assert.equal(Q.parseBang('!gh hooks'), null);
});
test('custom engines: parseOmniboxInput accepts custom list', () => {
  const customs = Q.sanitizeCustomEngines([
    { id: 'notion', name: 'Notion', url: 'https://notion.so/search?q={q}', bang: 'notion' }
  ]);
  assert.deepEqual(
    Q.parseOmniboxInput('!notion meeting notes', customs),
    { engineId: 'notion', modeId: null, query: 'meeting notes', url: null }
  );
  const built = Q.buildSearchUrl('notion', 'meeting notes', null, false, customs);
  assert.equal(built, 'https://notion.so/search?q=meeting%20notes');
});
test('omnibox: colon text is not a mode', () => {
  assert.deepEqual(Q.parseOmniboxInput('images: cats'), { engineId: null, modeId: null, query: 'images: cats', url: null });
});
test('omnibox: plain query builds default search url', () => {
  const parsed = Q.parseOmniboxInput('hello world');
  assert.equal(parsed.query, 'hello world');
  assert.equal(Q.buildSearchUrl('google', parsed.query), 'https://www.google.com/search?q=hello%20world');
});
test('omnibox: mode query ignores the removed mode table', () => {
  const parsed = Q.parseOmniboxInput('images: cats');
  assert.equal(parsed.modeId, null);
  assert.equal(Q.buildSearchUrl('google', parsed.query, parsed.modeId), 'https://www.google.com/search?q=images%3A%20cats');
});
test('omnibox: smart url detected for direct open', () => {
  const parsed = Q.parseOmniboxInput('github.com/foo');
  assert.equal(parsed.url, 'https://github.com/foo');
  assert.ok(Q.isSafeHttpUrl(parsed.url));
});
test('omnibox: dangerous input never yields safe url', () => {
  const parsed = Q.parseOmniboxInput('javascript:alert(1)');
  assert.equal(parsed.url, null);
  assert.equal(Q.buildSearchUrl('google', ''), null);
});
test('popup: fallback search resolves full query language', () => {
  // Mirrors popup doSearch(): parseOmniboxInput decides bang/prefix/mode/url,
  // buildSearchUrl renders the final URL. Popup only glues the two together.
  const customs = Q.sanitizeCustomEngines([
    { id: 'kagi', name: 'Kagi', url: 'https://kagi.com/search?q={q}', bang: 'kagi' }
  ]);
  const cases = [
    ['!kagi fast search', 'https://kagi.com/search?q=fast%20search'],
    ['g cats', 'https://www.google.com/search?q=cats'],
    ['d cats', 'https://duckduckgo.com/?q=cats'],
    ['!g cats', 'https://www.google.com/search?q=cats'],
    ['hello world', 'https://www.google.com/search?q=hello%20world']
  ];
  for (const [raw, expected] of cases) {
    const p = Q.parseOmniboxInput(raw, customs);
    assert.equal(Q.buildSearchUrl(p.engineId || 'google', p.query, p.modeId, false, customs), expected, raw);
  }
  assert.equal(Q.parseOmniboxInput('github.com/foo', customs).url, 'https://github.com/foo');
  assert.equal(Q.parseOmniboxInput('javascript:alert(1)', customs).url, null);
  assert.equal(Q.parseBang('!nope cats', customs), null);
});
test('omnibox: fallback popup url builder encodes selection', () => {
  assert.equal(
    Q.buildFallbackPopupUrl('chrome-extension://id/src/popup/popup.html', 'hello & world'),
    'chrome-extension://id/src/popup/popup.html?q=hello%20%26%20world&fallback=1'
  );
  assert.equal(
    Q.buildFallbackPopupUrl('chrome-extension://id/src/popup/popup.html', ''),
    'chrome-extension://id/src/popup/popup.html?q=&fallback=1'
  );
});
test('engines: prefix negative cases', () => {
  assert.equal(Q.parsePrefix('cats'), null);
  assert.equal(Q.parsePrefix('b'), null);
  assert.equal(Q.parsePrefix('foo b cats'), null);
  assert.equal(Q.parsePrefix(''), null);
});
test('engines: smart url detection', () => {
  assert.equal(Q.detectSmartUrl('github.com/foo'), 'https://github.com/foo');
  assert.equal(Q.detectSmartUrl('https://x.com/a?b=1'), 'https://x.com/a?b=1');
  assert.equal(Q.detectSmartUrl('example.com.'), 'https://example.com/');
  assert.equal(Q.detectSmartUrl('news.ycombinator.com'), 'https://news.ycombinator.com/');
});
test('engines: smart url rejects dangerous/garbage input', () => {
  assert.equal(Q.detectSmartUrl('javascript:alert(1)'), null);
  assert.equal(Q.detectSmartUrl('data:text/html,x'), null);
  assert.equal(Q.detectSmartUrl('github.com/foo bar'), null);
  assert.equal(Q.detectSmartUrl('hello world'), null);
  assert.equal(Q.detectSmartUrl(''), null);
});
test('engines: smart url accepts hyphenated labels', () => {
  assert.equal(Q.detectSmartUrl('stack-overflow.com'), 'https://stack-overflow.com/');
  assert.equal(Q.detectSmartUrl('my-site.co.uk'), 'https://my-site.co.uk/');
  assert.equal(Q.detectSmartUrl('web-dev.example.com/a'), 'https://web-dev.example.com/a');
  assert.equal(Q.detectSmartUrl('a-b.io'), 'https://a-b.io/');
  assert.equal(Q.detectSmartUrl('-bad.com'), null);
  assert.equal(Q.detectSmartUrl('bad-.com'), null);
  assert.equal(Q.detectSmartUrl('a'.repeat(64) + '.com'), null);
});
test('engines: smart url accepts localhost and ipv4', () => {
  assert.equal(Q.detectSmartUrl('localhost'), 'https://localhost/');
  assert.equal(Q.detectSmartUrl('localhost:3000'), 'https://localhost:3000/');
  assert.equal(Q.detectSmartUrl('app.localhost:5173/x'), 'https://app.localhost:5173/x');
  assert.equal(Q.detectSmartUrl('127.0.0.1'), 'https://127.0.0.1/');
  assert.equal(Q.detectSmartUrl('192.168.1.1'), 'https://192.168.1.1/');
  assert.equal(Q.detectSmartUrl('256.1.1.1'), null);
  assert.equal(Q.detectSmartUrl('1.2.3.4.5'), null);
});
test('engines: smart url accepts idn and explicit ports', () => {
  assert.equal(Q.detectSmartUrl('example.com:8080'), 'https://example.com:8080/');
  assert.equal(Q.detectSmartUrl('münchen.de'), 'https://xn--mnchen-3ya.de/');
  assert.equal(Q.detectSmartUrl('例え.jp'), 'https://xn--r8jz45g.jp/');
});
test('engines: smart url still rejects prose and single labels', () => {
  assert.equal(Q.detectSmartUrl('hello'), null);
  assert.equal(Q.detectSmartUrl('com'), null);
  assert.equal(Q.detectSmartUrl('3.5'), null);
  assert.equal(Q.detectSmartUrl('9.9'), null);
  assert.equal(Q.detectSmartUrl('U.S.A'), null);
  assert.equal(Q.detectSmartUrl('mailto:x@y.com'), null);
  assert.equal(Q.detectSmartUrl('file:///etc/passwd'), null);
  assert.equal(Q.detectSmartUrl('ftp://x.com'), null);
  assert.equal(Q.detectSmartUrl('.com'), null);
  assert.equal(Q.detectSmartUrl('.'), null);
});
test('engines: isSafeHttpUrl allowlist', () => {
  assert.equal(Q.isSafeHttpUrl('https://ok.com'), true);
  assert.equal(Q.isSafeHttpUrl('http://ok.com'), true);
  assert.equal(Q.isSafeHttpUrl('javascript:alert(1)'), false);
  assert.equal(Q.isSafeHttpUrl('data:text/html,x'), false);
  assert.equal(Q.isSafeHttpUrl('chrome://extensions'), false);
  assert.equal(Q.isSafeHttpUrl('not a url'), false);
  assert.equal(Q.isSafeHttpUrl(null), false);
});
test('engines: bareHost normalizes scheme/www/path', () => {
  assert.equal(Q.bareHost('www.google.com'), 'google.com');
  assert.equal(Q.bareHost('https://www.google.com/'), 'google.com');
  assert.equal(Q.bareHost('www.google.com/search?q=x'), 'google.com');
  assert.equal(Q.bareHost('google.com '), 'google.com');
  assert.equal(Q.bareHost('SearchText'), 'searchtext');
  assert.equal(Q.bareHost(''), '');
  assert.equal(Q.bareHost(null), '');
});
test('engines: isOwnHost matches engine surface only', () => {
  assert.equal(Q.isOwnHost('https://www.google.com/', 'google'), true);
  assert.equal(Q.isOwnHost('www.google.com', 'google'), true);
  assert.equal(Q.isOwnHost('https://www.google.com/search', 'google', 'images'), true);
  assert.equal(Q.isOwnHost('https://duckduckgo.com/', 'duckduckgo'), true);
  assert.equal(Q.isOwnHost('https://www.google.com/', 'brave'), false);
  assert.equal(Q.isOwnHost('https://github.com/', 'google'), false);
  assert.equal(Q.isOwnHost('not a url', 'google'), false);
});
test('lens: endpoint constant', () => {
  assert.equal(Q.LENS_UPLOAD, 'https://www.google.com/searchbyimage/upload');
});
loadScript('src/shared/image.js');
test('image: sniff detects avif brand', () => {
  const avif = new Uint8Array([0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70, 0x61, 0x76, 0x69, 0x66, 0x00, 0x00, 0x00, 0x00]);
  assert.equal(Q.ImageEngine.sniffMime(avif), 'image/avif');
  const avis = new Uint8Array([0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70, 0x61, 0x76, 0x69, 0x73, 0x00, 0x00, 0x00, 0x00]);
  assert.equal(Q.ImageEngine.sniffMime(avis), 'image/avif');
});
test('image: sniff detects heic/heif brands', () => {
  const heic = new Uint8Array([0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x68, 0x65, 0x69, 0x63, 0x00, 0x00, 0x00, 0x00]);
  assert.equal(Q.ImageEngine.sniffMime(heic), 'image/heic');
  const mif1 = new Uint8Array([0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x6d, 0x69, 0x66, 0x31, 0x00, 0x00, 0x00, 0x00]);
  assert.equal(Q.ImageEngine.sniffMime(mif1), 'image/heic');
  const isobmff = new Uint8Array([0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d, 0x00, 0x00, 0x00, 0x00]);
  assert.equal(Q.ImageEngine.sniffMime(isobmff), null);
});
test('image: sniff detects svg markup', () => {
  const enc = new TextEncoder();
  assert.equal(Q.ImageEngine.sniffMime(enc.encode('<svg xmlns="http://www.w3.org/2000/svg"></svg>')), 'image/svg+xml');
  assert.equal(Q.ImageEngine.sniffMime(enc.encode('  \n<svg width="10"></svg>')), 'image/svg+xml');
  assert.equal(Q.ImageEngine.sniffMime(enc.encode('<?xml version="1.0"?><svg></svg>')), 'image/svg+xml');
  assert.equal(Q.ImageEngine.sniffMime(enc.encode('<html><body>hi</body></html>')), null);
});
test('image: sniff keeps old detections + guards input', () => {
  assert.equal(Q.ImageEngine.sniffMime(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])), 'image/png');
  assert.equal(Q.ImageEngine.sniffMime(new Uint8Array([0xff, 0xd8, 0xff, 0xe0])), 'image/jpeg');
  assert.equal(Q.ImageEngine.sniffMime(new Uint8Array([0x47, 0x49, 0x46, 0x38])), 'image/gif');
  assert.equal(Q.ImageEngine.sniffMime(null), null);
  assert.equal(Q.ImageEngine.sniffMime('png'), null);
  assert.equal(Q.ImageEngine.sniffMime(new Uint8Array(0)), null);
  assert.equal(Q.ImageEngine.sniffMime(new Uint8Array([1, 2, 3, 4])), null);
});
test('image: validate accepts avif/heic/svg', () => {
  const avif = new Uint8Array([0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70, 0x61, 0x76, 0x69, 0x66, 0x00]);
  assert.deepEqual(Q.ImageEngine.validateImageBytes(avif, 'image/avif'), { ok: true, mime: 'image/avif' });
  const heic = new Uint8Array([0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x68, 0x65, 0x69, 0x63, 0x00]);
  assert.deepEqual(Q.ImageEngine.validateImageBytes(heic, 'image/heic'), { ok: true, mime: 'image/heic' });
  const svg = new TextEncoder().encode('<svg></svg>');
  assert.deepEqual(Q.ImageEngine.validateImageBytes(svg, 'image/svg+xml'), { ok: true, mime: 'image/svg+xml' });
});
test('image: validate still rejects garbage/empty/oversize', () => {
  assert.equal(Q.ImageEngine.validateImageBytes(new Uint8Array([1, 2, 3, 4]), 'text/plain').ok, false);
  assert.equal(Q.ImageEngine.validateImageBytes(new Uint8Array(0), 'image/png').ok, false);
  assert.equal(Q.ImageEngine.validateImageBytes(null, 'image/png').ok, false);
  const prev = Q.CONFIG.IMAGE_MAX_BYTES;
  Q.CONFIG.IMAGE_MAX_BYTES = 10;
  try {
    const big = new Uint8Array(11);
    big[0] = 0x89; big[1] = 0x50; big[2] = 0x4e; big[3] = 0x47;
    const r = Q.ImageEngine.validateImageBytes(big, 'image/png');
    assert.equal(r.ok, false);
    assert.ok(r.error.includes('too large'));
  } finally {
    Q.CONFIG.IMAGE_MAX_BYTES = prev;
  }
});
test('image: filename ext mapping for new mimes', () => {
  assert.ok(Q.ImageEngine.buildLensFilename('photo.png', 'image/avif').endsWith('.avif'));
  assert.ok(Q.ImageEngine.buildLensFilename('photo.jpg', 'image/heic').endsWith('.heic'));
  assert.ok(Q.ImageEngine.buildLensFilename('icon.svg', 'image/svg+xml').endsWith('.png'));
  assert.ok(Q.ImageEngine.buildLensFilename('a.gif', 'image/gif').endsWith('.gif'));
  assert.ok(Q.ImageEngine.buildLensFilename('a.bmp', 'image/webp').endsWith('.webp'));
  assert.ok(Q.ImageEngine.buildLensFilename('a.bmp', 'image/bmp').endsWith('.bmp'));
  assert.ok(Q.ImageEngine.buildLensFilename('a.ico', 'image/x-icon').endsWith('.png'));
  assert.ok(Q.ImageEngine.buildLensFilename('a.png', 'image/png').endsWith('.png'));
  assert.ok(Q.ImageEngine.buildLensFilename('a.tiff', 'image/tiff').endsWith('.jpg'));
});
test('image: fnv1a32 determinism + shape', () => {
  const a = new TextEncoder().encode('hello qlens');
  const b = new TextEncoder().encode('hello qlens!');
  const h1 = Q.ImageEngine.fnv1a32(a);
  assert.ok(/^[0-9a-f]{8}$/.test(h1), '8-char lowercase hex, got ' + h1);
  assert.equal(Q.ImageEngine.fnv1a32(a), h1);
  assert.notEqual(Q.ImageEngine.fnv1a32(b), h1);
  assert.equal(Q.ImageEngine.fnv1a32(new TextEncoder().encode('a')), 'e40c292c');
  assert.equal(Q.ImageEngine.fnv1a32(null), '');
  assert.equal(Q.ImageEngine.fnv1a32('abc'), '');
  assert.equal(Q.ImageEngine.fnv1a32(new Uint8Array(0)), '');
});
test('image: pickPasteImage finds image file, ignores text', () => {
  const img = { type: 'image/png', name: 'shot.png' };
  const txt = { type: 'text/plain', name: '' };
  const like = (f) => f === img;
  assert.equal(Q.ImageEngine.pickPasteImage([{ kind: 'file', type: 'image/png', file: img }], like), img);
  assert.equal(Q.ImageEngine.pickPasteImage([{ kind: 'string', type: 'text/plain', file: null }], like), null);
  // typeless file next to text = text paste, not image paste
  assert.equal(
    Q.ImageEngine.pickPasteImage([{ kind: 'file', type: '', file: txt }, { kind: 'string', type: 'text/plain', file: null }], () => false),
    null
  );
  // typeless file alone = attach (browser omitted the type)
  assert.equal(
    Q.ImageEngine.pickPasteImage([{ kind: 'file', type: '', file: img }], () => false),
    img
  );
});
test('image: pickPasteImage survives hostile clipboard shapes', () => {
  const like = () => { throw new Error('nope'); };
  assert.equal(Q.ImageEngine.pickPasteImage(null, like), null);
  assert.equal(Q.ImageEngine.pickPasteImage('nope', like), null);
  assert.equal(Q.ImageEngine.pickPasteImage([null, undefined, 42, { kind: 'file', type: 'image/png', file: null }], like), null);
  assert.equal(Q.ImageEngine.pickPasteImage([{ kind: 'file' }], like), null);
  const img = { type: '', name: 'a.png' };
  assert.equal(Q.ImageEngine.pickPasteImage([{ kind: 'file', type: null, file: img }], like), img);
  assert.equal(Q.ImageEngine.pickPasteImage([{ get kind() { throw new Error('x'); } }], like), null);
});
test('image: resizeDims math', () => {
  assert.deepEqual(Q.ImageEngine.resizeDims(4000, 3000, 1600), { width: 1600, height: 1200, scale: 0.4 });
  assert.deepEqual(Q.ImageEngine.resizeDims(800, 600, 1600), { width: 800, height: 600, scale: 1 });
  assert.deepEqual(Q.ImageEngine.resizeDims(0, 100, 1600), { width: 0, height: 0, scale: 0 });
  assert.deepEqual(Q.ImageEngine.resizeDims('x', 100, 1600), { width: 0, height: 0, scale: 0 });
  assert.deepEqual(Q.ImageEngine.resizeDims(3200, 2000, 'bad'), { width: 1600, height: 1000, scale: 0.5 });
  assert.equal(Q.ImageEngine.pickEncodeMime(), 'image/webp');
});
test('launcher: sanitize defaults + clamp', () => {
  assert.deepEqual(Q.sanitizeLauncher({}), { enabled: true, tabs: true, bookmarks: true, history: false, maxResults: 6 });
  assert.deepEqual(Q.sanitizeLauncher(null), { enabled: true, tabs: true, bookmarks: true, history: false, maxResults: 6 });
  assert.equal(Q.sanitizeLauncher({ maxResults: 99 }).maxResults, 10);
  assert.equal(Q.sanitizeLauncher({ maxResults: 1 }).maxResults, 3);
  assert.equal(Q.sanitizeLauncher({ maxResults: 'bad' }).maxResults, 6);
  assert.equal(Q.sanitizeLauncher({ enabled: 'yes' }).enabled, true);
  assert.equal(Q.sanitizeLauncher({ tabs: false }).tabs, false);
  assert.equal(Q.sanitizeLauncher({ history: 0 }).history, false);
});
test('launcher: rank tabs first then bookmarks then history', () => {
  const tabs = [{ title: 'MDN', url: 'https://developer.mozilla.org', tabId: 7 }];
  const bms = [{ title: 'MDN guide', url: 'https://developer.mozilla.org/guide', id: 'b1' }];
  const hist = [{ title: 'MDN old', url: 'https://developer.mozilla.org/old', id: 'h1' }];
  const r = Q.rankLauncherResults('', tabs, bms, hist, { maxResults: 6 });
  assert.deepEqual(r.map((x) => x.kind), ['tab', 'bookmark', 'history']);
  assert.equal(r[0].tabId, 7);
});
test('launcher: dedupe by URL across kinds', () => {
  const tabs = [{ title: 'GitHub', url: 'https://github.com', tabId: 1 }];
  const bms = [{ title: 'GitHub', url: 'https://github.com/', id: 'b1' }];
  const r = Q.rankLauncherResults('', tabs, bms, [], { maxResults: 6 });
  assert.equal(r.length, 1);
  assert.equal(r[0].kind, 'tab');
});
test('launcher: query filters title+url case-insensitively', () => {
  const tabs = [{ title: 'GitHub', url: 'https://github.com', tabId: 1 }];
  const bms = [{ title: 'MDN Web Docs', url: 'https://developer.mozilla.org', id: 'b1' }];
  const r = Q.rankLauncherResults('mdn', tabs, bms, [], { maxResults: 6 });
  assert.equal(r.length, 1);
  assert.equal(r[0].kind, 'bookmark');
  const r2 = Q.rankLauncherResults('GITHUB', tabs, bms, [], { maxResults: 6 });
  assert.equal(r2.length, 1);
  assert.equal(r2[0].kind, 'tab');
});
test('launcher: unsafe urls dropped + toggles + cap respected', () => {
  const tabs = [{ title: 'Evil', url: 'javascript:alert(1)', tabId: 2 }];
  const bms = [{ title: 'A', url: 'https://a.com', id: 'b1' }, { title: 'B', url: 'https://b.com', id: 'b2' }, { title: 'C', url: 'https://c.com', id: 'b3' }];
  const r = Q.rankLauncherResults('', tabs, bms, [], { maxResults: 6 });
  assert.ok(r.every((x) => x.url.startsWith('https://')));
  assert.equal(Q.rankLauncherResults('', tabs, bms, [], { maxResults: 3 }).length, 3);
  assert.equal(Q.rankLauncherResults('', [], bms, [], { bookmarks: false, maxResults: 6 }).length, 0);
  assert.equal(Q.rankLauncherResults('', [{ title: 'T', url: 'https://t.com', tabId: 1 }], [], [], { tabs: false, maxResults: 6 }).length, 0);
});
test('launcher: relevance bands order exact > prefix > word > host > mid-word > path', () => {
  const exact = Q.launcherRelevance('google', 'https://google.com/x', 'google');
  const prefix = Q.launcherRelevance('google maps', 'https://gmaps.io', 'google');
  const word = Q.launcherRelevance('my google account', 'https://a.io', 'google');
  const host = Q.launcherRelevance('Unrelated', 'https://google.com/z', 'google');
  const mid = Q.launcherRelevance('mygoogle account', 'https://a.io', 'google');
  const path = Q.launcherRelevance('Unrelated', 'https://a.io/p/google', 'google');
  assert.ok(exact > prefix, 'exact must beat prefix');
  assert.ok(prefix > word, 'prefix must beat word boundary');
  assert.ok(word > host, 'word boundary must beat host-only');
  assert.ok(host > mid, 'host must beat mid-word title');
  assert.ok(mid > path, 'mid-word title must beat path-only');
  assert.equal(Q.launcherRelevance('GitHub', 'https://github.com', 'mdn'), 0);
});
test('launcher: query ranks best match first, not enumeration order', () => {
  const tabs = [
    { title: 'Django Tutorial', url: 'https://docs.djangoproject.com', tabId: 1 },
    { title: 'google maps directions', url: 'https://www.google.com/maps', tabId: 2 },
    { title: 'Google', url: 'https://google.com/search', tabId: 3 },
    { title: 'Gmail', url: 'https://mail.google.com', tabId: 4 }
  ];
  const r = Q.rankLauncherResults('google', tabs, [], [], { maxResults: 6 });
  assert.equal(r[0].title, 'Google');
  assert.ok(r.findIndex((x) => x.title === 'google maps directions') < r.findIndex((x) => x.title === 'Gmail'));
  // 'Django Tutorial' does not contain the query anywhere, so it must not
  // consume one of the limited slots at all.
  assert.equal(r.some((x) => x.title === 'Django Tutorial'), false);
  assert.equal(r.length, 3);
});
test('launcher: tabs win ties but relevance outranks kind', () => {
  const tabs = [{ title: 'Example One', url: 'https://example.com/p', tabId: 1 }];
  const bms = [
    { title: 'Example One', url: 'https://example.com/o', id: 'b1' },
    { title: 'Example Alpha', url: 'https://example.com/a', id: 'b2' }
  ];
  const all = Q.rankLauncherResults('example', tabs, bms, [], { maxResults: 10 });
  assert.equal(all.length, 3);
  assert.equal(all[0].kind, 'tab');
  assert.ok(all.slice(1).every((x) => x.kind === 'bookmark'));
  const noTabs = Q.rankLauncherResults('example', [], bms, [], { maxResults: 6 });
  assert.equal(noTabs.length, 2);
  // An exactly-titled tab beats a merely prefix-matching bookmark.
  const exactFirst = Q.rankLauncherResults('example', [{ title: 'Example', url: 'https://example.com/e', tabId: 9 }], [{ title: 'Example Alpha', url: 'https://example.com/b', id: 'b9' }], [], { maxResults: 6 });
  assert.equal(exactFirst[0].title, 'Example');
  assert.equal(exactFirst[0].kind, 'tab');
});
test('launcher: multi-word query matches on coverage, not just the first term', () => {
  const tabs = [
    { title: 'google news', url: 'https://news.google.com', tabId: 1 },
    { title: 'Google Calendar', url: 'https://calendar.google.com', tabId: 2 }
  ];
  const r = Q.rankLauncherResults('google ca', tabs, [], [], { maxResults: 6 });
  assert.equal(r.length, 1);
  assert.equal(r[0].title, 'Google Calendar');
});
test('launcher: scored path keeps tabId/id shape and dedupes by url', () => {
  const tabs = [{ title: 'GitHub', url: 'https://github.com', tabId: 42 }];
  const bms = [{ title: 'GitHub', url: 'https://github.com/', id: 'b1' }];
  const r = Q.rankLauncherResults('github', tabs, bms, [], { maxResults: 6 });
  assert.equal(r.length, 1);
  assert.equal(r[0].kind, 'tab');
  assert.equal(r[0].tabId, 42);
  assert.equal(r[0].id, undefined);
  const bmOnly = Q.rankLauncherResults('github', [], [{ title: 'GitHub', url: 'https://github.com', id: 'b1' }], [], { maxResults: 6 });
  assert.equal(bmOnly[0].id, 'b1');
  assert.equal(bmOnly[0].tabId, undefined);
});
test('launcher: messaging types registered + launcher in content files', () => {
  assert.equal(Q.MSG.LAUNCHER_QUERY, 'QLENS_LAUNCHER_QUERY');
  assert.equal(Q.MSG.LAUNCHER_ACTIVATE, 'QLENS_LAUNCHER_ACTIVATE');
  assert.equal(Q.MSG.LAUNCHER_CLOSE, 'QLENS_LAUNCHER_CLOSE');
  assert.ok(Q.CONTENT_FILES.includes('src/shared/launcher.js'));
  assert.ok(Q.CONTENT_FILES.indexOf('src/shared/launcher.js') < Q.CONTENT_FILES.indexOf('src/shared/storage.js'));
});
test('manifest: omnibox keyword ql registered', () => {
  const m = JSON.parse(readFileSync(join(ROOT, 'manifest.json'), 'utf8'));
  assert.deepEqual(m.omnibox, { keyword: 'ql' });
});
test('manifest: required fields present', () => {
  const m = JSON.parse(readFileSync(join(ROOT, 'manifest.json'), 'utf8'));
  assert.equal(m.manifest_version, 3);
  assert.equal(m.minimum_chrome_version, '111');
  assert.ok(m.permissions.includes('scripting'));
  assert.ok(m.permissions.includes('storage'));
  assert.ok(m.permissions.includes('contextMenus'));
  assert.ok(m.permissions.includes('tabs'));
  assert.ok(!m.permissions.includes('bookmarks'));
  assert.ok(!m.permissions.includes('history'));
  assert.ok(Array.isArray(m.optional_permissions) && m.optional_permissions.includes('bookmarks'));
  assert.ok(m.optional_permissions.includes('history'));
  assert.ok(Array.isArray(m.host_permissions));
  for (const h of ['https://suggestqueries.google.com/*', 'https://www.google.com/*', 'https://lens.google.com/*', 'http://*/*', 'https://*/*']) {
    assert.ok(m.host_permissions.includes(h), 'missing host permission ' + h);
  }
  assert.ok(m.background.service_worker.endsWith('.js'));
  assert.ok(m.commands['open-quick-search']);
  assert.equal(typeof m.commands['open-quick-search'].suggested_key.default, 'string');
  assert.ok(m.options_page.endsWith('.html'));
  assert.ok(m.action.default_popup.endsWith('.html'));
  assert.ok(Array.isArray(m.web_accessible_resources) && m.web_accessible_resources.some(
    (entry) => entry.resources && entry.resources.some((r) => r.endsWith('.woff2'))
  ));
  for (const s of [16, 32, 48, 128]) {
    const p = join(ROOT, m.icons[String(s)]);
    assert.ok(statSync(p).size > 0, 'icon ' + s + ' exists');
  }
});
test('manifest: every referenced file exists', () => {
  const m = JSON.parse(readFileSync(join(ROOT, 'manifest.json'), 'utf8'));
  const refs = [m.background.service_worker, m.options_page, m.action.default_popup, ...Object.values(m.icons)];
  for (const rel of refs) {
    assert.ok(statSync(join(ROOT, rel)).isFile(), 'missing ' + rel);
  }
  for (const entry of m.web_accessible_resources || []) {
    for (const r of entry.resources || []) {
      if (r.includes('*')) {
        const dir = join(ROOT, r.slice(0, r.indexOf('*')));
        assert.ok(readdirSync(dir).length > 0, 'glob empty ' + r);
      } else {
        assert.ok(statSync(join(ROOT, r)).isFile(), 'missing WAR file ' + r);
      }
    }
  }
  for (const rel of Q.CONTENT_FILES) {
    assert.ok(statSync(join(ROOT, rel)).isFile(), 'missing content file ' + rel);
  }
});
test('manifest: eager content_scripts registered for instant open', () => {
  const m = JSON.parse(readFileSync(join(ROOT, 'manifest.json'), 'utf8'));
  assert.ok(Array.isArray(m.content_scripts) && m.content_scripts.length === 1, 'exactly one content_scripts entry');
  const cs = m.content_scripts[0];
  assert.deepEqual(cs.matches, ['http://*/*', 'https://*/*']);
  assert.equal(cs.run_at, 'document_idle');
  assert.equal(cs.all_frames, false);
  assert.deepEqual(cs.js, Q.KEYDOWN_FILES, 'content_scripts js is the lean keydown set (heavy overlay injects on demand)');
});
test('manifest: keydown files exist, lean, subset of CONTENT_FILES', () => {
  for (const rel of Q.KEYDOWN_FILES) {
    assert.ok(statSync(join(ROOT, rel)).isFile(), 'missing keydown file ' + rel);
  }
  assert.ok(Q.KEYDOWN_FILES.every((f) => Q.CONTENT_FILES.includes(f)), 'keydown files subset of CONTENT_FILES');
  assert.ok(
    !Q.KEYDOWN_FILES.some((f) => f === 'src/content/overlay.js' || f === 'src/content/selection.js'),
    'overlay/selection not pre-injected'
  );
});
test('injectable files carry no loader-rejected noncharacters', () => {
  const FFFE = String.fromCharCode(0xFFFE);
  const FFFF = String.fromCharCode(0xFFFF);
  for (const rel of Q.CONTENT_FILES) {
    const src = readFileSync(join(ROOT, rel), 'utf8');
    assert.ok(src.indexOf(FFFE) === -1, rel + ' must not contain U+FFFE (extension loader rejects the file)');
    assert.ok(src.indexOf(FFFF) === -1, rel + ' must not contain U+FFFF (extension loader rejects the file)');
    for (let i = 0; i < src.length; i++) {
      const c = src.charCodeAt(i);
      if (c >= 0xD800 && c <= 0xDBFF) {
        const n = i + 1 < src.length ? src.charCodeAt(i + 1) : -1;
        assert.ok(n >= 0xDC00 && n <= 0xDFFF, rel + ' contains a lone surrogate at offset ' + i);
        i++;
      } else {
        assert.ok(c < 0xDC00 || c > 0xDFFF, rel + ' contains a lone surrogate at offset ' + i);
      }
    }
  }
});
test('sw: message bridge is re-injected so a dead listener self-heals', () => {
  // The lean probe cannot distinguish a live onMessage bridge from an orphaned
  // one (a reloaded extension leaves the bindings in the isolated world but
  // kills the context). The bridge is therefore re-run on every open.
  assert.ok(Array.isArray(Q.MESSAGE_BRIDGE_FILES) && Q.MESSAGE_BRIDGE_FILES.length > 0, 'bridge list non-empty');
  assert.ok(
    Q.MESSAGE_BRIDGE_FILES.includes('src/content/injector.js'),
    'injector.js owns the onMessage bridge and must be in the re-run list'
  );
  for (const rel of Q.MESSAGE_BRIDGE_FILES) {
    assert.ok(statSync(join(ROOT, rel)).isFile(), 'missing bridge file ' + rel);
    assert.ok(Q.CONTENT_FILES.includes(rel), rel + ' must also be in CONTENT_FILES');
    assert.ok(
      !['src/shared/config.js', 'src/shared/messaging.js', 'src/shared/storage.js'].includes(rel),
      rel + ' re-runs a const-bearing file -> redeclaration SyntaxError'
    );
  }
  const sw = readFileSync(join(ROOT, 'src/background/service-worker.js'), 'utf8');
  assert.ok(
    sw.includes('QLENS.MESSAGE_BRIDGE_FILES.includes(f)'),
    'KEYDOWN_DELTA_FILES must keep the bridge even though it is in KEYDOWN_FILES'
  );
  // Load-bearing invariant: re-running injector.js must not redeclare anything.
  // Modelled the way Chrome actually does it: two evaluations inside ONE shared
  // context (the page's isolated world). A top-level `const` would throw
  // "Identifier has already been declared" on the second run, which is exactly
  // the SyntaxError the SW's lean path is designed to avoid.
  const injectorSrc = readFileSync(join(ROOT, 'src/content/injector.js'), 'utf8');
  const ctx = vm.createContext({
    document: { addEventListener: () => {} },
    chrome: {
      runtime: {
        id: 'test-extension-id',
        sendMessage: () => Promise.resolve({}),
        onMessage: { addListener: () => {}, removeListener: () => {} }
      },
      storage: { onChanged: { addListener: () => {} }, local: { get: () => Promise.resolve({}) } }
    },
    QLENS: {
      MSG: { OPEN_OVERLAY: 'OPEN_OVERLAY', CLOSE_OVERLAY: 'CLOSE_OVERLAY' },
      CONFIG: { SHORTCUT_DEFAULT: 'Ctrl+Shift+K', STORAGE_KEYS: { SHORTCUT: 'shortcut' } },
      storage: { getShortcut: () => Promise.resolve('Ctrl+Shift+K') },
      matchesCombo: () => false
    }
  });
  ctx.window = ctx;
  vm.runInContext(injectorSrc, ctx);
  vm.runInContext(injectorSrc, ctx);
  assert.equal(typeof ctx.__QLENS_KEYHANDLER__, 'function', 'keydown handler registered on re-run');
  assert.equal(typeof ctx.__QLENS_LISTENER__, 'function', 'message listener registered on re-run');
});

/* Builds an isolated-world context for injector.js. `overlay` is a stand-in for
   QLENS.Overlay; `shortcut` is what storage returns; `storageThrows` makes
   getShortcut() throw synchronously. */
function makeInjectorCtx(opts) {
  const o = opts || {};
  const calls = { show: 0, destroy: 0, sendMessage: 0 };
  const docHandlers = [];
  let visible = o.initiallyVisible === true;
  const overlay = {
    isVisible: () => visible,
    show: () => { calls.show++; visible = true; },
    destroy: () => { calls.destroy++; visible = false; },
  };
  const ctx = vm.createContext({
    document: { addEventListener: (t, f) => { if (t === 'keydown') docHandlers.push(f); } },
    chrome: {
      runtime: {
        id: 'test-extension-id',
        sendMessage: () => { calls.sendMessage++; return Promise.resolve({}); },
        onMessage: { addListener: () => {}, removeListener: () => {} }
      },
      storage: { onChanged: { addListener: () => {} }, local: { get: () => Promise.resolve({}) } }
    },
    QLENS: {
      MSG: { OPEN_OVERLAY: 'OPEN_OVERLAY', CLOSE_OVERLAY: 'CLOSE_OVERLAY' },
      CONFIG: { SHORTCUT_DEFAULT: 'Ctrl+Shift+K', STORAGE_KEYS: { SHORTCUT: 'shortcut' } },
      storage: o.storageThrows
        ? { getShortcut: () => { throw new Error('storage exploded'); } }
        : { getShortcut: () => Promise.resolve(o.shortcut || 'Ctrl+Shift+K') },
      matchesCombo: (e, combo) => {
        const parts = combo.split('+');
        const main = parts.pop();
        const mods = parts;
        const pressed = { Ctrl: e.ctrlKey === true, Alt: e.altKey === true, Shift: e.shiftKey === true };
        for (const m of mods) if (!pressed[m]) return false;
        for (const m of Object.keys(pressed)) if (pressed[m] && !mods.includes(m)) return false;
        return String(e.key || '').toUpperCase() === main;
      }
    }
  });
  ctx.window = ctx;
  if (!o.noOverlay) ctx.QLENS.Overlay = overlay;
  const src = readFileSync(join(ROOT, 'src/content/injector.js'), 'utf8');
  vm.runInContext(src, ctx);
  // refreshCombo() resolves the shortcut through a promise, and comboReady
  // gates the keydown handler. Let those microtasks settle before pressing.
  const settled = () => new Promise((r) => setTimeout(r, 0));
  const press = (e) => { for (const f of docHandlers) f({ preventDefault() {}, stopPropagation() {}, stopImmediatePropagation() {}, ...e }); };
  return { ctx, calls, press, handlers: docHandlers, settled, isVisible: () => visible };
}

const DEFAULT_PRESS = { key: 'K', ctrlKey: true, altKey: false, shiftKey: true, metaKey: false, defaultPrevented: false };

await testAsync('shortcut: default combo works in-page even when the manifest command is unbound', async () => {
  // The manifest command is the primary path, but Chrome can leave it unbound
  // (conflict, cleared in chrome://extensions/shortcuts, dropped on reload) and
  // onCommand would then never fire. The in-page fallback is the only recovery.
  const h = makeInjectorCtx({ shortcut: 'Ctrl+Shift+K' });
  await h.settled();
  assert.ok(h.handlers.length > 0, 'keydown handler must be registered');
  h.press(DEFAULT_PRESS);
  assert.equal(h.calls.show, 1, 'default combo must open the overlay in-page');
  assert.equal(h.calls.destroy, 0, 'the fallback must never destroy');
});
await testAsync('shortcut: default-combo fallback is open-only so it cannot toggle shut', async () => {
  // Both the command and the keydown handler can fire for one keypress. The
  // command path opens; the fallback then runs and must not close it.
  const h = makeInjectorCtx({ shortcut: 'Ctrl+Shift+K', initiallyVisible: true });
  await h.settled();
  h.press(DEFAULT_PRESS);
  assert.equal(h.calls.destroy, 0, 'must not toggle an already-open overlay shut');
  assert.equal(h.calls.show, 0, 'show() on an open overlay is a no-op in the real overlay');
});
await testAsync('shortcut: custom combo still toggles closed', async () => {
  const press = { key: 'J', ctrlKey: true, altKey: true, shiftKey: false, metaKey: false, defaultPrevented: false };
  const h = makeInjectorCtx({ shortcut: 'Ctrl+Alt+J' });
  await h.settled();
  h.press(press);
  assert.equal(h.calls.show, 1, 'custom combo opens');
  h.press(press);
  assert.equal(h.calls.destroy, 1, 'custom combo must still toggle shut');
});
await testAsync('shortcut: handler survives a synchronous getShortcut() throw', async () => {
  // refreshCombo runs during script evaluation. A throw there would abort the
  // IIFE before the listener is attached, silently killing the shortcut for the
  // life of the page — so it must fall back to the default combo instead.
  const h = makeInjectorCtx({ storageThrows: true });
  await h.settled();
  assert.ok(h.handlers.length > 0, 'keydown handler must still be registered after a storage throw');
  h.press(DEFAULT_PRESS);
  assert.equal(h.calls.show, 1, 'default combo must still open the overlay');
});
await testAsync('shortcut: default combo with no overlay loaded routes through the SW', async () => {
  const h = makeInjectorCtx({ shortcut: 'Ctrl+Shift+K', noOverlay: true });
  await h.settled();
  h.press(DEFAULT_PRESS);
  assert.equal(h.calls.sendMessage, 1, 'must ask the SW to inject + open');
});
test('sw: warns once when Chrome has not bound the manifest shortcut', () => {
  const sw = readFileSync(join(ROOT, 'src/background/service-worker.js'), 'utf8');
  assert.ok(sw.includes('chrome.commands.getAll'), 'SW should inspect the real command binding');
  assert.ok(sw.includes('warnIfCommandUnbound()'), 'the diagnostic should run on SW start');
  assert.ok(
    sw.includes('has not assigned a keyboard shortcut'),
    'the warning should name the cause and point at chrome://extensions/shortcuts'
  );
});

await testAsync('storage: defaults when empty', async () => {
  loadWithChromeStub('src/shared/storage.js', {});
  const s = await Q.storage.getSettings();
  assert.deepEqual(s, Q.CONFIG.DEFAULT_SETTINGS);
});
await testAsync('storage: corrupted json falls back to defaults', async () => {
  loadWithChromeStub('src/shared/storage.js', { settings: '{oops not json' });
  const s = await Q.storage.getSettings();
  assert.deepEqual(s, Q.CONFIG.DEFAULT_SETTINGS);
});
await testAsync('storage: invalid values sanitized', async () => {
  loadWithChromeStub('src/shared/storage.js', {
    settings: { theme: 'neon', accent: 'pink', engineOrder: ['google', 'evil', 'bing'], maxSelection: 999999, blurClose: 'yes' }
  });
  const s = await Q.storage.getSettings();
  assert.equal(s.theme, 'system');
  assert.equal(s.accent, 'indigo');
  assert.deepEqual(s.engineOrder, ['google', 'bing', 'brave', 'duckduckgo']);
  assert.equal(s.maxSelection, 1000);
  assert.equal(s.blurClose, false);
});
await testAsync('storage: launcher defaults + sanitize + merge', async () => {
  loadWithChromeStub('src/shared/storage.js', {});
  const s = await Q.storage.getSettings();
  assert.deepEqual(s.launcher, { enabled: true, tabs: true, bookmarks: true, history: false, maxResults: 6 });
  loadWithChromeStub('src/shared/storage.js', { settings: { launcher: { history: false, maxResults: 99, enabled: 'yes' } } });
  const s2 = await Q.storage.getSettings();
  assert.equal(s2.launcher.history, false);
  assert.equal(s2.launcher.maxResults, 10);
  assert.equal(s2.launcher.enabled, true);
  loadWithChromeStub('src/shared/storage.js', {});
  const s3 = await Q.storage.setSettings({ launcher: { tabs: false, maxResults: 4 } });
  assert.equal(s3.launcher.tabs, false);
  assert.equal(s3.launcher.maxResults, 4);
  assert.equal(s3.launcher.history, false);
  assert.equal(s3.theme, 'system');
});
await testAsync('storage: setSettings merges patch', async () => {
  const area = loadWithChromeStub('src/shared/storage.js', {});
  await Q.storage.setSettings({ theme: 'dark' });
  const s = await Q.storage.getSettings();
  assert.equal(s.theme, 'dark');
  assert.equal(s.defaultEngine, 'google');
  const raw = await area.get('settings');
  assert.equal(raw.settings.theme, 'dark');
});
await testAsync('storage: last engine falls back to default', async () => {
  loadWithChromeStub('src/shared/storage.js', { lastEngine: 'bogus' });
  const e = await Q.storage.getLastEngine();
  assert.equal(e, 'google');
});
await testAsync('storage: customEngines sanitized + defaultEngine may be custom', async () => {
  loadWithChromeStub('src/shared/storage.js', {
    settings: {
      customEngines: [{ id: 'kagi', name: 'Kagi', url: 'https://kagi.com/search?q={q}', bang: 'kagi' }],
      defaultEngine: 'kagi',
      engineOrder: ['kagi', 'google']
    }
  });
  const s = await Q.storage.getSettings();
  assert.equal(s.defaultEngine, 'kagi');
  assert.deepEqual(s.customEngines, [{ id: 'kagi', name: 'Kagi', url: 'https://kagi.com/search?q={q}', bang: 'kagi' }]);
  assert.ok(s.engineOrder.includes('kagi') && s.engineOrder.includes('google'));
  assert.ok(s.engineOrder.indexOf('kagi') < s.engineOrder.indexOf('google') || s.engineOrder.includes('brave'));
  loadWithChromeStub('src/shared/storage.js', {
    settings: { customEngines: [{ id: 'google', name: 'X', url: 'https://ok.com/?q={q}', bang: 'xx' }], defaultEngine: 'google' }
  });
  const s2 = await Q.storage.getSettings();
  assert.deepEqual(s2.customEngines, []);
  assert.equal(s2.defaultEngine, 'google');
  loadWithChromeStub('src/shared/storage.js', {});
  const s3 = await Q.storage.setSettings({ customEngines: [{ id: 'kagi', name: 'Kagi', url: 'https://kagi.com/search?q={q}', bang: 'kagi' }] });
  assert.equal(s3.customEngines.length, 1);
  assert.ok(s3.engineOrder.includes('kagi'));
});
await testAsync('storage: last engine roundtrips custom id + rejects unknown', async () => {
  loadWithChromeStub('src/shared/storage.js', {
    settings: { customEngines: [{ id: 'kagi', name: 'Kagi', url: 'https://kagi.com/search?q={q}', bang: 'kagi' }] }
  });
  await Q.storage.setLastEngine('kagi');
  assert.equal(await Q.storage.getLastEngine(), 'kagi');
  await Q.storage.setLastEngine('nope');
  assert.equal(await Q.storage.getLastEngine(), 'kagi');
});

test('combo: buildCombo normalizes combos', () => {
  assert.equal(Q.buildCombo({ ctrlKey: true, shiftKey: true }, 'k', 'KeyK'), 'Ctrl+Shift+K');
  assert.equal(Q.buildCombo({ ctrlKey: true }, 'K', 'KeyK'), 'Ctrl+K');
  assert.equal(Q.buildCombo({ altKey: true }, '5', 'Digit5'), 'Alt+5');
  assert.equal(Q.buildCombo({ ctrlKey: true, altKey: true, shiftKey: true }, 'F9', 'F9'), 'Ctrl+Alt+Shift+F9');
  assert.equal(Q.buildCombo({ ctrlKey: true }, 'F5', 'F5'), 'Ctrl+F5');
});
test('combo: buildCombo rejects invalid keys', () => {
  assert.equal(Q.buildCombo({ ctrlKey: true }, 'Control', 'ControlLeft'), null);
  assert.equal(Q.buildCombo({ ctrlKey: true }, ' ', 'Space'), null);
  assert.equal(Q.buildCombo({ ctrlKey: true }, 'Enter', 'Enter'), null);
  assert.equal(Q.buildCombo({ ctrlKey: true }, 'ArrowUp', 'ArrowUp'), null);
  assert.equal(Q.buildCombo({ ctrlKey: true }, 'a b', ''), null);
  assert.equal(Q.buildCombo({}, 'k', 'KeyK'), null);
  assert.equal(Q.buildCombo({ shiftKey: true }, 'k', 'KeyK'), null);
  assert.equal(Q.buildCombo({ shiftKey: true, metaKey: true }, 'k', 'KeyK'), null);
  assert.equal(Q.buildCombo({ ctrlKey: true, metaKey: true }, 'k', 'KeyK'), 'Ctrl+K');
});
test('combo: matchesCombo matches pressed keys', () => {
  assert.equal(Q.matchesCombo({ ctrlKey: true, key: 'k' }, 'Ctrl+K'), true);
  assert.equal(Q.matchesCombo({ ctrlKey: true, key: 'K' }, 'Ctrl+K'), true);
  assert.equal(Q.matchesCombo({ ctrlKey: true, altKey: true, key: 'q' }, 'Ctrl+Alt+Q'), true);
  assert.equal(Q.matchesCombo({ ctrlKey: true, key: '5' }, 'Ctrl+5'), true);
  assert.equal(Q.matchesCombo({ ctrlKey: true, key: 'F5' }, 'Ctrl+F5'), true);
  assert.equal(Q.matchesCombo({ ctrlKey: true, shiftKey: true, key: 'k' }, 'Ctrl+K'), false);
  assert.equal(Q.matchesCombo({ ctrlKey: true, key: 'j' }, 'Ctrl+K'), false);
  assert.equal(Q.matchesCombo({ altKey: true, key: 'k' }, 'Ctrl+K'), false);
  assert.equal(Q.matchesCombo({ ctrlKey: true, key: 'k' }, ''), false);
  assert.equal(Q.matchesCombo(null, 'Ctrl+K'), false);
});
await testAsync('storage: shortcut roundtrip + validation', async () => {
  const area = loadWithChromeStub('src/shared/storage.js', {});
  assert.equal(await Q.storage.getShortcut(), 'Ctrl+Shift+K');
  assert.equal(await Q.storage.setShortcut('Ctrl+Alt+Q'), true);
  assert.equal(await Q.storage.getShortcut(), 'Ctrl+Alt+Q');
  assert.equal(await Q.storage.setShortcut('K'), false);
  assert.equal(await Q.storage.getShortcut(), 'Ctrl+Alt+Q');
  assert.equal(await Q.storage.setShortcut(42), false);
  await Q.storage.resetAll();
  assert.equal(area.backing.size, 0);
  assert.equal(await Q.storage.getShortcut(), 'Ctrl+Shift+K');
});
test('combo: isValidCombo validates strings', () => {
  assert.equal(Q.isValidCombo('Ctrl+Shift+K'), true);
  assert.equal(Q.isValidCombo('Alt+9'), true);
  assert.equal(Q.isValidCombo('Ctrl+F12'), true);
  assert.equal(Q.isValidCombo('Ctrl+Alt+Shift+P'), true);
  assert.equal(Q.isValidCombo('Shift+K'), false);
  assert.equal(Q.isValidCombo('K'), false);
  assert.equal(Q.isValidCombo('Ctrl+Ctrl+K'), false);
  assert.equal(Q.isValidCombo('Ctrl+Space'), false);
  assert.equal(Q.isValidCombo('Ctrl+Enter'), false);
  assert.equal(Q.isValidCombo('Ctrl+'), false);
  assert.equal(Q.isValidCombo(''), false);
  assert.equal(Q.isValidCombo('Ctrl+Meta+K'), false);
});

loadScript('src/content/selection.js');
test('selection: truncate short text unchanged', () => {
  assert.equal(Q.Selection.truncate('  hello   world  ', 200), 'hello world');
});
test('selection: truncate long text at limit with ellipsis', () => {
  const long = 'a'.repeat(500);
  const out = Q.Selection.truncate(long, 200);
  assert.equal(out.length, 201);
  assert.equal(out.endsWith('…'), true);
  assert.equal(out.slice(0, 200), 'a'.repeat(200));
});
test('selection: truncate empty returns null', () => {
  assert.equal(Q.Selection.truncate('   \n  ', 200), null);
  assert.equal(Q.Selection.truncate(null, 200), null);
});
test('selection: truncate default limit 200', () => {
  const out = Q.Selection.truncate('x'.repeat(300), NaN);
  assert.equal(out.length, 201);
});
test('async: validWait falls back on bad input', () => {
  assert.equal(Q.validWait(200, 120), 200);
  assert.equal(Q.validWait(NaN, 120), 120);
  assert.equal(Q.validWait(-5, 120), 120);
  assert.equal(Q.validWait('x', 120), 120);
  assert.equal(Q.validWait(0, 120), 0);
});
test('messaging: OPEN_OPTIONS registered', () => {
  assert.equal(Q.MSG.OPEN_OPTIONS, 'QLENS_OPEN_OPTIONS');
});

console.log('\n' + results.pass + ' passed, ' + results.fail + ' failed');
if (results.fail > 0) {
  for (const f of results.failures) console.log('\nFAILED: ' + f.name + '\n  ' + f.err.stack);
  process.exit(1);
}