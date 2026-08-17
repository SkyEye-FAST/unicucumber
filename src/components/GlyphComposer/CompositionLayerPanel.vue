<template>
  <section
    class="composition-layer-panel"
    :aria-label="$t('composition.layers')"
  >
    <h3>{{ $t('composition.layers') }}</h3>
    <div class="layer-list">
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
      />
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

.layer-list {
  display: grid;
  gap: var(--space-2);
  overflow: auto;
}
</style>
