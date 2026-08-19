# QLens — Full Feature & Design Brief (for UI Re-Creation)

> **Purpose of this document:** Give another AI everything it needs to write a *prompt* that
> recreates QLens's user experience with a **new, fresh UI** — without re-reading the codebase.
> It inventories every feature, the current visual language, every interaction, every hard
> invariant the UI must respect, and the freedom a redesign has.
>
> The document describes the **product** precisely. It deliberately does **not** prescribe a
> specific new look — that is the job of the prompt written from this brief.

---

## 1. Product in one paragraph

QLens is a free, zero-backend **Chrome Manifest V3 extension** that puts an ephemeral
**glassmorphic quick-search overlay** on top of any webpage. Press **`Ctrl+Shift+K`**
(re-bindable), type a query — or search the text you already have *selected* on the page —
press **Enter**, and results open in a new tab on the engine you chose (**Google, Brave,
Bing, DuckDuckGo**). The overlay exists only while you summon it: close it and the page is
completely clean — no bars, no dim, no residue. 100% local; the only data that ever leaves
the device is the query you typed, sent directly to the engine you chose.

**Tagline (v1.0):** *"Search anything, anywhere, without leaving your flow — zero copy-paste,
zero engine lock-in, zero bloat."*

- **Platform:** Chrome, Manifest V3, `minimum_chrome_version: 109`.
- **Stack:** Vanilla JavaScript (ES2022), zero build step, zero runtime dependencies, zero
  remote code, no eval, CSP-safe.
- **Current development state:** features have progressed through what the team internally
  calls **v1.0 → v1.4** (see §11 for the history). The string literals lag behind —
  `manifest.json` still says `1.0.0`, `config.js` says `1.1.0`. Do not trust version strings;
  trust the feature list in §3.
- **Status of upgrade pipeline:** Refer to `PROJECT.md`, `PRD.md`, `PLANNING.md`, `TASKS.md`,
  `MEMORY.md`, `AGENTS.md`, `CHANGELOG.md`, `README.md` in the repo for the full doc set.

---

## 2. Who is it for (personas)

| Persona | Pain it removes |
|---|---|
| Researcher / student | Copy → new tab → paste → search, 20×/day → select → shortcut → Enter (~4 s saved per search) |
| Developer | Context-switching out of docs / stack traces; searches errors instantly, in place |
| Privacy-conscious user | Engine lock-in + tracking → Brave/DDG one keystroke away, no telemetry |
| Power user | Wants shortcuts for everything → rebindable combo, engine prefixes, quick modes |

Non-goals: not an omnibox replacement, no accounts, no sync, no analytics, no backend, no
injection into `chrome://`, Web Store, PDF viewer, New Tab, or `file:` pages.

---

## 3. Complete feature inventory (current reality, v1.4)

### 3.1 F1 — Global quick-search overlay (the core)
- **Default shortcut:** `Ctrl+Shift+K` (Mac: `MacCtrl+Shift+K`), handled by a manifest
  `commands` entry.
- **Rebindable:** user can capture a custom combo (Ctrl/Alt + letter/number/F1–F12) in the
  options page. Note: Chrome has **no** `chrome.commands.update` API, so a custom combo is
  matched by a content-script `keydown` listener instead. The manifest command stays as the
  default trigger.
- **Instant open:** since v1.4 the content script (with the overlay code) is statically
  registered on every http(s) page at `document_idle`, so the page is already "armed". Custom
  combos open the overlay **client-side with zero service-worker round trip**; the default
  combo goes through the manifest command. A 500 ms "echo window" prevents a dual-configured
  combo (set both in options and in `chrome://extensions/shortcuts`) from opening and
  immediately toggling shut.
- **Open speed target:** < 80 ms from shortcut to visible overlay.
- **Placement history:** PRD originally specified top-anchored pill at `top: 8vh`; the current
  shipped design is **centered** (see §4). A redesign is free to choose placement.

### 3.2 F2 — Four search engines + engine switching
| Engine | Search URL (`q` = encoded query) | Prefix | Suggestion endpoint |
|---|---|---|---|
| Google | `https://www.google.com/search?q={q}` | `g` | `https://suggestqueries.google.com/complete/search?client=firefox&q={q}` |
| Brave | `https://search.brave.com/search?q={q}` | `b` | Google endpoint (no public Brave API), historically labeled "via Google" |
| Bing | `https://www.bing.com/search?q={q}` | `k` | `https://api.bing.com/osjson.aspx?query={q}` |
| DuckDuckGo | `https://duckduckgo.com/?q={q}` | `d` | `https://duckduckgo.com/ac/?q={q}` |

