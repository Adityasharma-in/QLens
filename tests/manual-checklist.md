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
- Clear recent + Reset to defaults work; shortcut shown matches `chrome://extensions/shortcuts`.
- Context menu "Search with QLens": overlay mode (default) and direct mode.

## 9. No-residue test (the product promise)
1. Open a page → shortcut → type → Enter.
2. Wait for the results tab to load, switch back to the original tab.
3. Screenshot: the page must be exactly as it was — no overlay, no dim, no blur.

## 10. Image search
| # | Scenario | Expected | Result |
|---|----------|----------|--------|
| M1 | Camera button → pick a PNG | Thumbnail chip appears; Enter opens Google Lens showing results for that image | |
| M2 | Copy an image, `Ctrl+V` into the overlay input | Same as M1 (clipboard paste) | |
| M3 | Drag & drop an image onto the overlay | Same as M1 (drop) | |
| M4 | Attach an image + type text → Enter | Lens results reflect the image AND the text query | |
| M5 | Attach image → `Esc` | Removes the attachment (overlay stays); `Esc` again closes | |
| M6 | Click the thumbnail × | Removes the attachment | |
| M7 | Pasting non-image text (while input focused) | Inserts text normally; no image state | |

## 11. Logs
- `chrome://extensions` → "Errors" must be empty after the full matrix above.