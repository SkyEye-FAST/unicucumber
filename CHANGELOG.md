# Changelog

All notable changes follow the rules in [Versioning](docs/versioning.md).

## [Unreleased]

## [1.6.0] - 2026-08-17

### Added

- Import TTF, OTF, WOFF, or WOFF2 files as a browser-local preview font that is persisted separately and always takes priority over the existing preview fallback stack.

### Changed

- Replace full-browser parsing of the bundled Unifont map with a compact build-generated catalog index, visible-range bitmap hydration, bounded versioned caches, and chunk-based BMP font export.
- Restore preferred Google Fonts and ZeoSeven web-font stylesheets while retaining platform fallbacks for offline and blocked-network startup.
- Update Vue to 3.5.41 and the development toolchain dependencies to their current patched releases.

### Fixed

- Prevent Glyph Library searches from entering a reactive bitmap-hydration loop when the full Unifont catalog contains unloaded glyph previews.
- Fit the glyph grid to both available width and constrained desktop/tablet height so every row remains visible after resetting the view.
- Preserve the default grid size on tall desktop screens when the surrounding editor has enough vertical room.
- Avoid shrinking the glyph grid on desktop and tablet windows at least 720px wide around 871px high, while keeping secondary hexadecimal and export controls below it.

- Harden glyph storage fallback and rollback semantics, clear stale drafts after undoing back to a saved document, reject invalid Unicode scalar values before saving, search Unicode names across the expanded catalog, preserve current catalog caches, restore current settings fixtures, and run browser/PWA workflows in CI without duplicating Vitest.
- Keep Glyph Manager catalog test fixtures aligned with the chunk lookup helper.
- Keep draft flush retry status checks type-safe after asynchronous saves complete.

## [1.5.0] - 2026-08-10

### Changed

- Load the OpenType export engine only when an OTF export is requested, batch preview glyph loading, use offline-safe platform fonts, reduce repeated editor fingerprint and Unicode-name work, and honor reduced-motion preferences globally.
- Preserve glyph-manager searches across sidebar reopen, allow Playwright runs to use an isolated server port, and keep the Vite config compatible with its native loader.
- Require every change to be recorded here with an explicit release recommendation.
- Wrap long text preview rows automatically and raise the input limit to 500 characters.
- Expand the README Features section and development guide to document current editor, library, import/export, PWA, and maintenance capabilities.
- Update the Material Symbols data, Playwright, auto-import generation, and Vue type-checking development dependencies.

### Fixed

- Recover touch input after interrupted pen interactions, preserve edits made while draft storage opens, restore 44-pixel mobile header targets, reject malformed draft grids safely, and retry IndexedDB after transient open failures.
- Reflow the full-screen glyph library toolbar across wide desktop sizes and harden its responsive interaction checks.
- Clear saved drafts reliably, make appearance choices fully clickable, restore drawer focus and mobile anchoring in Safari, keep narrow-screen export selectors reachable, and stabilize asynchronous preview, transition, and version checks.
- Keep the glyph grid readable on height-constrained desktop and tablet viewports by fitting its zoom to the available width and preserving vertical panning.

## [1.4.0] - 2026-07-30

### Added

- Preview text with the current glyphs directly in the editor.
- Add font export options and editable font metadata, including improved TrueType version metadata.
- Add merged Unifont overlay glyph data and show the source commit in the application version display.
- Improve Glyph Manager tool controls, accessibility, and dark-mode selection styling.

## [1.3.0] - 2026-07-29

### Added

- Display the application version in Settings.
- Let users manually check for a new PWA release while preserving their draft before an update is applied.
- Validate release versions, changelog entries, and release tags in CI.
