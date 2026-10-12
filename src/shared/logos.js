globalThis.QLENS = globalThis.QLENS || {};

const SVG_TAG_RE = /^<svg[\s>]/i;
const SVG_DANGEROUS_RE = /<(script|iframe|object|embed|foreignObject)[\s>]/i;
const SVG_HANDLER_RE = /on[a-z]+\s*=/i;
const SVG_JS_RE = /javascript:/i;

function isSafeSvgMarkup(s) {
  if (typeof s !== 'string' || !s) return false;
  const t = s.trim();
  if (!SVG_TAG_RE.test(t)) return false;
  if (SVG_DANGEROUS_RE.test(t)) return false;
  if (SVG_HANDLER_RE.test(t)) return false;
  if (SVG_JS_RE.test(t)) return false;
  return true;
}

function setIcon(node, markup) {
  if (!node || typeof node.innerHTML === 'undefined') return false;
  if (!isSafeSvgMarkup(markup)) return false;
  node.innerHTML = markup;
  return true;
}

QLENS.isSafeSvgMarkup = isSafeSvgMarkup;
QLENS.setIcon = setIcon;

QLENS.LOGOS = {
  google: '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><g fill="none" stroke-width="5" stroke-linecap="round"><circle cx="12" cy="12" r="9" stroke="#4285F4" stroke-dasharray="14.1 56.6" stroke-dashoffset="0"/><circle cx="12" cy="12" r="9" stroke="#EA4335" stroke-dasharray="14.1 56.6" stroke-dashoffset="-14.1"/><circle cx="12" cy="12" r="9" stroke="#FBBC05" stroke-dasharray="14.1 56.6" stroke-dashoffset="-28.3"/><circle cx="12" cy="12" r="9" stroke="#34A853" stroke-dasharray="14.1 56.6" stroke-dashoffset="-42.4"/></g><path d="M8 12.5h7.5" stroke="#34A853" stroke-width="4.5" stroke-linecap="round"/></svg>',
  brave: '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="11" fill="#FB542B"/><text x="12" y="17" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="bold" font-size="13" fill="#FFFFFF">B</text></svg>',
  bing: '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="11" fill="#1F4E9C"/><text x="12" y="17" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="bold" font-size="13" fill="#FFFFFF">b</text></svg>',
  duckduckgo: '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="11" fill="#DE5833"/><text x="12" y="17" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="bold" font-size="13" fill="#FFFFFF">D</text></svg>',
  custom: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z"/></svg>'
};