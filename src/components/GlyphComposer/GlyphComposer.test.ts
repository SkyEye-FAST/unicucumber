import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createI18n } from 'vue-i18n'

import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'

import type {
  CompositionComponentRecord,
  CompositionComponentSummary,
  CompositionDocument,
} from '@/types/composition'
import type { GridData } from '@/types/glyph'
import { createGrid } from '@/utils/hexUtils'

const loaderMocks = vi.hoisted(() => ({
  searchComponents: vi.fn(),
  hydrateComponents: vi.fn(),
  loadIdsForCodePoint: vi.fn(),
}))

const draftRepositoryMocks = vi.hoisted(() => ({
  state: { persistent: true },
  loadDraft: vi.fn(),
  saveDraft: vi.fn(),
  deleteDraft: vi.fn(),
}))

vi.mock('@/services/compositionDataLoader', () => ({
  compositionDataLoader: loaderMocks,
}))

vi.mock('@/storage/compositionDraftRepository', () => ({
  getCompositionDraftRepository: () => ({
    get persistent() {
      return draftRepositoryMocks.state.persistent
    },
    loadDraft: draftRepositoryMocks.loadDraft,
    saveDraft: draftRepositoryMocks.saveDraft,
    deleteDraft: draftRepositoryMocks.deleteDraft,
  }),
}))

import EditorHeader from '../EditorHeader.vue'
import GlyphComposer from './GlyphComposer.vue'

const messages = {
  en: {
    composition: {
      add_blank: 'Add blank layer',
      add_first_layer: 'Add blank layer',
      apply_code_point: 'Apply',
      code_point: 'Composition code point',
      code_point_invalid: 'Enter a CJK Unicode code point.',
      save: 'Save to glyph manager',
      canvas: 'Composition canvas',
      canvas_dimensions: '16 × 16',
      close: 'Close composition workspace',
      components: 'Components',
      component_add: 'Add {characters}',
      component_bounds: 'Bounds {bounds}',
      component_loading: 'Loading component',
      component_no_results: 'No matching components.',
      component_search: 'Search components',
      component_search_error: 'Unable to load components.',
      component_search_placeholder: 'Character or code point',
      component_retry: 'Retry',
      expand: 'Expand composition workspace',
      exit_fullscreen: 'Exit full-screen composition workspace',
      current_glyph: 'Current glyph',
      discard: 'Discard draft',
      delete_layer: 'Delete {name}',
      draft_fallback_warning: 'Composition drafts are using fallback storage.',
      draft_storage_warning: 'Unable to save composition draft.',
      hide: 'Hide',
      hide_layer: 'Hide {name}',
      empty_layers: 'No layers yet.',
      layers: 'Layers',
      layer_stack: 'Layer stack',
      lock: 'Lock',
      lock_layer: 'Lock {name}',
      new_layer: 'Layer {number}',
      operation: 'Operation',
      operation_add: 'Add',
      operation_intersect: 'Intersect',
      operation_subtract: 'Subtract',
      ids: 'IDS guidance',
      ids_empty: 'No IDS guidance is available for this code point.',
      ids_error: 'Unable to load IDS guidance.',
      ids_leaf: 'Search for {character}',
      ids_retry: 'Retry IDS',
      redo: 'Redo composition action',
      redo_short: 'Redo',
      select_layer: 'Select {name}',
      show: 'Show',
      show_layer: 'Show {name}',
      title: 'Glyph composition',
      undo: 'Undo composition action',
      undo_short: 'Undo',
      unlock: 'Unlock',
      unlock_layer: 'Unlock {name}',
    },
    header: {
      github: 'Open GitHub',
      open_composition: 'Open glyph composition',
      open_composition_16_only: 'Glyph composition requires a 16×16 glyph',
      open_glyph_manager: 'Open glyph manager',
      open_settings: 'Open settings',
      open_text_preview: 'Open text preview',
      toggle_theme: 'Toggle theme',
    },
  },
}

const i18n = () => createI18n({ legacy: false, locale: 'en', messages })

const pixelGrid = (row: number, col: number): GridData => {
  const grid = createGrid(16)
  grid[row]![col] = 1
  return grid
}

let activeWrapper: VueWrapper | null = null

const mountComposer = (grid = pixelGrid(0, 0), modelValue = true) => {
  activeWrapper = mount(GlyphComposer, {
    props: { modelValue, codePoint: '660E', grid },
    global: {
      plugins: [i18n()],
      stubs: { Teleport: true },
    },
  })
  return activeWrapper
}

beforeEach(() => {
  loaderMocks.searchComponents.mockReset().mockResolvedValue([])
  loaderMocks.hydrateComponents.mockReset().mockResolvedValue([])
  loaderMocks.loadIdsForCodePoint.mockReset().mockResolvedValue([])
  draftRepositoryMocks.state.persistent = true
  draftRepositoryMocks.loadDraft.mockReset().mockResolvedValue(null)
  draftRepositoryMocks.saveDraft.mockReset().mockResolvedValue(undefined)
  draftRepositoryMocks.deleteDraft.mockReset().mockResolvedValue(undefined)
})

