<template>
  <details class="shortcut-settings">
    <summary class="shortcut-summary">
      <span class="shortcut-summary-title">{{ $t('shortcuts.title') }}</span>
      <i-material-symbols-keyboard-arrow-down
        class="shortcut-summary-chevron"
        aria-hidden="true"
      />
    </summary>
    <div class="shortcut-body">
      <p class="shortcut-help">{{ $t('shortcuts.help') }}</p>
      <p role="status" aria-live="polite" class="shortcut-message">
        {{ message }}
      </p>
      <div v-for="action in shortcutActions" :key="action" class="shortcut-row">
        <label :for="`shortcut-${action}`">{{
          $t(shortcutDefinitions[action].label)
        }}</label>
        <div class="shortcut-input-group">
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
            class="ui-icon-button shortcut-clear"
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
      </div>
      <button
        type="button"
        class="ui-button ui-button--quiet shortcut-reset"
        @click="reset"
      >
        <i-material-symbols-restart-alt
          class="shortcut-icon"
          aria-hidden="true"
        />
        {{ $t('shortcuts.reset') }}
      </button>
    </div>
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
  min-width: 0;
  margin: 0;
  padding: var(--space-4) 0;
  border: 0;
  border-bottom: 1px solid var(--border-color);
}

.shortcut-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  cursor: pointer;
  padding: var(--space-1) 0;
  color: var(--text-color);
  font-size: 0.9375rem;
  font-weight: 750;
  line-height: 1.25;
  user-select: none;
  list-style: none;
}

.shortcut-summary::-webkit-details-marker {
  display: none;
}

.shortcut-summary-chevron {
  flex: none;
  font-size: 1.25rem;
  color: var(--text-secondary);
  transition: transform 200ms cubic-bezier(0.2, 0.8, 0.2, 1);
}

.shortcut-settings[open] .shortcut-summary-chevron {
  transform: rotate(180deg);
}

.shortcut-body {
  padding-top: var(--space-2);
}

.shortcut-help {
  margin: 0 0 var(--space-2);
  color: var(--text-secondary);
  font-size: 0.8125rem;
  line-height: 1.45;
}

.shortcut-message {
  min-height: 1.25rem;
  margin: 0 0 var(--space-2);
  color: var(--primary-color);
  font-size: 0.8125rem;
  font-weight: 600;
  line-height: 1.4;
}

.shortcut-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-1) 0;
}

.shortcut-row label {
  color: var(--text-color);
  font-size: 0.8125rem;
  font-weight: 600;
  overflow-wrap: anywhere;
}

.shortcut-input-group {
  display: flex;
  align-items: center;
  gap: var(--space-1);
}

.shortcut-row input {
  box-sizing: border-box;
  width: 9rem;
  min-height: var(--control-height-compact);
  padding: 0.25rem 0.5rem;
  border: 1px solid var(--input-border);
  border-radius: var(--radius-sm);
  background: var(--input-background);
  color: var(--text-color);
  font-family: var(--monospace-font);
  font-size: 0.8125rem;
  font-weight: 600;
  text-align: center;
  letter-spacing: 0.04em;
  transition:
    border-color 150ms ease,
    box-shadow 150ms ease;
}

.shortcut-row input:focus {
  border-color: var(--primary-color);
}

.shortcut-row input:focus-visible {
  outline: 2px solid var(--focus-ring);
  outline-offset: 1px;
}

.shortcut-clear {
  flex: none;
  width: var(--control-height-compact);
  height: var(--control-height-compact);
}

.shortcut-reset {
  width: 100%;
  margin-top: var(--space-3);
  min-height: var(--control-height);
  justify-content: center;
  gap: var(--space-1);
  font-size: 0.8125rem;
}

.shortcut-icon {
  font-size: 1.15rem;
}

@media (max-width: 520px) {
  .shortcut-row {
    grid-template-columns: 1fr;
    gap: 0.35rem;
    padding: var(--space-2) 0;
    border-bottom: 1px dashed
      color-mix(in srgb, var(--border-color) 50%, transparent);
  }

  .shortcut-row:last-of-type {
    border-bottom: none;
  }

  .shortcut-row label {
    font-size: 0.8125rem;
    font-weight: 650;
  }

  .shortcut-input-group {
    display: grid;
    grid-template-columns: minmax(0, 1fr) var(--control-height);
    gap: var(--space-2);
  }

  .shortcut-row input {
    width: 100%;
    min-height: var(--control-height);
    font-size: 0.85rem;
  }

  .shortcut-clear {
    width: var(--control-height);
    height: var(--control-height);
  }
}
</style>
