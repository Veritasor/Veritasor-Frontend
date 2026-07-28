import { describe, it, expect } from 'vitest'
import {
  DATE_FORMATS,
  CURRENCY_FORMATS,
  NUMBER_FORMATS,
  formatDate,
  formatTime,
  formatNumber,
  formatCurrency,
  formatPercent,
  formatNumberWithPrecision,
} from './formatters'

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

describe('formatDate utility', () => {
  it('formats date with medium style by default', () => {
    const result = formatDate('2024-01-15', 'en')
    expect(result).toContain('2024')
  })

  it('formats date with short style', () => {
    const result = formatDate('2024-01-15', 'en', 'short')
    expect(result).toBeTruthy()
  })

  it('formats date with long style', () => {
    const result = formatDate('2024-01-15', 'en', 'long')
    expect(result).toBeTruthy()
  })

  it('formats date with full style', () => {
    const result = formatDate('2024-01-15T14:30:00', 'en', 'full')
    expect(result).toBeTruthy()
  })

  it('handles Date object input', () => {
    const result = formatDate(new Date('2024-01-15'), 'en')
    expect(result).toContain('2024')
  })

  it('handles timestamp input', () => {
    const result = formatDate(1705276800000, 'en')
    expect(result).toContain('2024')
  })

  it('falls back to English for unsupported locale', () => {
    const result = formatDate('2024-01-15', 'xx', 'medium')
    expect(result).toBeTruthy()
  })
})

describe('formatTime utility', () => {
  it('formats time with short style by default', () => {
    const result = formatTime('2024-01-15T14:30:00', 'en')
    expect(result).toBeTruthy()
  })

  it('formats time with medium style', () => {
    const result = formatTime('2024-01-15T14:30:45', 'en', 'medium')
    expect(result).toBeTruthy()
  })

  it('formats time with long style', () => {
    const result = formatTime('2024-01-15T14:30:45', 'en', 'long')
    expect(result).toBeTruthy()
  })

  it('handles Date object input', () => {
    const result = formatTime(new Date('2024-01-15T14:30:00'), 'en')
    expect(result).toBeTruthy()
  })
})

describe('formatNumber utility', () => {
  it('formats basic number', () => {
    const result = formatNumber(1234.567, 'en')
    expect(result).toBe('1,234.57')
  })

  it('formats number for Arabic locale with Arabic-Indic digits', () => {
    const result = formatNumber(1234, 'ar')
    expect(result).toContain('١')
  })

  it('handles zero', () => {
    const result = formatNumber(0, 'en')
    expect(result).toBe('0')
  })

  it('handles negative numbers', () => {
    const result = formatNumber(-1234.56, 'en')
    expect(result).toContain('-')
  })
})

describe('formatCurrency utility', () => {
  it('formats currency for English locale', () => {
    const result = formatCurrency(1234.5, 'en')
    expect(result).toContain('$')
  })

  it('formats currency for German locale with EUR', () => {
    const result = formatCurrency(1234.5, 'de')
    expect(result).toContain('€')
  })

  it('formats currency for Arabic locale with Arabic-Indic digits', () => {
    const result = formatCurrency(1234, 'ar')
    expect(result).toContain('١')
  })
})

describe('formatPercent utility', () => {
  it('formats percentage for English locale', () => {
    const result = formatPercent(0.5, 'en')
    expect(result).toContain('%')
  })

  it('formats percentage for Arabic locale with Arabic-Indic digits', () => {
    const result = formatPercent(0.5, 'ar')
    expect(result).toContain('٥')
  })

  it('handles decimal values correctly', () => {
    const result = formatPercent(0.1234, 'en')
    expect(result).toContain('%')
  })
})

describe('formatNumberWithPrecision utility', () => {
  it('formats number with custom precision', () => {
    const result = formatNumberWithPrecision(1234.56789, 'en', 0, 4)
    expect(result).toBe('1,234.5679')
  })

  it('formats number with minimum fraction digits', () => {
    const result = formatNumberWithPrecision(1234, 'en', 2, 2)
    expect(result).toBe('1,234.00')
  })

  it('handles zero with precision', () => {
    const result = formatNumberWithPrecision(0, 'en', 2, 2)
    expect(result).toBe('0.00')
  })
})
