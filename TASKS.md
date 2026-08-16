# TASKS.md — Execution Plan

## Phase 1: Foundation
- [x] T001: Scaffold manifest.json + PNG icons (PS script) + icon.svg — Done when: JSON valid, 4 PNGs exist, loads in Chrome with zero errors
- [x] T002: shared/config.js + shared/messaging.js — Done when: node --check clean, constants match PRD
- [x] T003: shared/engines.js (engines, buildSearchUrl, parsePrefix, detectSmartUrl) — Done when: unit tests pass
- [x] T004: shared/logos.js (inline SVG for 4 engines) — Done when: node --check clean
- [x] T005: shared/storage.js (validate+fallback, recent dedupe/cap) — Done when: unit tests pass

## Phase 2: Core Features
- [x] T006: background/service-worker.js (commands, injection+retry, OPEN_TAB, suggestions proxy, context menu) — Done when: node --check clean; logic reviewed
- [x] T007: content/selection.js (capture + truncate + editable guard) — Done when: unit test passes
- [x] T008: content/injector.js (nonce guard, listener, OVERLAY_READY) — Done when: node --check clean; guard logic reviewed
- [x] T009: content/overlay.js part 1 — shell/lifecycle (host, backdrop, panel, rows, show/destroy, focus trap, Esc/backdrop/blur-close, animations) — Done when: node --check clean
- [x] T010: content/overlay.js part 2 — behavior (input, prefixes, Tab cycle, pills, suggestions, recent, smart-URL, selection chip, submit/OPEN_TAB) — Done when: node --check clean; full re-read

## Phase 3: Options, Tests, Docs
- [x] T011: options page (html/css/js: engines, order DnD, theme/accent, toggles, shortcut info, data controls) — Done when: node --check clean, loads in Chrome
- [x] T012: tests — check-syntax.mjs, unit/run.mjs (engines/prefix/smartURL/storage/truncate/manifest), e2e/smoke.mjs, manual-checklist.md — Done when: all unit tests pass
- [x] T013: README.md + CHANGELOG.md + PRD.md copy — Done when: instructions accurate

## Phase 4: Verify & Ship
- [x] T014: FULL VERIFY — syntax check every JS file; run unit suite; run puppeteer smoke (if feasible); re-read every file end-to-end for bugs; fix issues found — Done when: all green, zero known bugs
- [x] T016: Fix selection capture order bug (capture before focusInput in overlay show) — Done when: smoke test "selection auto-filled" passes
- [x] T017: Fix smart-URL render bugs (hideRecent wiping row; actionSite never set) — Done when: smoke "smart URL" + "Enter opens the site" pass
- [x] T018: Make smoke test runnable — Chrome for Testing install, SW wake+ping, inject-then-send replication, shadow-piercing focus — Done when: 13/13 smoke PASS
- [x] T015: Pre-ship checklist (AC1–AC11), final commit, delivery summary — Done when: checklist complete (commit 16c3100)

## Phase 5: v1.1 (user request)
- [x] T019: Remove recent-search history from overlay + options (storage API, overlay CSS/rows, options card, SW write) — Done when: unit tests updated, 30/30
- [x] T020: Inter font (bundled woff2, options + overlay @font-face, manifest web_accessible_resources) — Done when: syntax/unit/lint green
- [x] T021: Toolbar action popup (search, engine pills, theme/accent, suggestions toggle, shortcut badge, settings link) — Done when: smoke popup render + popup search PASS
- [x] T022: Rebinding the shortcut — DISCOVERY: chrome.commands.update does NOT exist (SW has only onCommand/getAll) → design pivot: combo stored in storage, content-script keydown listener matches + routes via SW OPEN_OVERLAY; manifest command kept as default — Done when: unit shortcut tests + smoke custom-combo opens overlay PASS
- [x] T023: Final v1.1 pass — full syntax/unit/lint/smoke re-run, docs, commit, delivery summary — Done when: all green, commit 359a6b9

## Phase 6: v1.2 (user request)
- [x] T024: Redesign overlay to match searchbar-ui.html reference — glass prism card (aurora orbs, tint, specular top line, noise), input row with search icon + selection chip + close, engine pills with logo badges + light rail, smart-URL row with shine sweep, numbered suggestion rows with arrow, footer kbd hints + engine dot, empty state, animated multicolor inner edge glow on all four sides (.ql-rim, pr-flow/wave keyframes), light/dark/system theme tokens, caret/glow/pill-pop/badge-pop/rise-in animations — Done when: syntax + unit + lint green, all selectors used by smoke test (.ql-panel/.ql-input/.ql-pill) intact

## Phase 7: v1.2 follow-ups (user request)
- [x] T025: Suggestions always Google-only — suggestUrlFor now returns the Google suggestqueries URL for every engine (bing/ddg/unknown included; engine param ignored); .ql-suggest gained overflow-x:hidden and .ql-sug-sub ellipsis so no horizontal scrollbar ever appears — Done when: syntax 13/13, unit 32/32 (suggest-url test asserts google for all engines)

## Phase 8: Google AI Mode (user request)
- [x] T026: AI Mode search template + ai flag — engines.js google.aiSearch = 'search?atvm=2&q={q}'; buildSearchUrl(engineId, query, modeId, ai) uses aiSearch when ai && google && !modeId — Done when: unit tests (ai URL, off-google ignore, mode-wins, null) pass
- [x] T027: Overlay AI Mode toggle — .ql-pill-ai switch (spark icon, role=switch, aria-checked) on own row above engine pills, always visible; Tab on input toggles aiMode (Shift+Tab focus-traversal kept); setAi forces google engine; setEngine/setMode/prefix clear aiMode; cycleEngine removed; footer engine label 'Google AI'; suggestion sub + smart-url sub gain '· AI'; footer hint tab→ai; submit passes aiMode — Done when: syntax 13/13, unit 39/39