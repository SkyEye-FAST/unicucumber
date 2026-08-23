import { describe, expect, it } from 'vitest'
import { createI18n } from 'vue-i18n'

import { mount } from '@vue/test-utils'

import lzh from '@/locales/lzh.json'

import EditorHeader from './EditorHeader.vue'

describe('EditorHeader', () => {
  it('renders the localized Literary Chinese brand and GitHub label', () => {
    const wrapper = mount(EditorHeader, {
      props: { compositionEnabled: true },
      global: {
        plugins: [
          createI18n({
            legacy: false,
            locale: 'lzh',
            messages: { lzh },
          }),
        ],
      },
    })

    expect(wrapper.get('.title').text()).toBe('匯翠')
    expect(wrapper.get('.header-github-action').attributes('aria-label')).toBe(
      '開「匯翠」之庫於技閣',
    )
  })
})
