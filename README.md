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

- <https://uni.skyeyefast.top>
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
