<template>
  <div class="notification-region" aria-live="polite" aria-atomic="false">
    <article
      v-for="notification in notifications"
      :key="notification.id"
      class="notification"
      :class="[
        notification.tone,
        `notification--${notification.kind ?? 'default'}`,
      ]"
      role="status"
    >
      <span class="notification-message">{{ notification.message }}</span>
      <button
        v-if="notification.action && notification.actionLabel"
        class="ui-button ui-button--primary notification-action"
        type="button"
        @click="runAction(notification)"
      >
        {{ notification.actionLabel }}
      </button>
      <button
        class="ui-icon-button ui-button--quiet dismiss"
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
  min-height: 3.5rem;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  align-items: center;
  gap: var(--space-2);
  box-sizing: border-box;
  padding: var(--space-2);
  border: 1px solid var(--border-color);
  border-left: 3px solid var(--info-color);
  border-radius: var(--radius-md);
  background: var(--dialog-background);
  color: var(--text-color);
  box-shadow: 0 8px 20px var(--modal-shadow);
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

.notification--update {
  border-color: color-mix(
    in srgb,
    var(--primary-color) 45%,
    var(--dialog-border)
  );
  border-left-color: var(--primary-color);
  background: var(--dialog-background);
}

.notification-message {
  flex: 1;
  line-height: 1.45;
}

.notification-action {
  flex: 0 0 auto;
}

.notification .dismiss {
  flex: 0 0 auto;
}

@media (max-width: 480px) {
  .notification {
    grid-template-columns: minmax(0, 1fr) auto;
  }

  .notification-action {
    grid-column: 1 / -1;
    width: 100%;
  }
}
</style>
