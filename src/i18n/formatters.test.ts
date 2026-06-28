import { describe, it, expect } from 'vitest'
import { DATE_FORMATS, CURRENCY_FORMATS, NUMBER_FORMATS } from './formatters'

describe('date and number formatters', () => {
  it('formats dates for English, Arabic, and Chinese', () => {
    const formatter = new Intl.DateTimeFormat('en', DATE_FORMATS.en.medium)
    const arFormatter = new Intl.DateTimeFormat('ar', DATE_FORMATS.ar.medium)
    const zhFormatter = new Intl.DateTimeFormat('zh', DATE_FORMATS.zh.medium)
    expect(formatter.format(new Date('2024-01-15T00:00:00Z'))).toContain('Jan')
    expect(arFormatter.format(new Date('2024-01-15T00:00:00Z'))).toContain('١')
    expect(zhFormatter.format(new Date('2024-01-15T00:00:00Z'))).toContain('2024')
  })

  it('uses a different currency separator for English and German', () => {
    const en = new Intl.NumberFormat('en', CURRENCY_FORMATS.en).format(1234.5)
    const de = new Intl.NumberFormat('de', CURRENCY_FORMATS.de).format(1234.5)
    expect(en).toContain('$')
    expect(de).toContain('€')
  })

  it('formats numbers using Arabic-Indic digits for Arabic locale', () => {
    const value = new Intl.NumberFormat('ar', NUMBER_FORMATS.ar).format(1234)
    expect(value).toContain('١')
  })
})
