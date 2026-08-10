import { describe, expect, it } from 'vitest'
import { createI18n } from 'vue-i18n'

import { createGrid } from '@/utils/hexUtils'
import { mount, type VueWrapper } from '@vue/test-utils'

import GlyphGrid from './GlyphGrid.vue'

const messages = {
  en: {
    glyph_editor: {
      copy_title: 'glyph_editor.copy_title',
      cut_title: 'glyph_editor.cut_title',
    },
    selection: {
      actions: 'selection.actions',
      cancel_paste: 'selection.cancel_paste',
      confirm_paste: 'selection.confirm_paste',
      copy: 'selection.copy',
      cut: 'selection.cut',
      delete: 'selection.delete',
      deselect: 'selection.deselect',
      duplicate: 'selection.duplicate',
      move_down: 'selection.move_down',
      move_left: 'selection.move_left',
      move_right: 'selection.move_right',
      move_up: 'selection.move_up',
      paste_actions: 'selection.paste_actions',
    },
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

const pointerEvent = (pointerId: number, clientX: number, clientY: number) => ({
  button: 0,
  pointerId,
  pointerType: 'mouse',
  clientX,
  clientY,
})

describe('GlyphGrid', () => {
  it('keeps the complete grid visible when resetting the mobile view', async () => {
    const wrapper = mount(GlyphGrid, {
      props: {
        gridData: createGrid(16),
        drawMode: 'singleButtonDraw',
        drawValue: 1,
        showBorder: true,
      },
      global: {
        plugins: [createI18n({ legacy: false, locale: 'en', messages })],
      },
    })
    const viewport = wrapper.get('.grid-viewport').element
    Object.defineProperties(viewport, {
      clientWidth: { configurable: true, value: 374 },
      clientHeight: { configurable: true, value: 359 },
    })
    const gridApi = wrapper.vm as unknown as {
      resetView: () => Promise<void>
    }

    await gridApi.resetView()

    expect(wrapper.get('.grid-container').attributes('style')).toContain(
      '--cell-size: 21px',
    )
  })

  it('fits the complete grid when the viewport height is constrained', async () => {
    const wrapper = mount(GlyphGrid, {
      props: {
        gridData: createGrid(16),
        drawMode: 'singleButtonDraw',
        drawValue: 1,
        showBorder: true,
      },
      global: {
        plugins: [createI18n({ legacy: false, locale: 'en', messages })],
      },
    })
    const viewport = wrapper.get('.grid-viewport').element as HTMLElement
    viewport.style.maxHeight = '160px'
    Object.defineProperties(viewport, {
      clientWidth: { configurable: true, value: 820 },
      clientHeight: { configurable: true, value: 160 },
    })
    const gridApi = wrapper.vm as unknown as {
      resetView: () => Promise<void>
    }

    await gridApi.resetView()

    expect(wrapper.get('.grid-container').attributes('style')).toContain(
      '--cell-size: 9px',
    )
    expect(wrapper.get('.zoom-value').text()).toBe('30%')
    expect(wrapper.get('.grid-viewport').attributes('style')).toContain(
      'height: 155px',
    )
  })

  it('only shows the hover preview when the cursor effect is enabled', async () => {
    const wrapper = mountGrid()
    const viewport = wrapper.get('.grid-viewport')

    await viewport.trigger('pointermove', pointerEvent(1, 45, 45))
    expect(wrapper.find('.preview-cell').exists()).toBe(false)

    await wrapper.setProps({ cursorEffect: true })
    await viewport.trigger('pointermove', pointerEvent(1, 45, 45))
    expect(wrapper.find('.preview-cell').exists()).toBe(true)
  })

  it('duplicates a selection beside its bounds without overlapping it', async () => {
    const wrapper = mount(GlyphGrid, {
      props: {
        gridData: createGrid(8),
        drawMode: 'singleButtonDraw',
        drawValue: 1,
        showBorder: true,
        currentTool: 'select',
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
        right: 90,
        bottom: 90,
        width: 90,
        height: 90,
        toJSON: () => ({}),
      }) as DOMRect
    const viewport = wrapper.get('.grid-viewport')

    await viewport.trigger('pointerdown', pointerEvent(1, 15, 15))
    await viewport.trigger('pointermove', pointerEvent(1, 25, 25))
    await viewport.trigger('pointerup', pointerEvent(1, 25, 25))
    await wrapper.get('[aria-label="selection.duplicate"]').trigger('click')

    expect(wrapper.emitted('command')).toEqual([
      [
        {
          type: 'pasteSelection',
          data: [
            [0, 0],
            [0, 0],
          ],
          target: { row: 2, col: 2 },
        },
      ],
    ])
  })

  it('previews selected pixels at the target while moving a selection', async () => {
    const grid = createGrid(8)
    grid[0]![0] = 1
    const wrapper = mount(GlyphGrid, {
      props: {
        gridData: grid,
        drawMode: 'singleButtonDraw',
        drawValue: 1,
        showBorder: true,
        currentTool: 'select',
      },
      global: {
        plugins: [createI18n({ legacy: false, locale: 'en', messages })],
      },
    })
    const gridElement = wrapper.get('.grid-container').element as HTMLElement
    gridElement.getBoundingClientRect = () =>
      ({
        x: 0,
        y: 0,
        top: 0,
        left: 0,
        right: 270,
        bottom: 270,
        width: 270,
        height: 270,
        toJSON: () => ({}),
      }) as DOMRect
    const viewport = wrapper.get('.grid-viewport')

    await viewport.trigger('pointerdown', pointerEvent(1, 15, 15))
    await viewport.trigger('pointerup', pointerEvent(1, 15, 15))
    await viewport.trigger('pointerdown', pointerEvent(2, 15, 15))
    await viewport.trigger('pointermove', pointerEvent(2, 25, 15))

    expect(wrapper.get('[data-row="0"][data-col="0"]').classes()).not.toContain(
      'filled',
    )
    expect(wrapper.get('[data-row="0"][data-col="1"]').classes()).toContain(
      'filled',
    )
    expect(wrapper.emitted('command')).toBeUndefined()
  })

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

  it('allows touch input after a pen loses pointer capture', async () => {
    const wrapper = mountGrid()
    const viewport = wrapper.get('.grid-viewport')

    await viewport.trigger('pointerdown', {
      button: 0,
      pointerId: 1,
      pointerType: 'pen',
      isPrimary: true,
      clientX: 15,
      clientY: 15,
    })
    await viewport.trigger('lostpointercapture', {
      pointerId: 1,
      pointerType: 'pen',
      isPrimary: true,
    })
    await viewport.trigger('pointerdown', {
      pointerId: 2,
      pointerType: 'touch',
      isPrimary: true,
      clientX: 15,
      clientY: 15,
    })
    await viewport.trigger('pointerup', {
      pointerId: 2,
      pointerType: 'touch',
      isPrimary: true,
      clientX: 15,
      clientY: 15,
    })

    expect(wrapper.emitted('command')).toEqual([
      [
        {
          type: 'applyStroke',
          value: 1,
          points: [{ row: 0, col: 0 }],
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
