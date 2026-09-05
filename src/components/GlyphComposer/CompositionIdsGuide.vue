<template>
  <section
    class="composition-ids-guide tw:grid tw:w-full tw:min-w-0 tw:gap-1"
    data-testid="composition-ids-guide"
    :aria-label="$t('composition.ids')"
  >
    <h4
      class="tw:m-0 tw:text-[0.7rem] tw:font-semibold tw:tracking-[0.04em] tw:text-muted"
    >
      {{ $t('composition.ids') }}
    </h4>
    <p
      v-if="idsError"
      class="ids-error tw:m-0 tw:flex tw:items-center tw:gap-2 tw:overflow-hidden tw:text-[0.75rem] tw:leading-[1.35] tw:text-ellipsis"
      role="status"
    >
      {{ $t('composition.ids_error') }}
      <button
        type="button"
        class="ui-button ui-button--quiet tw:flex-none"
        @click="loadIds"
      >
        {{ $t('composition.ids_retry') }}
      </button>
    </p>
    <p
      v-else-if="idsLoaded && idsNodes.length === 0"
      class="ids-status tw:m-0 tw:overflow-hidden tw:text-[0.75rem] tw:leading-[1.35] tw:text-ellipsis tw:text-muted"
    >
      {{ $t('composition.ids_empty') }}
    </p>
    <div
      v-else-if="idsNodes.length > 0"
      class="ids-list tw:flex tw:min-w-0 tw:items-stretch tw:gap-2 tw:overflow-x-auto tw:pb-[0.15rem] tw:[scrollbar-width:thin]"
    >
      <div
        v-for="item in idsNodes"
        :key="item.expression"
        class="tw:flex tw:min-h-10 tw:flex-none tw:items-stretch"
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
.ids-error {
  color: var(--danger-color, var(--text-color));
}

.ids-error .ui-button {
  min-height: var(--control-height-compact);
}
</style>
