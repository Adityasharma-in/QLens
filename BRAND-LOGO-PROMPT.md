# QLens — Premium Logo Prompt Kit

**Concept:** The Query Aperture
**Brand line:** The web, in focus.
**Palette:** Obsidian · Bone · Signal Mint · Iris
**Goal:** a mark that reads as a precision instrument at 128 px and as a distinctive silhouette at 16 px — not another magnifying glass.

> **If you only copy one thing, copy §3.** The rest is the identity board, the production SVG prompt, the wordmark, and the QA gate.

---

## 1. The product, in brand terms

QLens is not "a search extension." It is an **ephemeral instrument**: one shortcut, one glass surface, one query, gone. Four engines, selection search, image search, AI mode, no lock-in, no telemetry. The feeling is **precision + quiet + speed**, not "AI magic" and not "browser utility."

The current icon is a competent but generic indigo-violet magnifier. It says "search utility" — the one thing every competitor also says. It also misses the product's real character: **the UI is glass, but the brand should be the instrument that focuses it.**

The options page already knows this. It calls itself *Precision Instrument / Editorial Darkroom*, uses an ink-and-paper palette, and signs off with **LENS 01** and **"Calibrate your lens."** The new identity should make that latent brand explicit — then make the icon the sharpest expression of it.

**The one-line strategy:** *The product is glass; the logo is the instrument.*

### What the logo must say

| Signal | Visual translation |
|---|---|
| Focus | a lens, a point, a clean aperture |
| Speed | one continuous stroke, no friction, no ornament |
| Privacy / ephemeral | an open ring — nothing trapped, no residue |
| Craft | optical-instrument geometry, not cartoon UI |
| Keyboard-first | the Q tail doubles as a caret / beam |

### What it must not say

- "Search" via a magnifying glass — category cliché.
- "AI" via sparkles — generic and already dated.
- "Glassmorphism" via a frosted blob — that is the UI, not the identity.
- "Cheap extension" via a blue-purple gradient — the default look of every tool.

---

## 2. The direction — "The Query Aperture"

### The story

QLens is a lens you summon. The mark is that lens at the instant of focus:

- The **ring** is the lens and the page.
- The **aperture gap** is the overlay opening — ephemeral, nothing trapped.
- The **tail** is the keystroke that opens it, and the Q that names it.
- The **mint dot** is the query entering the lens.
- The **refraction hairline** is the lens coating — a reward for looking closer.

The dot, the aperture gap, and the tail sit on one diagonal optical axis: light enters at **10:30**, focuses at the dot, exits as the Q tail at **4:30**. That gives the mark a logic you can explain in one sentence — and a silhouette you can recognize in one glance.

### Symbol anatomy

| Element | Form | Meaning |
|---|---|---|
| **Ring** | near-perfect circle, one continuous monoline stroke, 3% optical thickness bias to the lower right | the lens / the page |
| **Aperture** | clean 18° gap at 10:30, butt terminals — not a notch, not a broken spinner | the overlay is open, then gone |
| **Tail** | 45° beam at 4:30, starts just inside the counter, crosses the ring, flat angled cut | Q, caret, speed — never a magnifier handle |
| **Dot** | Signal Mint, offset about 3% of the ring diameter above-left of center | the query / the point of focus |
| **Refraction** | 1.5-unit hairline on the inner edge, Mint → Iris at 35%, large sizes only | lens coating / craft |
| **Tile** | continuous-corner squircle, 22% radius, obsidian, hairline inner edge light | anodized instrument body |

### Why this beats the category

| Category default | QLens |
|---|---|
| magnifying glass | a Q constructed as a lens |
| blue-purple SaaS gradient | obsidian + bone + one mint point |
| glossy 3D / bevels | matte enamel, flat vector |
| generic letter in a rounded square | a constructed mark with a story |
| decoration everywhere | one idea, three colors, zero ornament |

### Palette

| Token | Hex | Role | Usage |
|---|---|---|---|
| **Obsidian** | `#0A0D12` | field | icon tile, dark surfaces |
| **Bone** | `#F5F2EA` | mark | ring, wordmark on dark |
| **Signal Mint** | `#4FE0B0` | accent | dot, focus, active states |
| **Iris** | `#7A6CFF` | refraction | 1.5-unit arc only; bridge to the existing indigo |
| **Pine** | `#076B52` | accessible accent | mint for text/focus on light surfaces |

