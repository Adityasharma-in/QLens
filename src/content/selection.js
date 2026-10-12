globalThis.QLENS = globalThis.QLENS || {};

function isEditableElement(el) {
  if (!el || typeof el.closest !== 'function') return false;
  return Boolean(el.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"])'));
}

function truncateSelection(text, max) {
  const clean = String(text == null ? '' : text).replace(/\s+/g, ' ').trim();
  if (!clean) return null;
  const n = Number(max);
  const limit = Number.isFinite(n) && n > 0 ? Math.floor(n) : 200;
  const chars = Array.from(clean);
  if (chars.length <= limit) return clean;
  return chars.slice(0, limit).join('').trimEnd() + '\u2026';
}

function readFieldSelection(el) {
  if (!el) return null;
  const tag = el.tagName ? el.tagName.toLowerCase() : '';
  if (tag === 'textarea') {
    if (typeof el.selectionStart !== 'number' || typeof el.selectionEnd !== 'number') return null;
    if (el.selectionStart === el.selectionEnd) return null;
    return String(el.value == null ? '' : el.value).slice(el.selectionStart, el.selectionEnd);
  }
  if (tag === 'input') {
    const type = String(el.type || 'text').toLowerCase();
    if (type !== 'text' && type !== 'search' && type !== 'url') return null;
    if (typeof el.selectionStart !== 'number' || typeof el.selectionEnd !== 'number') return null;
    if (el.selectionStart === el.selectionEnd) return null;
    return String(el.value == null ? '' : el.value).slice(el.selectionStart, el.selectionEnd);
  }
  return null;
}

function readWindowSelection(win) {
  const sel = win.getSelection();
  if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return null;
  const node = sel.anchorNode;
  if (!node) return null;
  const el = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
  if (isEditableElement(el)) return null;
  const text = sel.toString();
  if (!text) return null;
  return text;
}

function readShadowSelections() {
  const texts = [];
  try {
    const hosts = document.querySelectorAll('*');
    for (const host of hosts) {
      let sr = null;
      try {
        // Closed roots throw on access — skip without touching them.
        sr = host.shadowRoot || null;
      } catch (err) {
        sr = null;
      }
      if (!sr || typeof sr.getSelection !== 'function') continue;
      try {
        const sel = sr.getSelection();
        if (!sel || sel.rangeCount === 0 || sel.isCollapsed) continue;
        const text = sel.toString();
        if (text) {
          texts.push(text);
          // First hit wins: capture() truncates to one blob anyway, so
          // scanning the rest of the DOM is pure open-path cost.
          break;
        }
      } catch (err) {}
    }
  } catch (err) {}
  if (!texts.length) return null;
  return texts.join(' ');
}

function captureSelection(max) {
  try {
    const fieldText = readFieldSelection(document.activeElement);
    if (fieldText) return truncateSelection(fieldText, max);
    const main = readWindowSelection(window);
    if (main) return truncateSelection(main, max);
    const shadow = readShadowSelections();
    if (shadow) return truncateSelection(shadow, max);
    return null;
  } catch (err) {
    return null;
  }
}

QLENS.Selection = {
  capture: captureSelection,
  truncate: truncateSelection
};