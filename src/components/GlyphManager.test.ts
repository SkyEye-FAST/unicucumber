import { flushPromises, mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import { describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'

import en from '@/locales/en.json'
import type { Glyph } from '@/types/glyph'

import GlyphManager from './GlyphManager.vue'
import GlyphLibraryToolbar from './GlyphManager/GlyphLibraryToolbar.vue'

const repository = vi.hoisted(() => ({
  listGlyphs: vi.fn(),
  replaceGlyphs: vi.fn().mockResolvedValue(undefined),
}))
const unifont = vi.hoisted(() => ({
  loadAllGlyphs: vi.fn().mockResolvedValue([
    { codePoint: '0041', hexValue: 'AA'.repeat(16) },
    { codePoint: '0042', hexValue: '55'.repeat(32) },
  ]),
  getGlyph: vi.fn(),
  prefetchCodePoint: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/storage/glyphRepository', () => ({
  getGlyphRepository: () => repository,
}))

vi.mock('@/services/unifontLoader', () => ({
  unifontLoader: unifont,
}))

const glyphs: Glyph[] = [
  { codePoint: '0042', hexValue: '55'.repeat(32) },
  { codePoint: '0041', hexValue: 'AA'.repeat(16) },
]

const mountManager = (overrides: Record<string, unknown> = {}) => {
  repository.listGlyphs.mockResolvedValue(glyphs)
  return mount(GlyphManager, {
    props: {
      glyphs,
      onGlyphChange: vi.fn(),
      activeCodePoint: '0042',
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
      stubs: {
        PixelPreview: { template: '<span class="pixel-preview-stub" />' },
      },
    },
    attachTo: document.body,
  })
}

describe('GlyphManager full-screen state', () => {
  it('keeps the compact add/import tools collapsed until requested', async () => {
    const wrapper = mountManager()
    await flushPromises()
    expect(wrapper.get('#compact-glyph-tools').isVisible()).toBe(false)
    const toggle = wrapper.get<HTMLButtonElement>('.compact-tools-toggle')
    expect(toggle.attributes('aria-expanded')).toBe('false')
    await toggle.trigger('click')
    expect(toggle.attributes('aria-expanded')).toBe('true')
    expect(wrapper.get('#compact-glyph-tools').isVisible()).toBe(true)
    wrapper.unmount()
  })

  it('shows the shell while loading and offers a non-blocking retry on error', async () => {
    const retry = vi.fn()
    const wrapper = mountManager({
      glyphs: [],
      libraryLoaded: false,
      libraryLoading: true,
      onRetryLoad: retry,
    })
    expect(wrapper.get('.glyph-manager-heading').isVisible()).toBe(true)
    expect(wrapper.get('[role="status"]').text()).toContain(
      'Loading saved glyphs',
    )

    await wrapper.setProps({
      libraryLoading: false,
      libraryError: new Error('offline'),
    })
    await wrapper.get('.glyph-library-status button').trigger('click')
    expect(retry).toHaveBeenCalledTimes(1)
    wrapper.unmount()
  })

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

  it('merges the Unifont catalog and filters it by Unicode plane and block', async () => {
    unifont.loadAllGlyphs.mockResolvedValueOnce([
      { codePoint: '0041', hexValue: '00'.repeat(16) },
      { codePoint: '3400', hexValue: '11'.repeat(32) },
      { codePoint: '4E00', hexValue: '22'.repeat(32) },
      { codePoint: '20000', hexValue: '33'.repeat(32) },
    ])
    const wrapper = mountManager()
    await wrapper.get('.glyph-manager-expand').trigger('click')
    await flushPromises()

    expect(
      wrapper.get('.glyph-library-grid').attributes('data-total-count'),
    ).toBe('5')
    const toolbar = wrapper.findComponent(GlyphLibraryToolbar)
    await toolbar.vm.$emit('update:unicodePlane', '0')
    await toolbar.vm.$emit(
      'update:unicodeBlock',
      'cjk-unified-ideographs-extension-a',
    )
    expect(wrapper.findAll('.glyph-library-cell')).toHaveLength(1)
    expect(
      wrapper.get('.glyph-library-cell').attributes('data-code-point'),
    ).toBe('3400')

    await toolbar.vm.$emit('update:sourceFilter', 'modified')
    expect(wrapper.find('.glyph-library-cell').exists()).toBe(false)
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
