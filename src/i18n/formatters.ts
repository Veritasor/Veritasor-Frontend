export const DATE_FORMATS: Record<string, Record<string, Intl.DateTimeFormatOptions>> = {
  en: {
    short: { month: 'numeric', day: 'numeric', year: '2-digit' },
    medium: { month: 'short', day: 'numeric', year: 'numeric' },
    long: { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' },
  },
  es: {
    short: { month: 'numeric', day: 'numeric', year: '2-digit' },
    medium: { month: 'short', day: 'numeric', year: 'numeric' },
    long: { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' },
  },
  fr: {
    short: { month: 'numeric', day: 'numeric', year: '2-digit' },
    medium: { month: 'short', day: 'numeric', year: 'numeric' },
    long: { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' },
  },
  ar: {
    short: { month: 'numeric', day: 'numeric', year: '2-digit', numberingSystem: 'arab' },
    medium: { month: 'short', day: 'numeric', year: 'numeric', numberingSystem: 'arab' },
    long: { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', numberingSystem: 'arab' },
  },
  zh: {
    short: { month: 'numeric', day: 'numeric', year: '2-digit' },
    medium: { month: 'short', day: 'numeric', year: 'numeric' },
    long: { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' },
  },
  de: {
    short: { month: 'numeric', day: 'numeric', year: '2-digit' },
    medium: { month: 'short', day: 'numeric', year: 'numeric' },
    long: { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' },
  },
  fi: {
    short: { month: 'numeric', day: 'numeric', year: '2-digit' },
    medium: { month: 'short', day: 'numeric', year: 'numeric' },
    long: { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' },
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
