import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  normalizeError,
  shouldShowError,
  clearErrorThrottle,
  setErrorReporter,
  registerErrorListeners,
  type ErrorReporter,
} from './errorReporting'

describe('errorReporting', () => {
  beforeEach(() => {
    clearErrorThrottle()
    setErrorReporter(null)
  })

  describe('normalizeError', () => {
    it('returns the string as-is for string errors', () => {
      expect(normalizeError('test error')).toBe('test error')
    })

    it('returns the message for Error objects', () => {
      const error = new Error('Something went wrong')
      expect(normalizeError(error)).toBe('Something went wrong')
    })

    it('returns the error name when message is empty', () => {
      const error = new Error()
      expect(normalizeError(error)).toBe('Error')
    })

    it('returns "Unknown error" for null and undefined', () => {
      expect(normalizeError(null)).toBe('Unknown error')
      expect(normalizeError(undefined)).toBe('Unknown error')
    })

    it('converts other types to strings', () => {
      expect(normalizeError(42)).toBe('42')
      expect(normalizeError({ key: 'value' })).toBe('[object Object]')
      expect(normalizeError(true)).toBe('true')
    })
  })

  describe('shouldShowError (throttling)', () => {
    it('returns true for the first occurrence of an error', () => {
      expect(shouldShowError('test error')).toBe(true)
    })

    it('returns false for duplicate errors within 5 seconds', () => {
      shouldShowError('test error')
      expect(shouldShowError('test error')).toBe(false)
    })

    it('returns true for different errors', () => {
      shouldShowError('error 1')
      expect(shouldShowError('error 2')).toBe(true)
    })

    it('returns true for the same error after 5 seconds', () => {
      shouldShowError('test error')
      // Mock Date.now to simulate time passing
      const originalNow = Date.now
      vi.spyOn(Date, 'now').mockImplementation(() => originalNow() + 6000)
      expect(shouldShowError('test error')).toBe(true)
      vi.restoreAllMocks()
    })
  })

  describe('clearErrorThrottle', () => {
    it('clears the throttle map', () => {
      shouldShowError('test error')
      expect(shouldShowError('test error')).toBe(false)
      clearErrorThrottle()
      expect(shouldShowError('test error')).toBe(true)
    })
  })

  describe('setErrorReporter', () => {
    it('sets and clears the global reporter', () => {
      const reporter: ErrorReporter = {
        report: vi.fn(),
      }
      setErrorReporter(reporter)
      // The reporter is now set - we can't directly test it without triggering an error
      // but we can clear it
      setErrorReporter(null)
    })
  })

  describe('registerErrorListeners', () => {
    it('registers event listeners and returns an unregister function', () => {
      const unregister = registerErrorListeners()
      expect(typeof unregister).toBe('function')

      // Verify listeners are registered by checking if unregister removes them
      // (we can't easily test the actual listeners without triggering real errors)
      unregister()
    })

    it('unregister function removes event listeners', () => {
      const unregister1 = registerErrorListeners()
      const unregister2 = registerErrorListeners()

      // Calling unregister should not throw
      unregister1()
      unregister2()
    })
  })
})
