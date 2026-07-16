type DraftFlusher = () => Promise<void>

const flushers = new Set<DraftFlusher>()

export const registerDraftFlusher = (flusher: DraftFlusher): (() => void) => {
  flushers.add(flusher)
  return () => flushers.delete(flusher)
}

export const flushPendingDrafts = async (): Promise<void> => {
  const results = await Promise.allSettled(
    [...flushers].map((flush) => flush()),
  )
  const failure = results.find(
    (result): result is PromiseRejectedResult => result.status === 'rejected',
  )
  if (failure) throw failure.reason
}
