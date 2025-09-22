<template>
  <div class="tool-buttons">
    <button
      :class="{
        active:
          props.drawMode === 'doubleButtonDraw'
            ? props.currentDrawValue === 1
            : currentTool === 'draw' && modelValue === 1,
      }"
      :disabled="disabled && currentTool !== 'select'"
      class="tool-button"
      @click="updateTool('draw', 1)"
    >
      <i-material-symbols-draw-outline class="icon" />
    </button>

    <button
      :class="{
        active:
          props.drawMode === 'doubleButtonDraw'
            ? props.currentDrawValue === 0
            : currentTool === 'erase' && modelValue === 0,
      }"
      :disabled="disabled && currentTool !== 'select'"
      class="tool-button"
      @click="updateTool('erase', 0)"
    >
      <i-material-symbols-ink-eraser-outline class="icon" />
    </button>

    <button
      v-if="enableSelection"
      :class="{ active: currentTool === 'select' }"
      class="tool-button"
      @click="updateTool('select', 2)"
    >
      <i-material-symbols-select class="icon" />
    </button>
  </div>
</template>

<script setup lang="ts">
import type { ToolType } from '@/composables/useSelection'

interface Props {
  modelValue: number
  currentTool: ToolType
  disabled?: boolean
  enableSelection?: boolean
  drawMode?: 'singleButtonDraw' | 'doubleButtonDraw'
  currentDrawValue?: number
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
  enableSelection: false,
  drawMode: 'singleButtonDraw',
  currentDrawValue: undefined,
})

const emit = defineEmits(['update:modelValue', 'update:currentTool'])

const updateTool = (tool: ToolType, value: number) => {
  if (props.disabled && tool !== 'select') {
    return
  }

  emit('update:currentTool', tool)
  emit('update:modelValue', value)
}
</script>

<style scoped>
.tool-buttons {
  display: flex;
  margin: 10px 0 15px 0;
  transition: none !important;
  width: 24rem;
}

.tool-button {
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 1.5em;
  padding: 7px 0;
  flex: 1;
  border: transparent 2px solid;
  background-color: var(--border-color);
  color: var(--text-color);
  cursor: pointer;
  transition: none !important;
}

.tool-button.active {
  background: var(--primary-color);
  color: white;
}

.tool-button:hover:not(.active) {
  background-color: var(--background-hover);
  border-color: var(--border-hover);
}

.tool-button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
  pointer-events: none;
}

@media (orientation: portrait) and (max-width: 768px) {
  .tool-buttons {
    width: 20rem;
    margin: 0.5rem 0 0.8rem;
  }

  .tool-button {
    padding: 7px 12px;
    min-width: 3.5em;
  }
}

@media (orientation: portrait) and (min-width: 768px) and (max-width: 1024px) {
  .tool-buttons {
    width: 40rem;
  }

  .tool-button {
    font-size: 2em;
    padding: 10px 20px;
    min-width: 4em;
  }
}

@media (orientation: portrait) and (min-width: 1024px) {
  .tool-buttons {
    margin: 1.2rem;
  }

  .tool-button {
    padding: 16px 24px;
    font-size: 3em;
    min-width: 4em;
  }

  .tool-button .icon {
    font-size: 1em !important;
  }
}
</style>
