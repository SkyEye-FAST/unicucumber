<template>
  <nav class="mobile-command-bar" :aria-label="$t('mobile_toolbar.label')">
    <button
      v-for="tool in primaryTools"
      :key="tool.id"
      type="button"
      :class="{ active: currentTool === tool.id }"
      :aria-label="$t(tool.label)"
      @click="emit('tool', tool.id)"
    >
      <i-material-symbols-draw-outline v-if="tool.id === 'draw'" class="icon" />
      <i-material-symbols-ink-eraser-outline
        v-else-if="tool.id === 'erase'"
        class="icon"
      />
      <i-material-symbols-select v-else class="icon" />
      <span>{{ $t(tool.label) }}</span>
    </button>
    <button
      type="button"
      :disabled="!canUndo"
      :aria-label="$t('editor.actions.undo.title')"
      @click="emit('undo')"
    >
      <i-material-symbols-undo class="icon" />
      <span>{{ $t('mobile_toolbar.undo') }}</span>
    </button>
    <button
      type="button"
      :disabled="!canRedo"
      :aria-label="$t('editor.actions.redo.title')"
      @click="emit('redo')"
    >
      <i-material-symbols-redo class="icon" />
      <span>{{ $t('mobile_toolbar.redo') }}</span>
    </button>
    <button
      type="button"
      :class="{ active: showMore }"
      :aria-expanded="showMore"
      :aria-label="$t('tools.more')"
      @click="showMore = !showMore"
    >
      <i-material-symbols-more-horiz class="icon" />
      <span>{{ $t('tools.more') }}</span>
    </button>

    <div v-if="showMore" class="mobile-tool-sheet">
      <div class="sheet-header">
        <strong>{{ $t('mobile_toolbar.more_actions') }}</strong>
        <button
          type="button"
          :aria-label="$t('mobile_toolbar.close')"
          @click="showMore = false"
        >
          <i-material-symbols-close class="icon" />
        </button>
      </div>
      <div class="sheet-grid">
        <button
          v-for="tool in secondaryTools"
          :key="tool.id"
          type="button"
          :class="{ active: currentTool === tool.id }"
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
          <i-material-symbols-pan-tool-outline v-else class="icon" />
          {{ $t(tool.label) }}
        </button>
        <button
          type="button"
          :disabled="!hasClipboardData"
          @click="chooseAction('paste')"
        >
          <i-material-symbols-content-paste class="icon" />{{
            $t('selection.confirm_paste')
          }}
        </button>
        <button type="button" @click="chooseAction('invert')">
          <i-material-symbols-invert-colors class="icon" />{{
            $t('tools.invert')
          }}
        </button>
        <button type="button" @click="chooseAction('flipHorizontal')">
          <i-material-symbols-flip class="icon" />{{
            $t('tools.flip_horizontal')
          }}
        </button>
        <button type="button" @click="chooseAction('flipVertical')">
          <i-material-symbols-flip class="icon vertical" />{{
            $t('tools.flip_vertical')
          }}
        </button>
        <button type="button" @click="chooseAction('restore')">
          <i-material-symbols-restore-page-outline class="icon" />{{
            $t('editor.actions.restore.button')
          }}
        </button>
        <button
          v-for="direction in shiftDirections"
          :key="direction"
          type="button"
          @click="chooseAction(`shift-${direction}`)"
        >
          <i-material-symbols-arrow-upward
            v-if="direction === 'up'"
            class="icon"
          />
          <i-material-symbols-arrow-downward
            v-else-if="direction === 'down'"
            class="icon"
          />
          <i-material-symbols-arrow-back
            v-else-if="direction === 'left'"
            class="icon"
          />
          <i-material-symbols-arrow-forward v-else class="icon" />
          {{ $t(`tools.shift_${direction}`) }}
        </button>
        <button class="danger" type="button" @click="chooseAction('clear')">
          <i-material-symbols-mop-outline class="icon" />{{
            $t('editor.actions.clear.button')
          }}
        </button>
      </div>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'

import type { MobileAction, ShiftDirection } from '@/types/editor'
import type { EditorTool } from '@/types/glyph'

defineProps<{
  currentTool: EditorTool
  canUndo: boolean
  canRedo: boolean
  hasClipboardData: boolean
}>()

const emit = defineEmits<{
  tool: [tool: EditorTool]
  undo: []
  redo: []
  action: [action: MobileAction]
}>()

const { t: $t } = useI18n()
const showMore = ref(false)
const primaryTools = [
  { id: 'draw', label: 'tools.draw' },
  { id: 'erase', label: 'tools.erase' },
  { id: 'select', label: 'tools.select' },
] satisfies Array<{ id: EditorTool; label: string }>
const secondaryTools = [
  { id: 'fill', label: 'tools.fill' },
  { id: 'line', label: 'tools.line' },
  { id: 'rectangle', label: 'tools.rectangle' },
  { id: 'filledRectangle', label: 'tools.filled_rectangle' },
  { id: 'pan', label: 'tools.pan' },
] satisfies Array<{ id: EditorTool; label: string }>
const shiftDirections: ShiftDirection[] = ['up', 'down', 'left', 'right']
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

@media (max-width: 720px), (pointer: coarse) {
  .mobile-command-bar {
    position: fixed;
    z-index: 60;
    right: 0;
    bottom: 0;
    left: 0;
    min-height: calc(4rem + env(safe-area-inset-bottom));
    display: grid;
    grid-template-columns: repeat(6, minmax(0, 1fr));
    padding: 0.25rem max(0.35rem, env(safe-area-inset-right))
      env(safe-area-inset-bottom) max(0.35rem, env(safe-area-inset-left));
    border-top: 1px solid var(--border-color);
    background: var(--background-light);
    box-shadow: 0 -2px 10px var(--modal-overlay);
  }

  .mobile-command-bar > button {
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

  .mobile-command-bar > button:disabled {
    opacity: 0.4;
  }

  .mobile-command-bar .icon {
    font-size: 1.35rem;
  }

  .mobile-tool-sheet {
    position: absolute;
    right: max(0.5rem, env(safe-area-inset-right));
    bottom: calc(100% + 0.4rem);
    left: max(0.5rem, env(safe-area-inset-left));
    max-height: min(70dvh, 34rem);
    overflow: auto;
    padding: 0.7rem;
    border: 1px solid var(--border-color);
    border-radius: 6px;
    background: var(--background-light);
    box-shadow: 0 4px 18px var(--modal-overlay);
  }

  .sheet-header {
    position: sticky;
    top: -0.7rem;
    z-index: 1;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.4rem 0;
    background: var(--background-light);
  }

  .sheet-header button,
  .sheet-grid button {
    min-height: 44px;
    border: 1px solid var(--border-color);
    border-radius: 4px;
    background: var(--background-base);
    color: var(--text-color);
  }

  .sheet-header button {
    min-width: 44px;
  }

  .sheet-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.4rem;
  }

  .sheet-grid button {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    gap: 0.5rem;
    padding: 0.5rem 0.65rem;
    font-family: var(--normal-font);
  }

  .sheet-grid button.active {
    border-color: var(--primary-color);
    background: var(--primary-color);
    color: white;
  }

  .sheet-grid button.danger {
    color: var(--danger-color);
  }

  .vertical {
    rotate: 90deg;
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
