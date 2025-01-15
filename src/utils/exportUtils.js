export const createCanvasFromGrid = (gridData) => {
  const canvas = document.createElement('canvas')
  canvas.width = gridData[0].length
  canvas.height = gridData.length
  const context = canvas.getContext('2d')

  gridData.forEach((row, rowIndex) => {
    row.forEach((cell, colIndex) => {
      context.fillStyle = cell === 1 ? '#000' : '#FFF'
      context.fillRect(colIndex, rowIndex, 1, 1)
    })
  })

  return canvas
}

export const convertToBMP = (imageData) => {
  const canvas = document.createElement('canvas')
  canvas.width = imageData.width
  canvas.height = imageData.height
  const context = canvas.getContext('2d')
  context.putImageData(imageData, 0, 0)

  return new Promise((resolve) => {
    canvas.toBlob(resolve, 'image/bmp')
  })
}

export const createSVGFromGrid = (gridData) => {
  const cellSize = 1
  const width = gridData[0].length
  const height = gridData.length

  let svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">`
  gridData.forEach((row, rowIndex) => {
    row.forEach((cell, colIndex) => {
      if (cell === 1) {
        svgContent += `<rect x="${colIndex}" y="${rowIndex}" width="${cellSize}" height="${cellSize}" fill="black" />`
      }
    })
  })

  return svgContent + '</svg>'
}
