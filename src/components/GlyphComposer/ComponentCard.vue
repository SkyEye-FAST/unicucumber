<template>
  <button
    type="button"
    class="component-card"
    :data-testid="`composition-component-${component.id}`"
    :disabled="loading"
    :aria-label="
      $t('composition.component_add', {
        characters: displayCharacters,
      })
    "
    @click="$emit('select')"
  >
    <span class="component-characters">{{ displayCharacters }}</span>
    <span class="component-id">{{ component.id }}</span>
    <span class="component-bounds">
      {{
        $t('composition.component_bounds', {
          bounds: component.bounds.join(', '),
        })
      }}
    </span>
    <span v-if="loading" class="component-loading" aria-live="polite">
      {{ $t('composition.component_loading') }}
    </span>
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import type { CompositionComponentSummary } from '@/types/composition'

const props = defineProps<{
  component: CompositionComponentSummary
  loading: boolean
}>()

defineEmits<{
  select: []
}>()

const { t: $t } = useI18n()
const displayCharacters = computed(() => props.component.characters.join(' / '))
</script>

<style scoped>
.component-card {
  display: grid;
  gap: 0.2rem;
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

.component-card:disabled {
  cursor: progress;
  opacity: 0.7;
}

.component-characters {
  font-size: 1.2rem;
  font-weight: 650;
}

.component-id,
.component-bounds,
.component-loading {
  overflow-wrap: anywhere;
  color: var(--text-secondary);
  font-size: 0.75rem;
}

.component-id {
  font-variant-numeric: tabular-nums;
}
</style>
