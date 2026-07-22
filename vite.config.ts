import { existsSync, readFileSync, realpathSync } from 'node:fs'
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

import {
  getUnifontRuntimeCacheNames,
  parseUnifontManifest,
} from './src/services/unifontManifest'

const getUnifontVersion = (): string => {
  try {
    const content = readFileSync(
      new URL('./public/unifont/index.json', import.meta.url),
      'utf-8',
    )
    return parseUnifontManifest(JSON.parse(content))?.version ?? ''
  } catch {}
  return ''
}

const unifontVersion = getUnifontVersion()
const unifontCaches = getUnifontRuntimeCacheNames(unifontVersion)

export default defineConfig(({ command }) => ({
  define: {
    'import.meta.env.VITE_UNIFONT_VERSION': JSON.stringify(unifontVersion),
  },
  plugins: [
    vue({
      script: {
        // Vite 8 runs the SFC compiler through Rolldown, where Vue cannot
        // automatically access Node's file system to resolve imported types.
        fs: {
          fileExists: existsSync,
          readFile: (file) => {
            try {
              return readFileSync(file, 'utf-8')
            } catch {
              return undefined
            }
          },
          realpath: realpathSync,
        },
      },
    }),
    command === 'serve' &&
      process.env.VITE_ENABLE_DEVTOOLS === 'true' &&
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
      autoInstall: false,
    }),
    VitePWA({
      injectRegister: false,
      registerType: 'prompt',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        globIgnores: [
          'assets/encoding-*.js',
          'assets/unicode-name-*.js',
          'unifont-map.json',
        ],
        maximumFileSizeToCacheInBytes: 3_000_000,
        runtimeCaching: [
          {
            urlPattern: /\/unifont\/index\.json$/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: unifontCaches.manifest,
              cacheableResponse: { statuses: [200] },
              expiration: {
                maxEntries: 1,
                maxAgeSeconds: 7 * 24 * 60 * 60,
              },
            },
          },
          {
            urlPattern: /\/unifont-map\.json$/,
            handler: 'CacheFirst',
            options: {
              cacheName: `${unifontCaches.chunks}-catalog`,
              cacheableResponse: { statuses: [200] },
              expiration: {
                maxEntries: 1,
                maxAgeSeconds: 365 * 24 * 60 * 60,
                purgeOnQuotaError: true,
              },
            },
          },
          {
            urlPattern: /\/unifont\/[0-9A-Fa-f]{3}\.json$/,
            handler: 'CacheFirst',
            options: {
              cacheName: unifontCaches.chunks,
              cacheableResponse: { statuses: [200] },
              expiration: {
                maxEntries: 64,
                maxAgeSeconds: 365 * 24 * 60 * 60,
                purgeOnQuotaError: true,
              },
            },
          },
        ],
      },
      includeAssets: ['apple-touch-icon.png', 'favicon.ico'],
      manifest: {
        id: '/',
        name: 'UniCucumber',
        short_name: 'UniCucumber',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'any',
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
    rolldownOptions: {
      transform: {
        define: { global: 'globalThis' },
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        chunkFileNames(chunkInfo) {
          if (chunkInfo.moduleIds.some((id) => id.includes('iconv-lite'))) {
            return 'assets/encoding-[hash].js'
          }
          return 'assets/[name]-[hash].js'
        },
        manualChunks(id) {
          if (id.includes('unicode-name')) return 'unicode-name'
          return undefined
        },
      },
    },
  },
}))
