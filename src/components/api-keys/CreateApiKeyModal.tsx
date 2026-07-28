import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import ConfirmDialog from '../ConfirmDialog'
import { useToast } from '../ToastContext'

// ─── Scope definitions ─────────────────────────────────────────────────

interface ScopeItem {
  id: string
  label: string
  description: string
}

interface ScopeGroup {
  id: string
  label: string
  description: string
  scopes: ScopeItem[]
}

const SCOPE_GROUPS: ScopeGroup[] = [
  {
    id: 'attestations',
    label: 'Attestations',
    description: 'Create and manage revenue attestations',
    scopes: [
      { id: 'read:attestations', label: 'Read attestations', description: 'View attestation history and on-chain proof details.' },
      { id: 'write:attestations', label: 'Write attestations', description: 'Trigger attestations for revenue reports.' },
    ],
  },
  {
    id: 'sources',
    label: 'Revenue Sources',
    description: 'Manage connected revenue data sources',
    scopes: [
      { id: 'read:sources', label: 'Read revenue sources', description: 'View connected revenue source metadata.' },
      { id: 'write:sources', label: 'Write revenue sources', description: 'Connect and configure new revenue sources.' },
    ],
  },
  {
    id: 'webhooks',
    label: 'Webhooks',
    description: 'Manage webhook endpoints and deliveries',
    scopes: [
      { id: 'read:webhooks', label: 'Read webhooks', description: 'View webhook configurations and delivery history.' },
      { id: 'write:webhooks', label: 'Write webhooks', description: 'Create and modify webhook endpoints.' },
    ],
  },
  {
    id: 'keys',
    label: 'API Keys',
    description: 'Manage API key lifecycle',
    scopes: [
      { id: 'read:keys', label: 'Read API keys', description: 'View API key metadata (masked values only).' },
      { id: 'write:keys', label: 'Write API keys', description: 'Create, rotate, and revoke API keys.' },
    ],
  },
]

/** Flat map of every scope id for quick lookup. */
const ALL_SCOPE_IDS: string[] = SCOPE_GROUPS.flatMap((g) => g.scopes.map((s) => s.id))

type ScopeId = string

// ─── Helpers ───────────────────────────────────────────────────────────

/** Returns the tri-state for a group: 'all' | 'some' | 'none' */
function groupTriState(group: ScopeGroup, selected: ScopeId[]): 'all' | 'some' | 'none' {
  const ids = group.scopes.map((s) => s.id)
  const checked = ids.filter((id) => selected.includes(id)).length
  if (checked === 0) return 'none'
  if (checked === ids.length) return 'all'
  return 'some'
}

