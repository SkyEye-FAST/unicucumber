<template>
  <div v-if="show" class="dialog-overlay">
    <div class="dialog-box" :style="{ maxWidth: dialogMaxWidth }">
      <h3 class="dialog-title">{{ title }}</h3>
      <div class="dialog-content">
        <p>{{ message }}</p>
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
                <input type="checkbox" v-model="selectedItems" :value="item" />
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
        <button v-if="showCancel" @click="handleCancel" class="btn-secondary">
          {{ cancelText }}
        </button>
        <button
          @click="handleConfirm"
          :class="{ 'btn-primary': !danger, 'btn-danger': danger }"
        >
          {{ confirmText }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'

const { t: $t } = useI18n()

const props = defineProps({
  show: Boolean,
  title: String,
  message: String,
  type: {
    type: String,
    default: 'alert', // 'alert', 'confirm', 'list'
  },
  items: {
    type: Array,
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
})

const emit = defineEmits(['confirm', 'cancel'])
const selectedItems = ref([])

const confirmText = computed(() => props.confirmText || $t('dialog.confirm'))
const cancelText = computed(() => props.cancelText || $t('dialog.cancel'))

const isAllSelected = computed(() => {
  return (
    props.items.length > 0 && selectedItems.value.length === props.items.length
  )
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

const dialogMaxWidth = computed(() => {
  const viewportWidth = window.innerWidth
  if (viewportWidth <= 480) return '95%'
  if (viewportWidth <= 1024) return '90%'
  return '800px'
})
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
  padding: 20px;
}

.dialog-box {
  background: var(--dialog-background);
  border: 1px solid var(--dialog-border);
  border-radius: 8px;
  padding: 20px;
  width: 100%;
  box-shadow: 0 2px 12px var(--modal-shadow);
}

.dialog-title {
  margin: 0 0 16px 0;
  color: var(--text-color);
  font-size: 1.2rem;
}

.dialog-content {
  margin-bottom: 20px;
  color: var(--text-color);
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
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
  font-family: monospace;
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
</style>
