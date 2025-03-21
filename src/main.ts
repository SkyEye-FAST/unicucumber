import { createApp, watch } from 'vue'
import { createI18n } from 'vue-i18n'
import { usePreferredLanguages, useTitle } from '@vueuse/core'
import * as Sentry from '@sentry/vue'

import App from './App.vue'

import './styles/base.css'
import './styles/font.css'
import './styles/theme.css'

import en from './locales/en.json'
import zh_cn from './locales/zh_cn.json'
import zh_tw from './locales/zh_tw.json'

const languages = usePreferredLanguages()

const i18n = createI18n({
  legacy: false,
  locale: 'en',
  fallbackLocale: 'en',
  silentTranslationWarn: true,
  messages: {
    en: en,
    zh: zh_cn,
    'zh-CN': zh_cn,
    'zh-TW': zh_tw,
  },
})

interface LocaleType {
  locale: 'en' | 'zh' | 'zh-CN' | 'zh-TW'
}

const updateHtmlLang = (locale: LocaleType['locale']): void => {
  document.documentElement.lang = locale.replace('_', '-').toLowerCase()
}

const setLocaleFromPreference = (preferredLanguages: readonly string[]) => {
  if (preferredLanguages.length > 0) {
    const lang = preferredLanguages[0]
    const locale = lang.startsWith('zh')
      ? lang.includes('CN')
        ? 'zh-CN'
        : 'zh-TW'
      : 'en'
    i18n.global.locale.value = locale as LocaleType['locale']
  }
}

setLocaleFromPreference(languages.value)

watch(languages, (newLanguages) => {
  setLocaleFromPreference(newLanguages)
})

watch(i18n.global.locale, (newLocale) => {
  updateHtmlLang(newLocale)
  useTitle(i18n.global.t('title'))
})

useTitle(i18n.global.t('title'))

const app = createApp(App)

Sentry.init({
  app,
  dsn: 'https://a495d50783e753f433ca4369401a45f2@o4507582862589952.ingest.de.sentry.io/4509016380407888',
})

app.use(i18n)
app.mount('#app')
