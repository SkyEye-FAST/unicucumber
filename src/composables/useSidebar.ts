import { onBeforeUnmount, onMounted, ref } from 'vue'

const widthForViewport = (viewportWidth: number): number => {
  if (viewportWidth <= 720) return viewportWidth
  if (viewportWidth <= 1025) return Math.min(800, viewportWidth)
  return 450
}

export function useSidebar() {
  const isSidebarActive = ref(false)
  const sidebarWidth = ref(widthForViewport(window.innerWidth))
  let resizingPointerId: number | null = null
  let resizeTarget: HTMLElement | null = null

  const handleViewportResize = (): void => {
    if (window.innerWidth <= 720) sidebarWidth.value = window.innerWidth
    else sidebarWidth.value = Math.min(sidebarWidth.value, window.innerWidth)
  }

  const toggleSidebar = (): void => {
    isSidebarActive.value = !isSidebarActive.value
  }

  const stopResize = (): void => {
    if (
      resizingPointerId !== null &&
      resizeTarget?.hasPointerCapture(resizingPointerId)
    ) {
      resizeTarget.releasePointerCapture(resizingPointerId)
    }
    resizingPointerId = null
    resizeTarget = null
    window.removeEventListener('pointermove', doResize)
    window.removeEventListener('pointerup', stopResize)
    window.removeEventListener('pointercancel', stopResize)
  }

  let startX = 0
  let startWidth = 0
  const doResize = (event: PointerEvent): void => {
    if (event.pointerId !== resizingPointerId) return
    const viewportWidth = window.visualViewport?.width ?? window.innerWidth
    const minWidth = Math.min(300, viewportWidth)
    const maxWidth = Math.min(viewportWidth, viewportWidth <= 1025 ? 1000 : 600)
    sidebarWidth.value = Math.min(
      Math.max(startWidth + event.clientX - startX, minWidth),
      maxWidth,
    )
  }

  const startResize = (event: PointerEvent): void => {
    if (window.innerWidth <= 720 || resizingPointerId !== null) return
    resizingPointerId = event.pointerId
    resizeTarget = event.currentTarget as HTMLElement
    startX = event.clientX
    startWidth = sidebarWidth.value
    resizeTarget.setPointerCapture(event.pointerId)
    window.addEventListener('pointermove', doResize)
    window.addEventListener('pointerup', stopResize)
    window.addEventListener('pointercancel', stopResize)
  }

  onMounted(() => window.addEventListener('resize', handleViewportResize))
  onBeforeUnmount(() => {
    window.removeEventListener('resize', handleViewportResize)
    stopResize()
  })

  return { isSidebarActive, sidebarWidth, toggleSidebar, startResize }
}