**Why mint, not the current indigo?** Indigo is pleasant, but it is also the default color of every developer tool. Mint is unclaimed in the search category, reads as a lens coating, signals "go" and privacy, and gives the dark tile one jewel-like point. Iris survives as a hairline refraction, so the identity does not lose the old accent entirely.

**Why bone, not pure white?** Warm off-white feels like paper and optical enamel; pure white feels clinical and cheap.

**Why obsidian, not black?** A near-black with a blue-green undertone reads as anodized aluminum. Pure black kills the inner highlight and flattens the mint.

**Accessibility note:** bone on obsidian is roughly 17:1; mint on obsidian is roughly 11:1. For small text or focus rings on light surfaces, use **Pine `#076B52`**, not bright mint. Verify final values with a contrast checker.

### Typography

- **Wordmark:** Inter (already bundled) — Inter 700 for the Q, Inter 600 for "Lens", tracking -2%. The Q is custom-drawn to share the icon's ring and 45° tail; its tail descends slightly below the baseline. No new font dependency.
- **UI:** Inter (existing).
- **Tagline:** Inter 500, sentence case, +0.02em.
- **Labels:** Inter 600, 10 px, uppercase, +0.14em.

### Material rules

Matte enamel on anodized metal. Flat vector. Depth only from a hairline top specular and a very faint inner shadow. **No gloss, no 3D bevel, no chrome, no glassmorphism blur, no neon glow, no drop shadow, no lens flare.** The refraction is the only spectral moment, and it is a hairline.

### Optical-size variants

| Size | Behavior |
|---|---|
| **16 px** | dot reduced to ~2 px of mint; refraction and specular removed; ring stroke thickened; aperture gap narrowed to ~12°; tail shortened slightly so it does not clip |
| **32 px** | dot present; refraction removed; full silhouette |
| **48 px+** | dot, specular, and refraction all visible |
| **128 px** | hero: hairline inner edge light, faint inner shadow, full detail |

This is an optical-size system, not one drawing scaled down. It is what makes the icon feel designed rather than generated.

### Motion signature (optional, for the brand)

- **Open:** the ring draws from the tail around the circle in 200 ms ease-out; the dot scales in last with a 40 ms overshoot.
- **Close:** 120 ms fade; the dot goes last.
- **No loop. No idle animation.** Respect `prefers-reduced-motion: reduce`.

---

## 3. The main prompt — app icon

Paste this into GPT Image, Nano Banana, Midjourney (or use the short version in §8), or Ideogram. It is written to produce **one icon, no text**, so the model cannot ruin the wordmark. This produces a presentation image; use §5 for the transparent production assets.

```text
Design a premium app icon and primary logo mark for QLens, a Chrome extension that opens an ephemeral glass search overlay on any webpage with one keystroke. QLens is fast, private, keyboard-first, and leaves no trace. The brand should feel like a precision optical instrument — quiet, exact, expensive — not a browser utility, an AI toy, or a generic search extension.

THE MARK — "The Query Aperture"
Draw the letter Q as a lens. The ring and tail are one confident, continuous monoline stroke that begins at the aperture gap and ends at the beam tip; the dot is separate.
- A near-perfect circular ring, open at 10:30 like a camera aperture: an 18-degree clean gap, not a broken spinner.
- At 4:30, the stroke exits as a straight 45-degree beam — the Q's tail. It begins just inside the ring's counter and crosses the ring, so the mark reads as a Q at every size and never as a magnifying glass. End it with a flat, angled cut, like a beam of light — not a rounded handle.
- Just above-left of dead center, place one small solid dot: the query entering the lens. Offset it by about 3% of the ring diameter so the mark never reads as a record button. The dot, the aperture gap, and the tail sit on one 10:30-to-4:30 optical axis.
- Give the ring a barely perceptible thickness bias toward the lower right (about 3%), as if light is bending through glass.
- Nothing else: no extra blades, no crosshairs, no sparkles, no letters.

THE TILE
A continuous-corner squircle (Apple-grade superellipse), 22% corner radius, filling a 1:1 canvas edge-to-edge. The mark is optically centered, occupying about 62% of the tile, with generous, even negative space. The ring center sits slightly up-left of the tile center to balance the tail's lower-right weight. No text, no wordmark, no mockup, no browser chrome.

COLOR — strict, three colors
- Field: Obsidian #0A0D12, near-black with a barely-there vertical lift from #10141B at the top to #080A0F at the bottom. Almost flat.
- Mark: Bone #F5F2EA, a warm off-white, not pure white.
- Accent: Signal Mint #4FE0B0, used only for the dot and a single hairline refraction on the ring's inner edge (about 1.5% of the tile width), fading from mint to Iris #7A6CFF at 35% opacity. No rainbow, no extra hues.
- Add a hairline inner edge light (white at 6%) around the tile so it separates from dark browser chrome.

MATERIAL
Matte enamel on anodized metal. Dense, high-contrast, flat vector. Depth comes only from a hairline inner top specular and a very faint inner shadow. No gloss, no 3D bevel, no chrome, no glassmorphism blur, no neon glow, no drop shadow, no lens flare.

ART DIRECTION
Swiss modernist mark construction meets Apple icon craft. The precision of a Leica lens, the restraint of Vercel, the optical care of Linear. One idea, three colors, zero decoration. Perfectly balanced, with intentional asymmetry only in the Q tail. It should look inevitable, like a mark that has always existed.

OUTPUT
One icon, centered, 1:1, high resolution (2048 x 2048 if supported), razor-clean vector edges, on a warm neutral studio background #E9E5DC. No captions, no watermark, no multiple options. The icon must stay legible and distinctive at 16 x 16. If the silhouette starts to read as a magnifying glass, a power button, a record button, or a camera aperture, discard it and rebuild the Q tail to be more decisive.
```

