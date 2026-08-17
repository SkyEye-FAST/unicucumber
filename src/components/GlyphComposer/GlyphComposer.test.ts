import { afterEach, describe, expect, it } from 'vitest'
import { createI18n } from 'vue-i18n'

import { mount, type VueWrapper } from '@vue/test-utils'

import type { GridData } from '@/types/glyph'
import { createGrid } from '@/utils/hexUtils'

import EditorHeader from '../EditorHeader.vue'
import GlyphComposer from './GlyphComposer.vue'

const messages = {
  en: {
    composition: {
      add_blank: 'Add blank layer',
      apply: 'Apply',
      canvas: 'Composition canvas',
      close: 'Close composition workspace',
      components: 'Components',
      components_placeholder: 'Component browser will appear here.',
      current_glyph: 'Current glyph',
      hide: 'Hide',
      hide_layer: 'Hide {name}',
      layers: 'Layers',
      lock: 'Lock',
      lock_layer: 'Lock {name}',
      new_layer: 'Layer {number}',
      operation: 'Operation',
      operation_add: 'Add',
      operation_intersect: 'Intersect',
      operation_subtract: 'Subtract',
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

afterEach(() => {
  activeWrapper?.unmount()
  activeWrapper = null
})

describe('GlyphComposer', () => {
  it('emits one final grid without mutating the input grid', async () => {
    const grid = pixelGrid(0, 0)
    const before = grid.map((row) => [...row])
    const wrapper = mountComposer(grid)

    await wrapper.get('[data-testid="composition-add-blank"]').trigger('click')
    await wrapper.get('[data-testid="composition-apply"]').trigger('click')

    expect(wrapper.emitted('apply')).toHaveLength(1)
    expect(wrapper.emitted<[GridData]>('apply')?.[0]?.[0]?.[0]?.[0]).toBe(1)
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
    await wrapper.get('[data-testid="composition-apply"]').trigger('click')

    const applied = wrapper.emitted<[GridData]>('apply')?.[0]?.[0]
    expect(applied?.flat().some(Boolean)).toBe(false)
  })

  it('moves the selected layer by one cell per arrow key and retains state after Apply', async () => {
    const wrapper = mountComposer()

    await wrapper
      .get('[data-testid="composition-layer-current-glyph-select"]')
      .trigger('click')
    const canvas = wrapper.get('[data-testid="composition-canvas"]')
    await canvas.trigger('keydown', { key: 'ArrowRight' })
    await wrapper.get('[data-testid="composition-apply"]').trigger('click')
    await wrapper.get('[data-testid="composition-apply"]').trigger('click')

    const emissions = wrapper.emitted<[GridData]>('apply') ?? []
    expect(emissions).toHaveLength(2)
    expect(emissions[0]?.[0]?.[0]?.[0]).toBe(0)
    expect(emissions[0]?.[0]?.[0]?.[1]).toBe(1)
    expect(emissions[1]?.[0]).toEqual(emissions[0]?.[0])
  })

  it('initializes from the latest editor grid on the first open', async () => {
    const wrapper = mountComposer(pixelGrid(0, 0), false)
    await wrapper.setProps({ grid: pixelGrid(3, 4) })
    await wrapper.setProps({ modelValue: true })
    await wrapper.get('[data-testid="composition-apply"]').trigger('click')

    const applied = wrapper.emitted<[GridData]>('apply')?.[0]?.[0]
    expect(applied?.[0]?.[0]).toBe(0)
    expect(applied?.[3]?.[4]).toBe(1)
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
