const clipboard = (): Clipboard | undefined =>
  typeof navigator === 'undefined' ? undefined : navigator.clipboard

export const canWriteClipboardText = (): boolean =>
  typeof clipboard()?.writeText === 'function'

export const canWriteClipboardImage = (): boolean =>
  typeof clipboard()?.write === 'function' &&
  typeof ClipboardItem !== 'undefined'

export const writeClipboardText = async (text: string): Promise<void> => {
  const target = clipboard()
  if (typeof target?.writeText !== 'function') {
    throw new Error('Clipboard text writing is unavailable.')
  }
  await target.writeText(text)
}

/**
 * Accepts a pending blob so the clipboard write starts synchronously inside
 * the user gesture; Safari rejects writes issued after an awaited encode.
 */
export const writeClipboardPng = async (
  png: Blob | Promise<Blob>,
): Promise<void> => {
  const target = clipboard()
  if (
    typeof target?.write !== 'function' ||
    typeof ClipboardItem === 'undefined'
  ) {
    throw new Error('Clipboard image writing is unavailable.')
  }
  await target.write([new ClipboardItem({ 'image/png': png })])
}
