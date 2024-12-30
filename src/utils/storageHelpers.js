const STORAGE_KEY = 'unicucumber_glyphs'

export const loadStoredGlyphs = ($t) => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (error) {
    console.error($t('glyph_manager.error.loading_storage'), error)
  }
  return []
}

export const saveGlyphsToStorage = (glyphs, $t) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(glyphs))
  } catch (error) {
    console.error($t('glyph_manager.error.saving_storage'), error)
  }
}
