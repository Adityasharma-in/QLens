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
  if (clean.length <= limit) return clean;
  return clean.slice(0, limit).trimEnd() + '\u2026';
}

function captureSelection(max) {
  try {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return null;
    const node = sel.anchorNode;
    if (!node) return null;
    const el = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
    if (isEditableElement(el)) return null;
    return truncateSelection(sel.toString(), max);
  } catch (err) {
    return null;
  }
}

QLENS.Selection = {
  capture: captureSelection,
  truncate: truncateSelection
};