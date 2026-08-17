<template>
  <article class="composition-layer" :class="{ selected }">
    <button
      type="button"
      class="layer-select"
      :data-testid="`composition-layer-${layer.id}-select`"
      :aria-label="$t('composition.select_layer', { name: layer.name })"
      :aria-pressed="selected"
      @click="$emit('select')"
    >
      <span class="layer-name">{{ layer.name }}</span>
      <span class="layer-offset">{{ layer.offsetX }}, {{ layer.offsetY }}</span>
    </button>

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

    <div class="layer-actions">
      <button
        type="button"
        class="ui-button ui-button--quiet"
        :data-testid="`composition-layer-${layer.id}-visibility`"
        :aria-label="
          $t(
            layer.visible ? 'composition.hide_layer' : 'composition.show_layer',
            { name: layer.name },
          )
        "
        @click="$emit('setVisibility', !layer.visible)"
      >
        {{ layer.visible ? $t('composition.hide') : $t('composition.show') }}
      </button>
      <button
        type="button"
        class="ui-button ui-button--quiet"
        :aria-label="
          $t(
            layer.locked
              ? 'composition.unlock_layer'
              : 'composition.lock_layer',
            {
              name: layer.name,
            },
          )
        "
        @click="$emit('setLocked', !layer.locked)"
      >
        {{ layer.locked ? $t('composition.unlock') : $t('composition.lock') }}
      </button>
    </div>
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
  padding: var(--space-3);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  background: var(--background-light);
}

.composition-layer.selected {
  border-color: var(--primary-color);
}

.layer-select {
  display: flex;
  justify-content: space-between;
  gap: var(--space-2);
  width: 100%;
  padding: 0;
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
  font-variant-numeric: tabular-nums;
}

.layer-operation {
  display: grid;
  gap: 0.25rem;
  color: var(--text-secondary);
  font-size: 0.8rem;
}

.layer-operation select {
  min-height: var(--control-height);
}

.layer-actions {
  display: flex;
  gap: var(--space-2);
}
</style>
