import { useMemo, useState } from 'react'
import type { ApiKey, ApiKeyStatus } from './apiKeyTypes'
import ConfirmDialog from '../ConfirmDialog'
import { useToast } from '../ToastContext'

function statusMeta(status: ApiKeyStatus) {
  if (status === 'active') return { label: 'Active', bg: 'rgba(52, 211, 153, 0.14)', border: 'rgba(52, 211, 153, 0.35)', color: 'var(--success)' }
  if (status === 'expired') return { label: 'Expired', bg: 'var(--warning-soft)', border: 'rgba(251, 191, 36, 0.35)', color: 'var(--warning)' }
  return { label: 'Revoked', bg: 'var(--danger-soft)', border: 'rgba(251, 113, 133, 0.35)', color: 'var(--danger)' }
}

function maskForCopy(key: string) {
  return key
}

export default function KeyRow({
  keyItem,
  mintedOnce,
  isLastAdminKey = false,
  onRotate,
  onRevoke,
  onCopyMasked,
}: {
  keyItem: ApiKey
  mintedOnce: string | null
  isLastAdminKey?: boolean
  onCopyMasked: (key: ApiKey) => void
  onRotate: (id: string) => void
  onRevoke: (id: string) => void
}) {
  const meta = useMemo(() => statusMeta(keyItem.status), [keyItem.status])
  const { addToast } = useToast()
  const [rotateOpen, setRotateOpen] = useState(false)
  const [revokeOpen, setRevokeOpen] = useState(false)

  const canRotate = keyItem.status === 'active'
  const canRevoke = keyItem.status === 'active' && !isLastAdminKey

  async function handleCopy(value: string, label: string) {
    await navigator.clipboard.writeText(value)
    addToast(`${label} copied`, 'success', 3000)
  }

  return (
    <li
      aria-label={`API key ${keyItem.label}, ${meta.label}${isLastAdminKey ? ', Critical Last Admin Key' : ''}`}
      style={{
        padding: '1rem 1.1rem',
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-sm)',
        display: 'grid',
        gap: '0.85rem',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
        <div style={{ minWidth: 220 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ fontWeight: 800, color: 'var(--text)' }}>{keyItem.label}</div>
            {isLastAdminKey && (
              <span 
                role="status"
                style={{ fontSize: '0.75rem', padding: '0.1rem 0.4rem', borderRadius: '4px', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)' }}
              >
                System Protection
              </span>
            )}
          </div>
          <div style={{ marginTop: '0.25rem', color: 'var(--muted)', fontSize: '0.9rem' }}>
            Created {new Date(keyItem.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' })}
          </div>
        </div>

        <span
          aria-label={`Key status: ${meta.label}`}
          style={{
            padding: '0.32rem 0.65rem',
            borderRadius: 999,
            fontWeight: 800,
            fontSize: '0.82rem',
            border: `1px solid ${meta.border}`,
            background: meta.bg,
            color: meta.color,
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          {meta.label}
        </span>
      </div>

      <div style={{ display: 'grid', gap: '0.65rem' }}>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ color: 'var(--muted)', fontWeight: 700 }}>Key</div>

          <div
            style={{
              flex: '1 1 260px',
              minWidth: 220,
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
              padding: '0.6rem 0.75rem',
              borderRadius: 12,
              border: '1px solid rgba(148, 163, 184, 0.25)',
              background: 'rgba(15, 23, 42, 0.55)',
              color: 'var(--text)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              wordBreak: 'break-all',
            }}
            title={mintedOnce ? mintedOnce : keyItem.maskedKey}
            aria-label={mintedOnce ? 'Full key value (shown once)' : 'Masked key value'}
          >
            {mintedOnce ? mintedOnce : keyItem.maskedKey}
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {mintedOnce ? (
              <button
                type="button"
                className="app-button app-button-secondary"
                style={{ width: 'auto' }}
                onClick={() => handleCopy(mintedOnce, 'Key')}
              >
                Copy full
              </button>
            ) : (
              <button
                type="button"
                className="app-button app-button-secondary"
                style={{ width: 'auto' }}
                onClick={() => {
                  onCopyMasked(keyItem)
                  handleCopy(maskForCopy(keyItem.maskedKey), 'Masked key')
                }}
              >
                Copy masked
              </button>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }} aria-label="Scopes">
          {keyItem.scopes.map((s) => (
            <span
              key={s}
              style={{
                fontSize: '0.84rem',
                fontWeight: 800,
                padding: '0.3rem 0.55rem',
                borderRadius: 999,
                border: '1px solid rgba(94, 234, 212, 0.22)',
                background: 'rgba(94, 234, 212, 0.08)',
                color: 'var(--text)',
              }}
            >
              {s}
            </span>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>
            Expires {new Date(keyItem.expiresAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' })}
          </div>

          <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="app-button app-button-secondary"
              style={{ width: 'auto' }}
              disabled={!canRotate}
              onClick={() => setRotateOpen(true)}
            >
              Rotate
            </button>
            <button
              type="button"
              className="app-button app-button-secondary"
              style={{ width: 'auto' }}
              disabled={!canRevoke}
              title={isLastAdminKey ? "Cannot revoke the last active administrative key." : undefined}
              onClick={() => setRevokeOpen(true)}
            >
              Revoke
            </button>
          </div>
        </div>
      </div>

      {rotateOpen && (
        <ConfirmDialog
          open={rotateOpen}
          title="Rotate API key?"
          description={isLastAdminKey 
            ? "Warning: You are rotating your last remaining active admin key. Ensure you copy the new credentials immediately to prevent management lockout."
            : "Rotating creates a new secret and invalidates the old one. This action can be performed only while the key is active."
          }
          confirmText="Rotate"
          cancelText="Cancel"
          onClose={() => setRotateOpen(false)}
          onConfirm={() => {
            setRotateOpen(false)
            onRotate(keyItem.id)
          }}
        />
      )}

      {revokeOpen && (
        <ConfirmDialog
          open={revokeOpen}
          title="Revoke API key?"
          description="Revoking immediately invalidates the key. This action cannot be undone."
          confirmText="Revoke"
          cancelText="Cancel"
          tone="danger"
          onClose={() => setRevokeOpen(false)}
          onConfirm={() => {
            setRevokeOpen(false)
            onRevoke(keyItem.id)
          }}
        />
      )}
    </li>
  )
}