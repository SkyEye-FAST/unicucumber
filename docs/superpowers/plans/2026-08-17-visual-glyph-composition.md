# Visual Glyph Composition Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a native visual 16×16 component-composition workspace that applies its final bitmap as one atomic main-editor edit.

**Architecture:** Composition is an independent temporary document domain with pure bitmap/layer commands, its own bounded history and separate draft persistence. Static component/IDS data is source-neutral, manifest-driven and lazily hydrated; the main editor receives only the final `GridData` through the existing `replaceGrid` command path.

**Tech Stack:** Vue 3 Composition API, TypeScript 6, Vitest, Vue Test Utils, fake-indexeddb, Playwright, Vite 8, Workbox/Vite PWA, existing UniCucumber grid/hex utilities.

## Global Constraints

- Composition canvas is exactly 16×16 in v1; other glyph widths keep a visible disabled entry.
- Product UI/runtime data must not expose source-tool or source-collection names.
- No Python/browser runtime, backend, arbitrary scaling, rotation, grayscale or image blend modes.
- Main `GlyphGrid` pointer state machine remains untouched by composition interaction.
- Composition never writes glyph storage directly; Apply uses one `replaceGrid` command with reason `composition`.
- Persisted composition layers contain full bitmap/mask payloads so dataset updates cannot alter drafts.
- All external/persisted JSON is `unknown` until validated.
- Do not precache the full component/IDS dataset; use bounded runtime and in-memory caches.
- All user-visible strings exist in `en`, `zh-cn`, and `zh-tw`.
- Keep package version 1.6.0 during implementation; add an Unreleased changelog entry. Eventual feature release recommendation is 1.7.0.
- Use TDD: every production behavior begins with a failing relevant test.

---

### Task 1: Composition domain and command model

**Files:**

- Create: `src/types/composition.ts`
- Create: `src/domain/composition.ts`
- Create: `src/domain/composition.test.ts`
- Modify: `src/types/editor.ts`

**Interfaces:**

- Produces `CompositionOperation`, `CompositionLayer`, `CompositionDocument`, `CompositionCommand`.
- Produces `createCompositionDocument(codePoint, initialGrid?)`, `applyCompositionCommand(document, command)`, `translateLayerBitmap(layer)`, `composeLayers(layers)`.
- Extends editor `replaceGrid.reason` with `'composition'`.

- [ ] **Step 1: Write failing truth-table and translation tests**

```ts
it.each([
  [0, 0, 0, 0, 0],
  [0, 1, 1, 0, 0],
  [1, 0, 1, 1, 0],
  [1, 1, 1, 0, 1],
])('combines %i and %i', (a, b, add, subtract, intersect) => {
  expect(combineCell(a, b, 'add')).toBe(add)
  expect(combineCell(a, b, 'subtract')).toBe(subtract)
  expect(combineCell(a, b, 'intersect')).toBe(intersect)
})

it('translation clips only the rendered bitmap and preserves source pixels', () => {
  const layer = layerWithPixel(0, 0, { offsetX: -1, offsetY: 0 })
  expect(translateLayerBitmap(layer).flat().some(Boolean)).toBe(false)
  expect(layer.bitmap[0]?.[0]).toBe(1)
})
```

- [ ] **Step 2: Run RED**

Run: `pnpm exec vitest run src/domain/composition.test.ts`
Expected: FAIL because composition domain exports do not exist.

- [ ] **Step 3: Implement minimal pure domain**

Use 16 rows/columns, deep-clone only when a command changes content, enforce locked-layer restrictions, apply masks before translation, execute layer array bottom-to-top, and deep-copy duplicate bitmap/mask.

Core composition loop:

```ts
export const composeLayers = (
  layers: readonly CompositionLayer[],
): GridData => {
  let result = createGrid(16)
  for (const layer of layers) {
    if (!layer.visible) continue
    const effective = translateLayerBitmap(layer)
    result = result.map((row, y) =>
      row.map((cell, x) =>
        combineCell(cell, effective[y]![x]!, layer.operation),
      ),
    ) as GridData
  }
  return result
}
```

- [ ] **Step 4: Run GREEN and existing grid tests**

