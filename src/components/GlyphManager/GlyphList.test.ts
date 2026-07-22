import { nextTick } from 'vue'

import { describe, expect, it } from 'vitest'
import { createI18n } from 'vue-i18n'

import en from '@/locales/en.json'
import type { Glyph } from '@/types/glyph'
import { mount } from '@vue/test-utils'

import GlyphList from './GlyphList.vue'

const makeGlyphs = (count: number): Glyph[] =>
  Array.from({ length: count }, (_, index) => ({
    codePoint: (0x21 + index).toString(16).toUpperCase().padStart(4, '0'),
    hexValue: index % 2 ? 'AA'.repeat(16) : '55'.repeat(32),
  }))

const mountList = (glyphs = makeGlyphs(1_000)) =>
  mount(GlyphList, {
    props: {
      glyphs,
      selectedCodePoints: [],
      settings: {
        glyphPreviewMode: 'both',
        browserPreviewFont: 'sans-serif',
      },
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

describe('GlyphList compact virtualization', () => {
  it('mounts a bounded range and updates it while scrolling', async () => {
    const wrapper = mountList()
    expect(wrapper.findAll('.glyph-card').length).toBeLessThan(30)
    expect(
      wrapper.get('.glyph-list-scroll').attributes('data-total-count'),
    ).toBe('1000')

    const scroll = wrapper.get<HTMLElement>('.glyph-list-scroll')
    scroll.element.scrollTop = 7_400
    await scroll.trigger('scroll')
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
    await nextTick()
    expect(
      Number(wrapper.get('.glyph-card').attributes('data-index')),
    ).toBeGreaterThan(0)
    wrapper.unmount()
  })

  it('keeps selection, editing, and deletion keyed to the visible glyph', async () => {
    const glyphs = makeGlyphs(20)
    const wrapper = mountList(glyphs)
    const first = glyphs[0]!
    await wrapper.setProps({ selectedCodePoints: [first.codePoint] })
    expect(
      wrapper.find<HTMLInputElement>('.glyph-card input').element.checked,
    ).toBe(true)

    await wrapper.get('.glyph-preview').trigger('click')
    await wrapper.get('.glyph-actions .btn-icon').trigger('click')
    await wrapper.get('.glyph-actions .danger').trigger('click')
    expect(wrapper.emitted('edit-in-grid')?.[0]?.[0]).toEqual(first)
    expect(wrapper.emitted('edit')?.[0]?.[0]).toEqual(first)
    expect(wrapper.emitted('remove')?.[0]).toEqual([first.codePoint])
    wrapper.unmount()
  })

  it('renders crisp 8x16 and 16x16 SVGs and invalidates changed data', async () => {
    const glyphs: Glyph[] = [
      { codePoint: '0041', hexValue: `80${'00'.repeat(15)}` },
      { codePoint: '0042', hexValue: `8000${'00'.repeat(30)}` },
    ]
    const wrapper = mountList(glyphs)
    expect(
      wrapper.findAll('.bitmap-svg').map((svg) => svg.attributes('viewBox')),
    ).toEqual(['0 0 8 16', '0 0 16 16'])
    const previousPath = wrapper.find('path').attributes('d')
    await wrapper.setProps({
      glyphs: [{ ...glyphs[0]!, hexValue: `40${'00'.repeat(15)}` }, glyphs[1]!],
    })
    expect(wrapper.find('path').attributes('d')).not.toBe(previousPath)
    wrapper.unmount()
  })
})
