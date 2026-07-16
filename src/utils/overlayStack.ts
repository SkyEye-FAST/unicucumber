let openOverlayCount = 0
let previousBodyOverflow = ''

export const acquireOverlayLock = (): void => {
  if (openOverlayCount === 0) {
    previousBodyOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const app = document.getElementById('app')
    if (app) app.inert = true
  }
  openOverlayCount += 1
}

export const releaseOverlayLock = (): void => {
  openOverlayCount = Math.max(0, openOverlayCount - 1)
  if (openOverlayCount !== 0) return
  document.body.style.overflow = previousBodyOverflow
  const app = document.getElementById('app')
  if (app) app.inert = false
}
