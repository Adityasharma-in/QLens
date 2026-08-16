# CHANGELOG

## [Unreleased]

### Added
- Google AI Mode: `Tab` in the overlay toggles Google normal ⇄ Google AI (searches with `atvm=2` so Google returns the AI-answer page); always-visible `AI Mode` switch pill with spark icon; footer, suggestion rows, and smart-URL row label the state ("Google AI" / `· AI`). Toggling AI snaps the engine to Google; choosing another engine or mode, or typing any prefix, clears it.
- Image search: camera button in the overlay input row (click to pick a file, `Ctrl+V` paste, or drag & drop an image) attaches a removable thumbnail chip; pressing `Enter` sends the image plus any typed text to **Google Lens** (verified `POST /searchbyimage/upload` with `encoded_image` + `image_content`) and opens the results in a new tab. Image bytes are read and re-encoded locally (canvas, ≤2048 px, ≤5 MB) and never touch `chrome.storage`; web search uses a 20 s timeout with a `lens.google.com` fallback. Zero new permissions.

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