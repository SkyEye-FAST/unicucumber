# Development guide

## Requirements and setup

UniCucumber supports Node.js 24 LTS or later and uses pnpm 10.34.5 through
Corepack.

```shell
git clone https://github.com/SkyEye-FAST/unicucumber.git
cd unicucumber
corepack enable
pnpm install --frozen-lockfile
pnpm dev
```

Open `http://localhost:5173/` after Vite starts.

## Commands

```shell
pnpm dev             # start Vite
pnpm check           # type-check, lint, format check, tests, and version validation
pnpm test            # run Vitest tests
pnpm test:coverage   # run Vitest tests with coverage output
pnpm test:e2e        # run Chromium, Firefox, WebKit, phone, and tablet projects
pnpm build           # type-check and create a production build
pnpm preview         # serve the production build locally
```

`pnpm format` applies Prettier and `pnpm lint:fix` applies ESLint fixes. Use the
non-mutating `lint` and `format:check` commands in CI.

## Architecture

- `src/components` contains the presentation and focused editor UI components.
- `src/domain` contains immutable grid commands for strokes, shapes, transforms,
  and selections.
- `src/composables/useEditorDocument.ts` owns the authoritative document, bounded
  atomic history, dirty state, and saved snapshot.
- `src/components/GlyphGrid.vue` is the explicit Pointer Events state machine;
  viewport zoom and pan are separate from document history.
- `src/storage` provides versioned IndexedDB persistence, validation, one-time
  `unicucumber_glyphs` migration, and a local-storage fallback.
- `src/platform` contains optional browser and PWA adapters. Core editing does not
  depend on optional clipboard, sharing, or camera APIs.
- `src/utils` contains pure glyph conversion, image preparation, selection, import,
  and verified export helpers.
- `public/unifont/*.json` contains generated 4,096-code-point lookup ranges. The
  glyph manager fetches only the required range and keeps a bounded eight-range
  cache instead of parsing the legacy 9.6 MB map.

## Updating Unifont data

Run the following command to download the latest release and atomically replace the
generated glyph map:

```shell
pnpm update-unifont
```

The script validates the release listing and `.hex` records, times out failed
requests, and leaves the current map untouched if an update fails. This updates
Unifont data, not the application version; see [Versioning](versioning.md) for
application releases.
