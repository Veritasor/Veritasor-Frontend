import { useMemo, useState } from 'react'
import CreateApiKeyModal from '../components/api-keys/CreateApiKeyModal'
import KeyRow from '../components/api-keys/KeyRow'
import type { ApiKey, ApiKeyStatus } from '../components/api-keys/apiKeyTypes'

const INITIAL_KEYS: ApiKey[] = [
  {
    id: 'key_001',
    label: 'Admin (rotatable)',
    status: 'active',
    createdAt: '2026-06-01T14:00:00Z',
    expiresAt: '2026-12-01T00:00:00Z',
    scopes: ['read:attestations', 'write:attestations'],
    maskedKey: 'vtsr_live_5e3a…b91c',
  },
  {
    id: 'key_002',
    label: 'Auditor (read-only)',
    status: 'active',
    createdAt: '2026-05-20T10:15:00Z',
    expiresAt: '2026-11-20T00:00:00Z',
    scopes: ['read:attestations'],
    maskedKey: 'vtsr_live_aa1f…0c2d',
  },
  {
    id: 'key_003',
    label: 'Expired (history)',
    status: 'expired',
    createdAt: '2026-03-10T09:00:00Z',
    expiresAt: '2026-04-10T00:00:00Z',
    scopes: ['read:attestations'],
    maskedKey: 'vtsr_live_1f2e…d9a0',
  },
]

function statusOrder(s: ApiKeyStatus) {
  return s === 'active' ? 0 : s === 'expired' ? 1 : 2
}

export default function ApiKeys() {
  const [keys, setKeys] = useState<ApiKey[]>(INITIAL_KEYS)
  const [createOpen, setCreateOpen] = useState(false)
  const [mintedOnce, setMintedOnce] = useState<null | { keyId: string; fullKey: string }>(null)

  const sortedKeys = useMemo(() => {
    return [...keys].sort((a, b) => {
      const d = statusOrder(a.status) - statusOrder(b.status)
      if (d !== 0) return d
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })
  }, [keys])

  function handleOpenCreate() {
    setCreateOpen(true)
  }

  function handleCloseCreate() {
    setCreateOpen(false)
  }

  function handleMinted(keyId: string, fullKey: string) {
    setMintedOnce({ keyId, fullKey })
    setKeys((prev) => {
      const masked = fullKey
        ? `${fullKey.slice(0, 12)}…${fullKey.slice(-4)}`
        : 'vtsr_live_????????'
      const createdKey = prev.find((k) => k.id === keyId)
      if (createdKey) return prev

      return [
        {
          id: keyId,
          label: 'New key',
          status: 'active',
          createdAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 90).toISOString(),
          scopes: ['read:attestations'],
          maskedKey: masked,
        },
        ...prev,
      ]
    })
    setCreateOpen(false)
  }

  function dismissMintedOnce() {
    setMintedOnce(null)
  }

  return (
    <div style={{ maxWidth: '58rem', padding: '1.5rem', margin: '0 auto' }}>
      <header style={{ display: 'grid', gap: '0.6rem' }}>
        <h1 style={{ marginTop: 0 }}>API keys</h1>
        <p style={{ color: 'var(--muted)', margin: 0, lineHeight: 1.6 }}>
          Manage keys for revenue attestation actions. New keys are revealed exactly once.
        </p>
      </header>

      <section style={{ marginTop: '1.5rem', display: 'grid', gap: '0.9rem' }}>
        {mintedOnce && (
          <section
            aria-label="New API key revealed"
            style={{
              padding: '1.25rem',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid rgba(94, 234, 212, 0.35)',
              background: 'rgba(94, 234, 212, 0.08)',
            }}
          >
            <h2 style={{ margin: 0, fontSize: '1rem' }}>Key created</h2>
            <p style={{ margin: '0.35rem 0 0.9rem', color: 'var(--muted)', lineHeight: 1.6 }}>
              Copy and store this value now. It will not be shown again.
            </p>
            <div
              style={{
                display: 'grid',
                gap: '0.75rem',
                gridTemplateColumns: 'minmax(0, 1fr) auto',
                alignItems: 'center',
              }}
            >
              <div
                style={{
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                  padding: '0.75rem 0.9rem',
                  borderRadius: 12,
                  border: '1px solid rgba(148, 163, 184, 0.25)',
                  background: 'rgba(15, 23, 42, 0.55)',
                  color: 'var(--text)',
                  overflow: 'hidden',
                  wordBreak: 'break-all',
                }}
              >
                {mintedOnce.fullKey}
              </div>
              <button
                type="button"
                className="app-button app-button-primary"
                style={{ width: 'auto' }}
                onClick={async () => {
                  await navigator.clipboard.writeText(mintedOnce?.fullKey ?? '')
                }}
                aria-label="Copy newly created API key"
              >
                Copy
              </button>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button type="button" className="app-button app-button-secondary" style={{ width: 'auto' }} onClick={dismissMintedOnce}>
                Done
              </button>
            </div>
          </section>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button type="button" className="app-button app-button-primary" style={{ width: 'auto' }} onClick={handleOpenCreate}>
            Create key
          </button>
        </div>

        <section aria-label="API key list" style={{ marginTop: '0.25rem' }}>
          {sortedKeys.length === 0 ? (
            <p style={{ color: 'var(--muted)', margin: 0 }}>No API keys available.</p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '0.75rem' }}>
              {sortedKeys.map((key) => (
                <KeyRow
                  key={key.id}
                  keyItem={key}
                  onCopyMasked={() => {}}
                  mintedOnce={mintedOnce?.keyId === key.id ? mintedOnce.fullKey : null}
                  onRotate={(id) => {
                    setKeys((prev) =>
                      prev.map((k) =>
                        k.id === id
                          ? { ...k, createdAt: new Date().toISOString(), maskedKey: 'vtsr_live_rotated…' }
                          : k,
                      ),
                    )
                    setMintedOnce(null)
                  }}
                  onRevoke={(id) => {
                    setKeys((prev) => prev.map((k) => (k.id === id ? { ...k, status: 'revoked' } : k)))
                    setMintedOnce(null)
                  }}
                />
              ))}
            </ul>
          )}
        </section>

        <div style={{ marginTop: '0.5rem', color: 'var(--muted)', lineHeight: 1.65, fontSize: '0.95rem' }}>
          <strong style={{ color: 'var(--text)' }}>Security note:</strong> Full secret values are only revealed immediately after minting.
          Rotation and revocation take effect on the backend.
        </div>
      </section>

      <CreateApiKeyModal open={createOpen} onClose={handleCloseCreate} onMinted={handleMinted} />
    </div>
  )
}