# Visual Glyph Composition Workspace Design

## Summary

Add a native visual composition workspace to UniCucumber for constructing 16×16 glyphs from reusable bitmap components and IDS guidance. The feature replaces command-driven composition with direct manipulation while preserving the existing editor document, draft safety, undo/redo, offline PWA behaviour, and responsive interaction model.

The initial component dataset is converted at build/update time into UniCucumber-owned runtime formats. The product UI and runtime records do not expose the source tool name or source-specific collection names.

## Goals

- Provide a visual, direct-manipulation workflow for assembling 16×16 glyphs from reusable components.
- Preserve components as editable layers until the user explicitly saves the result to the Glyph Library.
- Support add, subtract, intersect, visibility, locking, ordering, translation, and binary masks with exact 1-bit semantics.
- Use IDS decomposition as a component-discovery assistant without making IDS the authoritative composition document.
- Keep the main editor, Glyph Library, and initial page load independent from the optional composition dataset.
- Persist unfinished composition work safely and restore it after reload without changing the main editor document.
- Work offline after the required composition data has been cached.
- Preserve desktop, tablet, phone, keyboard, touch, pen, accessibility, and PWA requirements already established by the project.

## Non-goals for the first release

- No Python runtime, shell, REPL, command parser, object pointers, or command compatibility layer.
- No generic arbitrary-size composition. The workspace operates on 16×16 glyphs only.
- No continuous scaling, affine transforms, rotation, grayscale, opacity, antialiasing, or image-style blend modes.
- No automatic destructive row/column compression or proportional resizing.
- No automatic IDS layout that silently modifies a composition.
- No source branding, source-specific collection labels, or source provenance fields in runtime component records.
- No backend service.

## Product entry and lifecycle

Add a Composition button to `EditorHeader.vue`, alongside Glyph Manager and Text Preview. The button uses the outlined Material Symbols layers icon to communicate that Composition combines multiple component layers rather than drawing directly. It remains visible for discoverability but is disabled when the current glyph width is not 16; the accessible description explains that visual composition currently supports 16×16 glyphs.

Opening Composition presents an independent modal workspace teleported to `body`. It uses the existing overlay-stack lock so it does not conflict with Settings or Text Preview. The main application becomes inert while the workspace is open, body scrolling is locked, Escape closes the top-level workspace when no nested editor is active, and focus returns to the invoking button.

The workspace owns a separate composition code-point selector. It accepts every supported CJK ideograph range (including Extensions A–J and compatibility ideographs), rejects other Unicode code points, and does not follow later code-point or grid changes in the main editor.

Opening behaviour:

- If an unfinished composition draft exists for the selected composition code point, restore it.
- Otherwise create a new composition document for that code point.
- When the selected code point is a CJK code point already open in the editor, its grid may seed the ordinary bottom layer named from the current glyph (localized as “Current glyph”); a non-CJK editor starts the workspace at the default CJK code point without importing the editor grid.

Saving a composition does not mutate the main editor document or its history. It emits the selected code point and composed `GridData` to `GlyphEditor.vue`, which upserts the result in the Glyph Library. The composition draft remains available for reopening, while the main editor remains responsible only for its own document state.

Starting a new composition or explicitly discarding composition work replaces/deletes the composition document only after confirmation when it is dirty.

## Architecture

The composition feature is a second, temporary document domain inside the application, not a new `GlyphGrid` tool.

```text
GlyphEditor
├── useEditorDocument ── authoritative final glyph + main history
├── GlyphGrid ────────── final bitmap editing
└── GlyphComposer
    ├── useGlyphComposer ─ composition document + composition history
    ├── ComponentBrowser ─ catalog search + IDS assistance
    ├── CompositionCanvas ─ direct layer manipulation + mask editing
    └── CompositionLayerPanel ─ order / operation / visibility / lock
```

`GlyphComposer` never mutates `useEditorDocument` directly. Its only final-output API is a `save(codePoint, GridData)` event; `GlyphEditor.vue` serializes Glyph Library writes with other library mutations.

The domain layer is pure and UI-independent. Vue components never implement bitmap boolean algebra themselves.

