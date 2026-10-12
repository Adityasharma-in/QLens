globalThis.QLENS = globalThis.QLENS || {};

const INTER_FAMILY = 'QLens Inter';

const FONT_FACE = [400, 500, 600, 700]
  .map((w) =>
    "@font-face{font-family:'" + INTER_FAMILY + "';font-style:normal;font-weight:" + w +
      ";font-display:swap;src:url('" +
      chrome.runtime.getURL('src/fonts/inter-latin-' + w + '-normal.woff2') +
      "') format('woff2');}"
  )
  .join('\n');

const NOISE_SVG = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

const CSS = `
${FONT_FACE}
:host {
  all: initial;
  --ql-accent: #6366F1;
  --ql-accent-rgb: 99, 102, 241;
  --ql-accent-ink: #ffffff;
  --ql-caret: var(--ql-accent);
  --ql-text: #e8edf7;
  --ql-text-dim: rgba(214, 224, 243, .64);
  --ql-text-faint: rgba(214, 224, 243, .62);
  --ql-hairline: rgba(255, 255, 255, .1);
  --ql-glass-tint: rgba(11, 15, 26, .55);
  --ql-glass-blur: 26px;
  --ql-liner: rgba(255, 255, 255, .045);
  --ql-liner-hover: rgba(255, 255, 255, .08);
  --ql-glass-border: rgba(255, 255, 255, .14);
  --ql-specular: rgba(255, 255, 255, .55);
  --ql-badge-bg: rgba(255, 255, 255, .16);
  --ql-badge-border: rgba(255, 255, 255, .22);
  --ql-backdrop-bg: rgba(4, 6, 12, .46);
  --ql-backdrop-blur: 22px;
  --ql-card-shadow: 0 30px 90px -24px rgba(0, 0, 0, .55), 0 8px 24px -8px rgba(0, 0, 0, .4);
  --ql-aurora-alpha: .5;
  --ql-aurora-3: #2c3a66;
  --ql-shine: rgba(255, 255, 255, .3);
  --ql-noise-opacity: .5;
  --ql-card-w: 640px;
  --ql-input-h: 48px;
  --ql-row-h: 44px;
  --ql-font-input: 16px;
  --ql-font-pill: 12px;
  --ql-font-row: 14px;
  --ql-font-sub: 11px;
  --ql-font-foot: 11px;
  --ql-space-2: 8px;
  --ql-space-3: 12px;
  --ql-space-4: 16px;
  --ql-space-5: 20px;
  --ql-radius-sm: 6px;
  --ql-radius-md: 10px;
  --ql-radius-lg: 14px;
  --ql-radius-input: 16px;
  --ql-radius-card: 20px;
  --ql-radius-img: 10px;
  --ql-radius-full: 999px;
  --ql-dur-fast: 140ms;
  --ql-dur-med: 240ms;
  --ql-ease-out: cubic-bezier(.22, 1, .36, 1);
  --ql-ease-spring: cubic-bezier(.34, 1.56, .64, 1);
  --ql-ease-gentle: cubic-bezier(.45, .05, .2, 1);
  position: fixed;
  inset: 0;
  z-index: 2147483647;
  font-family: 'QLens Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
  font-size: 15px;
  line-height: 1.4;
  color: var(--ql-text);
  text-align: left;
  letter-spacing: normal;
}

:host([data-theme="light"]) {
  --ql-caret: #4f46e5;
  --ql-text: #141824;
  --ql-text-dim: rgba(23, 28, 45, .64);
  --ql-text-faint: rgba(23, 28, 45, .62);
  --ql-hairline: rgba(13, 17, 28, .09);
  --ql-glass-tint: rgba(255, 255, 255, .62);
  --ql-glass-blur: 22px;
  --ql-liner: rgba(13, 17, 28, .045);
  --ql-liner-hover: rgba(13, 17, 28, .08);
  --ql-glass-border: rgba(255, 255, 255, .85);
  --ql-specular: rgba(255, 255, 255, .9);
  --ql-badge-bg: rgba(255, 255, 255, .9);
  --ql-badge-border: rgba(13, 17, 28, .08);
  --ql-backdrop-bg: rgba(28, 33, 52, .18);
  --ql-backdrop-blur: 16px;
  --ql-card-shadow: 0 28px 70px -28px rgba(23, 28, 50, .35), 0 6px 20px -8px rgba(23, 28, 50, .18);
  --ql-aurora-alpha: .34;
  --ql-aurora-3: #dbe3ff;
  --ql-shine: rgba(15, 20, 35, .14);
  --ql-noise-opacity: .35;
}

@media (prefers-color-scheme: light) {
  :host {
    --ql-caret: #4f46e5;
    --ql-text: #141824;
    --ql-text-dim: rgba(23, 28, 45, .64);
    --ql-text-faint: rgba(23, 28, 45, .62);
    --ql-hairline: rgba(13, 17, 28, .09);
    --ql-glass-tint: rgba(255, 255, 255, .62);
    --ql-glass-blur: 22px;
    --ql-liner: rgba(13, 17, 28, .045);
    --ql-liner-hover: rgba(13, 17, 28, .08);
    --ql-glass-border: rgba(255, 255, 255, .85);
    --ql-specular: rgba(255, 255, 255, .9);
    --ql-badge-bg: rgba(255, 255, 255, .9);
    --ql-badge-border: rgba(13, 17, 28, .08);
    --ql-backdrop-bg: rgba(28, 33, 52, .18);
    --ql-backdrop-blur: 16px;
    --ql-card-shadow: 0 28px 70px -28px rgba(23, 28, 50, .35), 0 6px 20px -8px rgba(23, 28, 50, .18);
    --ql-aurora-alpha: .34;
    --ql-aurora-3: #dbe3ff;
    --ql-shine: rgba(15, 20, 35, .14);
    --ql-noise-opacity: .35;
  }
}

.ql-backdrop {
  position: absolute;
  inset: 0;
  z-index: 1;
  background: var(--ql-backdrop-bg);
  backdrop-filter: blur(12px) saturate(1.1);
  -webkit-backdrop-filter: blur(12px) saturate(1.1);
  animation: ql-backdrop-in 80ms var(--ql-ease-out) both;
}

.ql-backdrop.ql-out {
  animation: ql-backdrop-out 90ms var(--ql-ease-out) forwards;
}

@keyframes ql-backdrop-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes ql-backdrop-out {
  from {
    opacity: 1;
  }
  to {
    opacity: 0;
  }
}

/* ---------- viewport inner shadow — reference: inner-shadow-search.html ---------- */
/* Appears only when search overlay is called. Fixed inset frame, inset shadows on edges. */
/* Pointer-events none so search bar, pills, suggestions stay fully interactive. */
.ql-viewport-frame {
  position: absolute;
  inset: 0;
  z-index: 2;
  pointer-events: none;
  border-radius: 0;
  border: 1px solid rgba(255,255,255, 0.30);
  box-shadow: inset 0px 0px 84px -6px rgba(173, 122, 255, 0.440), inset 0 0 160px 4px rgba(76, 29, 149, 0.460), inset 0 1px 0 rgba(255,255,255,0.06);
  opacity: 0;
  animation: ql-frame-in 120ms ease-out both;
}
.ql-viewport-frame.ql-out {
  animation: ql-frame-out 80ms ease forwards;
}
@keyframes ql-frame-in {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes ql-frame-out {
  from { opacity: 1; }
  to { opacity: 0; }
}
.ql-viewport-frame::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  padding: 1px;
  background: linear-gradient(180deg, rgba(255,255,255,0.10), rgba(255,255,255,0.02));
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
          mask-composite: exclude;
  pointer-events: none;
  opacity: 0.9;
}

/* ---------- the glass prism ---------- */
.ql-panel {
  position: absolute;
  top: 50%;
  left: 50%;
  width: var(--ql-card-w);
  max-width: calc(100vw - 32px);
  z-index: 3;
  transform: translate(-50%, -50%);
  border-radius: var(--ql-radius-card);
  border: 1px solid var(--ql-glass-border);
  box-shadow: var(--ql-card-shadow), inset 0 1px 0 var(--ql-specular);
  overflow: hidden;
  isolation: isolate;
  transform-origin: 50% 60%;
  animation: ql-panel-in 90ms var(--ql-ease-out) both;
}

.ql-panel.ql-out {
  animation: ql-panel-out 90ms ease forwards;
}

@keyframes ql-panel-in {
  from { opacity: 0; transform: translate(-50%, -50%) scale(.985); }
  to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
}

@keyframes ql-panel-out {
  from { opacity: 1; transform: translate(-50%, -50%) scale(1); }
  to { opacity: 0; transform: translate(-50%, -50%) scale(.98); }
}

.ql-panel::before {
  content: '';
  position: absolute;
  top: 0;
  left: 8px;
  right: 8px;
  height: 1px;
  z-index: 5;
  border-radius: 2px;
  background: linear-gradient(90deg, transparent, var(--ql-specular), transparent);
}

.ql-panel::after {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 6;
  pointer-events: none;
  opacity: var(--ql-noise-opacity);
  mix-blend-mode: soft-light;
  background-image: ${NOISE_SVG};
}

/* Aurora bloom is static (no infinite drift) so the frosted card keeps its
   mockup depth without forcing the page to repaint every frame. */
.ql-aurora {
  position: absolute;
  inset: 0;
  z-index: 0;
  overflow: hidden;
  pointer-events: none;
}

.ql-orb {
  position: absolute;
  border-radius: 50%;
  pointer-events: none;
}

.ql-orb-a {
  top: -110px;
  left: 50%;
  width: 560px;
  height: 280px;
  margin-left: -280px;
  background: rgb(var(--ql-accent-rgb));
  opacity: calc(var(--ql-aurora-alpha) * .28);
  filter: blur(72px);
  transition: background-color .5s;
}

.ql-orb-b {
  top: 38%;
  right: -90px;
  width: 300px;
  height: 300px;
  background: rgba(var(--ql-accent-rgb), .5);
  opacity: calc(var(--ql-aurora-alpha) * .22);
  filter: blur(64px);
  transition: background-color .5s;
}

.ql-orb-c {
  bottom: -150px;
  left: -110px;
  width: 400px;
  height: 400px;
  background: var(--ql-aurora-3);
  opacity: .28;
  filter: blur(70px);
}

:host([data-vs="on"]) .ql-orb-a {
  filter: blur(36px);
}

:host([data-vs="on"]) .ql-orb-b {
  filter: blur(32px);
}

:host([data-vs="on"]) .ql-orb-c {
  filter: blur(35px);
}

.ql-tint {
  position: absolute;
  inset: 0;
  z-index: 1;
  background: var(--ql-glass-tint);
  backdrop-filter: blur(var(--ql-glass-blur)) saturate(1.2);
  -webkit-backdrop-filter: blur(var(--ql-glass-blur)) saturate(1.2);
}

.ql-content {
  position: relative;
  z-index: 2;
  padding: var(--ql-space-4);
}

.ql-glow {
  position: absolute;
  top: -26px;
  left: 50%;
  width: 440px;
  height: 130px;
  margin-left: -220px;
  background: radial-gradient(closest-side, rgba(var(--ql-accent-rgb), .6), transparent 72%);
  filter: blur(28px);
  pointer-events: none;
  opacity: .14;
  transform: scale(.9);
  transition: opacity .5s var(--ql-ease-out), transform .5s var(--ql-ease-spring);
}

.ql-content:has(.ql-input-row:focus-within) .ql-glow {
  opacity: .62;
  transform: scale(1);
}

/* ---------- input row — deep obsidian + visible accent ---------- */
.ql-input-row {
  position: relative;
  display: flex;
  align-items: center;
  gap: var(--ql-space-3);
  height: var(--ql-input-h);
  padding: 0 var(--ql-space-2) 0 var(--ql-space-5);
  border-radius: var(--ql-radius-input);
  background:
    linear-gradient(180deg, rgba(var(--ql-accent-rgb), .17), rgba(var(--ql-accent-rgb), .05) 30%, transparent 58%),
    linear-gradient(135deg, #0a0c15 0%, #06070d 52%, #0c101c 100%);
  border: 1px solid rgba(var(--ql-accent-rgb), .34);
  box-shadow: 0 0 0 1px rgba(0, 0, 0, .55), 0 10px 30px -12px rgba(0, 0, 0, .85), 0 0 28px -10px rgba(var(--ql-accent-rgb), .5), inset 0 1px 0 rgba(255, 255, 255, .13), inset 0 -1px 0 rgba(var(--ql-accent-rgb), .16);
  isolation: isolate;
  transition: box-shadow var(--ql-dur-fast) var(--ql-ease-out), background var(--ql-dur-fast), border-color var(--ql-dur-fast);
  animation: ql-rise-in .18s var(--ql-ease-out) 20ms backwards;
}

.ql-input-row::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background-image: ${NOISE_SVG};
  opacity: .09;
  pointer-events: none;
  z-index: 0;
}

.ql-input-row > *:not(.ql-caret) {
  position: relative;
  z-index: 1;
}

.ql-input-row:focus-within {
  border-color: rgba(var(--ql-accent-rgb), .72);
  background:
    linear-gradient(180deg, rgba(var(--ql-accent-rgb), .22), rgba(var(--ql-accent-rgb), .06) 32%, transparent 60%),
    linear-gradient(135deg, #101322 0%, #080a12 55%, #111527 100%);
  box-shadow: 0 0 0 1px rgba(var(--ql-accent-rgb), .35), 0 0 0 4px rgba(var(--ql-accent-rgb), .22), 0 14px 44px -12px rgba(var(--ql-accent-rgb), .65), 0 8px 24px -8px rgba(0, 0, 0, .7), inset 0 1px 0 rgba(255, 255, 255, .16), inset 0 -1px 0 rgba(var(--ql-accent-rgb), .28);
}

.ql-input-row::after {
  content: '';
  position: absolute;
  top: 0;
  left: 14px;
  right: 14px;
  height: 1px;
  border-radius: 2px;
  background: linear-gradient(90deg, transparent, rgba(var(--ql-accent-rgb), .75), transparent);
  opacity: .8;
  pointer-events: none;
  z-index: 2;
}

.ql-input-row:focus-within::after {
  opacity: 1;
  background: linear-gradient(90deg, transparent, rgb(var(--ql-accent-rgb)), transparent);
  box-shadow: 0 0 12px rgba(var(--ql-accent-rgb), .8);
}

:host([data-theme="light"]) .ql-input-row {
  background:
    linear-gradient(180deg, rgba(var(--ql-accent-rgb), .14), rgba(var(--ql-accent-rgb), .04) 34%, transparent 62%),
    linear-gradient(135deg, #f4f6fc 0%, #e4e9f5 55%, #d3daec 100%);
  border-color: rgba(var(--ql-accent-rgb), .42);
  box-shadow: 0 4px 14px rgba(23, 28, 50, .14), 0 0 22px -10px rgba(var(--ql-accent-rgb), .55), inset 0 1px 0 rgba(255, 255, 255, .9), inset 0 -1px 0 rgba(var(--ql-accent-rgb), .14);
}

:host([data-theme="light"]) .ql-input-row::before {
  opacity: .06;
}

:host([data-theme="light"]) .ql-input-row:focus-within {
  background:
    linear-gradient(180deg, rgba(var(--ql-accent-rgb), .18), rgba(var(--ql-accent-rgb), .05) 34%, transparent 62%),
    linear-gradient(135deg, #ffffff 0%, #e6ebf8 55%, #d5dcef 100%);
  border-color: rgba(var(--ql-accent-rgb), .68);
  box-shadow: 0 0 0 1px rgba(var(--ql-accent-rgb), .3), 0 0 0 4px rgba(var(--ql-accent-rgb), .18), 0 12px 32px -14px rgba(var(--ql-accent-rgb), .6), inset 0 1px 0 rgba(255, 255, 255, .9), inset 0 -1px 0 rgba(var(--ql-accent-rgb), .22);
}

@media (prefers-color-scheme: light) {
  :host:not([data-theme="dark"]) .ql-input-row {
    background:
      linear-gradient(180deg, rgba(var(--ql-accent-rgb), .14), rgba(var(--ql-accent-rgb), .04) 34%, transparent 62%),
      linear-gradient(135deg, #f4f6fc 0%, #e4e9f5 55%, #d3daec 100%);
    border-color: rgba(var(--ql-accent-rgb), .42);
    box-shadow: 0 4px 14px rgba(23, 28, 50, .14), 0 0 22px -10px rgba(var(--ql-accent-rgb), .55), inset 0 1px 0 rgba(255, 255, 255, .9), inset 0 -1px 0 rgba(var(--ql-accent-rgb), .14);
  }
  :host:not([data-theme="dark"]) .ql-input-row::before {
    opacity: .06;
  }
  :host:not([data-theme="dark"]) .ql-input-row:focus-within {
    background:
      linear-gradient(180deg, rgba(var(--ql-accent-rgb), .18), rgba(var(--ql-accent-rgb), .05) 34%, transparent 62%),
      linear-gradient(135deg, #ffffff 0%, #e6ebf8 55%, #d5dcef 100%);
    border-color: rgba(var(--ql-accent-rgb), .68);
    box-shadow: 0 0 0 1px rgba(var(--ql-accent-rgb), .3), 0 0 0 4px rgba(var(--ql-accent-rgb), .18), 0 12px 32px -14px rgba(var(--ql-accent-rgb), .6), inset 0 1px 0 rgba(255, 255, 255, .9), inset 0 -1px 0 rgba(var(--ql-accent-rgb), .22);
  }
}

.ql-icon {
  display: inline-flex;
  flex: none;
  color: inherit;
}

.ql-icon svg {
  display: block;
}

.ql-ic-search {
  color: var(--ql-accent);
  opacity: .85;
  filter: drop-shadow(0 0 6px rgba(var(--ql-accent-rgb), .55));
  transition: color var(--ql-dur-fast), opacity var(--ql-dur-fast), filter var(--ql-dur-fast);
}

.ql-input-row:focus-within .ql-ic-search {
  color: var(--ql-accent);
  opacity: 1;
  filter: drop-shadow(0 0 10px rgba(var(--ql-accent-rgb), .9));
}

.ql-input {
  flex: 1;
  min-width: 0;
  height: 100%;
  padding: 0;
  border: 0;
  outline: none;
  background: transparent;
  color: var(--ql-text);
  font: 600 var(--ql-font-input)/1 'QLens Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
  letter-spacing: -.012em;
  caret-color: var(--ql-caret);
  cursor: text;
}

:host([data-fonts="ready"]) .ql-input {
  caret-color: transparent;
}

.ql-input::placeholder {
  color: var(--ql-text-faint);
  font-weight: 400;
  opacity: 1;
}

.ql-input::selection {
  background: rgba(var(--ql-accent-rgb), .32);
}

.ql-caret {
  position: absolute;
  top: 50%;
  left: 50px;
  width: 4px;
  height: 24px;
  border-radius: 3px;
  background: linear-gradient(180deg, color-mix(in srgb, var(--ql-accent) 72%, #fff 28%), var(--ql-accent));
  box-shadow: 0 0 12px rgba(var(--ql-accent-rgb), .85), 0 0 3px rgba(var(--ql-accent-rgb), .9);
  transform: translate(-50%, -50%);
  opacity: 1;
  pointer-events: none;
  z-index: 1;
}

.ql-caret.is-hidden {
  opacity: 0;
}

.ql-chip-zone {
  display: flex;
  align-items: center;
  flex: none;
}

.ql-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  max-width: 200px;
  height: 26px;
  padding: 0 10px;
  border-radius: var(--ql-radius-full);
  border: 1px solid rgba(var(--ql-accent-rgb), .35);
  background: rgba(var(--ql-accent-rgb), .12);
  color: var(--ql-text);
  font: 600 11px 'QLens Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
  cursor: pointer;
  animation: ql-chip-in .22s var(--ql-ease-spring) backwards;
  transition: background var(--ql-dur-fast);
}

@keyframes ql-chip-in {
  from { opacity: 0; transform: scale(.85); }
}

.ql-chip:hover {
  background: rgba(var(--ql-accent-rgb), .2);
}

.ql-chip:focus-visible {
  outline: 2px solid var(--ql-accent);
  outline-offset: 2px;
}

.ql-chip .ql-icon {
  color: var(--ql-accent);
}

.ql-chip span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ql-img-btn {
  flex: none;
  width: 28px;
  height: 28px;
  border-radius: var(--ql-radius-sm);
  border: 1px solid var(--ql-hairline);
  background: var(--ql-liner);
  color: var(--ql-text-dim);
  display: grid;
  place-items: center;
  cursor: pointer;
  transition: background var(--ql-dur-fast), color var(--ql-dur-fast), transform var(--ql-dur-fast) var(--ql-ease-spring);
}

.ql-img-btn:hover {
  background: var(--ql-liner-hover);
  color: var(--ql-text);
}

.ql-img-btn:active {
  transform: scale(.92);
}

.ql-img-btn:focus-visible {
  outline: 2px solid var(--ql-accent);
  outline-offset: 2px;
}

.ql-img-btn .ql-icon {
  color: var(--ql-text-faint);
}

.ql-img-btn:hover .ql-icon {
  color: var(--ql-accent);
}

.ql-img-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 30px;
  padding: 2px 8px 2px 3px;
  border-radius: var(--ql-radius-img);
  border: 1px solid rgba(var(--ql-accent-rgb), .35);
  background: rgba(var(--ql-accent-rgb), .1);
  color: var(--ql-text);
  cursor: pointer;
  transition: background var(--ql-dur-fast), border-color var(--ql-dur-fast);
}

.ql-img-chip:hover {
  background: rgba(var(--ql-accent-rgb), .18);
}

.ql-img-chip:focus-visible {
  outline: 2px solid var(--ql-accent);
  outline-offset: 2px;
}

.ql-img-thumb {
  width: 24px;
  height: 24px;
  border-radius: 6px;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  flex: none;
}

.ql-img-x {
  flex: none;
  font-size: 13px;
  line-height: 1;
  color: var(--ql-text-faint);
  display: grid;
  place-items: center;
}

.ql-img-chip.ql-uploading {
  opacity: .72;
  pointer-events: none;
}
.ql-img-chip.ql-uploading .ql-img-thumb {
  animation: ql-thumb-pulse 1.2s ease-in-out infinite alternate;
}
@keyframes ql-thumb-pulse {
  from { opacity: .65; transform: scale(.96); }
  to { opacity: 1; transform: scale(1); }
}
.ql-input-row.ql-drag-over {
  border-color: rgba(var(--ql-accent-rgb), .55);
  background: rgba(var(--ql-accent-rgb), .10);
  box-shadow: 0 0 0 3px rgba(var(--ql-accent-rgb), .18), 0 10px 30px -14px rgba(var(--ql-accent-rgb), .4);
}
.ql-panel.ql-drag-active {
  outline: 2px dashed rgba(var(--ql-accent-rgb), .45);
  outline-offset: -2px;
}
.ql-drop-hint {
  position: absolute;
  inset: 0;
  z-index: 8;
  display: grid;
  place-items: center;
  background: rgba(var(--ql-accent-rgb), .08);
  backdrop-filter: blur(2px);
  border-radius: var(--ql-radius-card);
  color: var(--ql-accent);
  font: 700 12px 'QLens Inter', system-ui, sans-serif;
  letter-spacing: .02em;
  pointer-events: none;
  opacity: 0;
  transition: opacity var(--ql-dur-fast) var(--ql-ease-out);
}
.ql-drop-hint.is-visible { opacity: 1; }
.ql-spinner {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(var(--ql-accent-rgb), .18);
  border-top-color: var(--ql-accent);
  border-radius: 50%;
  animation: ql-spin .65s linear infinite;
  flex: none;
}
@keyframes ql-spin { to { transform: rotate(360deg); } }
.ql-img-chip .ql-spinner { margin-left: 1px; }

.ql-err {
  position: absolute;
  top: 12px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 7;
  max-width: 80%;
  padding: 6px 12px;
  border-radius: 8px;
  background: rgba(244, 63, 94, .16);
  border: 1px solid rgba(244, 63, 94, .4);
  color: var(--ql-text);
  font-size: 11.5px;
  font-weight: 500;
  opacity: 0;
  pointer-events: none;
  transition: opacity var(--ql-dur-fast) var(--ql-ease-out);
}

.ql-err.is-open {
  opacity: 1;
}

.ql-close {
  flex: none;
  width: 28px;
  height: 28px;
  border-radius: var(--ql-radius-sm);
  border: 0;
  background: transparent;
  color: var(--ql-text-dim);
  display: grid;
  place-items: center;
  cursor: pointer;
  transition: background var(--ql-dur-fast), color var(--ql-dur-fast), transform var(--ql-dur-fast) var(--ql-ease-spring);
}

.ql-close:hover {
  background: var(--ql-liner-hover);
  color: var(--ql-text);
}

.ql-close:active {
  transform: scale(.9);
}

.ql-close:focus-visible {
  outline: 2px solid var(--ql-accent);
  outline-offset: 2px;
}

/* ---------- engine pills + light rail ---------- */
.ql-pill-zone {
  position: relative;
  padding: var(--ql-space-2) 0 var(--ql-space-3);
  animation: ql-rise-in .2s var(--ql-ease-out) 40ms backwards;
}

.ql-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.ql-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 28px;
  padding: 0 12px 0 9px;
  border-radius: var(--ql-radius-full);
  border: 1px solid var(--ql-hairline);
  background: var(--ql-liner);
  color: var(--ql-text-dim);
  font: 600 var(--ql-font-pill)/1 'QLens Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
  letter-spacing: .01em;
  cursor: pointer;
  transition: background var(--ql-dur-fast), color var(--ql-dur-fast), border-color var(--ql-dur-fast), transform var(--ql-dur-fast) var(--ql-ease-spring), box-shadow var(--ql-dur-fast);
}

.ql-pill:hover {
  background: var(--ql-liner-hover);
  color: var(--ql-text);
  transform: translateY(-1px);
}

.ql-pill:active {
  transform: scale(.96);
}

.ql-pill:focus-visible {
  outline: 2px solid var(--ql-accent);
  outline-offset: 2px;
}

.ql-pill.is-active {
  background: linear-gradient(180deg, color-mix(in srgb, var(--ql-accent) 78%, #fff 22%), var(--ql-accent) 55%, color-mix(in srgb, var(--ql-accent) 82%, #000 18%));
  color: var(--ql-accent-ink);
  font-weight: 700;
  border-color: rgba(255, 255, 255, .22);
  box-shadow: 0 0 0 1px rgba(var(--ql-accent-rgb), .5), 0 8px 22px -8px rgba(var(--ql-accent-rgb), .8), 0 2px 8px rgba(0, 0, 0, .35), inset 0 1px 0 rgba(255, 255, 255, .35), inset 0 -1px 0 rgba(0, 0, 0, .22);
  text-shadow: 0 1px 2px rgba(0, 0, 0, .25);
  animation: ql-pill-pop .28s var(--ql-ease-spring);
}

@keyframes ql-pill-pop {
  0% { transform: scale(1); }
  35% { transform: scale(1.07); }
  100% { transform: scale(1); }
}

.ql-pill-badge {
  width: 16px;
  height: 16px;
  border-radius: 4px;
  display: grid;
  place-items: center;
  background: var(--ql-badge-bg);
  border: 1px solid var(--ql-badge-border);
}

.ql-pill-badge .ql-icon,
.ql-pill-badge svg {
  width: 14px;
  height: 14px;
}

.ql-pill.is-active .ql-pill-badge {
  animation: ql-badge-pop .3s var(--ql-ease-spring) 20ms;
}

@keyframes ql-badge-pop {
  0% { transform: rotate(0) scale(1); }
  40% { transform: rotate(-10deg) scale(1.18); }
  70% { transform: rotate(6deg) scale(1); }
  100% { transform: rotate(0) scale(1); }
}

/* ---------- AI Mode switch ---------- */
.ql-pill-ai {
  display: inline-flex;
  flex: none;
  align-items: center;
  gap: 6px;
  height: 26px;
  padding: 0 11px 0 9px;
  border-radius: var(--ql-radius-full);
  border: 1px dashed var(--ql-hairline);
  background: transparent;
  color: var(--ql-text-faint);
  font: 600 var(--ql-font-sub)/1 'QLens Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
  letter-spacing: .02em;
  cursor: pointer;
  transition: background var(--ql-dur-fast), color var(--ql-dur-fast), border-color var(--ql-dur-fast), transform var(--ql-dur-fast) var(--ql-ease-spring), box-shadow var(--ql-dur-fast);
}

.ql-pill-ai:hover {
  background: var(--ql-liner-hover);
  color: var(--ql-text);
}

.ql-pill-ai:active {
  transform: scale(.96);
}

.ql-pill-ai:focus-visible {
  outline: 2px solid var(--ql-accent);
  outline-offset: 2px;
}

.ql-pill-ai .ql-icon {
  color: var(--ql-accent);
}

.ql-pill-ai.is-active {
  background: linear-gradient(180deg, color-mix(in srgb, var(--ql-accent) 78%, #fff 22%), var(--ql-accent) 55%, color-mix(in srgb, var(--ql-accent) 82%, #000 18%));
  color: var(--ql-accent-ink);
  border-color: rgba(255, 255, 255, .22);
  border-style: solid;
  box-shadow: 0 0 0 1px rgba(var(--ql-accent-rgb), .5), 0 8px 22px -8px rgba(var(--ql-accent-rgb), .8), 0 2px 8px rgba(0, 0, 0, .35), inset 0 1px 0 rgba(255, 255, 255, .35), inset 0 -1px 0 rgba(0, 0, 0, .22);
  text-shadow: 0 1px 2px rgba(0, 0, 0, .25);
  animation: ql-pill-pop .28s var(--ql-ease-spring);
}

/* ---------- smart URL row ---------- */
.ql-smart-zone {
  max-height: 0;
  opacity: 0;
  overflow: hidden;
  margin-top: var(--ql-space-3);
  transition: max-height var(--ql-dur-med) var(--ql-ease-gentle), opacity var(--ql-dur-fast) var(--ql-ease-out);
}

.ql-smart-zone.is-open {
  opacity: 1;
  max-height: 64px;
}

.ql-smarturl {
  position: relative;
  display: flex;
  align-items: center;
  gap: var(--ql-space-3);
  width: 100%;
  height: 52px;
  padding: 0 var(--ql-space-4);
  border-radius: var(--ql-radius-lg);
  border: 1px solid rgba(var(--ql-accent-rgb), .35);
  background: rgba(var(--ql-accent-rgb), .08);
  color: var(--ql-text);
  overflow: hidden;
  cursor: pointer;
  transition: background var(--ql-dur-fast), transform var(--ql-dur-fast) var(--ql-ease-spring);
}

.ql-smarturl:hover {
  background: rgba(var(--ql-accent-rgb), .14);
  transform: translateY(-1px);
}

.ql-smarturl:active {
  transform: scale(.99);
}

.ql-smarturl:focus-visible {
  outline: 2px solid var(--ql-accent);
  outline-offset: 2px;
}

.ql-smarturl .ql-icon {
  color: var(--ql-accent);
}

.ql-smarturl b {
  flex: 1;
  min-width: 0;
  font-size: var(--ql-font-row);
  font-weight: 600;
  letter-spacing: -.01em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ql-smarturl .ql-smart-sub {
  margin-left: auto;
  flex: none;
  font-size: var(--ql-font-sub);
  color: var(--ql-text-faint);
  white-space: nowrap;
}

.ql-smarturl::after {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  width: 40%;
  pointer-events: none;
  animation: ql-shine-sweep .7s var(--ql-ease-out) 80ms both;
}

@keyframes ql-shine-sweep {
  from {
    transform: translateX(-140%) skewX(-18deg);
    background: linear-gradient(90deg, transparent, var(--ql-shine), transparent);
  }
  to {
    transform: translateX(460%) skewX(-18deg);
    background: linear-gradient(90deg, transparent, var(--ql-shine), transparent);
  }
}

/* ---------- suggestions ---------- */
.ql-suggest {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 0;
  opacity: 0;
  overflow-y: auto;
  overflow-x: hidden;
  overscroll-behavior: contain;
  transition: max-height var(--ql-dur-med) var(--ql-ease-gentle), opacity var(--ql-dur-fast) var(--ql-ease-out);
  scrollbar-width: thin;
  scrollbar-color: rgba(var(--ql-accent-rgb), .5) transparent;
}

.ql-suggest.is-open {
  opacity: 1;
}

/* While a keystroke-driven update is in flight the final row count is still
   settling. Animating max-height here makes the panel visibly shrink on every
   new letter and grow again when the response lands, so the height is applied
   instantly while the list is still being replaced. */
.ql-suggest.is-updating {
  transition: opacity var(--ql-dur-fast) var(--ql-ease-out);
}

/* ---------- launcher ---------- */
.ql-launch {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 0;
  opacity: 0;
  overflow-y: auto;
  overflow-x: hidden;
  overscroll-behavior: contain;
  margin-top: var(--ql-space-3);
  transition: max-height var(--ql-dur-med) var(--ql-ease-gentle), opacity var(--ql-dur-fast) var(--ql-ease-out);
  scrollbar-width: thin;
  scrollbar-color: rgba(var(--ql-accent-rgb), .5) transparent;
}

.ql-launch.is-open {
  opacity: 1;
}

.ql-launch.is-updating {
  transition: opacity var(--ql-dur-fast) var(--ql-ease-out);
}

.ql-launch::-webkit-scrollbar {
  width: 6px;
}

.ql-launch::-webkit-scrollbar-thumb {
  background: rgba(var(--ql-accent-rgb), .45);
  border-radius: 3px;
}

.ql-launch::-webkit-scrollbar-track {
  background: transparent;
}

.ql-launch-head {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: .10em;
  text-transform: uppercase;
  color: var(--ql-text-faint);
  padding: 6px 12px 2px;
}

.ql-sug-row.is-launcher {
  cursor: pointer;
}

.ql-launch-icon {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  display: grid;
  place-items: center;
  flex: none;
  background: linear-gradient(135deg, rgba(var(--ql-accent-rgb), .18), rgba(var(--ql-accent-rgb), .06));
  border: 1px solid rgba(var(--ql-accent-rgb), .18);
  color: var(--ql-accent);
}

.ql-launch-url {
  font-size: 11px;
  color: var(--ql-text-faint);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  letter-spacing: -.01em;
}

.ql-suggest::-webkit-scrollbar {
  width: 6px;
}

.ql-suggest::-webkit-scrollbar-thumb {
  background: rgba(var(--ql-accent-rgb), .45);
  border-radius: 3px;
}

.ql-suggest::-webkit-scrollbar-track {
  background: transparent;
}

.ql-sug-row {
  display: flex;
  align-items: center;
  gap: var(--ql-space-3);
  height: var(--ql-row-h);
  flex: none;
  padding: 0 var(--ql-space-5) 0 var(--ql-space-3);
  border-radius: var(--ql-radius-md);
  cursor: pointer;
  transition: background var(--ql-dur-fast);
}

.ql-sug-row:hover,
.ql-sug-row.is-active {
  background: rgba(var(--ql-accent-rgb), .1);
}

.ql-sug-row.is-active {
  box-shadow: inset 2px 0 0 var(--ql-accent);
}

.ql-sug-row:active {
  background: rgba(var(--ql-accent-rgb), .14);
}

.ql-sug-row:focus-visible {
  outline: 2px solid var(--ql-accent);
  outline-offset: -2px;
}

.ql-smarturl .ql-smart-sub,
.ql-launch-url,
.ql-fav-url,
.ql-sug-k {
  text-shadow: 0 1px 2px rgba(0, 0, 0, .35);
}

.ql-sug-k {
  width: 24px;
  flex: none;
  text-align: right;
  font-size: 11px;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  color: var(--ql-text-faint);
}

.ql-sug-txt {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.ql-sug-title {
  font-size: 14px;
  font-weight: 600;
  letter-spacing: -.014em;
  letter-spacing: -.01em;
  color: var(--ql-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ql-sug-arrow {
  flex: none;
  color: var(--ql-accent);
  opacity: 0;
  transform: translate(-3px, 3px);
  transition: opacity var(--ql-dur-fast), transform var(--ql-dur-fast) var(--ql-ease-spring);
}

.ql-sug-row.is-active .ql-sug-arrow {
  opacity: 1;
  transform: none;
}

/* ---------- empty states ---------- */
.ql-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--ql-space-3);
  padding: 28px var(--ql-space-5);
  text-align: center;
  color: var(--ql-text-dim);
  animation: ql-rise-in .3s var(--ql-ease-out) backwards;
}

.ql-empty .ql-icon {
  color: var(--ql-text-faint);
}

.ql-empty b {
  color: var(--ql-text);
  font-size: 14px;
  font-weight: 600;
}

.ql-empty p {
  font-size: 12px;
  max-width: 38ch;
  line-height: 1.5;
}

/* ---------- footer ---------- */
.ql-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--ql-space-3);
  margin-top: var(--ql-space-3);
  padding-top: var(--ql-space-3);
  border-top: 1px solid var(--ql-hairline);
  font-size: var(--ql-font-foot);
  color: var(--ql-text-faint);
  animation: ql-rise-in .2s var(--ql-ease-out) 60ms backwards;
}

.ql-foot-hints {
  display: flex;
  align-items: center;
  gap: 5px;
}

.ql-foot kbd {
  height: 18px;
  min-width: 18px;
  padding: 0 4px;
  display: inline-grid;
  place-items: center;
  border-radius: 4px;
  border: 1px solid var(--ql-hairline);
  border-bottom-width: 2px;
  background: var(--ql-liner);
  font: 600 9.5px 'QLens Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
  color: var(--ql-text-dim);
}

.ql-foot-engine {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
  color: var(--ql-text-dim);
}

.ql-foot-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--ql-accent);
  box-shadow: 0 0 8px rgba(var(--ql-accent-rgb), .9);
}

@keyframes ql-rise-in {
  from { opacity: 0; transform: translateY(10px); }
}

.ql-fav-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 4px 10px;
  margin-bottom: 4px;
  border-bottom: 1px solid var(--ql-hairline);
}
.ql-fav-head span:first-child {
  font-family: 'QLens Inter', monospace;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: .10em;
  text-transform: uppercase;
  color: var(--ql-text-faint);
}
.ql-fav-head span:last-child {
  font-family: 'QLens Inter', monospace;
  font-size: 10px;
  font-weight: 600;
  color: var(--ql-text-faint);
  background: var(--ql-liner);
  border: 1px solid var(--ql-hairline);
  padding: 3px 7px;
  border-radius: 6px;
}
.ql-fav-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  flex: none;
  background: linear-gradient(135deg, rgba(var(--ql-accent-rgb), .18), rgba(var(--ql-accent-rgb), .06));
  border: 1px solid rgba(var(--ql-accent-rgb), .18);
  color: var(--ql-accent);
  font: 800 13px 'QLens Inter', system-ui, sans-serif;
  letter-spacing: -.02em;
}
.ql-fav-shortcut {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 24px;
  padding: 0 8px;
  border-radius: 8px;
  background: var(--ql-liner);
  border: 1px solid var(--ql-hairline);
  color: var(--ql-text-dim);
  font: 600 11px 'QLens Inter', monospace;
  letter-spacing: .02em;
  white-space: nowrap;
  max-width: 110px;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ql-sug-row.is-active .ql-fav-shortcut {
  background: var(--ql-accent);
  border-color: var(--ql-accent);
  color: var(--ql-accent-ink);
}
.ql-fav-url {
  font-family: 'QLens Inter', monospace;
  font-size: 11px;
  color: var(--ql-text-faint);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  letter-spacing: -.01em;
}
.ql-fav-empty {
  padding: 18px 14px;
  text-align: center;
  color: var(--ql-text-dim);
  font-size: 12.5px;
  line-height: 1.5;
}
.ql-fav-empty b { color: var(--ql-text); font-size: 13px; display:block; margin-bottom:4px; }
.ql-fav-empty a { color: var(--ql-accent); text-decoration: none; border-bottom: 1px dashed rgba(var(--ql-accent-rgb), .4); }

.ql-hidden {
  display: none !important;
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: .01ms !important;
    animation-delay: 0ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: .01ms !important;
  }
  .ql-orb {
    animation: none !important;
  }
  .ql-panel,
  .ql-backdrop,
  .ql-viewport-frame {
    animation-duration: .15s !important;
  }
  .ql-viewport-frame,
  .ql-aurora,
  .ql-glow {
    display: none !important;
  }
}
`;

