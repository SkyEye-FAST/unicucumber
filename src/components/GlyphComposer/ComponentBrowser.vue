<template>
  <section class="component-browser" :aria-label="$t('composition.components')">
    <h3>{{ $t('composition.components') }}</h3>

    <label class="component-search">
      <span>{{ $t('composition.component_search') }}</span>
      <input
        v-model="query"
        type="search"
        :placeholder="$t('composition.component_search_placeholder')"
        @input="runSearch"
      />
    </label>

    <p v-if="searchError" class="browser-error" role="status">
      {{ $t('composition.component_search_error') }}
      <button
        type="button"
        class="ui-button ui-button--quiet"
        @click="runSearch"
      >
        {{ $t('composition.component_retry') }}
      </button>
    </p>
    <p v-else-if="loadingSearch" class="browser-status" role="status">
      {{ $t('composition.component_loading') }}
    </p>
    <p v-else-if="results.length === 0" class="browser-status">
      {{ $t('composition.component_no_results') }}
    </p>

    <div v-else class="component-results">
      <ComponentCard
        v-for="component in results"
        :key="component.id"
        :component="component"
        @select="addComponent(component)"
      />
    </div>
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import { compositionDataLoader } from '@/services/compositionDataLoader'
import type { CompositionComponentRecord } from '@/types/composition'

import ComponentCard from './ComponentCard.vue'

const MAX_VISIBLE_RESULTS = 40

const props = defineProps<{
  codePoint: string
}>()

const emit = defineEmits<{
  addComponent: [component: CompositionComponentRecord]
}>()

const { t: $t } = useI18n()
const query = ref('')
const results = ref<CompositionComponentRecord[]>([])
const loadingSearch = ref(false)
const searchError = ref(false)
let searchGeneration = 0

const runSearch = async (): Promise<void> => {
  const generation = ++searchGeneration
  loadingSearch.value = true
  searchError.value = false
  try {
    const matches = await compositionDataLoader.searchComponents(query.value)
    if (generation !== searchGeneration) return
    const visibleMatches = matches.slice(0, MAX_VISIBLE_RESULTS)
    const hydrated =
      visibleMatches.length === 0
        ? []
        : await compositionDataLoader.hydrateComponents(
            visibleMatches.map(({ id }) => id),
          )
    if (generation !== searchGeneration) return
    results.value = hydrated
  } catch {
    if (generation !== searchGeneration) return
    results.value = []
    searchError.value = true
  } finally {
    if (generation === searchGeneration) loadingSearch.value = false
  }
}

const searchCharacter = (character: string): void => {
  query.value = character
  void runSearch()
}

const addComponent = (record: CompositionComponentRecord): void => {
  emit('addComponent', record)
}

const initialize = (): void => {
  query.value = ''
  void runSearch()
}

defineExpose({ searchCharacter })

onMounted(initialize)
watch(() => props.codePoint, initialize)
</script>

<style scoped>
.component-browser {
  box-sizing: border-box;
  display: grid;
  align-content: start;
  gap: var(--space-3);
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  padding: var(--space-3);
}

.component-browser h3,
.component-browser p {
  margin: 0;
}

.component-search {
  display: grid;
  gap: 0.25rem;
  color: var(--text-secondary);
  font-size: 0.8rem;
}

.component-search input {
  box-sizing: border-box;
  width: 100%;
  min-height: var(--control-height);
  padding: 0.55rem 0.7rem;
  color: var(--text-color);
  background: var(--input-background);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
}

.component-search input:focus {
  border-color: var(--border-hover);
  outline: 2px solid color-mix(in srgb, var(--primary-color) 35%, transparent);
  outline-offset: 1px;
}

.component-results {
  overflow: auto;
}

.component-results {
  display: grid;
  gap: var(--space-2);
  min-height: 0;
}

.browser-status {
  color: var(--text-secondary);
}

.browser-error {
  display: grid;
  gap: var(--space-2);
  color: var(--danger-color, var(--text-color));
}
</style>
