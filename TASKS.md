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
- [ ] T014: FULL VERIFY — syntax check every JS file; run unit suite; run puppeteer smoke (if feasible); re-read every file end-to-end for bugs; fix issues found — Done when: all green, zero known bugs
- [x] T016: Fix selection capture order bug (capture before focusInput in overlay show) — Done when: smoke test "selection auto-filled" passes
- [x] T017: Fix smart-URL render bugs (hideRecent wiping row; actionSite never set) — Done when: smoke "smart URL" + "Enter opens the site" pass
- [x] T018: Make smoke test runnable — Chrome for Testing install, SW wake+ping, inject-then-send replication, shadow-piercing focus — Done when: 13/13 smoke PASS
- [ ] T015: Pre-ship checklist (AC1–AC11), final commit, delivery summary — Done when: checklist complete