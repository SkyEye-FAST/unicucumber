import { describe, expect, it } from 'vitest'

import { useEditorDocument } from './useEditorDocument'

describe('useEditorDocument', () => {
  it('records atomic commands and computes dirty state against the saved snapshot', () => {
    const editor = useEditorDocument({ width: 8 }, 3)
    expect(editor.dirty.value).toBe(false)

    expect(
      editor.execute({
        type: 'applyStroke',
        points: [
          { row: 0, col: 0 },
          { row: 0, col: 1 },
          { row: 0, col: 2 },
        ],
        value: 1,
      }),
    ).toBe(true)
    expect(editor.history.value).toHaveLength(2)
    expect(editor.dirty.value).toBe(true)

    editor.markSaved('0041')
    expect(editor.dirty.value).toBe(false)
    editor.execute({ type: 'invert' })
    expect(editor.dirty.value).toBe(true)
    editor.undo()
    expect(editor.dirty.value).toBe(false)
    editor.redo()
    expect(editor.dirty.value).toBe(true)
  })

  it('limits history, truncates redo branches, and rejects invalid scalar values', () => {
    const editor = useEditorDocument({ width: 8 }, 3)
    editor.execute({ type: 'setCell', row: 0, col: 0, value: 1 })
    editor.execute({ type: 'setCell', row: 0, col: 1, value: 1 })
    editor.execute({ type: 'setCell', row: 0, col: 2, value: 1 })
    expect(editor.history.value).toHaveLength(3)

    editor.undo()
    editor.execute({ type: 'setCell', row: 1, col: 0, value: 1 })
    expect(editor.canRedo.value).toBe(false)
    expect(editor.execute({ type: 'setCodePoint', codePoint: 'D800' })).toBe(
      false,
    )
    expect(editor.execute({ type: 'setCodePoint', codePoint: '110000' })).toBe(
      false,
    )
  })

  it('preserves imported variable-width grids', () => {
    const editor = useEditorDocument({ width: 12 })
    expect(editor.width.value).toBe(12)
    expect(editor.grid.value[0]).toHaveLength(12)

    editor.load({ width: 20 })
    expect(editor.width.value).toBe(20)
    expect(editor.grid.value[0]).toHaveLength(20)
  })

  it('defaults to an empty code point and allows clearing or updating code point', () => {
    const editor = useEditorDocument()
    expect(editor.codePoint.value).toBe('')

    expect(editor.execute({ type: 'setCodePoint', codePoint: '0041' })).toBe(
      true,
    )
    expect(editor.codePoint.value).toBe('0041')

    expect(editor.execute({ type: 'setCodePoint', codePoint: '' })).toBe(true)
    expect(editor.codePoint.value).toBe('')
  })
})
