# Composition Workspace Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the visual glyph composer into a canvas-first responsive workspace, expose undoable per-layer deletion, and replace the ambiguous drawing entry icon with the existing Material Symbols layers icon.

**Architecture:** Keep `GlyphComposer.vue` as the workspace orchestrator and route deletion through the existing pure `removeLayer` command in `useGlyphComposer`. Keep layer-row interaction inside `CompositionLayerItem.vue`, event forwarding inside `CompositionLayerPanel.vue`, and document actions inside `CompositionToolbar.vue`; the redesign changes presentation and event wiring without changing persisted composition schemas, draft semantics, or component-data loading.

**Tech Stack:** Vue 3 Composition API, TypeScript 6, scoped CSS with existing semantic tokens, Iconify Material Symbols through the repository's existing unplugin-icons configuration, Vue Test Utils/Vitest, Playwright, pnpm 10.

## Global Constraints

- Composition remains a separate 16×16 document and never mutates the main editor history.
- Every document mutation continues through `composer.execute(...)`; do not mutate `composer.document.value.layers` directly.
- Locked layers cannot be deleted. Unlocked deletion is one history entry and Undo is the recovery path; do not add a confirmation dialog.
- Deleting the selected layer selects the nearest surviving layer in document order; deleting the final layer clears selection.
- Whole-draft Discard stays separate from per-layer deletion and keeps its current persistence behavior.
- Reuse existing `--modal-*`, `--background-*`, `--border-*`, `--text-*`, `--primary-*`, spacing, radius, control-height, focus and disabled tokens.
- Use only the existing Material Symbols icon family for new workspace icons; add no dependency and no raster/emoji icon.
- Preserve internal scrolling in `ComponentBrowser` and the existing `activeTab`/`mobile-hidden` mobile-panel mechanism.
- Icon-only controls need localized `aria-label` values and at least a 44×44 CSS-pixel target on narrow screens.
- Add every new locale key with the same structure in `en`, `zh-cn`, and `zh-tw`.
- Keep `package.json` at 1.6.0 during development. Add one concise Changed entry under `## [Unreleased]`; the accumulated composition feature remains a recommended minor release to 1.7.0.
- Use TDD for deletion and responsive workflow behavior: observe the focused test fail for the intended reason before editing production code.

---

### Task 1: Undoable layer deletion and selection fallback

**Files:**

- Modify: `src/components/GlyphComposer/GlyphComposer.test.ts:143-221`
- Modify: `src/components/GlyphComposer/GlyphComposer.vue:96-105,338-413`
- Modify: `src/components/GlyphComposer/CompositionLayerPanel.vue:1-49`
- Modify: `src/components/GlyphComposer/CompositionLayerItem.vue:1-96`
- Modify: `src/components/GlyphComposer/CompositionToolbar.vue:24-41`
- Modify: `e2e/composition.spec.ts:150-172`
- Modify: `src/locales/en.json` composition keys
- Modify: `src/locales/zh-cn.json` composition keys
- Modify: `src/locales/zh-tw.json` composition keys

**Interfaces:**

- `CompositionLayerItem` produces `remove: []` and renders `data-testid="composition-layer-${layer.id}-delete"`.
- `CompositionLayerPanel` produces `remove: [layerId: string]` and forwards item removal with the owning layer ID.
- `GlyphComposer` consumes `@remove="removeLayer"` and executes `{ type: 'removeLayer', layerId }` through `composer.execute`.
- Locale additions: `composition.delete_layer`, `composition.empty_layers`, and `composition.add_first_layer` with matching placeholders and key structure.

- [ ] **Step 1: Write failing component tests for deletion, lock protection, selection fallback, and Undo**

Add these behaviors near the existing layer-control tests in `GlyphComposer.test.ts`. The first test catches a missing or incorrectly wired remove command and a stale selected-layer ID; the second catches a delete button that ignores the persisted lock state.

```ts
it('deletes the selected layer, selects its neighbor, and restores it with Undo', async () => {
  const wrapper = mountComposer()
  await wrapper.get('[data-testid="composition-add-blank"]').trigger('click')
  await wrapper.get('[data-testid="composition-add-blank"]').trigger('click')

  await wrapper
    .get('[data-testid="composition-layer-blank-2-delete"]')
    .trigger('click')

  expect(
    wrapper.find('[data-testid="composition-layer-blank-2-select"]').exists(),
  ).toBe(false)
  expect(
    wrapper
      .get('[data-testid="composition-layer-blank-1-select"]')
      .attributes('aria-pressed'),
  ).toBe('true')

  await wrapper.get('[data-testid="composition-undo"]').trigger('click')
  expect(
    wrapper.find('[data-testid="composition-layer-blank-2-select"]').exists(),
  ).toBe(true)
})

it('does not allow a locked layer to be deleted', async () => {
  const wrapper = mountComposer()
  await wrapper
    .get('[data-testid="composition-layer-current-glyph-lock"]')
    .trigger('click')

  const deleteButton = wrapper.get<HTMLButtonElement>(
    '[data-testid="composition-layer-current-glyph-delete"]',
  )
  expect(deleteButton.element.disabled).toBe(true)
  await deleteButton.trigger('click')
  expect(
    wrapper
      .find('[data-testid="composition-layer-current-glyph-select"]')
      .exists(),
  ).toBe(true)
})
```