Switching UX:
- **Pills** (buttons with engine logos) — click to switch instantly, query preserved.
- **Keyboard:** Arrow keys (`←`/`→`/`Home`/`End`) on the pill row cycle the engine;
  pill row is a `radiogroup`.
- **Prefix typing:** type `b cats` → engine becomes Brave, prefix stripped from the query.
  Requires the prefix, a space, then text. `g` Google, `b` Brave, `k` Bing, `d` DuckDuckGo.
- **Persistence:** last-used engine saved to `chrome.storage.local`, remembered across
  sessions. Default: Google.
- **Order is user-configurable** in options (drag or arrow buttons); Tab-cycle order in
  older builds followed engine order, the pill focus order follows it today.
- **Tab key does NOT cycle engines in the current build** — Tab toggles Google AI Mode
  (see 3.3). This is a deliberate change from the original PRD.

### 3.3 Google AI Mode
- A switch pill (spark icon, `role="switch"`) inside the input row, always visible.
- **`Tab` while the input is focused toggles AI Mode on/off** (Shift+Tab keeps the focus
  trap instead). The pill is also clickable.
- When on: engine snaps to Google, footer label reads **"Google AI"**, suggestion rows and
  the smart-URL row get a `· AI` suffix.
- Search uses the verified AI-results URL:
  `https://www.google.com/search?q={q}&udm=50&ntc=1&cs=0&atvm=2&zs=1`
  (`sxsrf` session tokens are never hardcoded). Earlier attempts (`webhp?atvm=2`,
  `/search?udm=2`) failed live — if Google changes the surface, this is a one-line swap in
  `engines.js` under `google.aiSearch`.
- Choosing another engine, entering a quick mode, or typing a prefix clears AI mode.

### 3.4 F3 — Selected-text auto-fill
- Select text on any page → press shortcut → the trimmed selection is **already in the box**,
  shown with a removable **selection chip** (spark icon) inside the input row.
- Only auto-fills when the selection is in the same document and *not* inside
  `input/textarea/select/[contenteditable]` — inside form fields the overlay opens empty.
- Whitespace is collapsed; hard cap **200 chars** default (user-configurable 50–1000),
  truncated with `…`.
- Optional setting: **auto-copy selection** to clipboard on open (user gesture context).

### 3.5 F5 — Search suggestions
- While typing, debounced **250 ms**; request routed through the service worker (host
  permissions make it CORS-proof); **1.5 s abort** timeout; **request-id stale-drop** so late
  responses never render.
- Effectively **always the Google suggest endpoint** for all engines now (Bing/DDG templates
  exist but are unused — simplified deliberately).
- Rendered as a list: **numbered rows `01, 02, …`** (up to 8), each with the suggestion title
  and an arrow glyph; a `Search for "<query>"` row is always first.
- Navigation: `↑`/`↓` cycles highlight (active row shows accent left-bar + arrow), `Enter`
  submits the highlighted row, click submits.
- Offline/error → suggestions silently hide; typing and Enter always work. No error UI.

### 3.6 F7 — Smart URL detection ("Go to site")
- Query that looks like a URL (`https?://…` or `domain.tld/path`) → a dedicated
  **"Go to `<label>`"** action row appears (globe icon, shine sweep animation) with the
  sub-label `<Engine> [· AI] · opens in new tab`.
- Only safe `http(s)` schemes are ever navigated; `javascript:` and `data:` are never
  accepted URLs. Trailing punctuation (`.,!?;:)`) is stripped before matching. A URL that is
  the current engine's own homepage is *not* offered (it would be a no-op search).
- `Enter` with the smart row focused/active goes to the site.

### 3.7 F8 — Quick search modes
Typed as prefixes (or conceptually pills) — mode wins over engine, clears AI mode:

| Mode | Prefix | URL |
|---|---|---|
| Images | `images:` | `https://www.google.com/search?tbm=isch&q={q}` |
| Videos | `videos:` | `https://www.google.com/search?tbm=vid&q={q}` |
| News | `news:` | `https://news.google.com/search?q={q}` |
| YouTube | `yt:` | `https://www.youtube.com/results?search_query={q}` |
| Wikipedia | `wiki:` | `https://en.wikipedia.org/w/index.php?search={q}` |

