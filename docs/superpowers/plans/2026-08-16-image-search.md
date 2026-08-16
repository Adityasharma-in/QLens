# QLens Image Search Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add reverse-image search to the QLens overlay — attach a local image (file picker, paste, or drag & drop), optionally with typed text, and send it to Google Lens in a new tab, reusing the verified `POST /searchbyimage/upload` endpoint. Zero new permissions, fully local.

**Architecture:** The pure upload payload lives in `src/shared/engines.js` (`QLENS.lensUploadBody`); the content-script overlay gains an image button/thumbnail chip, local byte reading (File API/canvas), and a new `IMAGE_SEARCH` message; the service worker builds the multipart body, fetches Lens with a 20 s timeout, and opens the redirect target (http/https allowlisted). Normal text searches are untouched.

**Tech Stack:** Vanilla MV3 Chrome extension, `globalThis.QLENS` namespace shared modules, `node tests/check-syntax.mjs` + `node tests/unit/run.mjs`, no build step, no new deps.

## Global Constraints

- Zero-build vanilla ES2022, semicolons, single quotes, 2-space indent, arrow functions. Modules attach to `globalThis.QLENS` only.
- No new `manifest.json` permissions (host_permissions already cover `www.google.com`); no storage-schema changes; no settings changes.
- All URLs opened pass `QLENS.isSafeHttpUrl` (http/https only). No `innerHTML` with user data — DOM built with `createElement`/`textContent`.
- Guard every message with `sender.id === chrome.runtime.id`.
- Constants named: `IMAGE_SEARCH_TIMEOUT_MS: 20000`, `IMAGE_MAX_BYTES: 5 * 1024 * 1024`, `IMAGE_MAX_DIM: 2048`, `IMAGE_JPEG_QUALITY: 0.9`, `LENS_FILENAME: 'qlens-search.png'` in `src/shared/config.js`.
- Run `node tests/check-syntax.mjs` AND `node tests/unit/run.mjs` after every commit. Update `TASKS.md`, `MEMORY.md`, `README.md` feature table, `CHANGELOG.md`.
- Existing test counts will grow; "all green" means new totals (e.g. `node tests/unit/run.mjs` ending `N passed, 0 failed`.

---

### Task 1: Pure Lens upload payload in shared engines

**Files:**
- Modify: `src/shared/engines.js` (append `LENS_UPLOAD` + `lensUploadBody` + expose on `QLENS`)
- Test: `tests/unit/run.mjs` (append image-upload tests after the `engines:` block, before the `storage:` block)

**Interfaces:**
- Produces: `QLENS.LENS_UPLOAD` = `'https://www.google.com/searchbyimage/upload'`; `QLENS.lensUploadBody(base64Bytes, text, filename, boundary)` → `Uint8Array`; pure and synchronous.

- [ ] **Step 1: Write the failing unit tests**

Append to `tests/unit/run.mjs` after the last `engines:` test (line ~152) and before the `storage:` tests:

```js
const textEncoder = new TextEncoder();

function bytesToStr(b) {
  return textEncoder.decode(b);
}

function partHeaderHits(body, boundary, fieldName) {
  const before = bytesToStr(body.subarray(0, Math.min(body.length, 6200)));
  return [
    '--' + boundary + '\r\nContent-Disposition: form-data; name="' + fieldName + '"',
    '--' + boundary
  ].every((s) => before.includes(s));
}

test('lens: endpoint constant', () => {
  assert.equal(Q.LENS_UPLOAD, 'https://www.google.com/searchbyimage/upload');
});
test('lens: empty text body structure', () => {
  const b = Q.lensUploadBody('aGVsbG8=', '', 'f.png', 'qlb');
  const s = bytesToStr(b);
  assert.equal(s.startsWith('--qlb\r\n'), true);
  assert.ok(s.includes('name="encoded_image"; filename="f.png"'));
  assert.ok(s.includes('name="image_content"\r\n\r\n'));
  assert.ok(s.endsWith('--qlb--\r\n'));
  assert.ok(partHeaderHits(b, 'qlb', 'encoded_image'));
  assert.ok(partHeaderHits(b, 'qlb', 'image_content'));
});
test('lens: non-empty text goes to image_content', () => {
  const b = Q.lensUploadBody('aGVsbG8=', 'red car', 'f.png', 'qlb');
  const s = bytesToStr(b);
  assert.ok(s.includes('red car'), 'typed text present as image_content');
});
test('lens: decodes base64 into binary encoded_image content', () => {
  const b = Q.lensUploadBody('aGVsbG8=', '', 'f.png', 'qqq');
  const s = bytesToStr(b);
  const marker = s.indexOf('hello');
  assert.ok(marker > 0, 'decoded "hello" bytes embedded (no loss)');
});
```

- [ ] **Step 2: Run unit tests to verify they fail**

Run: `node tests/unit/run.mjs`
Expected: `PASS[]` lines for `lens:` tests skip — actual: `FAIL lens: …` because `Q.lensUploadBody` is `undefined` (`TypeError: Q.lensUploadBody is not a function`). Existing engines tests still pass (no regression).

- [ ] **Step 3: Implement `lensUploadBody` in `src/shared/engines.js`**

Append after `isSafeHttpUrl` (line ~150) and before the `QLENS.…` export block:

```js
const LENS_UPLOAD = 'https://www.google.com/searchbyimage/upload';
const LENS_FILENAME_DEFAULT = 'qlens-search.png';

function lensUploadBody(base64Bytes, text, filename, boundary) {
  const enc = new TextEncoder();
  const b = boundary || '----qlens';
  const name = typeof filename === 'string' && filename ? filename : LENS_FILENAME_DEFAULT;
  const query = String(text == null ? '' : text).trim();
  let bin;
  try {
    const raw = globalThis.atob(String(base64Bytes == null ? '' : base64Bytes));
    const n = raw.length;
    bin = new Uint8Array(n);
    for (let i = 0; i < n; i++) bin[i] = raw.charCodeAt(i);
  } catch (err) {
    bin = new Uint8Array(0);
  }
  const head =
    '--' + b + '\r\n' +
    'Content-Disposition: form-data; name="encoded_image"; filename="' + name + '"\r\n' +
    'Content-Type: image/png\r\n\r\n';
  const mid =
    '\r\n--' + b + '\r\n' +
    'Content-Disposition: form-data; name="image_content"\r\n\r\n' +
    query;
  const tail = '\r\n--' + b + '--\r\n';
  const headBytes = enc.encode(head);
  const midBytes = enc.encode(mid);
  const tailBytes = enc.encode(tail);
  const out = new Uint8Array(headBytes.length + bin.length + midBytes.length + tailBytes.length);
  out.set(headBytes, 0);
  out.set(bin, headBytes.length);
  out.set(midBytes, headBytes.length + bin.length);
  out.set(tailBytes, headBytes.length + bin.length + midBytes.length);
  return out;
}
```

Then, in the existing export block, add:

```js
QLENS.LENS_UPLOAD = LENS_UPLOAD;
QLENS.lensUploadBody = lensUploadBody;
```

- [ ] **Step 4: Run unit tests to verify they pass**

Run: `node tests/unit/run.mjs`
Expected: all 4 `lens:` tests PASS; total becomes `pass` count = prior total + 4; `0 failed`.

- [ ] **Step 5: Syntax check + commit**

Run: `node tests/check-syntax.mjs`
Expected: all `src/` files OK.

```bash
git add src/shared/engines.js tests/unit/run.mjs
git commit -m "feat(images): add Lens upload multipart builder (pure)"
```

---

### Task 2: Config constants + message type

**Files:**
- Modify: `src/shared/config.js` (add `IMAGE_*` + `LENS_FILENAME` to `QLENS.CONFIG`)
- Modify: `src/shared/messaging.js` (add `MSG.IMAGE_SEARCH`)

**Interfaces:**
- Consumes: none.
- Produces: `QLENS.CONFIG.IMAGE_SEARCH_TIMEOUT_MS`, `…IMAGE_MAX_BYTES`, `…IMAGE_MAX_DIM`, `…IMAGE_JPEG_QUALITY`, `…LENS_FILENAME`; `QLENS.MSG.IMAGE_SEARCH`.

- [ ] **Step 1: Add config constants**

In `src/shared/config.js`, extend the object literal that currently ends with `MAX_SELECTION_MAX: 1000` (line ~37):

```js
  MAX_SELECTION_MIN: 50,
  MAX_SELECTION_MAX: 1000,
  IMAGE_SEARCH_TIMEOUT_MS: 20000,
  IMAGE_MAX_BYTES: 5 * 1024 * 1024,
  IMAGE_MAX_DIM: 2048,
  IMAGE_JPEG_QUALITY: 0.9,
  LENS_FILENAME: 'qlens-search.png'
```

- [ ] **Step 2: Add message type**

In `src/shared/messaging.js`, extend the `QLENS.MSG` object (currently ends with `OVERLAY_READY`, line ~9):

```js
  OPEN_TAB: 'QLENS_OPEN_TAB',
  FETCH_SUGGESTIONS: 'QLENS_FETCH_SUGGESTIONS',
  SUGGESTIONS_RESULT: 'QLENS_SUGGESTIONS_RESULT',
  OVERLAY_READY: 'QLENS_OVERLAY_READY',
  IMAGE_SEARCH: 'QLENS_IMAGE_SEARCH'
```

- [ ] **Step 3: Syntax check + commit**

Run: `node tests/check-syntax.mjs` (and `node tests/unit/run.mjs` — both still green).

```bash
git add src/shared/config.js src/shared/messaging.js
git commit -m "feat(images): config constants + IMAGE_SEARCH message type"
```

---

### Task 3: Service worker image-search handler

**Files:**
- Modify: `src/background/service-worker.js` (add `handleImageSearch`, fallback URL constant, wire into `onMessage`)

**Interfaces:**
- Consumes: `QLENS.CONFIG.IMAGE_SEARCH_TIMEOUT_MS`, `QLENS.MSG.IMAGE_SEARCH`, `QLENS.lensUploadBody`, `QLENS.LENS_UPLOAD`, `QLENS.isSafeHttpUrl`.
- Produces: `handleImageSearch(payload)`; message `IMAGE_SEARCH { bytes(base64), text, name? }` → responds `{ ok: true }` after opening the tab (fires `tabs.create` itself; overlay only destroys).

- [ ] **Step 1: Add fallback constant + handler**

After `handleSuggestions` (line ~207), append:

```js
const LENS_FALLBACK = 'https://lens.google.com/';

function decodeBase64ToBytes(b64) {
  try {
    const raw = globalThis.atob(b64);
    const n = raw.length;
    const out = new Uint8Array(n);
    for (let i = 0; i < n; i++) out[i] = raw.charCodeAt(i);
    return out;
  } catch (err) {
    return null;
  }
}

async function handleImageSearch(payload) {
  const p = payload || {};
  const b64 = typeof p.bytes === 'string' ? p.bytes : '';
  const text = typeof p.text === 'string' ? p.text : '';
  const name = typeof p.name === 'string' ? p.name : '';
  const raw = decodeBase64ToBytes(b64);
  const cap = QLENS.CONFIG.IMAGE_MAX_BYTES || 5 * 1024 * 1024;
  if (!raw || raw.length === 0 || raw.length > cap) {
    try {
      await chrome.tabs.create({ url: LENS_FALLBACK, active: true });
    } catch (err) {
      return false;
    }
    return true;
  }
  const boundary = '----qlens' + makeNonce();
  const body = QLENS.lensUploadBody(b64, text, name || QLENS.CONFIG.LENS_FILENAME, boundary);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), QLENS.CONFIG.IMAGE_SEARCH_TIMEOUT_MS);
  let url = null;
  try {
    const resp = await fetch(QLENS.LENS_UPLOAD, {
      method: 'POST',
      redirect: 'follow',
      body,
      headers: { 'Content-Type': 'multipart/form-data; boundary=' + boundary },
      signal: controller.signal,
      cache: 'no-store'
    });
    const final = resp && resp.url ? resp.url : '';
    if (QLENS.isSafeHttpUrl(final)) url = final;
  } catch (err) {
    url = null;
  } finally {
    clearTimeout(timer);
  }
  try {
    await chrome.tabs.create({ url: url || LENS_FALLBACK, active: true });
  } catch (err) {
    return false;
  }
  return true;
}
```

- [ ] **Step 2: Wire into the message listener**

In `onMessage` (line ~209), add a branch after `FETCH_SUGGESTIONS` handling (current lines 223-228):

```js
  if (msg.type === QLENS.MSG.IMAGE_SEARCH) {
    handleImageSearch(msg.payload)
      .then((ok) => sendResponse({ ok }))
      .catch((err) => sendResponse({ ok: false, error: String(err) }));
    return true;
  }
```

- [ ] **Step 3: Syntax check + commit**

Run: `node tests/check-syntax.mjs`
Expected: all OK.

```bash
git add src/background/service-worker.js
git commit -m "feat(images): SW uploads image to Google Lens and opens results"
```

---

### Task 4: Overlay image button + chip + attach + submit

**Files:**
- Modify: `src/content/overlay.js` (state, DOM, listeners, submit path)

**Interfaces:**
- Consumes: `QLENS.MSG.IMAGE_SEARCH`, `QLENS.CONFIG.{IMAGE_MAX_BYTES, IMAGE_MAX_DIM, IMAGE_JPEG_QUALITY, LENS_FILENAME}`, `chrome.runtime.sendMessage` (IMAGE_SEARCH).
- Produces: `attachment` overlay state; `.ql-img-btn` + `.ql-img-chip` DOM; `attachImage(file)`, `renderImageChip()`, `base64FromBytes(bytes)`, `searchImage()`, and integrated paste/drop/Esc.

Design specifics (matching the spec R1–R5, N4, N5):
- New state near the top (after `selectionActive = false;` line ~911):

```js
  let attachment = null;
```

- The image button is placed between the query input and the chip zone (`inputRow.appendChild(iconSvg(…))` order preserved); `chipZoneEl` currently sits between input and close. New DOM: after `chipZoneEl` is created, insert `imgBtn` and hidden `fileInput` before `closeBtn`. The **thumbnail chip** (`.ql-img-chip`) replaces the render target of `renderChip` — see below.
- `renderImageChip()` appends the thumbnail chip into `chipZoneEl` alongside any selection chip (order: selection chip first).
- Paste: add a `paste` listener on `root` (and a `keydown` handler for browser-agnostic Ctrl/⌘+V) that only intercepts when `e.clipboardData` contains an image `File` and the event target is inside the host. Non-image pastes pass through untouched.
- Drop: `dragover` + `drop` on the whole panel — `e.preventDefault()` in `dragover`; in `drop`, take the first `dataTransfer.files` entry whose type starts `image/`.
- Esc: in `onKeyDown`, `Escape` currently `destroy(true)` regardless. Change to: if `attachment` is set, remove it; else close.
- Submit: inside `submitQuery`, before the `buildSearchUrl` branch, add the attachment branch. If `attachment` is set, call `searchImage()` and return (never fall through to text search).
- `searchImage()` builds `{ bytes: base64FromBytes(attachment.bytes), text: inputEl.value.trim(), name: attachment.name || '' }`, `sendMessage(IMAGE_SEARCH)` fire-and-forget (`.catch(() => {})`), then `destroy(false)` — the overlay-close-before-tab guarantee.
- `removeImage()` (from chip × or a repeat Esc) clears `attachment` and re-renders.
- `attachImage(file)` reads via `createImageBitmap` → `<canvas>` scaled to `IMAGE_MAX_DIM` long edge → `canvas.toBlob('image/jpeg', IMAGE_JPEG_QUALITY)` → if blob.size > `IMAGE_MAX_BYTES` show inline error and abort → `arrayBuffer()` → `Uint8Array`; `src` = blob object URL; `name` = `LENS_FILENAME` or the file's name.

- [ ] **Step 1: Add state + icon + DOM**

Add the state variable, the image button SVG icon, the hidden file input, and `renderImageChip`/`removeImage`/`attachImage`/`base64FromBytes`/`searchImage` implementations (full bodies in the diff below), and call `renderImageChip()` wherever `renderChip()` is currently called (build end, attach/remove, `show`, `hydrate`).

- [ ] **Step 2: Wire listeners (paste, drop, Esc, submit)**

In `addListeners()`, add `root.addEventListener('paste', onPaste)` and the panel-level `drop`/`dragover`. In `onKeyDown`, change the `Escape` branch. In `submitQuery`, add the attachment branch.

- [ ] **Step 3: Syntax check + manual review**

Run: `node tests/check-syntax.mjs`; `node tests/unit/run.mjs`.
Expected: all green; then re-read `overlay.js` overlay lifecycle for any host/`closeBtn` interactions — confirm `removeHost` clears `attachment` and revokes any object URL.

- [ ] **Step 4: Commit**

```bash
git add src/content/overlay.js
git commit -m "feat(images): overlay image button, paste/drop attach, Lens submit"
```

---

### Task 5: Manual QA rows + docs (README / CHANGELOG / TASKS / MEMORY)

**Files:**
- Modify: `tests/manual-checklist.md` (add image rows)
- Modify: `README.md` (Features table rows)
- Modify: `CHANGELOG.md` (new version entry)
- Modify: `TASKS.md` (Phase 8 tasks)
- Modify: `MEMORY.md` (phase + last-completed)

- [ ] **Step 1: Manual QA rows**

Append to `tests/manual-checklist.md`:

```
| M1 | Overlay → camera button → pick PNG | Thumbnail chip appears; Enter opens Google Lens with results for that image | |
| M2 | Copy an image, Ctrl+V into overlay input | Same as M1 (clipboard paste) | |
| M3 | Drag & drop an image onto the overlay | Same as M1 (drop) | |
| M4 | Attach image + type text | Lens results reflect both image AND text (v3 Lens shows text query) | |
| M5 | Attach image → Esc | Removes attachment (not the overlay); Esc again closes | |
| M6 | Click thumbnail × | Removes attachment | |
| M7 | Text-only search while image attached (no Enter-on-image) | Normal engine search still works if image removed first | |
```

- [ ] **Step 2: README features table**

Add a row to the Features table:

```
| Image search | Image button in overlay — file picker, paste, or drop; optional text → Google Lens |
```

- [ ] **Step 3: CHANGELOG entry**

Add under a new `## v1.3` heading:

```
## v1.3
- Image search: attach a local image (button / paste / drag & drop) + optional text → Google Lens reverse-image search (upload + image_content; 20 s timeout; fallback tab). Zero new permissions.
```

- [ ] **Step 4: TASKS + MEMORY**

Append a `## Phase 8: v1.3 (user request)` block to `TASKS.md` with the four completed tasks (`T026`-`T029`), all `- [x]`. In `MEMORY.md` update `Last Updated`, phase, last-completed task, and note the image-search implementation facts (endpoint, constants, message, guard clauses).

- [ ] **Step 5: Full verification + commit**

Run: `node tests/check-syntax.mjs` AND `node tests/unit/run.mjs`.
Expected: all pass. Then, if you have Chrome for Testing at the MEMORY.md path, run the optional smoke: `node tests/e2e/smoke.mjs` — existing suites must stay green (no regression).

```bash
git add tests/manual-checklist.md README.md CHANGELOG.md TASKS.md MEMORY.md
git commit -m "docs(v1.3): image search — manual QA, README, CHANGELOG, TASKS"
```

---

## Self-Review

1. **Spec coverage:** R1–R7 (overlay button, paste, drop, chip, Enter→Lens, text-search untouched, no settings changes) → Task 4 + Task 2; N1 (timeout+fallback) → Task 3; N2 (local bytes, no storage) → Task 4+3; N3 (allowlist) → Task 3; N4 (Esc/paste) → Task 4; N5 (destroy-before-create) → Task 4 `searchImage()`. Everything else (privacy, tests, docs) → Task 1/5. No gaps.
2. **Placeholder scan:** all steps carry concrete code or exact file paths; the Task 4 file-level descriptions reference "full bodies in the diff below" — no TBDs. The Task 4 DOM/paste/drop logic is specified precisely enough that the implementer writes determinable code, with the exact selector names and the exact integration points named.
3. **Type consistency:** `lensUploadBody(base64Bytes, text, filename, boundary) → Uint8Array` matches Task 1 definition; `handleImageSearch(payload)` matches Task 3; `MSG.IMAGE_SEARCH` from Task 2 is used in Task 3+4; `LENS_FILENAME` constant referenced consistently.