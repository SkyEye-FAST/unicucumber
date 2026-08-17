<template>
  <section
    class="composition-layer-panel"
    :aria-label="$t('composition.layers')"
  >
    <div class="layer-panel-heading">
      <div>
        <span class="panel-eyebrow">{{ $t('composition.layer_stack') }}</span>
        <h3>{{ $t('composition.layers') }}</h3>
      </div>
      <span class="layer-count">{{ layers.length }}</span>
    </div>
    <div v-if="displayLayers.length > 0" class="layer-list">
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
    <div v-else class="layer-empty">
      <i-material-symbols-layers-outline aria-hidden="true" />
      <p>{{ $t('composition.empty_layers') }}</p>
      <button type="button" class="ui-button" @click="$emit('addBlank')">
        {{ $t('composition.add_first_layer') }}
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
.composition-layer-panel {
  display: grid;
  align-content: start;
  gap: var(--space-3);
  min-width: 0;
}

.composition-layer-panel h3 {
  margin: 0;
  font-size: 1rem;
}

.layer-panel-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
}

.panel-eyebrow {
  color: var(--text-secondary);
  font-size: 0.7rem;
  font-weight: 650;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.layer-count {
  display: grid;
  min-width: 1.75rem;
  min-height: 1.75rem;
  place-items: center;
  color: var(--text-secondary);
  font-size: 0.75rem;
  font-variant-numeric: tabular-nums;
  background: var(--background-hover);
  border-radius: 999px;
}

.layer-list {
  display: grid;
  gap: var(--space-2);
  overflow: auto;
}

.layer-empty {
  display: grid;
  justify-items: center;
  gap: var(--space-3);
  padding: var(--space-6) var(--space-3);
  color: var(--text-secondary);
  text-align: center;
  border: 1px dashed var(--border-color);
  border-radius: var(--radius-md);
}

.layer-empty > svg {
  font-size: 2rem;
}

.layer-empty p {
  max-width: 16rem;
  margin: 0;
  font-size: 0.875rem;
  line-height: 1.5;
}
</style>
