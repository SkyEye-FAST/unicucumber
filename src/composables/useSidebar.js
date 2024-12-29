import { ref } from 'vue'

export function useSidebar() {
  const isSidebarActive = ref(false)
  const sidebarWidth = ref(window.innerWidth >= 768 ? 800 : 400)
  const minWidth = window.innerWidth >= 768 ? 500 : 300
  const maxWidth = window.innerWidth >= 768 ? 1000 : 800

  const toggleSidebar = () => {
    isSidebarActive.value = !isSidebarActive.value
  }

  const startResize = (e) => {
    if (window.innerWidth <= 768) return

    const startX = e.clientX
    const startWidth = sidebarWidth.value

    const doResize = (e) => {
      const newWidth = startWidth + (e.clientX - startX)
      sidebarWidth.value = Math.min(Math.max(newWidth, minWidth), maxWidth)
    }

    const stopResize = () => {
      window.removeEventListener('mousemove', doResize)
      window.removeEventListener('mouseup', stopResize)
    }

    window.addEventListener('mousemove', doResize)
    window.addEventListener('mouseup', stopResize)
  }

  return {
    isSidebarActive,
    sidebarWidth,
    toggleSidebar,
    startResize,
  }
}
