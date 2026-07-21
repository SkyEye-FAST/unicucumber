import './styles/base.css'
import './styles/font.css'
import './styles/theme.css'

import { computed, createApp, watch } from 'vue'

import { createI18n } from 'vue-i18n'

import { usePreferredLanguages, useTitle } from '@vueuse/core'

import App from './App.vue'
import { useNotifications } from './composables/useNotifications'
import { disposeTheme, initializeTheme } from './composables/useTheme'
import en from './locales/en.json'
import { flushPendingDrafts } from './platform/draftFlush'
import zh_cn from './locales/zh-cn.json'
import zh_tw from './locales/zh-tw.json'
import { normalizeLocale, type SupportedLocale } from './utils/locale'

const languages = usePreferredLanguages()

const i18n = createI18n({
  legacy: false,
  locale: normalizeLocale(navigator.language),
  fallbackLocale: 'en',
  messages: {
    en: en,
    zh: zh_cn,
    'zh-CN': zh_cn,
    'zh-TW': zh_tw,
  },
})

const updateHtmlLang = (locale: SupportedLocale): void => {
  document.documentElement.lang = locale
}

const setLocaleFromPreference = (preferredLanguages: readonly string[]) => {
  const locale = normalizeLocale(preferredLanguages[0])
  i18n.global.locale.value = locale
  updateHtmlLang(locale)
}

setLocaleFromPreference(languages.value)

watch(languages, (newLanguages) => {
  setLocaleFromPreference(newLanguages)
})

watch(i18n.global.locale, (newLocale) => {
  updateHtmlLang(normalizeLocale(newLocale))
})

useTitle(computed(() => i18n.global.t('title')))

initializeTheme()

if (import.meta.hot) {
  import.meta.hot.dispose(disposeTheme)
}

const app = createApp(App)
const { notify } = useNotifications()
app.config.errorHandler = (error, _instance, info) => {
  console.error(`Unexpected Vue error (${info}).`, error)
  void flushPendingDrafts().catch((flushError) =>
    console.error(
      'Draft preservation after an application error failed.',
      flushError,
    ),
  )
  notify({ tone: 'error', message: i18n.global.t('errors.unexpected') })
}
app.use(i18n).mount('#app')
