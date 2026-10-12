# CHANGELOG

## [Unreleased]

### Fixed
- **Shortcut opened nothing on any normal site (both default and custom combos).** The manifest's `host_permissions` listed only the 3 Google hosts, but every first-open-per-page injects the overlay via `chrome.scripting.executeScript`, which needs a host grant for the target tab. The injection threw `Cannot access contents of the page`, was swallowed into a service-worker-only `console.warn`, and the page console stayed clean — exactly the reported symptom (popup kept working because it needs no injection). `host_permissions` now also includes `http://*/*` + `https://*/*`, matching the PRD §9 / manifest-block spec. Also: `chrome.commands.onCommand` now uses the tab Chrome hands it instead of re-querying, so a cold-SW empty `tabs.query` can no longer leave the command path tab-less.
- Options page: the Theme and "Right-click search" segmented controls now save correctly. Their click handlers were being attached twice, so every click fired two storage writes.

### Performance
- The extension's per-page footprint is 41% smaller. The content script injected into every http(s) page now loads 4 files (19.8 KB) instead of 6 (33.6 KB) — the engine registry and launcher ranker load when the overlay is actually opened instead of on every page you visit. No behaviour change.
- The overlay's tab/bookmark/history launcher no longer re-queries Chrome on every keystroke. Open tabs are snapshotted for 1s and bookmark/history results are memoised for 2-5s, so backspacing, retyping and re-opening the overlay reuse the last result instead of hitting Chrome's history database again. Ranking, ordering and result limits are unchanged.
- Typing in the overlay no longer re-validates the custom-engine list and launcher settings on every keypress — both are computed once per settings load instead of 2-6 times per keystroke.
- The overlay no longer pins a permanent full-viewport compositor layer for its edge-glow frame, freeing GPU memory while the overlay is open.

### Removed
- Unused code: a dead multipart image-upload builder and its filename constant, an unused custom-engine lookup, three never-called async helpers (`createRequestTracker`, `createDebouncer`, `withTimeout`), an unused selection-text helper, two message types that were never sent or handled, per-engine suggestion URLs that were never read, one unused plus one duplicated stylesheet token, and script tags the popup and options pages never used.

### Added
- Google AI Mode: `Tab` in the overlay toggles Google normal ⇄ Google AI (searches with `udm=50&ntc=1&cs=0&atvm=2&zs=1` on `/search` — the user-verified AI results surface; `sxsrf` session tokens are never hardcoded); always-visible `AI Mode` switch pill with spark icon; footer, suggestion rows, and smart-URL row label the state ("Google AI" / `· AI`). Toggling AI snaps the engine to Google; choosing another engine or mode, or typing any prefix, clears it. (Earlier attempts — `webhp?atvm=2` and `/search?udm=2` — both failed live.)
- Image search: camera button in the overlay input row (click to pick a file, `Ctrl+V` paste, or drag & drop an image) attaches a removable thumbnail chip; pressing `Enter` sends the image plus any typed text to **Google Lens** (verified `POST /searchbyimage/upload` with `encoded_image` + `image_content`) and opens the results in a new tab. Image bytes are read and re-encoded locally (canvas, ≤1600 px, ≤5 MB, WebP-first) and never touch `chrome.storage`; offline-friendly formats sniffed (PNG/JPEG/GIF/WebP/BMP/AVIF/HEIC/SVG); overlay shows the thumbnail instantly and keeps Enter queued while preparing; the results tab opens instantly on a loading page while the upload runs; repeat searches of the same image hit a 5-minute session cache with zero re-upload; TLS warmed via `generate_204`; 15 s upload timeout with a `lens.google.com` fallback. Zero new permissions.

## [1.1.0] — 2026-08-14

### Added
- Toolbar action popup: quick search with engine pills, theme/accent controls, suggestions toggle, shortcut badge, link to full settings
- Rebindable overlay shortcut: capture field in options (Ctrl/Alt + letter/number/F-key); combo is matched by a content-script keydown listener (works on any page; manifest command kept as default trigger)
- Inter typeface bundled locally (400/500/600/700, OFL) — options page and overlay both use it

### Removed
- Recent-search history (overlay rows, options card, storage API)

### Technical notes
- Chrome exposes no programmatic shortcut-update API (`chrome.commands.update` does not exist even in the service worker) — the rebind feature stores the combo and matches keydowns in the content script instead
- Fix: popup page now loads shared/messaging.js (previously QLENS.MSG was undefined there, silently breaking popup search)

## [1.0.0] — 2026-08-14

Initial release per PRD.

### Added
- F1 Global quick-search overlay (Ctrl+Shift+K, rebindable; on-demand guarded injection; ephemeral, zero residue)
- F2 Four engines (Google, Brave, Bing, DuckDuckGo): Tab cycle, pills, `g b k d` prefixes, last-engine persistence
- F3 Selected-text auto-fill (200-char cap, editable-region guard, "From selection" chip)
- F4 Liquid-glass overlay UI: dark/light, 6 accents, spring motion, reduced-motion support, WCAG AA, focus trap
- F5 Search suggestions (250 ms debounce, 1.5 s abort, stale-drop, Brave labeled "via Google", silent offline)
- F6 Recent searches (10 unique, delete, clear all, click re-search)
- F7 Smart query handling ("Go to site" for URLs, http/https allowlist, quotes preserved)
- F8 Quick modes (images/videos/news/YouTube/Wikipedia — pills + prefixes)
- F9 Options page (default engine, drag order, theme/accent, behavior toggles, shortcut info, data controls)
- F10 Right-click context menu ("Search with QLens" — overlay or direct, setting)
- Hardening: nonce injection guard, sender.id validation, storage validate-and-fallback, IME-safe Enter

### Fixed
- (n/a — first release)

### Known limitations / future work
- F11 clipboard quick-search chip, blur-close beyond setting, sync settings → v1.1 (PRD roadmap)