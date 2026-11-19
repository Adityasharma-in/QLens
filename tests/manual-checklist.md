# QLens — Manual QA Checklist (v1.0.0)

Run on **Windows + macOS, Chrome 109 and latest**. Before starting: load the unpacked extension
(`chrome://extensions` → Developer mode → Load unpacked → select the QLens folder), then clear the
extension log. Record every row: PASS / FAIL + note.

## 1. Robustness matrix (PRD §11)

| # | Scenario | Expected | Result |
|---|----------|----------|--------|
| E1 | Shortcut on `chrome://extensions`, Web Store, New Tab, PDF viewer | Nothing happens; no error log entry | |
| E2 | Shortcut right after page load (content script not yet injected) | Overlay still opens | |
| E3 | Press shortcut 10× rapidly | One overlay; toggles open/closed | |
| E4 | Reload the extension (`chrome://extensions` reload), then press shortcut on an already-open page | Overlay opens; exactly one instance | |
| E5 | SPA navigation (YouTube, Gmail, React app) — open overlay, navigate, reopen | Overlay unaffected; no duplicates | |
| E6 | Full page reload while overlay open | Overlay gone, no error | |
| E7 | Place cursor in an input/textarea, select text inside it, press shortcut | Overlay opens EMPTY | |
| E8 | Select 5,000 chars on a page, press shortcut | Input shows 200 chars + `…` | |
| E9 | Airplane mode / suggestion API down | Suggestions hidden; Enter still searches | |
| E10 | Type `javascript:alert(1)` or `data:text/html,x` + Enter | Never navigated; treated as plain search (or nothing) | |
| E11 | Query with emoji / non-Latin / quotes (e.g. `"exact phrase" é 😀`) | Encoded correctly; engine shows results | |
| E12 | Page with heavy CSS/z-index (shopping site, docs) | Overlay always on top | |
| E13 | Disable the extension mid-session, return to a page that had the overlay | Page has zero residue | |
| E14 | Corrupt storage (DevTools → chrome.storage.local → set `settings` to garbage, reload options) | Defaults used; no crash | |
| E15 | Rebind shortcut in `chrome://extensions/shortcuts` to a conflicting key | Chrome warns; QLens works with fallback or unconflicted key | |
| E16 | Two windows / two tabs | Overlay only in the active tab; results open in the active window | |

## 2. Visual QA (6 diverse sites)
- Wikipedia (long text), YouTube (SPA), GitHub (complex layout), Gmail (SPA + iframes), a shopping site (heavy CSS), `data:`/file page (should no-op).
- Each: open overlay → looks sharp (glass blur, rounded pill, no layout shift), close → page pristine.

## 3. Motion & themes
- OS "reduce motion" ON → overlay appears instantly, no animation.
- Theme System/Light/Dark + all 6 accents → contrast and legibility OK everywhere.

## 4. Engines
- One real query per engine (Google, Brave, Bing, DuckDuckGo) → results page correct.
- Tab cycles Google → Brave → Bing → DuckDuckGo without losing the typed query.
- Prefixes: `g x`, `b x`, `k x`, `d x` switch engine and strip the prefix.
- Quick modes: `images: x`, `videos: x`, `news: x`, `yt: x`, `wiki: x` and their pills.
- Last engine survives browser restart.

## 4b. Custom engines + !bangs
- Options → Custom engines → Add: Kagi `https://kagi.com/search?q={q}` with bang `kagi` → pill appears in overlay + options default-engine radio.
- In the lens type `!kagi fast search` → pill highlights Kagi, prefix stripped, Enter opens Kagi results.
- `!gh react hooks` (GitHub search engine) and `!dev query` (`http://localhost:3000/search?q={q}`) both build correct URLs.
- Unknown `!nope x` → treated as plain search text (no crash, no navigation to a bad URL).
- Reserved bang rejected in options (e.g. `g`, `w`); duplicate bang rejected; non-http(s) URL rejected; URL without `{q}` rejected.
- Custom engine as default engine works (popup + omnibox + context-menu-direct all use it).
- Corrupt `customEngines` in storage → sanitized to valid entries only; overlay still opens.

## 5. Selection
- Plain text → auto-filled + "From selection" chip.
- Inside input/textarea → empty overlay (E7).
- 5,000 chars → truncated (E8).
- Emoji + code snippet selections.

## 6. Suggestions & history
- Suggestions appear ~250 ms after typing; ↑/↓ + Enter uses highlighted row; "Search for…" first.
- Brave shows "Suggestions via Google" label.
- Recent: click re-searches with the stored engine; × deletes one; "Clear all" empties; max 10.
- "Show recent" toggle off → no recent section.

## 7. Smart URL
- `github.com/foo` → "Go to site — …" primary action; Enter opens it.
- `https://…` full URLs work; trailing punctuation stripped.

