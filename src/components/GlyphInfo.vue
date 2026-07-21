<template>
  <div ref="wrapperRef" class="glyph-info-wrapper">
    <div class="current-glyph-info">
      <a
        v-if="showZiToolsLink"
        :href="ziToolsUrl"
        target="_blank"
        rel="noopener noreferrer"
        class="zi-tools-link ui-icon-button"
        :title="$t('editor.actions.open_in_zitools')"
      >
        <img src="@/assets/zi-tools.svg" alt="zi.tools" class="zi-tools-icon" />
      </a>
      <button
        class="encoding-info-btn ui-icon-button"
        type="button"
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
          inputmode="text"
          autocapitalize="characters"
          autocomplete="off"
          autocorrect="off"
          spellcheck="false"
          :aria-invalid="codePointError !== null"
          :aria-describedby="codePointError ? 'codePointError' : undefined"
          @input="handleInput"
          @blur="commitCodePoint"
          @keydown.enter.prevent="commitCodePoint"
          @keydown.escape.prevent="revertCodePoint"
        />
      </div>
      <div class="glyph-preview">
        <PixelPreview
          :hex-value="hexValue"
          :width="width"
          display-mode="editor"
        />
        <span class="unicode-char" :style="previewStyle">
          {{ previewCharacter }}
        </span>
        <span class="glyph-width">{{ $t('hex_input.width', { width }) }}</span>
      </div>
      <span
        class="document-status"
        :class="saveStatus"
        :title="saveStatusLabel"
        aria-live="polite"
      >
        <i-material-symbols-check
          v-if="saveStatus === 'saved'"
          class="status-icon"
          aria-hidden="true"
        />
        <i-material-symbols-sync
          v-else-if="saveStatus === 'saving'"
          class="status-icon status-icon-spinning"
          aria-hidden="true"
        />
        <i-material-symbols-edit
          v-else-if="saveStatus === 'unsaved'"
          class="status-icon"
          aria-hidden="true"
        />
        <i-material-symbols-error-outline
          v-else
          class="status-icon"
          aria-hidden="true"
        />
        <span>{{ saveStatusLabel }}</span>
      </span>
    </div>
    <span
      v-if="codePointError"
      id="codePointError"
      class="code-point-error"
      aria-live="polite"
    >
      {{ codePointError }}
    </span>

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
import { computed, onMounted, onUnmounted, ref, shallowRef, watch } from 'vue'

import { useI18n } from 'vue-i18n'

import {
  characterFromCodePoint,
  isCJKChar,
  normalizeCodePointHex,
} from '@/utils/charUtils'
import { useToggle } from '@vueuse/core'

import PixelPreview from './GlyphManager/PixelPreview.vue'

const { t: $t } = useI18n()

type SaveStatus = 'saved' | 'saving' | 'unsaved' | 'error'

const props = defineProps<{
  modelValue: string
  hexValue: string
  width: number
  browserPreviewFont: string
  saveStatus: SaveStatus
  saveStatusLabel: string
}>()

const emit = defineEmits(['update:model-value'])

const localModelValue = ref(props.modelValue)
const codePointError = computed(() => {
  if (localModelValue.value === props.modelValue) return null
  return normalizeCodePointHex(localModelValue.value) === null
    ? $t('glyph_editor.invalid_code_point')
    : null
})

watch(
  () => props.modelValue,
  (value) => {
    localModelValue.value = value
  },
)

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
  if (value.length > 6) {
    value = value.slice(0, 6)
  }
  localModelValue.value = value
}

const commitCodePoint = () => {
  const normalized = normalizeCodePointHex(localModelValue.value)
  if (normalized === null) return
  localModelValue.value = normalized
  if (normalized !== props.modelValue) emit('update:model-value', normalized)
}

const revertCodePoint = () => {
  localModelValue.value = props.modelValue
}

const previewStyle = computed(() => ({
  fontFamily: props.browserPreviewFont,
}))

const previewCharacter = computed(
  () => characterFromCodePoint(parseInt(props.modelValue || '0000', 16)) ?? '�',
)

