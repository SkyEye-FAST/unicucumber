<template>
  <section
    class="composition-layer-panel tw:box-border tw:grid tw:h-full tw:w-full tw:min-h-0 tw:min-w-0 tw:grid-rows-[auto_minmax(0,1fr)] tw:content-start tw:gap-3 tw:overflow-hidden tw:p-3"
    :aria-label="$t('composition.layers')"
  >
    <div class="tw:flex tw:items-center tw:justify-between tw:gap-2">
      <div>
        <span
          class="tw:text-[0.7rem] tw:font-[650] tw:tracking-[0.08em] tw:text-muted tw:uppercase"
          >{{ $t('composition.layer_stack') }}</span
        >
        <h3 class="tw:m-0 tw:text-[1rem]">{{ $t('composition.layers') }}</h3>
      </div>
      <span
        class="layer-count tw:grid tw:min-h-7 tw:min-w-7 tw:place-items-center tw:text-[0.75rem] tw:text-muted tw:tabular-nums"
        >{{ layers.length }}</span
      >
    </div>
    <div
      v-if="displayLayers.length > 0"
      class="layer-list tw:grid tw:auto-rows-max tw:content-start tw:gap-2 tw:overflow-auto"
    >
      <CompositionLayerItem
        v-for="layer in displayLayers"
        :key="layer.id"
        :layer="layer"
        :selected="layer.id === selectedLayerId"
        @select="$emit('select', layer.id)"
        @set-operation="
          (operation) => $emit('setOperation', layer.id, operation)
        "
        @set-visibility="(visible) => $emit('setVisibility', layer.id, visible)"
        @set-locked="(locked) => $emit('setLocked', layer.id, locked)"
        @remove="$emit('remove', layer.id)"
      />
    </div>
    <div
      v-else
      class="layer-empty tw:grid tw:content-center tw:justify-items-center tw:gap-3 tw:px-3 tw:py-6 tw:text-center tw:text-muted"
    >
      <i-material-symbols-layers-outline
        class="tw:text-[2rem]"
        aria-hidden="true"
      />
      <p class="tw:m-0 tw:max-w-64 tw:text-[0.875rem] tw:leading-[1.5]">
        {{ $t('composition.empty_layers') }}
      </p>
      <button
        type="button"
        class="ui-button ui-button--primary tw:w-max tw:max-w-full"
        @click="$emit('addBlank')"
      >
        <i-material-symbols-add aria-hidden="true" />
        <span>{{ $t('composition.add_first_layer') }}</span>
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import type {
  CompositionLayer,
  CompositionOperation,
} from '@/types/composition'

import CompositionLayerItem from './CompositionLayerItem.vue'

const props = defineProps<{
  layers: CompositionLayer[]
  selectedLayerId: string | null
}>()

defineEmits<{
  select: [layerId: string]
  setOperation: [layerId: string, operation: CompositionOperation]
  setVisibility: [layerId: string, visible: boolean]
  setLocked: [layerId: string, locked: boolean]
  remove: [layerId: string]
  addBlank: []
}>()

const { t: $t } = useI18n()
const displayLayers = computed(() => [...props.layers].reverse())
</script>

<style scoped>
.layer-count {
  background: var(--background-hover);
  border-radius: 999px;
}

.layer-empty {
  border: 1px dashed var(--border-color);
  border-radius: var(--radius-md);
}

@media (max-width: 719px) {
  .layer-empty {
    align-self: center;
    padding: var(--space-5) var(--space-3);
    border: 0;
  }

  .layer-empty .ui-button {
    display: none;
  }
}
</style>
