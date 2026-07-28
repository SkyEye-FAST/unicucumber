<template>
  <div v-if="!online" class="offline-indicator" role="status">
    <i-material-symbols-cloud-off-outline class="icon" />
    {{ $t('pwa.offline') }}
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

import { registerSW } from 'virtual:pwa-register'
import { useI18n } from 'vue-i18n'

import { useNotifications } from '@/composables/useNotifications'
import { flushPendingDrafts } from '@/platform/draftFlush'
import { registerPwaUpdateChecker } from '@/platform/pwaUpdateCheck'

const { t: $t } = useI18n()
const { notify } = useNotifications()
const online = ref(navigator.onLine)
let updateServiceWorker: ((reloadPage?: boolean) => Promise<void>) | null = null
let registration: ServiceWorkerRegistration | null = null
let updateAvailable = false
let unregisterPwaUpdateChecker: (() => void) | null = null

const updateOnlineState = (): void => {
  online.value = navigator.onLine
  notify({
    tone: online.value ? 'success' : 'warning',
    message: online.value ? $t('pwa.online_again') : $t('pwa.offline'),
  })
}

const applyUpdate = async (): Promise<void> => {
  try {
    await flushPendingDrafts()
    await updateServiceWorker?.(true)
  } catch (error) {
    console.error(
      'Unable to preserve the draft before applying the update.',
      error,
    )
    notify({ tone: 'error', message: $t('pwa.update_failed') })
  }
}

const notifyUpdateAvailable = (): void => {
  if (updateAvailable) return
  updateAvailable = true
  notify(
    {
      tone: 'info',
      kind: 'update',
      title: $t('pwa.update_title'),
      message: $t('pwa.update_ready'),
      actionLabel: $t('pwa.apply_update'),
      action: () => void applyUpdate(),
    },
    0,
  )
}

const checkForUpdates = async (): Promise<void> => {
  if (!import.meta.env.PROD) {
    notify({ tone: 'warning', message: $t('pwa.update_check_unavailable') })
    return
  }
  if (!navigator.onLine) {
    notify({ tone: 'warning', message: $t('pwa.update_check_offline') })
    return
  }

  const activeRegistration =
    registration ?? (await navigator.serviceWorker.getRegistration())
  if (!activeRegistration) {
    notify({ tone: 'warning', message: $t('pwa.update_check_unavailable') })
    return
  }

  registration = activeRegistration
  updateAvailable = Boolean(activeRegistration.waiting)
  try {
    await activeRegistration.update()
  } catch (error) {
    console.error('Unable to check for a service worker update.', error)
    notify({ tone: 'error', message: $t('pwa.update_check_failed') })
    return
  }
  if (activeRegistration.waiting) {
    notifyUpdateAvailable()
  } else {
    notify({ tone: 'success', message: $t('pwa.update_not_found') })
  }
}

onMounted(() => {
  window.addEventListener('online', updateOnlineState)
  window.addEventListener('offline', updateOnlineState)
  unregisterPwaUpdateChecker = registerPwaUpdateChecker(checkForUpdates)
  if (import.meta.env.PROD) {
    updateServiceWorker = registerSW({
      immediate: true,
      onNeedRefresh() {
        notifyUpdateAvailable()
      },
      onOfflineReady() {
        notify({ tone: 'success', message: $t('pwa.offline_ready') })
      },
      onRegisterError(error) {
        console.error('Service worker registration failed.', error)
        notify({ tone: 'error', message: $t('pwa.registration_failed') })
      },
      onRegisteredSW(_swUrl, serviceWorkerRegistration) {
        registration = serviceWorkerRegistration ?? null
      },
    })
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('online', updateOnlineState)
  window.removeEventListener('offline', updateOnlineState)
  unregisterPwaUpdateChecker?.()
  unregisterPwaUpdateChecker = null
  registration = null
})
</script>

<style scoped>
.offline-indicator {
  position: fixed;
  z-index: 55;
  right: max(0.6rem, env(safe-area-inset-right));
  bottom: calc(0.6rem + env(safe-area-inset-bottom));
  min-height: 2.25rem;
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  box-sizing: border-box;
  padding: var(--space-2) var(--space-3);
  border: 1px solid
    color-mix(in srgb, var(--warning-color) 45%, var(--dialog-border));
  border-left: 3px solid var(--warning-color);
  border-radius: var(--radius-md);
  background: var(--dialog-background);
  color: var(--text-color);
  box-shadow: 0 8px 20px var(--modal-shadow);
  font-size: 0.8125rem;
  font-weight: 600;
}

.offline-indicator .icon {
  color: var(--warning-color);
  font-size: 1.15rem;
}

@media (max-width: 719px) {
  .offline-indicator {
    bottom: calc(4.7rem + env(safe-area-inset-bottom));
  }
}
</style>
