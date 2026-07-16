<template>
  <div class="notification-region" aria-live="polite" aria-atomic="false">
    <article
      v-for="notification in notifications"
      :key="notification.id"
      class="notification"
      :class="notification.tone"
      role="status"
    >
      <span>{{ notification.message }}</span>
      <button
        v-if="notification.action && notification.actionLabel"
        type="button"
        @click="runAction(notification)"
      >
        {{ notification.actionLabel }}
      </button>
      <button
        class="dismiss"
        type="button"
        :aria-label="$t('notifications.dismiss')"
        @click="dismiss(notification.id)"
      >
        <i-material-symbols-close />
      </button>
    </article>
  </div>
</template>

<script setup lang="ts">
import {
  useNotifications,
  type AppNotification,
} from '@/composables/useNotifications'

const { notifications, dismiss } = useNotifications()

const runAction = (notification: AppNotification): void => {
  notification.action?.()
  dismiss(notification.id)
}
</script>

<style scoped>
.notification-region {
  position: fixed;
  z-index: 2000;
  top: max(0.75rem, env(safe-area-inset-top));
  right: max(0.75rem, env(safe-area-inset-right));
  width: min(24rem, calc(100vw - 1.5rem));
  display: grid;
  gap: 0.5rem;
  pointer-events: none;
}

.notification {
  min-height: 44px;
  display: flex;
  align-items: center;
  gap: 0.55rem;
  padding: 0.65rem;
  border: 1px solid var(--border-color);
  border-left: 4px solid var(--info-color);
  border-radius: 4px;
  background: var(--background-light);
  color: var(--text-color);
  box-shadow: 0 3px 12px var(--modal-overlay);
  pointer-events: auto;
}

.notification.success {
  border-left-color: var(--primary-color);
}

.notification.warning {
  border-left-color: var(--warning-color);
}

.notification.error {
  border-left-color: var(--danger-color);
}

.notification span {
  flex: 1;
}

.notification button {
  min-height: 36px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background: var(--background-base);
  color: var(--text-color);
}

.notification .dismiss {
  min-width: 36px;
}
</style>
