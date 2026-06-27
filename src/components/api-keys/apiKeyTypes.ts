export type ApiKeyStatus = 'active' | 'expired' | 'revoked'

export interface ApiKey {
  id: string
  label: string
  status: ApiKeyStatus
  createdAt: string
  expiresAt: string
  scopes: string[]
  maskedKey: string
}

