import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = decodeURIComponent(new URL('..', import.meta.url).pathname).replace(/^\/([A-Za-z]:)\//, '$1/');

function collectJs(dir, out) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) collectJs(p, out);
    else if (p.endsWith('.js')) out.push(p);
  }
}

const files = [];
collectJs(join(ROOT, 'src'), files);
files.push(join(ROOT, 'tests', 'unit', 'run.mjs'));
files.push(join(ROOT, 'tests', 'e2e', 'smoke.mjs'));

let failed = 0;
for (const f of files) {
  const res = spawnSync(process.execPath, ['--check', f], { encoding: 'utf8' });
  if (res.status !== 0) {
    failed++;
    console.log('FAIL ' + f.replace(ROOT, ''));
    console.log(res.stderr.trim());
  } else {
    console.log('OK   ' + f.replace(ROOT, ''));
  }
}
console.log(failed > 0 ? failed + ' file(s) FAILED' : files.length + ' files OK');
process.exit(failed > 0 ? 1 : 0);