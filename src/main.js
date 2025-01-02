import { createApp } from 'vue'
import { createI18n } from 'vue-i18n'
import { watch } from 'vue'
import App from './App.vue'
import './styles/base.css'
import './styles/font.css'
import './styles/theme.css'

import en from './locales/en.json'
import zh_cn from './locales/zh_cn.json'
import zh_tw from './locales/zh_tw.json'

const i18n = createI18n({
  legacy: false,
  locale: navigator.language || navigator.userLanguage || 'en',
  fallbackLocale: 'en',
  silentTranslationWarn: true,
  messages: {
    en: en,
    zh: zh_cn,
    'zh-CN': zh_cn,
    'zh-TW': zh_tw,
  },
})

const updateHtmlLang = (locale) => {
  document.documentElement.lang = locale.replace('_', '-').toLowerCase()
}

i18n.global.locale.value = navigator.language || navigator.userLanguage || 'en'
updateHtmlLang(i18n.global.locale.value)

watch(i18n.global.locale, (newLocale) => {
  updateHtmlLang(newLocale)
})

const app = createApp(App)
document.title = i18n.global.t(`title`)
app.use(i18n).mount('#app')
