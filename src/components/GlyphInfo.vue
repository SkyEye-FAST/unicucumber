<template>
  <div ref="wrapperRef" class="glyph-info-wrapper">
    <div class="current-glyph-info">
      <a
        v-if="showZiToolsLink"
        :href="ziToolsUrl"
        target="_blank"
        rel="noopener noreferrer"
        class="zi-tools-link"
        :title="$t('editor.actions.open_in_zitools')"
      >
        <img src="@/assets/zi-tools.svg" alt="zi.tools" class="zi-tools-icon" />
      </a>
      <button
        class="encoding-info-btn"
        :title="$t('editor.actions.show_encoding_info')"
        :class="{ active: showingEncodingInfo }"
        @click="toggleEncodingInfo()"
      >
        <i-material-symbols-info-outline class="icon" />
      </button>
      <div class="code-point-input">
        <span>U+</span>
        <input
          v-model="localModelValue"
          maxlength="6"
          pattern="[0-9A-Fa-f]{1,6}"
          @input="handleInput"
        />
      </div>
      <div class="glyph-preview">
        <PixelPreview
          :hex-value="hexValue"
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

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'

import iconvLite from 'iconv-lite/lib/index.js'
import { unicodeName } from 'unicode-name'
import { useI18n } from 'vue-i18n'

import { isCJKChar } from '@/utils/charUtils'
import { useToggle, useVModel } from '@vueuse/core'

import PixelPreview from './GlyphManager/PixelPreview.vue'

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

const emit = defineEmits(['update:model-value'])

const localModelValue = useVModel(props, 'modelValue', emit)

const wrapperRef = ref<HTMLElement | null>(null)
const [showingEncodingInfo, toggleEncodingInfo] = useToggle()

const handleClickOutside = (event: MouseEvent) => {
  if (
    showingEncodingInfo.value &&
    wrapperRef.value &&
    !wrapperRef.value.contains(event.target as Node)
  ) {
    showingEncodingInfo.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})

const handleInput = (event: Event) => {
  let value = (event.target as HTMLInputElement).value.toUpperCase()
  value = value.replace(/[^0-9A-F]/g, '')
  if (value.length > 6) {
    value = value.slice(0, 6)
  }
  localModelValue.value = value
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

const convertEncoding = (char: string, encoding: string): string => {
  try {
    const encoded = iconvLite.encode(char, encoding)
    if (char === '?' && encoded.length === 1 && encoded[0] === 0x3f) {
      return '3F'
    }
    if (encoded.every((b: number) => b === 0x3f)) {
      return '—'
    }
    return Array.from(encoded)
      .map((b: unknown) =>
        (b as number).toString(16).toUpperCase().padStart(2, '0'),
      )
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
    'UTF-8': convertEncoding(char, 'utf8'),
    'UTF-16': convertEncoding(char, 'utf16be'),
    'UTF-32': convertEncoding(char, 'utf32be'),
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
  font-family: 'Noto Sans', sans-serif;
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
  font-family: var(--monospace-font);
  background: var(--background-active);
}

.unicode-name {
  font-family: 'Noto Sans', sans-serif;
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

  .encoding-info-btn {
    font-size: 2em;
  }

  .encoding-info-panel {
    max-width: 95vw;
    grid-template-columns: 1fr;
    gap: 0.25rem;
    padding: 0.3rem;
  }

  .encoding-row {
    padding: 0.25rem 0.4rem;
  }

  .encoding-label {
    font-size: 0.85rem;
  }

  .encoding-value {
    font-size: 0.85rem;
    padding: 0.1rem 0.2rem;
  }

  .unicode-name {
    font-size: 0.9rem;
    padding: 0.25rem;
    margin-bottom: 0.25rem;
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
    font-size: 2.5em;
  }

  .encoding-info-btn {
    font-size: 2em;
  }

  .encoding-info-panel {
    max-width: 90vw;
    grid-template-columns: repeat(2, 1fr);
    gap: 0.4rem;
    padding: 0.8rem;
  }

  .encoding-row {
    padding: 0.4rem 0.6rem;
  }

  .encoding-label {
    font-size: 1.2rem;
  }

  .encoding-value {
    font-size: 1.2rem;
    padding: 0.15rem 0.4rem;
  }

  .unicode-name {
    font-size: 1.4rem;
    padding: 0.4rem;
    margin-bottom: 0.4rem;
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
    font-size: 3em;
  }

  .encoding-info-btn {
    font-size: 42px;
  }

  .encoding-info-panel {
    max-width: 85vw;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.6rem;
    padding: 1rem;
    margin-top: 1rem;
  }

  .encoding-row {
    padding: 0.5rem 0.8rem;
  }

  .encoding-label {
    font-size: 1.6rem;
  }

  .encoding-value {
    font-size: 1.6rem;
    padding: 0.2rem 0.5rem;
  }

  .unicode-name {
    font-size: 1.8rem;
    padding: 0.6rem;
    margin-bottom: 0.6rem;
  }
}
</style>
