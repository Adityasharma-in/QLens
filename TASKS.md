# TASKS.md — Execution Plan

## Phase 1: Foundation
- [ ] T001: Scaffold manifest.json + PNG icons (PS script) + icon.svg — Done when: JSON valid, 4 PNGs exist, loads in Chrome with zero errors
- [ ] T002: shared/config.js + shared/messaging.js — Done when: node --check clean, constants match PRD
- [ ] T003: shared/engines.js (engines, buildSearchUrl, parsePrefix, detectSmartUrl) — Done when: unit tests pass
- [ ] T004: shared/logos.js (inline SVG for 4 engines) — Done when: node --check clean
- [ ] T005: shared/storage.js (validate+fallback, recent dedupe/cap) — Done when: unit tests pass

## Phase 2: Core Features
- [ ] T006: background/service-worker.js (commands, injection+retry, OPEN_TAB, suggestions proxy, context menu) — Done when: node --check clean; logic reviewed
- [ ] T007: content/selection.js (capture + truncate + editable guard) — Done when: unit test passes
- [ ] T008: content/injector.js (nonce guard, listener, OVERLAY_READY) — Done when: node --check clean; guard logic reviewed
- [ ] T009: content/overlay.js part 1 — shell/lifecycle (host, backdrop, panel, rows, show/destroy, focus trap, Esc/backdrop/blur-close, animations) — Done when: node --check clean
- [ ] T010: content/overlay.js part 2 — behavior (input, prefixes, Tab cycle, pills, suggestions, recent, smart-URL, selection chip, submit/OPEN_TAB) — Done when: node --check clean; full re-read

## Phase 3: Options, Tests, Docs
- [ ] T011: options page (html/css/js: engines, order DnD, theme/accent, toggles, shortcut info, data controls) — Done when: node --check clean, loads in Chrome
- [ ] T012: tests — check-syntax.mjs, unit/run.mjs (engines/prefix/smartURL/storage/truncate/manifest), e2e/smoke.mjs, manual-checklist.md — Done when: all unit tests pass
- [ ] T013: README.md + CHANGELOG.md + PRD.md copy — Done when: instructions accurate

## Phase 4: Verify & Ship
- [ ] T014: FULL VERIFY — syntax check every JS file; run unit suite; run puppeteer smoke (if feasible); re-read every file end-to-end for bugs; fix issues found — Done when: all green, zero known bugs
- [ ] T015: Pre-ship checklist (AC1–AC11), final commit, delivery summary — Done when: checklist complete