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

describe('i18n/config helpers', () => {
  describe('getLocaleDirection', () => {
    it('returns rtl for Arabic', () => {
      expect(getLocaleDirection('ar')).toBe('rtl')
    })

    it('returns ltr for all other supported locales', () => {
      const ltrLocales = SUPPORTED_LOCALES.filter((item) => item.code !== 'ar')
      for (const locale of ltrLocales) {
        expect(getLocaleDirection(locale.code)).toBe('ltr')
      }
    })

    it('falls back to ltr for unsupported or empty locales', () => {
      expect(getLocaleDirection('xx')).toBe('ltr')
      expect(getLocaleDirection('')).toBe('ltr')
    })
  })

  describe('normalizeLocale', () => {
    it('returns DEFAULT_LOCALE for an empty string', () => {
      expect(normalizeLocale('')).toBe(DEFAULT_LOCALE)
    })

    it('matches supported locales case-insensitively', () => {
      expect(normalizeLocale('EN')).toBe('en')
      expect(normalizeLocale('Fr')).toBe('fr')
      expect(normalizeLocale('AR')).toBe('ar')
    })

    it('strips region subtags to match the base language', () => {
      expect(normalizeLocale('de-AT')).toBe('de')
      expect(normalizeLocale('zh-CN')).toBe('zh')
      expect(normalizeLocale('en-US')).toBe('en')
      expect(normalizeLocale('ES-mx')).toBe('es')
    })

    it('falls back to DEFAULT_LOCALE for unsupported locales', () => {
      expect(normalizeLocale('xx')).toBe(DEFAULT_LOCALE)
      expect(normalizeLocale('xx-YY')).toBe(DEFAULT_LOCALE)
    })
  })

  describe('resolveInitialLocale', () => {
    beforeEach(() => {
      window.localStorage.clear()
    })

    afterEach(() => {
      vi.restoreAllMocks()
      vi.unstubAllGlobals()
      window.localStorage.clear()
    })

    it('returns FALLBACK_LOCALE when window is undefined', () => {
      vi.stubGlobal('window', undefined)
      expect(resolveInitialLocale()).toBe(FALLBACK_LOCALE)
    })

    it('prefers a valid saved locale from localStorage over navigator.language', () => {
      vi.spyOn(window.navigator, 'language', 'get').mockReturnValue('fr-FR')
      window.localStorage.setItem(LOCALE_STORAGE_KEY, 'de-AT')

      expect(resolveInitialLocale()).toBe('de')
    })

    it('respects explicitly saved default locale over navigator.language', () => {
      vi.spyOn(window.navigator, 'language', 'get').mockReturnValue('fr-FR')
      window.localStorage.setItem(LOCALE_STORAGE_KEY, 'EN')

      expect(resolveInitialLocale()).toBe('en')
    })

    it('ignores corrupted/unsupported localStorage values and falls back to navigator.language', () => {
      vi.spyOn(window.navigator, 'language', 'get').mockReturnValue('es-ES')
      window.localStorage.setItem(LOCALE_STORAGE_KEY, 'corrupted-locale')

      expect(resolveInitialLocale()).toBe('es')
    })

    it('uses navigator.language when localStorage has no saved locale', () => {
      vi.spyOn(window.navigator, 'language', 'get').mockReturnValue('fi-FI')

      expect(resolveInitialLocale()).toBe('fi')
    })

    it('falls back to FALLBACK_LOCALE when both storage and navigator.language are unsupported', () => {
      vi.spyOn(window.navigator, 'language', 'get').mockReturnValue('xx-YY')
      window.localStorage.setItem(LOCALE_STORAGE_KEY, 'zz')

      expect(resolveInitialLocale()).toBe(FALLBACK_LOCALE)
    })

    it('falls back to FALLBACK_LOCALE when navigator.language is empty and storage is empty', () => {
      vi.spyOn(window.navigator, 'language', 'get').mockReturnValue('')

      expect(resolveInitialLocale()).toBe(FALLBACK_LOCALE)
    })
  })
})
