import { describe, expect, it } from 'vitest'

import { defaultSettings, parseSettings } from './useSettings'

describe('settings parsing and migration', () => {
  it('keeps valid persisted values and supplies defaults for missing settings', () => {
    expect(
      parseSettings({ glyphWidth: 8, drawMode: 'doubleButtonDraw' }),
    ).toMatchObject({
      glyphWidth: 8,
      drawMode: 'doubleButtonDraw',
      enableSelection: defaultSettings.enableSelection,
    })
  })

  it('does not trust corrupted or invalid persisted values', () => {
    expect(
      parseSettings({
        glyphWidth: 12,
        drawMode: 'anything',
        browserPreviewFont: '',
      }),
    ).toEqual(defaultSettings)
    expect(parseSettings(null)).toEqual(defaultSettings)
  })

  it('provides one app-scoped source to every consumer', async () => {
    const { useSettings } = await import('./useSettings')
    const first = useSettings()
    const second = useSettings()
    first.settings.value.showBorder = false
    expect(second.settings.value.showBorder).toBe(false)
    second.settings.value.showBorder = defaultSettings.showBorder
  })
})
