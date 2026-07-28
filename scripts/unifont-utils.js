const VERSION_PATTERN = /^\d+\.\d+\.\d+$/

export const parseUnifontVersions = (html) =>
  [...html.matchAll(/href="unifont-(\d+\.\d+\.\d+)\/"/g)]
    .map((match) => match[1])
    .filter((version) => VERSION_PATTERN.test(version))
    .sort(compareVersionsDescending)

export const compareVersionsDescending = (left, right) => {
  const leftParts = left.split('.').map(Number)
  const rightParts = right.split('.').map(Number)
  for (let index = 0; index < 3; index += 1) {
    const difference = (rightParts[index] ?? 0) - (leftParts[index] ?? 0)
    if (difference !== 0) return difference
  }
  return 0
}

export const unifontHexToMap = (source, version) => {
  if (!VERSION_PATTERN.test(version)) {
    throw new Error(`Invalid Unifont version: ${version}`)
  }

  const glyphs = {}
  for (const line of source.split(/\r?\n/)) {
    const match =
      /^(?<code>[0-9A-F]{4,6}):(?<hex>[0-9A-F]{32}|[0-9A-F]{64})$/i.exec(
        line.trim(),
      )
    if (match?.groups === undefined) continue
    glyphs[Number.parseInt(match.groups.code, 16)] =
      match.groups.hex.toUpperCase()
  }

  if (Object.keys(glyphs).length === 0) {
    throw new Error(
      'Downloaded Unifont data did not contain valid glyph records.',
    )
  }

  return { meta: { version, source: 'unifont_all' }, glyphs }
}

/**
 * Apply glyphs from a second Unifont build over a complete glyph map.
 *
 * The upstream `unifont_all` build for Unifont 17.0.04 and later contains
 * Japanese-variant glyphs for part of the CJK repertoire.  The regular
 * `unifont` build is the authoritative source for the BMP glyphs, so it is
 * merged over `unifont_all` while retaining the latter's metadata and upper
 * plane coverage.
 */
export const overlayUnifontGlyphs = (baseMap, overrideMap) => ({
  meta: baseMap.meta,
  glyphs: { ...baseMap.glyphs, ...overrideMap.glyphs },
})
