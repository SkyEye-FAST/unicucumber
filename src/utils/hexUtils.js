export const hexToGrid = (hexStr) => {
  const width = hexStr.length <= 32 ? 8 : 16
  const height = 16

  const binary = hexStr
    .split('')
    .map((char) => parseInt(char, 16).toString(2).padStart(4, '0'))
    .join('')

  const grid = []
  for (let i = 0; i < height; i++) {
    const row = []
    for (let j = 0; j < width; j++) {
      const index = i * width + j
      row.push(index < binary.length ? (binary[index] === '1' ? 1 : 0) : 0)
    }
    grid.push(row)
  }

  return grid
}

export const deepCloneGrid = (grid) => {
  return grid.map((row) => [...row])
}