## File boundaries

Create:

- `src/types/composition.ts`: composition document, layers, commands, data-manifest and component record types.
- `src/domain/composition.ts`: pure layer translation, masking, boolean combination and document-command functions.
- `src/domain/composition.test.ts`: truth tables, clipping, masking, ordering and immutability tests.
- `src/composables/useGlyphComposer.ts`: bounded composition history and transient selection/controller state.
- `src/composables/useGlyphComposer.test.ts`: history atomicity and save-state tests.
- `src/services/compositionManifest.ts`: strict manifest validation and cache-name helpers.
- `src/services/compositionDataLoader.ts`: lazy catalog, component-chunk and IDS-chunk loading with bounded in-memory caches.
- `src/services/compositionDataLoader.test.ts`: validation, deduplication, retry, LRU and malformed-data tests.
- `src/storage/compositionDraftRepository.ts`: validated IndexedDB persistence plus local-storage fallback for composition drafts.
- `src/storage/compositionDraftRepository.test.ts`: restoration, corruption, fallback and quota/error behaviour.
- `src/utils/ids.ts`: IDS tokenizer/parser to an AST for the currently requested expression only.
- `src/utils/ids.test.ts`: binary/ternary operator parsing and malformed-input handling.
- `src/components/GlyphComposer/GlyphComposer.vue`: modal workspace orchestration.
- `src/components/GlyphComposer/ComponentBrowser.vue`: search, IDS tree and candidate results.
- `src/components/GlyphComposer/ComponentCard.vue`: lightweight metadata card; bitmap hydration only for displayed candidates.
- `src/components/GlyphComposer/IdsTree.vue`: recursive but presentation-only IDS tree.
- `src/components/GlyphComposer/CompositionCanvas.vue`: 16×16 layered rendering and pointer/keyboard movement.
- `src/components/GlyphComposer/CompositionLayerPanel.vue`: ordered layers and controls.
- `src/components/GlyphComposer/CompositionLayerItem.vue`: one layer row.
- `src/components/GlyphComposer/CompositionToolbar.vue`: undo/redo, mask mode and workspace commands.
- `scripts/composition/build-component-data.mjs`: convert an extracted source directory into runtime JSON assets.
- `scripts/composition/validate-component-source.mjs`: reject malformed source data before generation.

Modify:

- `src/types/editor.ts`: add `composition` to the existing `replaceGrid.reason` union.
- `src/components/EditorHeader.vue`: add composition entry event/button.
- `src/components/GlyphEditor.vue`: open/close/save orchestration and serialized Glyph Library writes.
- `src/locales/en.json`, `zh-cn.json`, `zh-tw.json`: all visible composition copy.
- `vite.config.ts`: composition-data version define and bounded runtime caching.
- `package.json`: composition-data generation/check scripts only; add no runtime dependency unless existing libraries prove insufficient.
- `CHANGELOG.md`: concise Unreleased entry.
- `docs/versioning.md` only if the data-version convention needs clarification beyond this spec.

Do not move composition responsibilities into `GlyphManager.vue` or `GlyphGrid.vue`.

## Composition document

```ts
export type CompositionOperation = 'add' | 'subtract' | 'intersect'

export interface CompositionLayer {
  id: string
  name: string
  bitmap: GridData
  offsetX: number
  offsetY: number
  mask: GridData | null
  operation: CompositionOperation
  visible: boolean
  locked: boolean
  componentId?: string
}

export interface CompositionDocument {
  schemaVersion: 1
  codePoint: string
  width: 16
  layers: CompositionLayer[]
}
```

Document state contains only content that affects or explains the composition. Selection, hover, active tabs, viewport scale, pointer gesture state and in-progress drag offsets are transient UI/controller state and never enter history or persisted document fingerprints.

`componentId` is an optional convenience link back to the static component catalog. `bitmap` is authoritative. A draft remains renderable when its original component cannot be loaded or the component dataset has changed.

## Layer semantics

The layer array is ordered bottom-to-top: `layers[0]` executes first. Composition starts from an all-zero 16×16 grid. Invisible layers are skipped. No first-layer special case exists.

