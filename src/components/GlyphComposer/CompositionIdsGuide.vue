<template>
  <section
    class="composition-ids-guide"
    data-testid="composition-ids-guide"
    :aria-label="$t('composition.ids')"
  >
    <h4>{{ $t('composition.ids') }}</h4>
    <p v-if="idsError" class="ids-error" role="status">
      {{ $t('composition.ids_error') }}
      <button type="button" class="ui-button ui-button--quiet" @click="loadIds">
        {{ $t('composition.ids_retry') }}
      </button>
    </p>
    <p v-else-if="idsLoaded && idsNodes.length === 0" class="ids-status">
      {{ $t('composition.ids_empty') }}
    </p>
    <div v-else-if="idsNodes.length > 0" class="ids-list">
      <div
        v-for="item in idsNodes"
        :key="item.expression"
        class="ids-expression"
      >
        <IdsTree
          :node="item.node"
          @select-character="$emit('selectCharacter', $event)"
        />
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import { compositionDataLoader } from '@/services/compositionDataLoader'
import { parseIds, type IdsNode } from '@/utils/ids'

import IdsTree from './IdsTree.vue'

const props = defineProps<{
  codePoint: string
}>()

defineEmits<{
  selectCharacter: [character: string]
}>()

const { t: $t } = useI18n()
const idsNodes = ref<Array<{ expression: string; node: IdsNode }>>([])
const idsLoaded = ref(false)
const idsError = ref(false)
let idsGeneration = 0

const currentCodePoint = (): number | null => {
  const value = Number.parseInt(props.codePoint, 16)
  return Number.isInteger(value) && value >= 0 && value <= 0x10ffff
    ? value
    : null
}

const loadIds = async (): Promise<void> => {
  const generation = ++idsGeneration
  const codePoint = currentCodePoint()
  idsNodes.value = []
  idsError.value = false
  idsLoaded.value = false
  if (codePoint === null) {
    idsLoaded.value = true
    return
  }

  try {
    const expressions =
      await compositionDataLoader.loadIdsForCodePoint(codePoint)
    if (generation !== idsGeneration) return
    idsNodes.value = expressions.flatMap((expression) => {
      const node = parseIds(expression)
      return node === null ? [] : [{ expression, node }]
    })
    idsLoaded.value = true
  } catch {
    if (generation !== idsGeneration) return
    idsError.value = true
  }
}

onMounted(loadIds)
watch(() => props.codePoint, loadIds)
</script>

<style scoped>
.composition-ids-guide {
  display: grid;
  gap: 0.25rem;
  width: 100%;
  min-width: 0;
}

.composition-ids-guide h4,
.composition-ids-guide p {
  margin: 0;
}

.composition-ids-guide h4 {
  color: var(--text-secondary);
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.04em;
}

.ids-list {
  display: flex;
  align-items: stretch;
  gap: var(--space-2);
  min-width: 0;
  overflow-x: auto;
  padding-bottom: 0.15rem;
  scrollbar-width: thin;
}

.ids-expression {
  flex: none;
  display: flex;
  align-items: stretch;
  min-height: 2.5rem;
}

.ids-status,
.ids-error {
  overflow: hidden;
  color: var(--text-secondary);
  font-size: 0.75rem;
  line-height: 1.35;
  text-overflow: ellipsis;
}

.ids-error {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  color: var(--danger-color, var(--text-color));
}

.ids-error .ui-button {
  flex: none;
  min-height: var(--control-height-compact);
}
</style>
