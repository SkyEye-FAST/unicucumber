import { nextTick } from 'vue'

import { describe, expect, it } from 'vitest'
import { createI18n } from 'vue-i18n'

import en from '@/locales/en.json'
import type { Glyph, GlyphPreviewMode } from '@/types/glyph'
import { mount } from '@vue/test-utils'

import GlyphLibraryGrid from './GlyphLibraryGrid.vue'

const glyphs: Glyph[] = [
  { codePoint: '0041', hexValue: `80${'00'.repeat(15)}` },
  { codePoint: '0042', hexValue: `4000${'00'.repeat(30)}` },
]

const mountGrid = (
  previewMode: GlyphPreviewMode = 'both',
  overrides: Record<string, unknown> = {},
) =>
  mount(GlyphLibraryGrid, {
    props: {
      activeCodePoint: '0041',
      browserPreviewFont: '"Test Preview Font", sans-serif',
      density: 'comfortable',
      glyphs,
      previewMode,
      selectedCodePoints: [],
      selectionMode: false,
      ...overrides,
    },
    global: {
      plugins: [
        createI18n({
          legacy: false,
          locale: 'en',
          messages: { en },
        }),
      ],
    },
    attachTo: document.body,
  })

describe('GlyphLibraryGrid', () => {
  it('renders ordered dual previews with configured font and widths', () => {
    const wrapper = mountGrid('both')
    const cells = wrapper.findAll('.glyph-library-cell')
    expect(cells.map((cell) => cell.attributes('data-code-point'))).toEqual([
      '0041',
      '0042',
    ])
    expect(wrapper.findAll('.browser-reference')).toHaveLength(2)
    expect(wrapper.findAll('.bitmap-preview')).toHaveLength(2)
    expect(wrapper.find('.browser-reference').attributes('style')).toContain(
      'Test Preview Font',
    )
    expect(cells[0]?.find('svg').attributes('viewBox')).toBe('0 0 8 16')
    expect(cells[1]?.find('svg').attributes('viewBox')).toBe('0 0 16 16')
    expect(cells[0]?.classes()).toContain('is-active')
    wrapper.unmount()
  })

  it.each([
    ['pixelOnly', 2, 0, 0],
    ['browserOnly', 0, 0, 2],
    ['both', 2, 2, 0],
  ] as const)(
    'uses the correct %s preview anatomy',
    (mode, bitmapCount, referenceCount, browserCount) => {
      const wrapper = mountGrid(mode)
      expect(wrapper.findAll('.bitmap-preview')).toHaveLength(bitmapCount)
      expect(wrapper.findAll('.browser-reference')).toHaveLength(referenceCount)
      expect(wrapper.findAll('.browser-primary')).toHaveLength(browserCount)
      wrapper.unmount()
    },
  )

  it('supports roving arrow navigation, Enter, and selection-mode Space', async () => {
    const wrapper = mountGrid('both')
    const cells = wrapper.findAll<HTMLButtonElement>('.glyph-library-cell')
    cells[0]?.element.focus()
    await cells[0]?.trigger('keydown', { key: 'ArrowRight' })
    await nextTick()
    expect(document.activeElement).toBe(cells[1]?.element)
    await cells[1]?.trigger('keydown', { key: 'Enter' })
    expect(wrapper.emitted('open')?.[0]?.[0]).toMatchObject({
      codePoint: '0042',
    })

    await wrapper.setProps({ selectionMode: true })
    await cells[1]?.trigger('keydown', { key: ' ' })
    expect(wrapper.emitted('toggle-selection')?.[0]).toEqual(['0042'])
    wrapper.unmount()
  })

  it('selects a continuous run of cells while dragging in selection mode', async () => {
    const wrapper = mountGrid('both', { selectionMode: true })
    const cells = wrapper.findAll<HTMLButtonElement>('.glyph-library-cell')
    const grid = wrapper.get('.glyph-library-grid')
    const elementFromPoint = document.elementFromPoint
    document.elementFromPoint = () => cells[1]?.element ?? null

    await cells[0]?.trigger('pointerdown', {
      button: 0,
      clientX: 1,
      clientY: 1,
      pointerId: 1,
    })
    await grid.trigger('pointermove', {
      clientX: 2,
      clientY: 2,
      pointerId: 1,
    })
    await grid.trigger('pointerup', { pointerId: 1 })

    expect(wrapper.emitted('set-selection')).toEqual([
      ['0041', true],
      ['0042', true],
    ])
    document.elementFromPoint = elementFromPoint
    wrapper.unmount()
  })

  it('shows a compact empty state and changes density without glyph mutation', async () => {
    const source = glyphs.map((glyph) => ({ ...glyph }))
    const wrapper = mountGrid('pixelOnly', { glyphs: source })
    const paths = wrapper.findAll('path').map((path) => path.attributes('d'))
    await wrapper.setProps({ density: 'large' })
    expect(wrapper.find('.glyph-library-scroll').classes()).toContain(
      'density-large',
    )
    expect(wrapper.findAll('path').map((path) => path.attributes('d'))).toEqual(
      paths,
    )
    expect(source).toEqual(glyphs)
    await wrapper.setProps({ glyphs: [] })
    expect(wrapper.get('[role="status"]').text()).toContain(
      'No matching glyphs',
    )
    wrapper.unmount()
  })
})