Run: `pnpm exec vitest run src/domain/composition.test.ts src/domain/grid.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

`git commit -am "feat: add glyph composition domain"` after adding new files.

### Task 2: Composition controller and bounded history

**Files:**

- Create: `src/composables/useGlyphComposer.ts`
- Create: `src/composables/useGlyphComposer.test.ts`

**Interfaces:**

- Consumes Task 1 document/commands.
- Produces `useGlyphComposer(initial, historyLimit = 100)` with `document`, `resultGrid`, `dirty`, `canUndo`, `canRedo`, `selectedLayerId`, `execute`, `undo`, `redo`, `reset`, `markSaved`.

- [ ] **Step 1: Write failing controller tests**

```ts
it('keeps composition history independent and bounded', () => {
  const composer = useGlyphComposer(createCompositionDocument('660E'), 2)
  composer.execute({ type: 'addLayer', layer: makeLayer('a') })
  composer.execute({ type: 'addLayer', layer: makeLayer('b') })
  composer.execute({ type: 'addLayer', layer: makeLayer('c') })
  expect(composer.history.value).toHaveLength(2)
})

it('does not make layer selection part of document history', () => {
  const composer = useGlyphComposer(createCompositionDocument('660E'))
  const before = composer.history.value.length
  composer.selectedLayerId.value = 'a'
  expect(composer.history.value).toHaveLength(before)
})
```

- [ ] **Step 2: Run RED**

`pnpm exec vitest run src/composables/useGlyphComposer.test.ts`

- [ ] **Step 3: Implement snapshot controller**

Mirror `useEditorDocument`’s bounded snapshot approach, but fingerprint only composition content and keep selection transient.

- [ ] **Step 4: Run GREEN**

`pnpm exec vitest run src/composables/useGlyphComposer.test.ts src/domain/composition.test.ts`

- [ ] **Step 5: Commit**

`git commit -am "feat: add composition document controller"`

### Task 3: Minimal visual workspace, layers and Apply vertical slice

**Files:**

- Create: `src/components/GlyphComposer/GlyphComposer.vue`
- Create: `src/components/GlyphComposer/CompositionCanvas.vue`
- Create: `src/components/GlyphComposer/CompositionLayerPanel.vue`
- Create: `src/components/GlyphComposer/CompositionLayerItem.vue`
- Create: `src/components/GlyphComposer/CompositionToolbar.vue`
- Create: `src/components/GlyphComposer/GlyphComposer.test.ts`
- Modify: `src/components/EditorHeader.vue`
- Modify: `src/components/GlyphEditor.vue`
- Modify: `src/locales/en.json`
- Modify: `src/locales/zh-cn.json`
- Modify: `src/locales/zh-tw.json`

**Interfaces:**

- `GlyphComposer` props: `modelValue`, `codePoint`, `grid`, `returnFocusTarget?`.
- Emits: `update:modelValue(boolean)`, `apply(GridData)`.
- Header emits `openComposition(trigger: HTMLElement)`.

- [ ] **Step 1: Write failing component tests**

Cover disabled header button at non-16 width through parent integration, current-grid initialization, operation/visibility controls, keyboard move, and Apply retaining composition state.

```ts
it('emits one final grid without mutating the input grid', async () => {
  const grid = createGrid(16)
  const wrapper = mount(GlyphComposer, {
    props: { modelValue: true, codePoint: '660E', grid },
  })
  await wrapper.get('[data-testid="composition-add-blank"]').trigger('click')
  await wrapper.get('[data-testid="composition-apply"]').trigger('click')
  expect(wrapper.emitted('apply')).toHaveLength(1)
  expect(grid).toEqual(createGrid(16))
})
```

- [ ] **Step 2: Run RED**

`pnpm exec vitest run src/components/GlyphComposer/GlyphComposer.test.ts`

- [ ] **Step 3: Implement modal workspace and basic canvas**

Reuse `acquireOverlayLock/releaseOverlayLock`; render 16×16 with crisp cells/SVG, pointer drag transiently, commit one move on pointerup, keyboard arrows as one-cell moves. Desktop uses center canvas + right layers; left placeholder panel exists for Task 5. Mobile uses Components/Canvas/Layers tabs.

- [ ] **Step 4: Wire Apply through `GlyphEditor.vue`**

```ts
const handleCompositionApply = (grid: GridData): void => {
  editorDocument.execute({ type: 'replaceGrid', grid, reason: 'composition' })
}
```

Do not write glyph storage from the modal.

- [ ] **Step 5: Run GREEN plus editor component tests**

`pnpm exec vitest run src/components/GlyphComposer/GlyphComposer.test.ts src/components/GlyphGrid.test.ts`

- [ ] **Step 6: Commit**

`git commit -am "feat: add visual composition workspace"`

### Task 4: Composition manifest and lazy component loader

**Files:**

- Create: `src/services/compositionManifest.ts`
- Create: `src/services/compositionManifest.test.ts`
- Create: `src/services/compositionDataLoader.ts`
- Create: `src/services/compositionDataLoader.test.ts`
- Add small deterministic test fixtures under `public/composition/` only if required by E2E; unit tests should inject fetch.

**Interfaces:**

- Produces strict parsers for manifest/catalog/component chunks.
- Produces `CompositionDataLoader` with `loadManifest`, `loadCatalog`, `searchComponents`, `hydrateComponents`, `loadIdsForCodePoint`.

- [ ] **Step 1: Write failing validation and caching tests**

```ts
it('searches catalog metadata without fetching component chunks', async () => {
  const fetcher = fixtureFetcher()
  const loader = new CompositionDataLoader(fetcher)
  await loader.searchComponents('木')
  expect(
    fetcher.calls.filter((url) => url.includes('/components/')),
  ).toHaveLength(0)
})
```

Also test malformed 64-digit hex payloads, concurrent request deduplication, failed-request retry and 8-entry LRU eviction.

- [ ] **Step 2: Run RED**

`pnpm exec vitest run src/services/compositionManifest.test.ts src/services/compositionDataLoader.test.ts`

- [ ] **Step 3: Implement loader with injected fetch and separate component/IDS caches**

Do not expose reactive global chunk objects; return immutable/plain records to callers.

- [ ] **Step 4: Run GREEN**

Same Vitest command; expected PASS.

- [ ] **Step 5: Commit**

`git commit -am "feat: load composition components lazily"`

### Task 5: Component browser and IDS guidance

**Files:**

- Create: `src/utils/ids.ts`
- Create: `src/utils/ids.test.ts`
- Create: `src/components/GlyphComposer/ComponentBrowser.vue`
- Create: `src/components/GlyphComposer/ComponentCard.vue`
- Create: `src/components/GlyphComposer/IdsTree.vue`
- Modify: `src/components/GlyphComposer/GlyphComposer.vue`
- Modify: locale files.

**Interfaces:**

- `parseIds(expression): IdsNode | null`.
- `ComponentBrowser` emits `addComponent(record)` after hydrating the selected candidate only.

- [ ] **Step 1: Write failing IDS parser tests**

```ts
expect(parseIds('⿰日月')).toEqual({
  type: 'operator',
  operator: '⿰',
  children: [
    { type: 'character', value: '日' },
    { type: 'character', value: '月' },
  ],
})
expect(parseIds('⿲ABC')?.children).toHaveLength(3)
expect(parseIds('⿰日')).toBeNull()
```

- [ ] **Step 2: Run RED**

`pnpm exec vitest run src/utils/ids.test.ts`

- [ ] **Step 3: Implement parser and browser**

Search literal character and normalized code-point forms. IDS leaves set the search character. Candidate list hydrates only visible card payloads or the selected candidate, never the whole result set.

- [ ] **Step 4: Add component into controller as normal independent layer**

Convert record hex with existing `hexToGrid`; preserve source bitmap position and set default operation `add`.

- [ ] **Step 5: Run focused tests**

`pnpm exec vitest run src/utils/ids.test.ts src/components/GlyphComposer/GlyphComposer.test.ts src/services/compositionDataLoader.test.ts`

- [ ] **Step 6: Commit**

`git commit -am "feat: browse composition components with IDS"`

### Task 6: Composition draft persistence

**Files:**

- Create: `src/storage/compositionDraftRepository.ts`
- Create: `src/storage/compositionDraftRepository.test.ts`
- Modify: `src/components/GlyphComposer/GlyphComposer.vue`
- Modify: `src/platform/draftFlush.ts` only if a small generalization is required.

**Interfaces:**

- `StoredCompositionDraft` keyed by normalized code point.
- Repository: `saveDraft`, `loadDraft(codePoint)`, `deleteDraft(codePoint)`, `persistent`.
- IndexedDB database `unicucumber-composition`, version 1, store `drafts`.
- Local-storage fallback key `unicucumber_composition_drafts_v1` storing a validated map keyed by code point.

- [ ] **Step 1: Write failing repository tests with fake-indexeddb**

Round-trip, malformed draft rejection, per-code-point isolation, delete-one-only, IndexedDB failure fallback and quota failure.

- [ ] **Step 2: Run RED**

`pnpm exec vitest run src/storage/compositionDraftRepository.test.ts`

- [ ] **Step 3: Implement repository and strict validators**

Reuse existing storage-error distinctions where practical; do not change the main glyph database version.

- [ ] **Step 4: Add debounced modal autosave and restoration**

Only document content triggers saves. Apply does not delete the draft. Explicit Discard deletes it. Storage errors keep in-memory state and render a localized warning.

- [ ] **Step 5: Run GREEN**

`pnpm exec vitest run src/storage/compositionDraftRepository.test.ts src/components/GlyphComposer/GlyphComposer.test.ts`

- [ ] **Step 6: Commit**

`git commit -am "feat: persist composition drafts safely"`

### Task 7: Generated component-data pipeline

**Files:**

- Create: `scripts/composition/validate-component-source.mjs`
- Create: `scripts/composition/build-component-data.mjs`
- Create: matching Vitest tests under `scripts/composition/`.
- Modify: `package.json` scripts.
- Generate: `public/composition/**` from an extracted source directory when source data is available in the execution workspace.

**Interfaces:**

- Command: `pnpm update-composition-data -- <source-directory> <data-version>`.
- Output manifest/catalog/chunks exactly matching Task 4 validators.

- [ ] **Step 1: Write failing converter fixture tests**

Create a tiny temporary source fixture with one 16×16 component and one IDS record; assert deterministic ID, 64-digit uppercase hex, computed bounds, source-neutral catalog and atomic output.

- [ ] **Step 2: Run RED**

`pnpm exec vitest run scripts/composition`

- [ ] **Step 3: Implement validation/conversion using Node standard library and existing dependencies**

Do not add a runtime dependency or an archive-unpacking dependency. The source directory must already be extracted.

- [ ] **Step 4: Generate real runtime data when the extracted dataset is available**

Run: `pnpm update-composition-data -- <extracted-source> <version>` then review all generated diffs and validate counts.

- [ ] **Step 5: Run GREEN**

`pnpm exec vitest run scripts/composition src/services/compositionDataLoader.test.ts`

- [ ] **Step 6: Commit**

`git commit -am "build: generate visual composition data"`

### Task 8: PWA caching, E2E, docs and quality gate

**Files:**

- Modify: `vite.config.ts`
- Add/modify: `e2e/editor-workflow.spec.ts` or focused `e2e/composition.spec.ts`
- Modify: `CHANGELOG.md`
- Modify README only if user-facing usage documentation belongs there.

**Interfaces:**

- Define `VITE_COMPOSITION_DATA_VERSION` from generated manifest when present.
- Workbox caches manifest/catalog/components/IDS with bounded versioned caches and `purgeOnQuotaError`.

- [ ] **Step 1: Write failing E2E workflow**

Cover open → add fixture components → move → subtract → Apply → one main-editor Undo returns to pre-Apply bitmap; draft reload; phone workflow; normal editor makes no composition requests.

- [ ] **Step 2: Run focused E2E RED where applicable**

`pnpm exec playwright test e2e/composition.spec.ts --project=chromium`

- [ ] **Step 3: Add PWA cache configuration and production-preview offline test**

Build before offline coverage; cache only resources actually fetched.

- [ ] **Step 4: Add Unreleased changelog entry and run locale validation**

`pnpm check:locales`

- [ ] **Step 5: Run full verification**

```bash
pnpm check
pnpm build
pnpm test:e2e
```

For production PWA behaviour:

```bash
pnpm build
PWA_E2E=1 pnpm exec playwright test e2e/pwa-offline.spec.ts
```

- [ ] **Step 6: Version decision**

Do not bump during feature development. Recommend minor release 1.7.0 after acceptance because this is a backwards-compatible user-visible feature.

- [ ] **Step 7: Commit**

`git commit -am "test: verify visual composition workflow"`
