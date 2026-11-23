import { describe, it, expect } from 'vitest'
import {
  base32Encode,
  base32Decode,
  generateTotpSecret,
  formatTotpSecret,
  buildOtpAuthUri,
  generateTotp,
  verifyTotp,
  type TotpAlgorithm,
} from './totp'

const encoder = new TextEncoder()

// RFC 6238 Appendix B test secrets (ASCII)
const RFC_SHA1_SECRET = encoder.encode('12345678901234567890')
const RFC_SHA256_SECRET = encoder.encode('12345678901234567890123456789012')
const RFC_SHA512_SECRET = encoder.encode(
  '1234567890123456789012345678901234567890123456789012345678901234',
)

// RFC 6238 Appendix B test vectors (T0 = 0, X = 30, digits = 8)
const RFC_6238_VECTORS: Array<{
  timeSec: number
  algorithm: TotpAlgorithm
  secret: Uint8Array
  expected: string
}> = [
  { timeSec: 59, algorithm: 'SHA-1', secret: RFC_SHA1_SECRET, expected: '94287082' },
  { timeSec: 59, algorithm: 'SHA-256', secret: RFC_SHA256_SECRET, expected: '46119246' },
  { timeSec: 59, algorithm: 'SHA-512', secret: RFC_SHA512_SECRET, expected: '90693936' },

  { timeSec: 1111111109, algorithm: 'SHA-1', secret: RFC_SHA1_SECRET, expected: '07081804' },
  { timeSec: 1111111109, algorithm: 'SHA-256', secret: RFC_SHA256_SECRET, expected: '68084774' },
  { timeSec: 1111111109, algorithm: 'SHA-512', secret: RFC_SHA512_SECRET, expected: '25091201' },

  { timeSec: 1111111111, algorithm: 'SHA-1', secret: RFC_SHA1_SECRET, expected: '14050471' },
  { timeSec: 1111111111, algorithm: 'SHA-256', secret: RFC_SHA256_SECRET, expected: '67062674' },
  { timeSec: 1111111111, algorithm: 'SHA-512', secret: RFC_SHA512_SECRET, expected: '99943326' },

  { timeSec: 1234567890, algorithm: 'SHA-1', secret: RFC_SHA1_SECRET, expected: '89005924' },
  { timeSec: 1234567890, algorithm: 'SHA-256', secret: RFC_SHA256_SECRET, expected: '91819424' },
  { timeSec: 1234567890, algorithm: 'SHA-512', secret: RFC_SHA512_SECRET, expected: '93441116' },

  { timeSec: 2000000000, algorithm: 'SHA-1', secret: RFC_SHA1_SECRET, expected: '69279037' },
  { timeSec: 2000000000, algorithm: 'SHA-256', secret: RFC_SHA256_SECRET, expected: '90698825' },
  { timeSec: 2000000000, algorithm: 'SHA-512', secret: RFC_SHA512_SECRET, expected: '38618901' },

  { timeSec: 20000000000, algorithm: 'SHA-1', secret: RFC_SHA1_SECRET, expected: '65353130' },
  { timeSec: 20000000000, algorithm: 'SHA-256', secret: RFC_SHA256_SECRET, expected: '77737706' },
  { timeSec: 20000000000, algorithm: 'SHA-512', secret: RFC_SHA512_SECRET, expected: '47863826' },
]

describe('totp service — Base32', () => {
  it('round-trips arbitrary bytes', () => {
    const raw = encoder.encode('12345678901234567890')
    const encoded = base32Encode(raw)
    expect(encoded).toBe('GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ')
    expect(Array.from(base32Decode(encoded))).toEqual(Array.from(raw))
  })

  it('ignores whitespace, dashes, padding, and lowercase when decoding', () => {
    const decoded = base32Decode('gezd-gnbv gy3t qojq====')
    expect(new TextDecoder().decode(decoded)).toBe('1234567890')
  })

  it('throws on invalid Base32 characters', () => {
    expect(() => base32Decode('INVALID!0189')).toThrow(/Invalid Base32 character/)
  })
})

describe('totp service — RFC 6238 test vectors', () => {
  it.each(RFC_6238_VECTORS)(
    'matches RFC 6238 vector for $algorithm at t=$timeSec ($expected)',
    async ({ timeSec, algorithm, secret, expected }) => {
      const code = await generateTotp(secret, {
        timestamp: timeSec * 1000,
        period: 30,
        digits: 8,
        algorithm,
      })
      expect(code).toBe(expected)
    },
  )

  it('works with Base32-encoded RFC 6238 SHA-1 secret', async () => {
    const base32Secret = base32Encode(RFC_SHA1_SECRET)
    const code = await generateTotp(base32Secret, {
      timestamp: 59 * 1000,
      period: 30,
      digits: 8,
      algorithm: 'SHA-1',
    })
    expect(code).toBe('94287082')
  })
})

describe('totp service — verifyTotp', () => {
  it('verifies a valid 6-digit code at the exact timestamp', async () => {
    const secret = generateTotpSecret()
    const now = 1_700_000_000_000
    const code = await generateTotp(secret, { timestamp: now })
    expect(code).toMatch(/^\d{6}$/)
    expect(await verifyTotp(secret, code, { timestamp: now })).toBe(true)
  })

  it('accepts codes within ±1 step clock-skew window', async () => {
    const secret = generateTotpSecret()
    const now = 1_700_000_000_000
    const prevStepCode = await generateTotp(secret, { timestamp: now - 30_000 })
    const nextStepCode = await generateTotp(secret, { timestamp: now + 30_000 })

    expect(await verifyTotp(secret, prevStepCode, { timestamp: now, window: 1 })).toBe(true)
    expect(await verifyTotp(secret, nextStepCode, { timestamp: now, window: 1 })).toBe(true)
  })

  it('rejects codes outside the clock-skew window', async () => {
    const secret = generateTotpSecret()
    const now = 1_700_000_000_000
    const staleCode = await generateTotp(secret, { timestamp: now - 90_000 })
    expect(await verifyTotp(secret, staleCode, { timestamp: now, window: 1 })).toBe(false)
  })

  it('rejects malformed or wrong-length tokens', async () => {
    const secret = generateTotpSecret()
    expect(await verifyTotp(secret, 'abcdef')).toBe(false)
    expect(await verifyTotp(secret, '12345')).toBe(false)
    expect(await verifyTotp(secret, '')).toBe(false)
  })
})

describe('totp service — helpers', () => {
  it('generates 32-character Base32 secrets by default (20 bytes)', () => {
    const secret = generateTotpSecret()
    expect(secret).toMatch(/^[A-Z2-7]{32}$/)
  })

  it('formats secrets in 4-character groups', () => {
    expect(formatTotpSecret('GEZDGNBVGY3TQOJQ')).toBe('GEZD GNBV GY3T QOJQ')
  })

  it('builds a valid otpauth://totp URI', () => {
    const uri = buildOtpAuthUri({
      secret: 'GEZDGNBVGY3TQOJQ',
      accountName: 'joel@example.com',
      issuer: 'Veritasor',
    })
    expect(uri).toContain('otpauth://totp/Veritasor:joel%40example.com?')
    expect(uri).toContain('secret=GEZDGNBVGY3TQOJQ')
    expect(uri).toContain('issuer=Veritasor')
    expect(uri).toContain('algorithm=SHA1')
    expect(uri).toContain('digits=6')
    expect(uri).toContain('period=30')
  })
})
