# QLens Image Search — Design

Date: 2026-08-16
Status: Approved in principle
Scope: Add reverse-image ("Search this image") search to the QLens overlay

## 1. Goal

Let the user search an image on Google Lens straight from the QLens overlay —
optionally combined with a typed text query — with **zero new permissions**,
**zero backend**, and **zero page residue**, matching all existing QLens
architecture rules.

## 2. Verified feasibility (live, 2026-08-16)

The cloud path is end-to-end confirmed with `curl`:

| Endpoint | Request | Result |
|---|---|---|
| `POST https://www.google.com/searchbyimage/upload` | multipart; field `encoded_image` = image file | **302** → `www.google.com/search?...udm=26…` (Lens results) |
| same upload | extra form field `image_content` = typed text (verified empty and non-empty) | **302** → Lens results |
| `GET https://www.google.com/searchbyimage?image_url=<url>` | image hosted online | **303** → Lens results |

- The **upload path** is chosen (works from raw local bytes, no remote URL needed).
- `image_content` carries the overlay's text query; empty text = pure visual search.
- No Chrome permission beyond the existing `host_permissions` (`http://*/*`, `https://*/*`)
  and standard `fetch` from the service worker. `fetch()` in a MV3 SW can send the
  multipart body and read the redirect target.

## 3. Requirements

Functional:
1. **R1** — Overlay input row gains an image button (camera icon). Clicking opens a
   file picker (`image/*`, single file).
2. **R2** — Pasting an image (`Ctrl+V`) while the overlay input row is focused attaches
   it (pixels-formats honored: PNG/JPEG/GIF/WebP/BMP; signature sniffed).
3. **R3** — Drag-and-drop an image onto the overlay also attaches it.
4. **R4** — Attached image renders as a removable thumbnail chip in the input row
   (click or × removes the attachment only).
5. **R5** — While an image is attached, pressing **Enter** sends the image (plus the
   current text in the query box, trimmed) to **Google Lens** in a new tab. Engine
   pills/modes are ignored for image searches; Google Lens is always used.
6. **R6** — Normal text searches are completely unaffected (no image attached ⇒
   existing `buildSearchUrl` path unchanged).
7. **R7** — No settings, no storage-schema changes, no manifest permission additions.
   (The `storage` settings surface stays as-is.)

Non-functional:
8. **N1** — Upload has a hard timeout (20 s) and a validation failure leads to a
   graceful degrade: tab still opens to Google Lens, overlay shows an inline "couldn't
   reach" toast.
9. **N2** — Image bytes are read locally via the File API in the content script and
   are never written to `chrome.storage`. The multipart body is built in the service
   worker from the in-memory bytes. Transient only.
10. **N3** — All redirect targets and opened URLs pass the existing http(s) allowlist
    (`QLENS.isSafeHttpUrl`).
11. **N4** — Keyboard: `Esc` removes the attachment first, then closes the overlay.
    `Ctrl+V` pastes; no other hotkeys added.
12. **N5** — The overlay is destroyed synchronously before `tabs.create` for the Lens
    tab (existing no-residue guarantee preserved).

## 4. Chosen approach (and why not the alternatives)

| Option | Verdict |
|---|---|
| **Upload `encoded_image` to `/searchbyimage/upload` (Lens)** | **Chosen.** No new permission; fully local; endpoint verified; uniformly combines text through `image_content`. |
| `searchbyimage?image_url=` URL mode | Rejected: needs the image reachable at a public URL; private/HTTPS-hotlink-blocked images fail. Worked in curl but unreliable in the wild. |
| Data-URI drop on `www.google.com/search?url=…` | Rejected: `url=http://www.google.com/searchbyimage/upload` is not a valid Lens search; no evidence it works. |
| Bing visual search | Rejected: unverified endpoint, anti-bot risk, out of "Google Lens only" scope. |

## 5. Architecture & files

Modules follow the existing `globalThis.QLENS` namespace convention and stay pure
where possible.

### `src/shared/engines.js` (pure additions)
- `QLENS.buildLensUploadUrl(text)` → `https://www.google.com/searchbyimage/upload`
  (constant; kept as a unit-testable pure function so the endpoint is named once).
- `QLENS.lensUploadBody(base64Bytes, text, filename, boundary)` → `Uint8Array` of the
  complete multipart body (UTF-8 header parts + `encoded_image` binary from the
  base64 decoding of `base64Bytes`, `image_content` = trimmed text, both under the
  random boundary). Synchronous, unit-testable (decode and assert the parts appear,
  with CRLF framing and closing `--boundary--`).
- `QLENS.LENS_UPLOAD` endpoint constant lives near it.

### `src/shared/config.js`
- `SUGGESTION_TIMEOUT_MS` pattern reused: add `IMAGE_SEARCH_TIMEOUT_MS: 20000`,
  `IMAGE_MAX_BYTES: 5 * 1024 * 1024` (5 MB), `IMAGE_MAX_DIM: 2048` (longest edge for
  thumbnail resize), `IMAGE_JPEG_QUALITY: 0.9`, `LENS_FILENAME: 'qlens-search.png'`
  (the `.png` avoids sniffing; bytes are whatever got re-encoded).

### `src/shared/messaging.js`
- `MSG.IMAGE_SEARCH: 'QLENS_IMAGE_SEARCH'`.

### `src/content/overlay.js`
New state: `attachment = { bytes: Uint8Array, src: string (data:… preview), name: string | null } | null`.

