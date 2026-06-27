import { useEffect, useMemo, useState } from 'react'
import ConfirmDialog from '../ConfirmDialog'
import { useToast } from '../ToastContext'

const AVAILABLE_SCOPES = [
  { id: 'read:attestations', label: 'Read attestations', description: 'View attestation history and on-chain proof details.' },
  { id: 'write:attestations', label: 'Write attestations', description: 'Trigger attestations for revenue reports.' },
  { id: 'read:sources', label: 'Read revenue sources', description: 'View connected revenue source metadata.' },
]

type ScopeId = (typeof AVAILABLE_SCOPES)[number]['id']

export default function CreateApiKeyModal({
  open,
  onClose,
  onMinted,
}: {
  open: boolean
  onClose: () => void
  onMinted: (keyId: string, fullKey: string) => void
}) {
  const { addToast } = useToast()
  const [label, setLabel] = useState('Admin key')
  const [expiryDays, setExpiryDays] = useState(90)
  const [selected, setSelected] = useState<ScopeId[]>(['read:attestations'])

  const [error, setError] = useState<string | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const chosenScopes = useMemo(() => {
    return AVAILABLE_SCOPES.filter((s) => selected.includes(s.id as ScopeId))
  }, [selected])

  useEffect(() => {
    if (!open) {
      setError(null)
      setConfirmOpen(false)
      // reset for demo
      setLabel('Admin key')
      setExpiryDays(90)
      setSelected(['read:attestations'])
    }
  }, [open])

  function toggleScope(id: ScopeId) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  function validate() {
    if (label.trim().length < 2) return 'Add a label (at least 2 characters).'
    if (expiryDays < 7 || expiryDays > 365) return 'Expiry must be between 7 and 365 days.'
    if (selected.length === 0) return 'Select at least one scope.'
    return null
  }

  function submit() {
    const e = validate()
    setError(e)
    if (e) {
      addToast(e, 'error', 0)
      return
    }
    setConfirmOpen(true)
  }

  const keyId = useMemo(() => `key_${Math.random().toString(36).slice(2, 8)}`, [open])

  function mint() {
    // Demo-only: generate a fake secret.
    // Real implementation would come from backend and only reveal it once.
    const fullKey = `vtsr_live_${Math.random().toString(16).slice(2, 14)}${Math.random().toString(16).slice(2, 10)}_${Math.random().toString(16).slice(2, 6)}`
    setConfirmOpen(false)
    onMinted(keyId, fullKey)
  }

  return (
    <>
      {open && (
        <div className="modal-backdrop" onClick={() => (!confirmOpen ? onClose() : undefined)}>
          <div
            className="modal-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-title"
            tabIndex={-1}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2 id="create-title" className="modal-title">
                Create API key
              </h2>
              <button type="button" className="modal-close" aria-label="Close dialog" onClick={onClose}>
                <span aria-hidden="true">✕</span>
              </button>
            </div>

            <div className="modal-body">
              <div className="app-card" style={{ padding: '0.95rem', marginTop: 0 }}>
                <div style={{ display: 'grid', gap: '0.85rem' }}>
                  <div style={{ display: 'grid', gap: '0.4rem' }}>
                    <label htmlFor="key-label" style={{ fontWeight: 800, color: 'var(--text)' }}>
                      Label
                    </label>
                    <input
                      id="key-label"
                      value={label}
                      onChange={(e) => setLabel(e.target.value)}
                      className="auth-input"
                      aria-invalid={!!error}
                    />
                  </div>

                  <div style={{ display: 'grid', gap: '0.4rem' }}>
                    <label htmlFor="key-expiry" style={{ fontWeight: 800, color: 'var(--text)' }}>
                      Expiry (days)
                    </label>
                    <input
                      id="key-expiry"
                      type="number"
                      min={7}
                      max={365}
                      value={expiryDays}
                      onChange={(e) => setExpiryDays(Number(e.target.value))}
                      className="auth-input"
                    />
                    <div style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>
                      Recommended: 90 days for least-privilege operations.
                    </div>
                  </div>

                  <fieldset style={{ border: 0, padding: 0, margin: 0, display: 'grid', gap: '0.65rem' }}>
                    <legend style={{ fontWeight: 800, color: 'var(--text)' }}>Scopes</legend>
                    <div style={{ display: 'grid', gap: '0.55rem' }}>
                      {AVAILABLE_SCOPES.map((scope) => {
                        const checked = selected.includes(scope.id as ScopeId)
                        return (
                          <label
                            key={scope.id}
                            style={{
                              display: 'flex',
                              gap: '0.75rem',
                              alignItems: 'flex-start',
                              padding: '0.8rem 0.9rem',
                              borderRadius: 'var(--radius-sm)',
                              border: '1px solid var(--border)',
                              background: checked ? 'rgba(94, 234, 212, 0.08)' : 'rgba(15, 23, 42, 0.15)',
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleScope(scope.id as ScopeId)}
                              aria-label={scope.label}
                            />
                            <span style={{ display: 'grid', gap: '0.15rem' }}>
                              <strong style={{ color: 'var(--text)' }}>{scope.label}</strong>
                              <span style={{ color: 'var(--muted)', fontSize: '0.9rem', lineHeight: 1.5 }}>{scope.description}</span>
                            </span>
                          </label>
                        )
                      })}
                    </div>
                  </fieldset>

                  {error && (
                    <div role="alert" style={{ color: '#ffd7dd', background: 'var(--danger-soft)', border: '1px solid rgba(251,113,133,0.35)', padding: '0.75rem 0.85rem', borderRadius: 'var(--radius-sm)' }}>
                      {error}
                    </div>
                  )}
                </div>
              </div>

              <div className="modal-warning">
                <span aria-hidden="true" className="modal-warning-icon">⚠</span>
                <span>
                  Newly minted secrets are displayed once. After you close this flow, only the masked key remains.
                </span>
              </div>
            </div>

            <div className="modal-footer">
              <button type="button" className="modal-btn modal-btn-cancel" onClick={onClose}>
                Cancel
              </button>
              <button type="button" className="modal-btn modal-btn-confirm" onClick={submit}>
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmOpen}
        title="Confirm key creation?"
        description={`This key will be created with ${chosenScopes.length} scope(s) and will expire in ${expiryDays} day(s).`}
        confirmText="Create key"
        cancelText="Back"
        onClose={() => setConfirmOpen(false)}
        onConfirm={mint}
      />
    </>
  )
}

