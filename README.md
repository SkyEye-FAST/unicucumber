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

- <https://uni.skyeyefast.top/>
- <https://unicucumber.vercel.app/>
- <https://uni.lakeus.xyz/>

## Features

- Editor
  - [x] Responsive desktop, tablet, and mobile layouts
  - [x] Pointer Events editing for mouse, touch, and pen, including pinch zoom and two-finger pan
  - [x] Pencil, eraser, fill, line, rectangle, selection, transforms, and grid shifting tools
  - [x] Select, move, nudge, cut, copy, paste preview, duplicate, delete, undo, and redo
  - [x] Keyboard shortcuts, zoom controls, fit-to-screen, and optional cursor previews
  - [x] Text preview using the current glyphs and the bundled Unifont catalog
- Glyph library and Unicode
  - [x] Manage multiple glyphs with search by code point, character, bitmap data, or Unicode name
  - [x] Filter by source, Unicode plane, and block, with compact/comfortable/large density modes
  - [x] Add, edit, duplicate, delete, and batch-manage glyphs with conflict-aware import
  - [x] Lazy-load bundled Unifont ranges with a bounded cache instead of loading the full map
- Import and export
  - [x] Export single glyphs as PNG, BMP, SVG, or hexadecimal text with scale and transparency controls
  - [x] Copy glyph images to the clipboard or share them through supported browser APIs
  - [x] Import `.hex` files and images through file selection, drag and drop, or image clipboard paste
  - [x] Prepare images with fit/crop, threshold, invert, and transparency controls
  - [x] Export multiple glyphs as `.hex`, versioned JSON backups, or configurable PNG bitmap sheets
  - [x] Export multiple glyphs as OTF, TTF, WOFF, WOFF2, BDF, or PSF files
  - [x] Choose full or modified glyph scopes and edit/reset font metadata before exporting
- Draft safety and persistence
  - [x] Crash-safe draft autosave with restore/discard prompts and lifecycle flushing
  - [x] IndexedDB glyph storage with validation, legacy migration, and a local-storage fallback
- [x] Installable offline PWA with offline status and explicit, draft-safe updates
- Accessibility and personalization
  - [x] Keyboard-accessible controls, ARIA labels, live status messages, and touch-safe targets
  - [x] Automatic, light, and dark themes with system preference synchronization
  - [x] English, Simplified Chinese, and Traditional Chinese translations
  - [x] Configurable glyph width, preview, library density, import, export, and autosave settings

## Development

UniCucumber supports Node.js 24 LTS or later and uses pnpm 10.34.5 through Corepack. Modern evergreen browsers with Pointer Events and ES modules are supported.

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

For commands, project structure, and updating generated Unifont data, see the
[Development guide](docs/development.md). For supported platforms, input behaviour,
offline operation, and PWA updates, see the [Platform and PWA guide](docs/platform.md).
Release and version-bump rules are documented in [Versioning](docs/versioning.md).

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