Add `data-testid="composition-undo"` and `data-testid="composition-layer-${layer.id}-lock"` to the existing controls so the assertions target behavior rather than translated text.

Extend the existing phone workflow with a browser-level deletion assertion. It catches event wiring that works only in the component harness or a delete action that becomes unreachable in the real narrow layout:

```ts
await page.getByTestId('composition-add-blank').click()
await tabs.getByRole('button', { name: 'Layers' }).click()

const deleteButton = page.getByTestId('composition-layer-blank-1-delete')
await expect(deleteButton).toBeVisible()
await expect(deleteButton).toBeEnabled()
await deleteButton.click()
await expect(page.getByTestId('composition-layer-blank-1-select')).toHaveCount(
  0,
)
await expect(page.getByTestId('composition-save')).toBeInViewport()
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
pnpm exec vitest run src/components/GlyphComposer/GlyphComposer.test.ts
pnpm exec playwright test e2e/composition.spec.ts --project=chromium-phone
```

Expected: both commands FAIL because the layer delete and lock test selectors do not exist. Confirm the failure is a missing product control, not a mount, locale, fixture, or mock error.

- [ ] **Step 3: Add localized delete/empty-state copy and item/panel event wiring**

Add locale values:

```json
// en
"add_first_layer": "Add blank layer",
"delete_layer": "Delete {name}",
"empty_layers": "No layers yet. Add a component or start with a blank layer."

// zh-cn
"add_first_layer": "添加空白图层",
"delete_layer": "删除{name}",
"empty_layers": "还没有图层。请添加部件或从空白图层开始。"

// zh-tw
"add_first_layer": "新增空白圖層",
"delete_layer": "刪除{name}",
"empty_layers": "尚未有圖層。請新增部件或從空白圖層開始。"
```

In `CompositionLayerItem.vue`, replace the text visibility/lock actions with existing Material Symbols visibility and lock icons, add the delete icon, and keep the icon SVGs hidden from assistive technology because the button owns the name:

```vue
<button
  type="button"
  class="ui-icon-button layer-action"
  :data-testid="`composition-layer-${layer.id}-delete`"
  :aria-label="$t('composition.delete_layer', { name: layer.name })"
  :disabled="layer.locked"
  @click="$emit('remove')"
>
  <i-material-symbols-delete-outline aria-hidden="true" />
</button>
```

Extend item and panel emits with exact names:

```ts
// CompositionLayerItem.vue
remove: []

// CompositionLayerPanel.vue
remove: [layerId: string]
addBlank: []
```

Render the empty state only when `displayLayers.length === 0`; its button emits `addBlank`. The normal list keeps `displayLayers = [...props.layers].reverse()`.

- [ ] **Step 4: Implement `removeLayer` with deterministic selection fallback**

Wire the panel in `GlyphComposer.vue`:

```vue
<CompositionLayerPanel ... @remove="removeLayer" @add-blank="addBlankLayer" />
```

Use document order for the fallback so the same rule works independently of CSS and reversed presentation order:

```ts
const removeLayer = (layerId: string): void => {
  const layers = composer.document.value.layers
  const removedIndex = layers.findIndex((layer) => layer.id === layerId)
  if (removedIndex === -1) return

  const wasSelected = composer.selectedLayerId.value === layerId
  if (!composer.execute({ type: 'removeLayer', layerId })) return
  if (!wasSelected) return

  const remaining = composer.document.value.layers
  composer.selectedLayerId.value =
    remaining[Math.min(removedIndex, remaining.length - 1)]?.id ?? null
}
```

Do not add a second lock check in the handler; the domain command already rejects locked-layer removal, and a `false` result preserves selection.

- [ ] **Step 5: Run the focused test and verify GREEN**

Run:

```bash
pnpm exec vitest run src/components/GlyphComposer/GlyphComposer.test.ts
pnpm exec playwright test e2e/composition.spec.ts --project=chromium-phone
```

Expected: all focused unit and phone workflow tests pass with no Vue warnings. Mentally mutate the handler to skip `composer.execute`, remove the lock `disabled` binding, and leave selection on the deleted ID; the new assertions must fail for each mutation.

