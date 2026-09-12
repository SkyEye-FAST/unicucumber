import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createI18n } from 'vue-i18n'

import en from '@/locales/en.json'
import { unifontLoader } from '@/services/unifontLoader'

import GlyphNavigator from './GlyphNavigator.vue'

vi.mock('@/services/unifontLoader', () => ({
  unifontLoader: { loadCatalogCodePoints: vi.fn(), getGlyph: vi.fn() },
}))
const hex = '80'.repeat(16)
const savedHex = '40'.repeat(16)
const mountNavigator = (
  glyphs = [] as { codePoint: string; hexValue: string }[],
) =>
  mount(GlyphNavigator, {
    props: { activeCodePoint: '0041', glyphs },
    global: {
      plugins: [createI18n({ legacy: false, locale: 'en', messages: { en } })],
      stubs: { PixelPreview: true, CustomSelect: true },
    },
  })

describe('GlyphNavigator', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(unifontLoader.loadCatalogCodePoints).mockResolvedValue(
      Array.from({ length: 95 }, (_, index) => index + 32),
    )
    vi.mocked(unifontLoader.getGlyph).mockResolvedValue(hex)
  })

  it('reveals the active glyph in a bounded page and opens saved edits first', async () => {
    const wrapper = mountNavigator([{ codePoint: '0041', hexValue: savedHex }])
    await flushPromises()
    expect(wrapper.findAll('[data-code-point]')).toHaveLength(32)
    const active = wrapper.get('[data-code-point="0041"]')
    expect(active.attributes('aria-current')).toBe('true')
    await active.trigger('click')
    expect(wrapper.emitted('open')).toEqual([
      [savedHex, { codePoint: '0041', hexValue: savedHex }],
    ])
    expect(unifontLoader.getGlyph).not.toHaveBeenCalledWith(0x41)
    await wrapper.get('[aria-label="Next glyphs"]').trigger('click')
    await flushPromises()
    expect(wrapper.findAll('[data-code-point]')).toHaveLength(31)
    expect(
      wrapper.get('[aria-label="Next glyphs"]').attributes('disabled'),
    ).toBeDefined()
    wrapper.unmount()
  })

  it('keeps saved glyphs available when catalog loading fails and supports retry', async () => {
    vi.mocked(unifontLoader.loadCatalogCodePoints).mockRejectedValueOnce(
      new Error('offline'),
    )
    const wrapper = mountNavigator([{ codePoint: '0041', hexValue: savedHex }])
    await flushPromises()
    expect(wrapper.get('[role="status"]').text()).toContain(
      'Saved glyphs are still available',
    )
    await wrapper.get('[data-code-point="0041"]').trigger('click')
    expect(wrapper.emitted('open')).toHaveLength(1)
    await wrapper.get('.glyph-navigator__status button').trigger('click')
    await flushPromises()
    expect(wrapper.find('.glyph-navigator__status').exists()).toBe(false)
    expect(wrapper.findAll('[data-code-point]')).toHaveLength(32)
    wrapper.unmount()
  })

  it('ignores glyph responses for a block that is no longer displayed', async () => {
    let resolveOld: ((value: string) => void) | undefined
    vi.mocked(unifontLoader.loadCatalogCodePoints).mockResolvedValue([
      0x41, 0x100,
    ])
    vi.mocked(unifontLoader.getGlyph).mockImplementation((codePoint) =>
      codePoint === 0x41
        ? new Promise<string>((resolve) => {
            resolveOld = resolve
          })
        : Promise.resolve(savedHex),
    )
    const wrapper = mountNavigator()
    await flushPromises()
    wrapper
      .findComponent({ name: 'CustomSelect' })
      .vm.$emit('update:modelValue', 'latin-extended-a')
    await flushPromises()
    resolveOld?.(hex)
    await flushPromises()
    expect(wrapper.find('[data-code-point="0041"]').exists()).toBe(false)
    await wrapper.get('[data-code-point="0100"]').trigger('click')
    expect(wrapper.emitted('open')).toEqual([
      [savedHex, { codePoint: '0100', hexValue: savedHex }],
    ])
    wrapper.unmount()
  })
})
