import { readonly, ref } from 'vue'

export type NotificationTone = 'info' | 'success' | 'warning' | 'error'
export type NotificationKind = 'default' | 'update'

export interface AppNotification {
  id: number
  message: string
  tone: NotificationTone
  kind?: NotificationKind
  actionLabel?: string
  action?: () => void
}

const notifications = ref<AppNotification[]>([])
let nextId = 1

export function useNotifications() {
  const dismiss = (id: number): void => {
    notifications.value = notifications.value.filter(
      (notification) => notification.id !== id,
    )
  }

  const notify = (
    notification: Omit<AppNotification, 'id'>,
    timeout = notification.tone === 'error' ? 8000 : 4500,
  ): number => {
    const id = nextId++
    notifications.value.push({ ...notification, id })
    if (timeout > 0) window.setTimeout(() => dismiss(id), timeout)
    return id
  }

  return {
    notifications: readonly(notifications),
    notify,
    dismiss,
  }
}
