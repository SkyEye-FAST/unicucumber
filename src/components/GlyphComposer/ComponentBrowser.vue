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

    <div v-if="idsNodes.length > 0 || idsError" class="ids-section">
      <h4>{{ $t('composition.ids') }}</h4>
      <p v-if="idsError" class="browser-error" role="status">
        {{ $t('composition.ids_error') }}
        <button
          type="button"
          class="ui-button ui-button--quiet"
          @click="loadIds"
        >
          {{ $t('composition.ids_retry') }}
        </button>
      </p>
      <div v-else class="ids-list">
        <div
          v-for="item in idsNodes"
          :key="item.expression"
          class="ids-expression"
        >
          <IdsTree :node="item.node" @select-character="searchCharacter" />
        </div>
      </div>
    </div>

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
        :loading="loadingComponentId === component.id"
        @select="addComponent(component)"
      />
    </div>

    <p v-if="componentError" class="browser-error" role="status">
      {{ $t('composition.component_load_error') }}
    </p>
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import { compositionDataLoader } from '@/services/compositionDataLoader'
import type {
  CompositionComponentRecord,
  CompositionComponentSummary,
} from '@/types/composition'
import { parseIds, type IdsNode } from '@/utils/ids'

import ComponentCard from './ComponentCard.vue'
import IdsTree from './IdsTree.vue'

const MAX_VISIBLE_RESULTS = 40

const props = defineProps<{
  codePoint: string
}>()

const emit = defineEmits<{
  addComponent: [component: CompositionComponentRecord]
}>()

const { t: $t } = useI18n()
const query = ref('')
const results = ref<CompositionComponentSummary[]>([])
const idsNodes = ref<Array<{ expression: string; node: IdsNode }>>([])
const loadingSearch = ref(false)
const loadingComponentId = ref<string | null>(null)
const searchError = ref(false)
const idsError = ref(false)
const componentError = ref(false)
let searchGeneration = 0

const currentCodePoint = (): number | null => {
  const value = Number.parseInt(props.codePoint, 16)
  return Number.isInteger(value) && value >= 0 && value <= 0x10ffff
    ? value
    : null
}

const currentCharacter = (): string => {
  const codePoint = currentCodePoint()
  if (codePoint === null || (codePoint >= 0xd800 && codePoint <= 0xdfff))
    return ''
  return String.fromCodePoint(codePoint)
}

const runSearch = async (): Promise<void> => {
  const generation = ++searchGeneration
  loadingSearch.value = true
  searchError.value = false
  componentError.value = false
  try {
    const matches = await compositionDataLoader.searchComponents(query.value)
    if (generation !== searchGeneration) return
    results.value = matches.slice(0, MAX_VISIBLE_RESULTS)
  } catch {
    if (generation !== searchGeneration) return
    results.value = []
    searchError.value = true
  } finally {
    if (generation === searchGeneration) loadingSearch.value = false
  }
}

const loadIds = async (): Promise<void> => {
  const codePoint = currentCodePoint()
  idsNodes.value = []
  idsError.value = false
  if (codePoint === null) return
  try {
    const expressions =
      await compositionDataLoader.loadIdsForCodePoint(codePoint)
    idsNodes.value = expressions.flatMap((expression) => {
      const node = parseIds(expression)
      return node === null ? [] : [{ expression, node }]
    })
  } catch {
    idsError.value = true
  }
}

const searchCharacter = (character: string): void => {
  query.value = character
  void runSearch()
}

const addComponent = async (
  summary: CompositionComponentSummary,
): Promise<void> => {
  if (loadingComponentId.value !== null) return
  loadingComponentId.value = summary.id
  componentError.value = false
  try {
    const [record] = await compositionDataLoader.hydrateComponents([summary.id])
    if (record) emit('addComponent', record)
  } catch {
    componentError.value = true
  } finally {
    loadingComponentId.value = null
  }
}

const initialize = (): void => {
  query.value = currentCharacter()
  void runSearch()
  void loadIds()
}

onMounted(initialize)
watch(() => props.codePoint, initialize)
</script>

<style scoped>
.component-browser {
  display: grid;
  align-content: start;
  gap: var(--space-3);
  min-width: 0;
  min-height: 0;
  padding: var(--space-3);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
}

.component-browser h3,
.component-browser h4,
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
}

.ids-section,
.ids-list {
  display: grid;
  gap: var(--space-2);
}

.ids-list,
.component-results {
  overflow: auto;
}

.ids-expression {
  overflow-x: auto;
  padding-bottom: 0.15rem;
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
