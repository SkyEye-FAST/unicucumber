<template>
  <section class="font-export-options" :aria-busy="busy">
    <p class="font-export-options__group">
      {{ $t('glyph_manager.export_font_files') }}
    </p>

    <fieldset class="font-export-scope" :disabled="busy">
      <legend>{{ $t('glyph_manager.font_export.scope_label') }}</legend>
      <div class="font-export-scope__choices">
        <label
          v-for="option in scopeOptions"
          :key="option"
          :class="{ 'is-selected': scope === option }"
        >
          <input
            :checked="scope === option"
            type="radio"
            name="font-export-scope"
            :value="option"
            @change="$emit('update:scope', option)"
          />
          <span class="font-export-scope__title">
            {{ $t(`glyph_manager.font_export.scope.${option}.title`) }}
          </span>
          <span class="font-export-scope__description">
            {{ $t(`glyph_manager.font_export.scope.${option}.description`) }}
          </span>
        </label>
      </div>
    </fieldset>

    <details class="font-metadata">
      <summary>
        <span>
          <strong>{{ $t('glyph_manager.font_export.metadata.title') }}</strong>
          <small>{{ metadata.familyName }} · {{ metadata.version }}</small>
        </span>
        <i-material-symbols-keyboard-arrow-down
          class="font-metadata__chevron"
          aria-hidden="true"
        />
      </summary>
      <div class="font-metadata__body">
        <p>{{ $t('glyph_manager.font_export.metadata.description') }}</p>
        <div class="font-metadata__fields">
          <label
            v-for="field in metadataFields"
            :key="field"
            :class="{ 'is-wide': wideFields.has(field) }"
          >
            <span>
              {{ $t(`glyph_manager.font_export.metadata.fields.${field}`) }}
            </span>
            <textarea
              v-if="textareaFields.has(field)"
              :value="metadata[field]"
              rows="3"
              :disabled="busy"
              @input="updateMetadata(field, $event)"
            />
            <input
              v-else
              :value="metadata[field]"
              :type="urlFields.has(field) ? 'url' : 'text'"
              :maxlength="field === 'vendorId' ? 4 : undefined"
              :disabled="busy"
              @input="updateMetadata(field, $event)"
            />
          </label>
        </div>
        <button
          class="font-metadata__reset"
          type="button"
          :disabled="busy"
          @click="$emit('reset-metadata')"
        >
          <i-material-symbols-restart-alt aria-hidden="true" />
          {{ $t('glyph_manager.font_export.metadata.reset') }}
        </button>
      </div>
    </details>

    <div class="font-format-actions">
      <button
        v-for="format in formats"
        :key="format"
        type="button"
        :disabled="busy"
        @click="$emit('font', format)"
      >
        <span>{{ $t(`glyph_manager.export_${format}`) }}</span>
        <i-material-symbols-arrow-forward aria-hidden="true" />
      </button>
    </div>
    <p v-if="busy" class="font-export-options__busy" role="status">
      <span aria-hidden="true" />
      {{ $t('glyph_manager.font_export.preparing') }}
    </p>
  </section>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'

import type { FontExportMetadata, FontExportScope } from '@/utils/fontExport'

const { t: $t } = useI18n()

const props = defineProps<{
  busy: boolean
  metadata: FontExportMetadata
  scope: FontExportScope
}>()

const emit = defineEmits<{
  font: [format: 'otf' | 'ttf' | 'woff' | 'woff2' | 'bdf' | 'psf']
  'reset-metadata': []
  'update:metadata': [value: FontExportMetadata]
  'update:scope': [value: FontExportScope]
}>()

const formats = ['otf', 'ttf', 'woff', 'woff2', 'bdf', 'psf'] as const
const scopeOptions: FontExportScope[] = ['full', 'modified']
const metadataFields: Array<keyof FontExportMetadata> = [
  'familyName',
  'styleName',
  'fullName',
  'postScriptName',
  'version',
  'uniqueId',
  'vendorId',
  'manufacturer',
  'manufacturerUrl',
  'designer',
  'designerUrl',
  'description',
  'copyright',
  'trademark',
  'license',
  'licenseUrl',
]
const textareaFields = new Set<keyof FontExportMetadata>([
  'description',
  'copyright',
  'license',
])
const wideFields = new Set<keyof FontExportMetadata>([
  'description',
  'copyright',
  'trademark',
  'license',
  'licenseUrl',
])
const urlFields = new Set<keyof FontExportMetadata>([
  'manufacturerUrl',
  'designerUrl',
  'licenseUrl',
])

const updateMetadata = (
  field: keyof FontExportMetadata,
  event: Event,
): void => {
  const target = event.target as HTMLInputElement | HTMLTextAreaElement
  emit('update:metadata', { ...props.metadata, [field]: target.value })
}
</script>

<style scoped>
.font-export-options {
  display: grid;
  gap: var(--space-2);
}

.font-export-options__group {
  margin: 0;
  padding: 0.45rem 0.35rem 0;
  color: var(--text-secondary);
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.04em;
}

