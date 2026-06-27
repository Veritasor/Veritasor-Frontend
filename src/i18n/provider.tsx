import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { IntlProvider } from 'react-intl'
import { FALLBACK_LOCALE, LOCALE_STORAGE_KEY, getLocaleDirection, normalizeLocale, resolveInitialLocale } from './config'

interface LocaleContextValue {
  locale: string
  setLocale: (locale: string) => void
  dir: 'ltr' | 'rtl'
}

export const LocaleContext = createContext<LocaleContextValue>({
  locale: FALLBACK_LOCALE,
  setLocale: () => undefined,
  dir: 'ltr',
})

const messageModules = import.meta.glob('./messages/*.json', { eager: true }) as Record<string, Record<string, string> | { default: Record<string, string> }>

function getMessages(locale: string) {
  const moduleKey = `./messages/${locale}.json`
  const module = messageModules[moduleKey]
  if (!module) return {} as Record<string, string>
  return 'default' in module ? module.default : module
}

function handleIntlError(error: Error) {
  if (import.meta.env.DEV) {
    console.warn('Intl message missing:', error)
  }
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<string>(() => resolveInitialLocale())

  const setLocale = useCallback((newLocale: string) => {
    const normalized = normalizeLocale(newLocale)
    if (!normalized) {
      if (import.meta.env.DEV) console.warn(`Unsupported locale: ${newLocale}`)
      return
    }

    if (typeof window !== 'undefined') {
      window.localStorage.setItem(LOCALE_STORAGE_KEY, normalized)
    }

    document.documentElement.lang = normalized
    document.documentElement.dir = getLocaleDirection(normalized)
    setLocaleState(normalized)
  }, [])

  useEffect(() => {
    document.documentElement.lang = locale
    document.documentElement.dir = getLocaleDirection(locale)
  }, [locale])

  const contextValue = useMemo(
    () => ({ locale, setLocale, dir: getLocaleDirection(locale) as 'ltr' | 'rtl' }),
    [locale, setLocale],
  )

  return (
    <IntlProvider locale={locale} messages={getMessages(locale)} defaultLocale={FALLBACK_LOCALE} onError={handleIntlError}>
      <LocaleContext.Provider value={contextValue}>{children}</LocaleContext.Provider>
    </IntlProvider>
  )
}
