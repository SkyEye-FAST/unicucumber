<div align="center">
<img src="https://raw.githubusercontent.com/SkyEye-FAST/unicucumber/master/src/assets/icon.png">

---

# UniCucumber

![GitHub License](https://img.shields.io/github/license/SkyEye-FAST/unicucumber)
[![GitHub stars](https://img.shields.io/github/stars/SkyEye-FAST/unicucumber)](https://github.com/SkyEye-FAST/unicucumber/stargazers)
[![GitHub issues](https://img.shields.io/github/issues/SkyEye-FAST/unicucumber)](https://github.com/SkyEye-FAST/unicucumber/issues)
</div>

This is a project for editing Unifont glyphs in browsers.

See [_Unifoundry.com_ Unifont Utilities](https://unifoundry.com/unifont/unifont-utilities.html) for more information.

## Demonstration

You can try the demo at the following links:

- <https://unicucumber.vercel.app/>
- <https://uni.lakeus.xyz/>

## Features

- [x] Responsive web design
- [x] Mouse and touchscreen support
- [x] Undo and redo actions
- [x] Pointer Events editing for mouse, touch, pen, pinch zoom, and two-finger pan
- [x] Pencil, eraser, fill, line, rectangle, selection, transforms, and grid shifting
- [x] Select, move, nudge, cut, copy, paste preview, duplicate, and delete
- [x] Crash-safe draft autosave and IndexedDB glyph storage with legacy migration
- Multiple glyphs support
  - [x] A screen to list multiple glyphs
  - [x] Search by code point, character, data, and Unicode name
  - [x] Previous/next navigation, batch deletion, and conflict-aware import
- Hexadecimal format support
  - [x] Export single glyph as hexadecimal string
  - [x] Import single glyph from hexadecimal string
  - [x] Save and load multiple glyphs in `.hex` format
  - [x] Export a versioned JSON backup
- Image support
  - [x] Export single glyph as images (PNG, BMP, SVG, etc.)
  - [x] Import glyphs from image files
  - [x] Prepare arbitrary photos with fit/crop, threshold, invert, and transparency controls
  - [x] Generate a sorted 16-column bitmap sheet at integer pixel scale
- [x] Installable offline PWA with explicit, draft-safe updates
- ~~Font support~~
  - [ ] ~~Export multiple glyphs as an OpenType font file~~

## Development

UniCucumber supports Node.js 24 LTS or later and uses pnpm 11.10.0 through Corepack. Modern evergreen browsers with Pointer Events and ES modules are supported.

1. Clone this repository:

   ```shell
   git clone https://github.com/SkyEye-FAST/unicucumber.git
   ```

2. Enable Corepack and install dependencies:

   ```shell
   cd unicucumber
   corepack enable
   pnpm install --frozen-lockfile
   ```

3. Start the development server:

   ```shell
   pnpm dev
   ```

4. Open your browser and go to `http://localhost:5173/`.

The main commands are:

```shell
pnpm dev             # start Vite
pnpm check           # type-check, lint, format check, and tests
pnpm test            # run Vitest tests
pnpm test:coverage   # run tests with coverage output
pnpm test:e2e        # run Chromium, Firefox, WebKit, phone, and tablet projects
pnpm build           # type-check and create a production build
pnpm preview         # serve the production build locally
```

`pnpm format` applies Prettier formatting; `pnpm lint:fix` applies ESLint fixes. The non-mutating `lint` and `format:check` commands are appropriate for CI.

### Architecture

- `src/components` contains the presentation and focused editor UI components.
- `src/domain` contains immutable grid commands for strokes, shapes, transforms, and selections.
- `src/composables/useEditorDocument.ts` owns the authoritative document, bounded atomic history, dirty state, and saved snapshot.
- `src/components/GlyphGrid.vue` is the explicit Pointer Events state machine; viewport zoom and pan are separate from document history.
- `src/storage` provides versioned IndexedDB persistence, validation, one-time `unicucumber_glyphs` migration, and a local-storage fallback.
- `src/platform` contains optional browser/PWA adapters. Core editing does not depend on optional clipboard, sharing, or camera APIs.
- `src/utils` contains pure glyph conversion, image preparation, selection, import, and verified export helpers.
- `public/unifont/*.json` contains generated 4,096-code-point lookup ranges. Opening the glyph manager does not parse the legacy 9.6 MB map; only the requested range is fetched and the client keeps a bounded eight-range cache.

### Mobile gestures and clipboard

- One finger uses the active tool. Select and drag inside a selection to move it; use the contextual controls to nudge or paste.
- Two fingers zoom and pan without drawing. The Pan tool provides explicit one-finger panning. Fit/reset buttons restore a predictable viewport.
- A pen behaves like a precise pointer and active pen input suppresses accidental palm-touch drawing.
- Copy always uses the in-session editor clipboard, which survives tool changes and glyph switches until the page session ends. When permitted, the same selection is also copied as plain text: a `UNICUCUMBER/1` header followed by rows of `0` and `1` pixels.

### Browser support

Current stable Chrome/Chromium, Firefox, Safari, Mobile Safari, and Android Chrome are the support baseline. Pointer Events, ES modules, IndexedDB, and service workers are expected. Web Share, image clipboard, camera capture, and related platform APIs are progressively enhanced and always have a core-workflow fallback.

### PWA notes

The production build registers the PWA service worker with a user-controlled update notice. The active draft is flushed before activation. Development intentionally does not register a service worker, so stale cached assets do not hide normal local changes. The editor shell works offline after a successful production load; the large optional Unifont and Unicode-name lookup data is not blindly precached. Test installation and update behavior with `pnpm build && pnpm preview`.

### Updating Unifont

To download the latest release and atomically replace the generated glyph map:

```shell
pnpm update-unifont
```

The script validates the release listing and `.hex` records, times out failed requests, and leaves the current map untouched if an update fails.

## License

The project is released under the [GPL v3 License](LICENSE).

```text
    UniCucumber
    Copyright (C) 2024-2026 SkyEye_FAST

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <https://www.gnu.org/licenses/>.
```

## Feedback

Please feel free to raise issues for any problems encountered or feature suggestions.

Pull requests are welcome.
