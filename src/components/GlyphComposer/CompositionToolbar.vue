<template>
  <div
    class="composition-toolbar"
    role="toolbar"
    :aria-label="$t('composition.title')"
  >
    <div class="toolbar-group toolbar-document-actions">
      <button
        type="button"
        class="ui-button"
        data-testid="composition-add-blank"
        @click="$emit('addBlank')"
      >
        <i-material-symbols-add aria-hidden="true" />
        <span>{{ $t('composition.add_blank') }}</span>
      </button>
      <button
        type="button"
        class="ui-button ui-button--quiet toolbar-danger"
        data-testid="composition-discard"
        @click="$emit('discard')"
      >
        <i-material-symbols-delete-outline aria-hidden="true" />
        <span>{{ $t('composition.discard') }}</span>
      </button>
    </div>
    <div class="toolbar-group toolbar-commit-actions">
      <button
        type="button"
        class="ui-button ui-button--quiet"
        data-testid="composition-undo"
        :disabled="!canUndo"
        :aria-label="$t('composition.undo')"
        @click="$emit('undo')"
      >
        <i-material-symbols-undo aria-hidden="true" />
        <span>{{ $t('composition.undo_short') }}</span>
      </button>
      <button
        type="button"
        class="ui-button ui-button--quiet"
        data-testid="composition-redo"
        :disabled="!canRedo"
        :aria-label="$t('composition.redo')"
        @click="$emit('redo')"
      >
        <i-material-symbols-redo aria-hidden="true" />
        <span>{{ $t('composition.redo_short') }}</span>
      </button>
      <button
        type="button"
        class="ui-button ui-button--primary"
        data-testid="composition-save"
        :disabled="saving"
        @click="$emit('save')"
      >
        <i-material-symbols-save-outline aria-hidden="true" />
        <span>{{ $t('composition.save') }}</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'

defineProps<{
  canUndo: boolean
  canRedo: boolean
  saving?: boolean
}>()

defineEmits<{
  addBlank: []
  discard: []
  undo: []
  redo: []
  save: []
}>()

const { t: $t } = useI18n()
</script>

<style scoped>
.composition-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-4);
  background: var(--modal-background);
}

.toolbar-group {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.toolbar-danger {
  color: var(--danger-color);
}

@media (max-width: 719px) {
  .composition-toolbar {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: var(--space-2);
    padding: var(--space-2) var(--space-3)
      calc(var(--space-2) + env(safe-area-inset-bottom));
  }

  .toolbar-group {
    display: grid;
    width: 100%;
    gap: var(--space-2);
  }

  .toolbar-document-actions {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .toolbar-commit-actions {
    grid-template-columns: minmax(0, 0.75fr) minmax(0, 0.75fr) minmax(0, 1.5fr);
  }

  .toolbar-group .ui-button {
    min-height: 4.25rem;
    min-width: 0;
    justify-content: center;
    padding-inline: var(--space-3);
    font-size: 0.9rem;
    white-space: normal;
  }

  .toolbar-group .ui-button > svg {
    flex: none;
    font-size: 1.1rem;
  }

  .toolbar-commit-actions .ui-button:last-child {
    padding-inline: var(--space-2);
    font-size: 0.85rem;
    white-space: nowrap;
  }
}
</style>
