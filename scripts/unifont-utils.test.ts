import { describe, expect, it } from 'vitest'

import { parseUnifontVersions, unifontHexToMap } from './unifont-utils.js'

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
})
