globalThis.QLENS = globalThis.QLENS || {};

/**
 * @file image.js — pure, dependency-free image validation + transform for QLens Lens flow.
 * No DOM, no chrome.* — testable via Node vm. All functions validate adversarial input.
 */

/**
 * Magic-byte sniff. Returns mime or null if unknown.
 * @param {Uint8Array} bytes
 * @returns {string | null}
 */
function sniffMime(bytes) {
  if (!(bytes instanceof Uint8Array) || bytes.length < 2) return null;
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return 'image/png';
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if (bytes.length >= 4 && bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38) return 'image/gif';
  if (bytes.length >= 12 && bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) return 'image/webp';
  if (bytes.length >= 2 && bytes[0] === 0x42 && bytes[1] === 0x4d) return 'image/bmp';
  if (bytes.length >= 4 && bytes[0] === 0x00 && bytes[1] === 0x00 && bytes[2] === 0x01 && bytes[3] === 0x00) return 'image/x-icon';
  if (bytes.length >= 12 && bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70) {
    const brand = String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]);
    if (brand === 'avif' || brand === 'avis') return 'image/avif';
    if (brand === 'heic' || brand === 'heix' || brand === 'hevc' || brand === 'hevx' || brand === 'heim' || brand === 'heis' || brand === 'hevm' || brand === 'hevs' || brand === 'mif1' || brand === 'msf1') return 'image/heic';
  }
  try {
    const n = bytes.length < 512 ? bytes.length : 512;
    let s = '';
    for (let i = 0; i < n; i++) s += String.fromCharCode(bytes[i]);
    const t = s.trimStart();
    if (t.startsWith('<svg') || (t.startsWith('<?xml') && t.indexOf('<svg') !== -1)) return 'image/svg+xml';
  } catch (err) {}
  return null;
}

/**
 * Validate bytes + claimed mime. Enforces size cap from QLENS.CONFIG.
 * @param {Uint8Array} bytes
 * @param {string} claimedType
 * @returns {{ ok: true, mime: string } | { ok: false, error: string }}
 */
function validateImageBytes(bytes, claimedType) {
  const max = (globalThis.QLENS && globalThis.QLENS.CONFIG && typeof QLENS.CONFIG.IMAGE_MAX_BYTES === 'number')
    ? QLENS.CONFIG.IMAGE_MAX_BYTES : 5 * 1024 * 1024;
  if (!(bytes instanceof Uint8Array)) return { ok: false, error: 'That does not look like an image.' };
  if (bytes.length === 0) return { ok: false, error: 'The selected file is empty.' };
  if (bytes.length > max) return { ok: false, error: 'Image is too large (max 5 MB).' };
  const sniffed = sniffMime(bytes);
  const claimed = typeof claimedType === 'string' && claimedType.startsWith('image/') ? claimedType.toLowerCase() : null;
  // Prefer sniffed; if sniff fails but claimed looks like image, allow (some webp/bmp edge sniff miss)
  const mime = sniffed || claimed;
  if (!mime) return { ok: false, error: 'That does not look like an image.' };
  // AllowList
  const allowed = ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/bmp', 'image/x-icon', 'image/avif', 'image/heic', 'image/svg+xml'];
  // Normalize x-icon -> png path (we re-encode to jpeg anyway)
  if (mime === 'image/x-icon') return { ok: true, mime: 'image/png' };
  if (!allowed.includes(mime)) return { ok: false, error: 'Unsupported image type.' };
  return { ok: true, mime };
}

/**
 * Chunked base64 — avoids call-stack blowup on large arrays.
 * @param {Uint8Array} bytes
 * @returns {string}
 */
function bytesToBase64(bytes) {
  if (!(bytes instanceof Uint8Array)) return '';
  let binary = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK));
  }
  try {
    return btoa(binary);
  } catch (err) {
    return '';
  }
}

/**
 * Safely decode base64 to bytes.
 * @param {string} b64
 * @returns {Uint8Array | null}
 */
function base64ToBytes(b64) {
  if (typeof b64 !== 'string' || !b64) return null;
  // quick length guard — 5MB *4/3 ~ 7MB char string
  const maxChars = Math.ceil((5 * 1024 * 1024) * 4 / 3) + 64;
  if (b64.length > maxChars) return null;
  try {
    const raw = atob(b64);
    const n = raw.length;
    const out = new Uint8Array(n);
    for (let i = 0; i < n; i++) out[i] = raw.charCodeAt(i);
    return out;
  } catch (err) {
    return null;
  }
}

/**
 * Build safe lens filename from original name + mime.
 * Strips path traversal, caps length, forces safe extension.
 * @param {string} originalName
 * @param {string} mime
 * @returns {string}
 */