For accumulated bit `A` and current effective layer bit `B`:

- `add`: `A OR B`
- `subtract`: `A AND NOT B`
- `intersect`: `A AND B`

Truth table:

```text
A B | add subtract intersect
0 0 |  0      0        0
0 1 |  1      0        0
1 0 |  1      1        0
1 1 |  1      0        1
```

There is no XOR or image-style blending in v1.

## Translation

Translation is non-destructive. Moving a layer changes only `offsetX` and `offsetY`; it never rewrites the stored bitmap. Rendering maps source cells to `source + offset` and clips only the effective view at the 16×16 canvas boundary. Pixels moved outside the canvas are therefore recoverable when the layer moves back.

Domain code accepts safe integer offsets and performs clipping. UI movement is snapped to one glyph cell.

A drag keeps a transient offset while the pointer is down and emits exactly one `moveLayer` command on pointer up. Arrow keys move the selected unlocked layer by one cell and create one history entry per key action.

## Masks

A mask is a non-destructive, layer-local 16×16 binary grid. `mask: null` means all source pixels are enabled and avoids storing all-one masks.

For a non-null mask, the effective local bitmap is `bitmap AND mask`; translation is applied after this local mask. Therefore bitmap and mask move together.

Mask edit mode exposes only two values: Keep (`1`) and Hide (`0`). A continuous pointer stroke is accumulated transiently and committed as one `replaceMask` history command. Clearing a mask returns it to `null` when every cell is enabled.

## Locking and visibility

A locked layer cannot be moved, renamed, deleted, reordered, re-masked, have its bitmap replaced, or change operation. It may be selected and shown/hidden. Visibility is composition content, is persisted, and participates in undo/redo.

## Composition commands and history

```ts
export type CompositionCommand =
  | { type: 'addLayer'; layer: CompositionLayer }
  | { type: 'removeLayer'; layerId: string }
  | { type: 'duplicateLayer'; layerId: string }
  | { type: 'renameLayer'; layerId: string; name: string }
  | { type: 'moveLayer'; layerId: string; dx: number; dy: number }
  | { type: 'reorderLayer'; layerId: string; targetIndex: number }
  | { type: 'setOperation'; layerId: string; operation: CompositionOperation }
  | { type: 'setVisibility'; layerId: string; visible: boolean }
  | { type: 'setLocked'; layerId: string; locked: boolean }
  | { type: 'replaceMask'; layerId: string; mask: GridData | null }
  | {
      type: 'replaceBitmap'
      layerId: string
      bitmap: GridData
      reason: 'transform' | 'component-reset'
    }
```

Commands are pure and immutable. No-op commands return the same document reference where practical. Duplicate performs deep copies of bitmap and mask.

`useGlyphComposer` maintains at most 100 full document snapshots, mirroring the simple bounded-history model already used by `useEditorDocument`. Selection and drag preview do not produce history entries.

## Static component runtime data

Runtime data is source-neutral and optimized for the browser. PNG and YAML are not runtime formats.

Directory:

```text
public/composition/
├── index.json
├── catalog.json
├── components/
│   ├── 00.json
│   ├── 01.json
│   └── ...
└── ids/
    ├── 000.json
    ├── 001.json
    └── ...
```

Manifest:

```ts
interface CompositionDataManifest {
  schemaVersion: 1
  dataVersion: string
  componentCount: number
  idsCount: number
  componentChunkFormat: 1
  idsChunkFormat: 1
}
```

No source-tool or source-collection fields are emitted.

Catalog records contain only search/display metadata and a chunk key:

```ts
interface CompositionComponentSummary {
  id: string
  characters: string[]
  bounds: [left: number, top: number, right: number, bottom: number]
  chunk: string
}
```

Component chunks contain payloads:

```ts
interface CompositionComponentRecord extends CompositionComponentSummary {
  hex: string // normalized uppercase 16×16 bitmap: exactly 64 hex digits
}
```

