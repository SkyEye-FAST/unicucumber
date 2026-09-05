<template>
  <Teleport to="body">
    <Transition name="tooltip" :duration="{ enter: 160, leave: 100 }">
      <div
        v-if="anchor"
        :id="tooltipId"
        ref="tooltipElement"
        class="app-tooltip"
        role="tooltip"
        :style="positionStyle"
        :data-placement="placement"
        @pointerenter="cancelHide"
        @pointerleave="scheduleHide"
      >
        <div
          :key="text"
          class="app-tooltip-surface tw:box-border tw:px-3 tw:py-2"
        >
          {{ text }}
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import {
  computed,
  onMounted,
  onScopeDispose,
  ref,
  shallowRef,
  useId,
  watchEffect,
} from 'vue'
import {
  autoUpdate,
  computePosition,
  flip,
  hide,
  offset,
  shift,
  type Placement,
} from '@floating-ui/dom'

// Shared icon controls opt in through their existing class. Other controls can
// opt in individually, or as a toolbar, without adding layout wrappers.
const selector =
  '.ui-icon-button[aria-label], [data-tooltip], [data-tooltip-group] :is(button, a, summary)[aria-label]'
const tooltipId = `tooltip-${useId()}`
const anchor = shallowRef<HTMLElement | null>(null)
const tooltipElement = shallowRef<HTMLElement | null>(null)
const text = ref('')
const coordinates = ref<{ x: number; y: number } | null>(null)
const placement = ref<Placement>('right')
const positionStyle = computed(() => ({
  left: `${coordinates.value?.x ?? 0}px`,
  top: `${coordinates.value?.y ?? 0}px`,
  visibility: coordinates.value ? ('visible' as const) : ('hidden' as const),
}))
let hideTimer: ReturnType<typeof setTimeout> | undefined
let originalTitle: string | null = null
let focused: HTMLElement | null = null

const cancelHide = () => clearTimeout(hideTimer)
const dismiss = () => {
  cancelHide()
  const element = anchor.value
  if (element) {
    const description = (element.getAttribute('aria-describedby') ?? '')
      .split(/\s+/)
      .filter((id) => id && id !== tooltipId)
      .join(' ')
    if (description) element.setAttribute('aria-describedby', description)
    else element.removeAttribute('aria-describedby')
    if (originalTitle !== null) element.setAttribute('title', originalTitle)
  }
  anchor.value = null
  originalTitle = null
}
const scheduleHide = () => {
  cancelHide()
  if (focused === anchor.value) return
  hideTimer = setTimeout(dismiss, 120)
}
const findControl = (target: EventTarget | null) =>
  target instanceof Element ? target.closest<HTMLElement>(selector) : null

const show = (element: HTMLElement) => {
  cancelHide()
  if (anchor.value === element) return
  dismiss()
  const label =
    element.getAttribute('data-tooltip') || element.getAttribute('aria-label')
  if (!label) return
  coordinates.value = null
  text.value = label
  originalTitle = element.getAttribute('title')
  element.removeAttribute('title')
  const description = element.getAttribute('aria-describedby')
  element.setAttribute(
    'aria-describedby',
    [description, tooltipId].filter(Boolean).join(' '),
  )
  anchor.value = element
}

watchEffect((onCleanup) => {
  const reference = anchor.value
  const floating = tooltipElement.value
  if (!reference || !floating) return
  let disposed = false
  const update = async () => {
    if (!reference.isConnected || !reference.getClientRects().length) {
      dismiss()
      return
    }
    const below =
      reference.closest('[data-tooltip-placement="bottom"]') !== null
    const result = await computePosition(reference, floating, {
      strategy: 'fixed',
      placement: below ? 'bottom' : 'right',
      middleware: [
        offset(8),
        flip({
          padding: 8,
          crossAxis: false,
          fallbackPlacements: below ? ['top'] : ['left', 'bottom', 'top'],
        }),
        shift({ padding: 8 }),
        hide(),
      ],
    })
    if (disposed) return
    placement.value = result.placement
    coordinates.value = result.middlewareData.hide?.referenceHidden
      ? null
      : { x: result.x, y: result.y }
  }
  const stop = autoUpdate(reference, floating, () => {
    void update()
  })
  const observer = new MutationObserver(() => {
    text.value =
      reference.getAttribute('data-tooltip') ||
      reference.getAttribute('aria-label') ||
      ''
  })
  observer.observe(reference, {
    attributes: true,
    attributeFilter: ['aria-label', 'data-tooltip'],
  })
  onCleanup(() => {
    disposed = true
    stop()
    observer.disconnect()
  })
})