---

## 4. The identity board prompt

Use this after you have an icon you like. It creates a presentation board for judging the whole system. Text may render imperfectly in image models — treat the board as art direction, not final typography.

```text
Create a premium brand identity presentation board for QLens, a Chrome extension that opens an ephemeral glass search overlay on any webpage with one keystroke. The board should feel like a senior identity studio's launch deck, not an AI moodboard.

Canvas: 16:10 landscape, warm paper #E9E5DC, 3 x 3 grid, wide gutters, precise alignment, generous negative space, tiny page-number and section labels in charcoal.

Brand idea: "The Query Aperture." A Q drawn as a precision lens: bone ring on an obsidian squircle, an 18-degree aperture gap at 10:30, a 45-degree beam tail at 4:30, one mint dot just above-left of center, and a hairline mint-to-iris refraction on the inner edge. Palette: Obsidian #0A0D12, Bone #F5F2EA, Signal Mint #4FE0B0, Iris #7A6CFF. Type: Inter only. Tagline: "The web, in focus." Secondary line: "One keystroke. No trace."

Panels:
1. Logo cover — the icon large, the wordmark "QLens", the tagline, vast negative space.
2. Construction — the icon with thin construction lines: circle, 45-degree axis, aperture gap, dot, tail; tiny labels.
3. Product surface — a minimal browser window with an article blurred behind a frosted glass search bar; the QLens icon in the corner; four small engine dots; no readable fake article text.
4. Brand essence — "The web, in focus." large, "One keystroke. No trace." small, quiet paper.
5. Color system — four large chips with hex codes in small mono: Obsidian, Bone, Signal Mint, Iris.
6. Typography — "QLens" wordmark large, Inter specimen, a compact alphabet row, no paragraphs.
7. Icon system — 512, 128, 48, 32, and 16 px in a row; mono versions; the 16 px must be clearly legible.
8. Toolbar proof — a neutral Chrome-style toolbar with five extension icons; QLens is the dark squircle with the bone Q and mint dot, visibly the most distinctive; no real brand logos.
9. Atmosphere — a cinematic macro of a camera lens element with a faint mint coating reflection, dark, no people, no text.

Art direction: matte instrument, Swiss grid, Apple icon craft, Leica precision, Vercel restraint. Warm paper against obsidian. No glossy mockups, no fake dashboards, no rainbow, no generic AI glow, no floating 3D objects. Text sparse and large enough to render; if a label cannot be spelled correctly, omit it rather than misspell.
```

---

## 5. The production prompt — SVG + PNG

This is the one that actually ships. Give it to a coding/vector model (Claude, GPT, Gemini) that can write files. It respects QLens's zero-build, zero-dependency, CSP-safe constraints.

