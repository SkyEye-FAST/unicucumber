<template>
  <div class="glyph-info-wrapper">
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
      <button
        class="encoding-info-btn"
        @click="toggleEncodingInfo"
        :title="$t('editor.actions.show_encoding_info')"
        :class="{ active: showingEncodingInfo }"
      >
        <span class="material-symbols-outlined">info</span>
      </button>
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
        <PixelPreview
          :hexValue="hexValue"
          :width="width"
          display-mode="editor"
        />
        <span class="unicode-char" :style="previewStyle">
          {{ String.fromCodePoint(parseInt(modelValue || '0000', 16)) }}
        </span>
      </div>
    </div>

    <Transition name="slide">
      <div v-if="showingEncodingInfo" class="encoding-info-panel">
        <div class="unicode-name">{{ unicodeNameStr }}</div>
        <div
          v-for="(value, key) in encodingInfo"
          :key="key"
          class="encoding-row"
        >
          <span class="encoding-label">{{ key }}</span>
          <template v-if="value === '—'">
            <span class="encoding-value">{{ value }}</span>
          </template>
          <template v-else>
            <code class="encoding-value">{{ value }}</code>
          </template>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import { Buffer } from 'buffer'
import { useI18n } from 'vue-i18n'
import PixelPreview from './GlyphManager/PixelPreview.vue'
import { isCJKChar } from '@/utils/charUtils'
import iconvLite from 'iconv-lite/lib/index.js'
import { unicodeName } from 'unicode-name'

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

const showingEncodingInfo = ref(false)

const toggleEncodingInfo = () => {
  showingEncodingInfo.value = !showingEncodingInfo.value
}

const convertEncoding = (char, encoding) => {
  try {
    const buffer = Buffer.from(char)
    const encoded = iconvLite.encode(buffer, encoding)
    if (char === '?' && encoded.length === 1 && encoded[0] === 0x3f) {
      return '3F'
    }
    if (encoded.every((b) => b === 0x3f)) {
      return '—'
    }
    return Array.from(encoded)
      .map((b) => b.toString(16).toUpperCase().padStart(2, '0'))
      .join(' ')
  } catch {
    return '—'
  }
}

const unicodeNameStr = computed(() => {
  const codePoint = parseInt(props.modelValue || '0000', 16)
  const char = String.fromCodePoint(codePoint)
  return unicodeName(char) || '—'
})

const encodingInfo = computed(() => {
  const codePoint = parseInt(props.modelValue || '0000', 16)
  const char = String.fromCodePoint(codePoint)

  return {
    NCR: `&#${codePoint};`,
    ASCII: char.charCodeAt(0) < 128 ? char.charCodeAt(0) : '—',
    UTF8: convertEncoding(char, 'utf8'),
    UTF16: convertEncoding(char, 'utf16be'),
    UTF32: convertEncoding(char, 'utf32be'),
    GBK: convertEncoding(char, 'gbk'),
    GB18030: convertEncoding(char, 'gb18030'),
    Big5: convertEncoding(char, 'big5'),
    Shift_JIS: convertEncoding(char, 'shift-jis'),
    'EUC-KR': convertEncoding(char, 'euc-kr'),
  }
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

.encoding-info-btn {
  display: flex;
  align-items: center;
  padding: 4px;
  border: none;
  background: transparent;
  border-radius: 4px;
  cursor: pointer;
  color: var(--text-secondary);
  transition: background-color 0.2s;
}

.encoding-info-btn:hover {
  background-color: var(--background-active);
}

.encoding-info-btn .material-icons {
  font-size: 24px;
}

.glyph-info-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.encoding-info-btn.active {
  background-color: var(--background-active);
}

.encoding-info-panel {
  width: 100%;
  max-width: 500px;
  padding: 0.5rem;
  background: var(--background-light);
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 0.3rem;
}

.encoding-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.3rem 0.5rem;
  border: 1px solid var(--border-color);
  border-radius: 3px;
  background: var(--background-hover);
}

.encoding-label {
  color: var(--text-secondary);
  font-weight: 500;
  font-size: 0.9rem;
  margin-right: 0.8rem;
}

.encoding-value {
  font-family: var(--monospace-font);
  font-size: 0.9rem;
  padding: 0.1rem 0.3rem;
  border-radius: 2px;
  color: var(--text-primary);
}

code.encoding-value {
  background: var(--background-active);
}

.unicode-name {
  font-weight: bold;
  padding: 0.3rem 0.5rem;
  margin-bottom: 0.3rem;
  border-bottom: 1px solid var(--border-color);
  text-align: center;
  grid-column: 1 / -1;
}

.slide-enter-active,
.slide-leave-active {
  transition: all 0.3s ease-out;
}

.slide-enter-from,
.slide-leave-to {
  transform: translateY(-20px);
  opacity: 0;
}

@media (orientation: portrait) {
  .encoding-info-panel {
    font-size: 0.9rem;
  }
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

  .encoding-info-btn .material-icons {
    font-size: 20px;
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

  .encoding-info-btn .material-icons {
    font-size: 32px;
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

  .encoding-info-btn .material-icons {
    font-size: 42px;
  }
}
</style>