Footer label switches to the mode name while active.

### 3.8 Image search (Google Lens) — camera button + paste/drop/file
- **Camera button** in the input row; also **`Ctrl+V` paste of an image** into the overlay,
  or **drag & drop** an image onto the overlay.
- Attached image shows as a **thumbnail chip** in the input row (thumbnail image + `×`);
  click `×` removes it. `Esc` removes the attachment first, then closes on a second `Esc`.
- Image is validated locally: magic-byte sniff (PNG/JPEG/GIF/WEBP/BMP), **≤ 5 MB**,
  re-encoded via canvas to **≤ 2048 px** long edge, JPEG 0.9. Errors appear as a transient
  **toast** (e.g. "Image is too large (max 5 MB).").
- `Enter` with an image attached (optionally plus typed text) uploads to Google Lens and
  opens results in a **new tab**. The flow is deliberately invisible: a background Google tab
  is opened, the upload runs from `google.com` origin (correct Origin header + cookies), then
  the tab is activated only at the results URL — no homepage flash, no visible intermediate
  tab. Text (if any) is attached via `image_content` and, when the server drops it, a
  rewritten `udm=24&q=&lns_mode=mu&oq=` URL; final URL must be a `google.com/search` URL or it
  falls back to `https://lens.google.com/`. 20 s timeout.
- Overlay destroys itself synchronously before the results tab activates (no-residue rule).

### 3.9 Details & polish behaviors
- **Close paths:** `Esc` (removes image first if attached), click on the dim backdrop,
  re-press the shortcut toggles it shut, and (optional setting) **blur-close** — losing focus
  dismisses it. The close `×` button clears the query if non-empty, else closes.
- **Focus:** input is focused and caret placed on open; on close, focus is restored to the
  element that had it before (the page).
- **IME-safe Enter** (`e.isComposing` guard) so Japanese/Chinese composition doesn't fire a
  search mid-composition.
- **Space-key guard:** the overlay swallows `Space` at window capture level while open so the
  page behind (notably YouTube) can't start/stop playback; Spaces typed *inside* the input
  are re-inserted manually (`setRangeText` + synthetic `InputEvent`).
- **Empty state:** shows a "Type to search" call-to-action with a reticle icon and the hint
  *"or select text on any page and open QLens to search from context."*
- **Footer:** keyboard hints row (`↑` `↓` navigate · `⏎` search · `esc` close · `tab` ai) plus
  the current engine label with an accent dot.
- **Recent searches were removed** in v1.1 (user request) — both overlay UI, options card,
  and storage API. There is no history UI today. (Original v1.0 had 10-item recent history
  with delete/clear; do not assume it exists.)

### 3.10 F9 — Options page
- **Search engines:** default-engine picker (logo pills); engine order list — drag to
  reorder *and* ↑/↓ arrow buttons; changes persist and drive overlay pill order.
- **Appearance:** Theme segmented control (**System / Light / Dark**) + **6 accent swatches**
  (indigo `#6366F1`, violet `#8B5CF6`, emerald `#10B981`, rose `#F43F5E`, amber `#F59E0B`,
  sky `#0EA5E9`).
- **Behavior toggles:** search suggestions on/off; close-on-blur; auto-copy selection.
- **Right-click search:** segmented control — "Open overlay" (default) vs "Search directly".
- **Shortcut:** capture field (click, press combo, Save; validation via `isValidCombo`,
  modifier must include Ctrl/Alt/Command) + link to `chrome://extensions/shortcuts`.
- **Data:** "Reset to defaults" (clears settings, lastEngine, shortcut).
- Header shows logo, name, version badge, and the privacy line *"100% local — no data leaves
  your device."* Footer: version · "Free · No ads · No tracking".
- Toast feedback ("Engine order saved", "Shortcut updated", "Reset to defaults").

### 3.11 Toolbar popup (the extension action button)
A compact 320 px popup:
- Header: logo, "QLens", current shortcut badge.
- Search box with placeholder "Search or paste a URL…", engine pills (logo + name), and a
  full-width "Search" button; Enter works too.
- **Appearance** section: theme Auto/Light/Dark segmented control + accent swatches.
- **Behavior** section: search-suggestions toggle.
- Footer: "Full settings…" link → opens the options page.
- Submitting opens the result in a new tab and closes the popup.

### 3.12 F10 — Right-click context menu
- Menu item **"Search with QLens"** on selected text. Behavior: open the overlay pre-filled
  (default) or search directly with the default engine (setting).