```text
You are a senior brand designer and SVG engineer. Build the production logo system for QLens. Output files, not prose. Do not add runtime dependencies. The extension is zero-build, CSP-safe, and bundles Inter 400/500/600/700.

PRODUCT
QLens is a Chrome MV3 extension that opens an ephemeral glass quick-search overlay on any webpage with Ctrl+Shift+K. Four engines, selection search, image search, AI mode, 100% local, zero residue. The brand idea is "The Query Aperture": the product is glass; the logo is the precision instrument that focuses it.

DELIVERABLES
1. src/brand/icon.svg — 128 x 128 viewBox, full icon: tile, ring, tail, dot, specular, refraction.
2. src/brand/icon-16.svg — 16 px optical variant on a 16 x 16 pixel grid: keep the dot at ~2 px, remove refraction and specular, thicken the ring, tighten the aperture gap to ~12 degrees, shorten the tail slightly so it does not clip.
3. src/brand/icon-mono.svg — one-color mark on transparent, no tile, uses currentColor. Dot omitted at 16 px; at large sizes the dot may be a negative-space hole.
4. src/brand/wordmark.svg — "QLens", exact casing: capital Q, capital L, lowercase e-n-s. No icon.
5. src/brand/lockup-horizontal.svg — icon + wordmark, baseline aligned.
6. src/brand/lockup-stacked.svg — icon above wordmark.
7. src/brand/tokens.css — CSS custom properties for the palette, clear space, and minimum sizes.
8. src/brand/preview.html — static preview at 16/32/48/128/512 on light, dark, and mono; plus a toolbar row and a photo-background test.
9. src/icons/icon16.png, icon32.png, icon48.png, icon128.png — 16 from icon-16.svg; 32 from icon.svg with refraction and specular hidden; 48/128 from the full icon. Optimized, transparent outside the squircle.
10. src/brand/README.md — usage rules, clear space, minimum sizes, do/don't list.

GEOMETRY (starting point; optical corrections win over literal coordinates)
- Canvas 128 x 128. The squircle tile fills the canvas; corner radius 28 (21.9%); continuous/superellipse corners, not a plain rounded rectangle.
- Tile fill: vertical gradient #10141B to #080A0F. Hairline inset edge stroke: white at 6%.
- Ring center (60, 60); outer radius 37; stroke 11; inner radius 26. Aperture gap 18 degrees centered at 10:30 (clock positions; 12:00 is up), with clean butt terminals.
- Tail: 45-degree axis, stroke 11, butt cap, from radius 25 (just inside the counter) to radius 54 (outside the ring). It must cross the ring, not sit tangent to it.
- Dot: radius 6.5 at (58, 58) — offset up-left from the ring center so the mark never reads as a record button.
- Refraction: 1.5-unit arc tracing the inner edge from 6:30 to 8:30, gradient Signal Mint to Iris, opacity .35.
- Specular: 1-unit arc on the top inner edge from 10:30 to 1:30, white at 8%.
- Optical centering: the ring center is 4 units up-left of the tile center (64, 64) to balance the tail's lower-right weight.
- 16 px variant: 16 x 16 viewBox, ring center (7.5, 7.5), outer radius 4.6, stroke 1.4, dot radius 1.0, aperture gap 12 degrees, tail on the 45-degree axis with a 1.4 stroke. Pixel-snap the tail terminals; keep the diagonal exact.

COLOR TOKENS
--ql-ink: #0A0D12
--ql-bone: #F5F2EA
--ql-mint: #4FE0B0
--ql-iris: #7A6CFF
--ql-pine: #076B52
--ql-fog: #8B93A7
--ql-slate: #151A22
Mint is the only accent in the icon. Iris appears only in the refraction hairline. Never use mint for small text on bone; use Pine.

TYPE
The wordmark uses the bundled Inter. Set the Q in Inter 700 with a custom 45-degree tail that descends about 4% below the baseline; set "Lens" in Inter 600. Tracking -2%. Convert the wordmark to outlines so it renders without the font at runtime. Do not add a new font file. Do not put the icon inside the wordmark.

RULES
- The mark must work in one color with no dot, no refraction, and no tile.
- The mark must never read as a magnifying glass, power button, record button, or camera aperture.
- The tail must cross the ring; a handle that starts at the outer edge is forbidden.
- No filters, no masks that break rasterization, no external images, no remote fonts, no scripts in the SVGs.
- Each SVG under 8 KB. Use simple paths and a linearGradient only where specified.
- Clear space: 0.5 x the icon width on all sides. Minimum sizes: icon 16 px, horizontal lockup 96 px, stacked lockup 72 px.
- The icon tile is full-bleed; there is no outer transparent padding beyond the squircle corners.

ACCEPTANCE
- At 16 x 16, the Q silhouette is instantly legible and the mint dot is a clean point, not a smudge.
- At 16 x 16, the mark is more distinctive than a row of Google, Brave, Bing, and DuckDuckGo favicons.
- In one color, it still reads as Q.
- Bone on obsidian is at least 7:1; mint on obsidian is at least 4.5:1; Pine on bone is at least 4.5:1.
- preview.html renders correctly in Chrome with no console errors and no network requests.
- The PNGs match the SVGs at 16/32/48/128 and install cleanly in chrome://extensions.
```

