<template>
  <article
    class="composition-layer"
    :class="{ selected, 'layer-hidden': !layer.visible }"
  >
    <div class="layer-heading">
      <button
        type="button"
        class="layer-select"
        :data-testid="`composition-layer-${layer.id}-select`"
        :aria-label="$t('composition.select_layer', { name: layer.name })"
        :aria-pressed="selected"
        @click="$emit('select')"
      >
        <span class="layer-name">{{ layer.name }}</span>
        <span class="layer-offset">
          {{ layer.offsetX }}, {{ layer.offsetY }}
        </span>
      </button>

      <div class="layer-actions">
        <button
          type="button"
          class="ui-icon-button layer-action"
          :data-testid="`composition-layer-${layer.id}-visibility`"
          :aria-label="
            $t(
              layer.visible
                ? 'composition.hide_layer'
                : 'composition.show_layer',
              { name: layer.name },
            )
          "
          @click="$emit('setVisibility', !layer.visible)"
        >
          <i-material-symbols-visibility-outline
            v-if="layer.visible"
            aria-hidden="true"
          />
          <i-material-symbols-visibility-off-outline
            v-else
            aria-hidden="true"
          />
        </button>
        <button
          type="button"
          class="ui-icon-button layer-action"
          :data-testid="`composition-layer-${layer.id}-lock`"
          :aria-label="
            $t(
              layer.locked
                ? 'composition.unlock_layer'
                : 'composition.lock_layer',
              { name: layer.name },
            )
          "
          @click="$emit('setLocked', !layer.locked)"
        >
          <i-material-symbols-lock-outline
            v-if="layer.locked"
            aria-hidden="true"
          />
          <i-material-symbols-lock-open-outline v-else aria-hidden="true" />
        </button>
        <button
          type="button"
          class="ui-icon-button layer-action layer-delete"
          :data-testid="`composition-layer-${layer.id}-delete`"
          :aria-label="$t('composition.delete_layer', { name: layer.name })"
          :disabled="layer.locked"
          @click="$emit('remove')"
        >
          <i-material-symbols-delete-outline aria-hidden="true" />
        </button>
      </div>
    </div>

    <label class="layer-operation">
      <span>{{ $t('composition.operation') }}</span>
      <select
        :value="layer.operation"
        :disabled="layer.locked"
        :data-testid="`composition-layer-${layer.id}-operation`"
        @change="handleOperationChange"
      >
        <option value="add">{{ $t('composition.operation_add') }}</option>
        <option value="subtract">
          {{ $t('composition.operation_subtract') }}
        </option>
        <option value="intersect">
          {{ $t('composition.operation_intersect') }}
        </option>
      </select>
    </label>
  </article>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'

import type {
  CompositionLayer,
  CompositionOperation,
} from '@/types/composition'

defineProps<{
  layer: CompositionLayer
  selected: boolean
}>()

const emit = defineEmits<{
  select: []
  setOperation: [operation: CompositionOperation]
  setVisibility: [visible: boolean]
  setLocked: [locked: boolean]
  remove: []
}>()

const { t: $t } = useI18n()

const handleOperationChange = (event: Event): void => {
  const target = event.target
  if (!(target instanceof HTMLSelectElement)) return
  emit('setOperation', target.value as CompositionOperation)
}
</script>

<style scoped>
.composition-layer {
  display: grid;
  gap: var(--space-2);
  padding: var(--space-2);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  background: var(--background-color);
}

.composition-layer.selected {
  border-color: var(--primary-color);
  background: var(--background-hover);
  box-shadow: inset 0.2rem 0 0 var(--primary-color);
}

.composition-layer.layer-hidden .layer-name {
  color: var(--text-secondary);
}

.layer-heading {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  min-width: 0;
}

.layer-select {
  display: grid;
  flex: 1;
  gap: 0.2rem;
  min-width: 0;
  padding: var(--space-1);
  color: inherit;
  text-align: left;
  background: none;
  border: 0;
  cursor: pointer;
}

.layer-name {
  overflow: hidden;
  font-weight: 650;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.layer-offset {
  color: var(--text-secondary);
  font-size: 0.75rem;
  font-variant-numeric: tabular-nums;
}

.layer-operation {
  display: grid;
  gap: 0.25rem;
  color: var(--text-secondary);
  font-size: 0.8rem;
}

.layer-operation select {
  min-height: var(--control-height-compact);
}

.layer-actions {
  display: flex;
  flex: none;
  gap: var(--space-1);
}

.layer-action {
  width: var(--control-height-compact);
  min-width: var(--control-height-compact);
  min-height: var(--control-height-compact);
  color: var(--text-secondary);
  background: transparent;
}

.layer-action:hover:not(:disabled),
.layer-action:focus-visible {
  color: var(--text-color);
}

.layer-delete:hover:not(:disabled),
.layer-delete:focus-visible {
  color: var(--danger-color);
}
</style>