### 3.13 v1.1 roadmap items that were planned but NOT built
- Clipboard quick-search chip (F11), `chrome.storage.sync` settings, blur-close beyond the
  existing toggle. A redesign may treat these as optional extras.

---

## 4. Current visual language (v1.2+ "glass prism" design)

This is what exists today. A redesign may replace it — but the *component inventory* in §5
and the *interaction semantics* in §6 must survive.

### 4.1 Concept
A floating **glass prism card** centered in the viewport (`top: 50%`, `left: 50%`, translated),
640 px wide (max `calc(100vw - 32px)`), 20 px radius, over a **dim blurred backdrop**. The card
is built from layered effects:

1. **Aurora** — three blurred `div` orbs behind the glass (accent-tinted top-center band,
   accent right orb, third static blue), drifting on slow infinite keyframes (15 s / 19 s /
   23 s alternate).
2. **Tint** — full-card `backdrop-filter: blur(26px) saturate(1.2)` layer that frosts both
   the page and the aurora.
3. **Specular top line** — a 1 px white-gradient hairline along the top edge (the "glass
   catch light").
4. **Noise** — a tiny SVG `feTurbulence` data-URI overlay at low opacity, `soft-light` blend
   (kills banding on the blur).
5. **Card shadow** — deep layered drop shadow + an inset top specular.
6. **Focus glow** — a radial accent glow above the input row that blooms (opacity + scale
   spring) while the input has focus (`:has(:focus-within)`).
7. **Light rail** — a faint 1 px horizontal gradient line under the engine pills.
8. **Smart-URL shine** — a one-shot diagonal shine sweep across the "Go to site" row.

### 4.2 Design tokens (CSS custom properties, dark default)
Accent-driven theming: one `--ql-accent` hex + derived `--ql-accent-rgb` + an ink color.
Theme via `data-theme="dark|light"` on the shadow host + a `prefers-color-scheme` media query
for "system".

| Token | Dark | Light |
|---|---|---|
| `--ql-text` | `#e8edf7` | `#141824` |
| `--ql-text-dim` | `rgba(214,224,243,.64)` | `rgba(23,28,45,.64)` |
| `--ql-text-faint` | `rgba(214,224,243,.52)` | `rgba(23,28,45,.5)` |
| `--ql-hairline` | `rgba(255,255,255,.1)` | `rgba(13,17,28,.09)` |
| `--ql-glass-tint` | `rgba(11,15,26,.55)` | `rgba(255,255,255,.62)` |
| `--ql-glass-blur` | 26 px | 22 px |
| `--ql-liner` / `--ql-liner-hover` | `rgba(255,255,255,.045)` / `.08` | `rgba(13,17,28,.045)` / `.08` |
| `--ql-glass-border` | `rgba(255,255,255,.14)` | `rgba(255,255,255,.85)` |
| `--ql-specular` | `rgba(255,255,255,.55)` | `rgba(255,255,255,.9)` |
| `--ql-badge-bg` / `--ql-badge-border` | `rgba(255,255,255,.16)` / `.22` | `rgba(255,255,255,.9)` / `rgba(13,17,28,.08)` |
| `--ql-backdrop-bg` | `rgba(4,6,12,.46)` | `rgba(28,33,52,.18)` |
| `--ql-backdrop-blur` | 22 px | 16 px |
| `--ql-aurora-alpha` | .5 | .34 |

Geometry: card width 640 px; input row height 48 px; pill height 34 px; suggestion row height
44 px; radii: input 16 px, card 20 px, pills 999 px, image chip 10 px, small controls 6–10 px,
button targets ≥ 44 px. Spacing scale 4/8/12/16/20/24. Type: **Inter** (bundled woff2 weights
400/500/600/700), input 16 px semibold, pills 12 px, rows 13 px, subs 11 px, footer 11 px.

Motion: entry = scale `.94 → 1` + fade + slight translate, **200 ms** spring
(`cubic-bezier(.34,1.56,.64,1)`), staggered children (input row 60 ms, pill zone 100 ms,
footer 140 ms, caret 80 ms); exit 120 ms fade; backdrop animates **opacity only** (blur is
static — avoids per-frame `backdrop-filter` repaint). Pill select: `pill-pop` scale bounce
then badge `rotate/scale` micro-bounce; suggestion rows rise in with `--i * 30 ms` stagger;
active suggestion row gets an accent inset left bar, 2 px translate, and its arrow fades in.
**All animation disabled under `prefers-reduced-motion`** (durations forced to ~0; panel +
backdrop keep a minimal 150 ms fade).

Accessibility hard rules: `role="dialog"` + `aria-modal`; focus trap (Tab wraps within the
panel, Shift+Tab wraps backwards; Tab-on-input is hijacked for the AI toggle, so trap is
Shift+Tab-driven from the input); visible 2 px accent focus rings (`outline-offset`); icon
buttons carry `aria-label`/`title`; contrast meets WCAG AA; interactive elements ≥ 44 px.

### 4.3 Options & popup styling
Same accent token system, simpler material: translucent `rgb(255,255,255,.82)` / dark
`rgb(28,30,44,.85)` cards with `backdrop-filter: blur(20px)`, radial accent wash in the page
background, 20 px card radius, pill/segmented/swatch/toggle controls as listed in §3.10–3.11.

### 4.4 Branding
- Icon: rounded 128-square, indigo→violet diagonal gradient (`#4F46E5 → #7C3AED`), a white
  magnifier ring + handle (drawn as translucent circle + line). Sizes 16/32/48/128.
- UI font: **Inter** everywhere. Logo lockup: "QLens" wordmark.

---

## 5. Overlay DOM & state inventory (what a redesign must provide)

### 5.1 Overlay structure (current implementation, Shadow DOM)
```
host (div, role=dialog, aria-modal, data-theme attr)         → appended to document.documentElement
└─ shadow root (open, adoptedStyleSheets)
   ├─ .ql-backdrop        dim + blur layer, click-to-close, noise overlay
   └─ .ql-panel           the card
      ├─ .ql-aurora       (3 × .ql-orb a/b/c — animated colored blurs)
      ├─ .ql-tint         glass blur/saturation layer
      ├─ .ql-content
      │  ├─ .ql-glow      accent radial glow above input, blooms on :focus-within
      │  ├─ .ql-input-row (search icon · input · .ql-chip-zone · hidden file input · AI pill · camera · close)
      │  │   ├─ .ql-icon.ql-ic-search
      │  │   ├─ input.ql-input   (role=combobox, aria-autocomplete=list, aria-controls=#ql-suggest)
      │  │   ├─ .ql-chip-zone    (selection chip / image chip render here)
      │  │   ├─ input[type=file] (hidden, accept=image/*)
      │  │   ├─ button.ql-pill-ai (spark icon + "AI Mode", role=switch)
      │  │   ├─ button.ql-img-btn (camera icon)
      │  │   └─ button.ql-close  (×)
      │  ├─ .ql-pill-zone (role=radiogroup)
      │  │   ├─ .ql-pills        → N × button.ql-pill (logo badge + name, role=radio)
      │  │   └─ .ql-pill-rail    (decorative light rail)
      │  ├─ .ql-smart-zone       → button.ql-smarturl (globe icon + "Go to <label>" + sub-label)
      │  ├─ #ql-suggest.ql-suggest (role=listbox)
      │  │   └─ rows: .ql-sug-row (span.ql-sug-k #[01] · b.ql-sug-title · arrow) or .ql-empty
      │  └─ footer.ql-foot
      │      ├─ .ql-foot-hints   (kbd ↑ ↓ navigate · ⏎ search · esc close · tab ai)
      │      └─ .ql-foot-engine  (accent dot + engine/mode/AI label)
      └─ .ql-err         toast overlay (absolute, top-center, error messages)
```

### 5.2 Overlay states
1. **Empty** — placeholder "Search anything, anywhere", pills, hint text block, footer.
2. **Typing (no decode)** — suggestions list open/closed depending on settings.
3. **Selection chip** — input pre-filled + removable chip (click chip = clears selection
   fill only).
4. **Image chip** — thumbnail + `×`; input text becomes the image's optional text.
5. **Smart URL** — action row visible instead of suggestions.
6. **AI Mode on** — pill active, engine pinned to Google, labels show "Google AI".
7. **Quick mode active** — footer/mode labels; pills reflect the engine underneath.
8. **Error toast** — transient message top-center of panel.
9. **Closing** — exit animation then full DOM removal.

### 5.3 Overlay state variables (module closure)
`engineId`, `initialEngineId`, `modeId`, `aiMode`, `engineOrder`, `settings`, `suggestions`,
`suggestionHighlight`, `suggestionReqId`, `selectionText`, `selectionActive`, `attachment`
(image bytes + object URL), `actionSite`, `prevFocusEl` (focus restore target), `closing`
(re-entrancy guard), `suggestionTimer`, `toastTimer`.

---

## 6. Keyboard & interaction map (semantics a redesign must keep 1:1)

| Input | Behavior |
|---|---|
| Shortcut (default `Ctrl+Shift+K` / custom combo) | Toggle overlay open/closed |
| `Esc` | If image attached → remove image; else close overlay |
| `Tab` (input focused) | Toggle Google AI Mode (not engine cycle!) |
| `Shift+Tab` | Reverse focus-trap step |
| `Tab` (elsewhere) | Forward focus-trap step |
| `Enter` | Priority: search image (if attached) → submit highlighted suggestion → "Go to site" → search query; IME-composing Enter ignored |
| `↑` / `↓` | Move suggestion highlight (wraps), sets `aria-activedescendant` |
| `←` / `→` / `Home` / `End` (pill row focused) | Switch engine |
| `Space` (anywhere while overlay open) | Swallowed at window capture; inserted as text only when input is the source (page can't scroll/play media behind) |
| Engine prefixes `g` `b` `k` `d` + space | Switch engine, strip prefix |
| Mode prefixes `images:` `videos:` `news:` `yt:` `wiki:` | Switch quick mode, strip prefix |
| Pills / AI pill / camera / close / chips | Click handlers as described in §3, §5 |
| Backdrop click | Close (only when the click target *is* the backdrop) |
| Focus loss (setting on) | Close |

Focus trap order: input → AI pill → camera → close → pills → smart row → suggestions →
(back to input). On open: input focused immediately. On close: focus restored to
`document.activeElement` captured at open time.

---

## 7. Architecture facts the UI must not break

### 7.1 Extension anatomy
- `manifest.json` — MV3; permissions `scripting`, `storage`, `contextMenus`; host permissions
  `http://*/*`, `https://*/*`; static `content_scripts` (8 files, `document_idle`,
  `all_frames: false`); service worker; `commands`; `options_page`; `action` popup;
  `web_accessible_resources` for bundled woff2 fonts.
- **Service worker** (`src/background/service-worker.js`) — command routing, on-demand
  guarded injection (nonce stored via executeScript, probe for pre-loaded lean set, inject
  full set or delta, retry ×2 @ 100 ms), suggestion proxy fetch, `OPEN_TAB`
  (http/https allowlist + lastEngine write + `tabs.create`), `IMAGE_SEARCH` flow (background
  Google tab → MAIN-world lens upload func → activate at results URL), context menu.
- **Content scripts** — `selection.js` (capture/truncate/editable-guard), `overlay.js`
  (the whole UI), `injector.js` (nonce-guarded listener registration, custom-combo keydown,
  echo-window suppression).
- **Shared modules** — `config.js`, `messaging.js`, `engines.js`, `logos.js`, `storage.js`;
  all attach to `globalThis.QLENS` (works in SW `importScripts`, CS injection, and plain
  `<script>` tags — no ES modules in content scripts).

### 7.2 Message protocol (`QLENS.MSG`)
| Type | Direction | Meaning |
|---|---|---|
| `OPEN_OVERLAY` | SW → CS (or CS→SW inbound) | Show overlay; payload may carry `selection`, `settings`, `lastEngine` (preloaded so frame one paints correct theme/engine — no hydrate flash) |
| `CLOSE_OVERLAY` | SW → CS | Destroy |
| `OPEN_TAB` | CS → SW | Open validated URL in new active tab; overlay destroyed synchronously before |
| `FETCH_SUGGESTIONS` / `SUGGESTIONS_RESULT` | CS ⇄ SW | Proxy fetch with request id (stale-drop) |
| `OVERLAY_READY` | CS → SW | (legacy handshake) |
| `IMAGE_SEARCH` | CS → SW | Image upload + Lens navigation |

Every message validates `sender.id === chrome.runtime.id`.

### 7.3 Storage schema (`chrome.storage.local`)
```jsonc
{
  "settings": {
    "defaultEngine": "google",
    "engineOrder": ["google", "brave", "bing", "duckduckgo"],
    "theme": "system",            // "system" | "light" | "dark"
    "accent": "indigo",           // indigo|violet|emerald|rose|amber|sky
    "blurClose": false,
    "autoCopySelection": false,
    "suggestions": true,
    "maxSelection": 200,          // 50–1000
    "contextMenuAction": "overlay" // "overlay" | "direct"
  },
  "lastEngine": "google",
  "shortcut": "Ctrl+Shift+K"      // custom-combo storage key
}
```
All reads validate-and-fallback (corrupt/garbage storage → defaults). No recent-history key
in current builds.

### 7.4 Hard invariants (the "no-bug" contract)
1. **Never auto-show** the overlay — only via shortcut, context menu, or explicit message.
2. **Zero residue** — overlay lives 100% inside a Shadow-DOM host appended to
   `document.documentElement`; on any close (or Enter) the host is *removed*; destroyed
   **synchronously before** `chrome.tabs.create` fires.
3. **Never `innerHTML` with user data** — `textContent`/`createElement` only (XSS hardening).
   (Static icon SVG markup is fine — it contains no user input.)
4. All navigation URLs pass `buildSearchUrl()` or an explicit `http(s)` allowlist;
   `javascript:`/`data:` unreachable.
5. Every `chrome.*` call wrapped in try/catch; every fetch abortable with stale-drop.
6. Guard injection with a `window` nonce; guard messages with `sender.id`.
7. `z-index: 2147483647`, `position: fixed` on the host — always on top; `all: initial` on
   `:host` so the page can't affect the overlay and the overlay can't leak styles.
8. No inline event handlers, no eval, no remote code (CSP `script-src 'self'`).
9. IME composition and the Space-key/YouTube guard (see §6) must be preserved.
10. All timing constants: suggestion debounce 250 ms, abort 1.5 s, image timeout 20 s,
    image max 5 MB / 2048 px / JPEG 0.9, entry animation 200 ms.

---

## 8. Testing & quality story (so a redesign keeps the same rigor)

- **Syntax:** `node tests/check-syntax.mjs` — `node --check` on every JS file (13 files).
- **Unit:** `node tests/unit/run.mjs` — 45 tests, zero deps (Node builtins + eval-loaded
  modules + chrome stub): engine URLs, encoding, quick modes, AI URLs, prefixes, smart-URL,
  suggestions-always-Google, storage sanitization/round-trips, shortcut combo
  validation/matching, manifest content (eager content_scripts == CONTENT_FILES),
  selection truncation, Lens multipart body.
- **Smoke (optional, needs puppeteer-core + Chrome for Testing):** `node tests/e2e/smoke.mjs`
  — 18 cases: overlay open, search, engine switch, smart URL, selection autofill, Esc close,
  toggle ×5, popup render/search, shortcut save + real-keyboard custom combo, parse-local
  hints, manifest sanity. Not runnable inside the DSH sandbox (Chrome named pipes blocked).
- **Manual matrix:** `tests/manual-checklist.md` — robustness rows E1–E16 (restricted pages,
  rapid toggling, SPA nav, reload-while-open, editable-region selection, 5000-char truncation,
  offline suggestions, malicious URLs, z-index wars, extension disabled mid-session, corrupt
  storage, shortcut conflicts, multi-window), visual QA on 6 diverse sites, motion/reduced-
  motion, theme/accent contrast, engine sanity, selection cases, smart-URL, options
  persistence, the **no-residue screenshot test**, image rows M1–M7 (pick/paste/drop/text+image
  /Esc-first/×/text-paste), and an empty error log.
- Known dev-environment note: Google Chrome stable ignores `--load-extension`; smoke uses
  Chrome for Testing; zombie CFT processes must be killed between runs (profile lock).

---

## 9. Design history — lessons a new UI should honor

| Iteration | What happened | Why it matters for a redesign |
|---|---|---|
| v1.0 | PRD implementation: top pill, Tab cycles engines occasionally | Baseline feature set F1–F10 |
| v1.1 | Popup added; shortcut rebinding (→ content-script keydown, since `chrome.commands.update` doesn't exist); **recent-history removed**; Inter bundled | Keyboard-capture UX; no history UI exists anymore |
| v1.2 | Overlay rebuilt to the "glass prism" reference (`searchbar-ui.html`): aurora orbs, tint, specular line, noise, staggered spring entry, numbered suggestions, empty state, footer kbd hints | The current look; the reference file doubles as a live design mock |
| v1.3 | **Image search** added (camera/paste/drop, Google Lens upload); **Google AI Mode** added | AI URL param set was iterated live (`webhp?atvm=2`, `/search?udm=2` both failed; `udm=50&ntc=1&cs=0&atvm=2&zs=1` works); Tab re-purposed from engine-cycle to AI toggle |
| v1.3 fixes | Lens upload moved SW → CS → SW → MAIN-world script injection (Origin/cookie correctness); background-tab flow kills homepage flash; paste-into-shadow-DOM bug; image-content text attachment (udm=24 rewrite) | The image path is the most delicate part; a redesign keeps its UX (no visible intermediate tab) or hides the machinery entirely |
| v1.4 | Instant open: static content scripts (listener already on page), custom combo opens client-side, SW preloads settings/lastEngine into the open payload (frame-one paint, no flash/re-render); entry 380→200 ms; Space/YouTube guard; suggestion rows cleaned to number + title + arrow only | "Fast, silent, zero flash" is now a design principle, not an option |
| Design taste | Google bot anti-bot walls can break automated search flows; suggestion API shapes drift; `atvm` AI params may change on Google's side | Prefer resilient, dependency-free UI; hardcode nothing that Google rotates (sxsrf etc.) |

Anti-patterns explicitly rejected in this project (do not reintroduce): innerHTML with user
data, auto-popups, persistent page UI, backend/telemetry, bundlers/build steps, frameworks,
external icon fonts/CDNs.

---

## 10. What a redesign is free to change vs. what is fixed

### Fixed (must persist 1:1 — interaction and product contract)
- Feature set of §3 and every keyboard/interaction row of §6.
- Ephemerality + zero-residue + synchronous-destroy-before-tab rule.
- Engine/mode/prefix/AI semantics and URL building (engines, prefixes, AI URL params).
- Image-search UX states (attach source, chip, remove, text-optional, invisible navigation).
- Accessibility contract: dialog semantics, focus trap, visible focus, contrast ≥ AA,
  ≥ 44 px targets, reduced-motion support, IME safety.
- Privacy story: no new permissions, no backend, no analytics, no remote content.
- Options & popup capabilities (every setting in §3.10/3.11 must remain reachable).
- Storage schema and message protocol (or a documented migration).

### Free (the fresh-design space)
- **Visual language:** material, color system, typography scale, texture, iconography,
  lighting — anything.
- **Layout geometry:** card geometry, placement (top-anchored pill, centered card, bottom
  sheet, full command-palette), sizes, breakpoints.
- **Motion language:** easings, durations, choreography, transitions, hover/active feedback,
  sound (none today).
- **Information hierarchy:** how suggestions, pills, mode, AI, image chip, and footer hints
  are arranged; text labels vs. icons; empty/loading/error states.
- **Surfaces:** whether suggestions appear inline, as a dropdown, or as a full list view;
  how the toolbar popup and options page are structured.
- **Extras:** anything additive that respects non-goals (history UI, clipboard chip, themes,
  more engines, i18n) — none required, all optional.
- **Brand:** new icon, name styling, marketing copy — while keeping "QLens" recognizable.

---

## 11. Repo map (reference)

```
QLens/
├── manifest.json                  MV3 manifest (still says version 1.0.0)
├── PRD.md / QLens-PRD.md          product spec (source of truth, v1.0 scope)
├── PROJECT.md                     spec + goals/acceptance (in-scope checklist)
├── PLANNING.md                    architecture + data flow + decisions
├── TASKS.md / MEMORY.md           execution history (T001–T048) + session state
├── AGENTS.md                      build rules for agents
├── CHANGELOG.md                   release notes
├── README.md                      user-facing readme
├── searchbar-ui.html              the v1.2 design-reference mock (glass prism)
├── probe-*.mjs                    experiments (Lens endpoint, image search)
├── docs/superpowers/              design/plan notes
├── src/
│   ├── background/service-worker.js   (394 lines)
│   ├── content/ overlay.js (2080) · injector.js · selection.js
│   ├── shared/   config.js · messaging.js · engines.js · storage.js · logos.js
│   ├── options/  options.html/.css/.js
│   ├── popup/    popup.html/.css/.js
│   ├── fonts/    Inter woff2 (400/500/600/700)
│   └── icons/    icon16/32/48/128.png + icon.svg
├── tests/        check-syntax.mjs · unit/run.mjs (45) · e2e/smoke.mjs (18) · manual-checklist.md
└── tools/        generate-icons.ps1
```

**Final note for the prompt-writer:** QLens's soul is *"fast, ephemeral, private, and
beautiful in the crack between thought and search."* Whatever fresh UI is designed must make
the 300 ms from idea → results feel effortless, and the page behind must always come back
pristine. That promise is the product.