New DOM in the input row (between the query input and the close button):
- `.ql-img-btn` — camera/image icon button, `type=button`, `aria-label="Search an image"`,
  title "Add image (paste works too)".
- hidden `<input type="file" accept="image/*">` aligned to the button; `click` re-opens
  via `file.click()`.
- `.ql-img-chip` — thumbnail chip when `attachment` is set: 30px `background-image:
  url(data:…)`, an × remove button, and a small "by image" hint. Focus-/keyboard-accessible.

Behavior:
- `attachImage(file)`:
  1. `file.type` empty-ish ⇒ sniff magic bytes (`\x89PNG`, `\xFF\xD8\xFF` JPEG, `GIF8`,
     `RIFF…WEBP`, `BM` BMP). If a signature matches, use that MIME for the re-encode.
  2. Load via `createImageBitmap` (with `URL.createObjectURL` fallback) → draw to a
     `<canvas>` clamped to `IMAGE_MAX_DIM` → `canvas.toBlob('image/jpeg', IMAGE_JPEG_QUALITY)`.
  3. Cap: if the re-encoded blob is still > `IMAGE_MAX_BYTES`, show the inline error and
     reject (no network).
  4. `arrayBuffer()` → `Uint8Array`; `src` = object URL of the canvas blob; store.
- `pasteHandler`: on `keydown` Ctrl/⌘+V *or* on `paste` (browser-agnostic): if
  `e.clipboardData` has an image item or a `File` whose type starts `image/`,
  `preventDefault()` and `attachImage`. Only active when the nearest live input is the
  QLens overlay input (element-from-point / activeElement-in-host check). If no image in
  clipboard, let the paste behave normally.
- `dropHandler` on the panel: `dataTransfer.files` image file → `attachImage`.
- `flip` Esc handling: if `attachment` set and query empty, remove attachment; else close.
- `submitQuery(query)` path: if `attachment` → call the new `searchImage()` instead.
  `searchImage()`:
  1. `const text = inputEl.value.trim()`.
  2. `OPEN_TAB` is NOT used; instead `chrome.runtime.sendMessage({type: IMAGE_SEARCH,
     payload: { bytes: base64(attachment.bytes), text, name: attachment.name || '' }})`.
  3. Overlay destroyed synchronously after send (same guarantee as `openTab`).
- `renderImageChip()` re-renders the chip on attach/remove.

### `src/background/service-worker.js`
New handler `handleImageSearch(payload)`:
1. Guard: sender OK, `payload` object, `base64` string non-empty, size ≤ cap.
2. Build `boundary` (`'----qlens' + makeNonce()`), call `QLENS.lensUploadBody(...)`.
3. `fetch(QLENS.LENS_UPLOAD, { method:'post', redirect:'follow', body, headers:{'Content-Type':
   'multipart/form-data; boundary='+boundary} })`, wrapped in `AbortController`
   `IMAGE_SEARCH_TIMEOUT_MS`.
4. Final `resp.url` ⇒ `isSafeHttpUrl`? ⇒ `tabs.create({url, active:true})`. If the fetch
   failed, fell back, or the redirect was blocked ⇒ `tabs.create(googleLensResultsFallback)`
   (a plain `https://lens.google.com/`), so the user always lands somewhere useful.
5. Wire into `onMessage`: `if (msg.type === QLENS.MSG.IMAGE_SEARCH) …` async-response,
   mirrors `FETCH_SUGGESTIONS`.

No change to `manifest.json` (no new permissions; `host_permissions` already cover
`www.google.com`). The upload cap stays `IMAGE_MAX_BYTES` (5 MB).

## 6. Error handling & edge cases

| Case | Behavior |
|---|---|
| Non-image / rejected file | No network; inline toast; attachment unchanged. |
| Re-encode > cap | No network; inline toast. |
| `fetch` throws / timeout / non-200 | Open fallback `https://lens.google.com/` tab; toast not shown in a closed overlay (acceptable). |
| Redirect target protocol not http(s) | `isSafeHttpUrl` blocks; fallback tab. |
| Upload 302 to a `search?...udm=26` (normal) | Opened as-is. |
| Clipboard paste with no image | Not intercepted; normal text paste. |
| Page context injection re-runs | Nonce guard unchanged; `attachImage` listeners scoped to the overlay host. |

## 7. Testing

Unit (`tests/unit/run.mjs`):
- `lensUploadBody`: empty text → body contains `encoded_image` + `image_content` empty;
  non-empty text → part present, order `encoded_image` then `image_content`, correct
  CRLF framing and `--boundary--` terminator; body bytes match a manually constructed
  reference for a fixed tiny input.
- `buildLensUploadUrl`: constant returns the endpoint; no user data leaks into the query
  string (image search is entirely POST).
- `engines`: existing suites must stay green (no regression).

Syntax: `node tests/check-syntax.mjs` (whole `src/`).

Optional smoke (`tests/e2e/smoke.mjs`): paste path driving the content script file
picker is flaky under CDP; kept manual. Manual QA rows in `tests/manual-checklist.md`.

## 8. Privacy

Image bytes and any typed text go **from the user's device directly to Google** in a
real Lens tab — exactly how typing a normal query reaches the engine today. Nothing is
stored, transmitted to any third party, or written to `chrome.storage`.

## 9. Out of scope

- Bing/Brave/DuckDuckGo visual search.
- Image search from the context menu / popup (only the overlay button + paste + drop).
- Persisting an attachment across overlay lives.
- Multiple images in one search.
- URL-based reverse search.