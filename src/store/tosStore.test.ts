import { beforeEach, describe, expect, it } from 'vitest'
import {
  CURRENT_TOS_VERSION,
  TOS_STORAGE_KEY,
  acceptTos,
  compareSemver,
  getTosState,
  hydrateTosStore,
  isTosAcceptanceRequired,
  resetTosStore,
} from './tosStore'

describe('tosStore', () => {
  beforeEach(() => {
    window.localStorage.clear()
    resetTosStore()
  })

  describe('compareSemver', () => {
    it('compares major, minor, and patch versions with or without leading v', () => {
      expect(compareSemver('v2.3.0', 'v2.4.0')).toBe(-1)
      expect(compareSemver('2.3.0', '2.4.0')).toBe(-1)
      expect(compareSemver('v2.4.0', 'v2.4.0')).toBe(0)
      expect(compareSemver('v2.4.1', 'v2.4.0')).toBe(1)
      expect(compareSemver('v3.0.0', 'v2.9.9')).toBe(1)
    })

    it('treats invalid versions as older than valid semver', () => {
      expect(compareSemver('invalid', 'v2.4.0')).toBe(-1)
      expect(compareSemver('v2.4.0', 'invalid')).toBe(1)
    })
  })

  describe('isTosAcceptanceRequired', () => {
    it('requires acceptance when no version is accepted', () => {
      expect(isTosAcceptanceRequired(null, CURRENT_TOS_VERSION)).toBe(true)
    })

    it('requires acceptance on upgrade from v2.3.0 to v2.4.0', () => {
      expect(isTosAcceptanceRequired('v2.3.0', 'v2.4.0')).toBe(true)
      expect(isTosAcceptanceRequired('2.3.0', 'v2.4.0')).toBe(true)
    })

    it('does not require acceptance when current or newer version is accepted', () => {
      expect(isTosAcceptanceRequired('v2.4.0', 'v2.4.0')).toBe(false)
      expect(isTosAcceptanceRequired('v2.5.0', 'v2.4.0')).toBe(false)
    })
  })

  describe('persistence', () => {
    it('persists accepted version and ISO timestamp to localStorage', () => {
      const ts = '2026-07-29T12:00:00.000Z'
      const record = acceptTos('v2.4.0', ts)

      expect(record).toEqual({
        acceptedVersion: 'v2.4.0',
        acceptedAt: ts,
      })
      expect(getTosState()).toEqual(record)

      const raw = window.localStorage.getItem(TOS_STORAGE_KEY)
      expect(raw).not.toBeNull()
      expect(JSON.parse(raw!)).toEqual(record)
    })

    it('hydrates previously accepted v2.3.0 from localStorage and flags upgrade required', () => {
      window.localStorage.setItem(
        TOS_STORAGE_KEY,
        JSON.stringify({
          acceptedVersion: 'v2.3.0',
          acceptedAt: '2026-01-10T08:30:00.000Z',
        }),
      )

      const hydrated = hydrateTosStore()
      expect(hydrated.acceptedVersion).toBe('v2.3.0')
      expect(isTosAcceptanceRequired(hydrated.acceptedVersion, CURRENT_TOS_VERSION)).toBe(true)
    })
  })
})
