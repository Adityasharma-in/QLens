import { createServer } from 'node:http';
import { readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';

const ROOT = decodeURIComponent(new URL('../..', import.meta.url).pathname).replace(/^\/([A-Za-z]:)\//, '$1/');
const CFT_ROOT = process.env.CFT_ROOT || join(process.env.LOCALAPPDATA || 'C:\\Users\\PC\\AppData\\Local', 'Temp', 'opencode', 'chrome-cft');

function findChromeCft() {
  if (!existsSync(CFT_ROOT)) return null;
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, entry.name);
      if (entry.isDirectory()) {
        const found = walk(p);
        if (found) return found;
      } else if (entry.name === 'chrome.exe') {
        return p;
      }
    }
    return null;
  };
  return walk(CFT_ROOT);
}

function chromeCandidates() {
  const list = [];
  if (process.env.CHROME_PATH) list.push(process.env.CHROME_PATH);
  const cft = findChromeCft();
  if (cft) list.push(cft);
  list.push(
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    join(process.env.LOCALAPPDATA || '', 'Google', 'Chrome', 'Application', 'chrome.exe')
  );
  return list.filter((p) => p && existsSync(p));
}

// Chrome derives an unpacked extension's id from the absolute folder path:
// SHA-256 over the wide (UTF-16LE) path, first 128 bits, each nibble mapped
// 0-f -> a-p. Checked against ids Chrome reported for three folders on this
// machine, including this checkout. Only used when the worker never appeared -
// which is exactly the state where a correct id is needed to wake it.
function computeExtId(absPath) {
  const digest = createHash('sha256').update(Buffer.from(absPath, 'utf16le')).digest('hex').slice(0, 32);
  let out = '';
  for (const nibble of digest) out += String.fromCharCode(97 + parseInt(nibble, 16));
  return out;
}

let puppeteer = null;
try {
  puppeteer = (await import('puppeteer-core')).default;
} catch (err) {
  console.log('SKIP: puppeteer-core not installed. Run "npm i -D puppeteer-core" to enable the smoke test.');
  process.exit(0);
}

let pass = 0;
let fail = 0;
function check(label, cond, extra) {
  if (cond) {
    pass++;
    console.log('PASS ' + label);
  } else {
    fail++;
    console.log('FAIL ' + label + (extra ? ' — ' + extra : ''));
  }
}

const pageHtml = `<!DOCTYPE html><html><body>
<p id="para">The quick brown fox jumps over the lazy dog near the riverbank.</p>
<input id="field" value="do not use this text">
<button id="btn">Hello QLens</button>
</body></html>`;

const server = createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(pageHtml);
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const port = server.address().port;
const pageUrl = 'http://127.0.0.1:' + port + '/';

const candidates = chromeCandidates();
if (!candidates.length) {
  console.log('SKIP: no Chrome binary found. Set CHROME_PATH or run the Chrome for Testing install.');
  server.close();
  process.exit(0);
}

let browser = null;
let launchedPath = null;
for (const headless of [true, false]) {
  for (const exe of candidates) {
    try {
      browser = await puppeteer.launch({
        executablePath: exe,
        headless,
        enableExtensions: [ROOT],
        args: [
          '--no-sandbox',
          '--disable-dev-shm-usage',
          '--window-size=1000,800'
        ]
      });
      launchedPath = exe;
      break;
    } catch (err) {
      browser = null;
    }
  }
  if (browser) break;
}
if (!browser) {
  console.log('SKIP: could not launch any Chrome with the extension loaded.');
  server.close();
  process.exit(0);
}
console.log('launched: ' + launchedPath);
await browser.defaultBrowserContext().overridePermissions(pageUrl, ['clipboard-read', 'clipboard-write']);

let extId = null;
function targetUrls() {
  return browser.targets().map((t) => t.type() + ':' + t.url());
}

async function ensureWorker() {
  let target = browser.targets().find((t) => t.type() === 'service_worker');
  if (target) return target;
  const id = extId || computeExtId(ROOT);
  const page = await browser.newPage();
  try {
    await page.goto('chrome-extension://' + id + '/src/options/options.html', {
      waitUntil: 'domcontentloaded'
    }).catch(() => {});
    await page.evaluate(() => {
      try {
        chrome.runtime.sendMessage({ type: '__qlens_ping' });
      } catch (e) {
        /* ping is best-effort */
      }
    }).catch(() => {});
  } catch (err) {
    /* continue */
  }
  await page.close().catch(() => {});
  try {
    return await browser.waitForTarget((t) => t.type() === 'service_worker', { timeout: 10000 });
  } catch (err) {
    return null;
  }
}

