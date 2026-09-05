# AGENTS.md

## Scope

These instructions apply to the entire repository. A more specific `AGENTS.md` in a subdirectory may override them for that subtree.

## Project overview

UniCucumber is a client-side Vue 3 and TypeScript application for editing Unifont glyphs in the browser. It is also an installable PWA. Changes must preserve:

- crash-safe drafts and backwards-compatible persisted data;
- mouse, touch, pen, keyboard, and responsive layouts;
- offline operation and user-controlled PWA updates;
- current stable Chromium, Firefox, Safari, Mobile Safari, and Android Chrome;
- the distinction between application releases and generated Unifont data versions.

There is no application backend. Browser capabilities such as the clipboard, camera, sharing, IndexedDB, and service workers must be treated as fallible platform boundaries.

## Toolchain and commands

Use Node.js 24 LTS or later. Enable Corepack and use the repository-pinned pnpm version. Do not use npm or Yarn to modify dependencies or the lockfile.

```shell
corepack enable
pnpm install --frozen-lockfile
pnpm dev
```

Useful verification commands:

```shell
pnpm type-check
pnpm lint
pnpm format:check
pnpm test
pnpm test:coverage
pnpm build
pnpm check
pnpm test:e2e
pnpm check:locales
```

Choose verification from the actual change and its risk. `pnpm check` is the comprehensive quality gate, not a requirement for every task or commit. It runs type checking, linting, formatting checks, unit tests, and version validation. Use focused checks for ordinary changes; reserve the comprehensive gate for releases, broad changes, or unresolved regression risk. Run `pnpm build` when changing build configuration, dependencies, assets, or PWA behaviour, or when production bundling is relevant to an application change.

Use `pnpm format` and `pnpm lint:fix` only when intentionally applying automatic fixes. Avoid formatting unrelated files.

## Repository architecture

Keep responsibilities aligned with the existing structure:

- `src/components` contains presentation and focused editor UI components.
- `src/domain` contains pure, immutable grid commands for strokes, shapes, selections, transforms, and shifts.
- `src/composables/useEditorDocument.ts` owns the authoritative editor document, bounded atomic history, dirty state, and saved snapshot.
- `src/components/GlyphGrid.vue` owns the Pointer Events interaction state machine. Viewport pan and zoom are separate from document history.
- `src/storage` owns validated, versioned persistence, IndexedDB migrations, and local-storage fallbacks.
- `src/platform` contains optional browser and PWA adapters. Core editing workflows must not depend on an optional platform API.
- `src/utils` contains pure conversion, image preparation, selection, import, and export helpers.
- `src/locales` contains all user-visible translations.
- `e2e` contains Playwright workflows across desktop, phone, and tablet projects.
- `public/unifont` contains generated Unifont lookup data.

Use the `@/` alias for imports from `src`. Prefer the Vue Composition API and `<script setup lang="ts">` for components, consistent with the existing codebase.

## Implementation rules

### Editor state and history

Keep grid operations pure and immutable. Route document mutations through the existing editor-document APIs so undo/redo entries remain atomic and the dirty/saved state stays correct. Do not mutate the authoritative grid directly from components.

Do not add viewport position, zoom, transient pointer state, hover state, or gesture bookkeeping to document history. A single logical user action should produce one history entry.

### Input and interaction

Use Pointer Events rather than separate mouse-only handling. Preserve the established interaction model:

- one pointer uses the active tool;
- two touch pointers pan and zoom without drawing;
- pen input remains precise and suppresses accidental palm-touch drawing;
- the explicit Pan tool supports one-pointer panning.

Interactive changes must remain usable on desktop, small phones, and tablets. Preserve keyboard behaviour, focus handling, labels, ARIA attributes, live-region feedback, and adequate touch targets.

### Persistence and data safety

Treat data loaded from files, local storage, IndexedDB, the clipboard, and network responses as `unknown` until validated. Reuse the existing normalization and validation helpers instead of duplicating permissive parsing.

Persisted schema changes require an explicit compatibility and migration plan plus regression tests. Never silently discard valid older glyphs or drafts. Preserve the local-storage fallback and useful error distinctions such as unavailable storage versus quota exhaustion.

Draft safety takes precedence over convenience. Changes to application errors, navigation, service-worker updates, or lifecycle handling must not bypass pending-draft flushing.

### Platform and PWA behaviour

Optional APIs must use progressive enhancement and retain a core-workflow fallback. Handle permission denial, unsupported APIs, aborted operations, quota failures, and stale service-worker state without corrupting editor data.

