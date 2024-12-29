<template>
  <div v-if="show" class="dialog-overlay">
    <div class="dialog-box">
      <h3 class="dialog-title">{{ title }}</h3>
      <div class="dialog-content">
        <p>{{ message }}</p>
        <div v-if="type === 'list'" class="conflict-list">
          <div class="select-all-row">
            <label>
              <input
                type="checkbox"
                :checked="isAllSelected"
                @change="toggleSelectAll"
              />
              {{ $t('dialog.select_all') }}
            </label>
          </div>
          <div
            v-for="item in items"
            :key="item.codePoint"
            class="conflict-item"
          >
            <label>
              <input type="checkbox" v-model="selectedItems" :value="item" />
              U+{{ item.codePoint }}: {{ item.hexValue }}
            </label>
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
</script>

<style scoped>
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.dialog-box {
  background: white;
  border-radius: 8px;
  padding: 20px;
  min-width: 300px;
  max-width: 500px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
}

.dialog-title {
  margin: 0 0 16px 0;
  color: var(--text-color);
  font-size: 1.2rem;
}

.dialog-content {
  margin-bottom: 20px;
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.conflict-list {
  max-height: 200px;
  overflow-y: auto;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  padding: 8px;
  margin: 8px 0;
}

.conflict-item {
  padding: 4px 0;
}

.btn-primary {
  padding: 8px 16px;
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.btn-secondary {
  padding: 8px 16px;
  background: var(--grey-color);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.btn-danger {
  padding: 8px 16px;
  background: var(--danger-color);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}
</style>