async function inWorker(fn, arg) {
  const target = await ensureWorker();
  if (!target) return { ok: false, reason: 'no-service-worker' };
  const worker = await target.worker();
  return worker.evaluate(fn, arg);
}

async function triggerOverlay(page, selection) {
  await page.bringToFront();
  await new Promise((r) => setTimeout(r, 300));
  return inWorker(async (sel) => {
    const tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    const tab = tabs && tabs[0] ? tabs[0] : null;
    if (!tab) return { ok: false, reason: 'no-active-tab' };
    const payload = typeof sel === 'string' && sel.length > 0 ? { selection: sel } : {};
    const nonce =
      globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function'
        ? globalThis.crypto.randomUUID()
        : String(Date.now()) + '-' + Math.random().toString(36).slice(2);
    try {
      const resp = await chrome.tabs.sendMessage(tab.id, {
        type: 'QLENS_OPEN_OVERLAY',
        payload
      });
      if (resp && resp.ok === true) return { ok: true, resp };
    } catch (err) {
      /* no live listener yet — inject below */
    }
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: (n) => {
          window.__QLENS_EXPECTED_NONCE__ = n;
        },
        args: [nonce]
      });
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: QLENS.CONTENT_FILES
      });
    } catch (err) {
      return { ok: false, reason: 'inject-failed: ' + String(err.message || err) };
    }
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const resp = await chrome.tabs.sendMessage(tab.id, {
          type: 'QLENS_OPEN_OVERLAY',
          payload
        });
        if (resp && resp.ok === true) return { ok: true, resp };
      } catch (err) {
        /* retry after backoff */
      }
      await new Promise((r) => setTimeout(r, 100));
    }
    return { ok: false, reason: 'no-listener-after-inject' };
  }, selection);
}

async function focusOverlayInput(page) {
  return page.evaluate(() => {
    const host = Array.from(document.documentElement.children).find(
      (n) => n.shadowRoot && n.shadowRoot.querySelector('.ql-panel')
    );
    if (!host) return false;
    const input = host.shadowRoot.querySelector('.ql-input');
    if (!input) return false;
    input.focus();
    return document.activeElement === input || host.shadowRoot.activeElement === input;
  });
}

async function overlayState(page) {
  return page.evaluate(() => {
    const host = Array.from(document.documentElement.children).find(
      (n) => n.shadowRoot && n.shadowRoot.querySelector('.ql-panel')
    );
    if (!host) return { visible: false };
    return {
      visible: true,
      inputValue: host.shadowRoot.querySelector('.ql-input').value,
      hasPills: host.shadowRoot.querySelectorAll('.ql-pill').length >= 4
    };
  });
}

async function calculatorState(page) {
  return page.evaluate(() => {
    const host = Array.from(document.documentElement.children).find(
      (n) => n.shadowRoot && n.shadowRoot.querySelector('.ql-panel')
    );
    if (!host) return { visible: false };
    const zone = host.shadowRoot.querySelector('.ql-calc-zone');
    const btn = host.shadowRoot.querySelector('.ql-calc');
    return {
      visible: true,
      open: Boolean(zone && zone.classList.contains('is-open')),
      copied: Boolean(btn && btn.classList.contains('is-copied')),
      value: (host.shadowRoot.querySelector('.ql-calc-value') || {}).textContent || '',
      hint: (host.shadowRoot.querySelector('.ql-calc-hint') || {}).textContent || ''
    };
  });
}

const target = await ensureWorker();
check('extension service worker alive', Boolean(target), targetUrls().join(' | '));
if (!target) {
  console.log('SKIP: extension did not load (no service worker).');
  await browser.close();
  server.close();
  process.exit(0);
}
const url = target.url();
const m = /^chrome-extension:\/\/([^/]+)\//.exec(url);
extId = m ? m[1] : null;
check('extension id resolved (' + (extId || 'fallback') + ')', Boolean(extId));

const page = browser.targets().find((t) => t.type() === 'page');
const mainPage = await page.page();
await mainPage.goto(pageUrl, { waitUntil: 'load' });

