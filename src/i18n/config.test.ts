import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  DEFAULT_LOCALE,
  FALLBACK_LOCALE,
  LOCALE_STORAGE_KEY,
  SUPPORTED_LOCALES,
  getLocaleDirection,
  normalizeLocale,
  resolveInitialLocale,
} from './config'

describe('i18n/config', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('exposes supported locales with default and fallback set to en', () => {
    expect(DEFAULT_LOCALE).toBe('en')
    expect(FALLBACK_LOCALE).toBe('en')
    expect(SUPPORTED_LOCALES.length).toBeGreaterThanOrEqual(7)
  })

  it('returns rtl for Arabic and ltr for others or unknown locales', () => {
    expect(getLocaleDirection('ar')).toBe('rtl')
    expect(getLocaleDirection('en')).toBe('ltr')
    expect(getLocaleDirection('fr')).toBe('ltr')
    expect(getLocaleDirection('unknown')).toBe('ltr')
  })

  it('normalizes empty, exact, uppercase, region-tagged, and unsupported locales', () => {
    expect(normalizeLocale('')).toBe('en')
    expect(normalizeLocale('fr')).toBe('fr')
    expect(normalizeLocale('DE')).toBe('de')
    expect(normalizeLocale('es-MX')).toBe('es')
    expect(normalizeLocale('zh-CN')).toBe('zh')
    expect(normalizeLocale('pt-BR')).toBe('en')
  })

  it('resolves initial locale from localStorage when valid', () => {
    localStorage.setItem(LOCALE_STORAGE_KEY, 'fr-CA')
    expect(resolveInitialLocale()).toBe('fr')

    localStorage.setItem(LOCALE_STORAGE_KEY, 'en')
    expect(resolveInitialLocale()).toBe('en')
  })

  it('falls back to navigator.language when localStorage is empty or unsupported', () => {
    vi.spyOn(window.navigator, 'language', 'get').mockReturnValue('de-DE')
    expect(resolveInitialLocale()).toBe('de')

    localStorage.setItem(LOCALE_STORAGE_KEY, 'xx-YY')
    expect(resolveInitialLocale()).toBe('de')
  })

  it('falls back to en when both localStorage and navigator.language are unsupported', () => {
    vi.spyOn(window.navigator, 'language', 'get').mockReturnValue('ja-JP')
    expect(resolveInitialLocale()).toBe('en')
  })
})
