<template>
  <div ref="root" class="custom-select" :class="{ 'is-open': open }">
    <button
      ref="trigger"
      class="custom-select__trigger"
      type="button"
      role="combobox"
      :aria-controls="menuId"
      :aria-expanded="open"
      :aria-haspopup="'listbox'"
      :aria-label="ariaLabel"
      :disabled="disabled"
      @click="toggle"
      @keydown="handleTriggerKeydown"
    >
      <span class="custom-select__value">{{
        selectedOption?.label ?? placeholder
      }}</span>
      <i-material-symbols-keyboard-arrow-down
        class="custom-select__indicator"
        aria-hidden="true"
      />
    </button>

    <Teleport to="body" :disabled="!useMobileModal">
      <div
        v-if="open"
        class="custom-select__overlay"
        :class="{ 'is-modal': useMobileModal }"
        :role="useMobileModal ? 'dialog' : undefined"
        :aria-label="useMobileModal ? ariaLabel : undefined"
        :aria-modal="useMobileModal ? 'true' : undefined"
        @click.self="hide(true)"
      >
        <div
          ref="menu"
          :id="menuId"
          class="custom-select__menu"
          :class="{ 'custom-select__menu--modal': useMobileModal }"
        >
          <header v-if="useMobileModal" class="custom-select__modal-header">
            <strong>{{ ariaLabel }}</strong>
            <button
              class="custom-select__close"
              type="button"
              :aria-label="`Close ${ariaLabel}`"
              @click="hide(true)"
            >
              <i-material-symbols-close aria-hidden="true" />
            </button>
          </header>
          <div v-if="searchable" class="custom-select__search">
            <i-material-symbols-search aria-hidden="true" />
            <input
              ref="searchInput"
              v-model="query"
              type="search"
              :aria-label="searchLabel ?? ariaLabel"
              @keydown="handleMenuKeydown"
            />
          </div>
          <div
            class="custom-select__options"
            role="listbox"
            :aria-label="ariaLabel"
            @keydown="handleMenuKeydown"
          >
            <button
              v-for="option in filteredOptions"
              :key="String(option.value)"
              class="custom-select__option"
              :class="{
                'is-highlighted': option.value === highlightedValue,
                'is-selected': option.value === modelValue,
              }"
              type="button"
              role="option"
              :aria-selected="option.value === modelValue"
              :disabled="option.disabled"
              tabindex="-1"
              @click="select(option.value)"
            >
              {{ option.label }}
            </button>
            <p v-if="filteredOptions.length === 0" class="custom-select__empty">
              {{ emptyLabel }}
            </p>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

export interface CustomSelectOption {
  value: string | number
  label: string
  searchText?: string
  disabled?: boolean
}

let selectId = 0

const props = withDefaults(
  defineProps<{
    ariaLabel: string
    disabled?: boolean
    emptyLabel?: string
    modelValue: string | number
    mobileModal?: boolean
    options: readonly CustomSelectOption[]
    placeholder?: string
    searchable?: boolean
    searchLabel?: string
  }>(),
  {
    disabled: false,
    emptyLabel: 'No matching options',
    mobileModal: false,
    placeholder: '',
    searchable: false,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: string | number]
}>()

const root = ref<HTMLElement | null>(null)
const trigger = ref<HTMLButtonElement | null>(null)
const menu = ref<HTMLElement | null>(null)
const searchInput = ref<HTMLInputElement | null>(null)
const open = ref(false)
const isNarrowViewport = ref(false)
const query = ref('')
const highlightedValue = ref<string | number | null>(null)
const menuId = `custom-select-${++selectId}`

const selectedOption = computed(() =>
  props.options.find((option) => option.value === props.modelValue),
)
const useMobileModal = computed(
  () => props.mobileModal && isNarrowViewport.value,
)
const filteredOptions = computed(() => {
  const normalizedQuery = query.value.trim().toLocaleLowerCase()
  if (!normalizedQuery) return props.options
  return props.options.filter((option) =>
    `${option.label} ${option.searchText ?? ''}`
      .toLocaleLowerCase()
      .includes(normalizedQuery),
  )
})

const setInitialHighlight = (): void => {
  const selected = filteredOptions.value.find(
    (option) => option.value === props.modelValue && !option.disabled,
  )
  highlightedValue.value =
    selected?.value ?? firstEnabledOption()?.value ?? null
}
const firstEnabledOption = (): CustomSelectOption | undefined =>
  filteredOptions.value.find((option) => !option.disabled)

