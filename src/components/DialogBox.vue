<template>
  <Teleport to="body">
    <div v-if="show" class="dialog-overlay" @keydown="handleDialogKeydown">
      <div
        ref="dialogRef"
        class="dialog-box"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="titleId"
        :aria-describedby="message ? messageId : undefined"
        tabindex="-1"
      >
        <h3 :id="titleId" class="dialog-title">{{ title }}</h3>
        <div class="dialog-content">
          <p v-if="message" :id="messageId">{{ message }}</p>
          <div v-if="showProgress" class="progress-section">
            <div class="progress-info">
              <span>{{ progressCurrent }} / {{ progressTotal }}</span>
              <span>{{ progressPercentage }}%</span>
            </div>
            <div class="progress-bar">
              <div
                class="progress-fill"
                :style="{ width: progressPercentage + '%' }"
              ></div>
            </div>
          </div>
          <div
            v-if="hexValue && displayMode === 'glyph-input'"
            class="glyph-preview-section"
          >
            <div class="glyph-preview-container">
              <PixelPreview
                :hex-value="hexValue"
                :width="hexValue.length <= 32 ? 8 : 16"
                display-mode="dialog"
              />
            </div>
            <div class="glyph-info">
              <span class="hex-label">{{ $t('dialog.glyph_hex') }}:</span>
              <span class="hex-display">{{ hexValue }}</span>
            </div>
          </div>
          <div v-if="type === 'list'" class="conflict-list">
            <div class="select-all-row">
              <label class="checkbox-label">
                <input
                  type="checkbox"
                  :checked="isAllSelected"
                  @change="toggleSelectAll"
                />
                {{ $t('dialog.select_all') }}
              </label>
            </div>
            <div class="conflict-items-container">
              <div
                v-for="item in items"
                :key="item.codePoint"
                class="conflict-item"
              >
                <label class="checkbox-label">
                  <input
                    v-model="selectedItems"
                    type="checkbox"
                    :value="item"
                  />
                  <span class="item-details">
                    <span class="code-info">
                      <span class="code-point">U+{{ item.codePoint }}</span>
                      <span class="hex-value">{{ item.hexValue }}</span>
                    </span>
                    <span class="glyph-preview">
                      {{ String.fromCodePoint(parseInt(item.codePoint, 16)) }}
                    </span>
                  </span>
                </label>
              </div>
            </div>
          </div>
        </div>
        <div class="dialog-actions">
          <template v-if="customButtons && customButtons.length > 0">
            <button
              v-for="(button, index) in customButtons"
              :key="index"
              :class="['btn-custom', button.class || 'btn-secondary']"
              type="button"
              @click="handleCustomButton(button.action)"
            >
              {{ button.text }}
            </button>
          </template>
          <template v-else>
            <button
              v-if="showCancel"
              class="btn-secondary"
              type="button"
              @click="handleCancel"
            >
              {{ cancelText }}
            </button>
            <button
              :class="{ 'btn-primary': !danger, 'btn-danger': danger }"
              type="button"
              @click="handleConfirm"
            >
              {{ confirmText }}
            </button>
          </template>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, useId, watch } from 'vue'

import { useI18n } from 'vue-i18n'

import PixelPreview from '@/components/GlyphManager/PixelPreview.vue'
import type { Glyph } from '@/types/glyph'
import { acquireOverlayLock, releaseOverlayLock } from '@/utils/overlayStack'

const { t: $t } = useI18n()

