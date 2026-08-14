import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import assert from 'node:assert/strict';

const ROOT = decodeURIComponent(new URL('../..', import.meta.url).pathname).replace(/^\/([A-Za-z]:)\//, '$1/');
const results = { pass: 0, fail: 0, failures: [] };

function loadScript(relPath) {
  const code = readFileSync(join(ROOT, relPath), 'utf8');
  (0, eval)(code);
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
test('engines: quick modes build correct URLs', () => {
  assert.equal(Q.buildSearchUrl('google', 'cats', 'images'), 'https://www.google.com/search?tbm=isch&q=cats');
  assert.equal(Q.buildSearchUrl('google', 'cats', 'videos'), 'https://www.google.com/search?tbm=vid&q=cats');
  assert.equal(Q.buildSearchUrl('google', 'cats', 'news'), 'https://news.google.com/search?q=cats');
  assert.equal(Q.buildSearchUrl('google', 'cats', 'yt'), 'https://www.youtube.com/results?search_query=cats');
  assert.equal(Q.buildSearchUrl('google', 'cats', 'wiki'), 'https://en.wikipedia.org/w/index.php?search=cats');
});
test('engines: empty query returns null', () => {
  assert.equal(Q.buildSearchUrl('google', '   '), null);
  assert.equal(Q.buildSearchUrl('google', ''), null);
  assert.equal(Q.buildSearchUrl('google', null), null);
});
test('engines: unknown engine falls back to default', () => {
  assert.equal(Q.buildSearchUrl('bogus', 'x'), 'https://www.google.com/search?q=x');
});
test('engines: bogus mode falls back to engine search', () => {
  assert.equal(Q.buildSearchUrl('google', 'x', 'bogusmode'), 'https://www.google.com/search?q=x');
});
test('engines: suggest urls', () => {
  assert.equal(Q.suggestUrlFor('google', 'c'), 'https://suggestqueries.google.com/complete/search?client=firefox&q=c');
  assert.equal(Q.suggestUrlFor('brave', 'c'), 'https://suggestqueries.google.com/complete/search?client=firefox&q=c');
  assert.equal(Q.suggestUrlFor('bing', 'c'), 'https://api.bing.com/osjson.aspx?query=c');
  assert.equal(Q.suggestUrlFor('duckduckgo', 'c'), 'https://duckduckgo.com/ac/?q=c');
});
test('engines: prefix parse engine', () => {
  assert.deepEqual(Q.parsePrefix('b cats'), { type: 'engine', id: 'brave', rest: 'cats' });
  assert.deepEqual(Q.parsePrefix('k cats'), { type: 'engine', id: 'bing', rest: 'cats' });
  assert.deepEqual(Q.parsePrefix('d cats'), { type: 'engine', id: 'duckduckgo', rest: 'cats' });
  assert.deepEqual(Q.parsePrefix('g cats'), { type: 'engine', id: 'google', rest: 'cats' });
});
test('engines: prefix parse modes', () => {
  assert.deepEqual(Q.parsePrefix('images: cats'), { type: 'mode', id: 'images', rest: 'cats' });
  assert.deepEqual(Q.parsePrefix('wiki:cats'), { type: 'mode', id: 'wiki', rest: 'cats' });
  assert.deepEqual(Q.parsePrefix('yt: flutter'), { type: 'mode', id: 'yt', rest: 'flutter' });
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
test('engines: isSafeHttpUrl allowlist', () => {
  assert.equal(Q.isSafeHttpUrl('https://ok.com'), true);
  assert.equal(Q.isSafeHttpUrl('http://ok.com'), true);
  assert.equal(Q.isSafeHttpUrl('javascript:alert(1)'), false);
  assert.equal(Q.isSafeHttpUrl('data:text/html,x'), false);
  assert.equal(Q.isSafeHttpUrl('chrome://extensions'), false);
  assert.equal(Q.isSafeHttpUrl('not a url'), false);
  assert.equal(Q.isSafeHttpUrl(null), false);
});
test('manifest: required fields present', () => {
  const m = JSON.parse(readFileSync(join(ROOT, 'manifest.json'), 'utf8'));
  assert.equal(m.manifest_version, 3);
  assert.equal(m.minimum_chrome_version, '109');
  assert.ok(m.permissions.includes('scripting'));
  assert.ok(m.permissions.includes('storage'));
  assert.ok(m.permissions.includes('contextMenus'));
  assert.ok(Array.isArray(m.host_permissions) && m.host_permissions.length === 2);
  assert.ok(m.background.service_worker.endsWith('.js'));
  assert.ok(m.commands['open-quick-search']);
  assert.equal(typeof m.commands['open-quick-search'].suggested_key.default, 'string');
  assert.ok(m.options_page.endsWith('.html'));
  for (const s of [16, 32, 48, 128]) {
    const p = join(ROOT, m.icons[String(s)]);
    assert.ok(statSync(p).size > 0, 'icon ' + s + ' exists');
  }
});
test('manifest: every referenced file exists', () => {
  const m = JSON.parse(readFileSync(join(ROOT, 'manifest.json'), 'utf8'));
  const refs = [m.background.service_worker, m.options_page, ...Object.values(m.icons)];
  for (const rel of refs) {
    assert.ok(statSync(join(ROOT, rel)).isFile(), 'missing ' + rel);
  }
  for (const rel of Q.CONTENT_FILES) {
    assert.ok(statSync(join(ROOT, rel)).isFile(), 'missing content file ' + rel);
  }
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
await testAsync('storage: setSettings merges patch', async () => {
  const area = loadWithChromeStub('src/shared/storage.js', {});
  await Q.storage.setSettings({ theme: 'dark' });
  const s = await Q.storage.getSettings();
  assert.equal(s.theme, 'dark');
  assert.equal(s.defaultEngine, 'google');
  const raw = await area.get('settings');
  assert.equal(raw.settings.theme, 'dark');
});
await testAsync('storage: recent dedupe + cap 10', async () => {
  loadWithChromeStub('src/shared/storage.js', {});
  for (let i = 1; i <= 12; i++) await Q.storage.addRecent('query' + i, 'google');
  await Q.storage.addRecent('QUERY5', 'brave');
  const rec = await Q.storage.getRecent();
  assert.equal(rec.length, 10);
  assert.equal(rec[0].query, 'QUERY5');
  assert.equal(rec[0].engine, 'brave');
  assert.equal(rec.filter((r) => r.query === 'query5' || r.query === 'QUERY5').length, 1);
});
await testAsync('storage: recent removes + clears', async () => {
  const area = loadWithChromeStub('src/shared/storage.js', {});
  await Q.storage.addRecent('a', 'google');
  await Q.storage.addRecent('b', 'bing');
  await Q.storage.removeRecent('a');
  let rec = await Q.storage.getRecent();
  assert.deepEqual(rec.map((r) => r.query), ['b']);
  await Q.storage.clearRecent();
  rec = await Q.storage.getRecent();
  assert.deepEqual(rec, []);
  assert.equal(area.backing.size, 0);
});
await testAsync('storage: corrupted recent sanitized', async () => {
  loadWithChromeStub('src/shared/storage.js', { recent: [{ query: 42, engine: 'x', ts: 'bad' }, null, 'junk'] });
  const rec = await Q.storage.getRecent();
  assert.deepEqual(rec, []);
});
await testAsync('storage: last engine falls back to default', async () => {
  loadWithChromeStub('src/shared/storage.js', { lastEngine: 'bogus' });
  const e = await Q.storage.getLastEngine();
  assert.equal(e, 'google');
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

console.log('\n' + results.pass + ' passed, ' + results.fail + ' failed');
if (results.fail > 0) {
  for (const f of results.failures) console.log('\nFAILED: ' + f.name + '\n  ' + f.err.stack);
  process.exit(1);
}