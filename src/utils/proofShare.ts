const PBKDF2_ITERATIONS = 150_000
const SALT_LENGTH = 16
const HASH_LENGTH = 32

function encodeBase64Url(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function decodeBase64Url(value: string): Uint8Array | null {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) return null
  try {
    const base64 = value.replace(/-/g, '+').replace(/_/g, '/')
    const binary = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '='))
    return Uint8Array.from(binary, (character) => character.charCodeAt(0))
  } catch {
    return null
  }
}

async function derivePasswordHash(password: string, salt: Uint8Array): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  )
  const hash = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    key,
    HASH_LENGTH * 8,
  )
  return new Uint8Array(hash)
}

export async function createProofPasswordVerifier(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH))
  const hash = await derivePasswordHash(password, salt)
  return `v1.${encodeBase64Url(salt)}.${encodeBase64Url(hash)}`
}

export async function verifyProofPassword(password: string, verifier: string): Promise<boolean> {
  const [version, encodedSalt, encodedHash, ...rest] = verifier.split('.')
  if (version !== 'v1' || !encodedSalt || !encodedHash || rest.length > 0) return false

  const salt = decodeBase64Url(encodedSalt)
  const expectedHash = decodeBase64Url(encodedHash)
  if (!salt || salt.length !== SALT_LENGTH || !expectedHash || expectedHash.length !== HASH_LENGTH) {
    return false
  }

  const actualHash = await derivePasswordHash(password, salt)
  let difference = 0
  for (let index = 0; index < HASH_LENGTH; index += 1) {
    difference |= actualHash[index] ^ expectedHash[index]
  }
  return difference === 0
}
