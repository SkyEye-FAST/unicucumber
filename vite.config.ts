import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, URL } from 'node:url'

import AutoImport from 'unplugin-auto-import/vite'
import IconsResolver from 'unplugin-icons/resolver'
import Icons from 'unplugin-icons/vite'
import Components from 'unplugin-vue-components/vite'
import { defineConfig } from 'vite'
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import { VitePWA } from 'vite-plugin-pwa'
import vueDevTools from 'vite-plugin-vue-devtools'

import VueI18nPlugin from '@intlify/unplugin-vue-i18n/vite'
import vue from '@vitejs/plugin-vue'

const getUnifontVersion = (): string => {
  try {
    const content = readFileSync(
      new URL('./public/unifont-map.json', import.meta.url),
      'utf-8',
    )
    const parsed = JSON.parse(content)
    const v = parsed?.meta?.version
    if (typeof v === 'string') return v
  } catch {}
  return ''
}

export default defineConfig({
  define: {
    'import.meta.env.VITE_UNIFONT_VERSION': JSON.stringify(getUnifontVersion()),
  },
  plugins: [
    vue(),
    vueDevTools(),
    nodePolyfills(),
    VueI18nPlugin({
      include: resolve(
        dirname(fileURLToPath(import.meta.url)),
        './src/locales/**',
      ),
    }),
    AutoImport({
      resolvers: [IconsResolver({ prefix: 'i' })],
    }),
    Components({
      resolvers: [
        IconsResolver({
          enabledCollections: ['material-symbols', 'fa6-brands'],
        }),
      ],
    }),
    Icons({
      autoInstall: true,
    }),
    VitePWA({
      injectRegister: 'auto',
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        maximumFileSizeToCacheInBytes: 3_000_000,
      },
      devOptions: { enabled: true },
      includeAssets: ['apple-touch-icon.png', 'favicon.ico'],
      manifest: {
        name: 'UniCucumber',
        short_name: 'UniCucumber',
        display: 'standalone',
        theme_color: '#4ea72e',
        description: 'A simple webpage for editing Unifont glyphs in browsers.',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      buffer: 'buffer',
      stream: 'stream-browserify',
    },
  },
  assetsInclude: ['**/*.hex'],
  publicDir: 'public',
  optimizeDeps: {
    esbuildOptions: {
      define: { global: 'globalThis' },
    },
  },
  build: {
    chunkSizeWarningLimit: 2500,
    rollupOptions: {},
  },
})
