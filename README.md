# QLens — Quick Search Overlay for Chrome

**Search anything, anywhere, without leaving your flow — zero copy-paste, zero engine lock-in, zero bloat.**

QLens is a free Chrome extension (Manifest V3, no build step, no dependencies) that puts a glassmorphic
quick-search overlay on top of any webpage. Press **Ctrl+Shift+K**, type (or search your page's
current selection), press **Enter** — results open in Google, Brave, Bing, or DuckDuckGo.

- Ephemeral by design: the overlay exists only while you summon it. Zero page residue.
- 100% local: no backend, no analytics, no accounts. The only data that leaves your device is the query you type.

## Install (developer)

1. Open `chrome://extensions`, enable **Developer mode**.
2. Click **Load unpacked** and select this folder (`QLens/`).
3. Press `Ctrl+Shift+K` on any webpage (rebind it in Settings → Shortcut, or at `chrome://extensions/shortcuts`).

## Features

| Feature | How |
|---|---|
| 4 engines | Google, Brave, Bing, DuckDuckGo — pills click, prefixes `g b k d`, Arrow keys cycle |
| Google AI Mode | `Tab` toggles Google ⇄ Google AI (AI answer page); AI Mode switch pill, spark icon |
| Selection search | Highlight text on any page → shortcut → text is already in the box |
| Suggestions | Debounced 250 ms, silent when offline; Brave labeled "via Google" |
| Recent searches | Last 10 queries, one click re-searches; delete per-item or clear all |
| Smart URL | Type `github.com/foo` → "Go to site" (http/https only, always) |
| Calculator | Type `2+2`, `sqrt(81)+1`, `25% of 80`, or `= 12*8` → inline result; Enter copies, Shift+Enter searches the expression |
| Quick modes | `images:` `videos:` `news:` `yt:` `wiki:` prefixes + pills |
| Image search | Camera button in overlay — file picker, paste, or drop an image (PNG/JPEG/GIF/WebP/BMP/AVIF/HEIC/SVG); instant thumbnail, queued Enter, background pre-upload at attach, repeat-search cache; optional text; Enter → Google Lens results open directly, with no interstitial and no google.com detour ([method](docs/image-search.md)) |
| Options | `chrome://extensions` → Details → Extension options |
| Context menu | Right-click selected text → "Search with QLens" (overlay or direct, setting) |

## Development

```
npm run check     # syntax-check every JS file (node --check)
npm test          # unit tests: engines, prefixes, smart-URL, storage, selection, manifest
npm run smoke     # optional end-to-end smoke test (requires: npm i -D puppeteer-core, Chrome)
npm run lint      # optional ESLint (npm i first)
```

Manual QA matrix: `tests/manual-checklist.md` (PRD robustness rows E1–E16 + visual + no-residue).

## Architecture

- `src/shared/` — pure modules on a `globalThis.QLENS` namespace, loaded by all three contexts
  (service worker via `importScripts`, content scripts via `chrome.scripting.executeScript`, options via `<script>`).
- `src/content/overlay.js` — Shadow-DOM glass overlay; destroyed synchronously before `tabs.create`
  (the no-residue guarantee).
- `src/background/service-worker.js` — command routing, guarded on-demand injection (nonce + listener swap),
  suggestion proxy (1.5 s abort, stale-drop), `OPEN_TAB` with an http/https allowlist.
- No `innerHTML` with user data, no eval, no remote code. CSP-safe.

## Privacy

No data is collected. Settings and recent searches live in `chrome.storage.local` on your device.
Search queries go directly to the engine you chose — exactly like typing in the omnibox.

## License

Free. No ads, no tracking, no premium tier.