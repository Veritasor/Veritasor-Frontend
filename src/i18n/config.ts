export const SUPPORTED_LOCALES = [
  { code: 'en', label: 'English', nativeLabel: 'English', dir: 'ltr' },
  { code: 'es', label: 'Spanish', nativeLabel: 'Español', dir: 'ltr' },
  { code: 'fr', label: 'French', nativeLabel: 'Français', dir: 'ltr' },
  { code: 'ar', label: 'Arabic', nativeLabel: 'العربية', dir: 'rtl' },
  { code: 'zh', label: 'Chinese (Simplified)', nativeLabel: '中文', dir: 'ltr' },
  { code: 'de', label: 'German', nativeLabel: 'Deutsch', dir: 'ltr' },
  { code: 'fi', label: 'Finnish', nativeLabel: 'Suomi', dir: 'ltr' },
] as const

export const DEFAULT_LOCALE = 'en'
export const FALLBACK_LOCALE = 'en'
export const LOCALE_STORAGE_KEY = 'preferred-locale'

export function getLocaleDirection(locale: string) {
  return SUPPORTED_LOCALES.find((item) => item.code === locale)?.dir ?? 'ltr'
}

export function normalizeLocale(locale: string) {
  if (!locale) return DEFAULT_LOCALE
  const normalized = locale.toLowerCase()
  const directMatch = SUPPORTED_LOCALES.find((item) => item.code === normalized)
  if (directMatch) return directMatch.code
  const languageOnly = normalized.split('-')[0]
  return SUPPORTED_LOCALES.find((item) => item.code === languageOnly)?.code ?? DEFAULT_LOCALE
}

export function resolveInitialLocale() {
  if (typeof window === 'undefined') return FALLBACK_LOCALE

  // 1) Saved preference from localStorage
  const savedLocale = window.localStorage.getItem(LOCALE_STORAGE_KEY)
  if (savedLocale) {
    const normalized = normalizeLocale(savedLocale)
    if (normalized !== DEFAULT_LOCALE || savedLocale.toLowerCase() === DEFAULT_LOCALE) {
      return normalized
    }
  }

  // 2) Browser language matched against supported locales
  const browserLocale = window.navigator.language
  const normalizedBrowser = normalizeLocale(browserLocale)
  if (normalizedBrowser) return normalizedBrowser

  // 3) Final fallback to English
  return FALLBACK_LOCALE
}
