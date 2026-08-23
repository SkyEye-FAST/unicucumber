<template>
  <nav
    class="mobile-command-bar"
    :class="{ 'mobile-command-bar--more': showMore }"
    :aria-label="$t('mobile_toolbar.label')"
  >
    <template v-if="!showMore">
      <button
        v-for="tool in primaryTools"
        :key="tool.id"
        type="button"
        :class="[
          'toolbar-tool',
          `toolbar-tool--${tool.id}`,
          { active: currentTool === tool.id },
        ]"
        :aria-label="$t(tool.label)"
        @click="emit('tool', tool.id)"
      >
        <i-material-symbols-draw-outline
          v-if="tool.id === 'draw'"
          class="icon"
        />
        <i-material-symbols-ink-eraser-outline
          v-else-if="tool.id === 'erase'"
          class="icon"
        />
        <i-material-symbols-select
          v-else-if="tool.id === 'select'"
          class="icon"
        />
        <i-material-symbols-pan-tool-outline v-else class="icon" />
        <span>{{ $t(tool.label) }}</span>
      </button>
      <button
        class="toolbar-action toolbar-action--paste"
        type="button"
        :disabled="!hasClipboardData"
        :aria-label="$t('selection.confirm_paste')"
        @click="emit('action', 'paste')"
      >
        <i-material-symbols-content-paste class="icon" />
        <span>{{ $t('selection.confirm_paste') }}</span>
      </button>
      <button
        class="more-toggle"
        type="button"
        :aria-expanded="showMore"
        :aria-label="$t('tools.more')"
        @click="showMore = true"
      >
        <i-material-symbols-more-horiz class="icon" />
        <span>{{ $t('tools.more') }}</span>
      </button>
    </template>

    <template v-else>
      <div class="more-rail">
        <button
          class="more-action more-action--paste"
          type="button"
          :disabled="!hasClipboardData"
          :aria-label="$t('selection.confirm_paste')"
          @click="chooseAction('paste')"
        >
          <i-material-symbols-content-paste class="icon" />
          <span>{{ $t('selection.confirm_paste') }}</span>
        </button>
        <button
          v-for="tool in secondaryTools"
          :key="tool.id"
          class="more-action"
          type="button"
          :aria-label="$t(tool.label)"
          @click="chooseTool(tool.id)"
        >
          <i-material-symbols-format-color-fill
            v-if="tool.id === 'fill'"
            class="icon"
          />
          <i-material-symbols-diagonal-line
            v-else-if="tool.id === 'line'"
            class="icon"
          />
          <i-material-symbols-rectangle-outline
            v-else-if="tool.id === 'rectangle'"
            class="icon"
          />
          <i-material-symbols-rectangle
            v-else-if="tool.id === 'filledRectangle'"
            class="icon"
          />
          <span>{{ $t(tool.label) }}</span>
        </button>
        <button
          class="more-action"
          type="button"
          :aria-label="$t('tools.invert')"
          @click="chooseAction('invert')"
        >
          <i-material-symbols-invert-colors class="icon" />
          <span>{{ $t('tools.invert') }}</span>
        </button>
        <button
          class="more-action"
          type="button"
          :aria-label="$t('tools.flip_horizontal')"
          @click="chooseAction('flipHorizontal')"
        >
          <i-material-symbols-flip class="icon" />
          <span>{{ $t('tools.flip_horizontal') }}</span>
        </button>
        <button
          class="more-action"
          type="button"
          :aria-label="$t('tools.flip_vertical')"
          @click="chooseAction('flipVertical')"
        >
          <i-material-symbols-flip class="icon vertical" />
          <span>{{ $t('tools.flip_vertical') }}</span>
        </button>
        <button
          class="more-action"
          type="button"
          :aria-label="$t('editor.actions.restore.button')"
          @click="chooseAction('restore')"
        >
          <i-material-symbols-restore-page-outline class="icon" />
          <span>{{ $t('editor.actions.restore.button') }}</span>
        </button>
      </div>
      <button
        class="more-toggle more-toggle--close"
        type="button"
        :aria-label="$t('mobile_toolbar.close_short')"
        @click="showMore = false"
      >
        <i-material-symbols-close class="icon" />
        <span>{{ $t('mobile_toolbar.close_short') }}</span>
      </button>
    </template>
  </nav>
</template>

<script setup lang="ts">
import { ref } from 'vue'

import { useI18n } from 'vue-i18n'

import type { MobileAction } from '@/types/editor'
import type { EditorTool } from '@/types/glyph'

