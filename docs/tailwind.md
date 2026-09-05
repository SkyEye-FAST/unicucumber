# Tailwind CSS evaluation

## Decision

Tailwind CSS is feasible here, but a complete rewrite is unnecessary. Use it for
repeated static layout and typography while retaining focused CSS for shared
controls and the editor's specialized behavior. This is the intended styling
architecture, not an interim compatibility layer or a requirement to convert
every component later.

The application already works with scoped Vue CSS and shared theme variables.
Tailwind improves how repetitive layout is authored; it does not solve document
state, persistence, accessibility, or canvas performance problems. Adoption has
a modest maintenance benefit and adds build dependencies and longer class lists.
It is not a prerequisite for future features.

## Feasibility and cost

The repository audit found 34 Vue components, 33 with scoped styles. Repeated
flex/grid layouts, spacing, secondary text, and preview styles are suitable for
utilities. The larger editor and library components also contain dynamic geometry,
virtual scrolling, cross-component selectors, transitions, and many carefully
chosen media queries. Translating those mechanically would obscure intent and
increase regression risk.

Vue 3 and Vite can use the [official Vite plugin](https://tailwindcss.com/docs/installation/using-vite).
Tailwind 4's documented baseline is Chrome 111, Safari 16.4, and Firefox 128,
which fits this project's current-stable-browser policy. Individual utilities
can require newer browser features; check them separately. See the
[compatibility documentation](https://tailwindcss.com/docs/compatibility).

Tailwind is a build-time dependency. Its generated CSS ships with the existing
Vite assets and PWA precache, requiring no runtime CDN, network request, or
JavaScript styling engine. No storage or application-version schema changes are
involved.

The same-machine production builds during the initial integration measured the main CSS at
138.32 kB before and 138.93 kB after; gzip grew from 21.87 kB to 22.38 kB. These
are Vite's rounded asset measurements, not a performance benchmark. This bounded
migration does **not** reduce transferred CSS. Its justification is shared
authoring conventions and fewer local declarations, not a bundle-size claim.

The subsequent component cleanup removed 533 scoped CSS lines across 10
components (2,896 to 2,363, including whitespace). Main CSS decreased from
138.93 kB to 131.30 kB, or 22.38 kB to 21.53 kB gzip. Template class lists also
increased main JavaScript from 597.94 kB to 602.36 kB, or 178.57 kB to 179.55 kB
gzip. The combined compressed CSS and main JavaScript is therefore approximately
unchanged. The practical benefit is fewer repeated declarations and removal of
obsolete rules, not a claim of faster loading.

## Implemented scope

- Install `tailwindcss` and `@tailwindcss/vite` 4.3.3 as development dependencies,
  resolved by the repository-pinned pnpm and lockfile.
- Use a single CSS entry with explicit Vue source scanning and `tw:` prefixes.
  Existing names such as `.container` cannot accidentally activate Tailwind
  utilities. Tests, documents, and generated glyph datasets are not scanned.
- Omit [Preflight](https://tailwindcss.com/docs/preflight#disabling-preflight)
  to retain native form controls and the existing base styles. The prefix applies
  to both generated classes and Tailwind's own variables.
- Map only the currently needed theme and spacing aliases to existing variables
  using `@theme inline`. There is one light/dark palette and one set of user glyph
  colors, rather than a second Tailwind palette to synchronize.
- Migrate static layout, spacing, text, and SVG fill in `ComponentCard`,
  `CompositionLayerItem`, `CompositionLayerPanel`, `CompositionToolbar`,
  `CompositionIdsGuide`, and `IdsTree`; delete their replaced declarations.
- Extend static layout utilities to `EditorHeader`, `HexCodeInput`,
  `DownloadButtons`, `SettingsSidebar`, `GlyphManager`, `GlyphList`,
  `GlyphLibraryToolbar`, `GlyphAdder`, and `UploadSection`.
- Consolidate shared settings-label typography and GlyphAdder button structure.
  Remove duplicate dialog styles and unused glyph-adder selectors. Remove the
  obsolete expanded inspector, scrim, and related animation rules: the current
  inspector is shown only in the compact manager. Keep the library toolbar's
  responsive rules together after its controls, without redundant mobile defaults.
- Keep button skins, hover/selected/hidden states, mobile control sizing,
  safe-area rules, and complex selectors in their owning CSS. Canvas geometry,
  virtual lists, pointer handling, persistence, and PWA update logic are untouched.

CSS layers matter: existing unlayered application rules outrank layered utilities,
regardless of selector specificity. For example, global `button { font: inherit }`
and `.ui-button` rules should not be counteracted with utility overrides. Keep
their specialized typography and control sizing in the owning stylesheet.

## Validation and release decision

The composition browser workflow checks card geometry and pixel colors through
light/dark changes on Chromium, Firefox, and WebKit. Existing workflows cover
nested IDS alignment, phone tabs and toolbar targets, layer actions, drafts,
responsive editor layouts, and reduced motion. Choose focused checks for later
styling changes according to [the repository testing guidance](../AGENTS.md#testing-expectations).
The full quality gate, browser matrix, and production build were used for this
initial toolchain integration. PWA offline workflows require a production build.
The subsequent cleanup uses focused editor/library/settings browser workflows,
the saved-list component tests, changed-file lint/format checks, and a production
build; it does not require repeating unrelated domain and persistence suites.

This is an internal styling refactor without a new user-visible feature, browser
support change, or data format change. Keep application version 1.7.0 and record
the work under Unreleased; a standalone release is not recommended for this
refactor. The other accumulated Unreleased settings feature warrants a minor
release if the complete pending changes are published together.
