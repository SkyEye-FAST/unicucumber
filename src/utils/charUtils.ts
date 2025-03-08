interface CJKCharFunction {
  (char: string): boolean
}

export const isCJKChar: CJKCharFunction = function (char) {
  const code = char.codePointAt(0)
  if (code === undefined) return false
  return (
    (code >= 0x4e00 && code <= 0x9fff) || // CJK Unified Ideographs
    (code >= 0x3400 && code <= 0x4dbf) || // CJK Extension A
    (code >= 0x20000 && code <= 0x2a6df) || // CJK Extension B
    (code >= 0x2a700 && code <= 0x2b73f) || // CJK Extension C
    (code >= 0x2b740 && code <= 0x2b81f) || // CJK Extension D
    (code >= 0x2b820 && code <= 0x2ceaf) || // CJK Extension E
    (code >= 0x2ceb0 && code <= 0x2ebef) || // CJK Extension F
    (code >= 0x30000 && code <= 0x3134f) || // CJK Extension G
    (code >= 0x31350 && code <= 0x323af) || // CJK Extension H
    (code >= 0x2ebf0 && code <= 0x2ee5f) || // CJK Extension I
    (code >= 0x31c0 && code <= 0x31ef) || // CJK Strokes
    (code >= 0xf900 && code <= 0xfaff) || // CJK Compatibility Ideographs
    (code >= 0x2f800 && code <= 0x2fa1f) // CJK Compatibility Ideographs Supplement
  )
}
