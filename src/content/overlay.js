globalThis.QLENS = globalThis.QLENS || {};

const FONT_FACE = [400, 500, 600, 700]
  .map((w) =>
    "@font-face{font-family:'Inter';font-style:normal;font-weight:" + w +
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
  --ql-font-row: 13px;
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
  --ql-radius-full: 999px;
  --ql-dur-fast: 140ms;
  --ql-dur-med: 240ms;
  --ql-dur-enter: 380ms;
  --ql-ease-out: cubic-bezier(.22, 1, .36, 1);
  --ql-ease-spring: cubic-bezier(.34, 1.56, .64, 1);
  --ql-ease-gentle: cubic-bezier(.45, .05, .2, 1);
  position: fixed;
  inset: 0;
  z-index: 2147483647;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
  font-size: 15px;
  line-height: 1.4;
  color: var(--ql-text);
  text-align: left;
  letter-spacing: normal;
}

:host([data-theme="light"]) {
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
    -webkit-backdrop-filter: blur(0) saturate(1);
  backdrop-filter: blur(0) saturate(1);
  animation: ql-backdrop-in var(--ql-dur-med) var(--ql-ease-out) both;
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
    -webkit-backdrop-filter: blur(0) saturate(1);
    backdrop-filter: blur(0) saturate(1);
  }
  to {
    opacity: 1;
    -webkit-backdrop-filter: blur(var(--ql-backdrop-blur)) saturate(1.15);
    backdrop-filter: blur(var(--ql-backdrop-blur)) saturate(1.15);
  }
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
  animation: ql-panel-in var(--ql-dur-enter) var(--ql-ease-spring) 40ms both;
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
  animation: ql-glow-in .45s var(--ql-ease-out) 320ms backwards;
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
  padding: 0 var(--ql-space-5);
  border-radius: var(--ql-radius-input);
  background: var(--ql-liner);
  border: 1px solid var(--ql-hairline);
  transition: box-shadow var(--ql-dur-fast) var(--ql-ease-out), background var(--ql-dur-fast), border-color var(--ql-dur-fast);
  animation: ql-rise-in .34s var(--ql-ease-out) 120ms backwards;
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
  border: 0;
  outline: none;
  background: transparent;
  color: var(--ql-text);
  font: 600 var(--ql-font-input)/1 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
  letter-spacing: -.012em;
  caret-color: transparent;
  animation: ql-caret-in 1ms linear var(--ql-dur-enter) both;
}

@keyframes ql-caret-in {
  to { caret-color: var(--ql-accent); }
}

.ql-input::placeholder {
  color: var(--ql-text-faint);
  font-weight: 400;
  opacity: 1;
}

.ql-input::selection {
  background: rgba(var(--ql-accent-rgb), .32);
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
  font: 500 11px 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
  cursor: pointer;
  animation: ql-chip-in .32s var(--ql-ease-spring) backwards;
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
  animation: ql-rise-in .34s var(--ql-ease-out) 180ms backwards;
}

.ql-pills {
  display: flex;
  flex-wrap: wrap;
  gap: var(--ql-space-2);
}

