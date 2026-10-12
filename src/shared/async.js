globalThis.QLENS = globalThis.QLENS || {};

// Single source of truth for "is this a usable duration?" — the overlay
// feeds it SUGGESTION_DEBOUNCE_MS straight from CONFIG.
function validWait(value, fallbackMs) {
  const dflt = typeof fallbackMs === 'number' && isFinite(fallbackMs) && fallbackMs >= 0 ? fallbackMs : 150;
  if (typeof value !== 'number' || !isFinite(value) || value < 0) return dflt;
  return value;
}

QLENS.validWait = validWait;