---

## 6. The wordmark prompt

Use Ideogram or a vector model for this. Image models frequently misspell short brand names; check every letter.

```text
Design a custom wordmark for "QLens" — exact spelling: capital Q, capital L, lowercase e, n, s. One line, no icon.

The Q is the hero: its bowl shares the icon's circular lens geometry, and its tail is a 45-degree beam that descends slightly below the baseline and ends in a flat cut. The remaining letters are Inter 600 with a slightly squared roundness, tracking -2%, optically spaced. The wordmark should feel precise and quiet — a precision instrument, not a tech startup and not a playful app.

Deliver bone on obsidian, obsidian on bone, and one-color versions. No gradients, no effects, no tagline in the main wordmark. Minimum width 96 px. The wordmark must still read clearly at 24 px tall.
```

---

## 7. Negative prompt

Add this to the **icon** run only. Do not use it for the identity board, which needs typography. For Midjourney, put it after `--no`; for other models, paste it as a final "avoid" paragraph.

```text
magnifying glass, magnifier handle, search icon, globe, eye, camera iris, power button, record button, loading spinner, letter C, generic UI glyph, sparkle, AI star, neural network, chat bubble, browser window, cursor arrow, keyboard key, Google colors, blue-purple gradient, SaaS gradient, glassmorphism, frosted glass, translucent blob, 3D bevel, chrome, metallic, gold, neon glow, drop shadow, lens flare, rainbow, gradient mesh, thin hairlines, tiny details, text, letters, wordmark, watermark, signature, mockup, phone, multiple logo options, grid of logos, busy background, stock vector, clipart
```

---

## 8. Model notes and quick variants

### Midjourney short version

Long prompts get truncated. Use this:

```text
app icon, letter Q as a precision camera lens, one continuous bone-white ring with an 18-degree aperture gap at 10:30, a 45-degree beam tail at 4:30 crossing the ring, one mint dot just above-left of center, deep obsidian squircle tile, matte enamel, Swiss modernist, Apple icon craft, flat vector, three colors only, centered, 1:1 --ar 1:1 --style raw --no text, magnifying glass, search icon, 3D, gradient, mockup
```

### Model behavior

- **GPT Image / Nano Banana:** follow the full prompt; if the model adds a wordmark or captions, say "icon only, remove all text" and rerun.
- **Midjourney:** use the short version, `--ar 1:1 --style raw`, and the negative prompt after `--no`. Generate 4, pick the cleanest silhouette.
- **Ideogram:** best for the wordmark; quote "QLens" and check the spelling letter by letter. It is weaker at precise geometric icons.
- **Vector models (Claude / GPT / Gemini):** use §5. Ask for files, then run `preview.html` and inspect at 16 px before accepting.

### Colorway swaps

Keep the geometry identical; change only these three values in the main prompt.

| Name | Field | Mark | Accent | When to use |
|---|---|---|---|---|
| **Obsidian Mint** (recommended) | `#0A0D12` | `#F5F2EA` | `#4FE0B0` | primary; most distinctive in the search category |
| **Porcelain Iris** | `#F5F2EA` | `#0A0D12` | `#5B4BE0` | light editorial surfaces; closest to the current UI |
| **Carbon Solar** | `#121212` | `#F2EDE3` | `#FFB35C` | warmer and bolder; closest to Brave's territory, so less differentiated |
| **Monochrome** | `#0A0D12` | `#F5F2EA` | none | print, embossing, luxury applications |