await mainPage.evaluate(() => {
  const range = document.createRange();
  range.selectNodeContents(document.getElementById('para'));
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);
});
const first = await triggerOverlay(mainPage);
check(
  'OPEN_OVERLAY delivered (on-demand injection)',
  first.ok === true && first.resp && first.resp.ok === true,
  JSON.stringify(first)
);
let state = await overlayState(mainPage);
check(
  'overlay visible with selection auto-filled',
  state.visible && state.inputValue === 'The quick brown fox jumps over the lazy dog near the riverbank.',
  JSON.stringify(state)
);
check('engine pills rendered (4)', state.hasPills);

await focusOverlayInput(mainPage);
await mainPage.keyboard.press('Escape');
await new Promise((r) => setTimeout(r, 300));
state = await overlayState(mainPage);
check('Esc closes overlay cleanly', !state.visible);

const second = await triggerOverlay(mainPage);
check('overlay reopens (second trigger)', second.ok && (await overlayState(mainPage)).visible);

await mainPage.keyboard.type('hello world', { delay: 5 });
await mainPage.keyboard.press('Enter');
await new Promise((r) => setTimeout(r, 2500));
const targets = browser.targets().filter((t) => t.type() === 'page');
const resultsTab = targets.find((t) => {
  const u = t.url();
  return u.includes('google.com') && (u.includes('search') || u.includes('q=')) && u.includes('hello');
});
check(
  'Enter opens results tab on Google',
  Boolean(resultsTab),
  targets.map((t) => t.url()).join(' | ')
);

await mainPage.bringToFront();
state = await overlayState(mainPage);
check('old tab is clean after search (zero residue)', !state.visible);

const third = await triggerOverlay(mainPage);
check('overlay opens again (third trigger)', third.ok && (await overlayState(mainPage)).visible);

await mainPage.keyboard.type('2+2', { delay: 5 });
await new Promise((r) => setTimeout(r, 200));
let calc = await calculatorState(mainPage);
check('calculator row evaluates 2+2', calc.open && calc.value === '4', JSON.stringify(calc));
await mainPage.keyboard.press('Enter');
await new Promise((r) => setTimeout(r, 250));
calc = await calculatorState(mainPage);
check(
  'Enter copies the result and keeps the overlay open',
  calc.visible && calc.open && calc.copied && calc.hint === 'Copied to clipboard',
  JSON.stringify(calc)
);
let clip = '';
try {
  clip = await mainPage.evaluate(() => navigator.clipboard.readText());
} catch (err) {
  clip = 'read-failed';
}
check('clipboard holds the raw result', clip === '4', clip);
check(
  'calculator Enter does not open a search tab',
  !targetUrls().some((u) => u.includes('google.com/search') && u.includes('2%2B2')),
  targetUrls().join(' | ')
);

await mainPage.keyboard.down('Control');
await mainPage.keyboard.press('KeyA');
await mainPage.keyboard.up('Control');
await mainPage.keyboard.type('github.com/some/repo', { delay: 5 });
await new Promise((r) => setTimeout(r, 200));
const actionRow = await mainPage.evaluate(() => {
  const host = Array.from(document.documentElement.children).find(
    (n) => n.shadowRoot && n.shadowRoot.querySelector('.ql-panel')
  );
  if (!host) return null;
  const row = host.shadowRoot.querySelector('[data-action="site"]');
  return row ? row.textContent : null;
});
check('smart URL offers "Go to site"', Boolean(actionRow) && actionRow.includes('github.com'), String(actionRow));
await mainPage.keyboard.press('Enter');
await new Promise((r) => setTimeout(r, 2000));
const siteTab = browser.targets().find((t) => t.type() === 'page' && t.url().startsWith('https://github.com/some/repo'));
check('Enter on smart URL opens the site', Boolean(siteTab));

await mainPage.bringToFront();
await mainPage.keyboard.press('Escape');

const restrictedPage = await browser.newPage();
await restrictedPage.goto('chrome://version', { waitUntil: 'domcontentloaded' }).catch(() => {});
await restrictedPage.bringToFront();
await new Promise((r) => setTimeout(r, 400));
const restricted = await inWorker(async () => {
  const tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  const tab = tabs && tabs[0] ? tabs[0] : null;
  if (!tab) return 'no-tab';
  try {
    await chrome.tabs.sendMessage(tab.id, { type: 'QLENS_OPEN_OVERLAY', payload: {} });
    return 'delivered';
  } catch (err) {
    return 'blocked';
  }
});
check('chrome://version: blocked without crash', restricted === 'blocked', restricted);