defineProps<{
  currentTool: EditorTool
  hasClipboardData: boolean
}>()

const emit = defineEmits<{
  tool: [tool: EditorTool]
  action: [action: MobileAction]
}>()

const { t: $t } = useI18n()
const showMore = ref(false)
const primaryTools = [
  { id: 'draw', label: 'tools.draw' },
  { id: 'erase', label: 'tools.erase' },
  { id: 'select', label: 'tools.select' },
  { id: 'pan', label: 'tools.pan' },
] satisfies Array<{ id: EditorTool; label: string }>
const secondaryTools = [
  { id: 'fill', label: 'tools.fill' },
  { id: 'line', label: 'tools.line' },
  { id: 'rectangle', label: 'tools.rectangle' },
  { id: 'filledRectangle', label: 'tools.filled_rectangle' },
] satisfies Array<{ id: EditorTool; label: string }>

const chooseTool = (tool: EditorTool): void => {
  emit('tool', tool)
  showMore.value = false
}

const chooseAction = (action: MobileAction): void => {
  emit('action', action)
  showMore.value = false
}
</script>

<style scoped>
.mobile-command-bar {
  display: none;
}

@media (max-width: 719px) {
  .mobile-command-bar {
    position: fixed;
    z-index: 60;
    right: 0;
    bottom: 0;
    left: 0;
    min-height: calc(4rem + env(safe-area-inset-bottom));
    display: flex;
    gap: 0.25rem;
    padding: 0.25rem 0 env(safe-area-inset-bottom)
      max(0.35rem, env(safe-area-inset-left));
    border-top: 1px solid var(--border-color);
    background: var(--background-light);
    box-shadow: 0 -2px 10px var(--modal-overlay);
  }

  .mobile-command-bar > button {
    flex: 1 1 0;
    min-width: 44px;
    min-height: 52px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.1rem;
    padding: 0.2rem;
    border: 1px solid transparent;
    border-radius: 4px;
    background: transparent;
    color: var(--text-color);
    font-family: var(--normal-font);
    font-size: 0.68rem;
  }

  .mobile-command-bar > button.active {
    background: var(--primary-color);
    color: white;
  }

  .mobile-command-bar > button.toolbar-action--paste {
    display: none;
  }

  .mobile-command-bar > button:disabled {
    opacity: 0.4;
  }

  .mobile-command-bar .icon {
    font-size: 1.35rem;
  }

  .more-toggle {
    flex: 0 0 3.75rem !important;
    min-width: 3.75rem !important;
    margin-left: auto;
    margin-top: -0.25rem;
    margin-right: 0;
    margin-bottom: calc(-0.25rem - env(safe-area-inset-bottom));
    align-self: stretch;
    padding-right: max(0.35rem, env(safe-area-inset-right)) !important;
    border: 0 !important;
    border-radius: 0 !important;
    background: color-mix(
      in srgb,
      var(--primary-color) 24%,
      var(--background-base)
    ) !important;
    color: var(--primary-color) !important;
    font-weight: 700;
  }

  .more-toggle--close {
    background: color-mix(
      in srgb,
      var(--danger-color) 20%,
      var(--background-base)
    ) !important;
    color: var(--danger-color) !important;
  }

  .mobile-command-bar--more {
    gap: 0;
  }

  .more-rail {
    min-width: 0;
    flex: 1 1 auto;
    display: flex;
    align-items: center;
    gap: 0.25rem;
    overflow-x: auto;
    overscroll-behavior-x: contain;
    scrollbar-width: none;
  }

  .more-rail::-webkit-scrollbar {
    display: none;
  }

  .more-action {
    flex: 0 0 4.75rem;
    min-width: 4.75rem;
    min-height: 52px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.1rem;
    padding: 0.2rem;
    border: 1px solid transparent;
    border-radius: 4px;
    background: transparent;
    color: var(--text-color);
    font-family: var(--normal-font);
    font-size: 0.68rem;
  }

  .more-action:active {
    background: var(--background-hover);
  }

  .vertical {
    rotate: 90deg;
  }
}

@media (min-width: 360px) and (max-width: 719px) {
  .mobile-command-bar > button.toolbar-action--paste {
    display: flex;
  }

  .more-action--paste {
    display: none;
  }
}

@media (max-height: 520px) and (max-width: 920px) {
  .mobile-command-bar {
    min-height: calc(3.25rem + env(safe-area-inset-bottom));
  }

  .mobile-command-bar > button {
    min-height: 44px;
  }

  .mobile-command-bar > button span {
    display: none;
  }
}
</style>
