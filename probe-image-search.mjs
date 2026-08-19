// Probe #2: drive the REAL extension in Chrome for Testing and trace the image search.
// Reproduces: open overlay -> attach a real PNG via the hidden file input (bypasses
// OS file dialog — we set FileList through DataTransfer) -> press Enter -> capture:
//   - what the SW logs inside handleImageSearch (url chosen, fetch final url, thrown error)
//   - which tab url actually opens
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

function computeExtId(absPath) {
  const norm = absPath.replace(/\\/g, '/').replace(/\/+$/, '') + '/';
  const digest = createHash('sha256').update(norm, 'utf8').digest('hex').slice(0, 32);
  const chars = 'abcdefghijklmnop';
  let out = '';
  for (let i = 0; i < 32; i += 2) out += chars[parseInt(digest.slice(i, i + 2), 16) % 16];
  return out;
}

const puppeteer = (await import('puppeteer-core')).default;
if (!puppeteer) {
  console.log('SKIP: puppeteer-core not installed');
  process.exit(0);
}

const pageHtml = `<!DOCTYPE html><html><body><p id="para">probe image search</p></body></html>`;
const server = createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(pageHtml);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const pageUrl = 'http://127.0.0.1:' + server.address().port + '/';

let browser = null;
for (const exe of chromeCandidates()) {
  try {
    browser = await puppeteer.launch({
      executablePath: exe,
      headless: 'new',
      args: [
        '--disable-extensions-except=' + ROOT,
        '--load-extension=' + ROOT,
        '--no-sandbox',
        '--disable-dev-shm-usage',
        '--window-size=1000,800'
      ]
    });
    console.log('launched: ' + exe);
    break;
  } catch (err) {
    browser = null;
  }
}
if (!browser) {
  console.log('SKIP: no Chrome launched');
  server.close();
  process.exit(0);
}

// Smallest real PNG (1x1 transparent).
const pngB64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

function ensureWorker() {
  let target = browser.targets().find((t) => t.type() === 'service_worker');
  if (target) return Promise.resolve(target);
  const id = computeExtId(ROOT);
  return (async () => {
    const page = await browser.newPage();
    try {
      await page.goto('chrome-extension://' + id + '/src/options/options.html', { waitUntil: 'domcontentloaded' }).catch(() => {});
      await page.evaluate(() => { try { chrome.runtime.sendMessage({ type: '__qlens_ping' }); } catch (e) {} }).catch(() => {});
    } catch (err) { /* continue */ }
    await page.close().catch(() => {});
    return browser.waitForTarget((t) => t.type() === 'service_worker', { timeout: 10000 }).catch(() => null);
  })();
}

async function workerContext() {
  const target = await ensureWorker();
  const worker = await target.worker();
  return { target, worker };
}

// Route runtime.onMessage IMAGE_SEARCH to a log array in the worker, and patch
// nothing else. The handler still runs normally; we just observe.
const logs = [];
const { worker } = await workerContext();
await worker.evaluate(() => {
  globalThis.__qlensProbeLogs = [];
  const orig = chrome.runtime.onMessage;
  // We can't un-register the SW's own listener, but we CAN append a log
  // listener that runs for every message (all listeners get the message).
  return;
});
await worker.evaluate(() => {
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    try {
      if (msg && msg.type === 'QLENS_IMAGE_SEARCH') {
        globalThis.__qlensProbeLogs.push({
          received: true,
          payloadBytes: msg.payload && msg.payload.bytes ? msg.payload.bytes.length : 0,
          payloadText: msg.payload && msg.payload.text,
          payloadName: msg.payload && msg.payload.name
        });
      }
    } catch (e) {
      globalThis.__qlensProbeLogs.push({ listenerError: String(e) });
    }
    return false;
  });
});

// Open the page + overlay.
const mainPage = await browser.pages().then((ps) => ps[0]);
await mainPage.goto(pageUrl, { waitUntil: 'load' });
await new Promise((r) => setTimeout(r, 500));

// Trigger overlay via the SW (exact same path the keyboard shortcut uses).
const trig = await worker.evaluate(async () => {
  const tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  const tab = tabs && tabs[0] ? tabs[0] : null;
  if (!tab) return { ok: false, reason: 'no-tab' };
  const nonce = globalThis.crypto.randomUUID();
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: (n) => { window.__QLENS_EXPECTED_NONCE__ = n; },
      args: [nonce]
    });
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: QLENS.CONTENT_FILES });
    for (let i = 0; i < 3; i++) {
      try {
        const resp = await chrome.tabs.sendMessage(tab.id, { type: 'QLENS_OPEN_OVERLAY', payload: {} });
        if (resp && resp.ok) return { ok: true };
      } catch (e) { /* retry */ }
      await new Promise((r) => setTimeout(r, 100));
    }
    return { ok: false, reason: 'no-listener' };
  } catch (err) {
    return { ok: false, reason: String(err.message || err) };
  }
});
console.log('trigger overlay:', JSON.stringify(trig));

// Attach the PNG through the real hidden file input (DataTransfer -> File -> dispatch change).
const attached = await mainPage.evaluate((b64) => {
  const host = Array.from(document.documentElement.children).find(
    (n) => n.shadowRoot && n.shadowRoot.querySelector('.ql-panel')
  );
  if (!host) return { ok: false, reason: 'no-overlay' };
  const input = host.shadowRoot.querySelector('.ql-hidden');
  if (!input) return { ok: false, reason: 'no-file-input' };
  const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  const file = new File([bytes], 'probe.png', { type: 'image/png' });
  const dt = new DataTransfer();
  dt.items.add(file);
  input.files = dt.files;
  input.dispatchEvent(new Event('change', { bubbles: true }));
  return { ok: true };
}, pngB64);
console.log('attach:', JSON.stringify(attached));
await new Promise((r) => setTimeout(r, 800));

// Check the chip rendered + press Enter.
const chipVisible = await mainPage.evaluate(() => {
  const host = Array.from(document.documentElement.children).find(
    (n) => n.shadowRoot && n.shadowRoot.querySelector('.ql-panel')
  );
  return host ? Boolean(host.shadowRoot.querySelector('.ql-img-chip')) : false;
});
console.log('chip rendered:', chipVisible);
if (chipVisible) {
  await mainPage.keyboard.press('Enter');
} else {
  // If no chip, the attach silently failed — type a fallback query.
  await mainPage.keyboard.type('probe search', { delay: 10 });
  await mainPage.keyboard.press('Enter');
}

// Wait, then report.
await new Promise((r) => setTimeout(r, 6000));
const tabs = browser.targets().map((t) => t.type() + ':' + t.url());
console.log('\nTABS AFTER ENTER:');
for (const t of tabs) console.log('  ' + t);
const swLogs = await worker.evaluate(() => (globalThis.__qlensProbeLogs || []));
console.log('\nSW MESSAGE LOG:');
for (const l of swLogs) console.log('  ' + JSON.stringify(l));

await browser.close();
server.close();
console.log('\ndone');
process.exit(0);