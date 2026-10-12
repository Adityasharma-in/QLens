// Probe: "/" typed into the QLens overlay on real google.com.
// Reproduces user report: open overlay on google.com, type "/" for command mode,
// the slash never lands in the query and Google's own search-box shortcut fires.
import { readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';

const ROOT = decodeURIComponent(new URL('..', import.meta.url).pathname).replace(/^\/([A-Za-z]:)\//, '$1/');
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
  };
  return null;
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

let browser = null;
for (const headless of [false]) {
  for (const exe of chromeCandidates()) {
    try {
      browser = await puppeteer.launch({
        executablePath: exe,
        headless,
        args: [
          '--disable-extensions-except=' + ROOT,
          '--load-extension=' + ROOT,
          '--no-sandbox',
          '--disable-dev-shm-usage',
          '--window-size=1000,800'
        ]
      });
      break;
    } catch (err) {
      browser = null;
    }
  }
  if (browser) break;
}
if (!browser) {
  console.log('SKIP: no Chrome');
  process.exit(0);
}
console.log('launched ok');

const targets = () => browser.targets().map((t) => t.type() + ':' + t.url());
let extId = null;

async function ensureWorker() {
  let t = browser.targets().find((x) => x.type() === 'service_worker');
  if (t) return t;
  const id = extId || computeExtId(ROOT);
  const p = await browser.newPage();
  await p.goto('chrome-extension://' + id + '/src/options/options.html', { waitUntil: 'domcontentloaded' }).catch(() => {});
  await p.close().catch(() => {});
  return await browser.waitForTarget((x) => x.type() === 'service_worker', { timeout: 10000 }).catch(() => null);
}

const workerTarget = await ensureWorker();
if (!workerTarget) {
  console.log('SKIP: no service worker; targets=' + JSON.stringify(targets()));
  await browser.close();
  process.exit(0);
}
extId = /^chrome-extension:\/\/([^/]+)\//.exec(workerTarget.url())[1];
const worker = await workerTarget.worker();

const page = await browser.newPage();
await page.goto('https://www.google.com/webhp?hl=en', { waitUntil: 'load', timeout: 30000 });
await new Promise((r) => setTimeout(r, 1200));
console.log('on: ' + page.url());

// instrument: log every keydown the PAGE world can see (any phase, any node we can reach)
await page.evaluate(() => {
  window.__qlensProbe = { pageKeydowns: [], activeAfter: [] };
  const rec = (label) => (e) => {
    if (e.key === '/' || e.key.length === 1) {
      window.__qlensProbe.pageKeydowns.push(label + ' key=' + e.key + ' target=' + (e.target && e.target.nodeName) + ' defaultPrevented=' + e.defaultPrevented);
    }
  };
  window.addEventListener('keydown', rec('win-capture'), true);
  document.addEventListener('keydown', rec('doc-capture'), true);
  document.addEventListener('keydown', rec('doc-bubble'), false);
});

// open overlay via the real SW path
const opened = await worker.evaluate(async () => {
  const tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  const tab = tabs && tabs[0];
  if (!tab) return { ok: false };
  const nonce = crypto.randomUUID();
  try {
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: (n) => { window.__QLENS_EXPECTED_NONCE__ = n; }, args: [nonce] });
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['src/shared/config.js','src/shared/messaging.js','src/shared/engines.js','src/shared/logos.js','src/shared/storage.js','src/shared/image.js','src/content/selection.js','src/content/overlay.js','src/content/injector.js'] });
  } catch (err) { /* already there */ }
  const resp = await chrome.tabs.sendMessage(tab.id, { type: 'QLENS_OPEN_OVERLAY', payload: {} }).catch((e) => ({ err: String(e) }));
  return resp || { ok: false };
});
console.log('open: ' + JSON.stringify(opened));
await new Promise((r) => setTimeout(r, 500));

async function snapshot() {
  return page.evaluate(() => {
    const host = Array.from(document.documentElement.children).find((n) => n.shadowRoot && n.shadowRoot.querySelector('.ql-panel'));
    const inp = host ? host.shadowRoot.querySelector('.ql-input') : null;
    const gbox = document.querySelector('textarea[name="q"], input[name="q"]');
    return {
      hostThere: Boolean(host),
      inputValue: inp ? inp.value : null,
      shadowActiveIsInput: inp ? host.shadowRoot.activeElement === inp : null,
      docActive: document.activeElement && document.activeElement.nodeName,
      docActiveTagInfo: document.activeElement ? (document.activeElement.name || document.activeElement.id || '') : '',
      gValue: gbox ? gbox.value : null,
      gFocused: gbox ? (document.activeElement === gbox) : null
    };
  });
}

console.log('before type:', JSON.stringify(await snapshot()));
await page.keyboard.press('/');
await new Promise((r) => setTimeout(r, 400));
console.log('after "/": ', JSON.stringify(await snapshot()));
await page.keyboard.type('gh');
await new Promise((r) => setTimeout(r, 400));
console.log('after "gh":', JSON.stringify(await snapshot()));

const probe = await page.evaluate(() => window.__qlensProbe.pageKeydowns.slice(0, 20));
console.log('page-visible keydowns: ' + JSON.stringify(probe, null, 2));

await browser.close();
