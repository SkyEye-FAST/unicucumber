import { afterEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'

import { mount } from '@vue/test-utils'

import CustomSelect from './CustomSelect.vue'

const installNarrowViewport = (): void => {
  vi.stubGlobal(
    'matchMedia',
    vi.fn(
      () =>
        ({
          matches: true,
          media: '(max-width: 719px)',
          onchange: null,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          addListener: vi.fn(),
          removeListener: vi.fn(),
          dispatchEvent: vi.fn(() => true),
        }) as MediaQueryList,
    ),
  )
}

const installVisualViewport = () => {
  const viewport = new EventTarget() as EventTarget & {
    height: number
    offsetTop: number
  }
  viewport.height = 640
  viewport.offsetTop = 0
  vi.stubGlobal('visualViewport', viewport)
  return viewport
}

afterEach(() => {
  vi.unstubAllGlobals()
  document.body.innerHTML = ''
})

describe('CustomSelect', () => {
  it('keeps its mobile modal inside the visual viewport when the keyboard opens', async () => {
    installNarrowViewport()
    const viewport = installVisualViewport()
    const wrapper = mount(CustomSelect, {
      attachTo: document.body,
      props: {
        ariaLabel: 'Unicode block',
        mobileModal: true,
        modelValue: 'basic-latin',
        options: [
          { label: 'Basic Latin', value: 'basic-latin' },
          { label: 'Latin-1 Supplement', value: 'latin-1' },
        ],
        searchable: true,
      },
    })

    await wrapper.get('.custom-select__trigger').trigger('click')
    await nextTick()

    const overlay = document.body.querySelector<HTMLElement>(
      '.custom-select__overlay.is-modal',
    )
    const searchInput = document.body.querySelector<HTMLInputElement>(
      '.custom-select__search input',
    )
    expect(overlay?.style.height).toBe('640px')
    expect(overlay?.style.top).toBe('0px')
    expect(searchInput).toBe(document.activeElement)

    viewport.height = 360
    viewport.offsetTop = 24
    viewport.dispatchEvent(new Event('resize'))
    await nextTick()

    expect(overlay?.style.height).toBe('360px')
    expect(overlay?.style.top).toBe('24px')
    expect(overlay?.style.bottom).toBe('auto')

    wrapper.unmount()
  })
})
