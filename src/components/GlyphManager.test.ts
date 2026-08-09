import { nextTick } from 'vue'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createI18n } from 'vue-i18n'

import en from '@/locales/en.json'
import type { Glyph } from '@/types/glyph'
import { flushPromises, mount } from '@vue/test-utils'

import GlyphManager from './GlyphManager.vue'
import FontExportOptions from './GlyphManager/FontExportOptions.vue'
import GlyphLibraryToolbar from './GlyphManager/GlyphLibraryToolbar.vue'
import SearchToolbar from './GlyphManager/SearchToolbar.vue'

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
const fontExports = vi.hoisted(() => ({
  createPixelFont: vi.fn<
    (glyphs: Glyph[], format: string, metadata: unknown) => Promise<Uint8Array>
  >(() => Promise.resolve(new Uint8Array([0, 1, 2, 3]))),
}))

vi.mock('@/storage/glyphRepository', () => ({
  getGlyphRepository: () => repository,
}))

vi.mock('@/services/unifontLoader', () => ({
  unifontLoader: unifont,
}))

vi.mock('@/utils/fontExport', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/utils/fontExport')>()
  return {
    ...actual,
    createPixelFont: fontExports.createPixelFont,
  }
})

const glyphs: Glyph[] = [
  { codePoint: '0042', hexValue: '55'.repeat(32) },
  { codePoint: '0041', hexValue: 'AA'.repeat(16) },
]

const mockViewport = (matches: boolean): void => {
  vi.stubGlobal(
    'matchMedia',
    vi.fn(
      () =>
        ({
          matches,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
        }) as unknown as MediaQueryList,
    ),
  )
}

