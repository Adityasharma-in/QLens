# MEMORY.md — Session State

## Last Updated: 2026-08-14

## Current Phase: v1.1 tasks T019–T022 complete; T023 final pass in progress

## Last Completed Task: T022 — shortcut rebinding (design pivot: chrome.commands.update does not exist → storage + content-script keydown; custom combo opens overlay — smoke 18/18)

## Next Task: T023 — final syntax/unit/lint/smoke re-run, docs, commit, delivery summary

## Active Context
- QLens v1.1 (MV3 Chrome extension); v1.0 shipped in commit 16c3100.
- Zero-build vanilla JS; shared modules use `globalThis.QLENS` namespace (SW=importScripts, CS=executeScript files, options/popup=<script src>).
- Environment: Windows, Node v24.18.0, npm 11.16.0. Google Chrome stable IGNORES --load-extension; smoke test uses Chrome for Testing 152 at `%LOCALAPPDATA%\Temp\opencode\chrome-cft\...\chrome.exe` (auto-discovered; CHROME_PATH env override). Zombie CFT chrome.exe must be killed between smoke runs (profile lock blocks SW spawn).
- Key v1.1 decisions:
  - Recent-search history removed from overlay + options (user request; storage KEY_RECENT, sanitizeRecent, get/add/remove/clearRecent, showRecent, CLOCK_SVG, recent rows deleted).
  - Inter font bundled (src/fonts, 4 woff2 via Fontsource, OFL); @font-face in options.css + overlay.js runtime URL string; web_accessible_resources for fonts.
  - Toolbar action popup (src/popup/*): search + engine pills + theme/accent + suggestions toggle + shortcut badge + settings link; messages: OPEN_TAB.
  - **Shortcut rebinding: chrome.commands.update does NOT exist (even in SW — keys are only onCommand/getAll). PIVOT: combo stored under storage key 'shortcut' (getShortcut/setShortcut, validated via isValidCombo, default Ctrl+Shift+K); injector.js registers a capture-phase keydown listener (window.__QLENS_KEYHANDLER__ guard) that matches via QLENS.matchesCombo and sends OPEN_OVERLAY to SW; SW gained an inbound OPEN_OVERLAY branch → openQuickSearch(). Manifest command kept as the default trigger (openInFlight guard prevents double-open).**
  - Messaging protocol: MSG.UPDATE_SHORTCUT added then REMOVED (dead); no net protocol change beyond inbound OPEN_OVERLAY reuse of existing type.
- Verification state: node --check 13 files OK; 32/32 unit tests; ESLint clean; smoke 18/18 (overlay suite + popup render + popup search + shortcut save + custom combo opens overlay + invalid combo rejected).
- Smoke gotchas discovered: Google bot "sorry" wall redirects automated searches (finder matches google.com + q=/search + query substring); popup window.close() can race CDP click (Promise.race protection); popup.html initially MISSED messaging.js script → QLENS.MSG undefined → doSearch silently caught TypeError (real bug, fixed).

## Bugs Fixed This Session (v1.1)
- popup.html loaded config/engines/logos/storage but NOT messaging.js → QLENS.MSG undefined → popup search silently failed. Added messaging.js script tag.
- Chrome has no chrome.commands.update — shortcut UI rewritten to storage + content-script keydown.

## Blockers
- None.

## Decisions Made This Session
- Ctrl+Shift+K remains the manifest command default AND the stored-combo default; user-chosen combo triggers via content-script listener (works even when SW command can't).
- Unit tests extended: matchesCombo (10 cases), shortcut storage roundtrip; manifest test now walks action.default_popup + web_accessible_resources (glob-aware).
- Smoke test extended: popup render/search, shortcut storage save, real-keyboard Ctrl+Alt+Q opens overlay, invalid combo rejected, restore default.