const props = defineProps({
  show: Boolean,
  title: {
    type: String,
    default: '',
  },
  message: {
    type: String,
    default: '',
  },
  type: {
    type: String,
    default: 'alert', // 'alert', 'confirm', 'list'
  },
  items: {
    type: Array as () => Glyph[],
    default: () => [],
  },
  showCancel: {
    type: Boolean,
    default: true,
  },
  confirmText: {
    type: String,
    default: '',
  },
  cancelText: {
    type: String,
    default: '',
  },
  danger: {
    type: Boolean,
    default: false,
  },
  onConfirm: {
    type: Function,
    default: null,
  },
  onCancel: {
    type: Function,
    default: null,
  },
  hexValue: {
    type: String,
    default: '',
  },
  width: {
    type: Number,
    default: 400,
  },
  displayMode: {
    type: String,
    default: '',
  },
  customButtons: {
    type: Array as () => Array<{
      text: string
      action: string
      class?: string
    }>,
    default: () => [],
  },
  progressCurrent: {
    type: Number,
    default: 0,
  },
  progressTotal: {
    type: Number,
    default: 0,
  },
  showProgress: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['confirm', 'cancel', 'customAction'])
const selectedItems = ref<Glyph[]>([])
const dialogRef = ref<HTMLElement | null>(null)
const titleId = `dialog-title-${useId()}`
const messageId = `dialog-message-${useId()}`
let previouslyFocused: HTMLElement | null = null
let dialogIsRegistered = false

const registerDialog = (): void => {
  if (dialogIsRegistered) return
  dialogIsRegistered = true
  previouslyFocused = document.activeElement as HTMLElement | null
  acquireOverlayLock()
  void nextTick(() => {
    const firstControl = dialogRef.value?.querySelector<HTMLElement>(
      'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])',
    )
    ;(firstControl ?? dialogRef.value)?.focus()
  })
}

const unregisterDialog = (): void => {
  if (!dialogIsRegistered) return
  dialogIsRegistered = false
  releaseOverlayLock()
  previouslyFocused?.focus()
  previouslyFocused = null
}

watch(
  () => props.show,
  (show) => {
    selectedItems.value = []
    if (show) registerDialog()
    else unregisterDialog()
  },
  { immediate: true },
)

onBeforeUnmount(unregisterDialog)

const confirmText = computed(() => props.confirmText || $t('dialog.confirm'))
const cancelText = computed(() => props.cancelText || $t('dialog.cancel'))

const isAllSelected = computed(() => {
  return (
    props.items.length > 0 && selectedItems.value.length === props.items.length
  )
})

const progressPercentage = computed(() => {
  if (props.progressTotal === 0) return 0
  return Math.round((props.progressCurrent / props.progressTotal) * 100)
})

const toggleSelectAll = () => {
  if (isAllSelected.value) {
    selectedItems.value = []
  } else {
    selectedItems.value = [...props.items]
  }
}

const handleConfirm = () => {
  emit('confirm', props.type === 'list' ? selectedItems.value : undefined)
  selectedItems.value = []
}

const handleCancel = () => {
  emit('cancel')
  selectedItems.value = []
}

const handleCustomButton = (action: string) => {
  emit('customAction', action)
  selectedItems.value = []
}

const handleDialogKeydown = (event: KeyboardEvent): void => {
  if (event.key === 'Escape') {
    event.preventDefault()
    if (props.showCancel) handleCancel()
    else handleConfirm()
    return
  }
  if (event.key !== 'Tab' || !dialogRef.value) return
  const focusable = Array.from(
    dialogRef.value.querySelectorAll<HTMLElement>(
      'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [href], [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((element) => element.offsetParent !== null)
  if (focusable.length === 0) {
    event.preventDefault()
    dialogRef.value.focus()
    return
  }
  const first = focusable[0]!
  const last = focusable[focusable.length - 1]!
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first.focus()
  }
}
</script>

<style scoped>
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--modal-overlay);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: max(12px, env(safe-area-inset-top))
    max(12px, env(safe-area-inset-right)) max(12px, env(safe-area-inset-bottom))
    max(12px, env(safe-area-inset-left));
  pointer-events: auto;
}

.dialog-box {
  background: var(--dialog-background);
  border: 1px solid var(--dialog-border);
  border-radius: 8px;
  padding: 20px;
  width: min(800px, 100%);
  max-height: calc(
    100dvh - max(24px, env(safe-area-inset-top)) -
      max(24px, env(safe-area-inset-bottom))
  );
  display: flex;
  flex-direction: column;
  box-shadow: 0 2px 12px var(--modal-shadow);
  pointer-events: auto;
}

.dialog-title {
  margin: 0 0 16px 0;
  color: var(--text-color);
  font-size: 1.2rem;
}

.dialog-content {
  margin-bottom: 20px;
  color: var(--text-color);
  overflow: auto;
  overscroll-behavior: contain;
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  flex: 0 0 auto;
  padding-top: 0.5rem;
  background: var(--dialog-background);
}

.conflict-list {
  max-height: 400px;
  overflow-y: auto;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  padding: 12px;
  margin: 12px 0;
  background: var(--glyph-card-background);
}

.select-all-row {
  padding: 8px 0;
  margin-bottom: 8px;
  border-bottom: 1px solid var(--border-color);
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
}

.conflict-items-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
  width: 100%;
}

.conflict-item {
  padding: 8px;
  background: var(--glyph-card-background);
  border: 1px solid var(--glyph-card-border);
  border-radius: 4px;
  transition: background-color 0.2s;
}

.conflict-item:hover {
  background-color: var(--glyph-preview-hover);
}

.item-details {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex: 1;
  min-width: 0;
}

.code-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.code-point {
  font-family: var(--monospace-font);
  color: var(--text-secondary);
}