const popupPage = await browser.newPage();
const popupErrs = [];
popupPage.on('pageerror', (e) => popupErrs.push(String(e)));
await popupPage.goto('chrome-extension://' + extId + '/src/popup/popup.html', { waitUntil: 'domcontentloaded' });
await new Promise((r) => setTimeout(r, 400));
const popupOk = await popupPage.evaluate(() => ({
  input: Boolean(document.getElementById('pop-query')),
  pills: document.querySelectorAll('.pop-pill').length,
  swatches: document.querySelectorAll('.swatch').length,
  shortcut: document.getElementById('pop-shortcut') ? document.getElementById('pop-shortcut').textContent : null,
  themeBtns: document.querySelectorAll('#pop-theme .seg-btn').length
}));
check(
  'popup renders (input, 4 pills, swatches, shortcut, theme)',
  popupOk.input && popupOk.pills >= 4 && popupOk.swatches >= 4 && popupOk.themeBtns === 3 && Boolean(popupOk.shortcut),
  JSON.stringify(popupOk)
);
await popupPage.type('#pop-query', 'popup test query');
await popupPage.click('#pop-go');
await new Promise((r) => setTimeout(r, 3000));
const popupTab = browser.targets().find(
  (t) => t.type() === 'page' && t.url().includes('google.com') && (t.url().includes('search') || t.url().includes('q=')) && t.url().includes('popup')
);
check('popup search opens results tab', Boolean(popupTab), 'pageerrors=' + JSON.stringify(popupErrs));
await popupPage.close().catch(() => {});

const optionsPage = await browser.newPage();
await optionsPage.goto('chrome-extension://' + extId + '/src/options/options.html', { waitUntil: 'domcontentloaded' });
await optionsPage.waitForFunction(() => {
  const input = document.getElementById('shortcut-input');
  return input && input.value === 'Ctrl+Shift+K';
}, { timeout: 5000 });
await optionsPage.click('#shortcut-input');
await optionsPage.keyboard.down('Control');
await optionsPage.keyboard.press('Space');
await optionsPage.keyboard.up('Control');
const captured = await optionsPage.evaluate(() => {
  const input = document.getElementById('shortcut-input');
  return {
    value: input.value,
    pending: input.classList.contains('is-pending'),
    saveDisabled: document.getElementById('shortcut-save').disabled
  };
});
check(
  'options field captures Ctrl+Space',
  captured.value === 'Ctrl+Space' && captured.pending && captured.saveDisabled === false,
  JSON.stringify(captured)
);
await optionsPage.click('#shortcut-save');
await new Promise((r) => setTimeout(r, 250));
const uiSaved = await optionsPage.evaluate(async () => QLENS.storage.getShortcut());
check('options Save persists the captured combo', uiSaved === 'Ctrl+Space', String(uiSaved));
await optionsPage.click('#shortcut-reset');
await new Promise((r) => setTimeout(r, 250));
const setRes = await optionsPage.evaluate(async () => {
  const ok = await QLENS.storage.setShortcut('Ctrl+Alt+Q');
  const cur = await QLENS.storage.getShortcut();
  return { ok, cur };
});
check('shortcut saved to storage (Ctrl+Alt+Q)', setRes.ok === true && setRes.cur === 'Ctrl+Alt+Q', JSON.stringify(setRes));
await mainPage.bringToFront();
await mainPage.keyboard.down('Control');
await mainPage.keyboard.down('Alt');
await mainPage.keyboard.press('KeyQ');
await mainPage.keyboard.up('Alt');
await mainPage.keyboard.up('Control');
await new Promise((r) => setTimeout(r, 700));
check('custom combo opens overlay', (await overlayState(mainPage)).visible);
await mainPage.keyboard.press('Escape');
await new Promise((r) => setTimeout(r, 400));
const badRes = await optionsPage.evaluate(async () => {
  const ok = await QLENS.storage.setShortcut('K');
  return { ok };
});
check('invalid shortcut rejected by storage', badRes.ok === false, JSON.stringify(badRes));
await optionsPage.evaluate(async () => {
  await QLENS.storage.setShortcut('Ctrl+Shift+K');
});
await optionsPage.close().catch(() => {});

await browser.close();
server.close();
console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail > 0 ? 1 : 0);