<template>
  <div v-if="!online" class="offline-indicator" role="status">
    <i-material-symbols-cloud-off-outline class="icon" />
    {{ $t('pwa.offline') }}
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import { registerSW } from 'virtual:pwa-register'

import { useNotifications } from '@/composables/useNotifications'
import { flushPendingDrafts } from '@/platform/draftFlush'

const { t: $t } = useI18n()
const { notify } = useNotifications()
const online = ref(navigator.onLine)
let updateServiceWorker: ((reloadPage?: boolean) => Promise<void>) | null = null

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

onMounted(() => {
  window.addEventListener('online', updateOnlineState)
  window.addEventListener('offline', updateOnlineState)
  if (import.meta.env.PROD) {
    updateServiceWorker = registerSW({
      immediate: true,
      onNeedRefresh() {
        notify(
          {
            tone: 'info',
            kind: 'update',
            message: $t('pwa.update_ready'),
            actionLabel: $t('pwa.apply_update'),
            action: () => void applyUpdate(),
          },
          0,
        )
      },
      onOfflineReady() {
        notify({ tone: 'success', message: $t('pwa.offline_ready') })
      },
      onRegisterError(error) {
        console.error('Service worker registration failed.', error)
        notify({ tone: 'error', message: $t('pwa.registration_failed') })
      },
    })
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('online', updateOnlineState)
  window.removeEventListener('offline', updateOnlineState)
})
</script>

<style scoped>
.offline-indicator {
  position: fixed;
  z-index: 55;
  right: max(0.6rem, env(safe-area-inset-right));
  bottom: calc(0.6rem + env(safe-area-inset-bottom));
  min-height: 36px;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.35rem 0.6rem;
  border-radius: 4px;
  background: var(--warning-background);
  color: var(--warning-text);
  box-shadow: 0 2px 8px var(--modal-overlay);
}

@media (max-width: 719px) {
  .offline-indicator {
    bottom: calc(4.7rem + env(safe-area-inset-bottom));
  }
}
</style>
