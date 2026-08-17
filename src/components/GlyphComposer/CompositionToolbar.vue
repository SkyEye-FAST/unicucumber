<template>
  <div
    class="composition-toolbar"
    role="toolbar"
    :aria-label="$t('composition.title')"
  >
    <button
      type="button"
      class="ui-button"
      data-testid="composition-add-blank"
      @click="$emit('addBlank')"
    >
      {{ $t('composition.add_blank') }}
    </button>
    <button
      type="button"
      class="ui-button ui-button--quiet"
      data-testid="composition-discard"
      @click="$emit('discard')"
    >
      {{ $t('composition.discard') }}
    </button>
    <span class="toolbar-spacer" />
    <button
      type="button"
      class="ui-button ui-button--quiet"
      :disabled="!canUndo"
      :aria-label="$t('composition.undo')"
      @click="$emit('undo')"
    >
      {{ $t('composition.undo_short') }}
    </button>
    <button
      type="button"
      class="ui-button ui-button--quiet"
      :disabled="!canRedo"
      :aria-label="$t('composition.redo')"
      @click="$emit('redo')"
    >
      {{ $t('composition.redo_short') }}
    </button>
    <button
      type="button"
      class="ui-button ui-button--primary"
      data-testid="composition-apply"
      @click="$emit('apply')"
    >
      {{ $t('composition.apply') }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'

defineProps<{
  canUndo: boolean
  canRedo: boolean
}>()

defineEmits<{
  addBlank: []
  discard: []
  undo: []
  redo: []
  apply: []
}>()

const { t: $t } = useI18n()
</script>

<style scoped>
.composition-toolbar {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding-top: var(--space-3);
  border-top: 1px solid var(--border-color);
}

.toolbar-spacer {
  flex: 1;
}

@media (max-width: 719px) {
  .composition-toolbar {
    flex-wrap: wrap;
  }

  .toolbar-spacer {
    display: none;
  }
}
</style>