The build script assigns deterministic opaque IDs from a digest of normalized semantic characters plus bitmap data. The runtime ID does not encode Unicode, private-use values, source collection names, or source row numbers. Distinct bitmap variants remain distinct records; exact semantic+bitmap duplicates are deduplicated.

Component chunks are keyed by the first byte of the opaque digest (`00`…`FF`). The catalog may be loaded once because it contains metadata only. Bitmap chunks are loaded only for visible search candidates and selected components.

Bounds are computed at build time and are metadata only; source bitmap positioning is preserved. Adding a component does not auto-crop, auto-center, or alter the bitmap.

## IDS runtime data

IDS is stored independently from component payloads. Each Unicode code point maps to one or more compact IDS strings. IDS chunks use the same Unicode 0x1000-range chunk key convention as the existing Unifont loader.

Example payload:

```json
{
  "26126": ["⿰日月"]
}
```

The loader fetches only the IDS chunk required by the active code point. `ids.ts` parses selected expressions to an AST on demand:

```ts
type IdsNode =
  | { type: 'character'; value: string }
  | { type: 'operator'; operator: string; children: IdsNode[] }
```

Binary and ternary IDS operators use their Unicode-defined arity. Malformed expressions fail validation and are omitted from the UI instead of producing partial trees.

IDS is advisory. Clicking a leaf filters component candidates for that character. Adding a candidate creates an ordinary independent `CompositionLayer`; the layer does not retain an IDS-node binding.

## Component source conversion

The repository-side converter accepts an already-extracted source directory. It does not add a 7z runtime/build dependency merely to unpack the supplied archive.

Conversion responsibilities:

1. Validate expected bitmap dimensions and structural records before generating anything.
2. Decode source bitmap sheets into individual 16×16 binary glyphs.
3. Normalize every component payload to uppercase 64-digit hex.
4. Convert semantic component associations into `characters` arrays without preserving source collection labels.
5. Deduplicate exact semantic+bitmap duplicates.
6. Compute stable opaque IDs and bounds.
7. Generate catalog and component chunks atomically into a temporary directory, then replace `public/composition` only after complete validation.
8. Convert IDS records into code-point chunks and validate Unicode scalar values.
9. Emit `index.json` last with exact counts and a data version supplied by the generation command.

The converter must never hand-edit or partially update generated runtime files. Generated data is reviewed as a complete diff.

## Loader behaviour

`CompositionDataLoader` follows the existing `UnifontLoader` pattern but remains independent.

- Manifest promise deduplicates concurrent requests and resets after failure.
- Catalog promise deduplicates concurrent requests and validates every summary.
- Component chunks use an LRU resolved cache with default max 8 in-memory chunks plus an active-request map.
- IDS chunks use a separate LRU resolved cache with default max 8 chunks plus an active-request map.
- A failed fetch is not retained as a resolved or active entry.
- `getComponentsForCharacter(character)` filters metadata catalog without hydrating bitmap chunks.
- `hydrateComponents(ids)` groups IDs by chunk and loads each required chunk once.
- Every network response is treated as `unknown` and fully validated.

Searching the component catalog must not publish fresh reactive bitmap-cache objects. Candidate bitmap hydration is idempotent and bounded, following the lesson from the existing Glyph Library search regression.

## Persistence

Composition drafts use a dedicated repository and schema rather than extending the main glyph draft schema.

```ts
interface StoredCompositionDraft {
  id: string // normalized code point
  schemaVersion: 1
  updatedAt: number
  document: CompositionDocument
}
```

Use a dedicated IndexedDB database such as `unicucumber-composition`, version 1, with one `drafts` store keyed by code point. This avoids changing the existing `unicucumber` database version and therefore avoids an unnecessary migration for current glyph storage.

Fallback uses one versioned local-storage key per current composition draft collection, with strict size/error handling. IndexedDB is preferred. All loaded values are `unknown` until validated; invalid individual drafts are ignored, not coerced.

Persisted layers include the full bitmap and mask, so a draft is independent from the current component dataset. Dataset updates do not rewrite existing drafts.

Autosave behaviour:

- Save after a bounded debounce when composition content changes.
- Flush pending composition draft writes before page lifecycle boundaries through the existing draft-flush platform mechanism or a small generalized extension of it.
- Storage failure leaves the in-memory composition intact and surfaces a localized warning/error; it never closes the workspace.
- Explicit discard deletes only that code point’s composition draft.

## Save semantics

`GlyphComposer` computes `resultGrid = composeLayers(document.layers)` and emits it with its independent composition code point.

`GlyphEditor.vue` handles the event by loading the current Glyph Library, replacing an existing matching code point or appending a new glyph, and persisting the resulting collection:

```ts
const glyph = {
  codePoint: compositionCodePoint,
  hexValue: gridToHex(resultGrid),
}
const index = glyphs.value.findIndex(
  (item) => item.codePoint === glyph.codePoint,
)
const nextGlyphs =
  index === -1
    ? [...glyphs.value, glyph]
    : glyphs.value.map((item, itemIndex) =>
        itemIndex === index ? glyph : item,
      )
await replaceGlyphLibrary(nextGlyphs)
```

The main editor grid, dirty state, draft, and undo/redo history are unchanged by a composition save. Normal editor saves and Glyph Library edits share the same serialized write path so one operation cannot overwrite another operation's glyph snapshot.

## Desktop and tablet UI

For viewports with enough horizontal space, use a canvas-first, full-height modal workspace with a compact top header and three columns:

```text
┌───────────────────────────────────────────────────────────────────┐
│ Composition · U+XXXX                                      Close │
├────────────────┬─────────────────────────────┬────────────────────┤
│ Components/IDS │       16×16 canvas          │ Layers             │
│ search         │                             │ top layer          │
│ IDS tree       │   selected layer overlay    │ ...                │
│ candidates     │   final-result preview      │ bottom layer       │
│                │                             │ layer properties   │
├────────────────┴─────────────────────────────┴────────────────────┤
│ Add layer · Discard                  Undo · Redo · Save to library │
└───────────────────────────────────────────────────────────────────┘
```

The top bar keeps the title and code-point control on one compact horizontal line and reserves the opposite edge for the close control. Undo, redo and document actions live in the bottom toolbar so the header does not compete with the workspace content.

Left column: search field, IDS section for the active target character, candidate cards. Search accepts a literal character and normalized `U+XXXX`/hex code point; v1 does not add fuzzy transliteration or name search. Loading, empty and failure states occupy only the results region and provide a concrete next action instead of leaving a blank panel.

Center: crisp SVG or CSS-grid 16×16 stage. It is the dominant visual area and is centered within a quiet, bounded stage rather than surrounded by unused modal space. Final composition is rendered as a neutral base. The selected layer has a distinct non-color-only outline/handle treatment. Direct drag moves only the selected unlocked layer. Clicking overlapping pixels selects the topmost visible layer whose effective bitmap has a pixel at the hit cell; repeated clicks may cycle through overlapping candidates only if straightforward to implement, otherwise the layer panel remains the deterministic selector.

Right column: top visual row represents the last-executed layer. Use compact layer rows rather than tall cards. The first row contains the layer name, offset, visibility, lock and delete controls; the operation selector occupies a dedicated second row. Selection uses border, background and `aria-pressed`, not color alone. Desktop supports pointer reordering; keyboard and all platforms expose explicit move-up/move-down actions. Locked layers cannot reorder or be deleted.

Deleting an unlocked layer executes the existing `removeLayer` document command and creates one composition-history entry. It does not show a confirmation dialog because Undo is the immediate recovery path. If the deleted layer was selected, selection moves to the nearest surviving layer in visual order; deleting the final layer clears selection. The empty layer panel explains that the composition has no layers and offers Add blank layer. Whole-draft Discard remains a separate destructive workspace action and must not be presented as layer deletion.

The bottom toolbar has two spatial groups: Add blank layer and Discard on the left; Undo, Redo and the single primary Save to Glyph Library action on the right. The destructive draft action is visually separated from Save. Existing semantic theme, spacing, control-height, focus and modal tokens define the visual system; the redesign adds no new dependency or second icon family.

Layer properties use localized labels “Add”, “Subtract”, “Intersect”; source command names are never shown.

