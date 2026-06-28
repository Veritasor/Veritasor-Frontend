import { useContext } from 'react'
import { useIntl } from 'react-intl'
import { LocaleContext } from './provider'
import { DATE_FORMATS, NUMBER_FORMATS, CURRENCY_FORMATS } from './formatters'

export function useLocale() {
  const { locale, setLocale, dir } = useContext(LocaleContext)
  const intl = useIntl()

  return {
    locale,
    setLocale,
    dir,
    formatDate: (date: Date, style: 'short' | 'medium' | 'long' = 'medium') =>
      intl.formatDate(date, DATE_FORMATS[locale]?.[style] ?? DATE_FORMATS.en[style]),
    formatNumber: (value: number) => intl.formatNumber(value, NUMBER_FORMATS[locale] ?? NUMBER_FORMATS.en),
    formatCurrency: (amount: number, currency: string) =>
      intl.formatNumber(amount, { ...(CURRENCY_FORMATS[locale] ?? CURRENCY_FORMATS.en), currency }),
  }
}
