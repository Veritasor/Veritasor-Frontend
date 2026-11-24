function randomHex(byteLength: number): string {
  const cryptoApi = globalThis.crypto
  if (!cryptoApi?.getRandomValues) {
    throw new Error('Secure random number generation is unavailable.')
  }

  const bytes = cryptoApi.getRandomValues(new Uint8Array(byteLength))
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

export function generateApiKeyCredentials(): { keyId: string; fullKey: string } {
  return {
    keyId: `key_${randomHex(8)}`,
    fullKey: `vtsr_live_${randomHex(24)}`,
  }
}
