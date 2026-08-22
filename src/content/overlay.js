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
  --ql-text-faint: rgba(214, 224, 243, .52);
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
  --ql-space-1: 4px;
  --ql-space-2: 8px;
  --ql-space-3: 12px;
  --ql-space-4: 16px;
  --ql-space-5: 20px;
  --ql-space-6: 24px;
  --ql-radius-sm: 6px;
  --ql-radius-md: 10px;
  --ql-radius-lg: 14px;
  --ql-radius-input: 16px;
  --ql-radius-card: 20px;
  --ql-radius-img: 10px;
  --ql-radius-img: 10px;
  --ql-radius-full: 999px;
  --ql-dur-fast: 140ms;
  --ql-dur-med: 240ms;
  --ql-dur-enter: 200ms;
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
  --ql-text-faint: rgba(23, 28, 45, .5);
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
    --ql-text-faint: rgba(23, 28, 45, .5);
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
  background:
    radial-gradient(1100px 560px at 12% -10%, rgba(var(--ql-accent-rgb), .08), transparent 62%),
    radial-gradient(900px 520px at 112% 112%, rgba(var(--ql-accent-rgb), .05), transparent 60%),
    var(--ql-backdrop-bg);
    -webkit-backdrop-filter: blur(var(--ql-backdrop-blur)) saturate(1.15);
  backdrop-filter: blur(var(--ql-backdrop-blur)) saturate(1.15);
  animation: ql-backdrop-in 160ms var(--ql-ease-out) both;
}

.ql-backdrop::after {
  content: '';
  position: absolute;
  inset: 0;
  opacity: calc(var(--ql-noise-opacity) * .55);
  mix-blend-mode: soft-light;
  pointer-events: none;
  background-image: ${NOISE_SVG};
}

@keyframes ql-backdrop-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
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
  will-change: opacity;
  animation: ql-frame-in 420ms cubic-bezier(0.32,0.72,0,1) 30ms both;
}
.ql-viewport-frame.ql-out {
  animation: ql-frame-out 140ms ease forwards;
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
  transform-origin: 50% 60%;
  animation: ql-panel-in var(--ql-dur-enter) var(--ql-ease-spring) 20ms both;
}

.ql-panel.ql-out {
  animation: ql-panel-out 120ms ease forwards;
}