function buildLensFilename(originalName, mime) {
  const dflt = (globalThis.QLENS && globalThis.QLENS.CONFIG && QLENS.CONFIG.LENS_FILENAME) ? QLENS.CONFIG.LENS_FILENAME : 'qlens-search.png';
  let base = typeof originalName === 'string' ? originalName.trim() : '';
  // strip directory parts
  base = base.split('/').pop().split('\\').pop();
  base = base.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80);
  if (!base) return dflt;
  const m = typeof mime === 'string' ? mime.toLowerCase() : '';
  let ext = '.jpg';
  if (m === 'image/png') ext = '.png';
  else if (m === 'image/jpeg') ext = '.jpg';
  else if (m === 'image/gif') ext = '.gif';
  else if (m === 'image/webp') ext = '.webp';
  else if (m === 'image/bmp') ext = '.bmp';
  else if (m === 'image/avif') ext = '.avif';
  else if (m === 'image/heic') ext = '.heic';
  else if (m === 'image/svg+xml') ext = '.png';
  else if (m === 'image/x-icon') ext = '.png';
  // ensure extension matches mime (avoid double ext attacks)
  base = base.replace(/\.(png|jpe?g|gif|webp|bmp|ico)$/i, '') + ext;
  return base;
}

/**
 * Decide if a file object looks like an image (pre-read, cheap check).
 * @param {any} file
 * @returns {boolean}
 */
function isImageFileLike(file) {
  if (!file || typeof file !== 'object') return false;
  const t = typeof file.type === 'string' ? file.type : '';
  if (t && t.startsWith('image/')) return true;
  const name = typeof file.name === 'string' ? file.name.toLowerCase() : '';
  return /\.(png|jpe?g|gif|webp|bmp|ico|avif|heic|heif|svg)$/.test(name);
}

/**
 * Standard FNV-1a 32-bit hash over bytes → 8-char lowercase hex.
 * @param {Uint8Array} bytes
 * @returns {string}
 */
function fnv1a32(bytes) {
  if (!(bytes instanceof Uint8Array) || bytes.length === 0) return '';
  let h = 0x811c9dc5;
  const truncated = bytes.length > 65536;
  const n = truncated ? 65536 : bytes.length;
  for (let i = 0; i < n; i++) {
    h ^= bytes[i];
    h = Math.imul(h, 0x01000193);
  }
  if (truncated) {
    h ^= bytes.length;
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

/**
 * Compute scaled dims fitting within max (longest edge). Pure math only.
 * @param {any} w
 * @param {any} h
 * @param {any} max
 * @returns {{ width: number, height: number, scale: number }}
 */
function resizeDims(w, h, max) {
  const cw = Math.floor(Number(w));
  const ch = Math.floor(Number(h));
  if (!Number.isFinite(cw) || !Number.isFinite(ch) || cw <= 0 || ch <= 0) return { width: 0, height: 0, scale: 0 };
  let cm = Math.floor(Number(max));
  if (!Number.isFinite(cm) || cm <= 0) cm = 1600;
  const scale = Math.min(1, cm / Math.max(cw, ch));
  return { width: Math.max(1, Math.round(cw * scale)), height: Math.max(1, Math.round(ch * scale)), scale };
}

/**
 * Preferred encode mime for overlay rasterization (callers feature-detect toBlob support).
 * @returns {string}
 */
function pickEncodeMime() {
  return 'image/webp';
}

/**
 * Pick the file to attach from a paste's clipboard items.
 * Pure + null-safe: every entry is an untrusted cross-browser object —
 * DataTransferItems can be null, typeless, or throw on getAsFile()
 * (copy-protected pages, quiz lockdown browsers, IME compositions).
 * @param {any} items - array of { kind, type, file } plain snapshots
 * @param {(file: any) => boolean} [isLike] - optional image-likeness check
 * @returns {any} file to attach, or null when the paste is not an image
 */
function pickPasteImage(items, isLike) {
  if (!Array.isArray(items)) return null;
  let fallback = null;
  for (const it of items) {
    let kind = '';
    let type = '';
    try {
      if (!it || typeof it !== 'object') continue;
      kind = typeof it.kind === 'string' ? it.kind : '';
      type = typeof it.type === 'string' ? it.type : '';
    } catch (err) {
      continue;
    }
    if (kind !== 'file') continue;
    let f = null;
    try {
      f = it.file != null && typeof it.file === 'object' ? it.file : null;
    } catch (err) {
      f = null;
    }
    if (!f) continue;
    let ft = '';
    try {
      ft = typeof f.type === 'string' ? f.type : '';
    } catch (err) {
      ft = '';
    }
    const t = type || ft;
    if (t && t.startsWith('image/')) return f;
    if (!fallback) fallback = f;
  }
  if (!fallback) return null;
  let like = false;
  try {
    like = typeof isLike === 'function' ? isLike(fallback) === true : false;
  } catch (err) {
    like = false;
  }
  if (!like) {
    // A typeless file next to real text is a text paste, not an image paste.
    let hasText = false;
    try {
      hasText = items.some((it) => !!it && typeof it === 'object' && it.kind === 'string'
        && typeof it.type === 'string' && it.type.indexOf('text/plain') !== -1);
    } catch (err) {
      hasText = false;
    }
    if (hasText) return null;
  }
  return fallback;
}

QLENS.ImageEngine = {
  sniffMime,
  validateImageBytes,
  bytesToBase64,
  base64ToBytes,
  buildLensFilename,
  isImageFileLike,
  pickPasteImage,
  fnv1a32,
  resizeDims,
  pickEncodeMime
};
