import { mount, type VueWrapper } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import { describe, expect, it } from 'vitest'

import { createGrid } from '@/utils/hexUtils'

import GlyphGrid from './GlyphGrid.vue'

const messages = {
  en: {
    workspace: {
      label: 'Glyph workspace',
      view_controls: 'View controls',
      zoom_out: 'Zoom out',
      zoom_level: 'Zoom level',
      zoom_in: 'Zoom in',
      fit: 'Fit',
      reset_view: 'Reset view',
      grid_label: '{width} pixel glyph grid',
    },
  },
}

const mountGrid = (): VueWrapper => {
  const wrapper = mount(GlyphGrid, {
    props: {
      gridData: createGrid(8),
      drawMode: 'singleButtonDraw',
      drawValue: 1,
      showBorder: true,
    },
    global: {
      plugins: [createI18n({ legacy: false, locale: 'en', messages })],
    },
  })
  const grid = wrapper.get('.grid-container').element as HTMLElement
  grid.getBoundingClientRect = () =>
    ({
      x: 0,
      y: 0,
      top: 0,
      left: 0,
      right: 225,
      bottom: 425,
      width: 225,
      height: 425,
      toJSON: () => ({}),
    }) as DOMRect
  return wrapper
}

describe('GlyphGrid', () => {
  it('emits one atomic, gap-free command for a fast pointer stroke', async () => {
    const wrapper = mountGrid()
    const viewport = wrapper.get('.grid-viewport')

    await viewport.trigger('pointerdown', {
      button: 0,
      pointerId: 1,
      pointerType: 'mouse',
      clientX: 15,
      clientY: 15,
    })
    await viewport.trigger('pointermove', {
      button: 0,
      pointerId: 1,
      pointerType: 'mouse',
      clientX: 45,
      clientY: 15,
    })
    await viewport.trigger('pointerup', {
      button: 0,
      pointerId: 1,
      pointerType: 'mouse',
      clientX: 45,
      clientY: 15,
    })

    expect(wrapper.emitted('command')).toEqual([
      [
        {
          type: 'applyStroke',
          value: 1,
          points: [
            { row: 0, col: 0 },
            { row: 0, col: 1 },
            { row: 0, col: 2 },
            { row: 0, col: 3 },
          ],
        },
      ],
    ])
  })

  it('discards interrupted strokes and never draws from a two-finger gesture', async () => {
    const wrapper = mountGrid()
    const viewport = wrapper.get('.grid-viewport')

    await viewport.trigger('pointerdown', {
      pointerId: 1,
      pointerType: 'touch',
      isPrimary: true,
      clientX: 30,
      clientY: 30,
    })
    await viewport.trigger('pointercancel', {
      pointerId: 1,
      pointerType: 'touch',
      isPrimary: true,
    })
    expect(wrapper.emitted('command')).toBeUndefined()

    await viewport.trigger('pointerdown', {
      pointerId: 2,
      pointerType: 'touch',
      isPrimary: true,
      clientX: 30,
      clientY: 30,
    })
    await viewport.trigger('pointerdown', {
      pointerId: 3,
      pointerType: 'touch',
      isPrimary: false,
      clientX: 80,
      clientY: 30,
    })
    await viewport.trigger('pointermove', {
      pointerId: 3,
      pointerType: 'touch',
      clientX: 100,
      clientY: 30,
    })
    await viewport.trigger('pointerup', {
      pointerId: 2,
      pointerType: 'touch',
      clientX: 30,
      clientY: 30,
    })
    await viewport.trigger('pointerup', {
      pointerId: 3,
      pointerType: 'touch',
      clientX: 100,
      clientY: 30,
    })
    expect(wrapper.emitted('command')).toBeUndefined()
  })
})
