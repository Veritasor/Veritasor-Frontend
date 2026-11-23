/**
 * RFC 6238 Time-Based One-Time Password (TOTP) service using WebCrypto HMAC.
 *
 * Implements:
 * - RFC 4648 Base32 encoding and decoding
 * - RFC 4226 HOTP dynamic truncation
 * - RFC 6238 TOTP generation and verification with configurable clock-skew window
 * - Cryptographically random secret generation and otpauth:// URI formatting
 */

export type TotpAlgorithm = 'SHA-1' | 'SHA-256' | 'SHA-512'

export interface TotpOptions {
  /** Timestamp in milliseconds since Unix epoch. Defaults to `Date.now()`. */
  timestamp?: number
  /** Time step in seconds. Defaults to 30 (RFC 6238). */
  period?: number
  /** Number of OTP digits. Defaults to 6. */
  digits?: number
  /** HMAC hash algorithm. Defaults to `'SHA-1'`. */
  algorithm?: TotpAlgorithm
}

export interface VerifyTotpOptions extends TotpOptions {
  /** Number of time steps before/after current step to accept. Defaults to 1. */
  window?: number
}

export interface OtpAuthUriParams {
  secret: string
  accountName: string
  issuer?: string
  algorithm?: TotpAlgorithm
  digits?: number
  period?: number
}

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

/**
 * Encode raw bytes to an unpadded RFC 4648 Base32 string.
 */
export function base32Encode(bytes: Uint8Array): string {
  let bits = 0
  let value = 0
  let output = ''

  for (let i = 0; i < bytes.length; i++) {
    value = (value << 8) | bytes[i]
    bits += 8
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31]
      bits -= 5
    }
  }

  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31]
  }

  return output
}

/**
 * Decode an RFC 4648 Base32 string (case-insensitive, ignoring whitespace, dashes, and `=` padding).
 */
export function base32Decode(input: string): Uint8Array {
  const cleaned = input.toUpperCase().replace(/[\s=-]/g, '')
  if (cleaned.length === 0) {
    return new Uint8Array(0)
  }

  const output: number[] = []
  let bits = 0
  let value = 0

  for (let i = 0; i < cleaned.length; i++) {
    const idx = BASE32_ALPHABET.indexOf(cleaned[i])
    if (idx === -1) {
      throw new Error(`Invalid Base32 character: "${cleaned[i]}"`)
    }
    value = (value << 5) | idx
    bits += 5
    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 0xff)
      bits -= 8
    }
  }

  return new Uint8Array(output)
}

/**
 * Generate a cryptographically random Base32-encoded TOTP secret.
 * Defaults to 20 bytes (160 bits), matching RFC 4226 / RFC 6238 recommendations.
 */
export function generateTotpSecret(byteLength = 20): string {
  const bytes = new Uint8Array(byteLength)
  crypto.getRandomValues(bytes)
  return base32Encode(bytes)
}

/**
 * Format a Base32 secret into readable 4-character groups for manual entry.
 */
export function formatTotpSecret(secret: string): string {
  const cleaned = secret.toUpperCase().replace(/[\s=-]/g, '')
  return cleaned.match(/.{1,4}/g)?.join(' ') ?? cleaned
}

/**
 * Build a standard `otpauth://totp/...` URI for QR code provisioning.
 */
export function buildOtpAuthUri({
  secret,
  accountName,
  issuer = 'Veritasor',
  algorithm = 'SHA-1',
  digits = 6,
  period = 30,
}: OtpAuthUriParams): string {
  const algoParam = algorithm.replace('-', '')
  const label = `${encodeURIComponent(issuer)}:${encodeURIComponent(accountName)}`
  const params = new URLSearchParams({
    secret: secret.toUpperCase().replace(/[\s=-]/g, ''),
    issuer,
    algorithm: algoParam,
    digits: String(digits),
    period: String(period),
  })
  return `otpauth://totp/${label}?${params.toString()}`
}

function toKeyBytes(secret: string | Uint8Array): Uint8Array {
  return typeof secret === 'string' ? base32Decode(secret) : secret
}

function counterToBytes(counter: number): Uint8Array {
  const buf = new ArrayBuffer(8)
  const view = new DataView(buf)
  const high = Math.floor(counter / 0x100000000)
  const low = counter >>> 0
  view.setUint32(0, high, false)
  view.setUint32(4, low, false)
  return new Uint8Array(buf)
}

/**
 * Generate a TOTP code per RFC 6238 using WebCrypto HMAC.
 */
export async function generateTotp(
  secret: string | Uint8Array,
  options: TotpOptions = {},
): Promise<string> {
  const {
    timestamp = Date.now(),
    period = 30,
    digits = 6,
    algorithm = 'SHA-1',
  } = options

  const keyBytes = toKeyBytes(secret)
  if (keyBytes.length === 0) {
    throw new Error('TOTP secret must not be empty')
  }

  const counter = Math.floor(timestamp / 1000 / period)
  const counterBytes = counterToBytes(counter)

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyBytes.buffer.slice(keyBytes.byteOffset, keyBytes.byteOffset + keyBytes.byteLength) as ArrayBuffer,
    { name: 'HMAC', hash: { name: algorithm } },
    false,
    ['sign'],
  )

  const signature = await crypto.subtle.sign(
    'HMAC',
    cryptoKey,
    counterBytes.buffer.slice(counterBytes.byteOffset, counterBytes.byteOffset + counterBytes.byteLength) as ArrayBuffer,
  )
  const hmac = new Uint8Array(signature)

  // RFC 4226 §5.4 Dynamic Truncation
  const offset = hmac[hmac.length - 1] & 0x0f
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff)

  const otp = binary % 10 ** digits
  return otp.toString().padStart(digits, '0')
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return diff === 0
}

/**
 * Verify a user-supplied TOTP token against a secret within `±window` time steps.
 */
export async function verifyTotp(
  secret: string | Uint8Array,
  token: string,
  options: VerifyTotpOptions = {},
): Promise<boolean> {
  const {
    timestamp = Date.now(),
    period = 30,
    digits = 6,
    algorithm = 'SHA-1',
    window: skewWindow = 1,
  } = options

  const normalized = token.replace(/[\s-]/g, '')
  if (!/^\d+$/.test(normalized) || normalized.length !== digits) {
    return false
  }

  const stepMs = period * 1000
  for (let offset = -skewWindow; offset <= skewWindow; offset++) {
    const candidate = await generateTotp(secret, {
      timestamp: timestamp + offset * stepMs,
      period,
      digits,
      algorithm,
    })
    if (constantTimeEqual(candidate, normalized)) {
      return true
    }
  }

  return false
}
