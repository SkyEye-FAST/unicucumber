import { beforeEach, describe, expect, it, vi } from 'vitest'

const repository = vi.hoisted(() => ({
  load: vi.fn(),
  save: vi.fn(),
  clear: vi.fn(),
}))

vi.mock('@/storage/localPreviewFontRepository', () => ({
  getLocalPreviewFontRepository: () => repository,
}))

import {
  __resetLocalPreviewFontForTests,
  createPreviewFontStack,
  importLocalPreviewFont,
  LOCAL_PREVIEW_FONT_FAMILY,
  removeLocalPreviewFont,
  useLocalPreviewFont,
} from './useLocalPreviewFont'

class TestFontFace {
  constructor(
    readonly family: string,
    readonly source: BufferSource,
  ) {}

  async load(): Promise<TestFontFace> {
    return this
  }
}

describe('local preview font', () => {
  const add = vi.fn()
  const remove = vi.fn()

  beforeEach(() => {
    repository.load.mockReset().mockResolvedValue(null)
    repository.save.mockReset().mockResolvedValue(undefined)
    repository.clear.mockReset().mockResolvedValue(undefined)
    add.mockReset()
    remove.mockReset()
    vi.stubGlobal('FontFace', TestFontFace)
    Object.defineProperty(document, 'fonts', {
      configurable: true,
      value: { add, delete: remove },
    })
    __resetLocalPreviewFontForTests()
  })

  it('prepends the local family without changing the fallback stack', () => {
    expect(createPreviewFontStack('"Noto Sans", sans-serif', false)).toBe(
      '"Noto Sans", sans-serif',
    )
    expect(createPreviewFontStack('"Noto Sans", sans-serif', true)).toBe(
      `"${LOCAL_PREVIEW_FONT_FAMILY}", "Noto Sans", sans-serif`,
    )
  })

  it('loads, persists, and activates an imported font', async () => {
    const file = new File([new Uint8Array([1, 2, 3])], 'preview.ttf', {
      type: 'font/ttf',
    })
    const state = useLocalPreviewFont()

    await expect(importLocalPreviewFont(file)).resolves.toEqual({
      persisted: true,
    })
    expect(repository.save).toHaveBeenCalledOnce()
    expect(add).toHaveBeenCalledOnce()
    expect(state.localPreviewFontName.value).toBe('preview.ttf')
    expect(state.localPreviewFontActive.value).toBe(true)
    expect(state.effectivePreviewFont(() => 'system-ui').value).toBe(
      `"${LOCAL_PREVIEW_FONT_FAMILY}", system-ui`,
    )
  })

  it('rejects unsupported files before touching storage', async () => {
    const file = new File([new Uint8Array([1])], 'preview.txt', {
      type: 'text/plain',
    })
    await expect(importLocalPreviewFont(file)).rejects.toBeInstanceOf(TypeError)
    expect(repository.save).not.toHaveBeenCalled()
    expect(add).not.toHaveBeenCalled()
  })

  it('deactivates and removes the persisted font', async () => {
    const file = new File([new Uint8Array([1])], 'preview.woff2', {
      type: 'font/woff2',
    })
    const state = useLocalPreviewFont()
    await importLocalPreviewFont(file)
    await removeLocalPreviewFont()

    expect(repository.clear).toHaveBeenCalled()
    expect(remove).toHaveBeenCalled()
    expect(state.localPreviewFontActive.value).toBe(false)
    expect(state.localPreviewFontName.value).toBeNull()
  })
})
