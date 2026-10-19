/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly FRONTEND_VERSION: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}