.hex-value {
  font-size: 0.9em;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.glyph-preview {
  flex-shrink: 0;
  font-size: 1.5em;
  padding: 4px;
  background: var(--glyph-preview-background);
  border: 1px solid var(--glyph-preview-border);
  border-radius: 4px;
  min-width: 40px;
  text-align: center;
  margin-left: 8px;
}

.btn-primary,
.btn-secondary,
.btn-danger {
  font-weight: bold;
  padding: 8px 16px;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.btn-primary {
  background: var(--primary-color);
}

.btn-secondary {
  background: var(--grey-color);
}

.btn-danger {
  background: var(--danger-color);
}

.dialog-title {
  color: var(--text-color);
}

[data-theme='dark'] .btn-secondary {
  background: var(--background-active);
  color: var(--text-color);
}

[data-theme='dark'] .conflict-item {
  border-color: var(--glyph-card-border);
}

[data-theme='dark'] input[type='checkbox'] {
  background-color: var(--checkbox-background);
  border-color: var(--checkbox-border);
}

[data-theme='dark'] input[type='checkbox']:checked {
  background-color: var(--checkbox-checked);
}

@media (min-width: 1025px) {
  .dialog-box {
    padding: 24px;
  }

  .conflict-items-container {
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  }

  .conflict-list {
    max-height: 70vh;
  }
}

@media (min-width: 481px) and (max-width: 1024px) {
  input[type='checkbox'] {
    transform: scale(1.8);
    transform-origin: 0 0;
  }

  .item-details {
    margin-left: 8px;
  }

  .dialog-box {
    padding: 28px;
  }

  .dialog-title {
    font-size: 2rem;
    margin-bottom: 20px;
  }

  .dialog-content {
    font-size: 1.5rem;
  }

  .conflict-items-container {
    grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
    gap: 16px;
  }

  .conflict-list {
    max-height: 65vh;
    padding: 16px;
  }

  .conflict-item {
    padding: 12px;
  }

  .glyph-preview {
    font-size: 1.8em;
    min-width: 60px;
  }

  .btn-primary,
  .btn-secondary,
  .btn-danger {
    padding: 10px 24px;
    font-size: 1.5rem;
  }

  .checkbox-label {
    gap: 16px;
  }

  .select-all-row {
    padding: 12px 0;
    margin-bottom: 12px;
  }

  .code-point,
  .hex-value {
    font-size: 1.5rem;
  }
}

@media (max-width: 480px) {
  .dialog-overlay {
    padding: 16px;
  }

  .dialog-box {
    padding: 16px;
    margin: 16px;
    width: 95%;
  }

  .dialog-title {
    font-size: 1.3rem;
  }

  .dialog-actions {
    flex-direction: column-reverse;
    gap: 12px;
  }

  .btn-primary,
  .btn-secondary,
  .btn-danger {
    font-size: 1.1rem;
    width: 100%;
    padding: 8px 12px;
  }

  .conflict-list {
    padding: 8px;
    margin: 8px 0;
    max-height: 70vh;
  }

  .checkbox-label {
    gap: 8px;
  }

  .glyph-preview {
    font-size: 1.3em;
    min-width: 32px;
  }
}

.glyph-preview-section {
  margin: 16px 0;
  padding: 16px;
  background: var(--background-light);
  border-radius: 8px;
  border: 1px solid var(--border-color);
}

.progress-section {
  margin: 16px 0;
  padding: 16px;
  background: var(--background-light);
  border-radius: 8px;
  border: 1px solid var(--border-color);
}

.progress-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  font-family: var(--monospace-font);
  font-size: 0.9em;
  color: var(--text-secondary);
}

.progress-bar {
  width: 100%;
  height: 20px;
  background: var(--glyph-card-background);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: var(--primary-color);
  border-radius: 10px;
  transition: width 0.3s ease;
  min-width: 2px;
}

[data-theme='dark'] .progress-bar {
  background: var(--glyph-card-background);
  border-color: var(--glyph-card-border);
}

[data-theme='dark'] .progress-fill {
  background: var(--primary-color);
}

.glyph-preview-container {
  display: flex;
  justify-content: center;
  margin-bottom: 12px;
  padding: 8px;
  background: white;
  border-radius: 4px;
  border: 1px solid var(--border-color);
}

.glyph-info {
  text-align: center;
  font-family: var(--monospace-font);
}

.hex-label {
  color: var(--text-secondary);
  font-size: 0.9em;
}

.hex-display {
  color: var(--text-color);
  font-weight: 600;
  word-break: break-all;
  margin-left: 8px;
}

@media (orientation: portrait) and (max-width: 767px) {
  .glyph-preview-section {
    margin: 12px 0;
    padding: 12px;
  }

  .progress-section {
    margin: 12px 0;
    padding: 12px;
  }

  .progress-info {
    font-size: 0.8em;
    margin-bottom: 8px;
  }

  .progress-bar {
    height: 16px;
  }

  .glyph-info {
    font-size: 0.9em;
  }

  .hex-display {
    margin-left: 4px;
  }
}
</style>
