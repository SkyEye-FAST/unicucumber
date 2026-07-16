import { describe, expect, it } from 'vitest'

import { createGrid } from '@/utils/hexUtils'

import { useHistory } from './useHistory'

describe('useHistory', () => {
  it('initializes, moves through undo and redo, resets, and truncates a branch', () => {
    const initial = createGrid(8)
    const history = useHistory(initial)
    expect(history.canUndo.value).toBe(false)

    const first = createGrid(8)
    first[0]![0] = 1
    history.pushState(first, 'draw')
    expect(history.canUndo.value).toBe(true)
    expect(history.undo()?.[0]?.[0]).toBe(0)
    expect(history.redo()?.[0]?.[0]).toBe(1)

    history.undo()
    const replacement = createGrid(8)
    replacement[0]![1] = 1
    history.pushState(replacement, 'draw')
    expect(history.canRedo.value).toBe(false)
    expect(history.getCurrentState()?.[0]?.[1]).toBe(1)

    history.reset(createGrid(16), 'replace-glyph')
    expect(history.history.value).toHaveLength(1)
    expect(history.getLastAction()).toBe('replace-glyph')
  })
})