.ql-pill {
  display: inline-flex;
  align-items: center;
  gap: var(--ql-space-2);
  height: 34px;
  padding: 0 var(--ql-space-4) 0 var(--ql-space-3);
  border-radius: var(--ql-radius-full);
  border: 1px solid var(--ql-hairline);
  background: var(--ql-liner);
  color: var(--ql-text-dim);
  font: 500 var(--ql-font-pill)/1 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
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
  border-color: transparent;
  box-shadow: 0 6px 18px -8px rgba(var(--ql-accent-rgb), .65), inset 0 1px 0 rgba(255, 255, 255, .25);
  animation: ql-pill-pop .38s var(--ql-ease-spring);
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
  animation: ql-badge-pop .4s var(--ql-ease-spring) 40ms;
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
  align-items: center;
  gap: 6px;
  height: 26px;
  padding: 0 11px 0 9px;
  margin-bottom: var(--ql-space-2);
  border-radius: var(--ql-radius-full);
  border: 1px dashed var(--ql-hairline);
  background: transparent;
  color: var(--ql-text-faint);
  font: 600 var(--ql-font-sub)/1 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
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
  animation: ql-pill-pop .38s var(--ql-ease-spring);
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
  padding: 0 var(--ql-space-4) 0 var(--ql-space-3);
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
  width: 22px;
  flex: none;
  text-align: right;
  font-size: var(--ql-font-sub);
  font-weight: 600;
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
  font-size: var(--ql-font-row);
  font-weight: 600;
  letter-spacing: -.01em;
  color: var(--ql-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ql-sug-sub {
  font-size: var(--ql-font-sub);
  color: var(--ql-text-faint);
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
  gap: var(--ql-space-2);
  padding: var(--ql-space-6) var(--ql-space-4);
  text-align: center;
  color: var(--ql-text-dim);
  animation: ql-rise-in .3s var(--ql-ease-out) backwards;
}

.ql-empty .ql-icon {
  color: var(--ql-text-faint);
}

.ql-empty b {
  color: var(--ql-text);
  font-size: 13px;
  font-weight: 600;
}

.ql-empty p {
  font-size: 11.5px;
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
  animation: ql-rise-in .34s var(--ql-ease-out) 280ms backwards;
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
  font: 600 9.5px 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
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
  .ql-backdrop {
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
  let aiRow = null;
  let aiPillEl = null;
  let suggestionReqId = 0;
  let suggestions = [];
  let suggestionHighlight = -1;
  let actionSite = null;
  let selectionText = null;
  let selectionActive = false;
  let closing = false;

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

    chipZoneEl = el('div', 'ql-chip-zone');
    inputRow.appendChild(chipZoneEl);

    closeBtn = el('button', 'ql-close');
    closeBtn.type = 'button';
    closeBtn.setAttribute('aria-label', 'Close (Esc)');
    closeBtn.appendChild(iconSvg(ICON_CLOSE));
    inputRow.appendChild(closeBtn);

    pillZone = el('div', 'ql-pill-zone');
    pillZone.setAttribute('role', 'radiogroup');
    pillZone.setAttribute('aria-label', 'Search engine');
    aiRow = el('div', 'ql-pills ql-pill-ai-row');
    aiRow.setAttribute('aria-label', 'AI Mode');
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
    aiRow.appendChild(aiPillEl);
    pillZone.appendChild(aiRow);
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

  function engineHost() {
    const eng = QLENS.ENGINES[engineId];
    if (!eng || !eng.base) return '';
    try {
      return new URL(eng.base).host;
    } catch (err) {
      return '';
    }
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
    if (!selectionActive || !selectionText) return;
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

  function addListeners() {
    root.addEventListener('keydown', onKeyDown);
    inputEl.addEventListener('input', onInput);
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

  function onKeyDown(e) {
    if (e.key === 'Escape') {
      e.preventDefault();
      destroy(true);
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
      if (suggestionHighlight >= 0 && suggestions[suggestionHighlight] && suggestions[suggestionHighlight].dataset.query) {
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
    if (site) {
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
    const hostLabel = engineHost();
    const note = QLENS.ENGINES[engineId] && QLENS.ENGINES[engineId].suggestionLabel
      ? ' \u00b7 ' + QLENS.ENGINES[engineId].suggestionLabel
      : '';
    const aiNote = aiMode ? ' \u00b7 AI' : '';
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
      const s = el('span', 'ql-sug-sub');
      s.textContent = hostLabel + note + aiNote;
      txt.append(t, s);
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
    const want = rows.length * 48 + 4;
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
    settings = null;

    const p = payload || {};
    let text = null;
    if (typeof p.selection === 'string' && p.selection.trim()) {
      text = QLENS.Selection.truncate(p.selection, QLENS.CONFIG.DEFAULT_SETTINGS.maxSelection);
    } else {
      text = QLENS.Selection.capture(QLENS.CONFIG.DEFAULT_SETTINGS.maxSelection);
    }

    build();
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
    let s = null;
    try {
      s = await QLENS.storage.getSettings();
    } catch (err) {
      s = { ...QLENS.CONFIG.DEFAULT_SETTINGS };
    }
    if (!host) return;
    settings = s;
    engineOrder = s.engineOrder.slice();
    applyTheme(s);
    const last = await QLENS.storage.getLastEngine();
    if (!host) return;
    if (engineId === initialEngineId) {
      setEngine(last);
    }
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
      setTimeout(removeHost, 150);
    } else {
      removeHost();
    }
  }

  function removeHost() {
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
    inputEl = null;
    chipZoneEl = null;
    closeBtn = null;
    pillZone = null;
    pillsRow = null;
    aiRow = null;
    aiPillEl = null;
    smartZone = null;
    suggestEl = null;
    footEngine = null;
    closing = false;
    suggestions = [];
    suggestionHighlight = -1;
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