const onPointerOver = (event: PointerEvent) => {
  if (event.pointerType === 'touch') return
  const element = findControl(event.target)
  if (element) show(element)
}
const onPointerOut = (event: PointerEvent) => {
  if (
    findControl(event.target) === anchor.value &&
    findControl(event.relatedTarget) !== anchor.value
  )
    scheduleHide()
}
const onFocusIn = (event: FocusEvent) => {
  const element = findControl(event.target)
  if (element?.matches(':focus-visible')) {
    focused = element
    show(element)
  }
}
const onFocusOut = () => {
  focused = null
  scheduleHide()
}
const onActivate = () => {
  focused = null
  dismiss()
}
const onKeyDown = (event: KeyboardEvent) => {
  if (['Escape', 'Enter', ' '].includes(event.key)) onActivate()
}

onMounted(() => {
  document.addEventListener('pointerover', onPointerOver)
  document.addEventListener('pointerout', onPointerOut)
  document.addEventListener('focusin', onFocusIn)
  document.addEventListener('focusout', onFocusOut)
  document.addEventListener('pointerdown', onActivate, true)
  document.addEventListener('keydown', onKeyDown, true)
})
onScopeDispose(() => {
  dismiss()
  document.removeEventListener('pointerover', onPointerOver)
  document.removeEventListener('pointerout', onPointerOut)
  document.removeEventListener('focusin', onFocusIn)
  document.removeEventListener('focusout', onFocusOut)
  document.removeEventListener('pointerdown', onActivate, true)
  document.removeEventListener('keydown', onKeyDown, true)
})
</script>

<style scoped>
.app-tooltip {
  position: fixed;
  z-index: 10000;
  width: max-content;
  max-width: min(22rem, calc(100vw - 1rem));
  transition: none;
  --tooltip-enter-x: -0.25rem;
  --tooltip-enter-y: 0;
}

.app-tooltip[data-placement='left'] {
  --tooltip-enter-x: 0.25rem;
}

.app-tooltip[data-placement='bottom'],
.app-tooltip[data-placement='top'] {
  --tooltip-enter-x: 0;
  --tooltip-enter-y: -0.25rem;
}

.app-tooltip[data-placement='top'] {
  --tooltip-enter-y: 0.25rem;
}

.app-tooltip-surface {
  max-height: calc(100dvh - 1rem);
  overflow: auto;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  background: var(--background-light);
  box-shadow: 0 3px 10px var(--modal-overlay);
  color: var(--text-color);
  font: 650 0.78rem / 1.4 var(--normal-font);
  overflow-wrap: anywhere;
  transition: none;
  animation: tooltip-reveal 160ms cubic-bezier(0.2, 0.8, 0.2, 1);
}

@keyframes tooltip-reveal {
  from {
    opacity: 0;
    transform: translate(var(--tooltip-enter-x), var(--tooltip-enter-y))
      scale(0.97);
  }
  to {
    opacity: 1;
    transform: translate(0, 0) scale(1);
  }
}

.tooltip-leave-active {
  pointer-events: none;
  transition: opacity 100ms ease-out;
}

.tooltip-leave-to {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .app-tooltip-surface {
    animation: none;
  }

  .tooltip-leave-active {
    transition: none;
  }
}
</style>
