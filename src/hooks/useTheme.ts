import { useCallback, useEffect, useSyncExternalStore } from 'react'

const BASE_STORAGE_KEY = 'veritasor-theme'
export type Theme = 'system' | 'light' | 'dark' | 'high-contrast'

export function getThemeStorageKey(userId?: string): string {
  return userId ? `${BASE_STORAGE_KEY}-${userId}` : BASE_STORAGE_KEY
}

function getThemeFromStorage(key: string): Theme {
  let stored: string | null = null
  try {
    stored = localStorage.getItem(key)
    if (!stored && key !== BASE_STORAGE_KEY) {
      stored = localStorage.getItem(BASE_STORAGE_KEY)
    }
  } catch {
    stored = null
  }
  if (
    stored === 'light' ||
    stored === 'dark' ||
    stored === 'system' ||
    stored === 'high-contrast'
  )
    return stored
  return 'system'
}

function getResolvedTheme(theme: Theme): 'light' | 'dark' | 'high-contrast' {
  if (theme === 'light') return 'light'
  if (theme === 'dark') return 'dark'
  if (theme === 'high-contrast') return 'high-contrast'
  return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: light)').matches
    ? 'light'
    : 'dark'
}

function applyTheme(theme: Theme): void {
  if (typeof document === 'undefined') return
  const resolved = getResolvedTheme(theme)
  document.documentElement.setAttribute('data-theme', resolved)
}

export function useTheme(userId?: string) {
  const storageKey = getThemeStorageKey(userId)

  const subscribeToStore = useCallback(
    (callback: () => void): (() => void) => {
      const handleStorage = (event: StorageEvent) => {
        if (
          event.key === storageKey ||
          event.key === BASE_STORAGE_KEY ||
          event.key === null
        ) {
          callback()
        }
      }
      window.addEventListener(storageKey, callback)
      window.addEventListener(BASE_STORAGE_KEY, callback)
      window.addEventListener('storage', handleStorage)
      return () => {
        window.removeEventListener(storageKey, callback)
        window.removeEventListener(BASE_STORAGE_KEY, callback)
        window.removeEventListener('storage', handleStorage)
      }
    },
    [storageKey]
  )

  const getSnapshot = useCallback((): Theme => {
    return getThemeFromStorage(storageKey)
  }, [storageKey])

  const getServerSnapshot = useCallback((): Theme => {
    return 'system'
  }, [])

  const theme = useSyncExternalStore(subscribeToStore, getSnapshot, getServerSnapshot)

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  useEffect(() => {
    if (theme !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: light)')
    const handler = () => applyTheme('system')
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [theme])

  const setTheme = useCallback(
    (next: Theme) => {
      try {
        localStorage.setItem(storageKey, next)
        if (userId) {
          localStorage.setItem(BASE_STORAGE_KEY, next)
        }
      } catch {
        // localStorage unavailable
      }
      window.dispatchEvent(new Event(storageKey))
      window.dispatchEvent(new Event(BASE_STORAGE_KEY))
    },
    [storageKey, userId]
  )

  const resolved = getResolvedTheme(theme)

  return { theme, resolved, setTheme } as const
}
