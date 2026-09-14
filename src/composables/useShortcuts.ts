import { useSettings } from '@/composables/useSettings'
import { formatShortcut, type ShortcutAction } from '@/domain/shortcuts'

export function useShortcuts() {
  const { settings } = useSettings()
  const apple =
    typeof navigator !== 'undefined' &&
    /Mac|iPhone|iPad/.test(navigator.platform)
  const shortcutLabel = (action: ShortcutAction): string =>
    formatShortcut(settings.value.shortcuts[action], apple)
  const shortcutTooltip = (label: string, action: ShortcutAction): string => {
    const keys = shortcutLabel(action)
    return keys ? `${label} (${keys})` : label
  }
  return { shortcutLabel, shortcutTooltip }
}
