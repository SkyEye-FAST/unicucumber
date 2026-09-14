<template>
  <details class="shortcut-settings">
    <summary>{{ $t('shortcuts.title') }}</summary>
    <p class="shortcut-help">{{ $t('shortcuts.help') }}</p>
    <p role="status" aria-live="polite" class="shortcut-message">
      {{ message }}
    </p>
    <div v-for="action in shortcutActions" :key="action" class="shortcut-row">
      <label :for="`shortcut-${action}`">{{
        $t(shortcutDefinitions[action].label)
      }}</label>
      <input
        :id="`shortcut-${action}`"
        :value="formatShortcut(modelValue[action], apple)"
        :placeholder="$t('shortcuts.unassigned')"
        readonly
        autocomplete="off"
        :aria-label="
          $t('shortcuts.input_label', {
            action: $t(shortcutDefinitions[action].label),
          })
        "
        @keydown="record(action, $event)"
      />
      <button
        type="button"
        class="ui-icon-button"
        :aria-label="
          $t('shortcuts.clear', {
            action: $t(shortcutDefinitions[action].label),
          })
        "
        :disabled="!modelValue[action].length"
        @click="setBinding(action, [])"
      >
        <i-material-symbols-close />
      </button>
    </div>
    <button type="button" class="ui-button" @click="reset">
      {{ $t('shortcuts.reset') }}
    </button>
  </details>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  createDefaultShortcuts,
  findShortcutConflict,
  formatShortcut,
  shortcutActions,
  shortcutDefinitions,
  shortcutFromEvent,
  type ShortcutAction,
  type ShortcutBindings,
} from '@/domain/shortcuts'

const props = defineProps<{ modelValue: ShortcutBindings }>()
const emit = defineEmits<{ 'update:modelValue': [value: ShortcutBindings] }>()
const { t: $t } = useI18n()
const message = ref('')
const apple =
  typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)
const setBinding = (action: ShortcutAction, keys: string[]): void => {
  emit('update:modelValue', { ...props.modelValue, [action]: keys })
  message.value = $t('shortcuts.updated', {
    action: $t(shortcutDefinitions[action].label),
  })
}
const record = (action: ShortcutAction, event: KeyboardEvent): void => {
  if (event.key === 'Tab') return
  event.stopPropagation()
  if (event.isComposing || event.keyCode === 229) return
  event.preventDefault()
  if (event.key === 'Escape') {
    ;(event.target as HTMLInputElement).blur()
    return
  }
  if (['Control', 'Meta', 'Alt', 'Shift'].includes(event.key) || event.repeat)
    return
  const binding = shortcutFromEvent(event)
  if (!binding) {
    message.value = $t('shortcuts.unsupported')
    return
  }
  const conflict = findShortcutConflict(props.modelValue, action, binding)
  if (conflict) {
    message.value = $t('shortcuts.conflict', {
      action: $t(shortcutDefinitions[conflict].label),
    })
    return
  }
  setBinding(action, [binding])
}
const reset = (): void => {
  emit('update:modelValue', createDefaultShortcuts())
  message.value = $t('shortcuts.restored')
}
</script>

<style scoped>
.shortcut-settings {
  margin-block: 1rem;
  border-block: 1px solid var(--border-color);
  padding-block: 1rem;
}
summary {
  cursor: pointer;
  font-weight: 600;
}
.shortcut-help,
.shortcut-message {
  font-size: 0.85rem;
  line-height: 1.5;
}
.shortcut-message {
  color: var(--primary-color);
}
.shortcut-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.1fr) 44px;
  align-items: center;
  gap: 0.4rem;
  margin-block: 0.5rem;
}
.shortcut-row label {
  font-size: 0.85rem;
  overflow-wrap: anywhere;
}
.shortcut-row input {
  box-sizing: border-box;
  min-width: 0;
  width: 100%;
  min-height: 44px;
  padding: 0.4rem;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  color: var(--text-color);
  background: var(--background-base);
  font: inherit;
  font-size: 0.8rem;
}
.shortcut-row input:focus-visible {
  outline: 2px solid var(--primary-color);
  outline-offset: 2px;
}
</style>