@keyframes ql-panel-in {
  from { opacity: 0; transform: translate(-50%, -46%) scale(.94); }
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

.ql-aurora {
  position: absolute;
  inset: 0;
  overflow: hidden;
}

.ql-orb {
  position: absolute;
  border-radius: 50%;
  will-change: transform;
}

.ql-orb-a {
  top: -110px;
  left: 50%;
  width: 560px;
  height: 280px;
  margin-left: -280px;
  background: rgb(var(--ql-accent-rgb));
  opacity: var(--ql-aurora-alpha);
  filter: blur(72px);
  transition: background-color .5s;
  animation: ql-drift-a 15s ease-in-out infinite alternate;
}

.ql-orb-b {
  top: 38%;
  right: -90px;
  width: 300px;
  height: 300px;
  background: rgba(var(--ql-accent-rgb), .5);
  opacity: calc(var(--ql-aurora-alpha) * .75);
  filter: blur(64px);
  transition: background-color .5s;
  animation: ql-drift-b 19s ease-in-out infinite alternate;
}

.ql-orb-c {
  bottom: -150px;
  left: -110px;
  width: 400px;
  height: 400px;
  background: var(--ql-aurora-3);
  opacity: .45;
  filter: blur(70px);
  animation: ql-drift-c 23s ease-in-out infinite alternate;
}

@keyframes ql-drift-a {
  from { transform: translate3d(-28px, 0, 0) scale(1); }
  to { transform: translate3d(36px, 18px, 0) scale(1.12); }
}
@keyframes ql-drift-b {
  from { transform: translate3d(0, 10px, 0) scale(1); }
  to { transform: translate3d(-24px, -18px, 0) scale(1.08); }
}
@keyframes ql-drift-c {
  from { transform: translate3d(0, 0, 0) scale(1); }
  to { transform: translate3d(26px, -14px, 0) scale(1.1); }
}

.ql-tint {
  position: absolute;
  inset: 0;
  background: var(--ql-glass-tint);
  -webkit-backdrop-filter: blur(var(--ql-glass-blur)) saturate(1.2);
  backdrop-filter: blur(var(--ql-glass-blur)) saturate(1.2);
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
  background: radial-gradient(closest-side, rgba(var(--ql-accent-rgb), .55), transparent 72%);
  filter: blur(28px);
  pointer-events: none;
  opacity: 0;
  transform: scale(.8);
  animation: ql-glow-in .3s var(--ql-ease-out) 200ms backwards;
}

@keyframes ql-glow-in {
  from { opacity: 0; transform: scale(.7); }
}

.ql-content:has(.ql-input-row:focus-within) .ql-glow {
  opacity: .45;
  transform: scale(1);
  transition: opacity .5s var(--ql-ease-out), transform .5s var(--ql-ease-spring);
}

/* ---------- input row ---------- */
.ql-input-row {
  position: relative;
  display: flex;
  align-items: center;
  gap: var(--ql-space-3);
  height: var(--ql-input-h);
  padding: 0 var(--ql-space-2) 0 var(--ql-space-5);
  border-radius: var(--ql-radius-input);
  background: var(--ql-liner);
  border: 1px solid var(--ql-hairline);
  transition: box-shadow var(--ql-dur-fast) var(--ql-ease-out), background var(--ql-dur-fast), border-color var(--ql-dur-fast);
  animation: ql-rise-in .22s var(--ql-ease-out) 60ms backwards;
}

.ql-input-row:focus-within {
  border-color: rgba(var(--ql-accent-rgb), .45);
  background: var(--ql-liner-hover);
  box-shadow: 0 0 0 3px rgba(var(--ql-accent-rgb), .22), 0 10px 30px -14px rgba(var(--ql-accent-rgb), .5);
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
  color: var(--ql-text-faint);
  transition: color var(--ql-dur-fast);
}

.ql-input-row:focus-within .ql-ic-search {
  color: var(--ql-accent);
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
  caret-color: transparent;
  cursor: text;
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
  height: 22px;
  border-radius: 2px;
  background: var(--ql-caret);
  box-shadow: 0 0 10px rgba(var(--ql-accent-rgb), .5);
  transform: translate(-50%, -50%);
  opacity: 1;
  pointer-events: none;
  z-index: 1;
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
  padding: var(--ql-space-3) 0 var(--ql-space-4);
  animation: ql-rise-in .24s var(--ql-ease-out) 100ms backwards;
}

.ql-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.ql-pill {
  display: inline-flex;
  align-items: center;
  gap: var(--ql-space-2);
  height: 36px;
  padding: 0 var(--ql-space-4) 0 var(--ql-space-3);
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
  background: linear-gradient(180deg, color-mix(in srgb, var(--ql-accent) 88%, #fff 12%), var(--ql-accent));
  color: var(--ql-accent-ink);
  font-weight: 700;
  border-color: transparent;
  box-shadow: 0 6px 18px -8px rgba(var(--ql-accent-rgb), .65), inset 0 1px 0 rgba(255, 255, 255, .25);
  animation: ql-pill-pop .28s var(--ql-ease-spring);
}

@keyframes ql-pill-pop {
  0% { transform: scale(1); }
  35% { transform: scale(1.07); }
  100% { transform: scale(1); }
}

.ql-pill-badge {
  width: 18px;
  height: 18px;
  border-radius: 5px;
  display: grid;
  place-items: center;
  background: var(--ql-badge-bg);
  border: 1px solid var(--ql-badge-border);
}

.ql-pill-badge .ql-icon,
.ql-pill-badge svg {
  width: 16px;
  height: 16px;
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

.ql-pill-rail {
  position: absolute;
  left: var(--ql-space-3);
  right: var(--ql-space-3);
  bottom: 13px;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--ql-hairline) 12%, var(--ql-hairline) 88%, transparent);
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
  background: linear-gradient(180deg, color-mix(in srgb, var(--ql-accent) 88%, #fff 12%), var(--ql-accent));
  color: var(--ql-accent-ink);
  border-color: transparent;
  border-style: solid;
  box-shadow: 0 6px 18px -8px rgba(var(--ql-accent-rgb), .65), inset 0 1px 0 rgba(255, 255, 255, .25);
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
  animation: ql-rise-in .26s var(--ql-ease-out) calc(var(--i) * 30ms) backwards;
  transition: background var(--ql-dur-fast), transform var(--ql-dur-fast);
}

.ql-sug-row:hover,
.ql-sug-row.is-active {
  background: rgba(var(--ql-accent-rgb), .1);
}

.ql-sug-row.is-active {
  box-shadow: inset 2px 0 0 var(--ql-accent);
  transform: translateX(2px);
}

.ql-sug-row:active {
  transform: scale(.995);
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
  animation: ql-rise-in .24s var(--ql-ease-out) 140ms backwards;
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
  wrap.innerHTML = markup;
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
  let footEngine = null;
  let prevFocusEl = null;
  let settings = null;
  let engineId = null;
  let initialEngineId = null;
  let modeId = null;
  let aiMode = false;
  let engineOrder = [];
  let suggestionTimer = null;
  let aiPillEl = null;
  let suggestionReqId = 0;
  let suggestions = [];
  let suggestionHighlight = -1;
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
  let closing = false;
  let fontsApplied = false;

  function el(tag, cls, text) {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text != null) node.textContent = text;
    return node;
  }

  function applyStyles(shadow) {
    if (typeof CSSStyleSheet !== 'undefined' && 'adoptedStyleSheets' in shadow) {
      try {
        const sheet = new CSSStyleSheet();
        sheet.replaceSync(CSS);
        shadow.adoptedStyleSheets = [sheet];
        return;
      } catch (err) {
        /* fall through to style element */
      }
    }
    const style = document.createElement('style');
    style.textContent = CSS;
    shadow.appendChild(style);
  }

  function svgLogo(id) {
    return QLENS.LOGOS[id] || '';
  }

  function build() {
    host = document.createElement('div');
    host.setAttribute('role', 'dialog');
    host.setAttribute('aria-modal', 'true');
    host.setAttribute('aria-label', 'QLens quick search');
    root = host.attachShadow({ mode: 'open' });
    applyStyles(root);

    backdropEl = el('div', 'ql-backdrop');
    root.appendChild(backdropEl);

    viewportFrameEl = el('div', 'ql-viewport-frame');
    viewportFrameEl.setAttribute('aria-hidden', 'true');
    root.appendChild(viewportFrameEl);

    panel = el('div', 'ql-panel');
    root.appendChild(panel);

    const aurora = el('div', 'ql-aurora');
    aurora.appendChild(el('span', 'ql-orb ql-orb-a'));
    aurora.appendChild(el('span', 'ql-orb ql-orb-b'));
    aurora.appendChild(el('span', 'ql-orb ql-orb-c'));
    panel.appendChild(aurora);

    panel.appendChild(el('div', 'ql-tint'));

    const content = el('div', 'ql-content');
    panel.appendChild(content);

    content.appendChild(el('div', 'ql-glow'));

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

    caretEl = el('span', 'ql-caret');
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
    pillZone.appendChild(el('span', 'ql-pill-rail'));
    content.appendChild(pillZone);

    smartZone = el('div', 'ql-smart-zone');
    content.appendChild(smartZone);

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
      const eng = QLENS.ENGINES[id];
      if (!eng) continue;
      const pill = el('button', 'ql-pill');
      pill.type = 'button';
      pill.dataset.engine = id;
      pill.setAttribute('role', 'radio');
      pill.setAttribute('aria-label', 'Search with ' + eng.name);
      pill.tabIndex = -1;
      const on = id === engineId && !modeId;
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
    if (!chipZoneEl || !attachment) return;
    const chip = el('button', 'ql-img-chip');
    chip.type = 'button';
    chip.setAttribute('aria-label', 'Search this image. Click to remove.');
    chip.title = 'Search this image';
    const thumb = el('span', 'ql-img-thumb');
    thumb.style.backgroundImage = 'url(' + attachment.src + ')';
    const label = el('span', 'ql-img-x');
    label.textContent = '×';
    chip.appendChild(thumb);
    chip.appendChild(label);
    chip.addEventListener('click', () => {
      removeImage();
    });
    chipZoneEl.appendChild(chip);
  }

  function showError(text) {
    if (!errEl) return;
    errEl.textContent = text;
    errEl.classList.add('is-open');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      errEl.classList.remove('is-open');
    }, 3200);
  }

  function base64FromBytes(bytes) {
    let binary = '';
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
    }
    return btoa(binary);
  }

  function decodeImageToBytes(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          resolve(new Uint8Array(reader.result));
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(reader.error || new Error('read failed'));
      reader.readAsArrayBuffer(file);
    });
  }

  function sniffImageType(bytes) {
    if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return 'image/png';
    if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
    if (bytes.length >= 4 && bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38) return 'image/gif';
    if (bytes.length >= 12 && bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
      bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) return 'image/webp';
    if (bytes.length >= 2 && bytes[0] === 0x42 && bytes[1] === 0x4d) return 'image/bmp';
    return null;
  }

  async function attachImage(file) {
    if (!file || !host) return;
    let bytes;
    try {
      bytes = await decodeImageToBytes(file);
    } catch (err) {
      showError('Could not read that image.');
      return;
    }
    if (!bytes || bytes.length === 0) {
      showError('The selected file is empty.');
      return;
    }
    if (bytes.length > QLENS.CONFIG.IMAGE_MAX_BYTES) {
      showError('Image is too large (max 5 MB).');
      return;
    }
    const mime = sniffImageType(bytes) || (typeof file.type === 'string' && file.type.startsWith('image/') ? file.type : null);
    if (!mime) {
      showError('That does not look like an image.');
      return;
    }
    const name = (typeof file.name === 'string' && file.name) ? file.name : QLENS.CONFIG.LENS_FILENAME;
    let blob = null;
    let src = null;
    let outBytes = bytes;
    try {
      const bitmap = await createImageBitmap(new Blob([bytes], { type: mime }));
      const max = QLENS.CONFIG.IMAGE_MAX_DIM;
      const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
      if (scale < 1) {
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(bitmap.width * scale));
        canvas.height = Math.max(1, Math.round(bitmap.height * scale));
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
          const resized = await new Promise((resolve) => {
            canvas.toBlob(resolve, 'image/jpeg', QLENS.CONFIG.IMAGE_JPEG_QUALITY);
          });
          if (resized) {
            outBytes = new Uint8Array(await resized.arrayBuffer());
            blob = resized;
          }
        }
        bitmap.close();
      }
    } catch (err) {
      /* keep original bytes when canvas resize fails */
    }
    if (blob) {
      src = URL.createObjectURL(blob);
    } else {
      const safeType = mime === 'image/png' || mime === 'image/gif' || mime === 'image/webp'
        ? mime : 'image/jpeg';
      src = URL.createObjectURL(new Blob([bytes], { type: safeType }));
    }
    attachment = { bytes: outBytes, src, name };
    renderChip();
  }

  function removeImage() {
    if (attachment && attachment.src) {
      try {
        URL.revokeObjectURL(attachment.src);
      } catch (err) {
        /* best-effort */
      }
    }
    attachment = null;
    renderChip();
  }

  function searchImage() {
    if (!attachment) return;
    const text = inputEl.value.trim();
    const bytes = attachment.bytes;
    const name = attachment.name || '';
    const payload = {
      bytes: base64FromBytes(bytes),
      text,
      name
    };
    try {
      chrome.runtime.sendMessage({ type: QLENS.MSG.IMAGE_SEARCH, payload }).catch(() => {});
    } catch (err) {
      /* send is best-effort; overlay still destroyed */
    }
    destroy(false);
  }

  function updateFootEngine() {
    if (!footEngine) return;
    footEngine.textContent = '';
    const spec = modeId ? QLENS.QUICK_MODES[modeId] : QLENS.ENGINES[engineId];
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
    if (!vs.enabled) {
      viewportFrameEl.style.display = 'none';
      return;
    }
    viewportFrameEl.style.display = '';
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
    window.addEventListener('keydown', onWindowKey, true);
    window.addEventListener('keyup', onWindowKey, true);
    inputEl.addEventListener('input', onInput);
    inputEl.addEventListener('keydown', () => requestAnimationFrame(updateCaret));
    inputEl.addEventListener('click', () => requestAnimationFrame(updateCaret));
    inputEl.addEventListener('focus', updateCaret);
    inputEl.addEventListener('blur', updateCaret);
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
    root.addEventListener('drop', onDrop);
    root.addEventListener('dragover', (e) => {
      e.preventDefault();
    });
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
    requestAnimationFrame(updateCaret);
  }

  function onDrop(e) {
    e.preventDefault();
    if (!host) return;
    const files = e.dataTransfer && e.dataTransfer.files ? e.dataTransfer.files : null;
    if (!files || files.length === 0) return;
    for (const f of files) {
      if (typeof f.type === 'string' && f.type.startsWith('image/')) {
        attachImage(f);
        return;
      }
    }
    showError('Drop an image file to search it.');
  }

  function onPaste(e) {
    if (!host || !root) return;
    const target = e.target;
    if (target && !root.contains(target)) return;
    let item = null;
    try {
      const items = e.clipboardData && e.clipboardData.items ? e.clipboardData.items : [];
      for (const it of items) {
        if (it.kind !== 'file') continue;
        const f = it.getAsFile();
        if (!f) continue;
        const t = typeof it.type === 'string' ? it.type : '';
        if (t.startsWith('image/')) {
          item = f;
          break;
        }
        if (!item) item = f;
      }
    } catch (err) {
      item = null;
    }
    if (!item) return;
    e.preventDefault();
    e.stopPropagation();
    attachImage(item);
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
    if (order[next]) setEngine(order[next]);
    const active = pillZone.querySelector('.ql-pill.is-active');
    if (active) active.focus();
  }

  function onKeyUp(e) {
    e.stopPropagation();
  }

  function onWindowKey(e) {
    if (!host || !root) return;
    if (e.key !== ' ' && e.code !== 'Space') return;
    const path = typeof e.composedPath === 'function' ? e.composedPath() : [];
    const src = path && path[0];
    const inside = Boolean(src && root.contains(src));
    if (!inside) {
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
    insertSpace();
  }

  function insertSpace() {
    try {
      const s = inputEl.selectionStart == null ? inputEl.value.length : inputEl.selectionStart;
      const en = inputEl.selectionEnd == null ? s : inputEl.selectionEnd;
      inputEl.setRangeText(' ', s, en, 'end');
      inputEl.selectionStart = inputEl.selectionEnd = Math.min(s + 1, inputEl.value.length);
      inputEl.dispatchEvent(new InputEvent('input', { bubbles: true, data: ' ', inputType: 'insertText' }));
    } catch (err) {
      /* insert is best-effort; nothing to recover */
    }
  }

  function onKeyDown(e) {
    e.stopPropagation();
    if (e.key === 'Escape') {
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
    if (e.key === 'Enter') {
      if (e.isComposing) return;
      e.preventDefault();
      if (attachment) {
        searchImage();
      } else if (suggestionHighlight >= 0 && suggestions[suggestionHighlight] && suggestions[suggestionHighlight].dataset.query) {
        submitQuery(suggestions[suggestionHighlight].dataset.query);
      } else if (actionSite) {
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

  function setEngine(id) {
    engineId = id;
    modeId = null;
    aiMode = false;
    renderPills();
    updateFootEngine();
    QLENS.storage.setLastEngine(id);
  }

  function setMode(id) {
    modeId = id;
    aiMode = false;
    renderPills();
    updateFootEngine();
  }

  function updateInputState() {
    if (!host) return;
    const value = inputEl.value;
    if (selectionActive && value.trim() !== selectionText) {
      selectionActive = false;
      renderChip();
    }
    const parsed = QLENS.parsePrefix(value);
    if (parsed) {
      applyPrefix(parsed);
      return;
    }
    const site = QLENS.detectSmartUrl(value);
    if (site && !QLENS.isOwnHost(site, modeId || engineId)) {
      clearSuggestions();
      renderActionRow(site, value.trim());
    } else if (value.trim()) {
      hideAction();
      if (settings && settings.suggestions) {
        scheduleSuggestions();
      } else {
        clearSuggestions();
      }
    } else {
      hideAction();
      renderEmpty();
    }
  }

  function applyPrefix(parsed) {
    aiMode = false;
    if (parsed.type === 'engine') {
      if (parsed.id !== engineId || modeId) {
        setEngine(parsed.id);
      }
    } else if (parsed.type === 'mode') {
      if (parsed.id !== modeId) {
        setMode(parsed.id);
      }
    }
    if (parsed.rest !== inputEl.value) {
      inputEl.value = parsed.rest;
      placeCaretEnd();
    }
    updateInputState();
  }

  function placeCaretEnd() {
    try {
      inputEl.setSelectionRange(inputEl.value.length, inputEl.value.length);
    } catch (err) {
      /* caret placement is best-effort */
    }
    updateCaret();
  }

  const CARET_TEXT_START = 50; /* input-row pad-left 20 + search icon 18 + gap 12 */

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
    // Always visible while the overlay is open — no focus gating, no blink.
    // (An invisible caret previously happened when activeElement tracking
    // disagreed, and under prefers-reduced-motion the blink animation was
    // forced to a single 0.01ms iteration ending on the opacity:0 base.)
    caretEl.classList.remove('is-hidden');
    ensureMeasureEl();
    const idx = typeof inputEl.selectionStart === 'number' ? inputEl.selectionStart : inputEl.value.length;
    measureEl.textContent = inputEl.value.slice(0, idx);
    const w = measureEl.getBoundingClientRect().width;
    caretEl.style.left = Math.round(CARET_TEXT_START + w - (inputEl.scrollLeft || 0)) + 'px';
  }

  function b64ToBytes(b64) {
    try {
      const raw = globalThis.atob(b64);
      const n = raw.length;
      const out = new Uint8Array(n);
      for (let i = 0; i < n; i += 0x8000) {
        out.set(Array.from(raw.slice(i, i + 0x8000), (c) => c.charCodeAt(0)), i);
      }
      return out;
    } catch (err) {
      return null;
    }
  }

  // Page CSP can block the chrome-extension: @font-face URL on strict sites
  // (github.com et al), and page-shipped "Inter" faces can override ours.
  // Unique family 'QLens Inter' + binary FontFace from the SW (zero-fetch,
  // CSP-exempt) guarantees the bundled font renders everywhere.
  async function applyFonts() {
    if (fontsApplied) return;
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
    fontsApplied = applied > 0;
  }

  function focusInput() {
    try {
      inputEl.focus();
    } catch (err) {
      return;
    }
    placeCaretEnd();
  }

  function scheduleSuggestions() {
    clearTimeout(suggestionTimer);
    suggestionTimer = setTimeout(() => {
      fetchSuggestions(inputEl.value, modeId || engineId);
    }, QLENS.CONFIG.SUGGESTION_DEBOUNCE_MS);
  }

  async function fetchSuggestions(query, engine) {
    const reqId = ++suggestionReqId;
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
    if (!host || inputEl.value.trim() !== query.trim()) return;
    renderSuggestions(results, query);
  }

  function setSuggestHeight(px) {
    suggestEl.style.maxHeight = px + 'px';
  }

  function clearSuggestions() {
    if (!suggestEl) return;
    suggestEl.textContent = '';
    suggestEl.classList.remove('is-open');
    suggestions = [];
    suggestionHighlight = -1;
    inputEl.removeAttribute('aria-activedescendant');
    inputEl.setAttribute('aria-expanded', 'false');
  }

  function renderEmpty() {
    if (!host) return;
    clearSuggestions();
    const empty = el('div', 'ql-empty');
    empty.appendChild(iconSvg(ICON_RETICLE));
    const t = el('b');
    t.textContent = 'Type to search';
    const p = el('p');
    p.textContent = 'or select text on any page and open QLens to search from context.';
    empty.append(t, p);
    suggestEl.appendChild(empty);
    suggestEl.classList.add('is-open');
    setSuggestHeight(150);
  }

  function renderSuggestions(list, query) {
    if (!host) return;
    hideAction();
    clearSuggestions();
    const rows = [];
    const addRow = (text, idx, submitText) => {
      const row = el('div', 'ql-sug-row');
      row.id = 'ql-sug-' + idx;
      row.setAttribute('role', 'option');
      row.setAttribute('aria-selected', 'false');
      row.dataset.query = submitText;
      row.style.setProperty('--i', idx);
      const k = el('span', 'ql-sug-k');
      k.textContent = String(idx + 1).padStart(2, '0');
      const txt = el('span', 'ql-sug-txt');
      const t = el('b', 'ql-sug-title');
      t.textContent = text;
      txt.append(t);
      row.append(k, txt, iconSvg(ICON_ARROW, 'ql-sug-arrow'));
      row.addEventListener('pointerenter', () => setHighlight(idx));
      row.addEventListener('click', () => submitQuery(submitText));
      suggestEl.appendChild(row);
      rows.push(row);
    };
    addRow('Search for "' + query + '"', 0, query);
    const count = Math.min(list.length, QLENS.CONFIG.MAX_SUGGESTIONS);
    for (let i = 0; i < count; i++) {
      addRow(list[i], i + 1, list[i]);
    }
    suggestions = rows;
    suggestionHighlight = -1;
    suggestEl.classList.add('is-open');
    inputEl.setAttribute('aria-expanded', 'true');
    const want = rows.length * 48 + 6;
    const max = Math.max(180, Math.round(window.innerHeight * 0.46));
    setSuggestHeight(Math.min(want, max));
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
    for (let i = 0; i < suggestions.length; i++) {
      const on = i === idx;
      suggestions[i].classList.toggle('is-active', on);
      suggestions[i].setAttribute('aria-selected', String(on));
    }
    suggestionHighlight = idx;
    if (idx >= 0 && suggestions[idx]) {
      inputEl.setAttribute('aria-activedescendant', suggestions[idx].id);
      try {
        suggestions[idx].scrollIntoView({ block: 'nearest' });
      } catch (err) {
        /* scrolling is best-effort */
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
    const spec = modeId ? QLENS.QUICK_MODES[modeId] : QLENS.ENGINES[engineId];
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
    const url = QLENS.buildSearchUrl(engine, q, modeId, aiMode);
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
    try {
      chrome.runtime.sendMessage({ type: QLENS.MSG.OPEN_TAB, payload }).catch(() => {});
    } catch (err) {
      /* send is best-effort; overlay still destroyed */
    }
    destroy(false);
  }

  function show(payload) {
    if (host) return;
    prevFocusEl = document.activeElement;
    engineId = QLENS.CONFIG.DEFAULT_SETTINGS.defaultEngine;
    initialEngineId = engineId;
    modeId = null;
    aiMode = false;
    actionSite = null;
    suggestions = [];
    suggestionHighlight = -1;
    selectionText = null;
    selectionActive = false;
    attachment = null;
    settings = null;
    engineOrder = QLENS.CONFIG.DEFAULT_SETTINGS.engineOrder.slice();

    const p = payload || {};
    const pre = p.settings && typeof p.settings === 'object' && Array.isArray(p.settings.engineOrder)
      ? p.settings
      : null;
    if (pre) {
      settings = pre;
      const order = pre.engineOrder.filter((id) => QLENS.ENGINES[id]);
      if (order.length) engineOrder = order;
      const last = typeof p.lastEngine === 'string' && engineOrder.includes(p.lastEngine)
        ? p.lastEngine
        : null;
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
  }

  async function hydrate() {
    if (!settings) {
      let s = null;
      try {
        s = await QLENS.storage.getSettings();
      } catch (err) {
        try { s = JSON.parse(JSON.stringify(QLENS.CONFIG.DEFAULT_SETTINGS)); } catch (e2) { s = QLENS.CONFIG.DEFAULT_SETTINGS; }
      }
      if (!host) return;
      settings = s;
      engineOrder = s.engineOrder.slice();
      applyTheme(s);
      updateViewportFrame();
      const last = await QLENS.storage.getLastEngine();
      if (!host) return;
      if (engineId === initialEngineId) {
        setEngine(last);
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
    setTimeout(() => {
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
    suggestionReqId++;
    let reduced = false;
    try {
      reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch (err) {
      reduced = false;
    }
    if (animate && !reduced) {
      panel.classList.add('ql-out');
      if (viewportFrameEl) viewportFrameEl.classList.add('ql-out');
      setTimeout(removeHost, 150);
    } else {
      removeHost();
    }
  }

  function removeHost() {
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
    footEngine = null;
    imgBtn = null;
    fileInput = null;
    errEl = null;
    caretEl = null;
    measureEl = null;
    closing = false;
    suggestions = [];
    suggestionHighlight = -1;
    clearTimeout(toastTimer);
    toastTimer = null;
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
    isVisible: () => Boolean(host)
  };
})();

QLENS.Overlay = Overlay;