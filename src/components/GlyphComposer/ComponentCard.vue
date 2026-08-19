<template>
  <button
    type="button"
    class="component-card"
    :data-testid="`composition-component-${component.id}`"
    :aria-label="
      $t('composition.component_add', {
        characters: displayCharacters,
      })
    "
    @click="$emit('select')"
  >
    <svg
      class="component-preview"
      :data-testid="`composition-component-${component.id}-preview`"
      viewBox="0 0 16 16"
      shape-rendering="crispEdges"
      aria-hidden="true"
    >
      <rect class="component-preview-background" width="16" height="16" />
      <rect
        v-for="pixel in previewPixels"
        :key="`${pixel.x}-${pixel.y}`"
        class="component-preview-pixel"
        :x="pixel.x"
        :y="pixel.y"
        width="1"
        height="1"
      />
    </svg>
    <span class="component-copy">
      <span class="component-characters">{{ displayCharacters }}</span>
      <span class="component-id">{{ component.id }}</span>
      <span class="component-bounds">
        {{
          $t('composition.component_bounds', {
            bounds: component.bounds.join(', '),
          })
        }}
      </span>
    </span>
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import type { CompositionComponentRecord } from '@/types/composition'
import { hexToGrid } from '@/utils/hexUtils'

const props = defineProps<{
  component: CompositionComponentRecord
}>()

defineEmits<{
  select: []
}>()

const { t: $t } = useI18n()
const displayCharacters = computed(() => props.component.characters.join(' / '))
const previewPixels = computed(() => {
  const grid = hexToGrid(props.component.hex)
  if (grid === null) return []
  return grid.flatMap((row, y) =>
    row.flatMap((cell, x) => (cell === 1 ? [{ x, y }] : [])),
  )
})
</script>

<style scoped>
.component-card {
  display: grid;
  grid-template-columns: 3.5rem minmax(0, 1fr);
  align-items: center;
  gap: var(--space-3);
  width: 100%;
  padding: var(--space-3);
  color: inherit;
  text-align: left;
  background: var(--background-light);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  cursor: pointer;
}

.component-card:hover:not(:disabled),
.component-card:focus-visible {
  border-color: var(--primary-color);
}

.component-preview {
  box-sizing: border-box;
  display: block;
  width: 3.5rem;
  aspect-ratio: 1;
  color: var(--glyph-foreground-color);
  border: 1px solid var(--glyph-preview-border);
  border-radius: var(--radius-sm);
}

.component-preview-background {
  fill: var(--glyph-preview-background);
}

.component-preview-pixel {
  fill: currentColor;
}

.component-copy {
  display: grid;
  gap: 0.2rem;
  min-width: 0;
}

.component-characters {
  font-size: 1.2rem;
  font-weight: 650;
}

.component-id,
.component-bounds {
  overflow-wrap: anywhere;
  color: var(--text-secondary);
  font-size: 0.75rem;
}

.component-id {
  font-variant-numeric: tabular-nums;
}
</style>