.font-export-scope {
  min-width: 0;
  margin: 0;
  padding: 0.2rem 0.35rem 0.35rem;
  border: 0;
}

.font-export-scope legend {
  padding: 0;
  color: var(--text-secondary);
  font-size: 0.7rem;
}

.font-export-scope__choices {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-2);
  margin-block-start: 0.35rem;
}

.font-export-scope label {
  position: relative;
  min-width: 0;
  display: grid;
  gap: 0.15rem;
  padding: 0.55rem 0.6rem;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  background: var(--background-light);
  cursor: pointer;
}

.font-export-scope label.is-selected {
  border-color: color-mix(
    in srgb,
    var(--primary-color) 65%,
    var(--border-color)
  );
  background: color-mix(
    in srgb,
    var(--primary-color) 9%,
    var(--background-light)
  );
  box-shadow: inset 0 -2px var(--primary-color);
}

.font-export-scope input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.font-export-scope label:has(input:focus-visible) {
  outline: 2px solid var(--focus-ring);
  outline-offset: 1px;
}

.font-export-scope__title {
  color: var(--text-color);
  font-size: 0.78rem;
  font-weight: 700;
}

.font-export-scope__description {
  color: var(--text-secondary);
  font-size: 0.68rem;
  line-height: 1.4;
}

.font-metadata {
  margin-inline: 0.35rem;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  background: var(--background-light);
}

.font-metadata summary {
  min-height: 2.65rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  padding: 0.45rem 0.6rem;
  color: var(--text-color);
  cursor: pointer;
  list-style: none;
}

.font-metadata summary::-webkit-details-marker {
  display: none;
}

.font-metadata summary > span {
  min-width: 0;
  display: grid;
  gap: 0.08rem;
}

.font-metadata summary strong {
  font-size: 0.75rem;
}

.font-metadata summary small {
  overflow: hidden;
  color: var(--text-secondary);
  font-family: var(--monospace-font);
  font-size: 0.66rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.font-metadata__chevron {
  flex: none;
  color: var(--text-secondary);
  transition: transform 140ms ease;
}

.font-metadata[open] .font-metadata__chevron {
  transform: rotate(180deg);
}

.font-metadata__body {
  display: grid;
  gap: var(--space-2);
  padding: 0.65rem;
  border-block-start: 1px solid var(--border-color);
}

.font-metadata__body > p {
  margin: 0;
  color: var(--text-secondary);
  font-size: 0.68rem;
  line-height: 1.45;
}

.font-metadata__fields {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-2);
}

.font-metadata__fields label {
  min-width: 0;
  display: grid;
  align-content: start;
  gap: 0.25rem;
  color: var(--text-secondary);
  font-size: 0.68rem;
}

.font-metadata__fields label.is-wide {
  grid-column: 1 / -1;
}

.font-metadata__fields input,
.font-metadata__fields textarea {
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
  min-height: 2rem;
  padding: 0.35rem 0.45rem;
  resize: vertical;
  border: 1px solid var(--input-border);
  border-radius: var(--radius-sm);
  outline: 0;
  background: var(--input-background);
  color: var(--text-color);
  font: 0.72rem/1.35 var(--normal-font);
}

.font-metadata__fields input:focus,
.font-metadata__fields textarea:focus {
  border-color: var(--primary-color);
  box-shadow: 0 0 0 2px var(--focus-ring);
}

.font-metadata__reset {
  min-height: 2rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  justify-self: start;
  padding-inline: 0.55rem;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--text-secondary);
  font-size: 0.7rem;
}

.font-format-actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1px;
}

.font-format-actions button {
  min-width: 0;
  min-height: 2.25rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  padding-inline: 0.6rem;
  border: 0;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--text-color);
  font-size: 0.75rem;
  line-height: 1.25;
  text-align: start;
}

.font-format-actions button:hover:not(:disabled),
.font-format-actions button:focus-visible {
  background: var(--background-hover);
}

.font-format-actions button:disabled,
.font-metadata__reset:disabled {
  cursor: wait;
  opacity: 0.55;
}

.font-export-options__busy {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin: 0.1rem 0.35rem;
  color: var(--text-secondary);
  font-size: 0.7rem;
}

.font-export-options__busy span {
  width: 0.75rem;
  height: 0.75rem;
  border: 2px solid var(--border-color);
  border-block-start-color: var(--primary-color);
  border-radius: 50%;
  animation: font-export-spin 0.8s linear infinite;
}

@keyframes font-export-spin {
  to {
    transform: rotate(1turn);
  }
}

@media (max-width: 479px) {
  .font-export-scope__choices,
  .font-metadata__fields {
    grid-template-columns: minmax(0, 1fr);
  }

  .font-metadata__fields label.is-wide {
    grid-column: auto;
  }
}

@media (prefers-reduced-motion: reduce) {
  .font-metadata__chevron {
    transition: none;
  }

  .font-export-options__busy span {
    animation: none;
  }
}
</style>
