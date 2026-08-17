<template>
  <button
    v-if="node.type === 'character'"
    type="button"
    class="ids-leaf"
    :data-testid="`composition-ids-leaf-${node.value}`"
    :aria-label="$t('composition.ids_leaf', { character: node.value })"
    @click="$emit('selectCharacter', node.value)"
  >
    {{ node.value }}
  </button>
  <span v-else class="ids-operator-group">
    <span class="ids-operator" aria-hidden="true">{{ node.operator }}</span>
    <span class="ids-children">
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
.ids-operator-group,
.ids-children {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
}

.ids-operator-group {
  padding: 0.15rem 0.25rem;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
}

.ids-operator {
  color: var(--text-secondary);
  font-weight: 700;
}

.ids-leaf {
  min-width: 2rem;
  min-height: 2rem;
  padding: 0.15rem 0.35rem;
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
