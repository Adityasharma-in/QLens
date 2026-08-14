# PLANNING.md — Architecture

## System Overview
QLens is a zero-build MV3 Chrome extension. A global command (Ctrl+Shift+K) wakes the service worker, which locates the active tab and, via a guarded message/inject handshake, makes the tab's content script render a Shadow-DOM glass overlay. The overlay captures the page selection, manages engine/mode state, proxies suggestions through the worker (1.5 s abort, stale-drop), and on Enter sends OPEN_TAB with a validated URL; the content script destroys the overlay synchronously before the new tab activates. All state lives in chrome.storage.local; the page keeps zero residue.

## Directory Structure
```
QLens/
├── manifest.json
├── src/
│   ├── background/service-worker.js
│   ├── content/  selection.js · overlay.js · injector.js
│   ├── shared/   config.js · messaging.js · engines.js · logos.js · storage.js
│   ├── options/  options.html · options.css · options.js
│   └── icons/    icon16/32/48/128.png · icon.svg
├── tests/        unit/run.mjs · check-syntax.mjs · e2e/smoke.mjs · manual-checklist.md
├── tools/        generate-icons.ps1
├── PROJECT.md · PLANNING.md · TASKS.md · MEMORY.md · AGENTS.md · PRD.md · README.md · CHANGELOG.md
```

## Data Flow
1. Command/context menu → SW: resolve active tab; reject non-http(s) URLs silently.
2. SW → CS: `OPEN_OVERLAY {selection?}`; on dead listener → set nonce via func-arg executeScript → inject 8 files → re-send (retry ×2, 100 ms).
3. CS: capture selection (payload override, else window.getSelection, editable-guard, truncate 200), render overlay, focus input.
4. Typing → CS: parse prefixes (g/b/k/d + mode:,), debounce 250 ms → `FETCH_SUGGESTIONS {engine, query, id}` → SW proxy fetch (AbortController 1.5 s) → `SUGGESTIONS_RESULT {id, results}`; CS drops stale ids.
5. Enter → CS: `OPEN_TAB {url, query?, engine?}` (fire-and-forget) → destroy overlay synchronously.
6. SW: validate sender.id + http/https → `tabs.create({url, active:true})`; if query+engine present → record recent (dedupe, cap 10) + set lastEngine.

## Key Interfaces & APIs
| Interface | Input | Output | Owner |
|-----------|-------|--------|-------|
| `QLENS.CONFIG` | — | constants, defaults, accents | shared/config.js |
| `QLENS.buildSearchUrl(engineId, query, modeId?)` | engine id + query | https URL or null | shared/engines.js |
| `QLENS.parsePrefix(input)` | raw input | {type, id, rest} or null | shared/engines.js |
| `QLENS.detectSmartUrl(input)` | raw input | https URL or null | shared/engines.js |
| `QLENS.storage.getSettings/setSettings` | patch | settings object | shared/storage.js |
| `QLENS.storage.addRecent/removeRecent/clearRecent/getRecent` | query/engine | recent list | shared/storage.js |
| `QLENS.Selection.capture(max)` | — | text or null | content/selection.js |
| `QLENS.Overlay.show/destroy/isVisible` | payload | — | content/overlay.js |
| SW onMessage: OPEN_TAB, FETCH_SUGGESTIONS | validated messages | — | service-worker.js |

## Data Models (chrome.storage.local)
```jsonc
{
  "settings": {
    "defaultEngine": "google", "engineOrder": ["google","brave","bing","duckduckgo"],
    "theme": "system", "accent": "indigo", "blurClose": false, "autoCopySelection": false,
    "suggestions": true, "maxSelection": 200, "showRecent": true, "contextMenuAction": "overlay"
  },
  "lastEngine": "google",
  "recent": [{ "query": "…", "engine": "google", "ts": 1723600000000 }]  // max 10, unique
}
```

## State Management
- chrome.storage.local is the single source of truth (settings, lastEngine, recent).
- CS overlay state (engine, mode, highlight, requestId) lives in a module closure, destroyed with the overlay.
- SW holds only: injection nonce (generated per injection event). No timers survive message handling.

## External Dependencies
- Suggest endpoints: Google `client=firefox`, Bing `osjson.aspx`, DuckDuckGo `/ac/` (Brave → Google, labeled). Fetched from SW with host permissions; CORS-proof.
- No other network, no backend, no analytics.

## Critical Design Decisions
| Decision | Options | Choice | Reason |
|---|---|---|---|
| Module format | ES modules vs global namespace | `globalThis.QLENS` namespace | One file set works in SW (importScripts), CS (executeScript files), options (<script src>) |
| Overlay CSS | <style> element vs adoptedStyleSheets | adoptedStyleSheets + <style> fallback | CSP-proof, page cannot block |
| Injection guard | boolean flag vs nonce | Nonce + removeListener(prev) | Survives extension reload (dead context) without double listeners |
| Tab key | engine cycle vs focus trap | Input+non-empty query → cycle; else trap | Matches PRD 5.2 + a11y focus trap |
| Suggestion fetch location | CS vs SW | SW proxy | Host permissions; avoids page CORS/consent issues |
| Recent write | CS vs SW | SW on OPEN_TAB | Single writer, atomic with tab creation |

## Known Risks
| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Suggestion API shape drift | Med | Defensive parse: data[1] array else data, string filter |
| Extension reload while pages open | Med | Nonce guard + listener swap (E4) |
| Page z-index wars | Low | position:fixed + z-index 2147483647 + Shadow DOM |
| Storage corruption | Low | validate-and-fallback (E14) |
| Engine prefix hijack of literal queries | Med | Requires trailing space + ^-anchor; documented tradeoff (PRD) |