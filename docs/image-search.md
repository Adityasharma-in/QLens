# Image search: how QLens gets you to a Google Lens result page

Reverse image search in QLens is built around one rule: **the only page the user
ever sees is the results page.** No loading interstitial, no detour through
google.com, no visible upload. This document is the method, with the measured
browser behavior each decision rests on.

Code: `src/background/service-worker.js` (pipeline), `src/content/overlay.js`
(attach + UI state), `src/shared/config.js` (budgets).

## The pipeline

### 0. Warm-up (SW start)

`warmLens()` fires a fire-and-forget `https://lens.google.com/generate_204`
(`mode: 'no-cors'`) when the service worker starts and again at the top of
`handleImageSearch`, so the first real upload pays no DNS/TLS handshake.

### 1. Attach (speculative upload)

Attaching an image — camera button, paste, or drop — makes the overlay encode it
locally (`QLENS.ImageEngine`: max 1600 px, WebP-first, cap
`IMAGE_MAX_BYTES` = 5 MB) and immediately send a `{preflight:true, …}` upload
request. The user is still deciding at this point, so the upload is usually
finished before Enter. The overlay stores the reply's URL only when
`r.ok === true && typeof r.url === 'string'` and the hash still matches the
attached image.

### 2. Enter (overlay)

`searchImage()` sends one of two payloads:

| Case | Payload |
|---|---|
| preflight resolved | `{ url, text, name, hash }` |
| otherwise | `{ bytes (base64), text, name, hash, mime }` |

Base64 is the transport because extension messaging is JSON-only — typed arrays
do not survive the clone. Only one search runs at a time: the chip switches to
`Searching Google Lens…`, the button is disabled, and `IMAGE_SEARCH_UI_WAIT_MS`
(30 s) is the UI's own backstop.

### 3. Resolve (service worker, one 24 s deadline)

`handleImageSearch` tries these in order and stops at the first success:

1. **Resolved URL** — `p.url` from a preflight: validate it, apply the text
   query, `tabs.create({ url, active: true })`, cache it. No network at all.
   Measured SW reply: **96 ms**.
2. **Intake validation** — empty, oversize (> `IMAGE_MAX_BYTES`), or
   non-base64 payloads fail closed with `{ok:false, error:'bad-payload'}` and
   open no tab. A charset-valid payload that cannot be decoded fails the same
   way; the decode happens before any tab is created.
3. **Session cache** — a 5-minute `chrome.storage.session` entry keyed by the
   image hash (+ text + name) replays the URL with zero upload.
4. **Single-flight join** — a search that lands while the preflight's upload is
   still running joins that request (`lensFlights` / `startLensFlight`) instead
   of uploading a second time.
5. **Direct upload** — `POST https://lens.google.com/v3/upload`, multipart with
   `encoded_image` and, when the user typed something, `image_content`.
   `redirect: 'follow'`, aborted after `min(IMAGE_SEARCH_TIMEOUT_MS, remaining)`.
   Measured in Chrome 155: `redirect: 'manual'` yields an `opaqueredirect`
   (`status 0`, no `Location`), so *following* the 303 is the only way to learn
   the result URL. The result URL is therefore the followed `resp.url`, with the
   `Location` header as a fallback. A non-network failure (403, wall page) does
   **not** retry the alt endpoint — that only doubles the stall; a network throw
   retries the alt once if 1.5 s of budget is left. Cost when the endpoint
   answers: **382 ms** upload → tab open.
6. **Page-origin fallback** — for environments where the extension-origin POST
   is refused. A *hidden* helper tab is created at `https://www.google.com/`
   (`active: false`), the google.com document is awaited (≤6 s), and
   `lensUploadFunc` is injected into the page's MAIN world. That function is
   self-contained by necessity (it is serialized into the page, so it can only
   see its own scope and page globals) and tries **both** upload endpoints in
   order — `lens.google.com/v3/upload`, then `www.google.com/searchbyimage/upload`
   — each with its own abort (half the remaining budget, ≤6 s), returning the
   first URL that looks like a result page.
   Measured in Chrome 155 from a google.com page: `/v3/upload` is refused
   outright while `/searchbyimage/upload` answers a 303 that lands on a real
   `https://www.google.com/search?vsrid=…` results URL. A single-endpoint
   uploader cannot succeed in that environment at all.
7. **Adopt** — the helper tab is navigated to the results URL and focused **only
   after that URL has committed** (`navigateThenFocus` polls `chrome.tabs.get`).
   If the navigation cannot be confirmed, the helper is closed and a fresh
   results tab is opened instead. Nothing about the helper — the Google homepage,
   the upload — is ever the visible document.
8. **Failure** — no tab is opened at all. The worker answers
   `{ok:false, error:'lens-unreachable'|'bad-payload'}`, and the overlay keeps the
   image attached, stops the spinner and shows *"Google Lens did not answer. Try
   again."*

### 4. Text queries

`applyLensText` rewrites a `google.<tld>/search` result into
`udm=24&q=<text>&lns_mode=mu&oq=` — only when the user typed text, and never for
a `lens.google.com` result. Verified live: the results tab URL carried
`…&udm=24&lns_mode=mu&…&q=blue+car&oq=`.

## Invariants

- **One tab per search.** The hidden helper is the same tab that ends up showing
  the results; nothing else is created.
- **One accept gate.** Every URL that can open a tab or enter the cache passes
  `isSafeLensResultUrl`: https, `QLENS.isSafeHttpUrl`, either a
  `google.<tld>` host with an anchored TLD or `lens.google.com`, and never one of
  the two upload endpoints.
- **Bounded.** `IMAGE_SEARCH_TOTAL_MS` (24 s) bounds the whole search, the upload
  abort is `min(IMAGE_SEARCH_TIMEOUT_MS, remaining)`, the fallback commit is
  capped at 6 s, each in-page endpoint at half the remaining budget, and the
  overlay gives up at 30 s.
- **Focus is never stolen.** The helper is created `active: false` and focused
  after its URL commits. A bounded watchdog (`LENS_HELPER_GUARD_MS`) hands the
  view back to the tab that was active before the helper was created, for
  browsers that pull a worker-created tab to the front.
- **No interstitials.** `src/lens/loading.html` / `loading.js` are no longer
  referenced by any code path.

## Verification

- Deterministic: `node tests/unit/run.mjs` evaluates the real lens slice of
  `service-worker.js` against a fake `chrome`/`fetch`. It pins the one-tab rule,
  the URL gates, the flight join, the focus ordering, and (by evaluating
  `lensUploadFunc`'s serialized source in a bare page-shaped context) that the
  in-page uploader depends on no service-worker scope.
- Live: a Chrome-for-Testing run drives the real overlay (attach a file → press
  Enter) and records every tab URL from `chrome.tabs` events plus every document
  that was ever `visibilityState === 'visible'`. Expected timeline:
  `created(https://www.google.com/, active:false)` → `updated(<results URL>)` →
  `activated`. Only the probe page and the results URL are ever on screen.
- Environment note: this machine's IP is walled by Google (`/v3/upload` and
  `/searchbyimage/upload` answer 403 from the extension origin, and the *results
  navigation* is redirected to `/sorry/index` right after it commits). The
  wall is why the page-origin path exists, and it is what a live run here ends
  on — the extension's own navigation is exact.