## Mobile UI

At narrow widths the modal becomes a full-screen workspace with one primary panel at a time and a segmented/tab control:

- Components
- Canvas
- Layers

Canvas is the default after adding a component. A sticky bottom action bar provides Discard, Undo, Redo and Save without covering scrollable panel content, and includes the bottom safe-area inset. Less frequent actions may wrap into a second row, but Save remains visually primary. Layer reordering uses explicit up/down buttons rather than touch drag to avoid scroll conflicts. Every icon-only action has at least a 44×44 CSS-pixel target and a localized accessible name.

Mask editing switches the Canvas into a clearly labelled mode with Keep/Hide controls and a Done action. Mobile never requires hover.

## Canvas interaction

CompositionCanvas has its own pointer state machine; it does not reuse or expand `GlyphGrid.vue`’s state machine.

- Primary pointer on a selected unlocked layer drags that layer snapped to grid cells.
- Pointer movement updates transient display only.
- Pointer up commits one `moveLayer` command.
- Pointer cancel restores the pre-drag position.
- Keyboard arrows move selected unlocked layers one cell.
- Two-finger pan/zoom is not required in v1 because the canvas is fixed 16×16 and should fit the modal; responsive sizing must keep all cells visible.
- Pen is treated as a precise pointer; no separate drawing occurs outside mask mode.
- In mask mode one pointer paints Keep/Hide values and commits one stroke as one command.

## Alignment helpers

V1 may expose six non-destructive offset commands when they are simple to fit into the layer properties UI:

- align left / horizontal center / align right
- align top / vertical center / align bottom

They compute offsets from build/runtime bounds and change only offsets. They never rewrite bitmap pixels. If these controls threaten initial-scope delivery, they are the first feature to defer; direct drag and arrow movement are sufficient for the first end-to-end version.

## Error handling

- Composition manifest/catalog unavailable: workspace opens with current-glyph/manual layers available, component browser shows a retryable localized error.
- Component chunk unavailable: only affected candidate/insert action fails; existing composition remains intact.
- IDS unavailable/malformed: component search continues; IDS section shows no decomposition or a retryable error.
- Draft storage unavailable/quota exceeded: editing continues in memory and a localized warning is shown.
- Invalid persisted draft: ignore it and start a fresh composition; never mutate the main glyph.
- Width changes while workspace is open are prevented because the main app is inert. On reopening at non-16 width, composition entry is disabled.

## PWA and caching

Add versioned runtime caches parallel to, but separate from, Unifont:

- composition manifest: StaleWhileRevalidate, max 1
- composition catalog: CacheFirst, max 1
- component chunks: CacheFirst, bounded to 64 stored entries
- IDS chunks: CacheFirst, bounded to 64 stored entries

All use `purgeOnQuotaError` where supported. Do not precache the full component or IDS dataset. The app shell remains installable and usable without ever opening Composition.

A new composition data version changes cache names. Startup or idle maintenance removes stale composition caches without touching active Unifont caches.

## Accessibility

- Modal has `role="dialog"`, `aria-modal="true"`, a labelled heading and focus restoration.
- All icon-only controls have localized accessible names.
- Composition entry and workspace controls use the same Material Symbols icon family and consistent outlined weight.
- Layer selection, visibility, lock, operation and order are keyboard operable.
- Delete is disabled for locked layers; unlocked deletion is recoverable with Undo and moves selection predictably.
- Reorder controls announce the new position via a polite live region.
- Canvas is not the only way to move a layer; arrows and layer-panel controls provide keyboard alternatives.
- Selected, locked, hidden and subtract/intersect states are not represented by color alone.
- Touch targets preserve the project’s existing control sizing.
- Component results use buttons/listbox-like semantics rather than clickable non-interactive divs.

## Performance targets

- Opening the main editor performs no composition manifest/catalog request.
- Opening Composition loads manifest + catalog + the active IDS chunk only.
- Searching metadata does not hydrate all matching bitmap chunks.
- Only displayed candidate records are hydrated, in small batches.
- In-memory component and IDS LRU caches default to 8 chunks each.
- Rendering a composition recomputes at most `layers × 256` binary cells; no worker is required for v1.
- Pointer drag preview must not persist or clone the whole document on every pointermove.

