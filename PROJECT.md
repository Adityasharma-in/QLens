# PROJECT.md — Specification

## Problem Statement
Users must leave their current page to search, breaking their flow; copying selected text adds friction; and search engines lock users in. QLens puts a lightning-fast, ephemeral, glassmorphic quick-search overlay on any webpage: one shortcut (Ctrl+Shift+K), optional auto-fill from the page's current text selection, four switchable engines (Google, Brave, Bing, DuckDuckGo), zero backend, zero residue.

## Goals (In Scope)
- [ ] G1: Global keyboard shortcut summons the overlay on any normal webpage
- [ ] G2: Enter opens the query in a new tab on the selected engine
- [ ] G3: 4 engines — Google, Brave, Bing, DuckDuckGo — switchable while typing (Tab, pills, prefixes g/b/k/d)
- [ ] G4: Auto-fill with the page's current text selection (no copy-paste)
- [ ] G5: Overlay is ephemeral — never auto-shows, removed before tab creation, zero residue
- [ ] G6: Modern glassmorphic UI (dark/light, accent palette, spring motion, reduced-motion support)
- [ ] G7: Fully local & private — no backend, no telemetry
- [ ] G8: Production polish: a11y (dialog, focus trap, WCAG AA contrast, 44px targets), edge-case hardening (E1–E16), zero known bugs
- [ ] F1–F10 per PRD: overlay, engines, selection fill, suggestions, recent history, smart-URL, quick modes, options page, context menu

## Non-Goals (Out of Scope)
- F11 clipboard quick-search chip (v1.1 per PRD roadmap)
- `chrome.storage.sync` settings (v1.1), blur-close beyond the settings toggle already in the data model
- Cross-device sync, accounts, analytics, backend of any kind
- Injection into `chrome://`, Web Store, PDF viewer, New Tab, `file:` pages
- Persistent page UI; toolbar badge; omnibox replacement

## Acceptance Criteria
- [ ] AC1: Ctrl+Shift+K opens overlay on any http(s) page in < 80 ms; input focused
- [ ] AC2: Enter opens results in a new active tab on the active engine; returning to the old tab shows a perfectly clean page (no residue)
- [ ] AC3: Esc / backdrop click / re-press shortcut all close the overlay cleanly
- [ ] AC4: Highlighted text auto-fills (truncated at 200 chars); selection inside input/textarea is ignored
- [ ] AC5: Tab / pills / prefixes switch engines mid-query without losing the query; last engine persists
- [ ] AC6: Suggestions appear (debounced 250 ms, max 8, "search for" row first), silently hide on offline/error; Brave labeled "via Google"
- [ ] AC7: Recent 10 unique queries with delete + clear-all; click re-searches
- [ ] AC8: `github.com/x` offers "Go to site"; `javascript:`/`data:` never navigated
- [ ] AC9: Quick modes (images/videos/news/yt/wiki) via pills + prefixes
- [ ] AC10: Options page persists all settings; theme/accent apply; context menu "Search with QLens" works
- [ ] AC11: No errors in chrome://extensions log; E1–E16 matrix green; zero auto-popups

## Tech Stack
- Language: Vanilla JavaScript (ES2022), zero build step
- Platform: Chrome Manifest V3, minimum_chrome_version 109
- Storage: chrome.storage.local
- UI: Shadow DOM + CSS custom properties (adoptedStyleSheets), inline SVG
- Testing: Node built-ins (node --check, unit runner), optional puppeteer-core smoke, manual matrix

## Constraints
- No innerHTML with user data; textContent/DOM APIs only
- All URLs through buildSearchUrl() with http/https allowlist
- Guard injection with nonce; guard messages with sender.id
- Overlay destroyed synchronously BEFORE tabs.create
- All chrome.* calls in try/catch; all fetches abortable (1.5 s) with stale-drop
- CSP-safe: no inline scripts, no eval, no remote code

## Assumptions (from PRD §17)
- A1: 4th engine = DuckDuckGo (prefix d); Bing prefix k. g=Google, b=Brave, k=Bing, d=DuckDuckGo
- A2: Default shortcut Ctrl+Shift+K (rebindable in chrome://extensions/shortcuts)
- A3: Overlay is an in-page floating bar (not browser UI)
- A4: Engine persistence = last used per device, stored in chrome.storage.local
- Q1: Context menu default = open overlay pre-filled (setting: overlay | direct search)
- Q2: Suggestions ON by default (fetch-light, silent on failure)
- Build is greenfield: empty directory, PRD is the source of truth