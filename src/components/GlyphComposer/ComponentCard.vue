<template>
  <button
    type="button"
    class="component-card tw:grid tw:w-full tw:grid-cols-[3.5rem_minmax(0,1fr)] tw:items-center tw:gap-3 tw:p-3 tw:text-left"
    :data-testid="`composition-component-${component.id}`"
    :aria-label="
      $t('composition.component_add', {
        characters: displayCharacters,
      })
    "
    @click="$emit('select')"
  >
    <svg
      class="component-preview tw:box-border tw:block tw:aspect-square tw:w-14 tw:text-glyph"
      :data-testid="`composition-component-${component.id}-preview`"
      viewBox="0 0 16 16"
      shape-rendering="crispEdges"
      aria-hidden="true"
    >
      <rect class="tw:fill-glyph-background" width="16" height="16" />
      <rect
        v-for="pixel in previewPixels"
        :key="`${pixel.x}-${pixel.y}`"
        class="component-preview-pixel tw:fill-current"
        :x="pixel.x"
        :y="pixel.y"
        width="1"
        height="1"
      />
    </svg>
    <span class="tw:grid tw:min-w-0 tw:gap-[0.2rem]">
      <span class="tw:text-[1.2rem] tw:font-[650]">{{
        displayCharacters
      }}</span>
      <span
        class="tw:wrap-anywhere tw:text-[0.75rem] tw:text-muted tw:tabular-nums"
        >{{ component.id }}</span
      >
      <span class="tw:wrap-anywhere tw:text-[0.75rem] tw:text-muted">
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
  color: inherit;
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
  border: 1px solid var(--glyph-preview-border);
  border-radius: var(--radius-sm);
}
</style>
