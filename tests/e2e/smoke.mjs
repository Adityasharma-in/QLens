import http from 'node:http';
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = decodeURIComponent(new URL('../..', import.meta.url).pathname).replace(/^\/([A-Za-z]:)\//, '$1/');
const CHROME = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

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

let browser = null;
try {
  browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    args: [
      '--disable-extensions-except=' + ROOT,
      '--load-extension=' + ROOT,
      '--no-sandbox',
      '--disable-dev-shm-usage'
    ]
  });
} catch (err) {
  console.log('SKIP: could not launch Chrome in headless mode (' + err.message + ').');
  server.close();
  process.exit(0);
}

async function extensionId() {
  const target = await browser.waitForTarget((t) => t.type() === 'service_worker', { timeout: 15000 });
  const url = target.url();
  const m = /^chrome-extension:\/\/([^/]+)\//.exec(url);
  return m ? m[1] : null;
}

async function inWorker(fn) {
  const target = await browser.waitForTarget((t) => t.type() === 'service_worker', { timeout: 15000 });
  const worker = await target.worker();
  return worker.evaluate(fn);
}

async function triggerOverlay(selection) {
  return inWorker(async (sel) => {
    const tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    const tab = tabs && tabs[0] ? tabs[0] : null;
    if (!tab) return { ok: false, reason: 'no-active-tab' };
    try {
      const resp = await chrome.tabs.sendMessage(tab.id, {
        type: 'QLENS_OPEN_OVERLAY',
        payload: typeof sel === 'string' ? { selection: sel } : {}
      });
      return { ok: true, resp };
    } catch (err) {
      return { ok: false, reason: String(err.message || err) };
    }
  }, selection);
}

async function overlayState() {
  return browser.pages()[0].evaluate(() => {
    const host = Array.from(document.documentElement.children).find((n) => n.shadowRoot && n.shadowRoot.querySelector('.ql-panel'));
    if (!host) return { visible: false };
    return {
      visible: true,
      inputValue: host.shadowRoot.querySelector('.ql-input').value,
      hasPills: host.shadowRoot.querySelectorAll('.ql-pill').length >= 4
    };
  });
}

const id = await extensionId();
check('extension service worker found (id=' + (id || '?') + ')', Boolean(id));
if (!id) {
  console.log('SKIP: extension did not load.');
  await browser.close();
  server.close();
  process.exit(0);
}

const page = await browser.newPage();
await page.goto(pageUrl, { waitUntil: 'load' });

await page.evaluate(() => {
  const range = document.createRange();
  range.selectNodeContents(document.getElementById('para'));
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);
});
const first = await triggerOverlay();
check('OPEN_OVERLAY delivered (injected on demand)', first.ok === true && first.resp && first.resp.ok === true);
let state = await overlayState();
check('overlay visible with selection auto-filled', state.visible && state.inputValue === 'The quick brown fox jumps over the lazy dog near the riverbank.', JSON.stringify(state));
check('engine pills rendered (4)', state.hasPills);

await page.focus('input');
await page.keyboard.press('Escape');
state = await overlayState();
check('Esc closes overlay cleanly', !state.visible);

const second = await triggerOverlay();
check('overlay reopens (second trigger)', second.ok && (await overlayState()).visible);

await page.keyboard.type('hello world', { delay: 5 });
await page.keyboard.press('Enter');
await new Promise((r) => setTimeout(r, 2500));
const targets = browser.targets().filter((t) => t.type() === 'page');
const resultsTab = targets.find((t) => t.url().includes('google.com/search?q=hello%20world'));
check('Enter opens results tab on Google', Boolean(resultsTab), targets.map((t) => t.url()).join(' | '));

await page.bringToFront();
state = await overlayState();
check('old tab is clean after search (zero residue)', !state.visible);

const third = await triggerOverlay();
await page.keyboard.type('github.com/some/repo');
state = await overlayState();
const actionRow = await page.evaluate(() => {
  const host = Array.from(document.documentElement.children).find((n) => n.shadowRoot && n.shadowRoot.querySelector('.ql-panel'));
  const row = host.shadowRoot.querySelector('[data-action="site"]');
  return row ? row.textContent : null;
});
check('smart URL offers Go to site', Boolean(actionRow) && actionRow.includes('github.com'), String(actionRow));

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
const restrictedPage = await browser.newPage();
await restrictedPage.goto('chrome://version', { waitUntil: 'domcontentloaded' }).catch(() => {});
await new Promise((r) => setTimeout(r, 300));
const restricted2 = await inWorker(async () => {
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
check('restricted page: overlay delivery blocked without crash', restricted === 'blocked', restricted);
check('chrome://version: blocked without crash', restricted2 === 'blocked', restricted2);

await browser.close();
server.close();
console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail > 0 ? 1 : 0);