/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_UNIFONT_VERSION?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
