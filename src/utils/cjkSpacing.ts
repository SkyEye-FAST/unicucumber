const HAN_CHARACTER = '\\p{Script=Han}'
const LATIN_OR_NUMBER = '[A-Za-z0-9]'

const hanBeforeLatinOrNumber = new RegExp(
  `(${HAN_CHARACTER})(${LATIN_OR_NUMBER})`,
  'gu',
)
const latinOrNumberBeforeHan = new RegExp(
  `(${LATIN_OR_NUMBER})(${HAN_CHARACTER})`,
  'gu',
)

/**
 * Applies the customary visual spacing between Han characters and adjacent
 * Latin letters or numbers without coupling that presentation detail to copy.
 */
export const formatCjkMixedText = (text: string): string =>
  text
    .replace(hanBeforeLatinOrNumber, '$1 $2')
    .replace(latinOrNumberBeforeHan, '$1 $2')
