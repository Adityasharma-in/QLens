import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import assert from 'node:assert/strict';

const ROOT = decodeURIComponent(new URL('../..', import.meta.url).pathname).replace(/^\/([A-Za-z]:)\//, '$1/');
const results = { pass: 0, fail: 0, failures: [] };
const textDecoder = new TextDecoder();

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
test('engines: mode wins over ai', () => {
  assert.equal(
    Q.buildSearchUrl('google', 'cats', 'images', true),
    'https://www.google.com/search?tbm=isch&q=cats'
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
test('lens: empty text body structure', () => {
  const b = Q.lensUploadBody('aGVsbG8=', '', 'f.png', 'qlb');
  const s = textDecoder.decode(b);
  assert.equal(s.startsWith('--qlb\r\n'), true);
  assert.ok(s.includes('name="encoded_image"; filename="f.png"'));
  assert.ok(s.includes('name="image_content"\r\n\r\n'));
  assert.ok(s.endsWith('--qlb--\r\n'));
});
test('lens: non-empty text goes to image_content', () => {
  const b = Q.lensUploadBody('aGVsbG8=', 'red car', 'f.png', 'qlb');
  const s = textDecoder.decode(b);
  assert.ok(s.includes('red car'), 'typed text present as image_content');
});
test('lens: decodes base64 into binary encoded_image content', () => {
  const b = Q.lensUploadBody('aGVsbG8=', '', 'f.png', 'qqq');
  const s = textDecoder.decode(b);
  const marker = s.indexOf('hello');
  assert.ok(marker > 0, 'decoded "hello" bytes embedded (no loss)');
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
  assert.deepEqual(cs.js, Q.CONTENT_FILES, 'content_scripts js matches CONTENT_FILES (overlay before injector)');
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
await testAsync('storage: last engine falls back to default', async () => {
  loadWithChromeStub('src/shared/storage.js', { lastEngine: 'bogus' });
  const e = await Q.storage.getLastEngine();
  assert.equal(e, 'google');
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

console.log('\n' + results.pass + ' passed, ' + results.fail + ' failed');
if (results.fail > 0) {
  for (const f of results.failures) console.log('\nFAILED: ' + f.name + '\n  ' + f.err.stack);
  process.exit(1);
}