const ICON_SEARCH = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M16.2 16.2 21 21"/></svg>';
const ICON_CLOSE = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>';
const ICON_SPARK = '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l2.2 6.8L21 12l-6.8 2.2L12 21l-2.2-6.8L3 12l6.8-2.2L12 3z"/></svg>';
const ICON_ARROW = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 17 17 7M9 7h8v8"/></svg>';
const ICON_GLOBE = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z"/></svg>';
const ICON_RETICLE = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="6.5"/><path d="M12 2.5v4M12 17.5v4M2.5 12h4M17.5 12h4"/></svg>';
const ICON_CAMERA = '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 8a2 2 0 0 1 2-2h2l1.2-2h7.6L17 6h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><circle cx="12" cy="12.5" r="3.2"/></svg>';

function iconSvg(markup, cls) {
  const wrap = document.createElement('span');
  wrap.className = 'ql-icon' + (cls ? ' ' + cls : '');
  wrap.setAttribute('aria-hidden', 'true');
  try {
    if (QLENS.setIcon && QLENS.setIcon(wrap, markup)) return wrap;
  } catch (err) {}
  return wrap;
}

function hexToRgb(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || '').trim());
  if (!m) return '99, 102, 241';
  const n = parseInt(m[1], 16);
  return ((n >> 16) & 255) + ', ' + ((n >> 8) & 255) + ', ' + (n & 255);
}

