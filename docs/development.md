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
pnpm profile:glyph-manager # profile Glyph Manager lookup and rendering
pnpm check:locales   # report unused translation keys without changing files
pnpm remove-unused-locale-keys # remove unused translation keys intentionally
pnpm version:check   # validate SemVer, changelog ordering, and release tags
pnpm chunk-unifont   # rebuild generated Unifont lookup chunks
pnpm update-unifont  # download and atomically install the latest Unifont data
```

`pnpm format` applies Prettier and `pnpm lint:fix` applies ESLint fixes. Use the
non-mutating `lint` and `format:check` commands in CI. Run `check:locales` as a
non-mutating locale audit before committing. The locale cleanup command and
generated-data commands change files, so review their diffs before committing.

## Architecture

- `src/components` contains the presentation and focused editor UI components.
- `src/domain` contains immutable grid commands for strokes, shapes, transforms,
  and selections.
- `src/composables/useEditorDocument.ts` owns the authoritative document, bounded
  atomic history, dirty state, and saved snapshot.
- `src/components/GlyphGrid.vue` is the explicit Pointer Events state machine;
  viewport zoom and pan are separate from document history.
- `src/storage` provides versioned IndexedDB persistence, validation, one-time
  `unicucumber_glyphs` migration, and a local-storage fallback. Imported preview
  font binaries use a separate IndexedDB database so large font files never enter
  the settings local-storage payload.
- `src/platform` contains optional browser and PWA adapters. Core editing does not
  depend on optional clipboard, sharing, or camera APIs.
- `src/utils` contains pure glyph conversion, image preparation, selection, import,
  and verified export helpers.
- `public/unifont/*.json` contains generated 4,096-code-point lookup ranges. Vite
  derives a compact range index from `public/unifont-map.json` for development and
  production builds; the full-screen catalog loads that index and hydrates only
  visible bitmap chunks with a bounded cache. Full BMP font exports also assemble
  their data from the required chunks instead of parsing the complete map in the
  browser.

## Styling

Tailwind CSS 4 runs through `@tailwindcss/vite`. Import its single entry point,
`src/styles/tailwind.css`, from `src/main.ts`; no PostCSS or JavaScript Tailwind
configuration is needed. See [Tailwind evaluation](tailwind.md) for the decision,
scope, and measured cost.

- Use `tw:` utilities for ordinary static layout in Vue templates. The source
  scanner reads `src/**/*.vue`; add explicit sources if classes move outside Vue
  files. Write complete class names rather than concatenating fragments.
- Reuse the application theme through the inline aliases in `tailwind.css`:
  `tw:text-muted`, `tw:text-glyph`, `tw:fill-glyph-background`, and the existing
  spacing tokens. Light/dark mode remains controlled by `useTheme` and
  `data-theme`, including user-defined glyph colors.
- Keep shared controls in `base.css` and specialized state, media queries,
  animations, and dynamic geometry in scoped CSS or bound styles. Remove the old
  declaration when moving a property into a utility.
- Preflight is deliberately omitted: native controls, heading defaults, focus
  indicators, and box sizing retain the application baseline. Set box sizing and
  border style explicitly when needed.
- Utilities are layered; existing unlayered CSS takes priority. Do not override
  shared controls using `!important` utilities. Modify the owning control rule
  instead. Preserve the 719px/720px layout boundary and safe-area rules rather
  than substituting Tailwind's default breakpoints.

For styling changes, inspect the affected UI and choose focused browser workflows
according to [the repository testing guidance](../AGENTS.md#testing-expectations).
Build when changing the styling toolchain; use the full browser matrix when the
scope or focused results warrant it. Verify offline behaviour against a production
preview when relevant, as described in [Platform support](platform.md).

## Updating Unifont data

Run the following command to download the latest release and atomically replace the
generated glyph map:

```shell
pnpm update-unifont
```

The script validates the release listing and `.hex` records, overlays the regular
`unifont` build over `unifont_all` for the BMP (avoiding the Unifont 17.0.04+ CJK
JP-build regression), times out failed requests, and leaves the current map
untouched if an update fails. This updates Unifont data, not the application
version; see [Versioning](versioning.md) for application releases.
