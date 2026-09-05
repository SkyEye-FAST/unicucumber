<template>
  <article
    class="composition-layer tw:grid tw:gap-2 tw:p-2"
    :class="{ selected, 'layer-hidden': !layer.visible }"
  >
    <div class="tw:flex tw:min-w-0 tw:items-center tw:gap-2">
      <button
        type="button"
        class="layer-select tw:grid tw:min-w-0 tw:flex-1 tw:gap-[0.2rem] tw:p-1 tw:text-left"
        :data-testid="`composition-layer-${layer.id}-select`"
        :aria-label="$t('composition.select_layer', { name: layer.name })"
        :aria-pressed="selected"
        @click="$emit('select')"
      >
        <span class="layer-name tw:truncate tw:font-[650]">{{
          layer.name
        }}</span>
        <span class="tw:text-[0.75rem] tw:text-muted tw:tabular-nums">
          {{ layer.offsetX }}, {{ layer.offsetY }}
        </span>
      </button>

      <div class="tw:flex tw:flex-none tw:gap-1">
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

    <label
      class="layer-operation tw:grid tw:gap-1 tw:text-[0.8rem] tw:text-muted"
    >
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
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  background: var(--background-color);
}

.composition-layer.selected {
  border-color: var(--primary-color);
  background: var(--background-hover);
}

.composition-layer.layer-hidden .layer-name {
  color: var(--text-secondary);
}

.layer-select {
  color: inherit;
  background: none;
  border: 0;
  cursor: pointer;
}

.layer-operation select {
  min-height: var(--control-height-compact);
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

@media (max-width: 719px) {
  .layer-action {
    width: var(--control-height);
    min-width: var(--control-height);
    min-height: var(--control-height);
  }
}
</style>
