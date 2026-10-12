// Probe (offline): deterministic repro of the google.com "/" hijack.
// Local page mimics Google: a document-level CAPTURE keydown handler treats "/"
// with a non-editable target as "focus my search box" + preventDefault — the
// exact shape Google's own shortcut uses. Also steals focus after 800 ms like
// Google's page scripts re-focus their search field.
import { createServer } from 'node:http';
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
  list.push('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe');
  return list.filter((p) => p && existsSync(p));
}

const puppeteer = (await import('puppeteer-core')).default;

const pageHtml = `<!DOCTYPE html><html><body>
<input id="gq" placeholder="fake google box" style="width:400px">
<p>page</p>
<script>
  // Google-style "/" shortcut: capture phase, non-editable target => claim it.
  document.addEventListener('keydown', function (e) {
    if (e.key !== '/') return;
    var el = document.activeElement;
    var editable = el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
    if (!editable) {
      e.preventDefault();
      document.getElementById('gq').focus();
      window.__hijacked = (window.__hijacked || 0) + 1;
    }
  }, true);
  // Google-style focus reclaim shortly after load.
  setTimeout(function () { document.getElementById('gq').focus(); window.__refocused = true; }, 800);
</script>
</body></html>`;

const server = createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(pageHtml);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;

let browser = null;
for (const exe of chromeCandidates()) {
  try {
    browser = await puppeteer.launch({
      executablePath: exe,
      headless: false,
      args: [
        '--disable-extensions-except=' + ROOT,
        '--load-extension=' + ROOT,
        '--no-sandbox',
        '--disable-dev-shm-usage',
        '--window-size=1000,800'
      ]
    });
    break;
  } catch (err) { browser = null; }
}
if (!browser) { console.log('SKIP: no chrome'); process.exit(0); }

function computeExtId(absPath) {
  const norm = absPath.replace(/\\/g, '/').replace(/\/+$/, '') + '/';
  const digest = createHash('sha256').update(norm, 'utf8').digest('hex').slice(0, 32);
  const chars = 'abcdefghijklmnop';
  let out = '';
  for (let i = 0; i < 32; i += 2) out += chars[parseInt(digest.slice(i, i + 2), 16) % 16];
  return out;
}
const extId = computeExtId(ROOT);

async function ensureWorker() {
  let t = browser.targets().find((x) => x.type() === 'service_worker');
  if (t) return t;
  const p = await browser.newPage();
  await p.goto('chrome-extension://' + extId + '/src/options/options.html', { waitUntil: 'domcontentloaded' }).catch(() => {});
  await p.close().catch(() => {});
  return await browser.waitForTarget((x) => x.type() === 'service_worker', { timeout: 10000 }).catch(() => null);
}

const workerTarget = await ensureWorker();
if (!workerTarget) { console.log('SKIP: no SW'); await browser.close(); server.close(); process.exit(0); }
console.log('extension loaded');
const worker = await workerTarget.worker();

const page = await browser.newPage();
await page.goto('http://127.0.0.1:' + port + '/', { waitUntil: 'load' });
await new Promise((r) => setTimeout(r, 1200));

const opened = await worker.evaluate(async () => {
  const tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  const tab = tabs && tabs[0];
  if (!tab) return { ok: false };
  try {
    return await chrome.tabs.sendMessage(tab.id, { type: 'QLENS_OPEN_OVERLAY', payload: {} });
  } catch (err) { return { ok: false, err: String(err) }; }
});
console.log('open: ' + JSON.stringify(opened));
await new Promise((r) => setTimeout(r, 1500)); // past the 800ms focus-reclaim timer

async function snapshot(tag) {
  const s = await page.evaluate(() => {
    const host = Array.from(document.documentElement.children).find((n) => n.shadowRoot && n.shadowRoot.querySelector('.ql-panel'));
    const inp = host ? host.shadowRoot.querySelector('.ql-input') : null;
    const gq = document.getElementById('gq');
    return {
      overlayVisible: Boolean(host),
      inputValue: inp ? inp.value : null,
      inputFocused: inp ? host.shadowRoot.activeElement === inp : null,
      fakeGoogleFocused: document.activeElement === gq,
      fakeGoogleValue: gq ? gq.value : null,
      hijacks: window.__hijacked || 0
    };
  });
  console.log(tag + ': ' + JSON.stringify(s));
  return s;
}

await snapshot('before');
await page.keyboard.press('/');
await new Promise((r) => setTimeout(r, 300));
const s1 = await snapshot('after /  ');
await page.keyboard.type('gh');
await new Promise((r) => setTimeout(r, 300));
const s2 = await snapshot('after gh ');

console.log('\nVERDICT:');
console.log('slash landed in QLens input : ' + (s1.inputValue || '').includes('/'));
console.log('command list rendered       : ' + JSON.stringify(await page.evaluate(() => {
  const host = Array.from(document.documentElement.children).find((n) => n.shadowRoot && n.shadowRoot.querySelector('.ql-panel'));
  return host ? Boolean(host.shadowRoot.querySelector('.ql-fav-head')) : false;
})));
console.log('page hijack count           : ' + s2.hijacks);

await browser.close();
server.close();
