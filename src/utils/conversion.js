export const hexToBinary = (hexString) => {
  return hexString
    .split('')
    .map((char) => parseInt(char, 16).toString(2).padStart(4, '0'))
    .join('')
}

export const binaryToHex = (binaryString) => {
  return Array.from({ length: Math.ceil(binaryString.length / 4) }, (_, i) => {
    let nibble = binaryString.slice(i * 4, i * 4 + 4)
    return parseInt(nibble, 2).toString(16).toUpperCase()
  }).join('')
}
