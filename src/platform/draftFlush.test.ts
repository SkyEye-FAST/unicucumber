import { afterEach, describe, expect, it, vi } from 'vitest'

import { flushPendingDrafts, registerDraftFlusher } from './draftFlush'

const unregisters: Array<() => void> = []

afterEach(() => {
  unregisters.splice(0).forEach((unregister) => unregister())
})

describe('flushPendingDrafts', () => {
  it('runs every registered flusher before reporting a failure', async () => {
    const failure = new Error('quota')
    const healthy = vi.fn().mockResolvedValue(undefined)
    unregisters.push(
      registerDraftFlusher(() => Promise.reject(failure)),
      registerDraftFlusher(healthy),
    )

    await expect(flushPendingDrafts()).rejects.toBe(failure)
    expect(healthy).toHaveBeenCalledOnce()
  })

  it('skips flushers after they unregister', async () => {
    const flusher = vi.fn().mockResolvedValue(undefined)
    registerDraftFlusher(flusher)()

    await flushPendingDrafts()
    expect(flusher).not.toHaveBeenCalled()
  })
})
