/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_LASTFM_API_KEY: string
  readonly VITE_SURREALDB_WS_URL: string
  readonly VITE_SURREALDB_HTTP_URL: string
  readonly VITE_SURREALDB_NAMESPACE: string
  readonly VITE_SURREALDB_DATABASE: string
  readonly VITE_SURREALDB_USER: string
  readonly VITE_SURREALDB_PASS: string
  readonly VITE_API_BASE: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
