<template>
  <section class="batch-export-options" :aria-busy="busy">
    <fieldset :disabled="busy">
      <legend class="batch-export-legend">
        {{ t('glyph_manager.batch_export.scope_label') }}
      </legend>
      <div
        class="batch-export-scopes"
        role="radiogroup"
        :aria-label="t('glyph_manager.batch_export.scope_label')"
      >
        <label
          v-for="option in scopes"
          :key="option"
          class="batch-export-scope-pill"
          :class="{ 'is-selected': scope === option }"
        >
          <input
            v-model="scope"
            type="radio"
            :name="scopeId"
            :value="option"
            class="visually-hidden"
          />
          <span class="batch-export-scope-name">
            {{ t(`glyph_manager.batch_export.scope.${option}`) }}
          </span>
          <span
            v-if="scopeCount(option) !== undefined"
            class="batch-export-scope-count"
          >
            {{ scopeCount(option) }}
          </span>
        </label>
      </div>

      <div v-if="scope === 'characters'" class="batch-export-characters">
        <label :for="charactersId" class="batch-export-characters__label">
          <span>{{ t('glyph_manager.batch_export.characters') }}</span>
          <span v-if="characters.length" class="batch-export-characters__count">
            {{ characters.length }}
          </span>
        </label>
        <textarea :id="charactersId" v-model="characters" rows="2" />
      </div>

      <div class="batch-export-image-options">
        <label class="batch-export-scale-label">
          <span class="batch-export-sublabel">{{ t('export.scale') }}</span>
          <select v-model.number="scale" class="batch-export-select">
            <option
              v-for="value in [1, 2, 4, 8, 16]"
              :key="value"
              :value="value"
            >
              {{ value }}×
            </option>
          </select>
        </label>
        <label class="batch-export-checkbox-label">
          <input v-model="transparent" type="checkbox" />
          <span>{{ t('export.transparent') }}</span>
        </label>
      </div>

      <div class="batch-export-actions">
        <button
          v-for="format in formats"
          :key="format"
          type="button"
          class="batch-export-btn"
          :disabled="empty"
          @click="
            emit('export', { scope, format, characters, scale, transparent })
          "
        >
          <i-material-symbols-download aria-hidden="true" />
          <span>
            {{
              format === 'hex'
                ? t('glyph_manager.export_hex')
                : t('glyph_manager.batch_export.archive', {
                    format: format.toUpperCase(),
                  })
            }}
          </span>
        </button>
      </div>
    </fieldset>
    <p v-if="busy" role="status" class="batch-export-status">
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
const charactersId = useId()
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
const scopeCount = (target: BatchExportScope): number | undefined => {
  if (target === 'saved') return props.savedCount
  if (target === 'selected') return props.selectedCount
  if (target === 'filtered') return props.filteredCount
  return undefined
}
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
  padding: 0.4rem 0.5rem;
}

fieldset {
  min-width: 0;
  margin: 0;
  padding: 0;
  border: 0;
  display: grid;
  gap: 0.5rem;
}

.batch-export-legend {
  margin: 0;
  padding: 0;
  color: var(--text-secondary);
  font-size: 0.72rem;
  font-weight: 600;
}

.batch-export-scopes {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.35rem;
}

.batch-export-scope-pill {
  position: relative;
  min-width: 0;
  min-height: 2rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.35rem;
  padding: 0.35rem 0.55rem;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  background: var(--background-light);
  color: var(--text-color);
  font-size: 0.75rem;
  cursor: pointer;
  user-select: none;
  transition:
    border-color 0.15s ease,
    background-color 0.15s ease,
    color 0.15s ease;
}

.batch-export-scope-pill:hover {
  border-color: var(--border-hover);
  background: var(--background-hover);
}

.batch-export-scope-pill:has(:focus-visible) {
  outline: 2px solid var(--primary-color);
  outline-offset: 1px;
}

.batch-export-scope-pill.is-selected {
  border-color: var(--primary-color);
  background: color-mix(
    in srgb,
    var(--primary-color) 12%,
    var(--background-light)
  );
  color: var(--primary-darker);
  font-weight: 600;
}

[data-theme='dark'] .batch-export-scope-pill.is-selected {
  color: var(--text-primary);
}

.batch-export-scope-name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.batch-export-scope-count {
  flex-shrink: 0;
  padding: 0.05rem 0.35rem;
  border-radius: 999px;
  background: color-mix(in srgb, var(--text-secondary) 15%, transparent);
  color: var(--text-secondary);
  font-size: 0.68rem;
  font-family: var(--monospace-font);
  font-variant-numeric: tabular-nums;
  line-height: 1.2;
}

.batch-export-scope-pill.is-selected .batch-export-scope-count {
  background: color-mix(in srgb, var(--primary-color) 20%, transparent);
  color: var(--primary-darker);
}

[data-theme='dark']
  .batch-export-scope-pill.is-selected
  .batch-export-scope-count {
  color: var(--text-primary);
}

.batch-export-characters {
  display: grid;
  gap: 0.25rem;
}

.batch-export-characters__label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: var(--text-secondary);
  font-size: 0.72rem;
}

.batch-export-characters__count {
  font-family: var(--monospace-font);
  font-variant-numeric: tabular-nums;
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
  font-size: 0.75rem;
  padding: 0.35rem 0.5rem;
}

textarea {
  width: 100%;
  resize: vertical;
}

.batch-export-image-options {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.5rem;
  padding: 0.25rem 0.1rem;
}

.batch-export-scale-label,
.batch-export-checkbox-label {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  color: var(--text-secondary);
  font-size: 0.75rem;
  cursor: pointer;
}

.batch-export-select {
  min-height: 1.875rem;
  padding: 0.15rem 0.4rem;
}

.batch-export-actions {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.35rem;
}

.batch-export-btn {
  min-width: 0;
  min-height: 2.25rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  padding: 0.35rem 0.45rem;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  background: var(--background-light);
  color: var(--text-color);
  font: inherit;
  font-size: 0.75rem;
  line-height: 1.2;
  text-align: center;
  cursor: pointer;
  transition:
    background-color 0.15s ease,
    border-color 0.15s ease,
    color 0.15s ease;
}

.batch-export-btn span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.batch-export-btn:hover:not(:disabled) {
  border-color: color-mix(
    in srgb,
    var(--primary-color) 55%,
    var(--border-color)
  );
  background: var(--background-hover);
  color: var(--primary-color);
}

.batch-export-btn:focus-visible {
  outline: 2px solid var(--primary-color);
  outline-offset: 1px;
}

.batch-export-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.batch-export-status {
  margin: 0.2rem 0 0;
  color: var(--text-secondary);
  font-size: 0.72rem;
}

@media (max-width: 480px) {
  .batch-export-scopes {
    grid-template-columns: 1fr;
  }

  .batch-export-actions {
    grid-template-columns: 1fr;
  }

  .batch-export-btn {
    justify-content: flex-start;
    padding-inline: 0.75rem;
  }
}
</style>