afterEach(() => {
  activeWrapper?.unmount()
  activeWrapper = null
  vi.useRealTimers()
})

describe('GlyphComposer', () => {
  it('emits one final grid without mutating the input grid', async () => {
    const grid = pixelGrid(0, 0)
    const before = grid.map((row) => [...row])
    const wrapper = mountComposer(grid)

    await wrapper.get('[data-testid="composition-add-blank"]').trigger('click')
    await wrapper.get('[data-testid="composition-save"]').trigger('click')

    expect(wrapper.emitted('save')).toHaveLength(1)
    expect(
      wrapper.emitted<[string, GridData]>('save')?.[0]?.[1]?.[0]?.[0],
    ).toBe(1)
    expect(grid).toEqual(before)
  })

  it('supports visibility and operation controls on composition layers', async () => {
    const wrapper = mountComposer()

    const operation = wrapper.get<HTMLSelectElement>(
      '[data-testid="composition-layer-current-glyph-operation"]',
    )
    await operation.setValue('subtract')
    expect(operation.element.value).toBe('subtract')

    await wrapper
      .get('[data-testid="composition-layer-current-glyph-visibility"]')
      .trigger('click')
    await wrapper.get('[data-testid="composition-save"]').trigger('click')

    const saved = wrapper.emitted<[string, GridData]>('save')?.[0]?.[1]
    expect(saved?.flat().some(Boolean)).toBe(false)
  })

  it('moves the selected layer by one cell per arrow key and retains state after Save', async () => {
    const wrapper = mountComposer()

    await wrapper
      .get('[data-testid="composition-layer-current-glyph-select"]')
      .trigger('click')
    const canvas = wrapper.get('[data-testid="composition-canvas"]')
    await canvas.trigger('keydown', { key: 'ArrowRight' })
    await wrapper.get('[data-testid="composition-save"]').trigger('click')
    await wrapper.get('[data-testid="composition-save"]').trigger('click')

    const emissions = wrapper.emitted<[string, GridData]>('save') ?? []
    expect(emissions).toHaveLength(2)
    expect(emissions[0]?.[0]).toBe('660E')
    expect(emissions[0]?.[1]?.[0]?.[0]).toBe(0)
    expect(emissions[0]?.[1]?.[0]?.[1]).toBe(1)
    expect(emissions[1]?.[1]).toEqual(emissions[0]?.[1])
  })

  it('initializes from the latest editor grid on the first open', async () => {
    const wrapper = mountComposer(pixelGrid(0, 0), false)
    await wrapper.setProps({ grid: pixelGrid(3, 4) })
    await wrapper.setProps({ modelValue: true })
    await wrapper.get('[data-testid="composition-save"]').trigger('click')

    const saved = wrapper.emitted<[string, GridData]>('save')?.[0]
    expect(saved?.[0]).toBe('660E')
    expect(saved?.[1]?.[0]?.[0]).toBe(0)
    expect(saved?.[1]?.[3]?.[4]).toBe(1)
  })

  it('exposes layer selection state without relying on color', async () => {
    const wrapper = mountComposer()
    const select = wrapper.get(
      '[data-testid="composition-layer-current-glyph-select"]',
    )

    expect(select.attributes('aria-pressed')).toBe('false')
    await select.trigger('click')
    expect(
      wrapper
        .get('[data-testid="composition-layer-current-glyph-select"]')
        .attributes('aria-pressed'),
    ).toBe('true')
  })

  it('opens component search without pre-filling the target character', async () => {
    const wrapper = mountComposer()
    await flushPromises()

    expect(
      wrapper.get<HTMLInputElement>('.component-search input').element.value,
    ).toBe('')
    expect(loaderMocks.searchComponents).toHaveBeenLastCalledWith('')
    expect(loaderMocks.loadIdsForCodePoint).toHaveBeenLastCalledWith(0x660e)
  })

  it('selects the nearest surviving layer after deleting the selection', async () => {
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
  })

  it('restores a deleted layer with composition Undo', async () => {
    const wrapper = mountComposer()
    await wrapper.get('[data-testid="composition-add-blank"]').trigger('click')
    await wrapper
      .get('[data-testid="composition-layer-blank-1-delete"]')
      .trigger('click')

    await wrapper.get('[data-testid="composition-undo"]').trigger('click')

    expect(
      wrapper.find('[data-testid="composition-layer-blank-1-select"]').exists(),
    ).toBe(true)
  })

  it('disables deletion for locked layers', async () => {
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

  it('renders hydrated component previews and adds a displayed component as an independent layer', async () => {
    const summary: CompositionComponentSummary = {
      id: '00AABBCCDDEEFF00',
      characters: ['木'],
      bounds: [0, 0, 16, 16],
      chunk: '00',
    }
    const record: CompositionComponentRecord = {
      ...summary,
      hex: `8${'0'.repeat(63)}`,
    }
    loaderMocks.searchComponents.mockResolvedValue([summary])
    loaderMocks.hydrateComponents.mockResolvedValue([record])

    const wrapper = mountComposer(createGrid(16))
    await flushPromises()

    expect(loaderMocks.hydrateComponents).toHaveBeenCalledWith([summary.id])
    expect(
      wrapper
        .get(`[data-testid="composition-component-${summary.id}-preview"]`)
        .findAll('.component-preview-pixel'),
    ).toHaveLength(1)
    expect(
      wrapper.get(`[data-testid="composition-component-${summary.id}"]`).text(),
    ).toContain('木')
    await wrapper
      .get(`[data-testid="composition-component-${summary.id}"]`)
      .trigger('click')
    await flushPromises()

    await wrapper.get('[data-testid="composition-save"]').trigger('click')
    const saved = wrapper.emitted<[string, GridData]>('save')?.[0]
    expect(saved?.[0]).toBe('660E')
    expect(saved?.[1]?.[0]?.[0]).toBe(1)
  })

  it('uses IDS leaves to drive component search and preview hydration', async () => {
    const summary: CompositionComponentSummary = {
      id: '0011223344556677',
      characters: ['日'],
      bounds: [0, 0, 16, 16],
      chunk: '00',
    }
    const record: CompositionComponentRecord = {
      ...summary,
      hex: `8${'0'.repeat(63)}`,
    }
    loaderMocks.loadIdsForCodePoint.mockResolvedValue(['⿰日月'])
    loaderMocks.searchComponents.mockImplementation(async (query: string) =>
      query === '日' ? [summary] : [],
    )
    loaderMocks.hydrateComponents.mockResolvedValue([record])
    const wrapper = mountComposer()
    await flushPromises()

    await wrapper
      .get('[data-testid="composition-ids-leaf-日"]')
      .trigger('click')
    await flushPromises()

    expect(loaderMocks.searchComponents).toHaveBeenLastCalledWith('日')
    expect(loaderMocks.hydrateComponents).toHaveBeenCalledWith([summary.id])
    expect(
      wrapper
        .find(`[data-testid="composition-component-${summary.id}"]`)
        .exists(),
    ).toBe(true)
  })

  it('expands and restores the desktop composition workspace', async () => {
    const wrapper = mountComposer()

    const expand = wrapper.get('[data-testid="composition-expand"]')
    expect(expand.attributes('aria-pressed')).toBe('false')
    await expand.trigger('click')

    expect(wrapper.get('.composition-workspace').classes()).toContain(
      'is-expanded',
    )
    expect(
      wrapper
        .get('[data-testid="composition-expand"]')
        .attributes('aria-pressed'),
    ).toBe('true')

    await expand.trigger('click')
    expect(wrapper.get('.composition-workspace').classes()).not.toContain(
      'is-expanded',
    )
  })

  it('shows a neutral state when IDS guidance is unavailable', async () => {
    const wrapper = mountComposer()
    await flushPromises()

    expect(wrapper.get('.composition-ids-guide h4').text()).toBe('IDS guidance')
    expect(wrapper.text()).toContain(
      'No IDS guidance is available for this code point.',
    )
    expect(wrapper.text()).not.toContain('Unable to load IDS guidance.')
  })

  it('keeps the composition code point independent from the editor code point', async () => {
    const wrapper = mountComposer()
    await flushPromises()

    const codePoint = wrapper.get<HTMLInputElement>(
      '[data-testid="composition-code-point"]',
    )
    expect(codePoint.element.value).toBe('660E')

    await codePoint.setValue('4e00')
    expect(codePoint.element.value).toBe('4E00')
    await codePoint.trigger('blur')
    await flushPromises()
    expect(loaderMocks.loadIdsForCodePoint).toHaveBeenLastCalledWith(0x4e00)

    await codePoint.setValue('4E01')
    await codePoint.trigger('keydown', { key: 'Escape' })
    expect(codePoint.element.value).toBe('4E00')

    await wrapper.get('[data-testid="composition-save"]').trigger('click')
    expect(wrapper.emitted<[string, GridData]>('save')?.[0]?.[0]).toBe('4E00')

    await wrapper.setProps({ codePoint: '0000' })
    expect(codePoint.element.value).toBe('4E00')
  })

  it('rejects non-CJK composition code points without changing the workspace', async () => {
    const wrapper = mountComposer()
    await flushPromises()

    const codePoint = wrapper.get<HTMLInputElement>(
      '[data-testid="composition-code-point"]',
    )
    await codePoint.setValue('0041')
    await codePoint.trigger('keydown', { key: 'Enter' })
    await flushPromises()

    expect(codePoint.element.value).toBe('0041')
    expect(wrapper.get('[role="alert"]').text()).toContain(
      'Enter a CJK Unicode code point.',
    )
    expect(loaderMocks.loadIdsForCodePoint).not.toHaveBeenCalledWith(0x41)
  })

  it('restores the saved composition draft for the active code point', async () => {
    const document: CompositionDocument = {
      schemaVersion: 1,
      codePoint: '660E',
      width: 16,
      layers: [
        {
          id: 'restored',
          name: 'Restored',
          bitmap: pixelGrid(4, 5),
          offsetX: 0,
          offsetY: 0,
          mask: null,
          operation: 'add',
          visible: true,
          locked: false,
        },
      ],
    }
    draftRepositoryMocks.loadDraft.mockResolvedValue({
      id: '660E',
      schemaVersion: 1,
      updatedAt: 123,
      document,
    })
    const wrapper = mountComposer(pixelGrid(0, 0))
    await flushPromises()

    expect(draftRepositoryMocks.loadDraft).toHaveBeenCalledWith('660E')
    await wrapper.get('[data-testid="composition-save"]').trigger('click')
    const saved = wrapper.emitted<[string, GridData]>('save')?.[0]?.[1]
    expect(saved?.[0]?.[0]).toBe(0)
    expect(saved?.[4]?.[5]).toBe(1)
  })

  it('autosaves only composition content changes after a bounded debounce', async () => {
    vi.useFakeTimers()
    const wrapper = mountComposer()
    await flushPromises()

    await wrapper
      .get('[data-testid="composition-layer-current-glyph-select"]')
      .trigger('click')
    await vi.advanceTimersByTimeAsync(600)
    expect(draftRepositoryMocks.saveDraft).not.toHaveBeenCalled()

    await wrapper.get('[data-testid="composition-add-blank"]').trigger('click')
    await vi.advanceTimersByTimeAsync(499)
    expect(draftRepositoryMocks.saveDraft).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)
    await flushPromises()

    expect(draftRepositoryMocks.saveDraft).toHaveBeenCalledTimes(1)
    expect(draftRepositoryMocks.saveDraft).toHaveBeenCalledWith(
      expect.objectContaining({ id: '660E', schemaVersion: 1 }),
    )
  })

  it('keeps the composition draft after Save', async () => {
    const wrapper = mountComposer()
    await flushPromises()

    await wrapper.get('[data-testid="composition-save"]').trigger('click')

    expect(draftRepositoryMocks.deleteDraft).not.toHaveBeenCalled()
  })

  it('discards only the active draft and resets to the latest editor grid', async () => {
    const input = pixelGrid(2, 3)
    const wrapper = mountComposer(input)
    await flushPromises()
    await wrapper.get('[data-testid="composition-add-blank"]').trigger('click')

    await wrapper.get('[data-testid="composition-discard"]').trigger('click')
    await flushPromises()

    expect(draftRepositoryMocks.deleteDraft).toHaveBeenCalledWith('660E')
    await wrapper.get('[data-testid="composition-save"]').trigger('click')
    const saved = wrapper.emitted<[string, GridData]>('save')?.[0]?.[1]
    expect(saved).toEqual(input)
  })

  it('keeps in-memory composition usable when draft autosave fails', async () => {
    vi.useFakeTimers()
    draftRepositoryMocks.saveDraft.mockRejectedValue(
      new Error('storage failed'),
    )
    const wrapper = mountComposer(pixelGrid(0, 0))
    await flushPromises()

    await wrapper
      .get('[data-testid="composition-layer-current-glyph-select"]')
      .trigger('click')
    await wrapper
      .get('[data-testid="composition-canvas"]')
      .trigger('keydown', { key: 'ArrowRight' })
    await vi.advanceTimersByTimeAsync(500)
    await flushPromises()

    expect(
      wrapper.get('[data-testid="composition-storage-warning"]').text(),
    ).toContain('Unable to save composition draft.')
    await wrapper.get('[data-testid="composition-save"]').trigger('click')
    const saved = wrapper.emitted<[string, GridData]>('save')?.[0]?.[1]
    expect(saved?.[0]?.[1]).toBe(1)
  })

  it('disables the composition entry when the parent marks it unavailable', () => {
    const wrapper = mount(EditorHeader, {
      props: { compositionEnabled: false },
      global: { plugins: [i18n()] },
    })

    const button = wrapper.get<HTMLButtonElement>(
      '[data-testid="composition-open"]',
    )
    expect(button.element.disabled).toBe(true)
    expect(button.attributes('aria-label')).toBe(
      'Glyph composition requires a 16×16 glyph',
    )
    wrapper.unmount()
  })
})
