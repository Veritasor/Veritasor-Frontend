/**
 * Cryptographically strong ID generation utilities.
 */

let fallbackCounter = 0

function generateUuidFallback(): string {
  const cryptoObj = globalThis.crypto
  if (cryptoObj && typeof cryptoObj.getRandomValues === 'function') {
    const bytes = new Uint8Array(16)
    cryptoObj.getRandomValues(bytes)
    // Set RFC 4122 version 4 and variant bits
    bytes[6] = (bytes[6] & 0x0f) | 0x40
    bytes[8] = (bytes[8] & 0x3f) | 0x80
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
  }

  fallbackCounter += 1
  return `${Date.now().toString(36)}-${fallbackCounter.toString(36)}`
}

/**
 * Generates a unique, prefixed identifier using `crypto.randomUUID()` when
 * available, falling back to `crypto.getRandomValues()` (RFC 4122 v4) or a
 * monotonic timestamp counter.
 */
export function newId(prefix: string): string {
  const cryptoObj = globalThis.crypto
  const raw =
    cryptoObj && typeof cryptoObj.randomUUID === 'function'
      ? cryptoObj.randomUUID()
      : generateUuidFallback()
  return `${prefix}${raw}`
}
const BASE36_ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyz'
function assertLength(length: number): void {
  if (!Number.isSafeInteger(length) || length < 0) {
    throw new RangeError('Length must be a non-negative safe integer.')
export function randomHex(bytes: number): string {
  assertLength(bytes)
  const values = crypto.getRandomValues(new Uint8Array(bytes))
  return Array.from(values, (value) => value.toString(16).padStart(2, '0')).join('')
export function randomBase36(len: number): string {
  assertLength(len)
  let result = ''
  while (result.length < len) {
    const remaining = len - result.length
    const values = crypto.getRandomValues(new Uint8Array(Math.min(65_536, Math.max(remaining, 16))))
    for (const value of values) {
      if (value >= 252) continue
      result += BASE36_ALPHABET[value % BASE36_ALPHABET.length]
      if (result.length === len) break
    }
  return result
