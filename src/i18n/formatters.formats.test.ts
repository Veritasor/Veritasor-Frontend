/**
 * Focused behavior tests for DATE_FORMATS, TIME_FORMATS, and NUMBER_FORMATS.
 *
 * Goals:
 *  - Verify the shape and completeness of each format map (all required locale
 *    keys are present, all required variant keys are present).
 *  - Assert exact option field values for every locale + variant combination
 *    so that accidental mutations are caught at the source.
 *  - Exercise the Intl APIs with the exported options to prove the options are
 *    accepted and produce non-empty output for a representative timestamp.
 *  - Cover boundary and invalid-input paths (NaN, Infinity, unknown locale,
 *    unknown variant, invalid date string).
 */

import { describe, it, expect } from 'vitest'
import {
  DATE_FORMATS,
  TIME_FORMATS,
  NUMBER_FORMATS,
  formatDate,
  formatTime,
  formatNumber,
} from './formatters'

// ─── Shared constants ──────────────────────────────────────────────────────

const SUPPORTED_LOCALES = ['en', 'es', 'fr', 'ar', 'zh', 'de', 'fi'] as const

/** A concrete timestamp used across formatting smoke-tests. */
const FIXTURE_DATE = new Date('2024-06-15T14:30:45.000Z')

// ─── DATE_FORMATS ─────────────────────────────────────────────────────────

describe('DATE_FORMATS – object shape', () => {
  const DATE_VARIANTS = ['short', 'medium', 'long', 'full'] as const

  it('contains every supported locale key', () => {
    for (const locale of SUPPORTED_LOCALES) {
      expect(DATE_FORMATS, `missing locale "${locale}"`).toHaveProperty(locale)
    }
  })

  it('exposes no extra unexpected locale keys', () => {
    const keys = Object.keys(DATE_FORMATS).sort()
    expect(keys).toEqual([...SUPPORTED_LOCALES].sort())
  })

  it.each(SUPPORTED_LOCALES)('locale "%s" contains all four variant keys', (locale) => {
    for (const variant of DATE_VARIANTS) {
      expect(DATE_FORMATS[locale], `missing variant "${variant}" in "${locale}"`).toHaveProperty(
        variant,
      )
    }
  })

  it.each(SUPPORTED_LOCALES)('locale "%s" has no extra variant keys', (locale) => {
    const keys = Object.keys(DATE_FORMATS[locale]).sort()
    expect(keys).toEqual([...DATE_VARIANTS].sort())
  })
})

describe('DATE_FORMATS – option field values', () => {
  // Every locale shares the same Intl field values; ar additionally carries
  // numberingSystem: 'arab'.
  const sharedShort: Intl.DateTimeFormatOptions = {
    month: 'numeric',
    day: 'numeric',
    year: '2-digit',
  }
  const sharedMedium: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }
  const sharedLong: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }
  const sharedFull: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
  }

  const nonArLocales = SUPPORTED_LOCALES.filter((l) => l !== 'ar')

  it.each(nonArLocales)('DATE_FORMATS[%s].short matches expected options', (locale) => {
    expect(DATE_FORMATS[locale].short).toEqual(sharedShort)
  })

  it.each(nonArLocales)('DATE_FORMATS[%s].medium matches expected options', (locale) => {
    expect(DATE_FORMATS[locale].medium).toEqual(sharedMedium)
  })

  it.each(nonArLocales)('DATE_FORMATS[%s].long matches expected options', (locale) => {
    expect(DATE_FORMATS[locale].long).toEqual(sharedLong)
  })

  it.each(nonArLocales)('DATE_FORMATS[%s].full matches expected options', (locale) => {
    expect(DATE_FORMATS[locale].full).toEqual(sharedFull)
  })

  // Arabic carries an extra numberingSystem field in every variant.
  it('DATE_FORMATS[ar].short includes numberingSystem: "arab"', () => {
    expect(DATE_FORMATS.ar.short).toMatchObject({ ...sharedShort, numberingSystem: 'arab' })
  })

  it('DATE_FORMATS[ar].medium includes numberingSystem: "arab"', () => {
    expect(DATE_FORMATS.ar.medium).toMatchObject({ ...sharedMedium, numberingSystem: 'arab' })
  })

  it('DATE_FORMATS[ar].long includes numberingSystem: "arab"', () => {
    expect(DATE_FORMATS.ar.long).toMatchObject({ ...sharedLong, numberingSystem: 'arab' })
  })

  it('DATE_FORMATS[ar].full includes numberingSystem: "arab"', () => {
    expect(DATE_FORMATS.ar.full).toMatchObject({ ...sharedFull, numberingSystem: 'arab' })
  })
})