- [ ] **Step 6: Commit the deletion slice**

```bash
git add src/components/GlyphComposer/GlyphComposer.test.ts src/components/GlyphComposer/GlyphComposer.vue src/components/GlyphComposer/CompositionLayerPanel.vue src/components/GlyphComposer/CompositionLayerItem.vue src/components/GlyphComposer/CompositionToolbar.vue src/locales/en.json src/locales/zh-cn.json src/locales/zh-tw.json e2e/composition.spec.ts
git commit -m "feat: add undoable composition layer deletion"
```

### Task 2: Canvas-first workspace hierarchy and composition entry icon

**Files:**

- Modify: `src/components/EditorHeader.vue:32-47`
- Modify: `src/components/GlyphComposer/GlyphComposer.vue:10-118,528-672`
- Modify: `src/components/GlyphComposer/ComponentBrowser.vue:195-258`
- Modify: `src/components/GlyphComposer/CompositionLayerPanel.vue:51-70`
- Modify: `src/components/GlyphComposer/CompositionLayerItem.vue:98-153`
- Modify: `src/components/GlyphComposer/CompositionToolbar.vue:1-97`
- Modify: `CHANGELOG.md:5-16`

**Interfaces:**

- `EditorHeader` renders `<i-material-symbols-layers-outline class="icon" aria-hidden="true" />` inside the unchanged `composition-open` button.
- `CompositionToolbar` keeps its existing props/emits and test IDs; only its DOM grouping and icons change.
- `GlyphComposer` keeps its props, emits, focus restoration, autosave, overlay lock, mobile tabs, and save/discard behavior unchanged.
- No new runtime or development dependency is introduced.

- [ ] **Step 1: Establish the UI-specific design tokens and structure before editing CSS**

Use the existing tokens with this concrete hierarchy:

```text
composition-workspace (modal surface, overflow hidden)
├── composition-header (title + inline code point | close)
├── optional storage warning
├── mobile tabs (narrow only)
├── composition-body
│   ├── components panel (17rem desktop)
│   ├── canvas panel (minmax(20rem, 1fr), dominant)
│   └── layers panel (19rem desktop)
└── composition-toolbar (left actions | right history/save)
```

Desktop body columns:

```css
grid-template-columns: minmax(15rem, 17rem) minmax(20rem, 1fr) minmax(
    17rem,
    19rem
  );
```

Keep the canvas SVG's existing `width: min(100%, 34rem)` and square aspect ratio. Do not give the SVG a fixed pixel size.

- [ ] **Step 2: Replace the entry and close glyphs with existing Material Symbols**

In `EditorHeader.vue`, replace only the composition icon:

```vue
<i-material-symbols-layers-outline class="icon" aria-hidden="true" />
```

In `GlyphComposer.vue`, replace the text multiplication sign with:

```vue
<i-material-symbols-close aria-hidden="true" />
```

Keep the buttons' existing localized `aria-label` values; do not add redundant SVG titles.

- [ ] **Step 3: Restructure the header and toolbar without changing behavior**

Make the heading block a flex row on desktop so title and code point share one compact bar, with wrapping allowed below the narrow breakpoint. In `CompositionToolbar.vue`, keep each control's existing emit and introduce two semantic visual groups:

```vue
<div class="toolbar-group toolbar-document-actions">
  <!-- add blank, discard -->
</div>
<div class="toolbar-group toolbar-commit-actions">
  <!-- undo, redo, save -->
</div>
```

Add `data-testid="composition-undo"` and `data-testid="composition-redo"` to the existing history buttons. Use Material Symbols add, undo, redo and save icons alongside visible text; keep Discard text-only and apply `ui-button--quiet` so the destructive whole-draft action does not compete with Save.

- [ ] **Step 4: Implement the desktop panel hierarchy with existing theme tokens**

Update the scoped styles so the modal owns outer structure and inner components no longer look like three unrelated cards:

```css
.composition-workspace {
  overflow: hidden;
  padding: 0;
}

.composition-header,
.composition-toolbar {
  padding: var(--space-3) var(--space-4);
}

.composition-body {
  gap: 0;
  padding: 0;
  border-block: 1px solid var(--border-color);
}

.composition-components,
.composition-layers {
  background: var(--background-light);
}

.composition-canvas-panel {
  display: grid;
  place-items: center;
  padding: clamp(var(--space-3), 2vw, var(--space-6));
}
```

Remove `ComponentBrowser`'s outer border/radius, retain its padding and its results/IDS scroll containers, and give it `height: 100%; overflow: hidden`. Give the layer panel matching padding, `overflow: hidden`, and a left separator; its `.layer-list` remains the scrolling child.

