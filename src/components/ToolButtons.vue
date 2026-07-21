<template>
  <div class="tool-buttons" role="toolbar" :aria-label="$t('tools.toolbar')">
    <button
      v-for="tool in primaryTools"
      :key="tool.id"
      type="button"
      class="tool-button"
      :class="{ active: currentTool === tool.id }"
      :title="`${$t(tool.label)} (${tool.shortcut})`"
      :aria-label="$t(tool.label)"
      @click="updateTool(tool.id)"
    >
      <i-material-symbols-draw-outline v-if="tool.id === 'draw'" class="icon" />
      <i-material-symbols-ink-eraser-outline
        v-else-if="tool.id === 'erase'"
        class="icon"
      />
      <i-material-symbols-select v-else class="icon" />
    </button>

    <details class="tool-overflow">
      <summary
        class="tool-button"
        :class="{
          active: secondaryTools.some((tool) => tool.id === currentTool),
        }"
        :aria-label="$t('tools.more')"
        :title="$t('tools.more')"
      >
        <i-material-symbols-more-horiz class="icon" />
      </summary>
      <div class="tool-sheet">
        <div
          class="tool-sheet-group"
          role="group"
          :aria-label="$t('tools.secondary')"
        >
          <button
            v-for="tool in secondaryTools"
            :key="tool.id"
            type="button"
            :class="{ active: currentTool === tool.id }"
            :title="`${$t(tool.label)} (${tool.shortcut})`"
            @click="updateTool(tool.id)"
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
        </div>
        <div
          class="tool-sheet-group"
          role="group"
          :aria-label="$t('tools.transforms')"
        >
          <button type="button" @click="emit('command', { type: 'invert' })">
            <i-material-symbols-invert-colors class="icon" />{{
              $t('tools.invert')
            }}
          </button>
          <button
            type="button"
            @click="emit('command', { type: 'flipHorizontal' })"
          >
            <i-material-symbols-flip class="icon" />{{
              $t('tools.flip_horizontal')
            }}
          </button>
          <button
            type="button"
            @click="emit('command', { type: 'flipVertical' })"
          >
            <i-material-symbols-flip class="icon vertical" />{{
              $t('tools.flip_vertical')
            }}
          </button>
          <button
            v-for="direction in shiftDirections"
            :key="direction"
            type="button"
            @click="emit('command', { type: 'shiftGrid', direction })"
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
        </div>
      </div>
    </details>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'

import type { EditorCommand, ShiftDirection } from '@/types/editor'
import type { EditorTool } from '@/types/glyph'

interface Props {
  modelValue: number
  currentTool: EditorTool
  disabled?: boolean
  enableSelection?: boolean
  drawMode?: 'singleButtonDraw' | 'doubleButtonDraw'
  currentDrawValue?: number
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
  enableSelection: true,
  drawMode: 'singleButtonDraw',
  currentDrawValue: undefined,
})

const emit = defineEmits<{
  'update:modelValue': [value: number]
  'update:currentTool': [tool: EditorTool]
  command: [command: EditorCommand]
}>()

const { t: $t } = useI18n()

const primaryTools = [
  { id: 'draw', label: 'tools.draw', shortcut: 'P' },
  { id: 'erase', label: 'tools.erase', shortcut: 'E' },
  { id: 'select', label: 'tools.select', shortcut: 'S' },
] satisfies Array<{ id: EditorTool; label: string; shortcut: string }>

const secondaryTools = [
  { id: 'fill', label: 'tools.fill', shortcut: 'F' },
  { id: 'line', label: 'tools.line', shortcut: 'L' },
  { id: 'rectangle', label: 'tools.rectangle', shortcut: 'R' },
  {
    id: 'filledRectangle',
    label: 'tools.filled_rectangle',
    shortcut: 'Shift+R',
  },
  { id: 'pan', label: 'tools.pan', shortcut: 'H' },
] satisfies Array<{ id: EditorTool; label: string; shortcut: string }>

const shiftDirections: ShiftDirection[] = ['up', 'down', 'left', 'right']
const updateTool = (tool: EditorTool): void => {
  if (props.disabled && (tool === 'draw' || tool === 'erase')) return
  emit('update:currentTool', tool)
  if (tool === 'draw') emit('update:modelValue', 1)
  else if (tool === 'erase') emit('update:modelValue', 0)
  else if (tool === 'select') emit('update:modelValue', 2)
}
</script>

<style scoped>
.tool-buttons {
  width: 100%;
  display: flex;
  margin: 0;
  position: relative;
}

.tool-button,
.tool-overflow > summary {
  min-width: var(--control-height);
  min-height: var(--control-height);
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
  padding: 0.45rem 0;
  border: 1px solid var(--border-color);
  border-inline-end-width: 0;
  background: var(--background-active);
  color: var(--text-color);
  cursor: pointer;
  list-style: none;
}

.tool-buttons > .tool-button:first-child {
  border-start-start-radius: var(--radius-sm);
  border-end-start-radius: var(--radius-sm);
}

.tool-overflow {
  display: flex;
  flex: 1;
}

.tool-overflow > summary {
  width: 100%;
  box-sizing: border-box;
  border-inline-end-width: 1px;
  border-start-end-radius: var(--radius-sm);
  border-end-end-radius: var(--radius-sm);
}

.tool-overflow > summary::-webkit-details-marker {
  display: none;
}

.tool-button.active,
.tool-overflow > summary.active {
  border-color: var(--primary-color);
  background: var(--primary-color);
  color: white;
}

.tool-button:hover:not(.active),
.tool-overflow > summary:hover:not(.active) {
  border-color: var(--border-hover);
  background: var(--background-hover);
}

.tool-sheet {
  width: min(32rem, calc(100vw - 1rem));
  position: absolute;
  z-index: 45;
  top: calc(100% + 0.35rem);
  right: 0;
  left: auto;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.6rem;
  padding: 0.6rem;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  background: var(--background-light);
  box-shadow: 0 4px 14px var(--modal-overlay);
}

.tool-overflow:not([open]) .tool-sheet {
  display: none;
}

.tool-sheet-group {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.25rem;
}

.tool-sheet button {
  min-height: 44px;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.45rem 0.65rem;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  background: var(--background-base);
  color: var(--text-color);
  font-family: var(--normal-font);
  cursor: pointer;
}

.tool-sheet button.active {
  border-color: var(--primary-color);
  background: var(--primary-color);
  color: white;
}

.vertical {
  rotate: 90deg;
}

@media (max-width: 719px) {
  .tool-buttons {
    display: none;
  }
}
</style>
