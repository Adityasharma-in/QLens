# CHANGELOG

## [Unreleased]

### Fixed (a saved custom shortcut died after an extension update)
- **A custom combo stopped opening the overlay after QLens updated, and only a reset + reapply brought it back.** Chrome does not re-inject content scripts into tabs that were already open when an extension is reloaded or updated, so those pages kept the old injector: its `keydown` handler still lived in the page, but its `chrome` context was dead. The old handler read the combo through the page's stale `QLENS.storage.getShortcut()`, which silently resolves to the default — and a custom combo never reaches `chrome.commands`, so nothing opened until the page was reloaded or the combo was saved again.
- The injector now always replaces its previous `keydown` handler and `chrome.storage.onChanged` listener on re-injection instead of early-returning, and it reads the combo through live `chrome.storage.local` first (`src/content/injector.js`). Saving a new combo also swaps it in open pages without a reload.
- The service worker now repairs already-open tabs: `repairOpenTabs()` re-injects the message bridge into up to 80 normal http(s) tabs (4 at a time) on `chrome.runtime.onInstalled` and whenever the shortcut storage key changes, so the shortcut works immediately after an update with no reset or reapply.
- Version bumped to `1.1.1` across `manifest.json`, `package.json`, and the config fallback.

### Fixed (only one overlay can ever be visible)
- A press can no longer produce two search panels. The live shortcut handler now claims the combo at `window` capture and stops it before any listener deeper in the tree can act, so an orphaned injector from before an extension update cannot handle the same keypress and open a second panel.
- Both the injector and `QLENS.Overlay.show()` now check the page DOM for an existing QLens host (`data-qlens-overlay`, with a legacy `role="dialog"` + label fallback verified by its `.ql-panel` shadow content). If another instance is on screen, the press closes that panel through its own close control instead of stacking a new one; `show()` also clears a foreign host before building, so the service-worker message path cannot duplicate a panel either.
- Closing a foreign panel is guaranteed in one press even when it holds a typed query: the close control normally clears text first and only closes an empty field, so its shadow input is cleared before the click. The host is then detached immediately rather than left for its 90 ms fade, and `show()` reclaims the search input after that fade would have restored focus to the page — so no frame shows two panels and typing still works right away.

### Fixed (polish + correctness audit)
- The overlay no longer washes out to light when the operating system is in light mode and the extension's Appearance is set to Dark: the system-light token block now only applies when no explicit theme is chosen (the same guard `options.css` already used), and the duplicated input-row overrides were collapsed.
- If a search tab cannot be opened (popup blocked, a rejected message), the overlay now comes back with the typed query and "Could not open a new tab." instead of vanishing into a blank page. The URL is validated before the overlay is torn down.
- Dropping a file onto the overlay no longer throws when the image module is missing; the handler feature-detects `QLENS.ImageEngine.isImageFileLike` and falls back to a MIME check.
- The caret/highlight measurement now copies the input's computed font and letter-spacing instead of a hardcoded `600 16px`, so it stays aligned if the field's type changes.
- Options "Reset all" now also restores favorites, engines, the edge-collapse state, masthead stats, the shortcut field, and closed forms; the former `window._updateEdgeCollapse` global is a module-scoped function.
- Options saves are announced to assistive tech (the toast is now a polite `role="status"` live region), and segmented theme/context controls use `aria-checked` on `role="radio"` instead of mixed `aria-pressed`/`aria-checked`.
- Visible `:focus-visible` rings added for options/popup icon buttons, segmented buttons, swatches, edge presets, rail links, inputs, and toggle thumbs.
- The omnibox empty-query copy had a missing space ("Type a query — QLens searches..."), and the masthead CTA that scrolls to Quick Commands is now labelled "Try Quick Commands" (`mast-quick-commands`) instead of claiming to test the overlay.
- `manifest.json` and `package.json` were still `1.0.0` while the release notes, options footer, and config fallback said `1.1.0`; all three now agree, and a unit test pins manifest ↔ package ↔ config.

### Removed (unified launcher)
- The overlay no longer recommends open tabs, bookmarks, or history above search suggestions as you type. The launcher ranking module, its background query/activate/close handlers, the Options card and toggles, the `launcher` settings block, and the `tabs` / optional `bookmarks` / `history` permission requests are gone. Settings saved by older versions are ignored on load; the overlay is search suggestions only.

