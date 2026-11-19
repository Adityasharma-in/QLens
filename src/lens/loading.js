'use strict';

try {
  const params = new URLSearchParams(window.location.search);
  const hash = params.get('hash');
  const isError = params.has('error');
  const timers = [];

  const getEl = (id) => {
    try {
      return document.getElementById(id);
    } catch (err) {
      return null;
    }
  };

  const clearTimers = () => {
    try {
      for (const t of timers) {
        try {
          clearTimeout(t);
        } catch (err) {}
      }
      timers.length = 0;
    } catch (err) {}
  };

  const showError = () => {
    try {
      clearTimers();
      try {
        const spinner = document.querySelector('.spinner');
        if (spinner) spinner.hidden = true;
      } catch (err) {}
      try {
        const skel = document.querySelector('.skel');
        if (skel) skel.hidden = true;
      } catch (err) {}
      try {
        const errBox = getEl('qlens-error');
        if (errBox) errBox.hidden = false;
      } catch (err) {}
    } catch (err) {}
  };

  try {
    const cancelBtn = getEl('qlens-cancel');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        try {
          window.close();
        } catch (err) {}
      });
    }
  } catch (err) {}

  try {
    window.addEventListener('keydown', (e) => {
      try {
        if (e && e.key === 'Escape') {
          window.close();
        }
      } catch (err) {}
    });
  } catch (err) {}

  try {
    window.addEventListener('beforeunload', () => {
      try {
        clearTimers();
      } catch (err) {}
    });
  } catch (err) {}

  if (isError) {
    showError();
  } else {
    try {
      if (hash && typeof chrome !== 'undefined' && chrome.storage && chrome.storage.session) {
        try {
          chrome.storage.session.get('lensThumb:' + hash).then((res) => {
            try {
              const entry = res ? res['lensThumb:' + hash] : null;
              if (entry && typeof entry === 'object' && typeof entry.dataUrl === 'string' && (Date.now() - entry.ts) < 120000) {
                try {
                  const img = getEl('qlens-thumb');
                  if (img && entry.dataUrl.indexOf('data:') === 0) {
                    img.src = entry.dataUrl;
                    img.hidden = false;
                  }
                } catch (err) {}
                try {
                  const nameEl = getEl('qlens-loading-name');
                  if (nameEl && typeof entry.name === 'string' && entry.name) {
                    nameEl.textContent = entry.name.slice(0, 80);
                    nameEl.hidden = false;
                  }
                } catch (err) {}
              }
            } catch (err) {}
          }).catch(() => {});
        } catch (err) {}
      }
    } catch (err) {}

    try {
      const stages = [
        { at: 1500, text: 'Uploading image…' },
        { at: 6000, text: 'Waiting for Google Lens…' }
      ];
      for (const stage of stages) {
        try {
          timers.push(setTimeout(() => {
            try {
              const el = getEl('qlens-loading-sub');
              if (el) el.textContent = stage.text;
            } catch (err) {}
          }, stage.at));
        } catch (err) {}
      }
    } catch (err) {}

    try {
      timers.push(setTimeout(() => {
        try {
          const el = getEl('qlens-loading-sub');
          if (el) el.textContent = 'Taking too long — check your connection, then close and retry.';
        } catch (err) {}
      }, 25000));
    } catch (err) {}
  }

  try {
    const theme = params.get('theme');
    if (theme === 'light' || theme === 'dark') {
      document.documentElement.setAttribute('data-theme', theme);
    }
  } catch (err) {}
} catch (err) {}
