import { createApp } from 'vue'
import { createI18n } from 'vue-i18n'
import App from './App.vue'

const i18n = createI18n({
  locale: navigator.language,
  fallbackLocale: 'en',
  messages: {
    en: {
      settings: {
        title: 'Settings',
        draw_mode: {
          label: 'Draw Mode:',
          double_button: 'Left Draw, Right Erase',
          single_button: 'Left Draw & Erase',
        },
        cursor_effect: 'Cursor Effect:',
        close: 'Close',
      },
    },
    zh: {
      settings: {
        title: '设置',
        draw_mode: {
          label: '绘制模式:',
          double_button: '左键绘制，右键擦除',
          single_button: '左键绘制或擦除',
        },
        cursor_effect: '光标效果:',
        close: '关闭',
      },
    },
  },
})
const app = createApp(App)

app.use(i18n)
app.mount('#app')
