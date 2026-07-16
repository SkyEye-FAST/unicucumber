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
- [ ] Select, cut, copy, and paste actions (WIP)
- Multiple glyphs support
  - [x] A screen to list multiple glyphs
  - [x] Glyph search and filter
- Hexadecimal format support
  - [x] Export single glyph as hexadecimal string
  - [x] Import single glyph from hexadecimal string
  - [x] Save and load multiple glyphs in `.hex` format
- Image support
  - [x] Export single glyph as images (PNG, BMP, SVG, etc.)
  - [x] Import glyphs from image files
  - [ ] Generate bitmaps like `unihex2bmp` in Unifont Utilities (TODO)
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
pnpm build           # type-check and create a production build
pnpm preview         # serve the production build locally
```

`pnpm format` applies Prettier formatting; `pnpm lint:fix` applies ESLint fixes. The non-mutating `lint` and `format:check` commands are appropriate for CI.

### Architecture

- `src/components` contains the presentation and focused editor UI components.
- `src/composables` contains app-scoped settings, editor interaction, history, selection, and clipboard behavior.
- `src/utils` contains pure glyph conversion, selection, locale, export, and Unicode helpers, with Vitest coverage for high-value domain behavior.
- `public/unifont-map.json` is generated data used by glyph lookup.

### PWA notes

The production build registers the PWA service worker automatically. Development intentionally does not register a service worker, so stale cached assets do not hide normal local changes. Test installation and update behavior with `pnpm build && pnpm preview`.

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
