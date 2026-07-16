import type { GridData } from '@/types/glyph'

export interface RasterExportOptions {
  scale?: number
  transparent?: boolean
  background?: string
}

const normalizeScale = (scale = 1): number =>
  Math.max(1, Math.min(64, Math.round(scale)))

export const createCanvasFromGrid = (
  gridData: GridData,
  options: RasterExportOptions = {},
): HTMLCanvasElement => {
  const scale = normalizeScale(options.scale)
  const width = gridData[0]?.length ?? 0
  const canvas = document.createElement('canvas')
  canvas.width = width * scale
  canvas.height = gridData.length * scale
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Failed to get canvas context')
  context.imageSmoothingEnabled = false

  if (!options.transparent) {
    context.fillStyle = options.background ?? '#FFFFFF'
    context.fillRect(0, 0, canvas.width, canvas.height)
  }
  context.fillStyle = '#000000'
  gridData.forEach((row, rowIndex) => {
    row.forEach((cell, colIndex) => {
      if (cell === 1) {
        context.fillRect(colIndex * scale, rowIndex * scale, scale, scale)
      }
    })
  })
  return canvas
}

export const canvasToBlob = (
  canvas: HTMLCanvasElement,
  type = 'image/png',
): Promise<Blob> =>
  new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob && blob.type === type) resolve(blob)
      else reject(new Error(`Browser failed to encode a ${type} image.`))
    }, type)
  })

export const encodeBmp = (
  gridData: GridData,
  options: Pick<RasterExportOptions, 'scale' | 'background'> = {},
): Blob => {
  const scale = normalizeScale(options.scale)
  const sourceWidth = gridData[0]?.length ?? 0
  const sourceHeight = gridData.length
  const width = sourceWidth * scale
  const height = sourceHeight * scale
  const rowStride = Math.ceil((width * 3) / 4) * 4
  const pixelDataSize = rowStride * height
  const pixelOffset = 14 + 40
  const fileSize = pixelOffset + pixelDataSize
  const buffer = new ArrayBuffer(fileSize)
  const view = new DataView(buffer)
  const bytes = new Uint8Array(buffer)

  bytes[0] = 0x42
  bytes[1] = 0x4d
  view.setUint32(2, fileSize, true)
  view.setUint32(10, pixelOffset, true)
  view.setUint32(14, 40, true)
  view.setInt32(18, width, true)
  view.setInt32(22, height, true)
  view.setUint16(26, 1, true)
  view.setUint16(28, 24, true)
  view.setUint32(30, 0, true)
  view.setUint32(34, pixelDataSize, true)
  view.setInt32(38, 2835, true)
  view.setInt32(42, 2835, true)

  const background = options.background?.toLowerCase() === '#000000' ? 0 : 255
  for (let outputRow = 0; outputRow < height; outputRow++) {
    const sourceRow = sourceHeight - 1 - Math.floor(outputRow / scale)
    const rowOffset = pixelOffset + outputRow * rowStride
    for (let outputCol = 0; outputCol < width; outputCol++) {
      const sourceCol = Math.floor(outputCol / scale)
      const isFilled = gridData[sourceRow]?.[sourceCol] === 1
      const channel = isFilled ? 0 : background
      const offset = rowOffset + outputCol * 3
      bytes[offset] = channel
      bytes[offset + 1] = channel
      bytes[offset + 2] = channel
    }
  }

  return new Blob([buffer], { type: 'image/bmp' })
}

export const createSVGFromGrid = (
  gridData: GridData,
  options: RasterExportOptions = {},
): string => {
  const scale = normalizeScale(options.scale)
  const width = gridData[0]?.length ?? 0
  const height = gridData.length
  const outputWidth = width * scale
  const outputHeight = height * scale
  const background = options.transparent
    ? ''
    : `<rect width="${outputWidth}" height="${outputHeight}" fill="${options.background ?? '#FFFFFF'}"/>`
  const pixels = gridData
    .flatMap((row, rowIndex) =>
      row.map((cell, colIndex) =>
        cell === 1
          ? `<rect x="${colIndex * scale}" y="${rowIndex * scale}" width="${scale}" height="${scale}"/>`
          : '',
      ),
    )
    .join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${outputWidth}" height="${outputHeight}" viewBox="0 0 ${outputWidth} ${outputHeight}" shape-rendering="crispEdges">${background}<g fill="#000000">${pixels}</g></svg>`
}
