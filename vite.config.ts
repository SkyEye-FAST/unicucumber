import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, realpathSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, URL } from 'node:url'

import AutoImport from 'unplugin-auto-import/vite'
import IconsResolver from 'unplugin-icons/resolver'
import Icons from 'unplugin-icons/vite'
import Components from 'unplugin-vue-components/vite'
import { defineConfig, type Plugin } from 'vite'
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import { VitePWA } from 'vite-plugin-pwa'
import vueDevTools from 'vite-plugin-vue-devtools'

import VueI18nPlugin from '@intlify/unplugin-vue-i18n/vite'
import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'

import {
  getUnifontRuntimeCacheNames,
  parseUnifontManifest,
} from './src/services/unifontManifest.ts'

const normalizeCommitSha = (value: string | undefined): string => {
  const normalized = value?.trim().toLowerCase()
  return normalized && /^[0-9a-f]{7,64}$/.test(normalized)
    ? normalized.slice(0, 7)
    : ''
}

const getCommitSha = (): string => {
  const environmentSha = [
    process.env.VERCEL_GIT_COMMIT_SHA,
    process.env.CF_PAGES_COMMIT_SHA,
    process.env.GITHUB_SHA,
    process.env.COMMIT_REF,
  ]
    .map(normalizeCommitSha)
    .find(Boolean)

  if (environmentSha) return environmentSha

  try {
    return normalizeCommitSha(
      execFileSync('git', ['rev-parse', 'HEAD'], {
        encoding: 'utf-8',
        stdio: ['ignore', 'pipe', 'ignore'],
      }),
    )
  } catch {
    return ''
  }
}

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

const getCompositionDataVersion = (): string => {
  try {
    const value: unknown = JSON.parse(
      readFileSync(
        new URL('./public/composition/index.json', import.meta.url),
        'utf-8',
      ),
    )
    if (value === null || typeof value !== 'object' || Array.isArray(value)) {
      return ''
    }
    const { schemaVersion, dataVersion } = value as Record<string, unknown>
    return schemaVersion === 1 &&
      typeof dataVersion === 'string' &&
      dataVersion.trim()
      ? dataVersion
      : ''
  } catch {}
  return ''
}

const getUnifontCatalog = (version: string): string => {
  const value = JSON.parse(
    readFileSync(
      new URL('./public/unifont-map.json', import.meta.url),
      'utf-8',
    ),
  ) as {
    meta?: { version?: unknown }
    glyphs?: Record<string, unknown>
  }
  if (
    !version ||
    value.meta?.version !== version ||
    value.glyphs === null ||
    typeof value.glyphs !== 'object'
  ) {
    throw new TypeError('Invalid Unifont source map for catalog generation.')
  }

  const codePoints = Object.keys(value.glyphs)
    .map((decimal) =>
      /^\d+$/.test(decimal) ? Number.parseInt(decimal, 10) : Number.NaN,
    )
    .sort((left, right) => left - right)
  if (codePoints.length === 0) {
    throw new TypeError('Unifont source map contains no glyphs.')
  }
  const ranges: Array<[number, number]> = []
  let previous = -1
  for (const codePoint of codePoints) {
    if (
      !Number.isInteger(codePoint) ||
      codePoint < 0 ||
      codePoint > 0x10ffff ||
      (codePoint >= 0xd800 && codePoint <= 0xdfff) ||
      codePoint <= previous
    ) {
      throw new TypeError('Invalid Unifont code point in source map.')
    }
    const range = ranges[ranges.length - 1]
    if (range && codePoint === range[1] + 1) range[1] = codePoint
    else ranges.push([codePoint, codePoint])
    previous = codePoint
  }
  return JSON.stringify({ version, ranges })
}

const createUnifontCatalogPlugin = (catalog: string): Plugin => ({
  name: 'unicucumber-unifont-catalog',
  configureServer(server) {
    server.middlewares.use('/unifont/catalog.json', (_request, response) => {
      response.statusCode = 200
      response.setHeader('Content-Type', 'application/json; charset=utf-8')
      response.setHeader('Cache-Control', 'no-store')
      response.end(catalog)
    })
  },
  generateBundle() {
    this.emitFile({
      type: 'asset',
      fileName: 'unifont/catalog.json',
      source: catalog,
    })
  },
})

const unifontVersion = getUnifontVersion()
const compositionDataVersion = getCompositionDataVersion()
const unifontCatalog = getUnifontCatalog(unifontVersion)
const unifontCaches = getUnifontRuntimeCacheNames(unifontVersion)
const packageVersion = JSON.parse(
  readFileSync(new URL('./package.json', import.meta.url), 'utf-8'),
).version as string
const commitSha = getCommitSha()
const applicationVersion = commitSha
  ? `${packageVersion}-${commitSha}`
  : packageVersion

export default defineConfig(({ command }) => ({
  define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(applicationVersion),
    'import.meta.env.VITE_COMPOSITION_DATA_VERSION': JSON.stringify(
      compositionDataVersion,
    ),
    'import.meta.env.VITE_UNIFONT_VERSION': JSON.stringify(unifontVersion),
  },
  plugins: [
    tailwindcss(),
    createUnifontCatalogPlugin(unifontCatalog),
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
            urlPattern: /\/composition\/index\.json$/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'unicucumber-composition-index',
              networkTimeoutSeconds: 4,
              cacheableResponse: { statuses: [0, 200] },
              expiration: {
                maxEntries: 1,
                purgeOnQuotaError: true,
              },
            },
          },
          {
            urlPattern:
              /\/composition\/(?:catalog\.json|components\/[0-9A-F]{2}\.json|ids\/[0-9A-F]{3}\.json)$/,
            handler: 'NetworkOnly',
          },
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
            urlPattern: /\/unifont\/catalog\.json$/,
            handler: 'CacheFirst',
            options: {
              cacheName: unifontCaches.catalog,
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
