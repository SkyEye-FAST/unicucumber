import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import { describe, expect, it } from 'vitest'

import HexCodeInput from './HexCodeInput.vue'

const messages = {
  en: {
    hex_input: {
      apply: 'Apply',
      committed: 'Glyph data is applied.',
      copy: 'Copy',
      invalid_characters: 'Only hexadecimal digits are allowed.',
      invalid_length: 'Invalid length.',
      label: 'Hexadecimal glyph data',
      placeholder: 'Enter glyph data',
      ready: 'Ready to apply.',
      width: '{width}px',
    },
  },
}

describe('HexCodeInput', () => {
  it('preserves the committed glyph while input is incomplete and applies only valid data', async () => {
    const committed = '0'.repeat(32)
    const wrapper = mount(HexCodeInput, {
      props: { hexCode: committed },
      global: {
        plugins: [createI18n({ legacy: false, locale: 'en', messages })],
      },
    })
    const input = wrapper.get('input')

    await input.setValue('f')
    expect((input.element as HTMLInputElement).value).toBe('F')
    expect(wrapper.emitted('apply')).toBeUndefined()
    expect(wrapper.text()).toContain('Invalid length.')

    await input.setValue(`a${'0'.repeat(31)}`)
    expect((input.element as HTMLInputElement).value).toBe(`A${'0'.repeat(31)}`)
    await wrapper.get('.apply-button').trigger('click')
    expect(wrapper.emitted('apply')).toEqual([[`A${'0'.repeat(31)}`]])

    await input.setValue('BAD')
    await input.trigger('keydown', { key: 'Escape' })
    expect((input.element as HTMLInputElement).value).toBe(`A${'0'.repeat(31)}`)
  })

  it('keeps complete 8- and 16-pixel values accessible without overlaying their width', async () => {
    const committed = 'A5'.repeat(32)
    const wrapper = mount(HexCodeInput, {
      props: { hexCode: committed },
      global: {
        plugins: [createI18n({ legacy: false, locale: 'en', messages })],
      },
    })

    const input = wrapper.get<HTMLInputElement>('#hexInput')
    expect(input.element.value).toBe(committed)
    expect(input.attributes('title')).toBe(committed)
    expect(wrapper.get('.width-indicator').text()).toBe('16px')
    expect(wrapper.find('.hex-input-wrapper .width-indicator').exists()).toBe(
      false,
    )

    const narrow = 'F0'.repeat(16)
    await wrapper.setProps({ hexCode: narrow })
    expect(input.element.value).toBe(narrow)
    expect(input.attributes('title')).toBe(narrow)
    expect(wrapper.get('.width-indicator').text()).toBe('8px')
  })
})
