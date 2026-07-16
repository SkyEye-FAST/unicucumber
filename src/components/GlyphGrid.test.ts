import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import { createGrid } from '@/utils/hexUtils'

import GlyphGrid from './GlyphGrid.vue'

describe('GlyphGrid', () => {
  it('emits one parent-owned cell mutation for a pointer drawing action', async () => {
    const wrapper = mount(GlyphGrid, {
      props: {
        gridData: createGrid(8),
        drawMode: 'singleButtonDraw',
        drawValue: 1,
        showBorder: true,
      },
    })

    const cell = wrapper.find('[data-row="0"][data-col="0"]')
    await cell.trigger('pointerdown', {
      button: 0,
      pointerId: 1,
      pointerType: 'mouse',
    })
    await cell.trigger('pointerup', {
      button: 0,
      pointerId: 1,
      pointerType: 'mouse',
    })

    expect(wrapper.emitted('update:cell')).toEqual([[0, 0, 1]])
    expect(wrapper.props('gridData')[0]?.[0]).toBe(0)
  })
})