const ziToolsUrl = computed(() => {
  const codePoint = parseInt(props.modelValue || '0000', 16)
  const char = characterFromCodePoint(codePoint) ?? ''
  return `https://zi.tools/zi/${char}`
})

const showZiToolsLink = computed(() => {
  const codePoint = parseInt(props.modelValue || '0000', 16)
  const char = characterFromCodePoint(codePoint)
  if (char === null) return false
  return isCJKChar(char)
})

type IconvLiteModule = typeof import('iconv-lite')
const iconvLiteModule = shallowRef<IconvLiteModule | null>(null)
let iconvLoadPromise: Promise<IconvLiteModule | null> | null = null

const loadIconvLite = async (): Promise<IconvLiteModule | null> => {
  if (iconvLiteModule.value !== null) return iconvLiteModule.value
  iconvLoadPromise ??= import('iconv-lite')
    .then((module) => (iconvLiteModule.value = module))
    .catch(() => null)
  return iconvLoadPromise
}

const convertEncoding = (char: string, encoding: string): string => {
  if (iconvLiteModule.value === null) return '—'
  try {
    const encoded = iconvLiteModule.value.encode(char, encoding)
    if (char === '?' && encoded.length === 1 && encoded[0] === 0x3f) {
      return '3F'
    }
    if (encoded.every((b: number) => b === 0x3f)) {
      return '—'
    }
    return Array.from(encoded as Uint8Array)
      .map((byte) => byte.toString(16).toUpperCase().padStart(2, '0'))
      .join(' ')
  } catch {
    return '—'
  }
}

const unicodeNameCache = ref<Record<number, string>>({})
type UnicodeNameLookup = (character: string) => string | undefined
type UnicodeNameModule = { unicodeName?: UnicodeNameLookup }
let unicodeNameModule: UnicodeNameModule | null = null

async function loadUnicodeModule() {
  if (unicodeNameModule) return
  try {
    const module = await import('unicode-name')
    unicodeNameModule = {
      unicodeName: module.unicodeName ?? module.default?.unicodeName,
    }
  } catch {
    unicodeNameModule = null
  }
}

async function ensureUnicodeNameFor(codePoint: number) {
  if (unicodeNameCache.value[codePoint] !== undefined) return
  try {
    await loadUnicodeModule()
    const lookup = unicodeNameModule?.unicodeName
    const character = characterFromCodePoint(codePoint)
    if (lookup && character !== null) {
      const name = lookup(character)
      if (Object.keys(unicodeNameCache.value).length >= 200) {
        unicodeNameCache.value = {}
      }
      unicodeNameCache.value[codePoint] = name || '—'
      return
    }
  } catch {}
  unicodeNameCache.value[codePoint] = '—'
}

const unicodeNameStr = computed(() => {
  const codePoint = parseInt(props.modelValue || '0000', 16)
  const cached = unicodeNameCache.value[codePoint]
  if (cached !== undefined) return cached
  return showingEncodingInfo.value ? 'Loading…' : '—'
})

watch(showingEncodingInfo, async (v) => {
  if (!v) return
  const codePoint = parseInt(props.modelValue || '0000', 16)
  await Promise.all([ensureUnicodeNameFor(codePoint), loadIconvLite()])
})

watch(
  () => props.modelValue,
  async (val) => {
    if (!showingEncodingInfo.value) return
    const codePoint = parseInt(val || '0000', 16)
    await ensureUnicodeNameFor(codePoint)
  },
)

