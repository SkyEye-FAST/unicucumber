<template>
  <button
    v-if="node.type === 'character'"
    type="button"
    class="ids-leaf tw:box-border tw:min-h-8 tw:min-w-8 tw:self-stretch tw:px-[0.35rem] tw:py-[0.15rem]"
    :data-testid="`composition-ids-leaf-${node.value}`"
    :aria-label="$t('composition.ids_leaf', { character: node.value })"
    @click="$emit('selectCharacter', node.value)"
  >
    {{ node.value }}
  </button>
  <span
    v-else
    class="ids-operator-group tw:box-border tw:inline-flex tw:min-h-10 tw:items-stretch tw:gap-1 tw:px-1 tw:py-0.5 tw:whitespace-nowrap"
  >
    <span
      class="tw:grid tw:min-h-8 tw:flex-[0_0_1.5rem] tw:place-items-center tw:font-bold tw:leading-none tw:text-muted"
      aria-hidden="true"
      >{{ node.operator }}</span
    >
    <span class="tw:inline-flex tw:items-stretch tw:gap-1">
      <IdsTree
        v-for="(child, index) in node.children"
        :key="index"
        :node="child"
        @select-character="$emit('selectCharacter', $event)"
      />
    </span>
  </span>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'

import type { IdsNode } from '@/utils/ids'

defineOptions({ name: 'IdsTree' })

defineProps<{
  node: IdsNode
}>()

defineEmits<{
  selectCharacter: [character: string]
}>()

const { t: $t } = useI18n()
</script>

<style scoped>
.ids-operator-group {
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
}

.ids-leaf {
  font-size: 1rem;
  line-height: 1;
  color: inherit;
  background: var(--background-light);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  cursor: pointer;
}

.ids-leaf:hover,
.ids-leaf:focus-visible {
  border-color: var(--primary-color);
}
</style>