Development intentionally runs without a registered service worker. Verify installation, offline behaviour, caching, and update flows against a production build:

```shell
pnpm build
pnpm preview
```

Do not blindly precache the large optional Unifont or Unicode-name datasets. Preserve bounded runtime caches and versioned cache names.

### Internationalization

Do not hard-code new user-visible text in components or composables. Add or update translation keys in all supported locale files:

- `src/locales/en.json`
- `src/locales/zh-cn.json`
- `src/locales/zh-tw.json`

Keep placeholders and key structure consistent between locales. Preserve the existing CJK mixed-text formatting path. Run `pnpm check:locales` after locale changes.

### Generated data and versions

Do not hand-edit generated files under `public/unifont`. Regenerate Unifont data through the documented scripts, normally `pnpm update-unifont`, and review the complete generated diff.

For every agent task, perform a version-decision checkpoint before making changes and again before the final handoff. Compare the requested and actual change scope with `docs/versioning.md`, then state explicitly whether an application-version bump is required and why. The `package.json` version is the single application-version source; the Unifont data version is independent. Every change, including ordinary implementation, documentation, tooling, and dependency work, must add a concise entry under `## [Unreleased]` in `CHANGELOG.md`. Do not bump the application version unless the release criteria in `docs/versioning.md` require it or a release/version change is explicitly requested. Each final handoff must state whether a release is recommended and why. A version check is required even when the conclusion is that no bump is needed.

For an actual release, follow `docs/versioning.md`: update the SemVer value, move the relevant Unreleased entries into the matching dated changelog entry and recreate an empty Unreleased section, run `pnpm check` and `pnpm build`, and use a matching `v<version>` tag.

### Dependencies and code quality

Keep dependency additions minimal and browser-appropriate. Prefer existing utilities and VueUse capabilities before adding a package. Update `pnpm-lock.yaml` only through pnpm.

Follow the configured ESLint and Prettier rules. Avoid `any`; use precise types and validate untrusted input. Keep reusable business logic out of large components. Prefer pure helpers and focused composables where behaviour can be tested independently.

## Testing expectations

Add or update regression tests when they protect meaningful behaviour or reproduce a bug. Do not add tests solely for documentation, static styling, mechanical refactors, or assertions that mirror the implementation. For changes that warrant tests:

- colocate Vitest files as `*.test.ts` or `*.spec.ts` under `src` or `scripts`;
- test domain and utility logic with focused unit tests;
- use Vue Test Utils for component behaviour;
- use `fake-indexeddb` for persistence and migration tests;
- use Playwright when the behaviour depends on real browser layout, input, or platform APIs and existing coverage is insufficient.

Run the narrowest relevant checks first and stop once they adequately cover the change:

- Documentation and shared editor configuration: formatting and configuration validation; no application tests or build by default.
- Local TypeScript or Vue logic: type checking and the affected tests; lint the changed files when appropriate.
- Static styling and localized responsive changes: inspect the affected UI and run its focused browser workflow when useful; no full browser matrix by default.
- Persistence, document history, shared pointer handling, or platform changes: targeted regression tests and the relevant browser/device projects. Broaden to the full suite only when the impact crosses those boundaries or failures leave uncertainty.
- Build and dependency changes: a production build plus relevant smoke tests. Use `pnpm check` for broad dependency/toolchain changes.

Do not repeat successful checks just to split the same validated changes into several commits. Each change still needs an Unreleased entry and a version decision; run `pnpm version:check` before the final handoff. Releases retain the full checks required by `docs/versioning.md`.

Examples:

```shell
pnpm exec vitest run src/path/to/file.test.ts
pnpm exec playwright test e2e/editor-workflow.spec.ts --project=chromium
```

Run the full Playwright matrix when a broad cross-platform change or the evidence from focused checks warrants it:

```shell
pnpm test:e2e
```

When service-worker or offline behaviour needs verification, build first and use the production-preview mode expected by the E2E suite:

```shell
pnpm build
PWA_E2E=1 pnpm exec playwright test e2e/pwa-offline.spec.ts
```

State exactly which checks were run. Do not claim a test passed when it was not executed.

## Change hygiene

Keep diffs focused on the requested task. Do not commit build output, coverage output, Playwright reports, test artifacts, machine-specific editor preferences, or unrelated generated files. Shared project editor configuration may be committed through explicit `.vscode` allowlist entries in `.gitignore`. Update documentation when commands, architecture, platform support, persistence formats, release procedures, or user-visible behaviour change.