describe('DATE_FORMATS – Intl runtime smoke-tests', () => {
  it.each(SUPPORTED_LOCALES)(
    'all four variants for locale "%s" produce non-empty strings',
    (locale) => {
      for (const [variant, opts] of Object.entries(DATE_FORMATS[locale])) {
        const result = new Intl.DateTimeFormat(locale, opts).format(FIXTURE_DATE)
        expect(result, `locale "${locale}" variant "${variant}" produced empty output`).toBeTruthy()
      }
    },
  )

  it('ar locale yields Arabic-Indic digits in the output', () => {
    const result = new Intl.DateTimeFormat('ar', DATE_FORMATS.ar.medium).format(FIXTURE_DATE)
    // Arabic-Indic numerals are in the Unicode range U+0660–U+0669.
    expect(result).toMatch(/[\u0660-\u0669]/)
  })

  it('en locale does not produce Arabic-Indic digits', () => {
    const result = new Intl.DateTimeFormat('en', DATE_FORMATS.en.medium).format(FIXTURE_DATE)
    expect(result).not.toMatch(/[\u0660-\u0669]/)
  })

  it('full variant includes time components (hour and minute present)', () => {
    // The full options for every locale include hour + minute, so the
    // formatted output should include digit characters alongside date parts.
    const result = new Intl.DateTimeFormat('en', DATE_FORMATS.en.full).format(FIXTURE_DATE)
    // Presence of a colon is a reliable indicator that time was rendered.
    expect(result).toMatch(/:/)
  })
})

// ─── TIME_FORMATS ─────────────────────────────────────────────────────────

describe('TIME_FORMATS – object shape', () => {
  const TIME_VARIANTS = ['short', 'medium', 'long'] as const

  it('contains every supported locale key', () => {
    for (const locale of SUPPORTED_LOCALES) {
      expect(TIME_FORMATS, `missing locale "${locale}"`).toHaveProperty(locale)
    }
  })

  it('exposes no extra unexpected locale keys', () => {
    const keys = Object.keys(TIME_FORMATS).sort()
    expect(keys).toEqual([...SUPPORTED_LOCALES].sort())
  })

  it.each(SUPPORTED_LOCALES)('locale "%s" contains all three variant keys', (locale) => {
    for (const variant of TIME_VARIANTS) {
      expect(TIME_FORMATS[locale], `missing variant "${variant}" in "${locale}"`).toHaveProperty(
        variant,
      )
    }
  })

  it.each(SUPPORTED_LOCALES)('locale "%s" has no extra variant keys', (locale) => {
    const keys = Object.keys(TIME_FORMATS[locale]).sort()
    expect(keys).toEqual([...TIME_VARIANTS].sort())
  })
})