Make layer rows denser: one name/offset row, one operation row, icon controls with `var(--control-height)` targets, selected background plus border, and no hover-only affordance. Use `min-width: 0` and ellipsis for names so long semantic character lists cannot widen the panel.

- [ ] **Step 5: Preserve the phone workflow and safe-area bottom bar**

At `max-width: 719px`:

```css
.composition-workspace {
  width: 100vw;
  height: 100dvh;
}

.composition-header {
  align-items: flex-start;
}

.composition-body {
  overflow: hidden;
}

.composition-toolbar {
  padding-bottom: calc(var(--space-3) + env(safe-area-inset-bottom));
}

.toolbar-group {
  flex: 1 1 auto;
}
```

Keep `.composition-mobile-tabs` and `.mobile-hidden` behavior. Add horizontal padding to the tabs, ensure the active section fills the body row and owns its scrolling, and keep all icon actions at least `var(--control-height)` (2.75rem on mobile).

- [ ] **Step 6: Add the Unreleased changelog entry and run formatting/locale checks**

Under `## [Unreleased]` → `### Changed`, add:

```markdown
- Refine the visual glyph composition workspace around the canvas, add undoable layer deletion, and use a layer-based entry icon.
```

Run:

```bash
pnpm exec prettier --check src/components/EditorHeader.vue src/components/GlyphComposer/GlyphComposer.vue src/components/GlyphComposer/ComponentBrowser.vue src/components/GlyphComposer/CompositionLayerPanel.vue src/components/GlyphComposer/CompositionLayerItem.vue src/components/GlyphComposer/CompositionToolbar.vue src/components/GlyphComposer/GlyphComposer.test.ts src/locales/en.json src/locales/zh-cn.json src/locales/zh-tw.json CHANGELOG.md
pnpm check:locales
pnpm exec vitest run src/components/GlyphComposer/GlyphComposer.test.ts
```

Expected: all commands exit 0 with no locale-key mismatch or Vue warning.

- [ ] **Step 7: Commit the visual redesign slice**

```bash
git add src/components/EditorHeader.vue src/components/GlyphComposer/GlyphComposer.vue src/components/GlyphComposer/ComponentBrowser.vue src/components/GlyphComposer/CompositionLayerPanel.vue src/components/GlyphComposer/CompositionLayerItem.vue src/components/GlyphComposer/CompositionToolbar.vue CHANGELOG.md
git commit -m "feat: redesign composition workspace"
```

### Task 3: Visual, responsive, and release verification

**Files:**

- Verify: `e2e/composition.spec.ts`
- Verify: `docs/superpowers/specs/2026-08-17-visual-glyph-composition-design.md`
- Verify: `docs/versioning.md`
- Verify: `package.json`

**Interfaces:**

- Reuse the focused tests added in Task 1; do not add assertions for SVG path data, exact colors, or exact column pixels.
- Visual QA covers aesthetic hierarchy that would otherwise produce brittle change-detector tests.

- [ ] **Step 1: Run focused E2E after implementation and inspect screenshots at desktop and phone sizes**

Run:

```bash
pnpm exec playwright test e2e/composition.spec.ts
```

Expected: all configured composition workflows pass. Use the browser or Playwright screenshots to inspect one desktop dark-theme workspace and one phone workspace. Confirm the canvas is the dominant region, long layer names truncate, delete/lock/visibility controls remain distinguishable, the header entry shows the layers icon, no nested panel is clipped, and the phone bottom action bar clears the safe area.

- [ ] **Step 2: Run the full application quality gates**

Run in this order:

```bash
pnpm check
pnpm build
pnpm test:e2e
```

Expected: all commands exit 0. Because this changes application UI, assets rendered through the icon plugin, responsive behavior, and browser workflows, both build and the full Playwright matrix are required.

- [ ] **Step 3: Perform the final version decision checkpoint**

Compare the actual diff with `docs/versioning.md` and confirm:

- `package.json` remains `1.6.0` because this is feature development, not the explicit release step.
- The new Changed changelog entry remains under `## [Unreleased]`.
- The accumulated visual composition feature is a backwards-compatible user-visible feature, so the recommended eventual application release remains minor `1.7.0`.
- Composition data and Unifont data versions remain independent and unchanged by this UI-only work.

- [ ] **Step 4: Review the complete focused diff and repository state**

```bash
git diff --check
git status --short
git diff -- src/components/GlyphComposer src/components/EditorHeader.vue src/locales e2e/composition.spec.ts CHANGELOG.md
```

The work should already be committed by Tasks 1 and 2. Do not stage build output, Playwright reports, screenshots, coverage output, or unrelated files; report any remaining source diff instead of silently folding it into an unrelated commit.