const show = (): void => {
  if (props.disabled) return
  open.value = true
  query.value = ''
  setInitialHighlight()
  void nextTick(() => {
    if (props.searchable) searchInput.value?.focus()
  })
}
const hide = (restoreFocus = false): void => {
  open.value = false
  query.value = ''
  highlightedValue.value = null
  if (restoreFocus) void nextTick(() => trigger.value?.focus())
}
const toggle = (): void => (open.value ? hide() : show())
const select = (value: string | number): void => {
  emit('update:modelValue', value)
  hide(true)
}
const moveHighlight = (direction: 1 | -1): void => {
  const available = filteredOptions.value.filter((option) => !option.disabled)
  if (!available.length) return
  const currentIndex = available.findIndex(
    (option) => option.value === highlightedValue.value,
  )
  const nextIndex =
    currentIndex === -1
      ? direction === 1
        ? 0
        : available.length - 1
      : (currentIndex + direction + available.length) % available.length
  highlightedValue.value = available[nextIndex]?.value ?? null
}
const selectHighlighted = (): void => {
  const option = filteredOptions.value.find(
    (candidate) => candidate.value === highlightedValue.value,
  )
  if (option && !option.disabled) select(option.value)
}
const handleTriggerKeydown = (event: KeyboardEvent): void => {
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault()
    if (!open.value) show()
    moveHighlight(event.key === 'ArrowDown' ? 1 : -1)
  } else if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    toggle()
  }
}
const handleMenuKeydown = (event: KeyboardEvent): void => {
  if (event.key === 'Escape') {
    event.preventDefault()
    hide(true)
  } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault()
    moveHighlight(event.key === 'ArrowDown' ? 1 : -1)
  } else if (event.key === 'Home') {
    event.preventDefault()
    highlightedValue.value = firstEnabledOption()?.value ?? null
  } else if (event.key === 'End') {
    event.preventDefault()
    highlightedValue.value =
      [...filteredOptions.value].reverse().find((option) => !option.disabled)
        ?.value ?? null
  } else if (event.key === 'Enter') {
    event.preventDefault()
    selectHighlighted()
  }
}
const handleDocumentPointerDown = (event: PointerEvent): void => {
  const target = event.target as Node
  if (
    open.value &&
    !root.value?.contains(target) &&
    !menu.value?.contains(target)
  ) {
    hide()
  }
}

watch(query, setInitialHighlight)
watch(
  () => props.disabled,
  (disabled) => {
    if (disabled) hide()
  },
)

document.addEventListener('pointerdown', handleDocumentPointerDown)
let narrowViewportQuery: MediaQueryList | null = null
const handleNarrowViewportChange = (event: MediaQueryListEvent): void => {
  isNarrowViewport.value = event.matches
}

onMounted(() => {
  narrowViewportQuery = window.matchMedia('(max-width: 719px)')
  isNarrowViewport.value = narrowViewportQuery.matches
  narrowViewportQuery.addEventListener('change', handleNarrowViewportChange)
})
onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', handleDocumentPointerDown)
  narrowViewportQuery?.removeEventListener('change', handleNarrowViewportChange)
})
</script>

<style scoped>
.custom-select {
  position: relative;
  min-width: 0;
}

.custom-select__trigger {
  width: 100%;
  min-height: var(--control-height);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  box-sizing: border-box;
  padding: 0.4rem 0.55rem 0.4rem 0.7rem;
  border: 1px solid var(--input-border);
  border-radius: var(--radius-sm);
  background: var(--input-background);
  color: var(--text-color);
  cursor: pointer;
  text-align: start;
}

.custom-select__trigger:hover:not(:disabled),
.custom-select.is-open .custom-select__trigger {
  border-color: var(--primary-color);
}

.custom-select.is-open .custom-select__trigger {
  box-shadow: 0 0 0 2px var(--focus-ring);
}

.custom-select__value {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.custom-select__indicator {
  flex: none;
  color: var(--text-secondary);
  transition: transform 160ms ease;
}

.custom-select.is-open .custom-select__indicator {
  transform: rotate(180deg);
}

.custom-select__menu {
  position: absolute;
  z-index: 30;
  inset-block-start: calc(100% + 0.3rem);
  inset-inline: 0;
  min-width: max-content;
  overflow: hidden;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  background: var(--dialog-background);
  box-shadow: 0 8px 24px var(--shadow-color);
}

.custom-select__overlay.is-modal {
  position: fixed;
  z-index: 1400;
  inset: 0;
  display: grid;
  align-items: end;
  background: color-mix(in srgb, var(--modal-overlay) 65%, transparent);
}

.custom-select__menu--modal {
  position: static;
  min-width: 0;
  max-height: min(78dvh, 38rem);
  display: grid;
  grid-template-rows: auto auto minmax(0, 1fr);
  border-width: 1px 0 0;
  border-radius: var(--radius-md) var(--radius-md) 0 0;
  box-shadow: 0 -8px 24px var(--shadow-color);
}

.custom-select__modal-header {
  min-height: 3.5rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  padding: 0 var(--space-4);
  border-bottom: 1px solid var(--border-color);
  color: var(--text-color);
}

.custom-select__close {
  width: 2.25rem;
  height: 2.25rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 0;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--text-secondary);
}

.custom-select__search {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2);
  border-bottom: 1px solid var(--border-color);
  color: var(--text-secondary);
}

.custom-select__search input {
  min-width: 0;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--text-color);
}

.custom-select__options {
  max-height: min(18rem, 50dvh);
  overflow-y: auto;
  padding: 0.25rem;
}

.custom-select__option {
  width: 100%;
  min-height: 2.25rem;
  display: block;
  padding: 0.45rem 0.55rem;
  border: 0;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--text-color);
  cursor: pointer;
  font: inherit;
  text-align: start;
}

.custom-select__option:hover:not(:disabled),
.custom-select__option.is-highlighted {
  background: var(--background-hover);
}

.custom-select__option.is-selected {
  color: var(--primary-darker);
  font-weight: 700;
}

.custom-select__empty {
  margin: 0;
  padding: 0.65rem;
  color: var(--text-secondary);
  font-size: 0.8125rem;
}
</style>
