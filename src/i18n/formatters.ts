export const DATE_FORMATS: Record<string, Record<string, Intl.DateTimeFormatOptions>> = {
  en: {
    short: { month: 'numeric', day: 'numeric', year: '2-digit' },
    medium: { month: 'short', day: 'numeric', year: 'numeric' },
    long: { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' },
    full: { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: 'numeric' },
  },
  es: {
    short: { month: 'numeric', day: 'numeric', year: '2-digit' },
    medium: { month: 'short', day: 'numeric', year: 'numeric' },
    long: { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' },
    full: { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: 'numeric' },
  },
  fr: {
    short: { month: 'numeric', day: 'numeric', year: '2-digit' },
    medium: { month: 'short', day: 'numeric', year: 'numeric' },
    long: { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' },
    full: { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: 'numeric' },
  },
  ar: {
    short: { month: 'numeric', day: 'numeric', year: '2-digit', numberingSystem: 'arab' },
    medium: { month: 'short', day: 'numeric', year: 'numeric', numberingSystem: 'arab' },
    long: { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', numberingSystem: 'arab' },
    full: { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: 'numeric', numberingSystem: 'arab' },
  },
  zh: {
    short: { month: 'numeric', day: 'numeric', year: '2-digit' },
    medium: { month: 'short', day: 'numeric', year: 'numeric' },
    long: { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' },
    full: { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: 'numeric' },
  },
  de: {
    short: { month: 'numeric', day: 'numeric', year: '2-digit' },
    medium: { month: 'short', day: 'numeric', year: 'numeric' },
    long: { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' },
    full: { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: 'numeric' },
  },
  fi: {
    short: { month: 'numeric', day: 'numeric', year: '2-digit' },
    medium: { month: 'short', day: 'numeric', year: 'numeric' },
    long: { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' },
    full: { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: 'numeric' },
  },
}

export const TIME_FORMATS: Record<string, Record<string, Intl.DateTimeFormatOptions>> = {
  en: {
    short: { hour: 'numeric', minute: 'numeric' },
    medium: { hour: 'numeric', minute: 'numeric', second: 'numeric' },
    long: { hour: 'numeric', minute: 'numeric', second: 'numeric', timeZoneName: 'short' },
  },
  es: {
    short: { hour: 'numeric', minute: 'numeric' },
    medium: { hour: 'numeric', minute: 'numeric', second: 'numeric' },
    long: { hour: 'numeric', minute: 'numeric', second: 'numeric', timeZoneName: 'short' },
  },
  fr: {
    short: { hour: 'numeric', minute: 'numeric' },
    medium: { hour: 'numeric', minute: 'numeric', second: 'numeric' },
    long: { hour: 'numeric', minute: 'numeric', second: 'numeric', timeZoneName: 'short' },
  },
  ar: {
    short: { hour: 'numeric', minute: 'numeric', numberingSystem: 'arab' },
    medium: { hour: 'numeric', minute: 'numeric', second: 'numeric', numberingSystem: 'arab' },
    long: { hour: 'numeric', minute: 'numeric', second: 'numeric', timeZoneName: 'short', numberingSystem: 'arab' },
  },
  zh: {
    short: { hour: 'numeric', minute: 'numeric' },
    medium: { hour: 'numeric', minute: 'numeric', second: 'numeric' },
    long: { hour: 'numeric', minute: 'numeric', second: 'numeric', timeZoneName: 'short' },
  },
  de: {
    short: { hour: 'numeric', minute: 'numeric' },
    medium: { hour: 'numeric', minute: 'numeric', second: 'numeric' },
    long: { hour: 'numeric', minute: 'numeric', second: 'numeric', timeZoneName: 'short' },
  },
  fi: {
    short: { hour: 'numeric', minute: 'numeric' },
    medium: { hour: 'numeric', minute: 'numeric', second: 'numeric' },
    long: { hour: 'numeric', minute: 'numeric', second: 'numeric', timeZoneName: 'short' },
  },
}

export const NUMBER_FORMATS: Record<string, Intl.NumberFormatOptions> = {
  en: { maximumFractionDigits: 2 },
  es: { maximumFractionDigits: 2 },
  fr: { maximumFractionDigits: 2 },
  ar: { maximumFractionDigits: 2, numberingSystem: 'arab' },
  zh: { maximumFractionDigits: 2 },
  de: { maximumFractionDigits: 2 },
  fi: { maximumFractionDigits: 2 },
}

export const CURRENCY_FORMATS: Record<string, Intl.NumberFormatOptions> = {
  en: { style: 'currency', currency: 'USD', minimumFractionDigits: 2 },
  es: { style: 'currency', currency: 'USD', minimumFractionDigits: 2 },
  fr: { style: 'currency', currency: 'USD', minimumFractionDigits: 2 },
  ar: { style: 'currency', currency: 'USD', minimumFractionDigits: 2, numberingSystem: 'arab' },
  zh: { style: 'currency', currency: 'USD', minimumFractionDigits: 2 },
  de: { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 },
  fi: { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 },
}

export const PERCENT_FORMATS: Record<string, Intl.NumberFormatOptions> = {
  en: { style: 'percent', minimumFractionDigits: 0, maximumFractionDigits: 2 },
  es: { style: 'percent', minimumFractionDigits: 0, maximumFractionDigits: 2 },
  fr: { style: 'percent', minimumFractionDigits: 0, maximumFractionDigits: 2 },
  ar: { style: 'percent', minimumFractionDigits: 0, maximumFractionDigits: 2, numberingSystem: 'arab' },
  zh: { style: 'percent', minimumFractionDigits: 0, maximumFractionDigits: 2 },
  de: { style: 'percent', minimumFractionDigits: 0, maximumFractionDigits: 2 },
  fi: { style: 'percent', minimumFractionDigits: 0, maximumFractionDigits: 2 },
}

/**
 * Format a date according to the specified locale and format style
 * @param date - Date to format
 * @param locale - Locale code (e.g., 'en', 'es', 'ar')
 * @param format - Format style ('short', 'medium', 'long', 'full')
 * @returns Formatted date string
 */
export function formatDate(
  date: Date | string | number,
  locale: string = 'en',
  format: keyof typeof DATE_FORMATS[string] = 'medium'
): string {
  const dateObj = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date
  const formatOptions = DATE_FORMATS[locale]?.[format] || DATE_FORMATS.en[format]
  return new Intl.DateTimeFormat(locale, formatOptions).format(dateObj)
}

/**
 * Format a time according to the specified locale and format style
 * @param date - Date containing the time to format
 * @param locale - Locale code (e.g., 'en', 'es', 'ar')
 * @param format - Format style ('short', 'medium', 'long')
 * @returns Formatted time string
 */
export function formatTime(
  date: Date | string | number,
  locale: string = 'en',
  format: keyof typeof TIME_FORMATS[string] = 'short'
): string {
  const dateObj = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date
  const formatOptions = TIME_FORMATS[locale]?.[format] || TIME_FORMATS.en[format]
  return new Intl.DateTimeFormat(locale, formatOptions).format(dateObj)
}

/**
 * Format a number according to the specified locale
 * @param value - Number to format
 * @param locale - Locale code (e.g., 'en', 'es', 'ar')
 * @returns Formatted number string
 */
export function formatNumber(value: number, locale: string = 'en'): string {
  const formatOptions = NUMBER_FORMATS[locale] || NUMBER_FORMATS.en
  return new Intl.NumberFormat(locale, formatOptions).format(value)
}

/**
 * Format a currency amount according to the specified locale
 * @param value - Currency amount to format
 * @param locale - Locale code (e.g., 'en', 'es', 'ar')
 * @returns Formatted currency string
 */
export function formatCurrency(value: number, locale: string = 'en'): string {
  const formatOptions = CURRENCY_FORMATS[locale] || CURRENCY_FORMATS.en
  return new Intl.NumberFormat(locale, formatOptions).format(value)
}

/**
 * Format a percentage according to the specified locale
 * @param value - Decimal value (e.g., 0.5 for 50%)
 * @param locale - Locale code (e.g., 'en', 'es', 'ar')
 * @returns Formatted percentage string
 */
export function formatPercent(value: number, locale: string = 'en'): string {
  const formatOptions = PERCENT_FORMATS[locale] || PERCENT_FORMATS.en
  return new Intl.NumberFormat(locale, formatOptions).format(value)
}

/**
 * Format a number with specified decimal places
 * @param value - Number to format
 * @param locale - Locale code (e.g., 'en', 'es', 'ar')
 * @param minimumFractionDigits - Minimum decimal places
 * @param maximumFractionDigits - Maximum decimal places
 * @returns Formatted number string
 */
export function formatNumberWithPrecision(
  value: number,
  locale: string = 'en',
  minimumFractionDigits: number = 0,
  maximumFractionDigits: number = 2
): string {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(value)
}
