import { createApp } from 'vue'
import { createI18n } from 'vue-i18n'
import App from './App.vue'
import './styles/base.css';
import './styles/font.css';

import en from './locales/en.json'
import zh_cn from './locales/zh_cn.json'

const i18n = createI18n({
  legacy: false,
  locale: navigator.language || navigator.userLanguage || 'en',
  fallbackLocale: 'en',
  silentTranslationWarn: true,
  messages: {
    en: en,
    'zh-CN': zh_cn,
  },
})
const app = createApp(App)
document.title = i18n.global.t(`title`)
app.use(i18n).mount('#app')
