/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL for backend API requests (e.g. http://localhost:3000). */
  readonly VITE_API_URL?: string
  /** Use mock API adapters instead of live backend requests (default: true). */
  readonly VITE_USE_MOCKS?: string
  /** Session timeout duration in minutes (default: 30). */
  readonly VITE_SESSION_DURATION_MINUTES?: string
  /** Minutes before session expiry to show the warning modal (default: 5). */
  readonly VITE_SESSION_WARNING_BEFORE_MINUTES?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
