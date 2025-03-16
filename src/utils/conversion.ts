export const hexToBinary = (hexString: string): string => {
  return hexString
    .split('')
    .map((char: string) => parseInt(char, 16).toString(2).padStart(4, '0'))
    .join('')
}

export const binaryToHex = (binaryString: string): string => {
  return Array.from(
    { length: Math.ceil(binaryString.length / 4) },
    (_: undefined, i: number) => {
      let nibble: string = binaryString.slice(i * 4, i * 4 + 4)
      return parseInt(nibble, 2).toString(16).toUpperCase()
    },
  ).join('')
}