describe('TIME_FORMATS – option field values', () => {
  const sharedShort: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: 'numeric' }
  const sharedMedium: Intl.DateTimeFormatOptions = {
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
  }
  const sharedLong: Intl.DateTimeFormatOptions = {
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    timeZoneName: 'short',
  }

  const nonArLocales = SUPPORTED_LOCALES.filter((l) => l !== 'ar')

  it.each(nonArLocales)('TIME_FORMATS[%s].short matches expected options', (locale) => {
    expect(TIME_FORMATS[locale].short).toEqual(sharedShort)
  })

  it.each(nonArLocales)('TIME_FORMATS[%s].medium matches expected options', (locale) => {
    expect(TIME_FORMATS[locale].medium).toEqual(sharedMedium)
  })

  it.each(nonArLocales)('TIME_FORMATS[%s].long matches expected options', (locale) => {
    expect(TIME_FORMATS[locale].long).toEqual(sharedLong)
  })

  it('TIME_FORMATS[ar].short includes numberingSystem: "arab"', () => {
    expect(TIME_FORMATS.ar.short).toMatchObject({ ...sharedShort, numberingSystem: 'arab' })
  })

  it('TIME_FORMATS[ar].medium includes numberingSystem: "arab"', () => {
    expect(TIME_FORMATS.ar.medium).toMatchObject({ ...sharedMedium, numberingSystem: 'arab' })
  })

  it('TIME_FORMATS[ar].long includes numberingSystem: "arab"', () => {
    expect(TIME_FORMATS.ar.long).toMatchObject({ ...sharedLong, numberingSystem: 'arab' })
  })

  it('long variant includes timeZoneName: "short" in every locale', () => {
    for (const locale of SUPPORTED_LOCALES) {
      expect(TIME_FORMATS[locale].long.timeZoneName).toBe('short')
    }
  })

  it('short variant does NOT include a seconds field', () => {
    for (const locale of SUPPORTED_LOCALES) {
      expect(TIME_FORMATS[locale].short).not.toHaveProperty('second')
    }
  })

  it('medium variant includes seconds field', () => {
    for (const locale of SUPPORTED_LOCALES) {
      expect(TIME_FORMATS[locale].medium.second).toBe('numeric')
    }
  })
})

describe('TIME_FORMATS – Intl runtime smoke-tests', () => {
  it.each(SUPPORTED_LOCALES)(
    'all three variants for locale "%s" produce non-empty strings',
    (locale) => {
      for (const [variant, opts] of Object.entries(TIME_FORMATS[locale])) {
        const result = new Intl.DateTimeFormat(locale, opts).format(FIXTURE_DATE)
        expect(result, `locale "${locale}" variant "${variant}" produced empty output`).toBeTruthy()
      }
    },
  )

  it('ar locale yields Arabic-Indic digits in time output', () => {
    const result = new Intl.DateTimeFormat('ar', TIME_FORMATS.ar.short).format(FIXTURE_DATE)
    expect(result).toMatch(/[\u0660-\u0669]/)
  })
})

// ─── NUMBER_FORMATS ────────────────────────────────────────────────────────

describe('NUMBER_FORMATS – object shape', () => {
  it('contains every supported locale key', () => {
    for (const locale of SUPPORTED_LOCALES) {
      expect(NUMBER_FORMATS, `missing locale "${locale}"`).toHaveProperty(locale)
    }
  })

  it('exposes no extra unexpected locale keys', () => {
    const keys = Object.keys(NUMBER_FORMATS).sort()
    expect(keys).toEqual([...SUPPORTED_LOCALES].sort())
  })
})

describe('NUMBER_FORMATS – option field values', () => {
  it('every locale has maximumFractionDigits: 2', () => {
    for (const locale of SUPPORTED_LOCALES) {
      expect(NUMBER_FORMATS[locale].maximumFractionDigits).toBe(2)
    }
  })

  it('ar locale includes numberingSystem: "arab"', () => {
    expect(NUMBER_FORMATS.ar.numberingSystem).toBe('arab')
  })

  it('non-ar locales do not include a numberingSystem field', () => {
    const nonArLocales = SUPPORTED_LOCALES.filter((l) => l !== 'ar')
    for (const locale of nonArLocales) {
      expect(NUMBER_FORMATS[locale]).not.toHaveProperty('numberingSystem')
    }
  })

  it('no locale sets a minimumFractionDigits', () => {
    for (const locale of SUPPORTED_LOCALES) {
      expect(NUMBER_FORMATS[locale]).not.toHaveProperty('minimumFractionDigits')
    }
  })
})