## 8. Options page
- All settings persist across reload; theme/accent apply to the overlay live.
- Drag (and arrow buttons) reorder engines; Tab cycle follows the new order.
- Clear recent + Reset to defaults work.
- Shortcut field: click it → the note says "Listening…", the field shows a recording border, and Save is disabled. Press `Ctrl+Space` → the field shows `Ctrl+Space` as pending and Save enables; click Save → storage holds `Ctrl+Space` and the note confirms it. `Ctrl+Shift+Space`, `Ctrl+/`, `Ctrl+Shift+1` and `Ctrl+F9` capture the same way; a bare key or a Chrome-owned combo (`Ctrl+T`, `Ctrl+K`, `Ctrl+1`) shows an error and keeps the saved combo. Reset restores `Ctrl+Shift+K`.
- After saving a custom combo, the manifest command in `chrome://extensions/shortcuts` still reads `Ctrl+Shift+K` but is suppressed — the old combo must not open the overlay on normal pages. On restricted pages (`chrome://…`), use the toolbar popup: content scripts cannot run there, so a custom combo has no path in.
- Context menu "Search with QLens": overlay mode (default) and direct mode.

## 9. No-residue test (the product promise)
1. Open a page → shortcut → type → Enter.
2. Wait for the results tab to load, switch back to the original tab.
3. Screenshot: the page must be exactly as it was — no overlay, no dim, no blur.

## 10. Image search
| # | Scenario | Expected | Result |
|---|----------|----------|--------|
| M1 | Camera button → pick a PNG | Thumbnail chip appears; Enter opens Google Lens showing results for that image — directly, with no interstitial and no google.com homepage flash | |
| M2 | Copy an image, `Ctrl+V` into the overlay input | Same as M1 (clipboard paste) | |
| M3 | Drag & drop an image onto the overlay | Same as M1 (drop) | |
| M4 | Attach an image + type text → Enter | Lens results reflect the image AND the text query | |
| M5 | Attach image → `Esc` | Removes the attachment (overlay stays); `Esc` again closes | |
| M6 | Click the thumbnail × | Removes the attachment | |
| M7 | Pasting non-image text (while input focused) | Inserts text normally; no image state | |
| M8 | Attach a large photo (>1600 px long edge) → Enter | Upload succeeds (downscaled WebP); results correct | |
| M9 | Attach an image, hit Enter instantly (spinner still showing) | Search queues and fires automatically when ready (no swallowed Enter) | |
| M10 | Search the same image twice within 5 minutes | Second search opens results instantly (no re-upload) | |
| M11 | Attach AVIF / HEIC / SVG file | Attaches and searches (raw fallback for undecodable types) | |
| M12 | Attach an image, wait ~2 s, then Enter | Results open directly — no loading interstitial tab (upload already done in the background) | |
| M13 | Watch the tab strip during a search | Exactly one tab is added; it appears already on the Lens results URL (a background helper may exist in the strip, but it is never focused on a Google page) | |
| M14 | Any search on a machine whose IP Google blocks (403 upload / `/sorry/index` wall) | Either the results tab or the overlay's "Google Lens did not answer. Try again." — never a blank tab, a homepage detour, or an endlessly spinning chip | |
| M15 | Enter with an image attached, then `Esc` while it searches | The overlay closes cleanly; if the search still succeeds, its results tab is the only leftover | |

## 11. Omnibox + restricted pages
- Type `ql` + Space/Tab in the address bar, then `cats` → default-engine results; `ql g cats` → Google; `ql !kagi cats` → custom Kagi engine; `ql images: cats` → Images.
- With the default combo, shortcut on `chrome://extensions`, New Tab, Web Store, PDF → opens the QLens popup as a tab with the selection pre-filled + "Restricted page" notice (never silent, never an error log). With a custom combo saved, the old manifest command is suppressed; use the toolbar popup on these pages.
- Restricted-tab popup speaks the full lens language: `!kagi query`, `!w query`, `g query`, `images: query`, `yt: query`, `github.com/foo` (direct open), plain text (default engine). Pill click chooses the engine for plain queries; a `!bang`/prefix in the text wins over the pill.

## 12. Logs
- `chrome://extensions` → "Errors" must be empty after the full matrix above.
- If the background died at start-up (its files were edited while QLens was loaded, an editor's atomic save was caught mid-rename, a file was locked), the panel shows `QLens: background modules failed to load … Cause: …` plus an uncaught `QLens: background modules failed to load - reload the extension on chrome://extensions`. Recovery: **Clear all** on that error, then **Reload** QLens — the shortcut and image search must work again straight away, with no Chrome restart and no re-adding the folder.
- After any edit to a file under `src/`, reload QLens on `chrome://extensions` before testing in that browser: Chrome reads the worker's modules from disk when the worker starts, so a stale page or a half-loaded extension is expected until the reload.