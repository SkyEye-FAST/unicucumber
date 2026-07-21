import { flushPromises, mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import { describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'

import en from '@/locales/en.json'
import type { Glyph } from '@/types/glyph'

import GlyphManager from './GlyphManager.vue'

const repository = vi.hoisted(() => ({
  listGlyphs: vi.fn(),
  replaceGlyphs: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/storage/glyphRepository', () => ({
  getGlyphRepository: () => repository,
}))

const glyphs: Glyph[] = [
  { codePoint: '0042', hexValue: '55'.repeat(32) },
  { codePoint: '0041', hexValue: 'AA'.repeat(16) },
]

const mountManager = () => {
  repository.listGlyphs.mockResolvedValue(glyphs)
  return mount(GlyphManager, {
    props: {
      glyphs,
      onGlyphChange: vi.fn(),
      activeCodePoint: '0042',
    },
    global: {
      plugins: [
        createI18n({
          legacy: false,
          locale: 'en',
          messages: { en },
        }),
      ],
      stubs: {
        PixelPreview: { template: '<span class="pixel-preview-stub" />' },
      },
    },
    attachTo: document.body,
  })
}

describe('GlyphManager full-screen state', () => {
  it('preserves search and selection and restores focus after collapse', async () => {
    const wrapper = mountManager()
    await flushPromises()
    await wrapper.get('.search-input').setValue('0041')
    await wrapper
      .findAll<HTMLInputElement>('input[type="checkbox"]')[1]
      ?.setValue(true)

    const expand = wrapper.get<HTMLButtonElement>('.glyph-manager-expand')
    await expand.trigger('click')
    expect(wrapper.find('.glyph-manager').classes()).toContain('is-expanded')
    expect(wrapper.findAll('.glyph-library-cell')).toHaveLength(1)
    expect(wrapper.get('.glyph-library-cell').attributes('aria-selected')).toBe(
      'true',
    )
    expect(
      (wrapper.get('.library-search input').element as HTMLInputElement).value,
    ).toBe('0041')

    await wrapper.get('.library-collapse').trigger('click')
    await nextTick()
    expect(wrapper.find('.glyph-manager').classes()).not.toContain(
      'is-expanded',
    )
    expect(
      (wrapper.get('.search-input').element as HTMLInputElement).value,
    ).toBe('0041')
    expect(
      wrapper.findAll<HTMLInputElement>('input[type="checkbox"]')[1]?.element
        .checked,
    ).toBe(true)
    expect(document.activeElement).toBe(
      wrapper.get<HTMLButtonElement>('.glyph-manager-expand').element,
    )
    wrapper.unmount()
  })

  it('handles Escape in selection, full-screen, then sidebar order', async () => {
    const wrapper = mountManager()
    await flushPromises()
    await wrapper
      .findAll<HTMLInputElement>('input[type="checkbox"]')[1]
      ?.setValue(true)
    await wrapper.get('.glyph-manager-expand').trigger('click')

    expect(wrapper.vm.handleEscape()).toBe(true)
    await nextTick()
    expect(wrapper.find('.glyph-manager').classes()).toContain('is-expanded')
    expect(wrapper.find('.library-selection-bar').exists()).toBe(false)

    expect(wrapper.vm.handleEscape()).toBe(true)
    await nextTick()
    expect(wrapper.find('.glyph-manager').classes()).not.toContain(
      'is-expanded',
    )
    expect(wrapper.vm.handleEscape()).toBe(false)
    wrapper.unmount()
  })
})
