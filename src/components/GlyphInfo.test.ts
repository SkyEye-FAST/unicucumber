import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { createI18n } from 'vue-i18n'

import en from '@/locales/en.json'
import GlyphInfo from './GlyphInfo.vue'

const mountInfo = () =>
  mount(GlyphInfo, {
    props: {
      modelValue: '0041',
      hexValue: '00'.repeat(32),
      width: 16,
      browserPreviewFont: 'sans-serif',
      saveStatus: 'saved',
      saveStatusLabel: 'Saved',
    },
    global: {
      plugins: [createI18n({ legacy: false, locale: 'en', messages: { en } })],
      stubs: { PixelPreview: true },
    },
  })

describe('GlyphInfo character input', () => {
  it('commits supplementary characters and stays synchronized with code point edits', async () => {
    const wrapper = mountInfo()
    const input = wrapper.get<HTMLInputElement>('.unicode-char')
    await input.setValue('𠀀')
    await input.trigger('keydown', { key: 'Enter' })
    expect(wrapper.emitted('update:model-value')).toEqual([['20000']])
    await wrapper.setProps({ modelValue: '20000' })
    expect(input.element.value).toBe('𠀀')
    await wrapper.setProps({ modelValue: '0042' })
    expect(input.element.value).toBe('B')
    await input.setValue('C')
    await input.trigger('blur')
    expect(wrapper.emitted('update:model-value')?.at(-1)).toEqual(['0043'])
    wrapper.unmount()
  })

  it('rejects empty, multiple, and surrogate input and waits for IME confirmation', async () => {
    const wrapper = mountInfo()
    const input = wrapper.get<HTMLInputElement>('.unicode-char')
    for (const value of ['', 'AB', '\uD800']) {
      await input.setValue(value)
      await input.trigger('blur')
      expect(input.attributes('aria-invalid')).toBe('true')
    }
    expect(wrapper.emitted('update:model-value')).toBeUndefined()
    await input.setValue('中')
    await input.trigger('keydown', { key: 'Enter', isComposing: true })
    expect(wrapper.emitted('update:model-value')).toBeUndefined()
    await input.trigger('keydown', { key: 'Enter' })
    expect(wrapper.emitted('update:model-value')).toEqual([['4E2D']])
    await input.trigger('keydown', { key: 'Escape' })
    expect(input.element.value).toBe('A')
    wrapper.unmount()
  })

  it('commits completed IME input after focus leaves during composition', async () => {
    const wrapper = mountInfo()
    const input = wrapper.get<HTMLInputElement>('.unicode-char')
    await input.trigger('compositionstart')
    input.element.value = '中'
    await input.trigger('input')
    await input.trigger('blur')
    expect(wrapper.emitted('update:model-value')).toBeUndefined()
    await input.trigger('compositionend')
    expect(wrapper.emitted('update:model-value')).toEqual([['4E2D']])
    wrapper.unmount()
  })

  it('renders clean inputs and disables encoding info button when modelValue is empty', () => {
    const wrapper = mount(GlyphInfo, {
      props: {
        modelValue: '',
        hexValue: '00'.repeat(32),
        width: 16,
        browserPreviewFont: 'sans-serif',
        saveStatus: 'saved',
        saveStatusLabel: 'Saved',
      },
      global: {
        plugins: [
          createI18n({ legacy: false, locale: 'en', messages: { en } }),
        ],
        stubs: { PixelPreview: true },
      },
    })
    const codePointInput = wrapper.get<HTMLInputElement>(
      '.code-point-input input',
    )
    const charInput = wrapper.get<HTMLInputElement>('.unicode-char')
    const infoBtn = wrapper.get('button.encoding-info-btn')

    expect(codePointInput.element.value).toBe('')
    expect(codePointInput.attributes('aria-invalid')).toBe('false')
    expect(charInput.element.value).toBe('')
    expect(charInput.attributes('aria-invalid')).toBe('false')
    expect(infoBtn.attributes('disabled')).toBeDefined()
    wrapper.unmount()
  })
})
