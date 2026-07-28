import { readonly, ref } from 'vue'

type PwaUpdateChecker = () => Promise<void>

const checking = ref(false)
let checker: PwaUpdateChecker | null = null

export const isCheckingPwaUpdates = readonly(checking)

export const registerPwaUpdateChecker = (
  nextChecker: PwaUpdateChecker,
): (() => void) => {
  checker = nextChecker
  return () => {
    if (checker === nextChecker) checker = null
  }
}

export const checkForPwaUpdates = async (): Promise<void> => {
  if (!checker || checking.value) return
  checking.value = true
  try {
    await checker()
  } finally {
    checking.value = false
  }
}
