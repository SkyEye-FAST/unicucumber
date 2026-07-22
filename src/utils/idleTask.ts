export interface IdleTaskOptions {
  timeout?: number
  fallbackDelay?: number
}

export const scheduleIdleTask = (
  task: () => void,
  options: IdleTaskOptions = {},
): (() => void) => {
  const timeout = options.timeout ?? 1_500
  const fallbackDelay = options.fallbackDelay ?? 32
  if (typeof window === 'undefined') return () => undefined

  const idleWindow = window as Window & {
    requestIdleCallback?: (
      callback: () => void,
      options: { timeout: number },
    ) => number
    cancelIdleCallback?: (id: number) => void
  }
  if (typeof idleWindow.requestIdleCallback === 'function') {
    const id = idleWindow.requestIdleCallback(task, { timeout })
    return () => idleWindow.cancelIdleCallback?.(id)
  }

  const id = globalThis.setTimeout(task, fallbackDelay)
  return () => globalThis.clearTimeout(id)
}
