<div align="center">
<img src="https://raw.githubusercontent.com/SkyEye-FAST/unicucumber/master/public/icon.png">

# UniCucumber

[![License: GPL v3](https://img.shields.io/badge/License-GPL%20v3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)
[![GitHub stars](https://img.shields.io/github/stars/SkyEye-FAST/unicucumber)](https://github.com/SkyEye-FAST/unicucumber/stargazers)
[![GitHub issues](https://img.shields.io/github/issues/SkyEye-FAST/unicucumber)](https://github.com/SkyEye-FAST/unicucumber/issues)
</div>

This is a project for editing Unifont glyphs in browsers.

See [*Unifoundry.com* Unifont Utilities](https://unifoundry.com/unifont/unifont-utilities.html) for more information.

## Demostration

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

## Usage

To use this project, you need to have Node.js installed on your computer. Then, follow these steps:

1. Clone this repository:

    ``` shell
    git clone https://github.com/SkyEye-FAST/unicucumber.git
    ```

2. Install dependencies:

    ``` shell
    cd unicucumber
    npm install
    ```

3. Start the development server:

    ``` shell
    npm run dev
    ```

4. Open your browser and go to `http://localhost:5173/`.

## License

This program is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.

You should have received a copy of the GNU General Public License along with this program. If not, see <https://www.gnu.org/licenses/>.

## Feedback

Please feel free to raise issues for any problems encountered or feature suggestions.

Pull requests are welcome.
