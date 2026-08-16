# MEMORY.md — Session State

## Last Updated: 2026-08-16

## Current Phase: v1.3 Google AI Mode added (T026 + T027 complete)

## Last Completed Task: T027 — overlay AI Mode toggle (syntax 13/13, unit 39/39)

## Next Task: manual QA via tests/manual-checklist.md + optional smoke re-run

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
- Verification state: node --check 13 files OK; 32/32 unit tests; ESLint clean; smoke 18/18 (overlay suite + popup render + popup search + shortcut save + custom combo opens overlay + invalid combo rejected). NOTE: first T024 smoke run had 3 failures (Esc close, smart URL, custom combo) — smart URL was a REAL bug (new .ql-smarturl button lost dataset.action='site'; fixed by re-adding it in renderActionRow); Esc/custom-combo failures were zombie-chrome flake (killed CFT chrome.exe, re-ran: all green). Debug script: C:\Users\PC\AppData\Local\Temp\opencode\qdbg\dbg.mjs (needs zombie kill + SW wake; ROOT hardcoded to QLens project).
- T025 (v1.2 follow-up): suggestUrlFor (src/shared/engines.js) now ALWAYS returns Google suggestqueries URL for any engine (bing/ddg/unknown included — engine param ignored; per-engine suggestion templates kept in ENGINES data but unused). Suggestion UI: .ql-suggest gained overflow-x:hidden (kills computed x-auto scrollbar) and .ql-sug-sub got overflow:hidden + text-overflow:ellipsis — no horizontal scroll ever; unit test renamed 'suggest urls always google' (5 asserts incl. bogus engine).
- T026/T027 (v1.3, Google AI Mode): engines.js google.aiSearch = 'search?atvm=2&q={q}'; buildSearchUrl(engineId, query, modeId, ai) — ai flag uses aiSearch only when engine===google && !modeId; off-google + modes ignore it. Overlay: aiMode state (reset each show); .ql-pill-ai switch (spark, role=switch, aria-checked) in its own .ql-pills row above engine pills, always visible; Tab on input always toggles aiMode (Shift+Tab keeps focus trap); setAi forces engine google + setLastEngine; setEngine/setMode/prefix clear aiMode; cycleEngine (old Tab-engine-cycle) removed; footer engine label 'Google AI', suggestion sub + smart-url sub gain '· AI', footer hint tab→ai. Unit: 5 new ai tests. Note: atvm=2 is the AI-mode param the user supplied — if Google renames it on their account, it's a 1-line swap in engines.js google.aiSearch.
- Smoke gotchas discovered: Google bot "sorry" wall redirects automated searches (finder matches google.com + q=/search + query substring); popup window.close() can race CDP click (Promise.race protection); popup.html initially MISSED messaging.js script → QLENS.MSG undefined → doSearch silently caught TypeError (real bug, fixed).
- v1.2 T024 (overlay redesign): src/content/overlay.js rebuilt to match searchbar-ui.html — tokens moved into :host with --ql-* prefix; dark default + :host([data-theme="light"]) + @media (prefers-color-scheme: light) for system theme; accent applied via --ql-accent/--ql-accent-rgb (hexToRgb)/--ql-accent-ink (ACCENT_INKS for emerald/rose/amber); new DOM: .ql-rim (4x .ql-pr bars, pr-flow-r/l/d/u + pr-wave keyframes, 8s/12s drift) + .ql-aurora (3 orbs) + .ql-tint (glass blur) + .ql-content (.ql-glow via :has focus-within, .ql-input-row, .ql-pill-zone with .ql-pills + .ql-pill-rail, .ql-mode-row, .ql-smart-zone, .ql-suggest with .ql-sug-row k/txt/arrow, .ql-foot with kbd hints + .ql-foot-engine). Removed: ql-top/engine chip/TAB hint/ql-enter badge/ql-fromsel/ql-sections/ql-list/ql-row old classes. Selection chip now .ql-chip inside input row (spark icon, click removes selection only). Close button clears query when non-empty else closes (Esc-equivalent). Pill zone got radiogroup/radio roles + arrow-key cycling; empty state "Type to search"; suggestion rows numbered 01..N with engine host sub + optional suggestionLabel note. Panel centered (top 50%) at 640px, spring 380ms entry. Smoke-test contract: .ql-smarturl button MUST carry dataset.action='site' (smoke queries [data-action="site"]); .ql-sug rows keep action 'suggest' via Enter handler.

## Bugs Fixed This Session (v1.1)
- popup.html loaded config/engines/logos/storage but NOT messaging.js → QLENS.MSG undefined → popup search silently failed. Added messaging.js script tag.
- Chrome has no chrome.commands.update — shortcut UI rewritten to storage + content-script keydown.

## Blockers
- None.

## Decisions Made This Session
- Ctrl+Shift+K remains the manifest command default AND the stored-combo default; user-chosen combo triggers via content-script listener (works even when SW command can't).
- Unit tests extended: matchesCombo (10 cases), shortcut storage roundtrip; manifest test now walks action.default_popup + web_accessible_resources (glob-aware).
- Smoke test extended: popup render/search, shortcut storage save, real-keyboard Ctrl+Alt+Q opens overlay, invalid combo rejected, restore default.