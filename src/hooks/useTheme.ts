import { useCallback, useEffect, useSyncExternalStore } from 'react'

const STORAGE_KEY = 'veritasor-theme'
export type Theme = 'system' | 'light' | 'dark'

function getThemeFromStorage(): Theme {
  let stored: string | null = null
  try {
    stored = localStorage.getItem(STORAGE_KEY)
  } catch {
    stored = null
  }
  if (stored === 'light' || stored === 'dark' || stored === 'system') return stored
  return 'system'
}

function getResolvedTheme(theme: Theme): 'light' | 'dark' {
  if (theme === 'light') return 'light'
  if (theme === 'dark') return 'dark'
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

function applyTheme(theme: Theme): void {
  const resolved = getResolvedTheme(theme)
  document.documentElement.setAttribute('data-theme', resolved)
}

function subscribeToStore(callback: () => void): () => void {
  window.addEventListener(STORAGE_KEY, callback)
  window.addEventListener('storage', callback)
  return () => {
    window.removeEventListener(STORAGE_KEY, callback)
    window.removeEventListener('storage', callback)
  }
}

function getSnapshot(): Theme {
  return getThemeFromStorage()
}

function getServerSnapshot(): Theme {
  return 'system'
}

export function useTheme() {
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

  const setTheme = useCallback((next: Theme) => {
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // localStorage unavailable
    }
    window.dispatchEvent(new Event(STORAGE_KEY))
  }, [])

  const resolved = getResolvedTheme(theme)

  return { theme, resolved, setTheme } as const
}
