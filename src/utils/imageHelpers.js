export const loadImage = (file) => {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = URL.createObjectURL(file)
  })
}

export const validateImageDimensions = (img, dialog, $t) => {
  if (
    (img.width === 16 && img.height === 16) ||
    (img.width === 8 && img.height === 16)
  ) {
    return true
  }

  dialog.value = {
    show: true,
    title: $t('glyph_manager.upload.invalid_dimensions'),
    message: $t('glyph_manager.upload.invalid_dimensions'),
    type: 'alert',
    showCancel: false,
    onConfirm: () => {
      dialog.value.show = false
    },
  }
  return false
}

export const validateMonochrome = (imageData, dialog, $t) => {
  for (let i = 0; i < imageData.data.length; i += 4) {
    const r = imageData.data[i]
    const g = imageData.data[i + 1]
    const b = imageData.data[i + 2]
    const a = imageData.data[i + 3]

    if (
      a > 0 &&
      !(
        (r === 0 && g === 0 && b === 0) ||
        (r === 255 && g === 255 && b === 255)
      )
    ) {
      dialog.value = {
        show: true,
        title: $t('glyph_manager.upload.not_monochrome'),
        message: $t('glyph_manager.upload.not_monochrome'),
        type: 'alert',
        showCancel: false,
        onConfirm: () => {
          dialog.value.show = false
        },
      }
      return false
    }
  }
  return true
}
