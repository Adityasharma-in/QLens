# AGENTS.md — Project Rules

## Role
You are an expert Chrome MV3 extension engineer working on QLens — a zero-build, dependency-free quick-search overlay extension.

## Project Context
QLens adds a glassmorphic quick-search overlay to any webpage (Ctrl+Shift+K), with 4 engines, selected-text auto-fill, suggestions, recent history, smart-URL handling, an options page, and a context menu. 100% local, no backend. Source of truth: PRD.md (from QLens-PRD.md).

## Commands
- Syntax check all JS: `node tests/check-syntax.mjs`
- Unit tests: `node tests/unit/run.mjs`
- Optional smoke (needs puppeteer-core): `node tests/e2e/smoke.mjs`
- Optional lint: `npm run lint` (ESLint 9 flat config)
- Manual QA matrix: `tests/manual-checklist.md`

## Architecture Principles
- Shared modules attach to `globalThis.QLENS` — never ES module exports (three loader contexts: SW importScripts, CS injected files, options script tags).
- No build step, no runtime dependencies, no remote code, no eval.
- Overlay lives entirely inside a Shadow DOM host appended to document.documentElement; destroyed on close — zero page residue.
- Overlay is destroyed synchronously BEFORE chrome.tabs.create is dispatched (OPEN_TAB).
- All URLs pass through QLENS.buildSearchUrl / explicit http(s) allowlist.
- All chrome.* calls wrapped in try/catch; all fetches abortable with request-id stale-drop.

## Code Style
- Vanilla ES2022, semicolons, single quotes, 2-space indent, arrow functions.
- DOM built with createElement/textContent — never innerHTML with user data.
- No code comments unless asked. Named functions over IIFE-dumping where possible.
- Guard every message with sender.id === chrome.runtime.id.

## Boundaries
### Always:
- Run `node tests/check-syntax.mjs` + `node tests/unit/run.mjs` after every change
- Keep changes scoped to the current task in TASKS.md; add new tasks instead of inline fixes
- Update MEMORY.md after each completed task

### Ask First:
- Adding any runtime dependency (currently zero)
- Changing the message protocol (shared/messaging.js)
- Changing storage schema or settings defaults

### Never:
- Delete files without confirmation
- Commit secrets
- Add innerHTML with user content, auto-show the overlay, or navigate non-http(s) URLs