### Added (inline calculator)
- Type a math expression in the overlay and the result appears inline, above the suggestions: arithmetic, parentheses, right-associative powers (`^`, `**`), modulo, percent and `% of`, unary signs, scientific/hex/binary/octal literals, constants (`pi`, `tau`, `e`, `phi`), functions (`sqrt`, `cbrt`, `abs`, `round`, `floor`, `ceil`, `ln`, `log`, `log2`, `sin`/`cos`/`tan` and inverses, `min`/`max`/`pow`/`hypot`), implicit multiplication (`2pi`, `2(3+4)`), word operators (`plus`, `times`, `divided by`, `mod`), optional lead-ins (`what is`, `calculate`), and a leading `=` to force evaluation.
- Results group thousands for readability while the clipboard always receives canonical numeric text. Enter copies the result and shows "Copied to clipboard"; Shift+Enter searches the expression instead. Clicking the row also copies.
- The evaluator is a dependency-free tokenizer + recursive-descent parser (no `eval`/`new Function`) in `src/shared/calculator.js`, gated so dates, phone numbers, URLs, and ordinary prose are never hijacked by the calculator row.

### Changed (brand icon)
- The extension now uses the QLens "Query Aperture" mark at every surface: 16/32/48/128 toolbar and store icons generated from the supplied master, the real mark in the popup header (18 px) and options masthead (64 px) instead of CSS placeholders, plus an editable `src/brand/icon.svg` and a preserved 1346x1342 master / 512 px listing asset. `manifest.json` paths are unchanged.

### Performance (first open is instant)
- The first `Ctrl+Shift+K` on a page no longer takes ~1 s. The manifest preloaded only the 4-file lean keydown set (25.7 KB), so the first open had to wake the service worker, probe the tab, then inject ~177 KB of scripts. It now preloads the complete content-script set (11 files, 203 KB) at `document_idle`, and the in-page shortcut handler opens the overlay directly — no service-worker round trip and no `executeScript`. Measured in Chrome for Testing 156: first open **980 ms cold / 218 ms after a reload → 23 ms**; repeat opens 10–12 ms.
- The 30 KB overlay stylesheet is compiled during page idle instead of during the first open, and the first input focus is deferred by one frame so the panel paints immediately (the native first focus costs ~200–380 ms on a fresh shadow tree in headed Chrome). Typing straight after the shortcut still lands in the input.
- Deliberate trade-off: every http(s) page now parses the full 203 KB content-script set at idle instead of 25.7 KB. This reverses the earlier per-page footprint trim — instant first open and minimum per-page bytes are opposing goals, and speed wins here.

