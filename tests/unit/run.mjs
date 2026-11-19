import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, posix } from 'node:path';
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

// Chrome refuses to read a file it cannot decode, and the failure is total: a
// rejected service-worker module leaves the extension dead, a rejected content
// script silently never runs, and Chrome's own message never names the byte.
// Rejected: invalid UTF-8, U+FFFE/U+FFFF, lone surrogates.
function assertLoaderSafeFile(relPath) {
  const bytes = readFileSync(join(ROOT, relPath));
  assert.doesNotThrow(
    () => new TextDecoder('utf-8', { fatal: true }).decode(bytes),
    relPath + ' must be valid UTF-8 (the extension loader rejects the file otherwise)'
  );
  const src = textDecoder.decode(bytes);
  const FFFE = String.fromCharCode(0xFFFE);
  const FFFF = String.fromCharCode(0xFFFF);
  assert.ok(src.indexOf(FFFE) === -1, relPath + ' must not contain U+FFFE (extension loader rejects the file)');
  assert.ok(src.indexOf(FFFF) === -1, relPath + ' must not contain U+FFFF (extension loader rejects the file)');
  for (let i = 0; i < src.length; i++) {
    const c = src.charCodeAt(i);
    if (c >= 0xD800 && c <= 0xDBFF) {
      const n = i + 1 < src.length ? src.charCodeAt(i + 1) : -1;
      assert.ok(n >= 0xDC00 && n <= 0xDFFF, relPath + ' contains a lone surrogate at offset ' + i);
      i++;
    } else {
      assert.ok(c < 0xDC00 || c > 0xDFFF, relPath + ' contains a lone surrogate at offset ' + i);
    }
  }
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
loadScript('src/shared/calculator.js');

function calcValue(input) {
  const r = Q.Calc.detect(input);
  return r ? r.value : null;
}

test('calculator: precedence, parentheses, and associativity', () => {
  assert.equal(calcValue('2 + 3 * 4'), 14);
  assert.equal(calcValue('(2 + 3) * 4'), 20);
  assert.equal(calcValue('18 / 3 / 2'), 3);
  assert.equal(calcValue('2^3^2'), 512);
  assert.equal(calcValue('-2^2'), -4);
  assert.equal(calcValue('2^-2'), 0.25);
});
test('calculator: functions and constants', () => {
  assert.equal(calcValue('sqrt(81)'), 9);
  assert.equal(calcValue('cbrt(27)'), 3);
  assert.equal(calcValue('max(1, 2, 3)'), 3);
  assert.equal(calcValue('hypot(3, 4)'), 5);
  assert.equal(calcValue('log(1000)'), 3);
  assert.equal(calcValue('ln(e)'), 1);
  assert.ok(Math.abs(calcValue('=pi') - Math.PI) < 1e-12);
  assert.ok(Math.abs(calcValue('=tau') - Math.PI * 2) < 1e-12);
  assert.ok(Math.abs(calcValue('=phi') - (1 + Math.sqrt(5)) / 2) < 1e-12);
});
test('calculator: implicit multiplication', () => {
  assert.equal(calcValue('2(3 + 4)'), 14);
  assert.equal(calcValue('2sqrt(9)'), 6);
  assert.ok(Math.abs(calcValue('3pi') - 3 * Math.PI) < 1e-9);
  assert.ok(Math.abs(calcValue('2pi') - 2 * Math.PI) < 1e-9);
});
test('calculator: percent, percent-of, modulo, word operators', () => {
  assert.equal(calcValue('50%'), 0.5);
  assert.equal(calcValue('25% of 80'), 20);
  assert.equal(calcValue('200 * 10%'), 20);
  assert.equal(calcValue('10 % 3'), 1);
  assert.equal(calcValue('10 mod 3'), 1);
  assert.equal(calcValue('what is 5 times 3?'), 15);
  assert.equal(calcValue('8 divided by 2'), 4);
  assert.equal(calcValue('2 plus 3'), 5);
});
test('calculator: numeric formats and grouping', () => {
  assert.equal(calcValue('0x10 + 1'), 17);
  assert.equal(calcValue('0b101 + 1'), 6);
  assert.equal(calcValue('0o17 + 1'), 16);
  assert.equal(calcValue('1e3 + 1'), 1001);
  assert.equal(calcValue('1,000 + 234'), 1234);
  const r = Q.Calc.detect('1234567 + 1');
  assert.equal(r.display, '1,234,568');
  assert.equal(r.copy, '1234568');
  assert.equal(Q.Calc.detect('0.1 + 0.2').display, '0.3');
  assert.equal(Q.Calc.format(1234.5), '1,234.5');
  assert.equal(Q.Calc.format(-1234.5), '-1,234.5');
});
test('calculator: leading equals forces evaluation', () => {
  assert.equal(Q.Calc.detect('3.14'), null);
  assert.equal(calcValue('=3.14'), 3.14);
  assert.equal(calcValue('= 2^10'), 1024);
  assert.equal(Q.Calc.detect('=cats'), null);
  assert.equal(Q.Calc.detect('='), null);
});
test('calculator: normal searches, dates, phones, and URLs are not hijacked', () => {
  const searches = [
    'cats and dogs',
    'top 10 laptops',
    'best 2-in-1 laptops',
    'covid-19',
    'https://example.com/2',
    'user@2x',
    '2024-01-01',
    '01/02/2024',
    '+1 (555) 123-4567'
  ];
  for (const q of searches) assert.equal(Q.Calc.detect(q), null, q);
});
test('calculator: invalid or non-finite math returns null', () => {
  const bad = ['1/0', '0/0', 'sqrt(-1)', '(2+3', '2++', '2^99999', 'min()', 'nope(2)'];
  for (const q of bad) assert.equal(Q.Calc.detect(q), null, q);
});
test('calculator: input length is capped', () => {
  const long = '1+'.repeat(100) + '1';
  assert.equal(long.length, 201);
  assert.equal(Q.Calc.detect(long), null);
});
test('calculator: evaluator has no eval or Function constructor', () => {
  const src = readFileSync(join(ROOT, 'src/shared/calculator.js'), 'utf8');
  assert.ok(!/\beval\s*\(/.test(src), 'calculator must not use eval()');
  assert.ok(!/new\s+Function\s*\(/.test(src), 'calculator must not use new Function()');
});
test('calculator: registered in content files before the overlay', () => {
  assert.ok(Q.CONTENT_FILES.includes('src/shared/calculator.js'));
  assert.ok(
    Q.CONTENT_FILES.indexOf('src/shared/calculator.js') < Q.CONTENT_FILES.indexOf('src/content/overlay.js'),
    'calculator.js must load before overlay.js'
  );
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
test('launcher: feature fully removed', () => {
  assert.equal(Q.MSG.LAUNCHER_QUERY, undefined);
  assert.equal(Q.MSG.LAUNCHER_ACTIVATE, undefined);
  assert.equal(Q.MSG.LAUNCHER_CLOSE, undefined);
  assert.equal(Q.sanitizeLauncher, undefined);
  assert.equal(Q.rankLauncherResults, undefined);
  assert.equal(Q.launcherRelevance, undefined);
  assert.ok(!Q.CONTENT_FILES.includes('src/shared/launcher.js'));
  assert.equal(Q.CONFIG.DEFAULT_SETTINGS.launcher, undefined);
  assert.equal(Q.CONFIG.LAUNCHER_DEBOUNCE_MS, undefined);
  assert.equal(Q.CONFIG.LAUNCHER_CACHE_TTL_MS, undefined);
  assert.throws(() => statSync(join(ROOT, 'src/shared/launcher.js')), /ENOENT/);
  const src = readFileSync(join(ROOT, 'src/content/overlay.js'), 'utf8');
  assert.ok(!src.includes('ql-launch'), 'overlay must not render launcher rows');
  assert.ok(!src.includes('LAUNCHER_QUERY'), 'overlay must not ask the worker for launcher rows');
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
  assert.ok(!m.permissions.includes('tabs'));
  assert.ok(!m.permissions.includes('bookmarks'));
  assert.ok(!m.permissions.includes('history'));
  assert.ok(!Array.isArray(m.optional_permissions) || m.optional_permissions.length === 0);
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
test('manifest: version stays in sync with package.json and the config fallback', () => {
  const m = JSON.parse(readFileSync(join(ROOT, 'manifest.json'), 'utf8'));
  const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
  const cfg = readFileSync(join(ROOT, 'src/shared/config.js'), 'utf8');
  assert.equal(m.version, pkg.version, 'manifest and package versions must agree');
  assert.ok(cfg.includes("VERSION: '" + m.version + "'"), 'config fallback must match the manifest version');
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
  assert.deepEqual(cs.js, Q.CONTENT_FILES, 'content_scripts js is the full eager set so first open needs no injection');
});
test('manifest: keydown files exist, legacy lean set, subset of CONTENT_FILES', () => {
  for (const rel of Q.KEYDOWN_FILES) {
    assert.ok(statSync(join(ROOT, rel)).isFile(), 'missing keydown file ' + rel);
  }
  assert.ok(Q.KEYDOWN_FILES.every((f) => Q.CONTENT_FILES.includes(f)), 'keydown files subset of CONTENT_FILES');
  assert.ok(
    !Q.KEYDOWN_FILES.some((f) => f === 'src/content/overlay.js' || f === 'src/content/selection.js'),
    'the legacy lean probe must not claim the overlay was preloaded'
  );
});
test('injectable files are loader-safe (valid UTF-8, no noncharacters)', () => {
  for (const rel of Q.CONTENT_FILES) assertLoaderSafeFile(rel);
});
test('sw: the importScripts batch points at files the loader accepts', () => {
  // A typo or a rename in this batch kills the whole extension at start-up:
  // Chrome reports "failed to load" for the first module and the user has
  // nothing to act on. Resolve the batch the way Chrome does - relative to the
  // worker's own folder - so a broken entry fails here instead of in the browser.
  const swRel = 'src/background/service-worker.js';
  const sw = readFileSync(join(ROOT, swRel), 'utf8');
  const batch = /importScripts\(([\s\S]*?)\)/.exec(sw);
  assert.ok(batch, 'the service worker imports its shared modules');
  const rels = batch[1]
    .split(',')
    .map((s) => s.trim().replace(/^['"]|['"]$/g, ''))
    .filter((s) => s.length > 0);
  assert.ok(rels.length >= 6, 'the whole background batch is listed, got ' + rels.length);
  assert.ok(!rels.some((r) => r.includes('launcher')), 'the removed launcher module is not imported');
  const resolved = rels.map((r) => posix.normalize(posix.join(posix.dirname(swRel), r)));
  assert.equal(new Set(resolved).size, resolved.length, 'no module is imported twice');
  for (const rel of resolved) {
    assert.ok(!rel.startsWith('..'), rel + ' resolves outside the extension folder');
    assert.ok(statSync(join(ROOT, rel)).isFile(), 'missing background module ' + rel);
    assertLoaderSafeFile(rel);
  }
  assert.ok(resolved.includes('src/shared/config.js'), 'config.js is in the batch (the module Chrome names first)');
  assertLoaderSafeFile(swRel);
  const manifest = JSON.parse(readFileSync(join(ROOT, 'manifest.json'), 'utf8'));
  assert.equal(
    manifest.background.service_worker,
    swRel,
    'the manifest starts the worker that runs the batch, so the relative paths resolve'
  );
});
test('sw: a failed module load names the cause and the fix, then rethrows', () => {
  const sw = readFileSync(join(ROOT, 'src/background/service-worker.js'), 'utf8');
  const guard = /try\s*\{[\s\S]{0,400}?importScripts\([\s\S]{0,400}?\}\s*catch\s*\(err\)\s*\{([\s\S]{0,900}?)\n\}/.exec(sw);
  assert.ok(guard, 'importScripts stays wrapped in a try/catch');
  const body = guard[1];
  assert.ok(body.includes('console.error('), 'the failure is logged where chrome://extensions shows it');
  assert.ok(body.includes('chrome://extensions'), 'the message tells the user where to recover');
  assert.ok(/Reload/.test(body), 'the message names the reload action');
  assert.ok(body.includes('err.message'), "the message carries Chrome's own reason");
  assert.ok(/throw new Error\(/.test(body), 'the worker still fails loudly instead of running half-initialized');
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
test('sw: a stored custom combo suppresses the manifest command', () => {
  // A custom combo is delivered by the content script. If the manifest command
  // still honored Ctrl+Shift+K after a rebind, the old shortcut would stay
  // active alongside the new one.
  const sw = readFileSync(join(ROOT, 'src/background/service-worker.js'), 'utf8');
  const start = sw.indexOf('chrome.commands.onCommand.addListener');
  assert.ok(start >= 0, 'the manifest command listener exists');
  const end = sw.indexOf('// If Chrome never bound', start);
  assert.ok(end > start, 'the command listener block is delimited');
  const block = sw.slice(start, end);
  assert.ok(block.includes('shortcutMemo'), 'the command path consults the shortcut memo');
  assert.ok(block.includes('QLENS.storage.getShortcut()'), 'a cold SW reads the stored shortcut');
  assert.ok(
    /if\s*\(combo && combo !== QLENS\.CONFIG\.SHORTCUT_DEFAULT\)\s*return;/.test(block),
    'a custom combo must return before openQuickSearch'
  );
  assert.ok(block.includes('openQuickSearch(undefined, tabId)'), 'the default combo still opens on the command tab');
});

/* Builds an isolated-world context for injector.js. `overlay` is a stand-in for
   QLENS.Overlay; `shortcut` is what storage returns; `storageThrows` makes
   getShortcut() throw synchronously. */
function makeInjectorCtx(opts) {
  const o = opts || {};
  const calls = { show: 0, destroy: 0, sendMessage: 0, storageReads: 0 };
  const winHandlers = [];
  const docHandlers = [];
  const changeListeners = [];
  let visible = o.initiallyVisible === true;
  let storedShortcut = o.shortcut || 'Ctrl+Shift+K';
  let foreignHost = null;
  const foreignState = { clicks: 0, removals: 0 };
  const overlay = {
    isVisible: () => visible,
    show: () => { calls.show++; visible = true; },
    destroy: () => { calls.destroy++; visible = false; },
  };
  const storageEvents = {
    addListener: (f) => { changeListeners.push(f); },
    removeListener: (f) => {
      const i = changeListeners.indexOf(f);
      if (i !== -1) changeListeners.splice(i, 1);
    }
  };
  const ctx = vm.createContext({
    document: {
      addEventListener: (t, f) => { if (t === 'keydown') docHandlers.push(f); },
      removeEventListener: (t, f) => {
        const i = docHandlers.indexOf(f);
        if (i !== -1) docHandlers.splice(i, 1);
      },
      querySelectorAll: () => (foreignHost ? [foreignHost] : []),
      querySelector: () => foreignHost
    },
    addEventListener: (t, f) => { if (t === 'keydown') winHandlers.push(f); },
    removeEventListener: (t, f) => {
      const i = winHandlers.indexOf(f);
      if (i !== -1) winHandlers.splice(i, 1);
    },
    chrome: {
      runtime: {
        id: 'test-extension-id',
        sendMessage: () => { calls.sendMessage++; return Promise.resolve({}); },
        onMessage: { addListener: () => {}, removeListener: () => {} }
      },
      storage: o.storageThrows
        ? { onChanged: storageEvents }
        : {
            onChanged: storageEvents,
            local: {
              get: (key) => {
                calls.storageReads++;
                return Promise.resolve({ [key]: storedShortcut });
              }
            }
          }
    },
    QLENS: {
      MSG: { OPEN_OVERLAY: 'OPEN_OVERLAY', CLOSE_OVERLAY: 'CLOSE_OVERLAY' },
      CONFIG: { SHORTCUT_DEFAULT: 'Ctrl+Shift+K', STORAGE_KEYS: { SHORTCUT: 'shortcut' } },
      // Deliberately stale (the old default): the injector must read the combo
      // through live chrome.storage, not through this page's dead copy.
      storage: o.storageThrows
        ? { getShortcut: () => { throw new Error('storage exploded'); } }
        : { getShortcut: () => Promise.resolve('Ctrl+Shift+K') },
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
  const press = (e) => {
    const event = {
      preventDefault() {},
      stopPropagation() {},
      stopImmediatePropagation() { event.immediateStopped = true; },
      ...e
    };
    for (const f of winHandlers.concat(docHandlers).slice()) f(event);
    return event;
  };
  return {
    ctx,
    calls,
    press,
    handlers: winHandlers,
    settled,
    isVisible: () => visible,
    rerun: () => vm.runInContext(src, ctx),
    setStoredShortcut: (combo) => { storedShortcut = combo; },
    emitShortcutChange: () => {
      for (const f of changeListeners.slice()) f({ shortcut: { newValue: storedShortcut } }, 'local');
    },
    storageListenerCount: () => changeListeners.length,
    setForeignOverlay: (query) => {
      foreignState.clicks = 0;
      foreignState.removals = 0;
      const input = { value: typeof query === 'string' ? query : '' };
      foreignState.input = input;
      foreignHost = {
        shadowRoot: {
          querySelector: (sel) => {
            if (sel === '.ql-input') return input;
            if (sel === '.ql-panel') return {};
            if (sel === '.ql-close') {
              return {
                click: () => {
                  // Mirrors the real close control: a non-empty query is
                  // cleared first, and only an empty one actually closes.
                  if (input.value) {
                    input.value = '';
                    return;
                  }
                  foreignState.clicks++;
                }
              };
            }
            return null;
          }
        },
        remove: () => { foreignState.removals++; }
      };
      return foreignState;
    }
  };
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
await testAsync('shortcut: a matched press never reaches an orphaned document listener', async () => {
  // An injector left behind by a previous extension instance listens on
  // document. The live handler claims the combo at window capture so one
  // keypress cannot be handled twice (which opened two panels).
  const h = makeInjectorCtx({ shortcut: 'Ctrl+Alt+J' });
  await h.settled();
  const event = h.press({ key: 'J', ctrlKey: true, altKey: true, shiftKey: false, metaKey: false, defaultPrevented: false });
  assert.equal(event.immediateStopped, true, 'the event is stopped before it reaches document listeners');
  assert.equal(h.calls.show, 1, 'only the live instance opens a panel');
});
await testAsync('shortcut: a foreign panel is closed instead of stacked', async () => {
  // If another QLens instance is already on screen, opening a second panel is
  // never allowed: the foreign one is asked to close through its own control.
  const h = makeInjectorCtx({ shortcut: 'Ctrl+Alt+J' });
  const foreign = h.setForeignOverlay();
  await h.settled();
  h.press({ key: 'J', ctrlKey: true, altKey: true, shiftKey: false, metaKey: false, defaultPrevented: false });
  assert.equal(foreign.clicks, 1, 'the foreign panel is closed');
  assert.equal(foreign.removals, 1, 'the host is detached so it cannot linger next to ours');
  assert.equal(h.calls.show, 0, 'no second panel is built');
});
await testAsync('shortcut: a foreign panel with a typed query still closes in one press', async () => {
  // The close control only closes when its input is empty: if the foreign
  // panel held text, a plain click would merely clear it and both panels
  // would be on screen. The query must be cleared before the click.
  const h = makeInjectorCtx({ shortcut: 'Ctrl+Alt+J' });
  const foreign = h.setForeignOverlay('cats');
  await h.settled();
  h.press({ key: 'J', ctrlKey: true, altKey: true, shiftKey: false, metaKey: false, defaultPrevented: false });
  assert.equal(foreign.input.value, '', 'the foreign query is cleared first');
  assert.equal(foreign.clicks, 1, 'the foreign panel still closes on that same press');
  assert.equal(h.calls.show, 0, 'no second panel is built');
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
await testAsync('shortcut: re-injection replaces the dead handler and reads the live combo', async () => {
  // After an extension update the SW re-runs injector.js in already-open tabs.
  // The old handler belongs to the dead extension context; it must be replaced
  // (not kept behind an early return) and the new one must read the combo
  // through live chrome.storage instead of the page's stale QLENS copy.
  const h = makeInjectorCtx({ shortcut: 'Ctrl+Shift+K' });
  await h.settled();
  h.setStoredShortcut('Ctrl+Alt+J');
  h.rerun();
  await h.settled();
  assert.equal(h.handlers.length, 1, 're-injection must leave exactly one keydown handler');
  assert.equal(h.storageListenerCount(), 1, 're-injection must leave exactly one storage listener');
  h.press({ key: 'J', ctrlKey: true, altKey: true, shiftKey: false, metaKey: false, defaultPrevented: false });
  assert.equal(h.calls.show, 1, 'the custom combo must work again without reloading the page');
  h.press(DEFAULT_PRESS);
  assert.equal(h.calls.show, 1, 'the stale default combo must not fire once a custom one is stored');
});
await testAsync('shortcut: a live storage change swaps the combo without a page reload', async () => {
  // Saving a new combo in options must reach pages that are already open. The
  // storage listener rebuilds the memo, so the old combo dies immediately.
  const h = makeInjectorCtx({ shortcut: 'Ctrl+Shift+K' });
  await h.settled();
  h.setStoredShortcut('Ctrl+Alt+J');
  h.emitShortcutChange();
  await h.settled();
  h.press(DEFAULT_PRESS);
  assert.equal(h.calls.show, 0, 'the previous combo must stop working');
  h.press({ key: 'J', ctrlKey: true, altKey: true, shiftKey: false, metaKey: false, defaultPrevented: false });
  assert.equal(h.calls.show, 1, 'the new combo must open without a reload');
});
test('sw: extension updates and shortcut changes repair already-open tabs', () => {
  const injector = readFileSync(join(ROOT, 'src/content/injector.js'), 'utf8');
  assert.ok(
    injector.includes('chrome.storage.local.get('),
    'the injector reads the combo through live storage, not the dead page copy'
  );
  assert.ok(
    injector.includes("document.removeEventListener('keydown'"),
    're-injection must remove the previous document keydown handler'
  );
  assert.ok(
    injector.includes("window.addEventListener('keydown'") && injector.includes('stopImmediatePropagation'),
    'the live handler claims the shortcut at window capture so an orphaned listener cannot open a second panel'
  );
  assert.ok(
    injector.includes('closeForeignOverlay'),
    'a press must close a foreign QLens panel instead of stacking another'
  );
  assert.ok(
    injector.includes("querySelector('.ql-input')") && injector.includes('input.value = \'\''),
    'the injector clears a foreign query before clicking close'
  );
  const overlay = readFileSync(join(ROOT, 'src/content/overlay.js'), 'utf8');
  assert.ok(
    overlay.includes("setAttribute('data-qlens-overlay'"),
    'the overlay host carries a marker both instances can see'
  );
  assert.ok(
    overlay.includes('const closedForeign = closeForeignOverlay();'),
    'show() must clear any foreign panel before building'
  );
  assert.ok(
    overlay.includes("querySelector('.ql-input')") && overlay.includes('input.value = \'\''),
    'show() clears a foreign query before clicking close'
  );
  assert.ok(
    overlay.includes('foreignFocusTimer'),
    'show() reclaims focus after the foreign close animation restores it to the page'
  );
  const sw = readFileSync(join(ROOT, 'src/background/service-worker.js'), 'utf8');
  assert.ok(sw.includes('function repairOpenTabs('), 'the SW owns the open-tab repair');
  assert.ok(sw.includes('chrome.tabs.query({})'), 'repair enumerates every open tab');
  assert.ok(
    /for \(const tab of tabs\)[\s\S]*?isAllowedTabUrl\(tab\.url\)[\s\S]*?targets\.push\(tab\.id\)/.test(sw),
    'repair only touches normal http(s) tabs'
  );
  const installedStart = sw.indexOf('chrome.runtime.onInstalled.addListener');
  assert.ok(installedStart >= 0, 'onInstalled listener exists');
  const installedEnd = sw.indexOf('});', installedStart);
  const installed = sw.slice(installedStart, installedEnd);
  assert.ok(installed.includes('repairOpenTabs()'), 'an extension update repairs open tabs');
  const changeStart = sw.indexOf('if (changes[QLENS.CONFIG.STORAGE_KEYS.SHORTCUT])');
  assert.ok(changeStart >= 0, 'shortcut storage branch exists');
  const change = sw.slice(changeStart, sw.indexOf('});', changeStart));
  assert.ok(change.includes('repairOpenTabs()'), 'saving a shortcut repairs already-open tabs');
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

/* ---------------------------------------------------------------------------
   Image-search regression harness. The SW lens pipeline is a contiguous slice
   of service-worker.js (SW_LENS_UPLOAD .. onMessage listener). Evaluating that
   slice in a vm context hands us the real handleImageSearch with fake
   chrome/fetch, so upload single-flight, the resolved-URL fast path, the URL
   gate, and the one-tab/no-detour rule are pinned without a browser.
--------------------------------------------------------------------------- */
const SW_LENS_SLICE_START = "const SW_LENS_UPLOAD = 'https://lens.google.com/v3/upload';";
const SW_LENS_SLICE_END = 'chrome.runtime.onMessage.addListener(';
const LENS_B64 = 'iVBORw0KGgo=';
const flushTicks = () => new Promise((r) => setTimeout(r, 0));

// For behaviour that is deliberately fire-and-forget (the focus watchdog).
async function waitFor(cond, ms) {
  const end = Date.now() + (ms || 1000);
  while (Date.now() < end) {
    if (cond()) return true;
    await new Promise((r) => setTimeout(r, 5));
  }
  return cond();
}

function makeSwImageSearchCtx(opts) {
  const o = opts || {};
  const calls = {
    posts: [], created: [], updates: [], active: [], gets: [], windows: [], script: 0, scriptArgs: [], remove: 0, log: []
  };
  const backing = new Map(Object.entries(o.storage || {}));
  const tabs = new Map();
  const getCounts = new Map();
  let nextTabId = 100;
  const userWindow = 900;
  const session = {
    async get(keys) {
      if (keys == null) return Object.fromEntries(backing);
      const list = typeof keys === 'string' ? [keys] : Array.isArray(keys) ? keys : Object.keys(keys);
      const out = {};
      for (const k of list) if (backing.has(k)) out[k] = backing.get(k);
      return out;
    },
    async set(items) { for (const [k, v] of Object.entries(items)) backing.set(k, v); },
    async remove(keys) { const list = typeof keys === 'string' ? [keys] : keys; for (const k of list) backing.delete(k); }
  };
  // A window has exactly one active tab, like a real one.
  const setActive = (tab) => {
    for (const t of tabs.values()) if (t.windowId === tab.windowId) t.active = false;
    tab.active = true;
  };
  const addTab = (windowId, url, active) => {
    const id = nextTabId++;
    const tab = { id, windowId, status: 'complete', url, active: false };
    tabs.set(id, tab);
    if (active) setActive(tab);
    return tab;
  };
  const ctx = vm.createContext({
    URL, atob, btoa, setTimeout, clearTimeout, FormData, Blob, AbortController,
    // The real sleep lives above the slice; the poll loops only need a tick.
    sleep: () => new Promise((r) => setTimeout(r, 0)),
    fetch: (url, init) => {
      const isPost = Boolean(init && init.method === 'POST');
      if (!isPost) return Promise.resolve({ url: '' });
      calls.posts.push({ url: String(url) });
      if (o.onUpload) return o.onUpload();
      return Promise.resolve({ url: o.uploadUrl || 'https://lens.google.com/ok?vsrid=1', headers: { get: () => null } });
    },
    // The user's own page, so the focus watchdog has a tab to hand the view to.
    chrome: {
      runtime: { id: 'test-extension-id', getURL: (p) => 'chrome-extension://test/' + p },
      tabs: {
        create: (t) => {
          const spec = (typeof t === 'object' && t) ? t : { url: String(t) };
          const windowId = typeof spec.windowId === 'number' ? spec.windowId : userWindow;
          const url = typeof spec.url === 'string' ? spec.url : '';
          const tab = addTab(windowId, url, spec.active === true);
          calls.created.push({ id: tab.id, url, active: spec.active === true, windowId });
          calls.log.push('create:' + url);
          // Some browsers pull a worker-created background tab to the front.
          if (o.browserStealsFocus && spec.active !== true) {
            setActive(tab);
            calls.log.push('stealFocus:' + tab.id);
          }
          return Promise.resolve({ ...tab });
        },
        query: () => {
          const list = [...tabs.values()].filter((t) => t.windowId === userWindow);
          return Promise.resolve(list.filter((t) => t.active).map((t) => ({ ...t })));
        },
        move: (id, spec) => {
          const tab = tabs.get(id);
          if (!tab) return Promise.reject(new Error('no tab ' + id));
          if (spec && typeof spec.windowId === 'number') tab.windowId = spec.windowId;
          return Promise.resolve({ ...tab });
        },
        get: async (id) => {
          calls.gets.push(id);
          const tab = tabs.get(id);
          if (!tab) throw new Error('no tab ' + id);
          const seen = (getCounts.get(id) || 0) + 1;
          getCounts.set(id, seen);
          // A freshly created tab still shows its predecessor for a beat. The
          // harness can lag the committed URL so the readiness polls are real.
          if (o.helperLag && seen <= o.helperLag && tab.url === 'https://www.google.com/') {
            return { id, windowId: tab.windowId, status: 'loading', url: 'about:blank', active: tab.active };
          }
          return { ...tab };
        },
        update: async (id, t) => {
          const spec = (typeof t === 'object' && t) ? t : { url: String(t) };
          const tab = tabs.get(id);
          if (!tab) throw new Error('no tab ' + id);
          if (typeof spec.url === 'string') {
            tab.url = spec.url;
            calls.updates.push({ id, url: spec.url });
            calls.log.push('update:' + spec.url);
          }
          if (spec.active === true) {
            setActive(tab);
            calls.active.push(id);
            calls.log.push('active:' + id);
          }
          return { ...tab };
        },
        remove: async (id) => {
          calls.remove++;
          calls.log.push('remove:' + id);
          tabs.delete(id);
        }
      },
      storage: { session },
      scripting: {
        executeScript: async (spec) => {
          calls.script++;
          calls.scriptArgs.push(spec ? spec.args : null);
          calls.log.push('script:' + calls.script);
          return o.onScript ? o.onScript(calls.script) : [{ result: null }];
        }
      }
    }
  });
  for (const rel of ['src/shared/config.js', 'src/shared/engines.js', 'src/shared/image.js']) {
    vm.runInContext(readFileSync(join(ROOT, rel), 'utf8'), ctx, { filename: rel });
  }
  const sw = readFileSync(join(ROOT, 'src/background/service-worker.js'), 'utf8');
  const start = sw.indexOf(SW_LENS_SLICE_START);
  const end = sw.indexOf(SW_LENS_SLICE_END, start);
  assert.ok(start > 0 && end > start, 'SW lens slice anchors must exist');
  const userTab = addTab(userWindow, 'https://example.com/', true);
  vm.runInContext(sw.slice(start, end), ctx, { filename: 'service-worker.lens-slice.js' });
  assert.equal(typeof ctx.handleImageSearch, 'function', 'slice must expose handleImageSearch');
  const created = (pred) => calls.created.filter((t) => (pred ? pred(t) : true));
  return { ctx, calls, backing, created, userTabId: userTab.id, log: calls.log, invoke: (payload) => ctx.handleImageSearch(payload) };
}

function makeOverlayImageSearchCtx() {
  const sent = [];
  const pending = [];
  const counters = { destroyed: 0, errors: [], searching: [] };
  const src = readFileSync(join(ROOT, 'src/content/overlay.js'), 'utf8');
  const s = src.indexOf('  function searchImage() {');
  const e = src.indexOf('  function safeNameFallback() {', s);
  const fs = src.indexOf('  function fireImagePreflight() {');
  const fe = src.indexOf('  function updateFootEngine() {', fs);
  assert.ok(s > 0 && e > s, 'overlay searchImage anchors must exist');
  assert.ok(fs > 0 && fe > fs, 'overlay fireImagePreflight anchors must exist');
  const sandbox = {
    URL, atob, btoa, setTimeout, clearTimeout,
    attachment: null, uploading: false, pendingSearch: false, searching: false, searchGen: 0, closing: false,
    host: {}, inputEl: { value: 'hello q' },
    renderChip: () => {},
    showError: (m) => { counters.errors.push(String(m)); },
    safeNameFallback: () => 'qlens-search.jpg',
    destroy: () => { counters.destroyed++; sandbox.closing = true; },
    // searchImage calls the real setSearching/removeImage, which live outside
    // the slice — stub them and record the calls the slice makes.
    setSearching: (v) => { sandbox.searching = Boolean(v); counters.searching.push(Boolean(v)); },
    removeImage: () => { sandbox.attachment = null; },
    QLENS: {
      MSG: { IMAGE_SEARCH: 'IMAGE_SEARCH' },
      CONFIG: { IMAGE_MAX_BYTES: 5 * 1024 * 1024, IMAGE_SEARCH_UI_WAIT_MS: 30000 },
      ImageEngine: { bytesToBase64: (bytes) => 'ENGINE:' + bytes.length }
    },
    chrome: { runtime: { sendMessage: (msg) => { sent.push(msg); return new Promise((resolve, reject) => pending.push({ resolve, reject })); } } }
  };
  const ctx = vm.createContext(sandbox);
  vm.runInContext(src.slice(s, e), ctx, { filename: 'overlay.searchImage.js' });
  vm.runInContext(src.slice(fs, fe), ctx, { filename: 'overlay.preflight.js' });
  return { ctx, sent, pending, counters, sandbox };
}

await testAsync('sw: image preflight uploads once, returns the url, and never touches chrome.tabs', async () => {
  const h = makeSwImageSearchCtx({});
  const r = await h.invoke({ preflight: true, bytes: LENS_B64, hash: 'deadbeef', name: 'x.png', mime: 'image/png' });
  assert.equal(r && r.ok, true, 'preflight must succeed');
  assert.equal(r.url, 'https://lens.google.com/ok?vsrid=1');
  assert.equal(h.calls.posts.length, 1, 'exactly one upload');
  assert.equal(h.calls.created.length, 0, 'preflight must never create a tab');
  assert.equal(h.calls.updates.length, 0, 'preflight must never navigate a tab');
  assert.equal(h.calls.script, 0, 'preflight must never run the page-origin fallback');
});

await testAsync('sw: image preflight upload failure returns {ok:false} without touching chrome.tabs', async () => {
  const h = makeSwImageSearchCtx({ onUpload: () => Promise.reject(new Error('offline')) });
  const r = await h.invoke({ preflight: true, bytes: LENS_B64, hash: 'deadbeef' });
  assert.equal(r && r.ok, false, 'a failed upload must report failure');
  assert.ok(h.calls.posts.length >= 1, 'an upload attempt must have been made');
  assert.equal(h.calls.created.length, 0);
  assert.equal(h.calls.updates.length, 0);
  assert.equal(h.calls.script, 0);
});

await testAsync('sw: image preflight with a cached result opens no tab and uploads nothing', async () => {
  const h = makeSwImageSearchCtx({ storage: { 'qlensLens:deadbeef': { url: 'https://lens.google.com/ok?cached=1', ts: Date.now() } } });
  const r = await h.invoke({ preflight: true, bytes: LENS_B64, hash: 'deadbeef' });
  assert.equal(r && r.ok, true);
  assert.equal(r.url, 'https://lens.google.com/ok?cached=1');
  assert.equal(h.calls.posts.length, 0, 'a warm cache must not re-upload');
  assert.equal(h.calls.created.length, 0, 'preflight must stay tab-free');
});

await testAsync('sw: preflight:true ignores a url field instead of reaching the fast path', async () => {
  const h = makeSwImageSearchCtx({});
  const r = await h.invoke({ preflight: true, url: 'https://lens.google.com/ok?vsrid=1' });
  // No bytes: intake must fail closed, proving the p.url fast path (gated on
  // !isPreflight) never ran for a preflight message.
  assert.equal(r && r.ok, false);
  assert.equal(h.calls.created.length, 0);
  assert.equal(h.calls.posts.length, 0);
});

await testAsync('sw: a resolved url opens the results tab with zero uploads and no interstitial', async () => {
  const h = makeSwImageSearchCtx({ onUpload: () => Promise.reject(new Error('upload must not run')) });
  const r1 = await h.invoke({ url: 'https://www.google.com/search?vsrid=1', text: 'x' });
  assert.equal(r1 && r1.ok, true);
  assert.equal(h.calls.created.length, 1, 'the results tab is the only tab');
  assert.equal(h.calls.created[0].url, 'https://www.google.com/search?vsrid=1&udm=24&q=x&lns_mode=mu&oq=');
  assert.equal(h.calls.created[0].active, true, 'the results tab is focused on creation');
  assert.equal(h.calls.updates.length, 0, 'no loading page is settled afterwards');
  // A payload that also carries bytes must still prefer the resolved url:
  // nothing may be decoded or uploaded.
  const r2 = await h.invoke({ url: 'https://lens.google.com/ok?vsrid=2', text: 'x', bytes: LENS_B64, hash: 'deadbeef' });
  assert.equal(r2 && r2.ok, true);
  assert.equal(h.calls.created.length, 2);
  assert.equal(h.calls.created[1].url, 'https://lens.google.com/ok?vsrid=2');
  assert.equal(h.calls.posts.length, 0, 'the fast path must not upload');
});

await testAsync('sw: a normal search opens exactly one tab, already on the results page', async () => {
  const h = makeSwImageSearchCtx({});
  const r = await h.invoke({ bytes: LENS_B64, hash: 'deadbeef', text: 't', name: 'x.png' });
  assert.equal(r && r.ok, true);
  assert.equal(h.calls.created.length, 1, 'exactly one tab is opened');
  assert.equal(h.calls.created[0].url, 'https://lens.google.com/ok?vsrid=1', 'a lens.google.com result carries no text rewrite');
  assert.equal(h.calls.created[0].active, true, 'that tab is the one the user lands on');
  assert.deepEqual(h.calls.active, [], 'nothing is focused after the fact');
  assert.equal(h.calls.updates.length, 0, 'no tab is navigated after the fact');
  assert.equal(h.calls.script, 0, 'a working upload needs no page-origin fallback');
  assert.ok(
    h.calls.created.every((t) => !/loading\.html|\/\/www\.google\.com\/?$/.test(String(t.url))),
    'no interstitial page and no Google homepage detour'
  );
});

await testAsync('sw: a resolved url is refused when it is unsafe or not a lens result', async () => {
  const h = makeSwImageSearchCtx({});
  const bad = [
    'javascript:alert(1)',
    'http://evil.com/search',
    'https://lens.google.com/v3/upload',
    'https://lens.google.com.evil.com/',
    'data:text/html,<script>alert(1)</script>'
  ];
  for (const url of bad) {
    const r = await h.invoke({ url, text: 'x' });
    assert.equal(r && r.ok, false, url + ' must fail closed');
  }
  assert.equal(h.calls.created.length, 0, 'no unsafe url may ever be opened');
  assert.equal(h.calls.posts.length, 0);
  assert.equal(h.calls.script, 0);
});

await testAsync('sw: a search joins the running preflight flight instead of double-uploading', async () => {
  let release = null;
  const pending = new Promise((res) => { release = res; });
  const h = makeSwImageSearchCtx({ onUpload: () => pending });
  const p1 = h.invoke({ preflight: true, bytes: LENS_B64, hash: 'deadbeef', name: 'x.png' });
  await flushTicks();
  assert.equal(h.calls.posts.length, 1, 'preflight starts the only upload');
  const n1 = h.invoke({ bytes: LENS_B64, text: 't', name: 'x.png', hash: 'deadbeef' });
  await flushTicks();
  assert.equal(h.calls.posts.length, 1, 'the search must join the flight, not re-upload');
  release({ url: 'https://www.google.com/search?vsrid=9', headers: { get: () => null } });
  const [r1, r2] = await Promise.all([p1, n1]);
  assert.equal(r1 && r1.ok, true);
  assert.equal(r1.url, 'https://www.google.com/search?vsrid=9');
  assert.equal(r2 && r2.ok, true);
  assert.equal(h.calls.posts.length, 1);
  assert.equal(h.calls.created.length, 1, 'only the results tab is created');
  assert.equal(h.calls.created[0].url, 'https://www.google.com/search?vsrid=9&udm=24&q=t&lns_mode=mu&oq=');
  assert.equal(h.calls.updates.length, 0, 'the preflight result opens directly, with no settling step');
  // A follow-up search is served from the session cache with zero uploads.
  const n2 = await h.invoke({ bytes: LENS_B64, text: 't2', hash: 'deadbeef' });
  assert.equal(n2 && n2.ok, true);
  assert.equal(h.calls.posts.length, 1, 'a cached follow-up must not upload');
  assert.equal(h.calls.created.length, 2);
  assert.equal(h.calls.created[1].url, 'https://www.google.com/search?vsrid=9&udm=24&q=t2&lns_mode=mu&oq=');
});

await testAsync('sw: image payload intake rejects empty/oversized/non-base64 payloads', async () => {
  const h = makeSwImageSearchCtx({ onUpload: () => Promise.reject(new Error('must not upload')) });
  const maxB64 = Math.ceil(Q.CONFIG.IMAGE_MAX_BYTES * 4 / 3) + 64;
  const oversize = 'A'.repeat(maxB64 + 1);
  const cases = [
    ['preflight empty', { preflight: true, bytes: '' }],
    ['preflight charset', { preflight: true, bytes: '@@@@', hash: 'deadbeef' }],
    ['preflight undecodable', { preflight: true, bytes: '====', hash: 'deadbeef' }],
    ['preflight oversize', { preflight: true, bytes: oversize, hash: 'deadbeef' }],
    ['normal missing bytes', {}],
    ['normal empty', { bytes: '' }],
    ['normal charset', { bytes: '@@@@' }],
    ['normal oversize', { bytes: oversize }]
  ];
  for (const [label, payload] of cases) {
    const r = await h.invoke(payload);
    assert.equal(r && r.ok, false, label + ' must return {ok:false}');
  }
  assert.equal(h.calls.posts.length, 0, 'nothing may be uploaded for invalid payloads');
  assert.equal(h.calls.created.length, 0);
});

await testAsync('sw: undecodable base64 in a normal search fails closed with no tab activity', async () => {
  const h = makeSwImageSearchCtx({ onUpload: () => Promise.reject(new Error('must not upload')) });
  const r = await h.invoke({ bytes: '====', hash: 'deadbeef', name: 'x.png' });
  assert.equal(r && r.ok, false, 'charset-valid but undecodable base64 must fail closed');
  assert.equal(r.error, 'bad-payload');
  assert.equal(h.calls.created.length, 0, 'no tab may be created for a payload that could not be read');
  assert.equal(h.calls.updates.length, 0, 'no tab may be updated');
  assert.equal(h.calls.remove, 0, 'nothing may be removed');
  assert.equal(h.calls.script, 0, 'the page-origin fallback must not run');
  assert.equal(h.calls.posts.length, 0, 'nothing may be uploaded');
});

await testAsync('sw: an upload that fails leaves no tab open and reports lens-unreachable', async () => {
  const h = makeSwImageSearchCtx({
    onUpload: () => Promise.reject(new Error('offline')),
    onScript: () => [{ result: null }]
  });
  const r = await h.invoke({ bytes: LENS_B64, hash: 'deadbeef', text: 't', name: 'x.png' });
  assert.equal(r && r.ok, false, 'a search that produced no result url must report failure');
  assert.equal(r.error, 'lens-unreachable');
  assert.deepEqual(h.calls.active, [], 'no tab is ever focused on a failed search');
  assert.equal(h.calls.created.length, 1, 'the page-origin upload uses one background helper tab');
  assert.equal(h.calls.created[0].url, 'https://www.google.com/');
  assert.equal(h.calls.created[0].active, false, 'the helper tab is created in the background');
  assert.equal(h.calls.remove, 1, 'the helper tab is closed again');
});

await testAsync('sw: the page-origin helper is focused only once the results url committed', async () => {
  const h = makeSwImageSearchCtx({
    onUpload: () => Promise.reject(new Error('offline')),
    onScript: () => [{ result: 'https://lens.google.com/ok?vsrid=7' }],
    helperLag: 2
  });
  const r = await h.invoke({ bytes: LENS_B64, hash: 'deadbeef', text: '', name: 'x.png' });
  assert.equal(r && r.ok, true);
  assert.equal(h.calls.created.length, 1);
  assert.equal(h.calls.created[0].url, 'https://www.google.com/');
  assert.equal(h.calls.created[0].active, false, 'the helper tab starts in the background');
  assert.equal(h.calls.updates.length, 1);
  assert.equal(h.calls.updates[0].url, 'https://lens.google.com/ok?vsrid=7');
  assert.deepEqual(h.calls.active, [h.calls.created[0].id], 'the helper is activated only after the result was reached');
  assert.equal(h.calls.remove, 0, 'a successful fallback keeps its tab');
  const navAt = h.log.indexOf('update:https://lens.google.com/ok?vsrid=7');
  const activeAt = h.log.indexOf('active:' + h.calls.created[0].id);
  assert.ok(navAt >= 0 && activeAt > navAt, 'the google.com document may never be the visible one');
});

await testAsync('sw: a browser that steals focus for the helper tab gets the view handed back', async () => {
  const h = makeSwImageSearchCtx({
    onUpload: () => Promise.reject(new Error('offline')),
    onScript: () => [{ result: null }],
    browserStealsFocus: true
  });
  const r = await h.invoke({ bytes: LENS_B64, hash: 'deadbeef', text: 't', name: 'x.png' });
  assert.equal(r && r.ok, false);
  const helperId = h.calls.created[0].id;
  assert.ok(h.log.includes('stealFocus:' + helperId), 'the harness modelled the stolen view');
  const restored = await waitFor(() => h.calls.active.includes(h.userTabId), 1500);
  assert.ok(restored, 'the tab the user was on is put back');
  assert.equal(h.calls.active[0], h.userTabId, 'and the helper is never left holding the view');
  assert.equal(h.calls.remove, 1, 'the helper tab is still cleaned up');
});

await testAsync('sw: an upload endpoint caching in the session is never opened as a result', async () => {
  const poisoned = 'https://www.google.com/searchbyimage/upload';
  const h = makeSwImageSearchCtx({ storage: { 'qlensLens:deadbeef': { url: poisoned, ts: Date.now() } } });
  const r = await h.invoke({ bytes: LENS_B64, hash: 'deadbeef', text: 't', name: 'x.png' });
  assert.equal(r && r.ok, true);
  assert.equal(h.calls.posts.length, 1, 'the poisoned cache must not short-circuit the upload');
  assert.equal(h.calls.created.length, 1);
  assert.ok(!String(h.calls.created[0].url).includes('searchbyimage/upload'), 'no visible tab may land on the upload endpoint');
  assert.equal(h.calls.updates.length, 0);
  // The same poisoned entry must also be refused on the preflight path.
  const h2 = makeSwImageSearchCtx({ storage: { 'qlensLens:deadbeef': { url: poisoned, ts: Date.now() } } });
  const r2 = await h2.invoke({ preflight: true, bytes: LENS_B64, hash: 'deadbeef', name: 'x.png' });
  assert.equal(r2 && r2.ok, true);
  assert.notEqual(r2.url, poisoned, 'a poisoned cache entry must be bypassed');
  assert.equal(r2.url, 'https://lens.google.com/ok?vsrid=1');
  assert.equal(h2.calls.posts.length, 1);
  assert.equal(h2.calls.created.length, 0);
});

await testAsync('sw: a fast-path url pointing at an upload endpoint is refused', async () => {
  const h = makeSwImageSearchCtx({ onUpload: () => Promise.reject(new Error('must not upload')) });
  // The alt endpoint is not SW_LENS_UPLOAD, so only the shared predicate
  // stops the fast path from opening an upload endpoint as a "result".
  const r1 = await h.invoke({ url: 'https://www.google.com/searchbyimage/upload', text: 'x' });
  const r2 = await h.invoke({ url: 'https://lens.google.com/v3/upload', text: 'x' });
  assert.equal(r1 && r1.ok, false);
  assert.equal(r2 && r2.ok, false);
  assert.equal(h.calls.created.length, 0, 'no upload endpoint may ever be opened');
  assert.equal(h.calls.posts.length, 0);
  assert.equal(h.calls.script, 0);
});

await testAsync('sw: an in-page result equal to the upload endpoint is rejected and retried', async () => {
  const h = makeSwImageSearchCtx({
    onUpload: () => Promise.reject(new Error('offline')),
    onScript: () => [{ result: 'https://www.google.com/searchbyimage/upload' }]
  });
  const r = await h.invoke({ bytes: LENS_B64, hash: 'deadbeef', text: 't', name: 'x.png' });
  assert.equal(r && r.ok, false, 'an endpoint result is not a result');
  assert.equal(h.calls.script, 3, 'an endpoint result must be rejected all three times');
  const urls = h.calls.created.map((t) => String(t.url)).concat(h.calls.updates.map((u) => String(u.url)));
  assert.ok(urls.every((u) => !u.includes('searchbyimage/upload') && !u.includes('/v3/upload')), 'no tab may navigate to an upload endpoint');
  assert.deepEqual(h.calls.active, [], 'nothing is focused');
  assert.equal(h.calls.remove, 1, 'the helper tab is closed again');
});

/* The in-page uploader runs in Google's page, so it must be self-contained and
   must cover both upload endpoints: measured in Chrome 155, a google.com page
   is refused by /v3/upload while /searchbyimage/upload answers with a 303 that
   lands on the results page. */
const LENS_V3 = 'https://lens.google.com/v3/upload';
const LENS_SBI = 'https://www.google.com/searchbyimage/upload';

// A page-shaped context: the intrinsics plus what a browser page provides, and
// nothing from the service worker. A reference to any SW identifier throws.
function makePageContext(fetchImpl) {
  const sandbox = { URL, atob, FormData, Blob, AbortController, setTimeout, clearTimeout, fetch: fetchImpl };
  return vm.createContext(sandbox);
}

await testAsync('sw: the in-page uploader returns the first endpoint that reaches a result page', async () => {
  const h = makeSwImageSearchCtx({});
  const seen = [];
  h.ctx.fetch = (url) => {
    seen.push(String(url));
    return Promise.resolve({ url: 'https://www.google.com/search?vsrid=inpage&lns_mode=un' });
  };
  const out = await h.ctx.lensUploadFunc(LENS_B64, '', 'x.png', [LENS_V3, LENS_SBI], 50);
  assert.equal(out, 'https://www.google.com/search?vsrid=inpage&lns_mode=un');
  assert.deepEqual(seen, [LENS_V3], 'a first endpoint that works ends the search');
});

await testAsync('sw: the in-page uploader falls through to the alt endpoint', async () => {
  const h = makeSwImageSearchCtx({});
  const seen = [];
  h.ctx.fetch = (url) => {
    seen.push(String(url));
    if (String(url) === LENS_V3) return Promise.reject(new Error('Failed to fetch'));
    return Promise.resolve({ url: 'https://www.google.com/search?vsrid=altpath&udm=26' });
  };
  const out = await h.ctx.lensUploadFunc(LENS_B64, 'q', 'x.png', [LENS_V3, LENS_SBI], 50);
  assert.equal(out, 'https://www.google.com/search?vsrid=altpath&udm=26', 'the alt endpoint must be able to carry the search');
  assert.deepEqual(seen, [LENS_V3, LENS_SBI]);
});

await testAsync('sw: the in-page uploader never reports an upload endpoint as a result', async () => {
  const h = makeSwImageSearchCtx({});
  // Both endpoints answer 200 at their own URL (the dead-end prompt page).
  h.ctx.fetch = (url) => Promise.resolve({ url: String(url) });
  const out = await h.ctx.lensUploadFunc(LENS_B64, '', 'x.png', [LENS_V3, LENS_SBI], 50);
  assert.equal(out, null, 'an endpoint that never redirected is not a result page');
});

await testAsync('sw: the in-page uploader source runs in a bare page context', async () => {
  const h = makeSwImageSearchCtx({});
  assert.equal(typeof h.ctx.lensUploadFunc, 'function', 'the slice must expose lensUploadFunc');
  // Evaluate the serialized source where only page globals exist. Any reference
  // to a service-worker binding would throw here and pass silently in the
  // slice context, which shares the SW's scope.
  const page = makePageContext(() => Promise.resolve({ url: 'https://lens.google.com/ok?vsrid=9' }));
  vm.runInContext('globalThis.__upload = ' + String(h.ctx.lensUploadFunc) + ';', page);
  assert.equal(typeof page.__upload, 'function');
  const out = await page.__upload(LENS_B64, '', 'x.png', [LENS_V3], 50);
  assert.equal(out, 'https://lens.google.com/ok?vsrid=9', 'the uploader must run with page scope alone');
});

await testAsync('sw: the page-origin upload is given both endpoints and a bounded timeout', async () => {
  const h = makeSwImageSearchCtx({
    onUpload: () => Promise.reject(new Error('offline')),
    onScript: () => [{ result: null }]
  });
  await h.invoke({ bytes: LENS_B64, hash: 'deadbeef', text: 't', name: 'x.png' });
  assert.ok(h.calls.scriptArgs.length >= 1, 'the page-origin upload must have run');
  const args = h.calls.scriptArgs[0];
  // Array.from: the args array was built inside the vm context.
  assert.deepEqual(Array.from(args[3]), [LENS_V3, LENS_SBI], 'both upload endpoints are handed to the page');
  assert.equal(typeof args[4], 'number');
  assert.ok(args[4] >= 1000 && args[4] <= 6000, 'each endpoint gets a bounded slice of the search budget');
});

await testAsync('overlay: searchImage sends the resolved url without bytes and keeps the overlay up', async () => {
  const h = makeOverlayImageSearchCtx();
  h.sandbox.attachment = {
    bytes: new Uint8Array([1, 2, 3]), b64: 'AQID', src: 'blob:preview', name: 'x.png',
    mime: 'image/png', hash: 'deadbeef', lensUrl: 'https://lens.google.com/ok?vsrid=1'
  };
  vm.runInContext('searchImage();', h.ctx);
  assert.equal(h.sent.length, 1);
  const msg = h.sent[0];
  assert.equal(msg.type, 'IMAGE_SEARCH');
  assert.equal(msg.payload.url, 'https://lens.google.com/ok?vsrid=1');
  assert.equal(msg.payload.text, 'hello q');
  assert.equal(msg.payload.name, 'x.png');
  assert.equal(msg.payload.mime, 'image/png');
  assert.equal(msg.payload.hash, 'deadbeef');
  assert.equal('bytes' in msg.payload, false, 'the fast path must not ship bytes');
  assert.equal(h.counters.destroyed, 0, 'the overlay stays up until the tab is open');
  assert.deepEqual(h.counters.searching, [true], 'the chip shows a search in progress');
  h.pending[0].resolve({ ok: true });
  await flushTicks();
  assert.equal(h.counters.destroyed, 1, 'a successful reply closes the overlay');
  assert.deepEqual(h.counters.errors, [], 'a successful reply shows no error');
  assert.deepEqual(h.counters.searching, [true], 'the spinner is replaced by the closing overlay');
});

await testAsync('overlay: searchImage falls back to the bytes payload when no resolved url exists', async () => {
  const h = makeOverlayImageSearchCtx();
  h.sandbox.attachment = { bytes: new Uint8Array([1, 2, 3]), b64: 'AQID', src: '', name: 'x.png', mime: 'image/png', hash: 'deadbeef' };
  vm.runInContext('searchImage();', h.ctx);
  const msg = h.sent[0];
  assert.equal(msg.payload.bytes, 'AQID');
  assert.equal(msg.payload.url, undefined);
  assert.equal(msg.payload.text, 'hello q');
  assert.equal(msg.payload.hash, 'deadbeef');
  assert.equal(h.counters.destroyed, 0, 'an unproven search must not close the overlay');
  // Cached b64 missing: the bytes are re-encoded through ImageEngine.
  const h2 = makeOverlayImageSearchCtx();
  h2.sandbox.attachment = { bytes: new Uint8Array([1, 2, 3]), b64: '', src: '', name: 'y.png', mime: 'image/png', hash: 'cafebabe' };
  vm.runInContext('searchImage();', h2.ctx);
  assert.equal(h2.sent[0].payload.bytes, 'ENGINE:3');
});

await testAsync('overlay: a failed image search surfaces in place and keeps the image for a retry', async () => {
  const h = makeOverlayImageSearchCtx();
  const att = { bytes: new Uint8Array([1, 2, 3]), b64: 'AQID', src: '', name: 'x.png', mime: 'image/png', hash: 'deadbeef' };
  h.sandbox.attachment = att;
  vm.runInContext('searchImage();', h.ctx);
  h.pending[0].resolve({ ok: false, error: 'lens-unreachable' });
  await flushTicks();
  assert.equal(h.counters.destroyed, 0, 'a failure must not close the overlay');
  assert.equal(h.sandbox.attachment, att, 'the image stays attached so Enter can retry');
  assert.deepEqual(h.counters.searching, [true, false], 'the spinner stops');
  assert.deepEqual(h.counters.errors, ['Google Lens did not answer. Try again.']);
  // A second Enter retries with the same payload shape.
  vm.runInContext('searchImage();', h.ctx);
  assert.equal(h.sent.length, 2);
  assert.equal(h.sent[1].payload.bytes, 'AQID');
  // A bad payload gets a cause-specific message.
  h.pending[1].resolve({ ok: false, error: 'bad-payload' });
  await flushTicks();
  assert.deepEqual(h.counters.errors.slice(1), ['That image could not be sent to Lens.']);
  // A rejected channel (worker gone) reports the same way.
  vm.runInContext('searchImage();', h.ctx);
  h.pending[2].reject(new Error('port closed'));
  await flushTicks();
  assert.equal(h.counters.destroyed, 0);
  assert.deepEqual(h.counters.errors.slice(2), ['Google Lens did not answer. Try again.']);
});

await testAsync('overlay: fireImagePreflight stores a url only for a matching fresh success', async () => {
  const h = makeOverlayImageSearchCtx();
  const mk = (hash, b64) => ({ bytes: new Uint8Array([1]), b64: b64 === undefined ? 'AQ==' : b64, src: '', name: 'a.png', mime: 'image/png', hash });
  h.sandbox.attachment = mk('aaaa1111');
  vm.runInContext('fireImagePreflight();', h.ctx);
  assert.equal(h.sent.length, 1);
  assert.equal(h.sent[0].payload.preflight, true);
  assert.equal(h.sent[0].payload.bytes, 'AQ==');
  assert.equal(h.sent[0].payload.hash, 'aaaa1111');
  assert.equal('text' in h.sent[0].payload, false, 'preflight must not commit to a query');
  assert.equal('url' in h.sent[0].payload, false);
  // Stale reply: the attachment was replaced before the response landed.
  h.sandbox.attachment = mk('bbbb2222');
  h.pending[0].resolve({ ok: true, url: 'https://lens.google.com/ok?stale=1' });
  await flushTicks();
  assert.equal(vm.runInContext('attachment.lensUrl || ""', h.ctx), '', 'a stale hash reply must be dropped');
  // Failure and malformed replies are dropped too.
  h.sandbox.attachment = mk('aaaa1111');
  vm.runInContext('fireImagePreflight();', h.ctx);
  h.pending[1].resolve({ ok: false });
  await flushTicks();
  assert.equal(vm.runInContext('attachment.lensUrl || ""', h.ctx), '', 'ok:false must not store a url');
  vm.runInContext('fireImagePreflight();', h.ctx);
  h.pending[2].resolve({ ok: true, url: '' });
  await flushTicks();
  assert.equal(vm.runInContext('attachment.lensUrl || ""', h.ctx), '', 'empty url must not be stored');
  vm.runInContext('fireImagePreflight();', h.ctx);
  h.pending[3].resolve({ ok: true, url: 123 });
  await flushTicks();
  assert.equal(vm.runInContext('attachment.lensUrl || ""', h.ctx), '', 'non-string url must not be stored');
  // Matching success is stored.
  vm.runInContext('fireImagePreflight();', h.ctx);
  h.pending[4].resolve({ ok: true, url: 'https://lens.google.com/ok?vsrid=7' });
  await flushTicks();
  assert.equal(vm.runInContext('attachment.lensUrl || ""', h.ctx), 'https://lens.google.com/ok?vsrid=7');
  // Missing b64 or hash: nothing is sent at all.
  const sentBefore = h.sent.length;
  h.sandbox.attachment = mk('', '');
  vm.runInContext('fireImagePreflight();', h.ctx);
  h.sandbox.attachment = mk('', 'AQ==');
  vm.runInContext('fireImagePreflight();', h.ctx);
  assert.equal(h.sent.length, sentBefore);
});

test('overlay: light-scheme CSS never overrides an explicit dark theme', () => {
  const src = readFileSync(join(ROOT, 'src/content/overlay.js'), 'utf8');
  assert.ok(
    src.includes(':host:not([data-theme="dark"]):not([data-theme="light"])'),
    'system-light tokens must yield to both explicit themes'
  );
  assert.ok(
    !/@media \(prefers-color-scheme: light\) \{\s*:host \{/.test(src),
    'a bare :host light block would repaint an explicit dark theme'
  );
});

test('overlay: drop path tolerates a missing ImageEngine', () => {
  const src = readFileSync(join(ROOT, 'src/content/overlay.js'), 'utf8');
  const start = src.indexOf('  function onDrop(e) {');
  const end = src.indexOf('  function onPaste(e) {', start);
  assert.ok(start > 0 && end > start, 'onDrop anchors must exist');
  const block = src.slice(start, end);
  assert.ok(block.includes('typeof QLENS.ImageEngine.isImageFileLike'), 'ImageEngine must be feature-detected');
  assert.ok(!block.includes('QLENS.ImageEngine.isImageFileLike(picked)'), 'no unguarded ImageEngine call');
});

test('overlay: caret measurement mirrors the input font', () => {
  const src = readFileSync(join(ROOT, 'src/content/overlay.js'), 'utf8');
  const start = src.indexOf('  function ensureMeasureEl() {');
  const end = src.indexOf('  function updateCaret() {', start);
  assert.ok(start > 0 && end > start, 'ensureMeasureEl anchors must exist');
  assert.ok(src.slice(start, end).includes('getComputedStyle(inputEl)'), 'measure element must follow computed metrics');
});

test('a11y: single-select groups use radio semantics consistently', () => {
  const optionsHtml = readFileSync(join(ROOT, 'src/options/options.html'), 'utf8');
  const segLines = optionsHtml.split(/\r?\n/).filter((l) => l.includes('class="seg-btn"'));
  assert.ok(segLines.length >= 5, 'theme + context segmented buttons exist');
  for (const line of segLines) assert.ok(line.includes('role="radio"'), 'segmented buttons must be radios: ' + line.trim());
  const popupHtml = readFileSync(join(ROOT, 'src/popup/popup.html'), 'utf8');
  const popupJs = readFileSync(join(ROOT, 'src/popup/popup.js'), 'utf8');
  assert.ok(!popupHtml.includes('aria-pressed'), 'popup markup must not mix pressed with radio semantics');
  assert.ok(!popupJs.includes('aria-pressed'), 'popup script must not mix pressed with radio semantics');
});

test('options: reset re-renders every settings-derived surface', () => {
  const src = readFileSync(join(ROOT, 'src/options/options.js'), 'utf8');
  const start = src.indexOf("$('reset-all').addEventListener");
  const end = src.indexOf("showToast('Reset to defaults')", start);
  assert.ok(start > 0 && end > start, 'reset handler anchors must exist');
  const block = src.slice(start, end);
  for (const call of ['renderFavList()', 'renderEngList()', 'renderDefaultEngines()', 'showShortcut()', 'updateEdgeCollapseUI', 'updateMastStats()']) {
    assert.ok(block.includes(call), 'reset must refresh ' + call);
  }
});

function makeOverlayOpenTabCtx(reply) {
  const counters = { destroyed: 0, shows: [], errors: [] };
  const sent = [];
  const src = readFileSync(join(ROOT, 'src/content/overlay.js'), 'utf8');
  const s = src.indexOf('  function openTab(url, query, engine) {');
  const e = src.indexOf('  function show(payload) {', s);
  assert.ok(s > 0 && e > s, 'overlay openTab anchors must exist');
  const sandbox = {
    host: null,
    destroy: () => { counters.destroyed++; sandbox.host = null; },
    show: (payload) => { counters.shows.push(payload); sandbox.host = {}; },
    showError: (m) => counters.errors.push(String(m)),
    QLENS: {
      MSG: { OPEN_TAB: 'OPEN_TAB' },
      isSafeHttpUrl: (u) => /^https?:\/\//.test(String(u))
    },
    chrome: {
      runtime: {
        sendMessage: (msg) => {
          sent.push(msg);
          return reply ? reply(msg) : Promise.resolve({ ok: true });
        }
      }
    }
  };
  const ctx = vm.createContext(sandbox);
  vm.runInContext(src.slice(s, e), ctx, { filename: 'overlay.openTab.js' });
  return { ctx, counters, sent, sandbox };
}

await testAsync('overlay: openTab refuses an unsafe URL without tearing the overlay down', async () => {
  const h = makeOverlayOpenTabCtx();
  vm.runInContext('openTab("javascript:alert(1)", "cats", null);', h.ctx);
  await flushTicks();
  assert.equal(h.counters.destroyed, 0);
  assert.equal(h.sent.length, 0);
});

await testAsync('overlay: openTab destroys before dispatch and keeps the payload contract', async () => {
  const h = makeOverlayOpenTabCtx();
  vm.runInContext('openTab("https://www.google.com/search?q=cats", "cats", "google");', h.ctx);
  assert.equal(h.counters.destroyed, 1, 'destroy happens synchronously before the message');
  assert.equal(h.sent.length, 1);
  assert.equal(h.sent[0].type, 'OPEN_TAB');
  assert.equal(h.sent[0].payload.url, 'https://www.google.com/search?q=cats');
  assert.equal(h.sent[0].payload.query, 'cats');
  assert.equal(h.sent[0].payload.engine, 'google');
  assert.equal(Object.keys(h.sent[0].payload).join(','), 'url,query,engine');
  await flushTicks();
  assert.equal(h.counters.errors.length, 0);
  assert.equal(h.counters.shows.length, 0);
});

await testAsync('overlay: a refused OPEN_TAB reopens with the query and an error', async () => {
  const h = makeOverlayOpenTabCtx(() => Promise.resolve({ ok: false }));
  vm.runInContext('openTab("https://www.google.com/search?q=cats", "cats", "google");', h.ctx);
  await flushTicks();
  assert.equal(h.counters.destroyed, 1);
  assert.equal(h.counters.shows.length, 1, 'the overlay must come back instead of failing silently');
  assert.equal(h.counters.shows[0].query, 'cats');
  assert.equal(Object.keys(h.counters.shows[0]).join(','), 'query');
  assert.equal(h.counters.errors[0], 'Could not open a new tab.');
});

await testAsync('overlay: a rejected OPEN_TAB reopens with the query and an error', async () => {
  const h = makeOverlayOpenTabCtx(() => Promise.reject(new Error('receiving end does not exist')));
  vm.runInContext('openTab("https://www.google.com/search?q=cats", "cats", "google");', h.ctx);
  await flushTicks();
  assert.equal(h.counters.shows.length, 1);
  assert.equal(h.counters.shows[0].query, 'cats');
  assert.equal(h.counters.errors[0], 'Could not open a new tab.');
});

await testAsync('overlay -> sw: captured payloads satisfy the shared contract end to end', async () => {
  const oh = makeOverlayImageSearchCtx();
  oh.sandbox.attachment = { bytes: new Uint8Array([0x89, 0x50, 0x4e, 0x47]), b64: 'iVBORw==', src: '', name: 'a.png', mime: 'image/png', hash: 'cafebabe' };
  vm.runInContext('fireImagePreflight();', oh.ctx);
  const sh = makeSwImageSearchCtx({});
  const pr = await sh.invoke(oh.sent[0].payload);
  assert.equal(pr && pr.ok, true, 'the SW must accept the overlay preflight payload');
  assert.equal(pr.url, 'https://lens.google.com/ok?vsrid=1');
  assert.equal(sh.calls.posts.length, 1);
  assert.equal(sh.calls.created.length, 0);
  const oh2 = makeOverlayImageSearchCtx();
  oh2.sandbox.attachment = { bytes: new Uint8Array([1]), b64: 'AQ==', src: '', name: 'b.png', mime: 'image/png', hash: 'cafebabe', lensUrl: pr.url };
  vm.runInContext('searchImage();', oh2.ctx);
  const sh2 = makeSwImageSearchCtx({ onUpload: () => Promise.reject(new Error('must not upload')) });
  const sr = await sh2.invoke(oh2.sent[0].payload);
  assert.equal(sr && sr.ok, true);
  assert.equal(sh2.calls.created.length, 1, 'the resolved url opens the tab directly');
  assert.equal(sh2.calls.created[0].active, true);
  assert.equal(sh2.calls.posts.length, 0);
  assert.equal(sh2.calls.updates.length, 0, 'the results tab needs no settling step');
  oh2.pending[0].resolve(sr);
  await flushTicks();
  assert.equal(oh2.counters.destroyed, 1, 'the overlay closes only after the tab is open');
});

await testAsync('sw: the trigger for the resolved-url payload opens no loading page and no homepage', async () => {
  // The user-visible complaint: a search must not visit google.com and then
  // re-query. Assert the exact tab sequence for the three arrival paths.
  const direct = makeSwImageSearchCtx({ uploadUrl: 'https://www.google.com/search?vsrid=1' });
  await direct.invoke({ bytes: LENS_B64, hash: 'h1', text: 'q', name: 'a.png' });
  assert.deepEqual(
    direct.calls.created.map((t) => t.url),
    ['https://www.google.com/search?vsrid=1&udm=24&q=q&lns_mode=mu&oq='],
    'one tab, already on the results url'
  );
  const preflighted = makeSwImageSearchCtx({ uploadUrl: 'https://www.google.com/search?vsrid=1' });
  const p = await preflighted.invoke({ preflight: true, bytes: LENS_B64, hash: 'h2', name: 'a.png' });
  await preflighted.invoke({ url: p.url, text: 'q', hash: 'h2', name: 'a.png' });
  assert.deepEqual(
    preflighted.calls.created.map((t) => t.url),
    ['https://www.google.com/search?vsrid=1&udm=24&q=q&lns_mode=mu&oq='],
    'the preflighted search lands on the results url too'
  );
  assert.equal(preflighted.calls.updates.length, 0, 'nothing is navigated into place');
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
await testAsync('storage: legacy launcher setting is dropped', async () => {
  loadWithChromeStub('src/shared/storage.js', {});
  const s = await Q.storage.getSettings();
  assert.equal('launcher' in s, false);
  loadWithChromeStub('src/shared/storage.js', { settings: { launcher: { enabled: true, tabs: true, history: true, maxResults: 99 } } });
  const s2 = await Q.storage.getSettings();
  assert.equal('launcher' in s2, false);
  assert.equal(s2.theme, 'system');
  loadWithChromeStub('src/shared/storage.js', {});
  const s3 = await Q.storage.setSettings({ launcher: { enabled: true } });
  assert.equal('launcher' in s3, false);
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
  assert.equal(Q.buildCombo({ ctrlKey: true }, ' ', 'Space'), 'Ctrl+Space');
  assert.equal(Q.buildCombo({ ctrlKey: true, shiftKey: true }, ' ', 'Space'), 'Ctrl+Shift+Space');
  assert.equal(Q.buildCombo({ ctrlKey: true }, 'Enter', 'Enter'), 'Ctrl+Enter');
  assert.equal(Q.buildCombo({ ctrlKey: true }, '/', 'Slash'), 'Ctrl+/');
  assert.equal(Q.buildCombo({ ctrlKey: true, shiftKey: true }, '!', 'Digit1'), 'Ctrl+Shift+1');
  assert.equal(Q.buildCombo({ ctrlKey: true }, '`', 'Backquote'), 'Ctrl+`');
});
test('combo: buildCombo rejects invalid keys', () => {
  assert.equal(Q.buildCombo({ ctrlKey: true }, 'Control', 'ControlLeft'), null);
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
  assert.equal(Q.matchesCombo({ ctrlKey: true, key: ' ', code: 'Space' }, 'Ctrl+Space'), true);
  assert.equal(Q.matchesCombo({ ctrlKey: true, key: 'Enter', code: 'Enter' }, 'Ctrl+Enter'), true);
  assert.equal(Q.matchesCombo({ ctrlKey: true, key: '/', code: 'Slash' }, 'Ctrl+/'), true);
  assert.equal(Q.matchesCombo({ ctrlKey: true, shiftKey: true, key: '!', code: 'Digit1' }, 'Ctrl+Shift+1'), true);
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
  assert.equal(Q.isValidCombo('Ctrl+Space'), true);
  assert.equal(Q.isValidCombo('Ctrl+Enter'), true);
  assert.equal(Q.isValidCombo('Ctrl+/'), true);
  assert.equal(Q.isValidCombo('Ctrl+Shift+1'), true);
  assert.equal(Q.isValidCombo('Shift+K'), false);
  assert.equal(Q.isValidCombo('K'), false);
  assert.equal(Q.isValidCombo('Ctrl+Ctrl+K'), false);
  assert.equal(Q.isValidCombo('Ctrl+ArrowUp'), false);
  assert.equal(Q.isValidCombo('Ctrl+'), false);
  assert.equal(Q.isValidCombo(''), false);
  assert.equal(Q.isValidCombo('Ctrl+Meta+K'), false);
});
test('combo: reservedComboReason flags browser-owned combos', () => {
  assert.equal(Q.reservedComboReason('Ctrl+Shift+K'), null);
  assert.equal(Q.reservedComboReason('Ctrl+Shift+Space'), null);
  assert.equal(Q.reservedComboReason('Ctrl+Space'), null);
  assert.equal(Q.reservedComboReason('Ctrl+Alt+Q'), null);
  assert.ok(Q.reservedComboReason('Ctrl+K'));
  assert.ok(Q.reservedComboReason('Ctrl+T'));
  assert.ok(Q.reservedComboReason('Ctrl+Shift+J'));
  assert.ok(Q.reservedComboReason('Ctrl+1'));
  if (!Q.isMacPlatform()) {
    assert.ok(Q.reservedComboReason('Alt+Space'));
  }
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
test('audit: lone surrogate query never throws (builtin + custom)', () => {
  const lone = 'x ';
  assert.doesNotThrow(() => Q.buildSearchUrl('google', lone));
  const url = Q.buildSearchUrl('google', lone);
  assert.ok(typeof url === 'string' && url.startsWith('https://www.google.com/search?q='));
  const custom = { id: 't', name: 'T', url: 'https://ok.com/?a={q}&b={q}', bang: 't' };
  assert.doesNotThrow(() => Q.buildCustomSearchUrl(custom, lone));
  assert.ok(String(Q.buildCustomSearchUrl(custom, lone)).includes('a='));
});
test('audit: multi-{q} validation matches ship behavior', () => {
  const multi = { id: 'm', name: 'M', url: 'https://ok.com/?a={q}&b={q}', bang: 'm' };
  assert.equal(Q.isValidCustomEngine(multi), true);
  assert.equal(Q.buildCustomSearchUrl(multi, 'x y'), 'https://ok.com/?a=x%20y&b=x%20y');
});
test('audit: detectSmartUrl keeps balanced parens, strips unbalanced', () => {
  assert.equal(Q.detectSmartUrl('wikipedia.org/wiki/X_(disambiguation)'), 'https://wikipedia.org/wiki/X_(disambiguation)');
  assert.equal(Q.detectSmartUrl('example.com/foo_(bar'), 'https://example.com/foo_(bar');
  assert.equal(Q.detectSmartUrl('example.com/foo)'), 'https://example.com/foo');
});
test('audit: bareHost strips port + credentials', () => {
  assert.equal(Q.bareHost('https://www.google.com:8080/'), 'google.com');
  assert.equal(Q.bareHost('https://user@www.google.com/'), 'google.com');
  assert.equal(Q.bareHost('https://google.evil.com/search?q=x'), 'google.evil.com');
});
test('audit: isValidCombo rejects never-firing modifiers off-Mac', () => {
  assert.equal(Q.isValidCombo('MacCtrl+K'), false);
  assert.equal(Q.isValidCombo('Ctrl+MacCtrl+K'), false);
  if (!Q.isMacPlatform()) {
    assert.equal(Q.isValidCombo('Command+K'), false);
  } else {
    assert.equal(Q.isValidCombo('Command+K'), true);
  }
  assert.equal(Q.isValidCombo('Ctrl+Shift+K'), true);
});
test('audit: selection truncate never splits surrogate pairs', () => {
  const emoji = '😀'.repeat(300);
  const out = Q.Selection.truncate(emoji, 200);
  assert.equal(Array.from(out.replace(/…$/, '')).length, 200);
  assert.equal(out.endsWith('…'), true);
  assert.doesNotThrow(() => encodeURIComponent(out.replace(/…$/, '')));
});
test('audit: image caps derive from config + filename strips new exts', () => {
  assert.ok(Q.ImageEngine.buildLensFilename('photo.avif', 'image/avif').endsWith('.avif'));
  assert.ok(Q.ImageEngine.buildLensFilename('photo.avif.avif', 'image/avif').endsWith('.avif'));
  assert.ok(!Q.ImageEngine.buildLensFilename('photo.avif.avif', 'image/avif').endsWith('.avif.avif'));
  assert.ok(Q.ImageEngine.buildLensFilename('pic.heic', 'image/heic').endsWith('.heic'));
  assert.ok(Q.ImageEngine.buildLensFilename('pic.svg', 'image/svg+xml').endsWith('.png'));
});
await testAsync('audit: engineIds falls back without ENGINES (lean context)', async () => {
  const keep = Q.ENGINES;
  try {
    delete Q.ENGINES;
    loadScript('src/shared/storage.js');
    assert.doesNotThrow(() => Q.storage.getSettings());
  } finally {
    if (keep) Q.ENGINES = keep;
    loadScript('src/shared/storage.js');
  }
  const s = await Q.storage.getSettings();
  assert.ok(Array.isArray(s.engineOrder) && s.engineOrder.includes('google'));
});
await testAsync('audit: setSettings serializes concurrent patches', async () => {
  const area = loadWithChromeStub('src/shared/config.js');
  loadWithChromeStub('src/shared/engines.js');
  loadWithChromeStub('src/shared/async.js');
  loadWithChromeStub('src/shared/storage.js');
  void area;
  const p1 = Q.storage.setSettings({ theme: 'dark' });
  const p2 = Q.storage.setSettings({ accent: 'rose' });
  const [s1, s2] = await Promise.all([p1, p2]);
  // s1 ran first (theme only); the serialized s2 must carry both patches —
  // without the queue, p2's stale read would have clobbered p1's theme.
  assert.equal(s1.theme, 'dark');
  assert.equal(s2.theme, 'dark');
  assert.equal(s2.accent, 'rose');
});
await testAsync('audit: getLastEngine uses memory cache + pre-fetched settings', async () => {
  loadWithChromeStub('src/shared/config.js');
  loadWithChromeStub('src/shared/engines.js');
  loadWithChromeStub('src/shared/async.js');
  loadWithChromeStub('src/shared/storage.js', { lastEngine: 'brave' });
  assert.equal(await Q.storage.getLastEngine(), 'brave');
  assert.equal(await Q.storage.getLastEngine({ customEngines: [], defaultEngine: 'bing', engineOrder: ['bing'] }), 'brave');
});
test('audit: overlay font readiness checks loaded faces, not document.fonts.check', () => {
  const src = readFileSync(join(ROOT, 'src/content/overlay.js'), 'utf8');
  const start = src.indexOf('async function applyFonts()');
  const end = src.indexOf('const load = async () =>', start);
  assert.ok(start > 0 && end > start, 'overlay applyFonts anchors must exist');
  const slice = src.slice(start, end);
  // check() reports true for any unknown family (the browser can always fall
  // back), so it can never tell us whether 'QLens Inter' is actually present.
  assert.ok(!slice.includes('document.fonts.check('), 'applyFonts must not use document.fonts.check()');
  assert.ok(slice.includes('document.fonts.forEach'), 'applyFonts must inspect FontFaceSet entries');
  assert.ok(slice.includes("face.status === 'loaded'"), 'only loaded faces count as present');
  assert.ok(slice.includes('INTER_FAMILY'), 'the presence test must be scoped to the bundled family');
});

console.log('\n' + results.pass + ' passed, ' + results.fail + ' failed');
if (results.fail > 0) {
  for (const f of results.failures) console.log('\nFAILED: ' + f.name + '\n  ' + f.err.stack);
  process.exit(1);
}
