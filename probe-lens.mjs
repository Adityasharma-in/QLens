// Probe #1: what does a cookie-less cross-origin client get from Google Lens upload?
// Mimics the extension SW fetch (no cookies, no Google session).
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));

const PNG1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64'
);

const boundary = '----olyprobe';
const multipart = Buffer.concat([
  Buffer.from(
    '--' + boundary + '\r\n' +
    'Content-Disposition: form-data; name="encoded_image"; filename="probe.png"\r\n' +
    'Content-Type: image/png\r\n\r\n'
  ),
  PNG1,
  Buffer.from('\r\n--' + boundary + '--\r\n')
]);

async function probe(label, fn) {
  console.log('\n=== ' + label + ' ===');
  try {
    const r = await fn();
    console.log('status:', r.status, r.statusText);
    console.log('url  :', r.url);
    console.log('location:', r.headers.get('location'));
    console.log('ACAO  :', r.headers.get('access-control-allow-origin'));
    console.log('ct    :', r.headers.get('content-type'));
    const t = await r.text();
    console.log('body[0:200]:', JSON.stringify(t.slice(0, 200)));
  } catch (err) {
    console.log('THREW:', err.message);
  }
}

await probe('A) GET /searchbyimage/upload (manual)', () =>
  fetch('https://www.google.com/searchbyimage/upload', { redirect: 'manual', cache: 'no-store' })
);

await probe('B) POST multipart (manual)', () =>
  fetch('https://www.google.com/searchbyimage/upload', {
    method: 'POST', redirect: 'manual', cache: 'no-store',
    headers: { 'Content-Type': 'multipart/form-data; boundary=' + boundary },
    body: multipart
  })
);

await probe('C) POST multipart (follow) — what the SW does', () =>
  fetch('https://www.google.com/searchbyimage/upload', {
    method: 'POST', redirect: 'follow', cache: 'no-store',
    headers: { 'Content-Type': 'multipart/form-data; boundary=' + boundary },
    body: multipart
  })
);