// ─── Component ─────────────────────────────────────────────────────────

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
  const [scopeQuery, setScopeQuery] = useState('')

  // Refs for indeterminate checkbox state
  const groupRefs = useRef<Map<string, HTMLInputElement>>(new Map())

  const [error, setError] = useState<string | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)

  // ── Derived state ────────────────────────────────────────────────────

  /** Total number of scopes selected (across all groups). */
  const selectedCount = selected.length
  const totalScopeCount = ALL_SCOPE_IDS.length

  const chosenLabels = useMemo(() => {
    const flat = SCOPE_GROUPS.flatMap((g) => g.scopes)
    return selected.map((id) => flat.find((s) => s.id === id)?.label ?? id).filter(Boolean)
  }, [selected])

  /** Groups filtered by search query. A group is shown if its label or any of its scope labels/descriptions match. */
  const filteredGroups = useMemo(() => {
    const q = scopeQuery.trim().toLowerCase()
    if (!q) return SCOPE_GROUPS
    return SCOPE_GROUPS
      .map((group) => ({
        ...group,
        scopes: group.scopes.filter(
          (s) =>
            s.label.toLowerCase().includes(q) || s.description.toLowerCase().includes(q),
        ),
      }))
      .filter(
        (group) =>
          group.label.toLowerCase().includes(q) || group.scopes.length > 0,
      )
  }, [scopeQuery])

  // ── Reset on open ────────────────────────────────────────────────────

  useEffect(() => {
    if (!open) {
      setError(null)
      setConfirmOpen(false)
      setScopeQuery('')
      setLabel('Admin key')
      setExpiryDays(90)
      setSelected(['read:attestations'])
    }
  }, [open])

  // ── Sync indeterminate on group checkboxes ───────────────────────────

  useEffect(() => {
    for (const group of SCOPE_GROUPS) {
      const el = groupRefs.current.get(group.id)
      if (el) {
        const tri = groupTriState(group, selected)
        el.indeterminate = tri === 'some'
      }
    }
  }, [selected])

  // ── Handlers ─────────────────────────────────────────────────────────

  const toggleScope = useCallback((id: ScopeId) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }, [])

  const toggleGroup = useCallback((group: ScopeGroup) => {
    const ids = group.scopes.map((s) => s.id)
    setSelected((prev) => {
      const tri = groupTriState(group, prev)
      if (tri === 'all') {
        // Deselect all scopes in this group
        return prev.filter((id) => !ids.includes(id))
      }
      // Select all scopes in this group (handles 'some' and 'none')
      const existing = new Set(prev)
      for (const id of ids) existing.add(id)
      return Array.from(existing)
    })
  }, [])

  const selectAll = useCallback(() => {
    setSelected([...ALL_SCOPE_IDS])
  }, [])

  const clearAll = useCallback(() => {
    setSelected([])
  }, [])

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

  const keyId = useMemo(() => `key_${Math.random().toString(36).slice(2, 8)}`, [])

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
                    <legend style={{ fontWeight: 800, color: 'var(--text)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                      <span>Scopes</span>
                      {/* Selected-count summary */}
                      <span
                        aria-live="polite"
                        aria-atomic="true"
                        style={{
                          fontSize: '0.84rem',
                          fontWeight: 600,
                          padding: '0.28rem 0.65rem',
                          borderRadius: 999,
                          border: `1px solid ${selectedCount > 0 ? 'rgba(94, 234, 212, 0.35)' : 'var(--border)'}`,
                          background: selectedCount > 0 ? 'rgba(94, 234, 212, 0.08)' : 'var(--surface-soft)',
                          color: selectedCount > 0 ? 'var(--accent)' : 'var(--muted)',
                          transition: 'border-color 160ms ease, background 160ms ease, color 160ms ease',
                        }}
                      >
                        {selectedCount}&thinsp;/&thinsp;{totalScopeCount} selected
                      </span>
                    </legend>

                    {/* Search filter */}
                    <div style={{ position: 'relative' }}>
                      <span
                        aria-hidden="true"
                        style={{
                          position: 'absolute',
                          left: '0.85rem',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          color: 'var(--muted)',
                          fontSize: '0.85rem',
                          pointerEvents: 'none',
                        }}
                      >
                        🔍
                      </span>
                      <input
                        type="search"
                        value={scopeQuery}
                        onChange={(e) => setScopeQuery(e.target.value)}
                        placeholder="Filter scopes…"
                        aria-label="Filter scopes by name or description"
                        className="auth-input"
                        style={{ paddingLeft: '2.3rem', minHeight: '2.75rem' }}
                      />
                    </div>

                    {/* Quick actions */}
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        onClick={selectAll}
                        disabled={selectedCount === totalScopeCount}
                        className="app-button app-button-secondary"
                        style={{ width: 'auto', minHeight: '2.25rem', padding: '0.35rem 0.75rem', fontSize: '0.82rem', fontWeight: 600 }}
                        aria-label="Select all scopes"
                      >
                        Select all
                      </button>
                      <button
                        type="button"
                        onClick={clearAll}
                        disabled={selectedCount === 0}
                        className="app-button app-button-secondary"
                        style={{ width: 'auto', minHeight: '2.25rem', padding: '0.35rem 0.75rem', fontSize: '0.82rem', fontWeight: 600 }}
                        aria-label="Clear all scopes"
                      >
                        Clear all
                      </button>
                    </div>

                    {/* Grouped scope tree */}
                    {filteredGroups.length === 0 ? (
                      <p
                        role="status"
                        style={{
                          margin: 0,
                          padding: '1.5rem 1rem',
                          textAlign: 'center',
                          color: 'var(--muted)',
                          fontSize: '0.92rem',
                          border: '1px dashed var(--border)',
                          borderRadius: 'var(--radius-sm)',
                        }}
                      >
                        No scopes match <strong style={{ color: 'var(--text)' }}>&ldquo;{scopeQuery}&rdquo;</strong>
                      </p>
                    ) : (
                      <ul
                        role="tree"
                        aria-label="Scope groups"
                        style={{
                          listStyle: 'none',
                          margin: 0,
                          padding: 0,
                          display: 'grid',
                          gap: '0.85rem',
                        }}
                      >
                        {filteredGroups.map((group) => {
                          const realGroup = SCOPE_GROUPS.find((g) => g.id === group.id)!
                          const tri = groupTriState(realGroup, selected)
                          const groupChecked = tri === 'all'
                          const groupSome = tri === 'some'

                          return (
                            <li
                              key={group.id}
                              role="treeitem"
                              aria-expanded="true"
                              style={{
                                border: `1px solid ${groupChecked || groupSome ? 'rgba(94, 234, 212, 0.28)' : 'var(--border)'}`,
                                borderRadius: 'var(--radius-sm)',
                                background: groupChecked || groupSome ? 'rgba(94, 234, 212, 0.04)' : 'rgba(15, 23, 42, 0.2)',
                                overflow: 'hidden',
                                transition: 'border-color 160ms ease, background 160ms ease',
                              }}
                            >
                              {/* Group header with tri-state checkbox */}
                              <label
                                style={{
                                  display: 'flex',
                                  gap: '0.7rem',
                                  alignItems: 'flex-start',
                                  padding: '0.7rem 0.9rem',
                                  cursor: 'pointer',
                                  borderBottom: `1px solid ${groupChecked || groupSome ? 'rgba(94, 234, 212, 0.18)' : 'var(--border)'}`,
                                  background: groupChecked || groupSome ? 'rgba(94, 234, 212, 0.06)' : 'transparent',
                                }}
                              >
                                <input
                                  type="checkbox"
                                  ref={(el) => {
                                    if (el) {
                                      el.indeterminate = groupSome
                                      groupRefs.current.set(realGroup.id, el)
                                    }
                                  }}
                                  checked={groupChecked}
                                  onChange={() => toggleGroup(realGroup)}
                                  aria-label={`Toggle all ${group.label} scopes`}
                                  style={{ marginTop: '0.2rem', accentColor: 'var(--accent)', width: '1rem', height: '1rem', flexShrink: 0 }}
                                />
                                <span style={{ display: 'grid', gap: '0.1rem' }}>
                                  <span style={{ fontWeight: 700, color: 'var(--text)', fontSize: '0.95rem' }}>
                                    {group.label}
                                  </span>
                                  <span style={{ color: 'var(--muted)', fontSize: '0.82rem', lineHeight: 1.5 }}>
                                    {group.description}
                                  </span>
                                </span>
                              </label>

                              {/* Group children */}
                              <ul
                                role="group"
                                aria-label={`${group.label} scopes`}
                                style={{
                                  listStyle: 'none',
                                  margin: 0,
                                  padding: '0.45rem 0.45rem',
                                  display: 'grid',
                                  gap: '0.2rem',
                                }}
                              >
                                {group.scopes.map((scope) => {
                                  const checked = selected.includes(scope.id)
                                  return (
                                    <li key={scope.id} role="treeitem">
                                      <label
                                        style={{
                                          display: 'flex',
                                          gap: '0.7rem',
                                          alignItems: 'flex-start',
                                          padding: '0.55rem 0.7rem',
                                          borderRadius: 'calc(var(--radius-sm) - 0.25rem)',
                                          cursor: 'pointer',
                                          background: checked ? 'rgba(94, 234, 212, 0.08)' : 'transparent',
                                          transition: 'background 120ms ease',
                                        }}
                                        onMouseEnter={(e) => {
                                          if (!checked) (e.currentTarget as HTMLElement).style.background = 'rgba(148, 163, 184, 0.06)'
                                        }}
                                        onMouseLeave={(e) => {
                                          if (!checked) (e.currentTarget as HTMLElement).style.background = 'transparent'
                                        }}
                                      >
                                        <input
                                          type="checkbox"
                                          checked={checked}
                                          onChange={() => toggleScope(scope.id)}
                                          aria-label={scope.label}
                                          style={{
                                            marginTop: '0.15rem',
                                            accentColor: 'var(--accent)',
                                            width: '1rem',
                                            height: '1rem',
                                            flexShrink: 0,
                                          }}
                                        />
                                        <span style={{ display: 'grid', gap: '0.1rem' }}>
                                          <span style={{ fontWeight: 600, color: 'var(--text)', fontSize: '0.9rem' }}>
                                            {scope.label}
                                          </span>
                                          <span style={{ color: 'var(--muted)', fontSize: '0.82rem', lineHeight: 1.5 }}>
                                            {scope.description}
                                          </span>
                                        </span>
                                      </label>
                                    </li>
                                  )
                                })}
                              </ul>
                            </li>
                          )
                        })}
                      </ul>
                    )}
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
        description={`This key will be created with ${selectedCount} scope(s) (${chosenLabels.join(', ')}) and will expire in ${expiryDays} day(s).`}
        confirmText="Create key"
        cancelText="Back"
        onClose={() => setConfirmOpen(false)}
        onConfirm={mint}
      />
    </>
  )
}

