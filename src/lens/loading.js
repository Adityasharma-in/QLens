'use strict';

const STAGES = [
  { at: 1500, text: 'Uploading image — preparing your results.' },
  { at: 6000, text: 'Still working — results will load here automatically.' }
];

for (const stage of STAGES) {
  setTimeout(() => {
    try {
      const el = document.getElementById('qlens-loading-sub');
      if (el) el.textContent = stage.text;
    } catch (err) {}
  }, stage.at);
}

// JS-only stall notice (no markup/CSS change): if the SW stalls past the
// 15s upload timeout plus the hidden-tab fallback, the tab would spin
// forever. Surface a close hint instead of an orphan spinner.
try {
  const qlensStallTimer = setTimeout(() => {
    try {
      const el = document.getElementById('qlens-loading-sub');
      if (el) el.textContent = 'Taking too long — you can close this tab and try again.';
    } catch (err) {}
  }, 25000);
  window.addEventListener('beforeunload', () => {
    try { clearTimeout(qlensStallTimer); } catch (err) {}
  });
} catch (err) {}

try {
  const theme = new URLSearchParams(window.location.search).get('theme');
  if (theme === 'light' || theme === 'dark') {
    document.documentElement.setAttribute('data-theme', theme);
  }
} catch (err) {}
