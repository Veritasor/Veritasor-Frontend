import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import ConfirmDialog from '../ConfirmDialog'
import { useToast } from '../ToastContext'
import {
  SCOPE_GROUPS,
  ALL_SCOPE_IDS,
  type ScopeId,
  getScopeChangeType,
  getScopeLabels,
  groupTriState,
} from './scopeDefinitions'

// ─── Component ─────────────────────────────────────────────────────────

export interface EditScopesModalProps {
  open: boolean
  onClose: () => void
  keyId: string
  keyName: string
  currentScopes: string[]
  onUpdated: (newScopes: string[]) => void
}

export default function EditScopesModal({
  open,
  onClose,
  keyId,
  keyName,
  currentScopes,
  onUpdated,
}: EditScopesModalProps) {
  const { addToast } = useToast()
  const [selected, setSelected] = useState<ScopeId[]>(currentScopes)
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
    return getScopeLabels(selected)
  }, [selected])

  /** Groups filtered by search query. */
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

  // ── Scope diff analysis ───────────────────────────────────────────────

  const scopeChangeType = useMemo(() => {
    return getScopeChangeType(currentScopes, selected)
  }, [currentScopes, selected])

  const scopeDiff = useMemo(() => {
    const originalSet = new Set(currentScopes)
    const newSet = new Set(selected)
    const added = selected.filter((s) => !originalSet.has(s))
    const removed = currentScopes.filter((s) => !newSet.has(s))
    return { added, removed }
  }, [currentScopes, selected])

  // ── Reset on open ────────────────────────────────────────────────────

  useEffect(() => {
    if (open) {
      setError(null)
      setConfirmOpen(false)
      setScopeQuery('')
      setSelected(currentScopes)
    }
  }, [open, currentScopes])

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
        return prev.filter((id) => !ids.includes(id))
      }
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

    // Check if anything actually changed
    if (JSON.stringify(selected.sort()) === JSON.stringify(currentScopes.sort())) {
      addToast('No changes to save', 'info', 0)
      return
    }

    setConfirmOpen(true)
  }

  function confirmUpdate() {
    setConfirmOpen(false)
    onUpdated(selected)
  }

  function getConfirmDescription(): string {
    const { added, removed } = scopeDiff
    const addedLabels = getScopeLabels(added)
    const removedLabels = getScopeLabels(removed)

    let desc = `You are changing the scopes for "${keyName}" (${keyId}).\n\n`

    if (addedLabels.length > 0) {
      desc += `Adding: ${addedLabels.join(', ')}\n`
    }
    if (removedLabels.length > 0) {
      desc += `Removing: ${removedLabels.join(', ')}\n`
    }

    if (scopeChangeType === 'broaden') {
      desc += `\n⚠️ This change will broaden the key's permissions. The key will gain additional access privileges.`
    } else if (scopeChangeType === 'narrow') {
      desc += `\nℹ️ This change will narrow the key's permissions. Some existing access will be removed.`
    }

    return desc
  }

  if (!open) return null

  return (
    <>
      <div className="modal-backdrop" onClick={() => (!confirmOpen ? onClose() : undefined)}>
        <div
          className="modal-dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-scopes-title"
          tabIndex={-1}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="modal-header">
            <h2 id="edit-scopes-title" className="modal-title">
              Edit Scopes
            </h2>
            <button type="button" className="modal-close" aria-label="Close dialog" onClick={onClose}>
              <span aria-hidden="true">✕</span>
            </button>
          </div>

          <div className="modal-body">
            <div className="app-card" style={{ padding: '0.95rem', marginTop: 0 }}>
              <div style={{ marginBottom: '0.85rem', color: 'var(--muted)', fontSize: '0.9rem' }}>
                Editing scopes for <strong>{keyName}</strong> ({keyId})
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

          <div className="modal-footer">
            <button type="button" className="modal-btn modal-btn-cancel" onClick={onClose}>
              Cancel
            </button>
            <button type="button" className="modal-btn modal-btn-confirm" onClick={submit}>
              Save Changes
            </button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title={scopeChangeType === 'broaden' ? 'Confirm scope broadening?' : 'Confirm scope changes?'}
        description={getConfirmDescription()}
        confirmText="Confirm"
        cancelText="Back"
        tone={scopeChangeType === 'broaden' ? 'danger' : 'default'}
        onClose={() => setConfirmOpen(false)}
        onConfirm={confirmUpdate}
      />
    </>
  )
}
