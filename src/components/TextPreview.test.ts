import { afterEach, describe, expect, it, vi } from 'vitest'
import { createI18n } from 'vue-i18n'

import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'

import { unifontLoader } from '@/services/unifontLoader'

import TextPreview from './TextPreview.vue'

const messages = {
  en: {
    text_preview: {
      close: 'Close text preview',
      empty: 'Type text to preview.',
      hint: 'Rendered from current bitmap glyph data.',
      input_label: 'Preview text',
      live_hint: 'Current edits appear here automatically.',
      load_failed: 'Some glyph data could not be loaded.',
      loading: 'Loading glyphs…',
      missing:
        '{count} glyph is unavailable. | {count} glyphs are unavailable.',
      placeholder: 'Type a line of text',
      preview_label: 'Unifont preview: {text}',
      sample: '南去經三國，東來過五湖。',
      scale: 'Scale',
      title: 'Text preview',
    },
  },
}

let activeWrapper: VueWrapper | null = null

const mountPreview = () => {
  activeWrapper = mount(TextPreview, {
    props: {
      modelValue: true,
      glyphs: [],
      currentGlyph: {
        codePoint: '0041',
        hexValue: `80${'00'.repeat(15)}`,
      },
    },
    global: {
      plugins: [createI18n({ legacy: false, locale: 'en', messages })],
      stubs: { Teleport: true },
    },
  })
  return activeWrapper
}

afterEach(() => {
  activeWrapper?.unmount()
  activeWrapper = null
  vi.restoreAllMocks()
  vi.useRealTimers()
})

describe('TextPreview', () => {
  it('opens as a separate dialog with the requested default text and closes on Escape', async () => {
    vi.spyOn(unifontLoader, 'getGlyph').mockResolvedValue('00'.repeat(32))
    const wrapper = mountPreview()

    expect(wrapper.get('.text-preview-drawer').attributes('role')).toBe(
      'dialog',
    )
    expect(wrapper.get<HTMLInputElement>('.preview-input').element.value).toBe(
      '南去經三國，東來過五湖。',
    )

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(wrapper.emitted('update:modelValue')).toEqual([[false]])
  })

  it('renders current editor data before loading remaining Unifont glyphs', async () => {
    vi.useFakeTimers()
    const getGlyph = vi
      .spyOn(unifontLoader, 'getGlyph')
      .mockResolvedValue(`40${'00'.repeat(15)}`)
    const wrapper = mountPreview()
    await wrapper.get('.preview-input').setValue('AB')

    await vi.advanceTimersByTimeAsync(100)
    await flushPromises()

    const glyphs = wrapper.findAll('.preview-glyph')
    expect(glyphs).toHaveLength(2)
    expect(glyphs[0].get('path').attributes('d')).toBe('M0 0h1v1h-1z')
    expect(glyphs[1].get('path').attributes('d')).toBe('M1 0h1v1h-1z')
    expect(getGlyph).toHaveBeenCalledOnce()
    expect(getGlyph).toHaveBeenCalledWith(0x42)
  })

  it('supports supplementary characters and shows a visible missing-glyph mark', async () => {
    vi.useFakeTimers()
    const getGlyph = vi.spyOn(unifontLoader, 'getGlyph').mockResolvedValue(null)
    const wrapper = mountPreview()

    await wrapper.get('.preview-input').setValue('😀')
    await vi.advanceTimersByTimeAsync(100)
    await flushPromises()

    expect(getGlyph).toHaveBeenLastCalledWith(0x1f600)
    expect(wrapper.findAll('.preview-glyph')).toHaveLength(1)
    expect(wrapper.get('.preview-glyph').classes()).toContain('is-missing')
    expect(wrapper.find('.missing-mark').exists()).toBe(true)
    expect(wrapper.text()).toContain('1 glyph is unavailable.')
  })

  it('refreshes immediately when the current edited glyph changes', async () => {
    vi.useFakeTimers()
    vi.spyOn(unifontLoader, 'getGlyph').mockResolvedValue(null)
    const wrapper = mountPreview()
    await wrapper.get('.preview-input').setValue('AB')

    await vi.advanceTimersByTimeAsync(100)
    await flushPromises()
    expect(
      wrapper.findAll('.preview-glyph')[0].get('path').attributes('d'),
    ).toBe('M0 0h1v1h-1z')

    await wrapper.setProps({
      currentGlyph: {
        codePoint: '0041',
        hexValue: `40${'00'.repeat(15)}`,
      },
    })
    await vi.advanceTimersByTimeAsync(100)
    await flushPromises()

    expect(
      wrapper.findAll('.preview-glyph')[0].get('path').attributes('d'),
    ).toBe('M1 0h1v1h-1z')
  })
})
