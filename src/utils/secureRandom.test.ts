import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { randomBase36, randomHex } from './secureRandom'

describe('secureRandom', () => {
  let nextByte: number

  beforeEach(() => {
    nextByte = 0
    vi.stubGlobal('crypto', {
      getRandomValues: vi.fn((values: Uint8Array) => {
        for (let index = 0; index < values.length; index += 1) {
          values[index] = nextByte
          nextByte = (nextByte + 1) % 252
        }
        return values
      }),
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns lowercase hexadecimal with two characters per byte', () => {
    expect(randomHex(3)).toBe('000102')
  })

  it('returns the requested number of base-36 characters', () => {
    expect(randomBase36(6)).toBe('012345')
  })

  it('generates unique values from successive random byte sequences', () => {
    const hexValues = Array.from({ length: 10 }, () => randomHex(8))
    const base36Values = Array.from({ length: 10 }, () => randomBase36(6))

    expect(new Set(hexValues).size).toBe(hexValues.length)
    expect(new Set(base36Values).size).toBe(base36Values.length)
  })
})
