import type { GridData, GlyphWidth } from '@/types/glyph'

export interface ImagePreparationOptions {
  targetWidth: GlyphWidth
  mode: 'fit' | 'crop'
  threshold: number
  invert: boolean
  transparentAsWhite: boolean
}

export const prepareImageGrid = (
  image: ImageData,
  options: ImagePreparationOptions,
): GridData => {
  const targetHeight = 16
  const scale =
    options.mode === 'fit'
      ? Math.min(options.targetWidth / image.width, targetHeight / image.height)
      : Math.max(options.targetWidth / image.width, targetHeight / image.height)
  const renderedWidth = image.width * scale
  const renderedHeight = image.height * scale
  const offsetX = (options.targetWidth - renderedWidth) / 2
  const offsetY = (targetHeight - renderedHeight) / 2
  const threshold = Math.max(0, Math.min(255, options.threshold))

  return Array.from({ length: targetHeight }, (_, row) =>
    Array.from({ length: options.targetWidth }, (_, col) => {
      const sourceX = Math.round((col + 0.5 - offsetX) / scale - 0.5)
      const sourceY = Math.round((row + 0.5 - offsetY) / scale - 0.5)
      let filled = false
      if (
        sourceX >= 0 &&
        sourceX < image.width &&
        sourceY >= 0 &&
        sourceY < image.height
      ) {
        const index = (sourceY * image.width + sourceX) * 4
        const red = image.data[index] ?? 255
        const green = image.data[index + 1] ?? 255
        const blue = image.data[index + 2] ?? 255
        const alpha = image.data[index + 3] ?? 0
        if (alpha < 128) {
          filled = !options.transparentAsWhite
        } else {
          const luminance = red * 0.2126 + green * 0.7152 + blue * 0.0722
          filled = luminance < threshold
        }
      }
      if (options.invert) filled = !filled
      return filled ? 1 : 0
    }),
  )
}
