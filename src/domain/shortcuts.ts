import type { EditorTool } from '@/types/glyph'

export const shortcutDefinitions = {
  smartDraw: { label: 'tools.smart_draw', keys: ['A'] },
  draw: { label: 'tools.draw', keys: ['P'] },
  erase: { label: 'tools.erase', keys: ['E'] },
  select: { label: 'tools.select', keys: ['S'] },
  fill: { label: 'tools.fill', keys: ['F'] },
  line: { label: 'tools.line', keys: ['L'] },
  rectangle: { label: 'tools.rectangle', keys: ['R'] },
  filledRectangle: { label: 'tools.filled_rectangle', keys: ['Shift+R'] },
  pan: { label: 'tools.pan', keys: ['H'] },
  undo: { label: 'editor.actions.undo.title', keys: ['Mod+Z'] },
  redo: { label: 'editor.actions.redo.title', keys: ['Mod+Shift+Z', 'Mod+Y'] },
  save: { label: 'editor.actions.save.button', keys: ['Mod+S'] },
  copy: { label: 'selection.copy', keys: ['Mod+C'] },
  cut: { label: 'selection.cut', keys: ['Mod+X'] },
  paste: { label: 'glyph_editor.paste_title', keys: ['Mod+V'] },
  selectAll: { label: 'shortcuts.select_all', keys: ['Mod+A'] },
  delete: { label: 'selection.delete', keys: ['Delete', 'Backspace'] },
  moveUp: { label: 'selection.move_up', keys: ['ArrowUp'] },
  moveDown: { label: 'selection.move_down', keys: ['ArrowDown'] },
  moveLeft: { label: 'selection.move_left', keys: ['ArrowLeft'] },
  moveRight: { label: 'selection.move_right', keys: ['ArrowRight'] },
} as const

export type ShortcutAction = keyof typeof shortcutDefinitions
export type ShortcutBindings = Record<ShortcutAction, string[]>
export const shortcutActions = Object.keys(
  shortcutDefinitions,
) as ShortcutAction[]
export const toolActions: readonly EditorTool[] = [
  'smartDraw',
  'draw',
  'erase',
  'select',
  'fill',
  'line',
  'rectangle',
  'filledRectangle',
  'pan',
]

export const createDefaultShortcuts = (): ShortcutBindings =>
  Object.fromEntries(
    shortcutActions.map((action) => [
      action,
      [...shortcutDefinitions[action].keys],
    ]),
  ) as ShortcutBindings

export const isValidShortcut = (value: unknown): value is string =>
  typeof value === 'string' &&
  /^(Mod\+)?(Alt\+)?(Shift\+)?([A-Z0-9]|ArrowUp|ArrowDown|ArrowLeft|ArrowRight|Delete|Backspace)$/.test(
    value,
  ) &&
  !/^Mod\+(Shift\+)?[RWTNLQ]$/.test(value)

export const shortcutFromEvent = (event: KeyboardEvent): string | null => {
  if (
    event.isComposing ||
    event.keyCode === 229 ||
    event.getModifierState('AltGraph') ||
    (event.ctrlKey && event.metaKey)
  )
    return null
  const key =
    event.shiftKey && /^Digit[0-9]$/.test(event.code)
      ? event.code.slice(-1)
      : /^[a-z0-9]$/i.test(event.key)
        ? event.key.toUpperCase()
        : event.key
  const binding = `${event.ctrlKey || event.metaKey ? 'Mod+' : ''}${event.altKey ? 'Alt+' : ''}${event.shiftKey ? 'Shift+' : ''}${key}`
  return isValidShortcut(binding) ? binding : null
}

export const findShortcutConflict = (
  bindings: ShortcutBindings,
  action: ShortcutAction,
  binding: string,
): ShortcutAction | undefined =>
  shortcutActions.find(
    (candidate) =>
      candidate !== action && bindings[candidate].includes(binding),
  )

export const parseShortcuts = (value: unknown): ShortcutBindings => {
  const defaults = createDefaultShortcuts()
  if (!value || typeof value !== 'object' || Array.isArray(value))
    return defaults
  const stored = value as Record<string, unknown>
  const result = createDefaultShortcuts()
  for (const action of shortcutActions) {
    const keys = stored[action]
    if (keys === undefined) continue
    if (!Array.isArray(keys) || keys.length > 2 || !keys.every(isValidShortcut))
      return defaults
    result[action] = [...new Set(keys)]
  }
  for (const action of shortcutActions) {
    if (result[action].some((key) => findShortcutConflict(result, action, key)))
      return defaults
  }
  return result
}

export const resolveShortcut = (
  event: KeyboardEvent,
  bindings: ShortcutBindings,
): ShortcutAction | undefined => {
  const binding = shortcutFromEvent(event)
  return binding
    ? shortcutActions.find((action) => bindings[action].includes(binding))
    : undefined
}

export const isShortcutInput = (target: EventTarget | null): boolean =>
  target instanceof Element &&
  Boolean(
    target.closest(
      'input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="textbox"], [role="combobox"], [role="listbox"], [role="dialog"]',
    ),
  )

export const formatShortcut = (
  keys: readonly string[],
  apple = false,
): string =>
  keys.map((key) => key.replace('Mod+', apple ? '⌘+' : 'Ctrl+')).join(' / ')
