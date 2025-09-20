export const createCanvasFromGrid = (
  gridData: number[][],
): HTMLCanvasElement => {
  const canvas: HTMLCanvasElement = document.createElement('canvas')
  canvas.width = gridData[0]?.length ?? 0
  canvas.height = gridData.length
  const context: CanvasRenderingContext2D | null = canvas.getContext('2d')

  if (!context) throw new Error('Failed to get canvas context')

  gridData.forEach((row, rowIndex) => {
    row.forEach((cell, colIndex) => {
      context.fillStyle = cell === 1 ? '#000' : '#FFF'
      context.fillRect(colIndex, rowIndex, 1, 1)
    })
  })

  return canvas
}

export const convertToBMP = async (imageData: ImageData): Promise<Blob> => {
  const canvas: HTMLCanvasElement = document.createElement('canvas')
  canvas.width = imageData.width
  canvas.height = imageData.height
  const context: CanvasRenderingContext2D | null = canvas.getContext('2d')

  if (!context) throw new Error('Failed to get canvas context')

  context.putImageData(imageData, 0, 0)

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob)
      } else {
        reject(new Error('Failed to create BMP blob'))
      }
    }, 'image/bmp')
  })
}

export const createSVGFromGrid = (gridData: number[][]): string => {
  const cellSize = 1
  const width = gridData[0]?.length ?? 0
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