**Recommendation:** ship **Obsidian Mint**. It is the only one that owns a color in this category, and the mint dot becomes the brand's signature at 16 px. Keep Porcelain Iris as a light-surface variant for the options page and store screenshots.

---

## 9. QA gate

Do not ship until all of these are true.

- [ ] **16 px test:** at actual size on a light and a dark Chrome toolbar, the Q reads instantly and the dot is a point, not a smudge.
- [ ] **Squint test:** blur the icon by 8 px; the silhouette is Q, not C, a power button, a record button, or a magnifying glass.
- [ ] **One-color test:** pure black on white and pure white on black; no detail is lost.
- [ ] **Row test:** place it next to Google, Brave, Bing, and DuckDuckGo favicons at 16 px. QLens must be the most distinctive, not the loudest.
- [ ] **Contrast test:** bone/obsidian ≥ 7:1; mint/obsidian ≥ 4.5:1; Pine/bone ≥ 4.5:1 for small text.
- [ ] **Print test:** a 10 mm one-color stamp is legible.
- [ ] **Motion test:** the open animation completes in 200 ms; reduced-motion disables it.
- [ ] **Legal/identity test:** no resemblance to Google Lens's camera glyph, Google's four-color palette, or a generic camera aperture.
- [ ] **Wordmark test:** exact spelling "QLens"; the Q tail does not collide with the "L"; the lockup is balanced at 96 px wide.
- [ ] **File test:** SVG + 16/32/48/128 PNG + mono + both lockups; no external references; no console errors in preview.html.

---

## 10. Shipping notes for QLens

- **Icon files:** replace `src/icons/icon16.png`, `icon32.png`, `icon48.png`, and `icon128.png`. `manifest.json` and `action.default_icon` already point at these paths — no manifest change is needed. Move the editable master to `src/brand/icon.svg`; keep `src/icons/icon.svg` as a copy only if an existing path expects it.
- **Popup:** `src/popup/popup.html` currently uses `<span class="pop-logo">`, styled as a CSS gradient square in `popup.css`. Replace it with an inline SVG of the new mark (or a `background-image` pointing at `src/brand/icon-mono.svg`). At 18 px, use the small/mono variant, not the full detailed icon.
- **Options page:** `src/options/options.html` already has the right instinct — `.mark-ring` with a `.mark-dot` and the `LENS 01` labels. Replace the generic glass square with the actual mark at 64 px, and keep the "LENS 01" meta as a secondary instrument detail. The page's "Calibrate your lens" headline now has a real brand to belong to.
- **Default accent:** the UI currently defaults to indigo `#6366F1` (`overlay.js`, `options.css`, `popup.css`). If you adopt Signal Mint as the brand accent, make that a **separate, deliberate change**: update the default accent, keep the six user-selectable accents, and use Pine `#076B52` for light-theme text/focus. Do not smuggle a theme change into the logo PR.
- **Icon generator:** `tools/generate-icons.ps1` currently draws the old magnifier with System.Drawing. Replace its drawing routine with the new geometry, or rasterize the SVGs with a dependency-free path. Keep the 16/32/48/128 outputs and the zero-dependency rule.
- **Store listing:** use the 128 px icon, the tagline **"The web, in focus."**, and screenshots that show the glass overlay against the matte instrument icon. The contrast between the two is the brand story.
- **README:** add the new tagline and the one-sentence product line. Keep the existing feature table; the logo does not change the product.
- **No new fonts:** Inter is already bundled. The wordmark uses Inter 600/700 plus a custom Q outline. Adding a display font would violate the zero-dependency, no-remote-code constraints.
- **Legal hygiene:** QLens integrates with Google Lens, but the brand must not look like Google Lens. Avoid the camera glyph, Google's four colors, and any lens mark that reads as a camera aperture.

---

## The one-paragraph version

QLens is a fast, private, ephemeral search instrument. Its logo should be the instrument, not the glass: a bone Q drawn as a precision lens on an obsidian squircle, with an open aperture at 10:30, a 45° beam tail at 4:30, and one mint dot for the query. Three colors, one idea, zero ornament. It reads as Q at 16 px and as a crafted optical object at 128 px — and it looks like nothing else in a row of search extensions.
