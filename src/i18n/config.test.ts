import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  DEFAULT_LOCALE,
  FALLBACK_LOCALE,
  LOCALE_STORAGE_KEY,
  SUPPORTED_LOCALES,
  getLocaleDirection,
  normalizeLocale,
  resolveInitialLocale,
} from './config'

beforeEach(() => {
  vi.unstubAllGlobals()
  window.localStorage.clear()
  Object.defineProperty(window.navigator, 'language', { value: 'en-US', configurable: true })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('locale configuration', () => {
  it('exposes the supported locales with stable codes and valid metadata', () => {
    expect(SUPPORTED_LOCALES.map(({ code }) => code)).toEqual(['en', 'es', 'fr', 'ar', 'zh', 'de', 'fi'])
    expect(SUPPORTED_LOCALES.find(({ code }) => code === 'ar')?.dir).toBe('rtl')
    expect(SUPPORTED_LOCALES.filter(({ code }) => code !== 'ar').every(({ dir }) => dir === 'ltr')).toBe(true)
    expect(SUPPORTED_LOCALES.every(({ label, nativeLabel, translationCompletion }) =>
      Boolean(label && nativeLabel) && translationCompletion >= 0 && translationCompletion <= 100,
    )).toBe(true)
  })

  it('uses English as both the default and fallback locale', () => {
    expect(DEFAULT_LOCALE).toBe('en')
    expect(FALLBACK_LOCALE).toBe('en')
  })

  it('normalizes supported locale codes and language tags case-insensitively', () => {
    expect(normalizeLocale('es')).toBe('es')
    expect(normalizeLocale('ES-mx')).toBe('es')
    expect(normalizeLocale('zh-CN')).toBe('zh')
  })

  it('defaults empty and unsupported locale inputs to English', () => {
    expect(normalizeLocale('')).toBe(DEFAULT_LOCALE)
    expect(normalizeLocale('xx-YY')).toBe(DEFAULT_LOCALE)
    expect(normalizeLocale(' es-MX')).toBe(DEFAULT_LOCALE)
  })

  it('returns the configured text direction or ltr for unsupported locales', () => {
    expect(getLocaleDirection('ar')).toBe('rtl')
    expect(getLocaleDirection('en')).toBe('ltr')
    expect(getLocaleDirection('xx')).toBe('ltr')
  })
})

describe('resolveInitialLocale', () => {
  it('prefers a saved supported locale over the browser locale', () => {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, 'fr')
    Object.defineProperty(window.navigator, 'language', { value: 'es-MX', configurable: true })

    expect(resolveInitialLocale()).toBe('fr')
  })

  it('uses the browser language when no preference is saved', () => {
    Object.defineProperty(window.navigator, 'language', { value: 'de-AT', configurable: true })

    expect(resolveInitialLocale()).toBe('de')
  })

  it('ignores an invalid saved preference and resolves from the browser language', () => {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, 'xx')
    Object.defineProperty(window.navigator, 'language', { value: 'fi-FI', configurable: true })

    expect(resolveInitialLocale()).toBe('fi')
  })

  it('uses the fallback when both saved and browser locales are unsupported', () => {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, 'xx')
    Object.defineProperty(window.navigator, 'language', { value: 'yy-ZZ', configurable: true })

    expect(resolveInitialLocale()).toBe(FALLBACK_LOCALE)
  })

  it('uses the fallback when window is unavailable', () => {
    vi.stubGlobal('window', undefined)

    expect(resolveInitialLocale()).toBe(FALLBACK_LOCALE)
  })
})
