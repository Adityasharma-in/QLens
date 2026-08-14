# MEMORY.md — Session State

## Last Updated: 2026-08-14

## Current Phase: VERIFY (T014 in progress; T016–T018 fixed)

## Last Completed Task: T018 — smoke test runnable (13/13 PASS); T016 + T017 bug fixes shipped in overlay.js

## Next Task: T014 re-read pass remaining (options page, context menu path, restricted-page edge cases); then T015 ship

## Active Context
- Greenfield build of QLens v1.0 (MV3 Chrome extension) from PRD (source of truth).
- Zero-build vanilla JS; shared modules use `globalThis.QLENS` namespace (SW=importScripts, CS=executeScript files, options=<script src>).
- Environment: Windows, Node v24.18.0, npm 11.16.0. Google Chrome stable (150) IGNORES --load-extension; smoke test uses Chrome for Testing 152 at `%LOCALAPPDATA%\Temp\opencode\chrome-cft\...\chrome.exe` (auto-discovered; CHROME_PATH env override supported).
- Key decisions: nonce-based injection guard w/ removeListener swap; adoptedStyleSheets for overlay CSS; Tab-in-input cycles engines; suggestions fetched in SW; recent written by SW on OPEN_TAB; F11 clipboard chip OUT of scope (v1.1).
- Verification state: node --check 12 files OK; 30/30 unit tests; ESLint clean; smoke 13/13 (injection, selection auto-fill, Esc, reopen, Enter→Google tab, zero-residue, smart-URL row + Enter→site, chrome:// blocked).

## Bugs Fixed This Session (VERIFY)
- T016: Selection capture ran AFTER focusInput() — focusing the shadow input collapsed the page selection, so capture returned null. Fixed: capture before build/focus. (User-reported.)
- T017a: updateInputState called renderActionRow then hideRecent() — hideRecent cleared sectionsEl, wiping the "Go to site" row.
- T017b: renderActionRow never set actionSite — Enter/click on smart-URL row could not navigate.
- Smoke harness: SW target race (idle death) → ensureWorker wakes SW via options-page runtime ping; tab-activation race → bringToFront + 300ms settle before every trigger; overlay 150ms close animation → 300ms wait before state checks.

## Blockers
- None. User authorized full build: "Use this PRD and build out this Project extension without any problem."

## Decisions Made This Session
- Prefix mapping: g=Google, b=Brave, k=Bing, d=DuckDuckGo (PRD A1 note).
- Context menu default action: open overlay pre-filled (setting to switch to direct).
- Suggestions ON by default (Q2).
- Ctrl+Shift+K default shortcut (A2).
- Smoke test triggers overlay via SW-replicated inject-then-send (real shortcut path un-synthesizable in headless; covered manually in checklist E1).