const ACCENT_INKS = {
  emerald: '#052e21',
  rose: '#2b0710',
  amber: '#241603'
};

const Overlay = (() => {
  let host = null;
  let root = null;
  let panel = null;
  let backdropEl = null;
  let viewportFrameEl = null;
  let inputEl = null;
  let chipZoneEl = null;
  let closeBtn = null;
  let pillZone = null;
  let pillsRow = null;
  let smartZone = null;
  let suggestEl = null;
  let launchEl = null;
  let footEngine = null;
  let prevFocusEl = null;
  let settings = null;
  let engineId = null;
  let initialEngineId = null;
  let aiMode = false;
  let engineOrder = [];
  // Set by every explicit engine/AI choice (pill click, key nav, prefix, Tab
  // toggle): hydrate() must not overwrite a user-touched engine with
  // lastEngine when the async settings read resolves after the user acted.
  let userTouchedEngine = false;
  let suggestionTimer = null;
  let aiPillEl = null;
  let suggestionReqId = 0;
  let launcherReqId = 0;
  const suggestCache = new Map();
  let lastSuggestKey = '';
  let lastSuggestResults = [];
  /* Live row nodes keyed by their submit text, so a keystroke reuses the rows
     it can keep instead of tearing the whole list down and rebuilding it. */
  const sugNodeByKey = new Map();
  let suggestSettledHeight = 0;
  let suggestInFlight = false;
  const launcherCache = new Map();
  let launcherTimer = null;
  let suggestions = [];
  let suggestionHighlight = -1;
  let launcherRows = [];
  let launcherItems = [];
  let actionSite = null;
  let selectionText = null;
  let selectionActive = false;
  let attachment = null;
  let imgBtn = null;
  let fileInput = null;
  let errEl = null;
  let caretEl = null;
  let measureEl = null;
  let toastTimer = null;
  let focusOutTimer = null;
  let closing = false;
  let removeTimer = null;
  let fontsApplied = false;
  let fontsReady = false;
  let attachGen = 0;
  let dragDepth = 0;
  let uploading = false;
  let pendingSearch = false;
  let dropHintEl = null;

  function el(tag, cls, text) {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text != null) node.textContent = text;
    return node;
  }

  let cachedSheet = null;
  let customsMemo = null;
  let customsKey = null;

  // The 30KB stylesheet parses once per page load, not once per open:
  // constructible stylesheets are cheaply shared across shadow roots,
  // so reuse the same compiled sheet for every show() in this document.
  function applyStyles(shadow) {
    if (typeof CSSStyleSheet !== 'undefined' && 'adoptedStyleSheets' in shadow) {
      try {
        if (!cachedSheet) {
          cachedSheet = new CSSStyleSheet();
          cachedSheet.replaceSync(CSS);
        }
        shadow.adoptedStyleSheets = [cachedSheet];
        return;
      } catch (err) {
        cachedSheet = null;
        /* fall through to style element */
      }
    }
    const style = document.createElement('style');
    style.textContent = CSS;
    shadow.appendChild(style);
  }

  // sanitizeCustomEngines re-parses every custom URL through `new URL()`.
  // updateInputState hits this 2x per keystroke and the async renderers
  // hit it once per engine pill, so memoize against the `settings`
  // identity — show()/hydrate() replace the object, which self-invalidates.
  function getCustoms() {
    if (settings && customsKey === settings) return customsMemo;
    let list = [];
    try {
      if (settings && typeof QLENS.getCustomEngines === 'function') {
        list = QLENS.getCustomEngines(settings);
      }
    } catch (err) {
      list = [];
    }
    if (settings) {
      customsKey = settings;
      customsMemo = list;
    }
    return list;
  }

  function resolveEngine(id) {
    if (QLENS.ENGINES[id]) return { spec: QLENS.ENGINES[id], custom: null };
    const customs = getCustoms();
    for (const c of customs) {
      if (c.id === id) return { spec: { id: c.id, name: c.name }, custom: c };
    }
    return { spec: QLENS.ENGINES.google, custom: null };
  }

  function customSearchUrl(id, q) {
    try {
      const customs = getCustoms();
      if (typeof QLENS.buildSearchUrl === 'function') {
        const url = QLENS.buildSearchUrl(id, q, null, false, customs);
        if (url) return url;
      }
      for (const c of customs) {
        if (c.id === id && typeof QLENS.buildCustomSearchUrl === 'function') {
          const url = QLENS.buildCustomSearchUrl(c, q);
          if (url) return url;
        }
      }
    } catch (err) {}
    return null;
  }

  function svgLogo(id) {
    return QLENS.LOGOS[id] || QLENS.LOGOS.custom || '';
  }

  function build() {
    host = document.createElement('div');
    host.setAttribute('role', 'dialog');
    host.setAttribute('aria-modal', 'true');
    host.setAttribute('aria-label', 'QLens quick search');
    if (fontsReady) host.setAttribute('data-fonts', 'ready');
    root = host.attachShadow({ mode: 'open' });
    applyStyles(root);

    backdropEl = el('div', 'ql-backdrop');
    root.appendChild(backdropEl);

    viewportFrameEl = el('div', 'ql-viewport-frame');
    viewportFrameEl.setAttribute('aria-hidden', 'true');
    root.appendChild(viewportFrameEl);

    panel = el('div', 'ql-panel');
    root.appendChild(panel);

    const auroraEl = el('div', 'ql-aurora');
    auroraEl.setAttribute('aria-hidden', 'true');
    auroraEl.appendChild(el('span', 'ql-orb ql-orb-a'));
    auroraEl.appendChild(el('span', 'ql-orb ql-orb-b'));
    auroraEl.appendChild(el('span', 'ql-orb ql-orb-c'));
    panel.appendChild(auroraEl);

    panel.appendChild(el('div', 'ql-tint'));

    const content = el('div', 'ql-content');
    panel.appendChild(content);

    const glowEl = el('div', 'ql-glow');
    glowEl.setAttribute('aria-hidden', 'true');
    content.appendChild(glowEl);

    const inputRow = el('div', 'ql-input-row');
    content.appendChild(inputRow);

    inputRow.appendChild(iconSvg(ICON_SEARCH, 'ql-ic-search'));

    inputEl = el('input', 'ql-input');
    inputEl.type = 'text';
    inputEl.setAttribute('role', 'combobox');
    inputEl.setAttribute('aria-autocomplete', 'list');
    inputEl.setAttribute('aria-controls', 'ql-suggest');
    inputEl.setAttribute('aria-expanded', 'false');
    inputEl.setAttribute('aria-label', 'Search query');
    inputEl.setAttribute('autocomplete', 'off');
    inputEl.setAttribute('spellcheck', 'false');
    inputEl.placeholder = 'Search anything, anywhere';
    inputRow.appendChild(inputEl);

    caretEl = el('span', 'ql-caret is-hidden');
    caretEl.setAttribute('aria-hidden', 'true');
    inputRow.appendChild(caretEl);

    chipZoneEl = el('div', 'ql-chip-zone');
    inputRow.appendChild(chipZoneEl);

    fileInput = el('input', 'ql-hidden');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    inputRow.appendChild(fileInput);

    aiPillEl = el('button', 'ql-pill-ai');
    aiPillEl.type = 'button';
    aiPillEl.setAttribute('role', 'switch');
    aiPillEl.setAttribute('aria-checked', 'false');
    aiPillEl.setAttribute('aria-label', 'Toggle Google AI Mode');
    aiPillEl.title = 'Google AI Mode';
    aiPillEl.appendChild(iconSvg(ICON_SPARK));
    aiPillEl.appendChild(el('span', null, 'AI Mode'));
    aiPillEl.addEventListener('click', () => {
      setAi(!aiMode);
    });
    inputRow.appendChild(aiPillEl);

    imgBtn = el('button', 'ql-img-btn');
    imgBtn.type = 'button';
    imgBtn.setAttribute('aria-label', 'Search an image');
    imgBtn.title = 'Search an image (paste works too)';
    imgBtn.appendChild(iconSvg(ICON_CAMERA));
    inputRow.appendChild(imgBtn);

    errEl = el('div', 'ql-err');
    errEl.setAttribute('role', 'status');
    errEl.setAttribute('aria-live', 'polite');
    panel.appendChild(errEl);

    closeBtn = el('button', 'ql-close');
    closeBtn.type = 'button';
    closeBtn.setAttribute('aria-label', 'Close (Esc)');
    closeBtn.appendChild(iconSvg(ICON_CLOSE));
    inputRow.appendChild(closeBtn);

    pillZone = el('div', 'ql-pill-zone');
    pillZone.setAttribute('role', 'radiogroup');
    pillZone.setAttribute('aria-label', 'Search engine');
    pillsRow = el('div', 'ql-pills');
    pillZone.appendChild(pillsRow);
    content.appendChild(pillZone);

    smartZone = el('div', 'ql-smart-zone');
    content.appendChild(smartZone);

    launchEl = el('div', 'ql-launch');
    launchEl.id = 'ql-launch';
    launchEl.setAttribute('role', 'group');
    launchEl.setAttribute('aria-label', 'Launcher');
    content.appendChild(launchEl);

    suggestEl = el('div', 'ql-suggest');
    suggestEl.id = 'ql-suggest';
    suggestEl.setAttribute('role', 'listbox');
    suggestEl.setAttribute('aria-label', 'Suggestions');
    content.appendChild(suggestEl);

    const foot = el('footer', 'ql-foot');
    const hints = el('div', 'ql-foot-hints');
    const hint = (key, label) => {
      if (key) hints.appendChild(el('kbd', null, key));
      if (label) hints.appendChild(el('span', null, label));
    };
    hint('\u2191', '');
    hint('\u2193', 'navigate');
    hint('\u23ce', 'search');
    hint('esc', 'close');
    hint('tab', 'ai');
    foot.appendChild(hints);
    footEngine = el('div', 'ql-foot-engine');
    foot.appendChild(footEngine);
    content.appendChild(foot);

    document.documentElement.appendChild(host);

    renderPills();
    addListeners();
  }

  function renderPills() {
    if (!pillsRow) return;
    pillsRow.textContent = '';
    for (const id of engineOrder) {
      const resolved = resolveEngine(id);
      const eng = resolved.spec;
      if (!eng) continue;
      const pill = el('button', 'ql-pill');
      pill.type = 'button';
      pill.dataset.engine = id;
      pill.setAttribute('role', 'radio');
      pill.setAttribute('aria-label', 'Search with ' + eng.name);
      pill.tabIndex = -1;
      const on = id === engineId;
      if (on) {
        pill.classList.add('is-active');
        pill.setAttribute('aria-checked', 'true');
        pill.tabIndex = 0;
      } else {
        pill.setAttribute('aria-checked', 'false');
      }
      const badge = el('span', 'ql-pill-badge');
      badge.appendChild(iconSvg(svgLogo(id)));
      pill.appendChild(badge);
      pill.appendChild(el('span', null, eng.name));
      pillsRow.appendChild(pill);
    }
    updateAiPill();
  }

  function updateAiPill() {
    if (!aiPillEl) return;
    aiPillEl.classList.toggle('is-active', aiMode);
    aiPillEl.setAttribute('aria-checked', String(aiMode));
  }

  function renderChip() {
    if (!chipZoneEl) return;
    chipZoneEl.textContent = '';
    if (selectionActive && selectionText) {
      const chip = el('button', 'ql-chip');
      chip.type = 'button';
      chip.title = selectionText;
      chip.setAttribute('aria-label', 'Searching selected text. Click to remove.');
      chip.appendChild(iconSvg(ICON_SPARK));
      chip.appendChild(el('span', null, selectionText));
      chip.addEventListener('click', () => {
        selectionActive = false;
        renderChip();
      });
      chipZoneEl.appendChild(chip);
    }
    renderImageChip();
  }

  function renderImageChip() {
    if (!chipZoneEl || !attachment || !attachment.src) return;
    const chip = el('button', 'ql-img-chip');
    chip.type = 'button';
    chip.setAttribute('aria-label', uploading ? 'Searching image…' : 'Search this image. Click to remove.');
    chip.title = uploading ? 'Preparing image…' : 'Search this image';
    if (uploading) chip.classList.add('ql-uploading');
    const thumb = el('span', 'ql-img-thumb');
    try { thumb.style.backgroundImage = 'url(' + attachment.src + ')'; } catch (e) {}
    chip.appendChild(thumb);
    if (uploading) {
      const sp = el('span', 'ql-spinner');
      sp.setAttribute('aria-hidden', 'true');
      chip.appendChild(sp);
    } else {
      const label = el('span', 'ql-img-x');
      label.textContent = '×';
      chip.appendChild(label);
    }
    if (!uploading) {
      chip.addEventListener('click', () => { removeImage(); });
    }
    chipZoneEl.appendChild(chip);
  }

  function showError(text) {
    if (!errEl) return;
    errEl.textContent = String(text || 'Something went wrong.');
    errEl.classList.add('is-open');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      try { errEl.classList.remove('is-open'); } catch (e) {}
    }, 3200);
  }

  // ---- flash-fast image pipeline (instant chip + race-safe) ----
  function readFileBytes(file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => { try { resolve(new Uint8Array(r.result)); } catch (e) { reject(e); } };
      r.onerror = () => reject(r.error || new Error('read failed'));
      try { r.readAsArrayBuffer(file); } catch (e) { reject(e); }
    });
  }

  function fnv1a32Hex(bytes) {
    try {
      if (QLENS.ImageEngine && typeof QLENS.ImageEngine.fnv1a32 === 'function') {
        return QLENS.ImageEngine.fnv1a32(bytes);
      }
    } catch (e) {}
    return '';
  }

  function configNum(key, fallback) {
    try {
      const v = QLENS.CONFIG && QLENS.CONFIG[key];
      if (typeof v === 'number' && isFinite(v) && v > 0) return v;
    } catch (e) {}
    return fallback;
  }

  function targetDims(w, h, maxDim) {
    try {
      if (QLENS.ImageEngine && typeof QLENS.ImageEngine.resizeDims === 'function') {
        const d = QLENS.ImageEngine.resizeDims(w, h, maxDim);
        if (d && typeof d.width === 'number' && typeof d.height === 'number') {
          return { width: Math.max(1, Math.round(d.width)), height: Math.max(1, Math.round(d.height)) };
        }
      }
    } catch (e) {}
    const scale = Math.min(1, maxDim / Math.max(w, h));
    return { width: Math.max(1, Math.round(w * scale)), height: Math.max(1, Math.round(h * scale)) };
  }

  function canvasToBlob(canvas, mime, quality) {
    return new Promise((res) => {
      try {
        if (typeof quality === 'number') canvas.toBlob(res, mime, quality);
        else canvas.toBlob(res, mime);
      } catch (e) { res(null); }
    });
  }

  function pickEncodeMime() {
    try {
      if (QLENS.ImageEngine && typeof QLENS.ImageEngine.pickEncodeMime === 'function') {
        const m = QLENS.ImageEngine.pickEncodeMime();
        if (typeof m === 'string' && m) return m;
      }
    } catch (e) {}
    return 'image/webp';
  }

  function setUploading(v) {
    uploading = Boolean(v);
    if (imgBtn) { imgBtn.disabled = uploading; imgBtn.style.opacity = uploading ? '.55' : ''; }
    // NOTE: input stays enabled during image processing so the user can keep
    // typing and hit Enter-to-queue (pendingSearch) while the spinner shows.
    // re-render chip to show spinner
    try { renderChip(); } catch (e) {}
  }

  // Revoke an object URL only when no live attachment owns it, so abort paths
  // never break a pending/final chip and never leak an orphan URL.
  // revokeObjectURL on an already-revoked URL is a harmless no-op.
  function revokeOrphanURL(url) {
    if (!url) return;
    try {
      if (!attachment || attachment.src !== url) URL.revokeObjectURL(url);
    } catch (e) {}
  }

  function showDropHint(show) {
    if (!panel) return;
    if (!dropHintEl) {
      dropHintEl = el('div', 'ql-drop-hint');
      dropHintEl.textContent = 'Drop image to search';
      panel.appendChild(dropHintEl);
    }
    dropHintEl.classList.toggle('is-visible', Boolean(show));
    if (panel) panel.classList.toggle('ql-drag-active', Boolean(show));
    const row = root ? root.querySelector('.ql-input-row') : null;
    if (row) row.classList.toggle('ql-drag-over', Boolean(show));
  }

  async function attachImage(file) {
    if (!file || !host) return;
    const gen = ++attachGen;
    pendingSearch = false;
    // cheap pre-check via shared engine
    try {
      if (QLENS.ImageEngine && typeof QLENS.ImageEngine.isImageFileLike === 'function' && !QLENS.ImageEngine.isImageFileLike(file)) {
        // still allow: sniff will decide, but show nicer toast for obvious non-images
        if (file.type && !String(file.type).startsWith('image/') && !/\.(png|jpe?g|gif|webp|bmp|avif|heic|heif|svg|ico)$/i.test(String(file.name || ''))) {
          showError('Drop an image file to search it.');
          return;
        }
      }
    } catch (e) {}

    // 1. Instant chip: synchronous object-URL thumbnail + uploading spinner, <1 frame.
    let instantURL = null;
    try {
      if (typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') instantURL = URL.createObjectURL(file);
    } catch (e) {
      instantURL = null;
    }
    if (gen !== attachGen || !host) {
      revokeOrphanURL(instantURL);
      return;
    }
    // revoke any previous attachment preview atomically, then publish pending state
    if (attachment && attachment.src) { try { URL.revokeObjectURL(attachment.src); } catch (e) {} }
    const originalName = (typeof file.name === 'string' && file.name) ? file.name : (QLENS.CONFIG && QLENS.CONFIG.LENS_FILENAME ? QLENS.CONFIG.LENS_FILENAME : 'qlens-search.jpg');
    let claimedMime = '';
    try { claimedMime = typeof file.type === 'string' ? file.type : ''; } catch (e) { claimedMime = ''; }
    if (!instantURL) {
      // No preview URL available — continue without instant chip; heavy work still proceeds.
      attachment = { bytes: null, src: '', name: originalName, mime: claimedMime, hash: '' };
    } else {
      attachment = { bytes: null, src: instantURL, name: originalName, mime: claimedMime, hash: '' };
    }
    setUploading(true);
    try { if (inputEl) inputEl.focus(); } catch (e) {}

    // 2. Read bytes via arrayBuffer() with FileReader fallback.
    let bytes = null;
    try {
      if (file && typeof file.arrayBuffer === 'function') {
        const ab = await file.arrayBuffer();
        bytes = new Uint8Array(ab);
      } else {
        bytes = await readFileBytes(file);
      }
    } catch (err) {
      try { bytes = await readFileBytes(file); } catch (e2) { bytes = null; }
    }
    if (gen !== attachGen || !host) {
      revokeOrphanURL(instantURL);
      return;
    }
    if (!bytes) {
      revokeOrphanURL(instantURL);
      if (attachment && attachment.src === instantURL) attachment = null;
      else if (attachment && !attachment.bytes) attachment = null;
      setUploading(false);
      showError('Could not read that image.');
      return;
    }

    // 3. Validate via shared pure engine (magic byte + size), fallback inline.
    let validated = null;
    try {
      if (QLENS.ImageEngine && typeof QLENS.ImageEngine.validateImageBytes === 'function') {
        validated = QLENS.ImageEngine.validateImageBytes(bytes, claimedMime);
      } else {
        const maxBytes = configNum('IMAGE_MAX_BYTES', 5 * 1024 * 1024);
        if (!bytes || bytes.length === 0) validated = { ok: false, error: 'The selected file is empty.' };
        else if (bytes.length > maxBytes) validated = { ok: false, error: 'Image is too large (max 5 MB).' };
        else validated = { ok: true, mime: (typeof claimedMime === 'string' && claimedMime.indexOf('image/') === 0 ? claimedMime : 'image/jpeg') };
      }
    } catch (e) { validated = { ok: false, error: 'That does not look like an image.' }; }
    if (!validated || !validated.ok) {
      revokeOrphanURL(instantURL);
      attachment = null;
      setUploading(false);
      showError(validated && validated.error ? validated.error : 'That does not look like an image.');
      return;
    }
    const mime = validated.mime;
    if (gen !== attachGen || !host) {
      if (instantURL) { try { URL.revokeObjectURL(instantURL); } catch (e) {} }
      return;
    }

    let safeName = originalName;
    try {
      if (QLENS.ImageEngine && typeof QLENS.ImageEngine.buildLensFilename === 'function') safeName = QLENS.ImageEngine.buildLensFilename(originalName, mime);
    } catch (e) {}

    // 4-5. Fast path decode/resize/encode with raw fallback for undecodable types.
    const maxDim = Math.min(configNum('IMAGE_MAX_DIM', 1600), 1024);
    const webpQ = (() => { try { const v = QLENS.CONFIG && QLENS.CONFIG.IMAGE_WEBP_QUALITY; if (typeof v === 'number' && v > 0 && v <= 1) return v; } catch (e) {} return 0.85; })();
    const jpegQ = (() => { try { const v = QLENS.CONFIG && QLENS.CONFIG.IMAGE_JPEG_QUALITY; if (typeof v === 'number' && v > 0 && v <= 1) return v; } catch (e) {} return 0.82; })();
    const maxBytes = configNum('IMAGE_MAX_BYTES', 5 * 1024 * 1024);
    let outBytes = bytes;
    let outMime = mime;
    const previewURL = instantURL;
    let encodedBlob = null;
    let failed = false;
    let failReason = '';
    try {
      if (typeof createImageBitmap === 'function') {
        const blob = new Blob([bytes], { type: mime });
        let bitmap = null;
        try {
          bitmap = await createImageBitmap(blob);
        } catch (e) { bitmap = null; }
        if (gen !== attachGen || !host) {
          if (bitmap) { try { bitmap.close(); } catch (e2) {} }
          revokeOrphanURL(instantURL);
          return;
        }
        if (!bitmap) {
          // Raw fallback: no browser decoder (e.g. HEIC) — upload original as-is if within cap.
          if (bytes.length <= maxBytes) {
            outBytes = bytes;
            outMime = mime;
          } else {
            failed = true;
            failReason = 'Image is too large (max 5 MB).';
          }
        } else {
          try {
            const bw = bitmap.width;
            const bh = bitmap.height;
            if (gen !== attachGen || !host) { try { bitmap.close(); } catch (e) {} revokeOrphanURL(instantURL); return; }
            if (Math.max(bw, bh) <= maxDim) {
              // Fast path: upload ORIGINAL bytes (zero re-encode).
              outBytes = bytes;
              outMime = mime;
            } else {
              // Single-step resize: prefer decoder-side resize, fallback to canvas drawImage.
              const dims = targetDims(bw, bh, maxDim);
              let resizedBitmap = null;
              try {
                if (typeof createImageBitmap === 'function') {
                  resizedBitmap = await createImageBitmap(blob, { resizeWidth: dims.width, resizeHeight: dims.height, resizeQuality: 'high' });
                }
              } catch (e) { resizedBitmap = null; }
              if (gen !== attachGen || !host) {
                try { bitmap.close(); } catch (e) {}
                if (resizedBitmap) { try { resizedBitmap.close(); } catch (e) {} }
                revokeOrphanURL(instantURL);
                return;
              }
              const canvas = document.createElement('canvas');
              canvas.width = dims.width;
              canvas.height = dims.height;
              const ctx = canvas.getContext('2d');
              let encoded = null;
              if (ctx) {
                try {
                  ctx.imageSmoothingQuality = 'high';
                  if (resizedBitmap) ctx.drawImage(resizedBitmap, 0, 0, canvas.width, canvas.height);
                  else ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
                } catch (e) { encoded = null; }
                if (gen !== attachGen || !host) {
                  try { bitmap.close(); } catch (e) {}
                  if (resizedBitmap) { try { resizedBitmap.close(); } catch (e) {} }
                  revokeOrphanURL(instantURL);
                  return;
                }
                // Encode: webp first, jpeg fallback (promisified callback).
                if (encoded === null) {
                  const first = pickEncodeMime();
                  const order = first === 'image/jpeg'
                    ? [{ mime: 'image/jpeg', q: jpegQ }, { mime: 'image/webp', q: webpQ }]
                    : [{ mime: 'image/webp', q: webpQ }, { mime: 'image/jpeg', q: jpegQ }];
                  for (const step of order) {
                    if (gen !== attachGen || !host) break;
                    try {
                      const b = await canvasToBlob(canvas, step.mime, step.q);
                      if (b && gen === attachGen && host) { encoded = b; break; }
                    } catch (e) { encoded = null; }
                  }
                }
              }
              if (resizedBitmap) { try { resizedBitmap.close(); } catch (e) {} }
              if (encoded) {
                try {
                  const ab = await encoded.arrayBuffer();
                  if (gen !== attachGen || !host) {
                    try { if (bitmap) bitmap.close(); } catch (closeErr) {}
                    return;
                  }
                  outBytes = new Uint8Array(ab);
                  encodedBlob = encoded;
                  outMime = encoded.type || 'image/jpeg';
                } catch (e) {
                  outBytes = bytes;
                  outMime = mime;
                  encodedBlob = null;
                }
              } else {
                // Encode failed — keep original bytes (never lose a valid image).
                outBytes = bytes;
                outMime = mime;
                encodedBlob = null;
              }
            }
          } catch (e) {
            outBytes = bytes;
            outMime = mime;
            encodedBlob = null;
          }
          try { bitmap.close(); } catch (e) {}
        }
      }
    } catch (err) {
      // decode/encode threw — raw fallback below.
      outBytes = bytes;
      outMime = mime;
      encodedBlob = null;
    }

    if (gen !== attachGen || !host) {
      revokeOrphanURL(instantURL);
      return;
    }
    if (failed) {
      revokeOrphanURL(instantURL);
      attachment = null;
      setUploading(false);
      showError(failReason || 'Image is too large (max 5 MB).');
      return;
    }

    // Store attachment; preview URL is the encoded blob's object URL when we encoded.
    let finalURL = previewURL;
    if (encodedBlob) {
      try {
        const u = URL.createObjectURL(encodedBlob);
        if (gen !== attachGen || !host) { try { URL.revokeObjectURL(u); } catch (e) {} return; }
        finalURL = u;
      } catch (e) {
        finalURL = previewURL;
      }
    }
    if (!finalURL) {
      try {
        const safeType = (outMime === 'image/png' || outMime === 'image/gif' || outMime === 'image/webp') ? outMime : (mime === 'image/png' || mime === 'image/gif' || mime === 'image/webp' ? mime : 'image/jpeg');
        finalURL = URL.createObjectURL(new Blob([outBytes], { type: safeType }));
      } catch (e) {
        revokeOrphanURL(instantURL);
        attachment = null;
        setUploading(false);
        showError('Could not preview that image.');
        return;
      }
    }
    if (gen !== attachGen || !host) { revokeOrphanURL(finalURL); return; }
    // Revoke the instant URL if the final preview is a different object URL.
    if (instantURL && finalURL !== instantURL) { try { URL.revokeObjectURL(instantURL); } catch (e) {} }

    const hash = fnv1a32Hex(outBytes);
    attachment = { bytes: outBytes, src: finalURL, name: safeName, mime: outMime, hash: hash };
    setUploading(false);
    renderChip();
    // subtle success micro-feedback: focus input so Enter is instant
    try { if (inputEl) inputEl.focus(); } catch (e) {}
    if (pendingSearch) {
      pendingSearch = false;
      try { searchImage(); } catch (e) {}
    }
  }

  function removeImage() {
    attachGen++;
    pendingSearch = false;
    showDropHint(false);
    setUploading(false);
    if (attachment && attachment.src) {
      try { URL.revokeObjectURL(attachment.src); } catch (err) {}
    }
    attachment = null;
    try { renderChip(); } catch (e) {}
  }

  function searchImage() {
    if (!attachment) return;
    // Pending-search queue: Enter while bytes are still processing queues one
    // auto-fire on attach completion (spinner stays, no keypress swallowed).
    if (uploading || !attachment.bytes) {
      pendingSearch = true;
      try { renderChip(); } catch (e) {}
      return;
    }
    pendingSearch = false;
    const text = inputEl ? inputEl.value.trim().slice(0, 2000) : '';
    const bytes = attachment.bytes;
    const name = attachment.name || safeNameFallback();
    const mime = attachment.mime || 'image/jpeg';
    const hash = typeof attachment.hash === 'string' ? attachment.hash : '';
    // NOTE: extension messaging is JSON-only — typed arrays do NOT survive
    // sendMessage (they arrive as plain index-keyed objects). Base64 is the
    // only safe transport; the SW accepts `bytes` as the primary payload.
    let b64 = '';
    try {
      if (QLENS.ImageEngine && typeof QLENS.ImageEngine.bytesToBase64 === 'function') b64 = QLENS.ImageEngine.bytesToBase64(bytes);
      else {
        let bin = '';
        for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
        b64 = btoa(bin);
      }
    } catch (e) { showError('Could not prepare that image.'); return; }
    if (!b64) { showError('Could not prepare that image.'); return; }
    // Single derived cap: base64 inflates bytes by 4/3, so compare against the
    // shared IMAGE_MAX_BYTES instead of a hardcoded literal that drifts when
    // the config changes (a 3MB image used to pass validation then fail here).
    const rawMax = (QLENS.CONFIG && typeof QLENS.CONFIG.IMAGE_MAX_BYTES === 'number')
      ? QLENS.CONFIG.IMAGE_MAX_BYTES : 5 * 1024 * 1024;
    if (b64.length > Math.ceil(rawMax * 4 / 3) + 64) { showError('Image is too large to search.'); return; }
    // Destroy synchronously on success only: the async response is awaited
    // first so a busy single-flight ({ok:false, busy:true}) can surface a
    // toast on the live host instead of vanishing with a dead overlay.
    try {
      const res = chrome.runtime.sendMessage({ type: QLENS.MSG.IMAGE_SEARCH, payload: { bytes: b64, text, name, hash, mime } });
      const done = (r) => {
        if (r && r.ok === false) {
          if (r.busy) showError('Another image search is still uploading. Please try again in a moment.');
          else showError('Could not start that image search.');
          return;
        }
        // lightspeed: synchronous destroy before tabs.create (zero residue, zero google.com flash)
        try { destroy(false); } catch (e) { try { destroy(false); } catch (_) {} }
      };
      if (res && typeof res.then === 'function') res.then(done, () => showError('Could not start that image search.'));
      else done(res);
    } catch (err) {
      showError('Could not start that image search.');
    }
  }

  function safeNameFallback() {
    try {
      if (QLENS.ImageEngine && typeof QLENS.ImageEngine.buildLensFilename === 'function') return QLENS.ImageEngine.buildLensFilename('', 'image/jpeg');
    } catch (e) {}
    try {
      if (QLENS.CONFIG && QLENS.CONFIG.LENS_FILENAME) return QLENS.CONFIG.LENS_FILENAME;
    } catch (e) {}
    return 'qlens-search.jpg';
  }

  function updateFootEngine() {
    if (!footEngine) return;
    footEngine.textContent = '';
    const spec = resolveEngine(engineId).spec;
    const name = aiMode ? 'Google AI' : (spec ? spec.name : '');
    footEngine.appendChild(el('i', 'ql-foot-dot'));
    footEngine.appendChild(document.createTextNode(name));
  }

  function applyTheme(s) {
    if (s.theme === 'system') {
      host.removeAttribute('data-theme');
    } else {
      host.setAttribute('data-theme', s.theme);
    }
    const hex = QLENS.CONFIG.ACCENTS[s.accent] || QLENS.CONFIG.ACCENTS.indigo;
    host.style.setProperty('--ql-accent', hex);
    host.style.setProperty('--ql-accent-rgb', hexToRgb(hex));
    host.style.setProperty('--ql-accent-ink', ACCENT_INKS[s.accent] || '#ffffff');
  }

  function hexToRgba(hex, a) {
    const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || '').trim());
    if (!m) return 'rgba(173,122,255,' + a.toFixed(3) + ')';
    const n = parseInt(m[1], 16);
    const r = (n >> 16) & 255;
    const g = (n >> 8) & 255;
    const b = n & 255;
    return 'rgba(' + r + ',' + g + ',' + b + ',' + a.toFixed(3) + ')';
  }

  function updateViewportFrame() {
    if (!viewportFrameEl) return;
    const vs = (settings && settings.viewportShadow) ? settings.viewportShadow : QLENS.CONFIG.DEFAULT_SETTINGS.viewportShadow;
    let reduced = false;
    try {
      reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch (err) {
      reduced = false;
    }
    if (!vs.enabled || reduced) {
      viewportFrameEl.style.display = 'none';
      try { if (host) host.setAttribute('data-vs', 'off'); } catch (e) {}
      return;
    }
    viewportFrameEl.style.display = '';
    try { if (host) host.setAttribute('data-vs', 'on'); } catch (e) {}
    const l1 = vs.layer1;
    const l2 = vs.layer2;
    const f = vs.frame;
    const c1 = hexToRgba(l1.color, l1.opacity / 100);
    const c2 = hexToRgba(l2.color, l2.opacity / 100);
    const parts = [];
    parts.push('inset ' + l1.x + 'px ' + l1.y + 'px ' + l1.blur + 'px ' + l1.spread + 'px ' + c1);
    if (l2.enabled) parts.push('inset 0 0 ' + l2.blur + 'px ' + l2.spread + 'px ' + c2);
    parts.push('inset 0 1px 0 rgba(255,255,255,0.06)');
    viewportFrameEl.style.boxShadow = parts.join(', ');
    viewportFrameEl.style.borderRadius = f.radius + 'px';
    viewportFrameEl.style.borderColor = 'rgba(255,255,255,' + Number(f.borderOpacity).toFixed(2) + ')';
  }

  function addListeners() {
    root.addEventListener('keydown', onKeyDown);
    root.addEventListener('keyup', onKeyUp);
    // Capture handler first: redirects page-stolen keystrokes and Esc
    // before the space guard below or any page listener consumes them.
    window.addEventListener('keydown', onWindowCaptureKey, true);
    window.addEventListener('keydown', onWindowKey, true);
    window.addEventListener('keyup', onWindowKey, true);
    inputEl.addEventListener('input', onInput);
    inputEl.addEventListener('keydown', queueCaret);
    inputEl.addEventListener('click', queueCaret);
    inputEl.addEventListener('focus', queueCaret);
    inputEl.addEventListener('blur', queueCaret);
    imgBtn.addEventListener('click', () => {
      try {
        fileInput.click();
      } catch (err) {
        /* file picker denied — silently skipped */
      }
    });
    fileInput.addEventListener('change', () => {
      if (fileInput.files && fileInput.files.length > 0) {
        attachImage(fileInput.files[0]);
      }
      fileInput.value = '';
      focusInput();
    });
    root.addEventListener('dragenter', onDragEnter);
    root.addEventListener('dragover', onDragOver);
    root.addEventListener('dragleave', onDragLeave);
    root.addEventListener('drop', onDrop);
    root.addEventListener('paste', onPaste);
    closeBtn.addEventListener('click', () => {
      if (inputEl.value) {
        inputEl.value = '';
        inputEl.focus();
        updateInputState();
      } else {
        destroy(true);
      }
    });
    pillZone.addEventListener('click', (e) => {
      const pill = e.target.closest('[data-engine]');
      if (!pill) return;
      setEngine(pill.dataset.engine);
      inputEl.focus();
    });
    pillZone.addEventListener('keydown', onPillKeydown);
    backdropEl.addEventListener('click', (e) => {
      if (e.target === backdropEl) destroy(true);
    });
  }

  function onInput() {
    updateInputState();
    // Coalesced: rapid typing/paste/IME fires many inputs per frame but
    // updateCaret forces a sync layout, so batch them into one measure.
    queueCaret();
  }

  function isDragWithImage(e) {
    try {
      const dt = e.dataTransfer;
      if (!dt) return false;
      const types = dt.types ? Array.from(dt.types) : [];
      if (types.includes('Files')) return true;
      if (dt.files && dt.files.length) {
        for (const f of dt.files) if (String(f.type||'').startsWith('image/')) return true;
      }
    } catch (err) {}
    return false;
  }

  function onDragEnter(e) {
    if (!host || !e.dataTransfer) return;
    // Only show hint for image drags
    if (!isDragWithImage(e)) return;
    e.preventDefault();
    dragDepth++;
    showDropHint(true);
  }

  function onDragOver(e) {
    if (!host) return;
    if (!isDragWithImage(e)) return;
    e.preventDefault();
    try { e.dataTransfer.dropEffect = 'copy'; } catch (err) {}
    if (dragDepth === 0) { dragDepth = 1; showDropHint(true); }
  }

  function onDragLeave(e) {
    if (!host) return;
    // dragleave fires for children too — depth counter makes it robust
    dragDepth = Math.max(0, dragDepth - 1);
    if (dragDepth === 0) showDropHint(false);
  }

  function onDrop(e) {
    e.preventDefault();
    dragDepth = 0;
    showDropHint(false);
    if (!host) return;
    const files = e.dataTransfer && e.dataTransfer.files ? e.dataTransfer.files : null;
    if (!files || files.length === 0) return;
    let picked = null;
    for (const f of files) {
      if (QLENS.ImageEngine ? QLENS.ImageEngine.isImageFileLike(f) : String(f.type||'').startsWith('image/')) { picked = f; break; }
      if (!picked && String(f.type||'').startsWith('image/')) picked = f;
    }
    if (!picked) {
      // last resort: take first file and let validateImageBytes give proper toast
      picked = files[0];
      if (!picked || !QLENS.ImageEngine.isImageFileLike(picked)) { showError('Drop an image file to search it.'); return; }
    }
    attachImage(picked);
  }

  function onPaste(e) {
    if (!host || !root) return;
    const target = e.target;
    if (target && target !== inputEl && !root.contains(target)) return;
    // If user pasted plain text into input, let the input handle it — only intercept images.
    // Snapshot clipboard items to plain data FIRST: DataTransferItems are live
    // objects whose getAsFile() may throw on copy-protected pages, and item
    // props (kind/type) may be missing or null — never touch them twice.
    let items = null;
    try {
      let raw = null;
      try {
        raw = e.clipboardData && e.clipboardData.items ? e.clipboardData.items : [];
      } catch (clipErr) {
        raw = [];
      }
      const list = [];
      try {
        for (const it of raw) {
          let file = null;
          try {
            file = it && typeof it.getAsFile === 'function' ? it.getAsFile() : null;
          } catch (snapErr) {
            file = null;
          }
          let kind = '';
          let type = '';
          try {
            kind = it && typeof it.kind === 'string' ? it.kind : '';
            type = it && typeof it.type === 'string' ? it.type : '';
          } catch (propErr) {
            kind = '';
            type = '';
          }
          list.push({ kind, type, file });
        }
      } catch (iterErr) {
        /* non-iterable clipboard list — treat as no items */
      }
      items = list;
    } catch (err) {
      items = null;
    }
    let imageFile = null;
    try {
      if (QLENS.ImageEngine && typeof QLENS.ImageEngine.pickPasteImage === 'function') {
        const like = (file) => {
          try {
            return QLENS.ImageEngine.isImageFileLike(file) === true;
          } catch (likeErr) {
            return false;
          }
        };
        imageFile = QLENS.ImageEngine.pickPasteImage(items, like);
      }
    } catch (err) {
      imageFile = null;
    }
    if (!imageFile) return;
    e.preventDefault();
    e.stopPropagation();
    attachImage(imageFile);
  }

  function onPillKeydown(e) {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
    e.preventDefault();
    const order = engineOrder.length ? engineOrder : QLENS.ENGINE_ORDER;
    const idx = order.indexOf(engineId);
    const next =
      e.key === 'ArrowLeft' ? (idx - 1 + order.length) % order.length
      : e.key === 'ArrowRight' ? (idx + 1) % order.length
      : e.key === 'Home' ? 0
      : order.length - 1;
    if (order[next]) setEngine(order[next], false);
    const active = pillZone.querySelector('.ql-pill.is-active');
    if (active) active.focus();
  }

  function onKeyUp(e) {
    e.stopPropagation();
  }

  // Capture phase on window: runs before bubble-phase page shortcuts and
  // covers keystrokes whose target is outside the shadow root (focus stolen
  // by the page, or on a pill/button). Esc closes from anywhere; printable
  // keys are redirected into the input so typing never gets lost.
  // Space is owned by onWindowKey below — it returns early here.
  function onWindowCaptureKey(e) {
    if (!host || !root) return;
    if (e.key === 'Escape') {
      // Root onKeyDown respects IME composition; match it here so Esc during
      // composition doesn't close the overlay and drop an image attachment.
      if (e.isComposing || e.defaultPrevented) return;
      e.preventDefault();
      e.stopPropagation();
      try { e.stopImmediatePropagation(); } catch (err) {}
      if (attachment) {
        removeImage();
      } else {
        destroy(true);
      }
      return;
    }
    if (e.type !== 'keydown') return;
    if (e.isComposing || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === ' ' || e.code === 'Space') return;
    if (typeof e.key !== 'string' || e.key.length !== 1) return;
    let src = null;
    try {
      const path = typeof e.composedPath === 'function' ? e.composedPath() : [];
      src = path && path[0];
    } catch (err) {
      src = null;
    }
    const inside = Boolean(src && root.contains(src));
    if (inside && src === inputEl) return;
    // Inside on a pill/button: printable keys belong to the query, not the
    // control — redirect them so typing never gets lost after Tab roaming.
    // Space is excluded (owned by onWindowKey; buttons need it to activate).
    e.preventDefault();
    e.stopPropagation();
    try { e.stopImmediatePropagation(); } catch (err) {}
    insertText(e.key);
  }

  function onWindowKey(e) {
    if (!host || !root) return;
    if (e.key !== ' ' && e.code !== 'Space') return;
    const path = typeof e.composedPath === 'function' ? e.composedPath() : [];
    const src = path && path[0];
    const inside = Boolean(src && root.contains(src));
    if (!inside) {
      if (e.type !== 'keyup' && !e.isComposing && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        e.stopImmediatePropagation();
        insertText(' ');
        return;
      }
      e.preventDefault();
      e.stopImmediatePropagation();
      return;
    }
    // keyup never inserts — the keydown path already inserted the space;
    // inserting again doubles it. root's keyup stopPropagation still shields
    // the page (YouTube pause) for events originating inside the overlay.
    if (e.type === 'keyup') return;
    if (src !== inputEl || e.isComposing) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    insertText(' ');
  }

  // Page-level single-key shortcuts (google.com "/", GitHub "s", YouTube
  // space…) register their capture listeners before content scripts load and
  // preventDefault the keydown — native insertion dies and focus can be
  // stolen. Insert manually instead; reclaim focus if the page took it.
  function insertText(text) {
    if (!inputEl) return;
    try {
      const s = inputEl.selectionStart == null ? inputEl.value.length : inputEl.selectionStart;
      const en = inputEl.selectionEnd == null ? s : inputEl.selectionEnd;
      inputEl.setRangeText(text, s, en, 'end');
      inputEl.selectionStart = inputEl.selectionEnd = Math.min(s + text.length, inputEl.value.length);
      inputEl.dispatchEvent(new InputEvent('input', { bubbles: true, data: text, inputType: 'insertText' }));
    } catch (err) {
      /* insert is best-effort; nothing to recover */
    }
    try {
      if (host && document.activeElement !== host) inputEl.focus();
    } catch (err) {
      /* focus reclaim is best-effort */
    }
  }

  function onKeyDown(e) {
    e.stopPropagation();
    if (e.key === 'Escape') {
      if (e.defaultPrevented) return;
      e.preventDefault();
      if (attachment) {
        removeImage();
      } else {
        destroy(true);
      }
      return;
    }
    if (e.key === 'Tab') {
      handleTab(e);
      return;
    }
    if (e.target !== inputEl) return;
    // A page shortcut already preventDefaulted this printable keystroke
    // (google.com "/", etc.) — the browser will not insert it natively.
    if (
      e.defaultPrevented &&
      !e.isComposing &&
      e.key.length === 1 &&
      e.key !== ' ' &&
      !e.ctrlKey && !e.metaKey && !e.altKey
    ) {
      e.preventDefault();
      insertText(e.key);
      return;
    }
    if (e.key === 'Enter') {
      if (e.isComposing) return;
      e.preventDefault();
      if (attachment) {
        searchImage();
      } else if (suggestionHighlight >= 0 && suggestions[suggestionHighlight]) {
        const row = suggestions[suggestionHighlight];
        if (row.dataset.launchKind) {
          activateLauncherRow(row, e.shiftKey);
          return;
        }
        const fav = row.dataset.favUrl;
        if (fav) {
          const site = { url: row.dataset.favUrl, shortcut: row.dataset.favShortcut };
          const rest = row.dataset.favRest || '';
          const url = buildFavoriteUrl(site, rest);
          if (QLENS.isSafeHttpUrl(url)) openTab(url, null, null);
          return;
        }
        if (row.dataset.query) {
          submitQuery(row.dataset.query);
          return;
        }
      }
      if (isFavoriteInput(inputEl.value)) {
        const after = inputEl.value.trimStart().slice(1).trim();
        const parts = after.split(/\s+/);
        const sc = (parts[0] || '').toLowerCase();
        const rest = parts.slice(1).join(' ');
        const all = getFavoriteSites();
        const match = all.find((s) => s.shortcut.toLowerCase() === sc);
        if (match) {
          const url = buildFavoriteUrl(match, rest);
          if (QLENS.isSafeHttpUrl(url)) { openTab(url, null, null); return; }
        }
        if (suggestions.length && suggestions[0] && suggestions[0].dataset.favUrl) {
          const site = { url: suggestions[0].dataset.favUrl };
          const rest2 = suggestions[0].dataset.favRest || '';
          const url2 = buildFavoriteUrl(site, rest2);
          if (QLENS.isSafeHttpUrl(url2)) { openTab(url2, null, null); return; }
        }
        return;
      }
      if (actionSite) {
        goToSite(actionSite);
      } else {
        submitQuery(inputEl.value);
      }
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      moveHighlight(1);
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      moveHighlight(-1);
    }
  }

  function setAi(on) {
    aiMode = Boolean(on);
    userTouchedEngine = true;
    if (aiMode && engineId !== 'google') {
      engineId = 'google';
      QLENS.storage.setLastEngine('google');
    }
    renderPills();
    updateFootEngine();
  }

function handleTab(e) {
  const focusables = getFocusables();
  if (e.target === inputEl) {
    e.preventDefault();
    if (e.shiftKey) {
      const idx = focusables.indexOf(inputEl);
      const prev = idx <= 0 ? focusables[focusables.length - 1] : focusables[idx - 1];
      if (prev) prev.focus();
    } else {
      setAi(!aiMode);
    }
    return;
  }
    e.preventDefault();
    const idx = focusables.indexOf(e.target);
    let next = e.shiftKey ? idx - 1 : idx + 1;
    if (next < 0) next = focusables.length - 1;
    if (next >= focusables.length) next = 0;
    const target = focusables[next];
    if (target) target.focus();
  }

  function getFocusables() {
    return Array.from(panel.querySelectorAll('button, input')).filter((n) => !n.disabled && n.getClientRects().length > 0);
  }

  function setEngine(id, persist) {
    engineId = id;
    aiMode = false;
    userTouchedEngine = true;
    renderPills();
    updateFootEngine();
    if (persist === false) return;
    QLENS.storage.setLastEngine(id);
  }

  function isFavoriteInput(v) {
    const s = String(v == null ? '' : v).trimStart();
    return s.startsWith('/');
  }

  function getFavoriteSites() {
    const vs = settings && Array.isArray(settings.favoriteSites) ? settings.favoriteSites : QLENS.CONFIG.DEFAULT_SETTINGS.favoriteSites;
    return Array.isArray(vs) ? vs : [];
  }

  function buildFavoriteUrl(site, rest) {
    const base = String(site.url || '').trim();
    const q = String(rest || '').trim();
    if (!q) return base;
    if (base.includes('{q}')) {
      try {
        if (QLENS.safeEncodeQuery) return base.split('{q}').join(QLENS.safeEncodeQuery(q));
      } catch (err) {}
      return base.split('{q}').join(encodeURIComponent(q));
    }
    // Plain homepage favorite with a trailing query: the extra words are
    // intentionally dropped rather than bolted on as a bogus ?q=. Keeps the
    // open target predictable; callers still run the result through the
    // http(s) allowlist before navigating.
    return base;
  }

  function renderFavoriteCommands(filterRaw) {
    const raw = String(filterRaw == null ? '' : filterRaw).trim().toLowerCase();
    const parts = raw.split(/\s+/);
    const shortcutPrefix = (parts[0] || '').toLowerCase();
    const rest = parts.slice(1).join(' ').trim();
    const all = getFavoriteSites();
    let list = all;
    if (shortcutPrefix) {
      list = all.filter((s) => s.shortcut.toLowerCase().startsWith(shortcutPrefix) || s.label.toLowerCase().includes(shortcutPrefix));
    }
    clearSuggestions();
    hideAction();
    if (!list.length) {
      const empty = el('div', 'ql-fav-empty');
      const b = el('b'); b.textContent = shortcutPrefix ? 'No command for "/' + shortcutPrefix + '"' : 'No quick commands';
      const p = el('p'); p.textContent = 'Add shortcuts in Extension Options → Quick Commands (e.g., gh → GitHub).';
      const a = el('a'); a.href = '#'; a.textContent = 'Open Options';
      a.addEventListener('click', (e) => { e.preventDefault(); try { if (chrome.runtime.openOptionsPage) chrome.runtime.openOptionsPage(); else chrome.runtime.sendMessage({ type: QLENS.MSG.OPEN_OPTIONS }).catch(()=>{}); } catch(err){ try { chrome.runtime.sendMessage({ type: QLENS.MSG.OPEN_OPTIONS }).catch(()=>{}); } catch(e2){} } });
      p.appendChild(document.createElement('br')); p.appendChild(a);
      empty.append(b, p);
      suggestEl.appendChild(empty);
      suggestEl.classList.add('is-open');
      suggestions = [];
      suggestionHighlight = -1;
      inputEl.setAttribute('aria-expanded', 'true');
      setSuggestHeight(140);
      // store filtered for later Enter handling
      suggestions = [];
      return;
    }
    const head = el('div', 'ql-fav-head');
    const headTitle = el('span'); headTitle.textContent = list.length + ' command' + (list.length===1?'':'s');
    const headHint = el('span'); headHint.textContent = 'Type "/" + shortcut  •  ↵ to open';
    head.append(headTitle, headHint);
    suggestEl.appendChild(head);
    const rows = [];
    list.slice(0, QLENS.CONFIG.MAX_FAVORITES).forEach((site, idx) => {
      const row = el('div', 'ql-sug-row');
      row.id = 'ql-sug-' + idx;
      row.setAttribute('role', 'option');
      row.setAttribute('aria-selected', 'false');
      row.dataset.favId = site.id;
      row.dataset.favUrl = site.url;
      row.dataset.favShortcut = site.shortcut;
      row.dataset.favRest = rest;
      row.style.setProperty('--i', idx);
      const icon = el('span', 'ql-fav-icon');
      const initial = (site.label.trim()[0] || site.shortcut[0] || '?').toUpperCase();
      icon.textContent = initial;
      icon.setAttribute('aria-hidden', 'true');
      const txtWrap = el('span', 'ql-sug-txt');
      const t = el('b', 'ql-sug-title'); t.textContent = site.label;
      const domain = (() => { try { return new URL(site.url).hostname.replace(/^www\./,''); } catch(e){ return site.url.replace(/^https?:\/\//,'').split('/')[0]; } })();
      const s = el('span', 'ql-fav-url'); s.textContent = domain;
      txtWrap.append(t, s);
      const tag = el('span', 'ql-fav-shortcut'); tag.textContent = '/' + site.shortcut;
      const arr = iconSvg(ICON_ARROW, 'ql-sug-arrow');
      row.append(icon, txtWrap, tag, arr);
      row.addEventListener('pointerenter', () => setHighlight(idx));
      row.addEventListener('click', () => {
        const url = buildFavoriteUrl(site, rest);
        if (QLENS.isSafeHttpUrl(url)) openTab(url, null, null);
      });
      suggestEl.appendChild(row);
      rows.push(row);
    });
    suggestions = rows;
    suggestionHighlight = -1;
    suggestEl.classList.add('is-open');
    inputEl.setAttribute('aria-expanded', 'true');
    const want = (rows.length + 1) * 48 + 12;
    const max = Math.max(180, Math.round(window.innerHeight * 0.46));
    setSuggestHeight(Math.min(want, max));
  }

  function launcherShouldRun(value, pre) {
    const v = String(value == null ? '' : value).trim();
    if (!v) return false;
    if (!launcherCfg().enabled || isFavoriteInput(value)) return false;
    if (pre && pre.bangChecked) {
      if (pre.bang) return false;
    } else if (typeof QLENS.parseBang === 'function' && QLENS.parseBang(value, getCustoms())) {
      return false;
    }
    if (pre && pre.prefixChecked) return !pre.prefix;
    return !QLENS.parsePrefix(value);
  }

  function updateInputState() {
    if (!host || !inputEl) return;
    const value = inputEl.value;
    if (selectionActive && value.trim() !== selectionText) {
      selectionActive = false;
      renderChip();
    }
    if (isFavoriteInput(value)) {
      clearLauncher();
      const after = value.trimStart().slice(1);
      renderFavoriteCommands(after);
      return;
    }
    if (typeof QLENS.parseBang === 'function') {
      const bang = QLENS.parseBang(value, getCustoms());
      if (bang) {
        clearLauncher();
        applyPrefix(bang);
        return;
      }
    }
    const parsed = QLENS.parsePrefix(value);
    if (parsed) {
      clearLauncher();
      applyPrefix(parsed);
      return;
    }
    // Parse once and hand the results down: launcherShouldRun re-parses the
    // same value on every keystroke today (regex + new URL + sanitize work).
    const customs = getCustoms();
    const pre = {
      bangChecked: typeof QLENS.parseBang === 'function',
      bang: typeof QLENS.parseBang === 'function' ? QLENS.parseBang(value, customs) : null,
      prefixChecked: true,
      prefix: QLENS.parsePrefix(value)
    };
    if (launcherShouldRun(value, pre)) scheduleLauncher();
    else clearLauncher();
    // Smart-URL check needs no second parse of bang/prefix (already done),
    // but detectSmartUrl is a single cheap pass — keep it direct.
    const site = QLENS.detectSmartUrl(value);
    if (site && !QLENS.isOwnHost(site, engineId)) {
      clearSuggestions(true);
      renderActionRow(site, value.trim());
    } else if (value.trim()) {
      hideAction();
      clearEmptyState();
      if (settings && settings.suggestions) {
        scheduleSuggestions();
      } else {
        clearSuggestions(true);
      }
    } else {
      hideAction();
      renderEmpty();
    }
  }

  function applyPrefix(parsed) {
    aiMode = false;
    userTouchedEngine = true;
    if (parsed.type === 'engine') {
      const known = QLENS.ENGINES[parsed.id]
        || (parsed.custom === true)
        || getCustoms().some((c) => c.id === parsed.id);
      if (known && parsed.id !== engineId) {
        setEngine(parsed.id);
      }
    }
    if (parsed.rest !== inputEl.value) {
      inputEl.value = parsed.rest;
      placeCaretEnd();
    }
    updateInputState();
  }

  function placeCaretEnd() {
    if (!inputEl) return;
    try {
      inputEl.setSelectionRange(inputEl.value.length, inputEl.value.length);
    } catch (err) {
      /* caret placement is best-effort */
    }
    updateCaret();
  }

  const CARET_TEXT_START = 50; /* input-row pad-left 20 + search icon 18 + gap 12 */

  let caretQueued = false;
  let measureCache = null;

  // One rAF per burst of keystrokes: updateCaret forces a sync layout
  // (getBoundingClientRect), so batch rapid input/click/focus events into
  // a single measure instead of one layout per event.
  function queueCaret() {
    if (caretQueued) return;
    caretQueued = true;
    const run = () => {
      caretQueued = false;
      updateCaret();
    };
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(run);
    else run();
  }

  function ensureMeasureEl() {
    if (measureEl || !root) return;
    measureEl = document.createElement('span');
    measureEl.style.position = 'absolute';
    measureEl.style.visibility = 'hidden';
    measureEl.style.whiteSpace = 'pre';
    measureEl.style.font = "600 16px/1 'QLens Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif";
    measureEl.style.letterSpacing = '-.012em';
    root.appendChild(measureEl);
  }

  function updateCaret() {
    if (!caretEl || !inputEl) return;
    if (fontsReady) caretEl.classList.remove('is-hidden');
    ensureMeasureEl();
    const idx = typeof inputEl.selectionStart === 'number' ? inputEl.selectionStart : inputEl.value.length;
    const text = inputEl.value.slice(0, idx);
    // Empty query and trailing-space-only edits reuse the cached zero width —
    // no layout read needed for the common just-opened state.
    if (!text) {
      caretEl.style.left = CARET_TEXT_START + 'px';
      measureCache = { text: '', width: 0 };
      return;
    }
    if (measureCache && measureCache.text === text) {
      caretEl.style.left = Math.round(CARET_TEXT_START + measureCache.width - (inputEl.scrollLeft || 0)) + 'px';
      return;
    }
    measureEl.textContent = text;
    const w = measureEl.getBoundingClientRect().width;
    measureCache = { text, width: w };
    caretEl.style.left = Math.round(CARET_TEXT_START + w - (inputEl.scrollLeft || 0)) + 'px';
  }

  function b64ToBytes(b64) {
    try {
      if (QLENS.ImageEngine && typeof QLENS.ImageEngine.base64ToBytes === 'function') {
        return QLENS.ImageEngine.base64ToBytes(b64);
      }
      const raw = globalThis.atob(b64);
      const n = raw.length;
      const out = new Uint8Array(n);
      for (let i = 0; i < n; i++) out[i] = raw.charCodeAt(i);
      return out;
    } catch (err) {
      return null;
    }
  }

  // Page CSP can block the chrome-extension: @font-face URL on strict sites
  // (github.com et al), and page-shipped "Inter" faces can override ours.
  // Unique family 'QLens Inter' + binary FontFace from the SW (zero-fetch,
  // CSP-exempt) guarantees the bundled font renders everywhere. Deferred
  // until after first paint so font decode never blocks the open animation.
  async function applyFonts() {
    if (fontsApplied) return;
    fontsApplied = true;
    const markReady = () => {
      fontsReady = true;
      try { if (host) host.setAttribute('data-fonts', 'ready'); } catch (e) {}
      measureCache = null;
      queueCaret();
    };
    try {
      if (typeof document.fonts !== 'undefined' && typeof document.fonts.check === 'function') {
        let present = true;
        try {
          present = [400, 500, 600, 700].every((w) => document.fonts.check(w + ' 16px "' + INTER_FAMILY + '"'));
        } catch (checkErr) {
          present = false;
        }
        if (present) {
          fontsReady = true;
          try { if (host) host.setAttribute('data-fonts', 'ready'); } catch (e) {}
          queueCaret();
          return;
        }
      }
    } catch (err) {
      /* check unsupported — fall through to binary path */
    }
    const load = async () => {
      let applied = 0;
      try {
        const resp = await chrome.runtime.sendMessage({ type: QLENS.MSG.FONT_FACE });
        if (resp && resp.ok === true && Array.isArray(resp.items) && typeof document.fonts !== 'undefined') {
          for (const item of resp.items) {
            if (!item || typeof item.weight !== 'number' || typeof item.base64 !== 'string') continue;
            const bytes = b64ToBytes(item.base64);
            if (!bytes) continue;
            try {
              const ff = new FontFace(INTER_FAMILY, bytes.buffer, { weight: String(item.weight), display: 'swap' });
              document.fonts.add(ff);
              applied++;
            } catch (err) {
              /* skip bad face */
            }
          }
        }
      } catch (err) {
        /* binary path failed — renamed @font-face is the fallback */
      }
      return applied;
    };
    try {
      const ric = (typeof window !== 'undefined' && window
        && typeof window.requestIdleCallback === 'function')
        ? window.requestIdleCallback.bind(window)
        : null;
      // The callback fires after close if the user dismisses fast — guard at
      // entry and before marking ready so no FONT_FACE fetch/decode runs
      // pointlessly on a dead overlay. The persistent font cache is untouched.
      if (ric) ric(() => { if (host) load().then(() => { if (host) markReady(); }); }, { timeout: 1500 });
      else setTimeout(() => { if (host) load().then(() => { if (host) markReady(); }); }, 0);
    } catch (err) {
      if (host) load();
    }
  }

  function focusInput(selectAll) {
    if (!inputEl) return;
    try {
      try {
        inputEl.focus({ preventScroll: true });
      } catch (focusErr) {
        inputEl.focus();
      }
    } catch (err) {
      return;
    }
    try {
      if (selectAll && inputEl.value) inputEl.select();
      else placeCaretEnd();
    } catch (err) {
      placeCaretEnd();
    }
    // Pages with aggressive focus stealers (Google, GitHub) can yank focus
    // back within a frame — re-assert over the next frames so the first
    // keystroke never gets lost.
    let attempts = 0;
    const ensure = () => {
      if (!host || !inputEl) return;
      let focused = false;
      try {
        focused = (root && root.activeElement === inputEl) || document.activeElement === host;
      } catch (err) {
        focused = false;
      }
      if (!focused) {
        try {
          try {
            inputEl.focus({ preventScroll: true });
          } catch (focusErr) {
            inputEl.focus();
          }
        } catch (err) {}
      }
      if (++attempts < 3 && host && inputEl) {
        if (typeof requestAnimationFrame === 'function') requestAnimationFrame(ensure);
        else setTimeout(ensure, 16);
      }
    };
    try {
      if (typeof requestAnimationFrame === 'function') requestAnimationFrame(ensure);
      else setTimeout(ensure, 16);
    } catch (err) {}
  }

  function suggestKey(value) {
    return String(value == null ? '' : value).trim().toLowerCase();
  }

  function suggestCacheGet(key) {
    if (!key) return null;
    const entry = suggestCache.get(key);
    if (!entry) return null;
    const ttl = (QLENS.CONFIG && QLENS.CONFIG.SUGGESTION_CACHE_TTL_MS) || 120000;
    try {
      if (Date.now() - entry.ts > ttl) suggestCache.delete(key);
      else return entry.results;
    } catch (err) {
      try { suggestCache.delete(key); } catch (e) {}
    }
    return null;
  }

  function suggestCacheSet(key, results) {
    if (!key || !Array.isArray(results)) return;
    const max = (QLENS.CONFIG && QLENS.CONFIG.SUGGESTION_CACHE_MAX) || 48;
    try {
      suggestCache.set(key, { results: results.slice(), ts: Date.now() });
      while (suggestCache.size > max) {
        const oldest = suggestCache.keys().next();
        if (oldest.done) break;
        suggestCache.delete(oldest.value);
      }
    } catch (err) {}
  }

  /* True when the pending query is still an extension or a shortening of the
     query the visible rows were built for. Both directions matter: typing
     forward ("goo" -> "googl") and backspacing ("googl" -> "goo") keep the
     previous completions relevant, and collapsing on either one is what made
     the panel jump while typing. */
  function suggestExtends(key) {
    const prev = lastSuggestKey;
    if (!prev || !key) return false;
    return key === prev || key.indexOf(prev) === 0 || prev.indexOf(key) === 0;
  }

  /* Provisional paint for the frame between a keystroke and its response:
     the best list available right now, never a smaller one. */
  function renderPendingSuggestions(value) {
    if (!host || !inputEl) return;
    const q = String(value == null ? '' : value);
    if (!q.trim()) return;
    const key = suggestKey(q);
    if (suggestExtends(key) && lastSuggestResults.length) {
      renderSuggestions(lastSuggestResults.filter((item) =>
        typeof item === 'string' && item.toLowerCase().indexOf(key) !== -1
      ), q);
      return;
    }
    if (!lastSuggestResults.length) {
      renderSuggestions([], q);
      return;
    }
    /* The query jumped somewhere unrelated (select-all and retype), so the
       old rows are meaningless. Drop them but hold the height until the new
       response lands so the panel does not visibly shrink. */
    renderSuggestions([], q);
  }

  function scheduleSuggestions() {
    clearTimeout(suggestionTimer);
    if (!host || !inputEl) return;
    const current = inputEl.value;
    if (!String(current == null ? '' : current).trim()) return;
    const key = suggestKey(current);
    // Cache hit: skip the debounce entirely and render on this frame.
    const cached = suggestCacheGet(key);
    if (cached) {
      finishSuggestionRequest();
      lastSuggestKey = key;
      lastSuggestResults = cached.slice();
      renderSuggestions(cached, current);
      return;
    }
    // From here on the visible list is provisional, so mark it as settling
    // before the first paint. Doing this here rather than in the fetch covers
    // the whole debounce window, not just the round trip.
    suggestInFlight = true;
    if (suggestEl) suggestEl.classList.add('is-updating');
    renderPendingSuggestions(current);
    const wait = (QLENS.validWait
      ? QLENS.validWait(QLENS.CONFIG.SUGGESTION_DEBOUNCE_MS, 60)
      : 60);
    suggestionTimer = setTimeout(() => {
      if (!host || !inputEl) return;
      fetchSuggestions(inputEl.value, engineId);
    }, wait);
  }

  function finishSuggestionRequest(reqId) {
    if (reqId != null && reqId !== suggestionReqId) return;
    if (!suggestInFlight) return;
    suggestInFlight = false;
    if (suggestEl) suggestEl.classList.remove('is-updating');
  }

  async function fetchSuggestions(query, engine) {
    const reqId = ++suggestionReqId;
    const key = suggestKey(query);
    const cached = suggestCacheGet(key);
    if (cached) {
      if (reqId !== suggestionReqId) return;
      finishSuggestionRequest(reqId);
      if (!host || !inputEl || inputEl.value.trim() !== String(query).trim()) return;
      renderSuggestions(cached, query);
      return;
    }
    suggestInFlight = true;
    if (suggestEl) suggestEl.classList.add('is-updating');
    let results = [];
    try {
      const resp = await chrome.runtime.sendMessage({
        type: QLENS.MSG.FETCH_SUGGESTIONS,
        payload: { engine, query, id: reqId }
      });
      if (resp && resp.ok && resp.id === reqId) {
        results = Array.isArray(resp.results) ? resp.results : [];
      }
    } catch (err) {
      results = [];
    }
    if (reqId !== suggestionReqId) return;
    finishSuggestionRequest(reqId);
    if (!host || !inputEl || inputEl.value.trim() !== String(query).trim()) return;
    if (results.length) suggestCacheSet(key, results);
    lastSuggestKey = key;
    lastSuggestResults = results.slice();
    renderSuggestions(results, query);
  }

  function setSuggestHeight(px) {
    suggestEl.style.maxHeight = px + 'px';
  }

  function clearSuggestions(keepLauncher) {
    if (!suggestEl) return;
    suggestEl.textContent = '';
    sugNodeByKey.clear();
    suggestEl.classList.remove('is-open');
    suggestions = keepLauncher ? launcherRows.slice() : [];
    suggestionHighlight = -1;
    if (inputEl) {
      try { inputEl.removeAttribute('aria-activedescendant'); } catch (e) {}
      if (!keepLauncher) {
        try { inputEl.setAttribute('aria-expanded', 'false'); } catch (e) {}
      }
    }
    /* Nothing is on screen for an in-flight request any more, so invalidate it
       rather than letting it paint over this state when it resolves. */
    suggestionReqId++;
    finishSuggestionRequest();
    suggestSettledHeight = 0;
  }

  function renderEmpty() {
    if (!host) return;
    clearSuggestions(true);
    if (launcherRows.length) {
      if (inputEl) {
        try { inputEl.setAttribute('aria-expanded', 'true'); } catch (e) {}
      }
      return;
    }
    const empty = el('div', 'ql-empty');
    empty.appendChild(iconSvg(ICON_RETICLE));
    const t = el('b');
    t.textContent = 'Type to search';
    const p = el('p');
    p.textContent = 'or select text on any page and open QLens to search from context. Type !bang to use a custom engine.';
    empty.append(t, p);
    suggestEl.appendChild(empty);
    suggestEl.classList.add('is-open');
    setSuggestHeight(150);
  }

  const SUG_SEARCH_KEY = '\u0000search';

  function createSugRow() {
    const row = el('div', 'ql-sug-row');
    row.setAttribute('role', 'option');
    row.setAttribute('aria-selected', 'false');
    const k = el('span', 'ql-sug-k');
    const txt = el('span', 'ql-sug-txt');
    const t = el('b', 'ql-sug-title');
    txt.append(t);
    row.append(k, txt, iconSvg(ICON_ARROW, 'ql-sug-arrow'));
    // Resolve the highlight position at event time: rows survive keystrokes,
    // so a captured index would drift as launcher and suggestion counts move.
    row.addEventListener('pointerenter', () => {
      const at = suggestions.indexOf(row);
      if (at !== -1) setHighlight(at);
    });
    row.addEventListener('click', () => submitQuery(row.dataset.query));
    return { row, k, t };
  }

  /* Rebuild the list by reusing every row that is still wanted and only
     touching the ones that changed. Node identity is preserved, so hover,
     scroll position and the height transition survive a keystroke instead of
     the whole list blinking out and back in. */
  function reconcileSugRows(items) {
    const rows = [];
    const kept = new Set();
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (kept.has(item.key)) continue;
      kept.add(item.key);
      let entry = sugNodeByKey.get(item.key);
      if (!entry || entry.row.parentNode !== suggestEl) {
        entry = createSugRow();
        sugNodeByKey.set(item.key, entry);
      }
      const row = entry.row;
      row.id = 'ql-sug-' + i;
      row.setAttribute('aria-selected', 'false');
      row.classList.remove('is-active');
      row.dataset.query = item.submit;
      row.style.setProperty('--i', i);
      entry.k.textContent = String(i + 1).padStart(2, '0');
      if (entry.t.textContent !== item.title) entry.t.textContent = item.title;
      // appendChild reorders an existing child in place.
      suggestEl.appendChild(row);
      rows.push(row);
    }
    for (const [key, entry] of sugNodeByKey) {
      if (kept.has(key)) continue;
      sugNodeByKey.delete(key);
      try {
        if (entry.row.parentNode === suggestEl) suggestEl.removeChild(entry.row);
      } catch (err) {}
    }
    return rows;
  }

  /* The empty-state block is appended straight into suggestEl and is not
     tracked by sugNodeByKey, so reconcileSugRows would leave it sitting above
     the rows. Drop it as soon as real results are painted. */
  function clearEmptyState() {
    if (!suggestEl) return;
    const empty = suggestEl.querySelector('.ql-empty');
    if (empty) empty.remove();
  }

  function renderSuggestions(list, query) {
    if (!host) return;
    hideAction();
    clearEmptyState();
    const items = [{
      key: SUG_SEARCH_KEY,
      title: 'Search for "' + query + '"',
      submit: query
    }];
    const seen = new Set([SUG_SEARCH_KEY]);
    const source = Array.isArray(list) ? list : [];
    const count = Math.min(source.length, QLENS.CONFIG.MAX_SUGGESTIONS);
    for (let i = 0; i < count; i++) {
      const text = String(source[i] == null ? '' : source[i]).trim();
      if (!text || seen.has(text)) continue;
      seen.add(text);
      items.push({ key: text, title: text, submit: text });
    }
    const rows = reconcileSugRows(items);
    suggestions = launcherRows.concat(rows);
    suggestionHighlight = -1;
    if (inputEl) {
      try { inputEl.removeAttribute('aria-activedescendant'); } catch (e) {}
    }
    suggestEl.classList.add('is-open');
    inputEl.setAttribute('aria-expanded', 'true');
    const want = rows.length * 48 + 6;
    const max = Math.max(180, Math.round(window.innerHeight * 0.46));
    const target = Math.min(want, max);
    /* Hold the last settled height while a request is in flight so the panel
       never visibly collapses between keystroke and response. */
    setSuggestHeight(suggestInFlight ? Math.max(target, suggestSettledHeight) : target);
    if (!suggestInFlight) suggestSettledHeight = target;
  }

  let launcherCfgMemo = null;
  let launcherCfgKey = null;

  // Same story as getCustoms: sanitizeLauncher allocates a fresh object and
  // runs per keystroke via launcherShouldRun(). Keyed on `settings` identity.
  function launcherCfg() {
    if (settings && launcherCfgKey === settings) return launcherCfgMemo;
    let cfg = null;
    try {
      if (settings && settings.launcher && typeof QLENS.sanitizeLauncher === 'function') {
        cfg = QLENS.sanitizeLauncher(settings.launcher);
      }
    } catch (err) {}
    if (!cfg) {
      try {
        const d = QLENS.CONFIG && QLENS.CONFIG.DEFAULT_SETTINGS && QLENS.CONFIG.DEFAULT_SETTINGS.launcher;
        if (d && typeof QLENS.sanitizeLauncher === 'function') cfg = QLENS.sanitizeLauncher(d);
      } catch (err) {}
    }
    if (!cfg) cfg = { enabled: true, tabs: true, bookmarks: true, history: true, maxResults: 6 };
    if (settings) {
      launcherCfgKey = settings;
      launcherCfgMemo = cfg;
    }
    return cfg;
  }

  function clearLauncher(keepState) {
    try { clearTimeout(launcherTimer); } catch (err) {}
    launcherTimer = null;
    if (launchEl) {
      launchEl.textContent = '';
      launchEl.classList.remove('is-open');
      launchEl.classList.remove('is-updating');
      launchEl.style.maxHeight = '';
    }
    launcherRows = [];
    if (!keepState) launcherItems = [];
  }

  function launcherKindLabel(kind) {
    if (kind === 'tab') return 'Open tabs';
    if (kind === 'bookmark') return 'Bookmarks';
    return 'History';
  }

  function launcherKindIcon(kind) {
    if (kind === 'tab') {
      return '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4.5" width="18" height="13" rx="2"/><path d="M8 21h8M12 17.5V21"/></svg>';
    }
    if (kind === 'bookmark') {
      return '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 3.5h12v17l-6-4-6 4z"/></svg>';
    }
    return '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3.5 2"/></svg>';
  }

  function activateLauncherRow(row, shiftKey) {
    if (!row || !row.dataset) return;
    const kind = row.dataset.launchKind;
    const url = row.dataset.launchUrl || '';
    const tabId = row.dataset.launchTabId != null && row.dataset.launchTabId !== '' ? Number(row.dataset.launchTabId) : NaN;
    if (kind === 'tab' && Number.isFinite(tabId)) {
      if (shiftKey) {
        try {
          const res = chrome.runtime.sendMessage({ type: QLENS.MSG.LAUNCHER_CLOSE, payload: { tabId } });
          if (res && typeof res.catch === 'function') res.catch(() => {});
        } catch (err) {}
        removeLauncherRow(tabId);
        return;
      }
      try {
        const res = chrome.runtime.sendMessage({ type: QLENS.MSG.LAUNCHER_ACTIVATE, payload: { tabId } });
        if (res && typeof res.catch === 'function') res.catch(() => {});
      } catch (err) {}
      try { destroy(false); } catch (e) { try { destroy(false); } catch (_) {} }
      return;
    }
    if (QLENS.isSafeHttpUrl(url)) openTab(url, null, null);
  }

  function removeLauncherRow(tabId) {
    launcherItems = launcherItems.filter((it) => it.tabId !== tabId);
    renderLauncher(launcherItems);
  }

  function renderLauncher(list) {
    if (!host || !launchEl) return;
    clearTimeout(launcherTimer);
    launcherTimer = null;
    launcherItems = Array.isArray(list) ? list.slice() : [];
    launcherRows = [];
    launchEl.textContent = '';
    if (!launcherItems.length) {
      launchEl.classList.remove('is-open');
      launchEl.style.maxHeight = '';
      suggestions = suggestEl ? Array.from(suggestEl.querySelectorAll('.ql-sug-row')) : [];
      suggestionHighlight = -1;
      return;
    }
    const kindsInOrder = ['tab', 'bookmark', 'history'];
    const grouped = kindsInOrder
      .map((k) => ({ kind: k, items: launcherItems.filter((it) => it && it.kind === k) }))
      .filter((g) => g.items.length);
    let idx = 0;
    for (const g of grouped) {
      const head = el('div', 'ql-launch-head');
      head.textContent = launcherKindLabel(g.kind);
      head.setAttribute('aria-hidden', 'true');
      launchEl.appendChild(head);
      for (const item of g.items) {
        if (idx >= launcherItems.length) break;
        const row = el('div', 'ql-sug-row is-launcher');
        row.id = 'ql-launch-' + idx;
        row.setAttribute('role', 'option');
        row.setAttribute('aria-selected', 'false');
        row.dataset.launchKind = item.kind;
        row.dataset.launchUrl = item.url;
        if (typeof item.tabId === 'number') row.dataset.launchTabId = String(item.tabId);
        if (item.id != null) row.dataset.launchId = String(item.id);
        row.style.setProperty('--i', idx);
        const badge = el('span', 'ql-launch-icon');
        badge.setAttribute('aria-hidden', 'true');
        try {
          if (!(QLENS.setIcon && QLENS.setIcon(badge, launcherKindIcon(item.kind)))) badge.textContent = '';
        } catch (err) { try { badge.textContent = ''; } catch (e2) {} }
        const txtWrap = el('span', 'ql-sug-txt');
        const t = el('b', 'ql-sug-title');
        t.textContent = item.title || item.url;
        const u = el('span', 'ql-launch-url');
        u.textContent = item.url;
        txtWrap.append(t, u);
        const arr = iconSvg(ICON_ARROW, 'ql-sug-arrow');
        row.append(badge, txtWrap, arr);
        const rowIdx = idx;
        row.addEventListener('pointerenter', () => setHighlight(rowIdx));
        row.addEventListener('click', (e) => activateLauncherRow(row, Boolean(e && e.shiftKey)));
        launchEl.appendChild(row);
        launcherRows.push(row);
        idx++;
      }
    }
    launcherRows.forEach((row, i) => { row.id = 'ql-launch-' + i; });
    launchEl.classList.add('is-open');
    sizeLauncher(grouped);
    rebuildHighlightList();
    if (!inputEl.value.trim()) {
      renderEmpty();
    }
  }

  function sizeLauncher(grouped) {
    if (!launchEl) return;
    const rows = launcherRows.length;
    const heads = grouped ? grouped.length : 0;
    const want = rows * 52 + heads * 26 + 8;
    let maxH = 150;
    try {
      maxH = Math.max(150, Math.round(window.innerHeight * 0.3));
      const launchTop = launchEl.getBoundingClientRect().top;
      const footH = 64;
      const avail = Math.round(window.innerHeight - launchTop - footH - 24);
      if (isFinite(avail) && avail > 150) maxH = Math.min(maxH, avail);
    } catch (err) {
      /* viewport math is best-effort */
    }
    launchEl.style.maxHeight = Math.min(want, maxH) + 'px';
  }

  function rebuildHighlightList() {
    const keepId = suggestionHighlight >= 0 && suggestions[suggestionHighlight] ? suggestions[suggestionHighlight].id : null;
    suggestions = launcherRows.concat(suggestEl ? Array.from(suggestEl.querySelectorAll('.ql-sug-row')) : []);
    launcherRows.forEach((row, i) => { row.id = 'ql-launch-' + i; });
    if (keepId) {
      const next = suggestions.findIndex((r) => r.id === keepId);
      suggestionHighlight = next;
      setHighlight(next);
    } else {
      suggestionHighlight = -1;
      if (inputEl) {
        try { inputEl.removeAttribute('aria-activedescendant'); } catch (e) {}
      }
    }
  }

  function launcherCacheGet(key) {
    if (!key) return null;
    const entry = launcherCache.get(key);
    if (!entry) return null;
    // Tab/bookmark rows go stale in seconds (SW memos them 1-5s); reusing the
    // 120s suggestion TTL here would show closed tabs for up to 2 minutes.
    const ttl = (QLENS.CONFIG && QLENS.CONFIG.LAUNCHER_CACHE_TTL_MS) || 5000;
    try {
      if (Date.now() - entry.ts > ttl) launcherCache.delete(key);
      else return entry.items;
    } catch (err) {
      try { launcherCache.delete(key); } catch (e) {}
    }
    return null;
  }

  function launcherCacheSet(key, items) {
    if (!key || !Array.isArray(items)) return;
    // Never cache empties: a transient SW error would suppress the launcher
    // for the full TTL. The render path already handles empty without cache.
    if (!items.length) return;
    const max = (QLENS.CONFIG && QLENS.CONFIG.SUGGESTION_CACHE_MAX) || 48;
    try {
      launcherCache.set(key, { items: items.slice(), ts: Date.now() });
      while (launcherCache.size > max) {
        const oldest = launcherCache.keys().next();
        if (oldest.done) break;
        launcherCache.delete(oldest.value);
      }
    } catch (err) {}
  }

  function scheduleLauncher() {
    clearTimeout(launcherTimer);
    if (!host || !inputEl) return;
    const value = String(inputEl.value == null ? '' : inputEl.value).trim();
    if (!value) return;
    if (value.length < 2) {
      clearLauncher();
      rebuildHighlightList();
      return;
    }
    /* Serve a repeat query on this frame instead of after a debounce plus a
       round trip, so the tab rows and the suggestion rows resize together
       rather than one frame apart. */
    const cached = launcherCacheGet(value.toLowerCase());
    if (cached) {
      renderLauncher(cached);
      return;
    }
    const debounce = (QLENS.validWait
      ? QLENS.validWait(QLENS.CONFIG.LAUNCHER_DEBOUNCE_MS, 220)
      : 220);
    launcherTimer = setTimeout(() => {
      if (!host || !inputEl) return;
      fetchLauncher(inputEl.value);
    }, debounce);
  }

  async function fetchLauncher(query) {
    const q = String(query == null ? '' : query);
    const cfg = launcherCfg();
    if (!cfg.enabled) {
      clearLauncher();
      rebuildHighlightList();
      return;
    }
    const reqId = ++launcherReqId;
    const cached = launcherCacheGet(q.trim().toLowerCase());
    if (cached) {
      if (reqId !== launcherReqId) return;
      if (!host || !inputEl || inputEl.value !== q) return;
      renderLauncher(cached);
      return;
    }
    if (launchEl) launchEl.classList.add('is-updating');
    let results = [];
    try {
      const resp = await chrome.runtime.sendMessage({
        type: QLENS.MSG.LAUNCHER_QUERY,
        payload: { query: q, id: reqId, launcher: cfg }
      });
      if (resp && resp.ok && resp.id === reqId) {
        results = Array.isArray(resp.results) ? resp.results : [];
      }
    } catch (err) {
      results = [];
    }
    if (reqId !== launcherReqId) return;
    if (launchEl) launchEl.classList.remove('is-updating');
    if (!host || !inputEl) return;
    if (inputEl.value !== q) return;
    const cleaned = results.filter((it) => it && typeof it.url === 'string' && QLENS.isSafeHttpUrl(it.url));
    launcherCacheSet(q.trim().toLowerCase(), cleaned);
    renderLauncher(cleaned);
  }

  function moveHighlight(dir) {
    if (!suggestions.length) return;
    const n = suggestions.length;
    let idx = suggestionHighlight + dir;
    if (idx < 0) idx = n - 1;
    if (idx >= n) idx = 0;
    setHighlight(idx);
  }

  function setHighlight(idx) {
    const idxChanged = idx !== suggestionHighlight;
    // Unchanged selection: classes, aria and scroll are already correct.
    // Skips a full row loop plus a forced layout (scrollIntoView) per
    // Arrow/pointerenter repeat.
    if (!idxChanged) return;
    for (let i = 0; i < suggestions.length; i++) {
      const on = i === idx;
      suggestions[i].classList.toggle('is-active', on);
      suggestions[i].setAttribute('aria-selected', String(on));
    }
    suggestionHighlight = idx;
    if (idx >= 0 && suggestions[idx]) {
      inputEl.setAttribute('aria-activedescendant', suggestions[idx].id);
      if (idxChanged) {
        try {
          suggestions[idx].scrollIntoView({ block: 'nearest' });
        } catch (err) {
          /* scrolling is best-effort */
        }
      }
    } else {
      inputEl.removeAttribute('aria-activedescendant');
    }
  }

  function renderActionRow(site, label) {
    if (!host) return;
    hideAction();
    smartZone.textContent = '';
    actionSite = site;
    const btn = el('button', 'ql-smarturl');
    btn.type = 'button';
    btn.dataset.action = 'site';
    btn.appendChild(iconSvg(ICON_GLOBE));
    const t = el('b');
    t.textContent = 'Go to ' + label;
    const s = el('span', 'ql-smart-sub');
    const spec = resolveEngine(engineId).spec;
    s.textContent = (spec ? spec.name : '') + (aiMode ? ' AI' : '') + ' \u00b7 opens in new tab';
    btn.append(t, s);
    btn.addEventListener('click', () => goToSite(site));
    smartZone.appendChild(btn);
    smartZone.classList.add('is-open');
  }

  function hideAction() {
    actionSite = null;
    if (smartZone) {
      smartZone.textContent = '';
      smartZone.classList.remove('is-open');
    }
  }

  function submitQuery(query, engineOverride) {
    const q = String(query == null ? '' : query).trim();
    if (!q) return;
    if (attachment) {
      searchImage();
      return;
    }
    const engine = engineOverride || engineId;
    if (!engineOverride) {
      try { QLENS.storage.setLastEngine(engine); } catch (err) {}
    }
    let url = null;
    try {
      if (!QLENS.ENGINES[engine]) {
        url = customSearchUrl(engine, q);
      }
      if (!url) url = QLENS.buildSearchUrl(engine, q, null, aiMode, getCustoms());
    } catch (err) {
      url = null;
    }
    if (!url) return;
    openTab(url, q, engine);
  }

  function goToSite(url) {
    if (!QLENS.isSafeHttpUrl(url)) return;
    openTab(url, null, null);
  }

  function openTab(url, query, engine) {
    const payload = { url };
    if (query) payload.query = query;
    if (engine) payload.engine = engine;
    // Destroy synchronously BEFORE the tabs.create round trip (AGENTS.md):
    // the overlay, its listeners and the focus loop must not outlive submit.
    try { destroy(false); } catch (err) {}
    try {
      chrome.runtime.sendMessage({ type: QLENS.MSG.OPEN_TAB, payload }).then((res) => {
        if (res && res.ok === false) {
          showError('Could not open a new tab.');
        }
      }).catch(() => {
        showError('Could not open a new tab.');
      });
    } catch (err) {
      showError('Could not open a new tab.');
    }
  }

  function show(payload) {
    if (closing) {
      try { clearTimeout(removeTimer); } catch (err) {}
      removeTimer = null;
      try {
        if (panel) panel.classList.remove('ql-out');
        if (backdropEl) backdropEl.classList.remove('ql-out');
        if (viewportFrameEl) viewportFrameEl.classList.remove('ql-out');
      } catch (err) {}
      closing = false;
      focusInput();
      return;
    }
    if (host) {
      try {
        if (host.isConnected) return;
      } catch (err) {
        return;
      }
      try { removeHost(); } catch (err) {}
      host = null;
    }
    prevFocusEl = document.activeElement;
    engineId = QLENS.CONFIG.DEFAULT_SETTINGS.defaultEngine;
    initialEngineId = engineId;
    aiMode = false;
    actionSite = null;
    suggestions = [];
    suggestionHighlight = -1;
    launcherRows = [];
    launcherItems = [];
    lastSuggestKey = '';
    lastSuggestResults = [];
    sugNodeByKey.clear();
    suggestSettledHeight = 0;
    suggestInFlight = false;
    launcherCache.clear();
    launcherReqId++;
    selectionText = null;
    selectionActive = false;
    attachment = null;
    uploading = false;
    pendingSearch = false;
    dragDepth = 0;
    dropHintEl = null;
    attachGen++;
    settings = null;
    engineOrder = QLENS.CONFIG.DEFAULT_SETTINGS.engineOrder.slice();

    const p = payload || {};
    const pre = p.settings && typeof p.settings === 'object' && Array.isArray(p.settings.engineOrder)
      ? p.settings
      : null;
    if (pre) {
      settings = pre;
      const knownCustom = typeof QLENS.getCustomEngines === 'function'
        ? QLENS.getCustomEngines(pre).map((c) => c.id)
        : [];
      const order = pre.engineOrder.filter((id) => QLENS.ENGINES[id] || knownCustom.includes(id));
      if (order.length) engineOrder = order;
      let last = null;
      if (typeof p.lastEngine === 'string' && p.lastEngine) {
        if (engineOrder.includes(p.lastEngine)) {
          last = p.lastEngine;
        } else if (QLENS.ENGINES[p.lastEngine] || knownCustom.includes(p.lastEngine)) {
          engineOrder.push(p.lastEngine);
          last = p.lastEngine;
        }
      }
      if (last) {
        engineId = last;
        initialEngineId = last;
      }
    }
    const maxSel = pre ? pre.maxSelection : QLENS.CONFIG.DEFAULT_SETTINGS.maxSelection;

    let text = null;
    if (typeof p.selection === 'string' && p.selection.trim()) {
      text = QLENS.Selection.truncate(p.selection, maxSel);
    } else {
      text = QLENS.Selection.capture(maxSel);
    }

    try {
      build();
      applyFonts();
      if (pre) applyTheme(pre);
      updateViewportFrame();
      updateFootEngine();
      if (text) {
        selectionText = text;
        selectionActive = true;
        inputEl.value = text;
      }
      renderChip();
      focusInput();
      updateInputState();
      hydrate();
    } catch (err) {
      try { removeHost(); } catch (e2) {}
      host = null;
      root = null;
      panel = null;
      throw err;
    }
  }

  async function hydrate() {    if (!settings) {
      // One storage round trip, not two: getLastEngine() falls back to
      // settings.defaultEngine anyway, so derive it from the settings read.
      let s = null;
      try {
        s = await QLENS.storage.getSettings();
      } catch (err) {
        try { s = JSON.parse(JSON.stringify(QLENS.CONFIG.DEFAULT_SETTINGS)); } catch (e2) { s = QLENS.CONFIG.DEFAULT_SETTINGS; }
      }
      if (!host) return;
      settings = s;
      engineOrder = s.engineOrder.slice();
      renderPills();
      updateFootEngine();
      applyTheme(s);
      updateViewportFrame();
      if (!launcherCfg().enabled) {
        clearLauncher();
        rebuildHighlightList();
      } else if (inputEl && inputEl.value && launcherShouldRun(inputEl.value)) {
        scheduleLauncher();
      }
      if (engineId === initialEngineId && !userTouchedEngine) {
        try {
          const last = await QLENS.storage.getLastEngine(settings);
          if (!host) return;
          setEngine(last, false);
        } catch (err) {}
      }
    } else {
      updateViewportFrame();
    }
    const s = settings;
    if (selectionActive && inputEl.value) {
      const t = QLENS.Selection.truncate(selectionText, s.maxSelection);
      if (t !== inputEl.value) {
        inputEl.value = t;
        placeCaretEnd();
        updateInputState();
      }
    }
    renderChip();
    if (s.autoCopySelection && selectionActive && selectionText) {
      try {
        await navigator.clipboard.writeText(selectionText);
      } catch (err) {
        /* clipboard denied — silently skipped */
      }
    }
    if (s.blurClose) {
      root.addEventListener('focusout', onFocusOut);
    }
  }

  function onFocusOut(e) {
    if (!settings || !settings.blurClose) return;
    const related = e.relatedTarget;
    if (related && host && host.contains(related)) return;
    try { clearTimeout(focusOutTimer); } catch (err) {}
    focusOutTimer = setTimeout(() => {
      focusOutTimer = null;
      if (!host) return;
      const active = document.activeElement;
      if (!host.contains(active)) destroy(true);
    }, 0);
  }

  function destroy(animate) {
    if (!host || closing) return;
    closing = true;
    clearTimeout(suggestionTimer);
    suggestionTimer = null;
    clearTimeout(launcherTimer);
    launcherTimer = null;
    try { clearTimeout(focusOutTimer); } catch (err) {}
    focusOutTimer = null;
    suggestionReqId++;
    launcherReqId++;
    let reduced = false;
    try {
      reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch (err) {
      reduced = false;
    }
    if (animate && !reduced) {
      panel.classList.add('ql-out');
      if (backdropEl) backdropEl.classList.add('ql-out');
      if (viewportFrameEl) viewportFrameEl.classList.add('ql-out');
      removeTimer = setTimeout(removeHost, 90);
    } else {
      removeHost();
    }
  }

  function removeHost() {
    window.removeEventListener('keydown', onWindowCaptureKey, true);
    window.removeEventListener('keydown', onWindowKey, true);
    window.removeEventListener('keyup', onWindowKey, true);
    if (host && host.parentNode) {
      try {
        host.parentNode.removeChild(host);
      } catch (err) {
        /* host already detached */
      }
    }
    host = null;
    root = null;
    panel = null;
    backdropEl = null;
    viewportFrameEl = null;
    inputEl = null;
    chipZoneEl = null;
    closeBtn = null;
    pillZone = null;
    pillsRow = null;
    aiPillEl = null;
    smartZone = null;
    suggestEl = null;
    launchEl = null;
    footEngine = null;
    imgBtn = null;
    fileInput = null;
    errEl = null;
    caretEl = null;
    measureEl = null;
    caretQueued = false;
    measureCache = null;
    closing = false;
    suggestions = [];
    suggestionHighlight = -1;
    launcherRows = [];
    launcherItems = [];
    launcherTimer = null;
    clearTimeout(toastTimer);
    toastTimer = null;
    dragDepth = 0;
    uploading = false;
    dropHintEl = null;
    attachGen++;
    removeImage();
    restoreFocus();
  }

  function restoreFocus() {
    const target = prevFocusEl;
    prevFocusEl = null;
    if (target && target.isConnected && typeof target.focus === 'function') {
      try {
        target.focus();
      } catch (err) {
        /* focus restore is best-effort */
      }
    }
  }

  return {
    show,
    destroy,
    isVisible: () => {
      try {
        return Boolean(host && host.isConnected);
      } catch (err) {
        return Boolean(host);
      }
    }
  };
})();

QLENS.Overlay = Overlay;