## Testing strategy

Domain unit tests:

- exact add/subtract/intersect truth tables
- bottom-to-top ordering
- visibility
- local masks
- translation and clipping without source-pixel loss
- duplicate deep-copy behaviour
- locked-command rejection
- no-op immutability

Controller tests:

- one drag commit = one history entry
- undo/redo across add/move/reorder/mask
- selection excluded from document history
- history bounded to 100
- current-glyph initialization
- save result does not clear the composition document

Loader tests:

- strict manifest/catalog/chunk validation
- concurrent request deduplication
- failure retry
- LRU eviction
- metadata search without bitmap hydration
- component hydration grouped by chunk
- IDS chunk lookup and malformed expression handling

Storage tests with fake IndexedDB:

- round-trip valid draft
- reject malformed draft
- separate code-point drafts
- fallback when IndexedDB unavailable
- quota/error distinction where practical
- deletion affects only requested code point

Component tests:

- open/close/focus restoration
- non-16 disabled entry
- add candidate → layer → canvas result
- operation selection
- visibility/locking
- unlocked layer deletion, selection fallback and Undo restoration
- locked layer deletion remains disabled and produces no document change
- mask mode
- Save emits the final grid and selected code point while retaining composition state
- mobile panel switching

Playwright workflows:

1. Open a 16×16 glyph, enter Composition, add two fixture components, move one, subtract another, Save, verify the Glyph Library entry and unchanged main editor grid/history.
2. Reload with unfinished composition and verify draft restoration without changing the main editor until Save.
3. Verify desktop pointer drag and keyboard movement.
4. Verify phone layout can add, move, reorder and save without horizontal overflow.
5. Production-preview PWA test: cache a component/IDS chunk, go offline, reopen and reuse cached data.
6. Ensure opening/loading the normal Glyph Library does not request composition data.
7. Verify the desktop canvas-first hierarchy, layer delete control and replacement header icon; verify the phone tabs and sticky action bar without horizontal overflow.

## Internationalization

All visible copy is added with identical key structure to English, Simplified Chinese and Traditional Chinese locale files. Use source-neutral product terms such as Composition, Components, IDS, Layers, Mask, Add, Subtract and Intersect. Do not surface source-tool or source-collection names.

## Versioning and changelog

This is a backwards-compatible user-visible feature. Based on current application version 1.6.0, the eventual release should be 1.7.0 unless unrelated accumulated changes require a different decision. During implementation, keep the package version at 1.6.0 until an explicit release step; add an entry under `## [Unreleased]` immediately.

Composition data versioning is independent from application and Unifont versions. `VITE_COMPOSITION_DATA_VERSION` is derived from `public/composition/index.json` when generated data exists.

## Delivery layering

Implement in working vertical slices:

1. Pure composition domain + controller with manual/current-glyph layers and Save.
2. Modal workspace + responsive layer/canvas UI.
3. Component runtime schema/loader + fixture data + component browser.
4. IDS loader/parser and tree-assisted discovery.
5. Composition draft persistence and lifecycle flushing.
6. Generated-data conversion pipeline and production component dataset.
7. PWA runtime caches and end-to-end/offline coverage.

Each slice must leave the product runnable and testable. Do not build the entire data pipeline before the composition editor works end-to-end.

## Acceptance criteria

The feature is ready when a user can, without a command line:

1. Open Composition from a 16×16 glyph.
2. Find a component by character or through the target character’s IDS tree.
3. Add multiple components as independent layers.
4. Move, reorder, hide, lock, add, subtract, intersect and mask layers visually.
5. Undo/redo composition actions independently from the main editor.
6. Save the final 16×16 result to the Glyph Library without creating a main-editor history action.
7. Reload and recover unfinished composition safely.
8. Use previously loaded composition data offline.
9. Complete the workflow on desktop and phone with keyboard/touch accessible alternatives.
10. Never need or see command-line concepts or source-specific labels in the product UI.