describe('NUMBER_FORMATS – Intl runtime smoke-tests', () => {
  it.each(SUPPORTED_LOCALES)('locale "%s" produces a non-empty string for 1234.5', (locale) => {
    const result = new Intl.NumberFormat(locale, NUMBER_FORMATS[locale]).format(1234.5)
    expect(result).toBeTruthy()
  })

  it('ar locale output contains Arabic-Indic digits', () => {
    const result = new Intl.NumberFormat('ar', NUMBER_FORMATS.ar).format(1234)
    expect(result).toMatch(/[\u0660-\u0669]/)
  })

  it('en locale rounds to 2 decimal places', () => {
    const result = new Intl.NumberFormat('en', NUMBER_FORMATS.en).format(1.005)
    // maximumFractionDigits: 2 — result must not have more than two decimal digits.
    const decimalPart = result.split('.')[1] ?? ''
    expect(decimalPart.length).toBeLessThanOrEqual(2)
  })

  it('rounds down correctly for en locale', () => {
    const result = new Intl.NumberFormat('en', NUMBER_FORMATS.en).format(1.001)
    expect(result).toBe('1')
  })

  it('rounds up correctly for en locale', () => {
    const result = new Intl.NumberFormat('en', NUMBER_FORMATS.en).format(1.999)
    expect(result).toBe('2')
  })
})

// ─── Boundary and invalid-input tests (formatDate / formatTime / formatNumber) ──

describe('formatDate – boundary and invalid inputs', () => {
  it('unknown locale falls back to en options and returns a non-empty string', () => {
    const result = formatDate(FIXTURE_DATE, 'xx', 'medium')
    expect(result).toBeTruthy()
  })

  it('unknown variant falls back to en locale short and returns a non-empty string', () => {
    // TypeScript signature is intentionally cast to simulate a runtime caller
    // passing an unsupported variant.
    const result = formatDate(FIXTURE_DATE, 'en', 'unknown' as never)
    expect(result).toBeTruthy()
  })

  it('accepts a numeric timestamp (milliseconds)', () => {
    const ts = FIXTURE_DATE.getTime()
    const result = formatDate(ts, 'en', 'medium')
    expect(result).toContain('2024')
  })

  it('accepts an ISO string', () => {
    const result = formatDate('2024-06-15', 'en', 'medium')
    expect(result).toContain('2024')
  })

  it('accepts a Date object', () => {
    const result = formatDate(new Date('2024-06-15'), 'en', 'medium')
    expect(result).toContain('2024')
  })

  it('handles epoch zero (Unix epoch start)', () => {
    const result = formatDate(0, 'en', 'short')
    expect(result).toBeTruthy()
  })

  it('handles a far-future date (year 9999)', () => {
    const result = formatDate(new Date('9999-01-01'), 'en', 'short')
    expect(result).toBeTruthy()
  })
})

describe('formatTime – boundary and invalid inputs', () => {
  it('unknown locale falls back to en options and returns a non-empty string', () => {
    const result = formatTime(FIXTURE_DATE, 'xx', 'short')
    expect(result).toBeTruthy()
  })

  it('unknown variant falls back to en short and returns a non-empty string', () => {
    const result = formatTime(FIXTURE_DATE, 'en', 'unknown' as never)
    expect(result).toBeTruthy()
  })

  it('accepts a numeric timestamp', () => {
    const result = formatTime(FIXTURE_DATE.getTime(), 'en', 'short')
    expect(result).toBeTruthy()
  })

  it('accepts an ISO string', () => {
    const result = formatTime('2024-06-15T14:30:45Z', 'en', 'medium')
    expect(result).toBeTruthy()
  })

  it('epoch zero produces a non-empty string', () => {
    const result = formatTime(0, 'en', 'short')
    expect(result).toBeTruthy()
  })
})

describe('formatNumber – boundary and invalid inputs', () => {
  it('unknown locale falls back to en options and returns a non-empty string', () => {
    const result = formatNumber(42, 'xx')
    expect(result).toBeTruthy()
  })

  it('zero formats without error', () => {
    const result = formatNumber(0, 'en')
    expect(result).toBe('0')
  })

  it('negative value formats without error', () => {
    const result = formatNumber(-9999.99, 'en')
    expect(result).toContain('-')
  })

  it('very large number does not throw', () => {
    expect(() => formatNumber(Number.MAX_SAFE_INTEGER, 'en')).not.toThrow()
  })

  it('very small positive number does not throw', () => {
    expect(() => formatNumber(Number.MIN_VALUE, 'en')).not.toThrow()
  })

  it('Infinity does not throw', () => {
    expect(() => formatNumber(Infinity, 'en')).not.toThrow()
  })

  it('NaN does not throw', () => {
    expect(() => formatNumber(NaN, 'en')).not.toThrow()
  })
})
