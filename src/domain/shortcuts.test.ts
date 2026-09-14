import { describe, expect, it } from 'vitest'
import {
  createDefaultShortcuts,
  findShortcutConflict,
  isShortcutInput,
  parseShortcuts,
  resolveShortcut,
  shortcutFromEvent,
} from './shortcuts'

describe('editor shortcuts', () => {
  it('matches exact modifiers and supports Ctrl and Command with redo aliases', () => {
    const bindings = createDefaultShortcuts()
    const resolve = (key: string, init: KeyboardEventInit = {}) =>
      resolveShortcut(new KeyboardEvent('keydown', { key, ...init }), bindings)
    expect(resolve('z', { ctrlKey: true })).toBe('undo')
    expect(resolve('z', { metaKey: true })).toBe('undo')
    expect(resolve('Z', { metaKey: true, shiftKey: true })).toBe('redo')
    expect(resolve('y', { ctrlKey: true })).toBe('redo')
    expect(resolve('r')).toBe('rectangle')
    expect(resolve('R', { shiftKey: true })).toBe('filledRectangle')
    expect(resolve('p', { altKey: true })).toBeUndefined()
    expect(resolve('P', { shiftKey: true })).toBeUndefined()
  })

  it('ignores composition, AltGraph and reserved keys', () => {
    expect(
      shortcutFromEvent(
        new KeyboardEvent('keydown', { key: 'p', isComposing: true }),
      ),
    ).toBeNull()
    expect(
      shortcutFromEvent(
        new KeyboardEvent('keydown', { key: 'p', keyCode: 229 }),
      ),
    ).toBeNull()
    const altGraph = new KeyboardEvent('keydown', {
      key: 'p',
      ctrlKey: true,
      altKey: true,
    })
    Object.defineProperty(altGraph, 'getModifierState', { value: () => true })
    expect(shortcutFromEvent(altGraph)).toBeNull()
    for (const key of ['Tab', 'Enter', 'Escape', 'F5']) {
      expect(
        shortcutFromEvent(new KeyboardEvent('keydown', { key })),
      ).toBeNull()
    }
    expect(
      shortcutFromEvent(
        new KeyboardEvent('keydown', { key: 'r', ctrlKey: true }),
      ),
    ).toBeNull()
  })

  it('records shifted number keys by their base digit', () => {
    expect(
      shortcutFromEvent(
        new KeyboardEvent('keydown', {
          key: '!',
          code: 'Digit1',
          shiftKey: true,
        }),
      ),
    ).toBe('Shift+1')
  })

  it('validates persisted bindings and preserves intentional unbinding', () => {
    const bindings = createDefaultShortcuts()
    bindings.draw = ['Q']
    bindings.erase = []
    expect(parseShortcuts(bindings)).toEqual(bindings)
    expect(
      resolveShortcut(new KeyboardEvent('keydown', { key: 'q' }), bindings),
    ).toBe('draw')
    expect(
      resolveShortcut(new KeyboardEvent('keydown', { key: 'p' }), bindings),
    ).toBeUndefined()
    expect(parseShortcuts(undefined)).toEqual(createDefaultShortcuts())
    expect(parseShortcuts({ draw: ['Mod+R'] })).toEqual(
      createDefaultShortcuts(),
    )
    expect(parseShortcuts({ draw: 42 })).toEqual(createDefaultShortcuts())
    expect(parseShortcuts({ draw: ['E'] })).toEqual(createDefaultShortcuts())
    expect(findShortcutConflict(bindings, 'erase', 'Q')).toBe('draw')
  })

  it('recognizes nested editable content and dialog controls as input boundaries', () => {
    const editable = document.createElement('div')
    editable.contentEditable = 'true'
    editable.setAttribute('contenteditable', 'true')
    const child = document.createElement('span')
    editable.append(child)
    expect(isShortcutInput(child)).toBe(true)
    const dialog = document.createElement('div')
    dialog.setAttribute('role', 'dialog')
    const button = document.createElement('button')
    dialog.append(button)
    expect(isShortcutInput(button)).toBe(true)
    expect(isShortcutInput(document.createElement('select'))).toBe(true)
    expect(isShortcutInput(document.body)).toBe(false)
  })
})
