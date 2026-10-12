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

try {
  const theme = new URLSearchParams(window.location.search).get('theme');
  if (theme === 'light' || theme === 'dark') {
    document.documentElement.setAttribute('data-theme', theme);
  }
} catch (err) {}
