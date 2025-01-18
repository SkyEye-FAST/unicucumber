<template>
  <div class="current-glyph-info">
    <a
      v-if="showZiToolsLink"
      :href="ziToolsUrl"
      target="_blank"
      rel="noopener noreferrer"
      class="zi-tools-link"
      :title="$t('editor.actions.open_in_zitools')"
    >
      <img src="/zi-tools.svg" alt="zi.tools" class="zi-tools-icon" />
    </a>
    <div class="code-point-input">
      <span>U+</span>
      <input
        v-model="localModelValue"
        @input="handleInput"
        maxlength="6"
        pattern="[0-9A-Fa-f]{4,6}"
      />
    </div>
    <div class="glyph-preview">
      <PixelPreview :hexValue="hexValue" :width="width" display-mode="editor" />
      <span class="unicode-char" :style="previewStyle">
        {{ String.fromCodePoint(parseInt(modelValue || '0000', 16)) }}
      </span>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import PixelPreview from './GlyphManager/PixelPreview.vue'
import { isCJKChar } from '@/utils/charUtils'

const { t: $t } = useI18n()

const props = defineProps({
  modelValue: {
    type: String,
    required: true,
  },
  hexValue: {
    type: String,
    required: true,
  },
  width: {
    type: Number,
    required: true,
  },
  browserPreviewFont: {
    type: String,
    required: true,
  },
})

const emit = defineEmits(['update:modelValue'])

const localModelValue = ref(props.modelValue)

watch(
  () => props.modelValue,
  (newValue) => {
    localModelValue.value = newValue
  },
)

const handleInput = (event) => {
  let value = event.target.value.toUpperCase()
  value = value.replace(/[^0-9A-F]/g, '')
  if (value.length > 6) {
    value = value.slice(0, 6)
  }
  localModelValue.value = value
  emit('update:modelValue', value)
}

const previewStyle = computed(() => ({
  fontFamily: props.browserPreviewFont,
}))

const ziToolsUrl = computed(() => {
  const codePoint = parseInt(props.modelValue || '0000', 16)
  const char = String.fromCodePoint(codePoint)
  return `https://zi.tools/zi/${char}`
})

const showZiToolsLink = computed(() => {
  const codePoint = parseInt(props.modelValue || '0000', 16)
  const char = String.fromCodePoint(codePoint)
  return isCJKChar(char)
})
</script>

<style scoped>
.current-glyph-info {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.8rem;
  margin: 0.2rem 0 0.5rem;
  padding: 0.35rem 0.8rem;
  background: var(--background-light);
  border-radius: 4px;
  max-width: fit-content;
  height: 3rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.glyph-preview {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.1rem 0.5rem;
  background: var(--background-light);
  border-radius: 4px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.unicode-char {
  font-size: 2em;
  border-radius: 4px;
  text-align: center;
  transition: none !important;
}

.code-point-input {
  display: flex;
  align-items: center;
  font-family: var(--monospace-font);
  color: var(--text-secondary);
  font-size: 1.3rem;
  font-weight: 600;
  background: var(--background-hover);
  border-radius: 4px;
  padding: 0.2rem;
}

.code-point-input span {
  padding: 0 0.2rem;
}

.code-point-input input {
  width: 3.8em;
  background: transparent;
  border: none;
  color: inherit;
  font-family: inherit;
  font-size: inherit;
  font-weight: inherit;
  outline: none;
  padding: 0.2rem 0.1rem;
}

.code-point-input input:focus {
  background: var(--background-active);
  border-radius: 2px;
}

.zi-tools-link {
  display: flex;
  align-items: center;
  padding: 4px;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.zi-tools-link:hover {
  background-color: var(--background-active);
}

.zi-tools-icon {
  width: 28px;
  height: 28px;
}

[data-theme='dark'] .zi-tools-icon {
  filter: invert(1);
}

@media (orientation: portrait) and (max-width: 768px) {
  .current-glyph-info {
    gap: 0.5rem;
    height: 2rem;
    padding: 0.6rem 0.8rem;
  }

  .code-point-input {
    font-size: 1.2rem;
  }

  .code-point-input input {
    width: 4em;
  }

  .zi-tools-icon {
    width: 24px;
    height: auto;
  }

  .unicode-char {
    font-size: 2em;
  }
}

@media (orientation: portrait) and (min-width: 768px) and (max-width: 1024px) {
  .current-glyph-info {
    gap: 1.2rem;
    height: 3rem;
    padding: 0.8rem 1.2rem;
  }

  .code-point-input {
    font-size: 2rem;
  }

  .zi-tools-icon {
    width: 36px;
    height: 36px;
  }

  .unicode-char {
    font-size: 3em;
  }
}

@media (orientation: portrait) and (min-width: 1024px) {
  .current-glyph-info {
    gap: 1.2rem;
    height: 5rem;
    padding: 0.6rem 2rem;
    margin: 0.5rem 0 1rem;
  }

  .code-point-input {
    font-size: 2.6rem;
  }

  .zi-tools-icon {
    width: 48px;
    height: 48px;
  }

  .unicode-char {
    font-size: 3.2em;
  }
}
</style>
