# CHANGELOG

## [1.0.0] — 2026-08-14

Initial release per PRD.

### Added
- F1 Global quick-search overlay (Ctrl+Shift+K, rebindable; on-demand guarded injection; ephemeral, zero residue)
- F2 Four engines (Google, Brave, Bing, DuckDuckGo): Tab cycle, pills, `g b k d` prefixes, last-engine persistence
- F3 Selected-text auto-fill (200-char cap, editable-region guard, "From selection" chip)
- F4 Liquid-glass overlay UI: dark/light, 6 accents, spring motion, reduced-motion support, WCAG AA, focus trap
- F5 Search suggestions (250 ms debounce, 1.5 s abort, stale-drop, Brave labeled "via Google", silent offline)
- F6 Recent searches (10 unique, delete, clear all, click re-search)
- F7 Smart query handling ("Go to site" for URLs, http/https allowlist, quotes preserved)
- F8 Quick modes (images/videos/news/YouTube/Wikipedia — pills + prefixes)
- F9 Options page (default engine, drag order, theme/accent, behavior toggles, shortcut info, data controls)
- F10 Right-click context menu ("Search with QLens" — overlay or direct, setting)
- Hardening: nonce injection guard, sender.id validation, storage validate-and-fallback, IME-safe Enter

### Fixed
- (n/a — first release)

### Known limitations / future work
- F11 clipboard quick-search chip, blur-close beyond setting, sync settings → v1.1 (PRD roadmap)