import { describe, expect, it } from 'vitest'

import {
  overlayUnifontGlyphs,
  parseUnifontVersions,
  unifontHexToMap,
} from './unifont-utils.js'

describe('Unifont update utilities', () => {
  it('finds release versions in descending semantic order', () => {
    expect(
      parseUnifontVersions('href="unifont-15.0.01/" href="unifont-17.0.03/"'),
    ).toEqual(['17.0.03', '15.0.01'])
  })

  it('converts valid .hex lines and ignores metadata', () => {
    const map = unifontHexToMap(`0041:${'F'.repeat(32)}\n# comment`, '17.0.03')
    expect(map.meta.version).toBe('17.0.03')
    expect(map.glyphs[65]).toBe('F'.repeat(32))
  })

  it('overlays standard glyphs without dropping upper-plane glyphs', () => {
    const base = unifontHexToMap(
      `0041:${'A'.repeat(32)}\n20000:${'B'.repeat(64)}`,
      '17.0.05',
    )
    const standard = unifontHexToMap(`0041:${'C'.repeat(32)}`, '17.0.05')

    expect(overlayUnifontGlyphs(base, standard)).toEqual({
      meta: base.meta,
      glyphs: { 65: 'C'.repeat(32), 131072: 'B'.repeat(64) },
    })
  })
})
