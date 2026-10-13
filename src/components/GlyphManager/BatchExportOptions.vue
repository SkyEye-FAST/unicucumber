<template>
  <section class="batch-export-options" :aria-busy="busy">
    <fieldset :disabled="busy">
      <legend>{{ t('glyph_manager.batch_export.scope_label') }}</legend>
      <div class="batch-export-scopes">
        <label v-for="option in scopes" :key="option">
          <input v-model="scope" type="radio" :name="scopeId" :value="option" />
          <span>{{ t(`glyph_manager.batch_export.scope.${option}`) }}</span>
        </label>
      </div>
      <label v-if="scope === 'characters'" class="batch-export-characters">
        <span>{{ t('glyph_manager.batch_export.characters') }}</span>
        <textarea v-model="characters" rows="3" />
      </label>
      <div class="batch-export-image-options">
        <label>
          <span>{{ t('export.scale') }}</span>
          <select v-model.number="scale">
            <option
              v-for="value in [1, 2, 4, 8, 16]"
              :key="value"
              :value="value"
            >
              {{ value }}×
            </option>
          </select>
        </label>
        <label
          ><input v-model="transparent" type="checkbox" />{{
            t('export.transparent')
          }}</label
        >
      </div>
      <div class="batch-export-actions">
        <button
          v-for="format in formats"
          :key="format"
          type="button"
          :disabled="empty"
          @click="
            emit('export', { scope, format, characters, scale, transparent })
          "
        >
          <i-material-symbols-download aria-hidden="true" />
          {{
            format === 'hex'
              ? t('glyph_manager.export_hex')
              : t('glyph_manager.batch_export.archive', {
                  format: format.toUpperCase(),
                })
          }}
        </button>
      </div>
    </fieldset>
    <p v-if="busy" role="status">
      {{ t('glyph_manager.batch_export.preparing') }}
    </p>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, useId } from 'vue'
import { useI18n } from 'vue-i18n'
import type { BatchExportRequest, BatchExportScope } from '@/utils/batchExport'

const props = defineProps<{
  busy: boolean
  savedCount: number
  selectedCount?: number
  filteredCount: number
}>()
const emit = defineEmits<{ export: [request: BatchExportRequest] }>()
const { t } = useI18n()
const scopeId = useId()
const scope = ref<BatchExportScope>('saved')
const characters = ref('')
const scale = ref(1)
const transparent = ref(false)
const formats = ['hex', 'svg', 'png'] as const
const scopes = computed<BatchExportScope[]>(() =>
  props.selectedCount === undefined
    ? ['saved', 'filtered', 'characters']
    : ['saved', 'selected', 'filtered', 'characters'],
)
const empty = computed(() =>
  scope.value === 'characters'
    ? !characters.value.replaceAll(/[\r\n\t]/g, '').length
    : (scope.value === 'saved'
        ? props.savedCount
        : scope.value === 'selected'
          ? props.selectedCount
          : props.filteredCount) === 0,
)
</script>

<style scoped>
.batch-export-options {
  padding: 0.35rem;
  border-bottom: 1px solid var(--border-color);
}
fieldset {
  min-width: 0;
  margin: 0;
  padding: 0;
  border: 0;
}
legend,
p {
  color: var(--text-secondary);
  font-size: 0.75rem;
}
.batch-export-scopes {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.25rem;
}
.batch-export-options label {
  display: flex;
  justify-content: flex-start;
  flex-wrap: wrap;
  gap: 0.35rem;
  padding: 0.35rem 0;
  font-size: 0.75rem;
}
.batch-export-characters {
  flex-direction: column;
  align-items: stretch;
}
textarea,
select {
  box-sizing: border-box;
  min-width: 0;
  border: 1px solid var(--input-border);
  border-radius: var(--radius-sm);
  background: var(--input-background);
  color: var(--text-color);
  font: inherit;
  padding: 0.35rem;
}
textarea {
  width: 100%;
  resize: vertical;
}
.batch-export-image-options {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
}
.batch-export-actions {
  display: grid;
  gap: 0.25rem;
}
.batch-export-actions button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  min-height: 2.75rem;
  padding: 0.35rem;
  border: 0;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--text-color);
  font: inherit;
  font-size: 0.8125rem;
  text-align: start;
}
.batch-export-actions button:hover {
  background: var(--background-hover);
}
button:disabled {
  opacity: 0.5;
  cursor: default;
}
</style>
