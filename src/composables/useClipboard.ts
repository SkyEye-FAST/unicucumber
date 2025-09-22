import { ref, readonly } from 'vue'
import type { SelectionData, Position } from './useSelection'

export interface ClipboardData {
  data: number[][]
  width: number
  height: number
  timestamp: number
}

/**
 * 剪贴板管理 Composable
 *
 * 提供复制、剪切、粘贴功能：
 * - 管理剪贴板数据
 * - 处理复制和剪切操作
 * - 处理粘贴操作和位置验证
 */
export function useClipboard() {
  const _clipboardData = ref<ClipboardData | null>(null)
  const _isPasteMode = ref(false)

  const clipboardData = readonly(_clipboardData)
  const isPasteMode = readonly(_isPasteMode)

  const hasClipboardData = () => _clipboardData.value !== null

  const copy = (selectionData: SelectionData): void => {
    _clipboardData.value = {
      data: selectionData.data.map((row) => [...row]),
      width: selectionData.width,
      height: selectionData.height,
      timestamp: Date.now(),
    }
  }

  const cut = (selectionData: SelectionData): void => {
    copy(selectionData)
  }

  const canPasteAt = (
    targetPos: Position,
    gridWidth: number,
    gridHeight: number,
  ): boolean => {
    if (!_clipboardData.value) return false

    const { width, height } = _clipboardData.value

    return (
      targetPos.row >= 0 &&
      targetPos.col >= 0 &&
      targetPos.row + height <= gridHeight &&
      targetPos.col + width <= gridWidth
    )
  }

  const getPasteData = (targetPos: Position) => {
    if (!_clipboardData.value) return null

    const { data, width, height } = _clipboardData.value

    return {
      data: data.map((row) => [...row]),
      targetRect: {
        startRow: targetPos.row,
        startCol: targetPos.col,
        endRow: targetPos.row + height - 1,
        endCol: targetPos.col + width - 1,
      },
      width,
      height,
    }
  }

  const enterPasteMode = (): boolean => {
    if (!_clipboardData.value) return false

    _isPasteMode.value = true
    return true
  }

  const exitPasteMode = (): void => {
    _isPasteMode.value = false
  }

  const clear = (): void => {
    _clipboardData.value = null
    _isPasteMode.value = false
  }

  const getClipboardInfo = () => {
    if (!_clipboardData.value) return null

    return {
      width: _clipboardData.value.width,
      height: _clipboardData.value.height,
      timestamp: _clipboardData.value.timestamp,
      isEmpty: _clipboardData.value.data.every((row) =>
        row.every((cell) => cell === 0),
      ),
    }
  }

  return {
    clipboardData,
    isPasteMode,

    hasClipboardData,
    copy,
    cut,
    canPasteAt,
    getPasteData,
    enterPasteMode,
    exitPasteMode,
    clear,
    getClipboardInfo,
  }
}