beforeEach(() => {
  mockViewport(false)
  fontExports.createPixelFont.mockClear()
  Object.defineProperty(URL, 'createObjectURL', {
    configurable: true,
    value: vi.fn(() => 'blob:font-export'),
  })
  Object.defineProperty(URL, 'revokeObjectURL', {
    configurable: true,
    value: vi.fn(),
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

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
  it('opens the compact add/import tools by default on desktop', async () => {
    const wrapper = mountManager()
    await flushPromises()
    expect(wrapper.get('#compact-glyph-tools').isVisible()).toBe(true)
    const toggle = wrapper.get<HTMLButtonElement>('.compact-tools-toggle')
    expect(toggle.attributes('aria-expanded')).toBe('true')
    await toggle.trigger('click')
    expect(toggle.attributes('aria-expanded')).toBe('false')
    expect(wrapper.get('#compact-glyph-tools').isVisible()).toBe(false)
    wrapper.unmount()
  })

  it('keeps the compact add/import tools collapsed on mobile until requested', async () => {
    mockViewport(true)
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

  it('keeps the full-screen tools action explicit and toggleable', async () => {
    const wrapper = mountManager()
    await flushPromises()
    await wrapper.get('.glyph-manager-expand').trigger('click')
    await flushPromises()

    const toolsToggle = wrapper.get<HTMLButtonElement>('.library-tools-toggle')
    expect(toolsToggle.text()).toContain('Tools')
    expect(toolsToggle.attributes('aria-expanded')).toBe('false')
    expect(wrapper.get('#glyph-library-tools').isVisible()).toBe(false)
    await toolsToggle.trigger('click')
    expect(toolsToggle.attributes('aria-expanded')).toBe('true')
    expect(wrapper.get('#glyph-library-tools').isVisible()).toBe(true)
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
    await flushPromises()
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

  it('marks only changed Unifont data and adds selected library glyphs to the manager', async () => {
    const onGlyphChange = vi.fn().mockResolvedValue(undefined)
    unifont.loadAllGlyphs.mockResolvedValueOnce([
      { codePoint: '0041', hexValue: 'AA'.repeat(16) },
      { codePoint: '0042', hexValue: '55'.repeat(32) },
      { codePoint: '0043', hexValue: 'CC'.repeat(16) },
    ])
    const wrapper = mountManager({
      glyphs: [{ codePoint: '0041', hexValue: 'FF'.repeat(16) }, glyphs[1]!],
      onGlyphChange,
    })
    await wrapper.get('.glyph-manager-expand').trigger('click')
    await flushPromises()

    expect(wrapper.findAll('.modified-badge')).toHaveLength(1)
    expect(wrapper.get('[data-code-point="0041"]').classes()).toContain(
      'is-modified',
    )
    expect(wrapper.get('[data-code-point="0042"]').classes()).not.toContain(
      'is-modified',
    )

    const toolbar = wrapper.findComponent(GlyphLibraryToolbar)
    await toolbar.vm.$emit('toggle-selection-mode')
    await wrapper.get('[data-code-point="0043"]').trigger('click')
    await toolbar.vm.$emit('add-selected')
    await flushPromises()

    expect(onGlyphChange).toHaveBeenCalledWith([
      { codePoint: '0041', hexValue: 'FF'.repeat(16) },
      glyphs[1]!,
      { codePoint: '0043', hexValue: 'CC'.repeat(16) },
    ])
    wrapper.unmount()
  })

  it('keeps font export available without saved glyphs and uses the complete official profile', async () => {
    unifont.loadAllGlyphs.mockResolvedValueOnce([
      { codePoint: '0041', hexValue: 'AA'.repeat(16) },
      { codePoint: '0042', hexValue: '55'.repeat(32) },
      { codePoint: '1F600', hexValue: '00'.repeat(32) },
    ])
    const wrapper = mountManager({ glyphs: [] })
    const toolbar = wrapper.findComponent(SearchToolbar)
    const options = wrapper.findComponent(FontExportOptions)

    expect(
      wrapper.get('.btn-export').attributes('aria-disabled'),
    ).toBeUndefined()
    expect(options.props('scope')).toBe('full')
    expect(options.props('metadata')).toMatchObject({
      familyName: 'Unifont',
      fullName: 'Unifont',
      vendorId: 'GNU ',
    })

    await toolbar.vm.$emit('font', 'ttf')
    await vi.waitFor(() =>
      expect(fontExports.createPixelFont).toHaveBeenCalledTimes(1),
    )
    const [exportedGlyphs, format, metadata] =
      fontExports.createPixelFont.mock.calls[0]!
    expect(exportedGlyphs.map((glyph) => glyph.codePoint)).toEqual([
      '0041',
      '0042',
    ])
    expect(format).toBe('ttf')
    expect(metadata).toMatchObject({
      familyName: 'Unifont',
      version: 'Version 17.0.05',
    })
    wrapper.unmount()
  })

  it('exports only glyphs that differ from bundled Unifont when requested', async () => {
    unifont.loadAllGlyphs.mockResolvedValueOnce([
      { codePoint: '0041', hexValue: 'AA'.repeat(16) },
      { codePoint: '0042', hexValue: '55'.repeat(32) },
    ])
    const wrapper = mountManager({
      glyphs: [
        { codePoint: '0041', hexValue: 'FF'.repeat(16) },
        { codePoint: '0042', hexValue: '55'.repeat(32) },
        { codePoint: '0043', hexValue: 'CC'.repeat(16) },
      ],
    })
    const toolbar = wrapper.findComponent(SearchToolbar)
    const options = wrapper.findComponent(FontExportOptions)
    await options.vm.$emit('update:scope', 'modified')
    await nextTick()

    expect(options.props('scope')).toBe('modified')
    expect(options.props('metadata')).toMatchObject({
      familyName: 'UniCucumber Pixel',
      vendorId: 'UCCU',
    })
    await toolbar.vm.$emit('font', 'ttf')
    await vi.waitFor(() =>
      expect(fontExports.createPixelFont).toHaveBeenCalledTimes(1),
    )
    const [exportedGlyphs] = fontExports.createPixelFont.mock.calls[0]!
    expect(exportedGlyphs.map((glyph) => glyph.codePoint)).toEqual([
      '0041',
      '0043',
    ])
    wrapper.unmount()
  })

  it('handles Escape in selection, full-screen, then desktop tools order', async () => {
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
    expect(wrapper.vm.handleEscape()).toBe(true)
    expect(wrapper.vm.handleEscape()).toBe(false)
    wrapper.unmount()
  })
})
