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
      <div class="notification-copy">
        <i-material-symbols-system-update-alt
          v-if="notification.kind === 'update'"
          class="notification-symbol update"
          aria-hidden="true"
        />
        <i-material-symbols-check-circle-outline
          v-else-if="notification.tone === 'success'"
          class="notification-symbol success"
          aria-hidden="true"
        />
        <i-material-symbols-warning-outline
          v-else-if="notification.tone === 'warning'"
          class="notification-symbol warning"
          aria-hidden="true"
        />
        <i-material-symbols-error-outline
          v-else-if="notification.tone === 'error'"
          class="notification-symbol error"
          aria-hidden="true"
        />
        <i-material-symbols-info-outline
          v-else
          class="notification-symbol info"
          aria-hidden="true"
        />
        <div>
          <strong v-if="notification.title" class="notification-title">
            {{ notification.title }}
          </strong>
          <p class="notification-message">{{ notification.message }}</p>
        </div>
      </div>
      <div class="notification-actions">
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
      </div>
    </article>
  </div>
</template>

<script setup lang="ts">
import {
  type AppNotification,
  useNotifications,
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
  min-height: 3.75rem;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
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
  border-width: 1px;
  border-color: color-mix(
    in srgb,
    var(--primary-color) 45%,
    var(--dialog-border)
  );
  border-left-color: var(--primary-color);
  background: color-mix(
    in srgb,
    var(--dialog-background) 94%,
    var(--primary-color)
  );
}

.notification-copy {
  min-width: 0;
  display: flex;
  align-items: flex-start;
  gap: 0.55rem;
}

.notification-symbol {
  flex: none;
  margin-top: 0.08rem;
  font-size: 1.15rem;
}

.notification-symbol.update,
.notification-symbol.success {
  color: var(--primary-color);
}

.notification-symbol.warning {
  color: var(--warning-color);
}

.notification-symbol.error {
  color: var(--danger-color);
}

.notification-symbol.info {
  color: var(--info-color);
}

.notification-title {
  display: block;
  color: var(--text-color);
  font-size: 0.875rem;
  font-weight: 750;
  line-height: 1.3;
}

.notification-message {
  margin: 0;
  color: var(--text-secondary);
  font-size: 0.8125rem;
  line-height: 1.45;
}

.notification-actions {
  flex: none;
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.notification-action {
  min-height: 2.25rem;
  padding-inline: 0.7rem;
  white-space: nowrap;
}

.notification .dismiss {
  width: 2.25rem;
  min-width: 2.25rem;
  height: 2.25rem;
  padding: 0;
}

@media (max-width: 480px) {
  .notification {
    padding: 0.65rem;
  }

  .notification-copy {
    gap: 0.45rem;
  }

  .notification--update {
    flex-direction: column;
  }

  .notification--update .notification-copy {
    width: 100%;
  }

  .notification--update .notification-actions {
    width: 100%;
  }

  .notification--update .notification-action {
    flex: 1;
  }

  .notification--update .dismiss {
    margin-left: auto;
  }
}
</style>
