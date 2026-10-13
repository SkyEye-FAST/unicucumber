import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { createI18n } from 'vue-i18n'
import en from '@/locales/en.json'
import CompositionLayerShift from './CompositionLayerShift.vue'

const mountShift = () =>
  mount(CompositionLayerShift, {
    props: { disabled: false },
    global: {
      plugins: [createI18n({ legacy: false, locale: 'en', messages: { en } })],
    },
  })

describe('Composition layer shift controls', () => {
  it('moves in all four directions by the entered distance', async () => {
    const wrapper = mountShift()
    await wrapper.get('input').setValue('3')
    for (const button of wrapper.findAll('button'))
      await button.trigger('click')
    expect(wrapper.emitted('move')).toEqual([
      [-3, 0],
      [0, -3],
      [0, 3],
      [3, 0],
    ])
    wrapper.unmount()
  })
  it('rejects invalid distances and locked layers', async () => {
    const wrapper = mountShift()
    for (const value of ['', '0', '-1', '1.5', '9007199254740992']) {
      await wrapper.get('input').setValue(value)
      expect(wrapper.get('input').attributes('aria-invalid')).toBe('true')
      for (const button of wrapper.findAll('button')) {
        expect(button.attributes('disabled')).toBeDefined()
        await button.trigger('click')
      }
    }
    await wrapper.get('input').setValue('2')
    await wrapper.setProps({ disabled: true })
    expect(wrapper.get('input').attributes('disabled')).toBeDefined()
    for (const button of wrapper.findAll('button'))
      await button.trigger('click')
    expect(wrapper.emitted('move')).toBeUndefined()
    wrapper.unmount()
  })
})
