import { onBeforeUnmount, onMounted, ref } from 'vue'

const widthForViewport = (viewportWidth: number): number => {
  if (viewportWidth < 720) return viewportWidth
  if (viewportWidth < 1024)
    return Math.min(560, Math.max(320, viewportWidth - 48))
  if (viewportWidth < 1280) return 480
  return 450
}

interface SidebarOptions {
  desktopEditorReserve?: () => number
}

export function useSidebar(options: SidebarOptions = {}) {
  const isSidebarActive = ref(false)
  const sidebarWidth = ref(widthForViewport(window.innerWidth))
  let resizingPointerId: number | null = null
  let resizeTarget: HTMLElement | null = null

  const handleViewportResize = (): void => {
    const viewportWidth = window.visualViewport?.width ?? window.innerWidth
    if (viewportWidth < 720) {
      sidebarWidth.value = viewportWidth
      return
    }
    const editorReserve =
      viewportWidth >= 1024 ? (options.desktopEditorReserve?.() ?? 32) : 32
    sidebarWidth.value = Math.min(
      Math.max(sidebarWidth.value, Math.min(320, viewportWidth - 32)),
      Math.max(300, viewportWidth - editorReserve),
    )
  }

  const toggleSidebar = (): void => {
    isSidebarActive.value = !isSidebarActive.value
  }

  const stopResize = (): void => {
    const activeResizeTarget = resizeTarget
    if (
      resizingPointerId !== null &&
      activeResizeTarget?.hasPointerCapture(resizingPointerId)
    ) {
      activeResizeTarget.releasePointerCapture(resizingPointerId)
    }
    activeResizeTarget?.removeEventListener('pointermove', doResize)
    activeResizeTarget?.removeEventListener('pointerup', stopResize)
    activeResizeTarget?.removeEventListener('pointercancel', stopResize)
    resizingPointerId = null
    resizeTarget = null
  }

  let startX = 0
  let startWidth = 0
  const doResize = (event: PointerEvent): void => {
    if (event.pointerId !== resizingPointerId) return
    const viewportWidth = window.visualViewport?.width ?? window.innerWidth
    const minWidth = Math.min(300, viewportWidth)
    const editorReserve =
      viewportWidth >= 1024 ? (options.desktopEditorReserve?.() ?? 32) : 32
    const maxWidth = Math.max(minWidth, viewportWidth - editorReserve)
    sidebarWidth.value = Math.min(
      Math.max(startWidth + event.clientX - startX, minWidth),
      maxWidth,
    )
  }

  const startResize = (event: PointerEvent): void => {
    if (window.innerWidth < 720 || resizingPointerId !== null) return
    event.preventDefault()
    resizingPointerId = event.pointerId
    resizeTarget = event.currentTarget as HTMLElement
    startX = event.clientX
    startWidth = sidebarWidth.value
    resizeTarget.setPointerCapture(event.pointerId)
    resizeTarget.addEventListener('pointermove', doResize)
    resizeTarget.addEventListener('pointerup', stopResize)
    resizeTarget.addEventListener('pointercancel', stopResize)
  }

  onMounted(() => window.addEventListener('resize', handleViewportResize))
  onBeforeUnmount(() => {
    window.removeEventListener('resize', handleViewportResize)
    stopResize()
  })

  return { isSidebarActive, sidebarWidth, toggleSidebar, startResize }
}