### Fixed (a dead background now says what to do about it)
- A module that cannot be read when the service worker starts — the extension's files were edited while it was loaded, an atomic save was caught mid-rename, or a file was locked — used to kill the whole background with Chrome's opaque pair `Uncaught NetworkError: … importScripts … '<file>' failed to load` and `An unknown error occurred when fetching the script`, leaving the user nothing to act on. The 8-file `importScripts` batch is now wrapped so the failure is logged with the module Chrome names, followed by the recovery step (**chrome://extensions** → **Clear all** → **Reload QLens**), and then rethrown so the extension still fails loudly instead of running half-initialized. Verified in Chrome for Testing with a module removed, and A/B-checked against the pre-guard worker.
- `tests/e2e/smoke.mjs` derived its fallback extension id with the wrong algorithm (and produced 16 characters), so it could not wake a stopped worker — the one situation that fallback exists for. It now computes the id the way Chrome does: SHA-256 over the wide (UTF-16LE) folder path, first 128 bits, each nibble mapped to `a`-`p`.
- Loader-safety checks now cover the background as well as the injected content scripts: every file the service worker imports must exist, resolve inside the extension folder, and be valid UTF-8 with no U+FFFE/U+FFFF or lone surrogates, and the manifest's `background.service_worker` must be the worker that batch is written against.

### Changed (image search: one tab, already on the results page — method written down in `docs/image-search.md`)
- Reverse image search no longer visits google.com and then re-queries. Enter opens **exactly one tab whose URL is already the Lens results page** — no loading/interstitial page exists in any path (`src/lens/loading.html` / `loading.js` are unreferenced now), and that tab is created `active: true`, so nothing else is ever brought forward.
- The page-origin fallback (used when Google refuses the extension-origin upload) now runs in a **hidden** helper tab that is navigated to the results URL and focused only after that URL has committed (`navigateThenFocus`) — the Google homepage is never the visible document. A bounded watchdog hands the view back if a browser pulls the worker-created tab forward anyway.
- The in-page uploader tries **both** upload endpoints in order — `lens.google.com/v3/upload`, then `www.google.com/searchbyimage/upload` — each with its own abort (half the remaining search budget, max 6 s). Measured in Chrome 155: from a google.com page the first is refused while the second answers a 303 that lands on a real `search?vsrid=...` results URL, so a single-endpoint uploader could never succeed there. The function is serialized into the page, so it receives its endpoints as an argument and applies its own result-page check; a new unit test evaluates its source in a bare page-shaped context to prove it touches no service-worker scope.
- Failure is honest: a search that produces no result URL opens no tab at all and answers `{ok:false, error:'lens-unreachable'|'bad-payload'}`; the overlay keeps the image attached, drops the spinner, and names the cause. A refused payload (empty/oversize/non-base64/undecodable) can no longer masquerade as success.
- Redirect measurement that shaped the method: `redirect: 'manual'` on the upload returns an `opaqueredirect` (status 0, no `Location`), so following the 303 is the only way to read the result URL; `redirect: 'error'` rejects. The result URL is therefore the followed `resp.url`, with the `Location` header as the fallback.

### Fixed (senior-dev reliability + performance audit, 4-subagent sweep — zero UI changes)
- Settings writes are now serialized: rapid concurrent patches (seg clicks, edge-studio slider vs preset) can no longer interleave read-modify-write and silently drop one patch.
- `getLastEngine` uses its in-memory cache and accepts pre-fetched settings, cutting the cold-open storage round trips; overlay `hydrate` reuses its in-hand settings instead of re-reading.
- Lone-surrogate queries (truncated emoji) no longer throw inside `encodeURIComponent` on the custom-engine path — both builtin and custom builders strip stray surrogates via `safeEncodeQuery`; `truncateSelection` counts code points so it never splits a pair.
- Custom-engine validation now tests all `{q}` slots (was first-only); smart-URL keeps balanced parens (`X_(disambiguation)`); `bareHost` strips ports/credentials so self-host filtering can't leak and `google.evil.com` can't pass the Lens gate (anchored TLD check).
- Lens upload: fallback posts to absolute `https://lens.google.com/v3/upload` (relative `/searchbyimage/upload` is a dead end), hidden-tab path waits for a committed google.com load with a 10 s page-side abort, timeouts skip the alt retry instead of doubling the stall, invalid payloads report `{ok:false}` rather than opening the homepage as fake success, user-closed interstitials are respected (no reopen), 1-char hash keys rejected.
- Open path: post-injection retries race an 800 ms timeout so a wedged tab fails fast; `OPEN_GUARD_MS` 1500→400 ms so a real fast reopen isn't swallowed; whitespace queries bypass the word-search prefix cache (false negatives).
- Overlay: `openTab` destroys synchronously before `tabs.create` (AGENTS.md); AI-toggle race closed via `userTouchedEngine`; keystroke parses bang/prefix once; suggestion cache never caches empties; Esc respects IME composition; font load guarded post-close; focusout timer tracked; bitmap closed on early return; shadow-selection scan early-exits on first hit; `setHighlight` early-returns when unchanged.
- Popup keeps open and marks the query invalid when `OPEN_TAB` fails (was silent close); settings button falls back to `OPEN_OPTIONS` SW message; theme binding guarded against double-attach.
- Options: `bindSeg` guarded against double-attach (structural); engine rename remaps `engineOrder`/`defaultEngine` in the same write; edge preset no longer discards a pending slider patch; reserved-bang check reads `QLENS.RESERVED_BANGS`; manifest fonts use `use_dynamic_url`; Lens interstitial shows a stall notice at 25 s.
- Cleanup: dead `SHORTCUT_RE` removed; image caps/filename strip derive from config; `safeEncodeQuery` exported for favorites; 12 new regression tests (110 total, was 98).

### Fixed
- **Shortcut opened nothing on any normal site (both default and custom combos).** The manifest's `host_permissions` listed only the 3 Google hosts, but every first-open-per-page injects the overlay via `chrome.scripting.executeScript`, which needs a host grant for the target tab. The injection threw `Cannot access contents of the page`, was swallowed into a service-worker-only `console.warn`, and the page console stayed clean — exactly the reported symptom (popup kept working because it needs no injection). `host_permissions` now also includes `http://*/*` + `https://*/*`, matching the PRD §9 / manifest-block spec. Also: `chrome.commands.onCommand` now uses the tab Chrome hands it instead of re-querying, so a cold-SW empty `tabs.query` can no longer leave the command path tab-less.
- Options page: the Theme and "Right-click search" segmented controls now save correctly. Their click handlers were being attached twice, so every click fired two storage writes.

### Performance
- Typing in the overlay no longer re-validates the custom-engine list on every keypress — it is computed once per settings load instead of 2-6 times per keystroke.
- The overlay no longer pins a permanent full-viewport compositor layer for its edge-glow frame, freeing GPU memory while the overlay is open.
- Image search no longer makes you wait for the upload. The image now uploads in the background the moment it's attached (picker / paste / drop), so pressing Enter on an attached image opens the Google Lens results directly — end-to-end latency in the deterministic harness drops from ~1.6 s to ~0.4 s (~0.07 s for a repeat search). Enter landing mid-upload joins the single in-flight upload instead of starting a second one. Every accepted Lens URL now passes one shared gate that also refuses both upload endpoints, and an undecodable image payload fails closed without opening any tab. Zero UI change.

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