const encodingInfo = computed(() => {
  const codePoint = parseInt(props.modelValue || '0000', 16)
  const char = characterFromCodePoint(codePoint)
  if (char === null) return {}

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
  width: 100%;
  min-width: 0;
  min-height: var(--control-height-compact);
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.glyph-preview {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 0.35rem;
  padding-inline-start: var(--space-2);
  border-inline-start: 1px solid var(--border-color);
}

.unicode-char {
  min-width: 1.5rem;
  font-size: 1.6rem;
  text-align: center;
  transition: none !important;
}

.glyph-width {
  color: var(--text-secondary);
  font-family: var(--monospace-font);
  font-size: 0.7rem;
  white-space: nowrap;
}

.code-point-input {
  display: flex;
  align-items: center;
  font-family: var(--monospace-font);
  color: var(--text-color);
  font-size: 1.05rem;
  font-weight: 600;
  background: var(--background-hover);
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  padding: 0.15rem 0.3rem;
}

.code-point-input span {
  padding: 0 0.2rem;
}

.code-point-input input {
  width: 4.2em;
  background: transparent;
  border: none;
  color: inherit;
  font-family: inherit;
  font-size: inherit;
  font-weight: inherit;
  outline: none;
  padding: 0.2rem 0.1rem;
}

.code-point-input:focus-within {
  border-color: var(--primary-color);
  background: var(--input-background);
}

.code-point-input input[aria-invalid='true'] {
  color: var(--danger-color);
}

.code-point-error {
  position: absolute;
  z-index: 51;
  top: calc(100% + 0.25rem);
  left: 0;
  max-width: min(24rem, calc(100vw - 2rem));
  padding: 0.4rem 0.55rem;
  border: 1px solid
    color-mix(in srgb, var(--danger-color) 40%, var(--border-color));
  border-radius: var(--radius-sm);
  background: var(--dialog-background);
  color: var(--danger-color);
  font-size: 0.75rem;
}

.zi-tools-link {
  flex: none;
}

.zi-tools-link:hover {
  background-color: var(--background-active);
}

.zi-tools-icon {
  width: 1.35rem;
  height: 1.35rem;
}

[data-theme='dark'] .zi-tools-icon {
  filter: invert(1);
}

.encoding-info-btn {
  flex: none;
  color: var(--text-secondary);
}

.encoding-info-btn:hover {
  background-color: var(--background-active);
}

.glyph-info-wrapper {
  position: relative;
  width: 100%;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.encoding-info-btn.active {
  background-color: var(--background-active);
}

.encoding-info-panel {
  position: absolute;
  z-index: 50;
  top: calc(100% + 0.45rem);
  left: 0;
  width: min(32rem, calc(100vw - 2rem));
  padding: var(--space-2);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  background: var(--dialog-background);
  box-shadow: 0 8px 24px var(--modal-shadow);
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-1);
}

.encoding-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.3rem 0.5rem;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
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
  font-family: var(--normal-font);
  font-weight: 700;
  padding: 0.3rem 0.5rem;
  margin-bottom: 0.3rem;
  border-bottom: 1px solid var(--border-color);
  text-align: center;
  grid-column: 1 / -1;
}

.document-status {
  min-width: 0;
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  margin-inline-start: auto;
  color: var(--text-secondary);
  font-size: 0.75rem;
  white-space: nowrap;
}

.document-status.saved {
  opacity: 0.72;
}

.document-status.saving,
.document-status.unsaved {
  color: var(--warning-text);
}

[data-theme='dark'] .document-status.saving,
[data-theme='dark'] .document-status.unsaved {
  color: #f3bf46;
}

.document-status.error {
  color: var(--danger-color);
  font-weight: 600;
}

.status-icon {
  flex: none;
  font-size: 1rem;
}

.status-icon-spinning {
  animation: status-spin 1.2s linear infinite;
}

@keyframes status-spin {
  to {
    rotate: 1turn;
  }
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

@media (max-width: 719px) {
  .current-glyph-info {
    gap: 0.3rem;
  }

  .encoding-info-panel {
    width: calc(100vw - 2rem);
    grid-template-columns: 1fr;
  }

  .glyph-preview {
    padding-inline-start: 0.3rem;
  }

  .unicode-char {
    font-size: 1.35rem;
  }

  .glyph-width {
    display: none;
  }

  .document-status {
    font-size: 0.7rem;
  }
}

@media (max-width: 374px) {
  .glyph-preview :deep(.pixel-preview) {
    display: none;
  }

  .document-status span {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .status-icon-spinning {
    animation: none;
  }
}
</style>
