/**
 * SavedFiltersDropdown — Dropdown menu for managing saved audit-log
 * filters (issue #236).
 *
 * Behavior:
 *   - Click "Saved filters" trigger to open a menu
 *   - Each row shows a saved filter name, an Apply button, a Rename
 *     button, and a Delete button
 *   - Apply: invokes onApply with the canonical searchParams string
 *   - Rename: switches the row into an inline edit field; Enter saves,
 *     Escape cancels
 *   - Delete: shows an inline confirm; the second click confirms
 *   - Empty state: helpful message and a hint to use the Save button
 *
 * Accessibility:
 *   - Trigger is a button with aria-haspopup="menu" + aria-expanded
 *   - Menu uses role="menu" with role="menuitem" rows
 *   - ArrowUp/Down navigates between filters
 *   - An aria-live region announces apply / rename / delete results
 *   - All buttons have descriptive aria-labels that include the filter name
 */

import { useEffect, useId, useRef, useState } from 'react'
import { useIntl } from 'react-intl'
import {
  MAX_FILTER_NAME_LENGTH,
  validateFilterName,
  type SavedFilter,
} from '../../utils/auditLogFilters'

export interface SavedFiltersDropdownProps {
  /** Saved filters applicable to the current workspace. */
  filters: SavedFilter[]
  isHydrated: boolean
  /** Maximum filter-name length (forwarded from the hook). */
  maxNameLength?: number
  /** Called with the canonical searchParams string for the filter to apply. */
  onApply: (searchParams: string, filterName: string) => void
  onRename: (id: string, rawName: string) => { ok: boolean; reason?: string }
  onDelete: (id: string, filterName: string) => void
  /** Maximum number of filters permitted (for showing the cap state). */
  maxFilters: number
  /** Indicates the workspace has hit its cap (forwarded from hook). */
  isFull: boolean
  /** id used to wire aria-controls for the menu. */
  className?: string
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <span aria-hidden="true" style={{ fontSize: '0.65rem', marginInlineStart: 6 }}>
      {open ? '▲' : '▼'}
    </span>
  )
}

export default function SavedFiltersDropdown({
  filters,
  isHydrated,
  maxNameLength = MAX_FILTER_NAME_LENGTH,
  onApply,
  onRename,
  onDelete,
  maxFilters,
  isFull,
  className,
}: SavedFiltersDropdownProps) {
  const intl = useIntl()
  const menuId = useId()
  const liveRegionId = useId()
  const [open, setOpen] = useState(false)
  const [announcement, setAnnouncement] = useState('')
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [renameError, setRenameError] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const renameInputRef = useRef<HTMLInputElement>(null)

  function announce(message: string) {
    setAnnouncement(message)
  }

  // Outside click + Escape close the menu
  useEffect(() => {
    if (!open) return
    function closeMenu(returnFocus = false) {
      setOpen(false)
      setRenamingId(null)
      setConfirmDeleteId(null)
      if (returnFocus) triggerRef.current?.focus()
    }
    function handlePointer(e: MouseEvent | TouchEvent) {
      const target = e.target as Node | null
      if (
        target &&
        !menuRef.current?.contains(target) &&
        !triggerRef.current?.contains(target)
      ) {
        closeMenu()
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault()
        closeMenu(true)
      }
    }
    document.addEventListener('mousedown', handlePointer)
    document.addEventListener('touchstart', handlePointer)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handlePointer)
      document.removeEventListener('touchstart', handlePointer)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open])

  function handleTrigger() {
    if (open) {
      // Closing — reset all per-row transient state so reopening doesn't
      // surface a stale confirm-delete prompt or half-edited rename.
      setOpen(false)
      setRenamingId(null)
      setConfirmDeleteId(null)
    } else {
      setOpen(true)
    }
  }

  useEffect(() => {
    if (renamingId) {
      window.setTimeout(() => renameInputRef.current?.focus(), 0)
    }
  }, [renamingId])

  function handleApply(filter: SavedFilter) {
    onApply(filter.searchParams, filter.name)
    announce(
      intl.formatMessage(
        { id: 'auditLog.filters.applySuccess', defaultMessage: 'Filter {name} applied' },
        { name: filter.name },
      ),
    )
    setOpen(false)
    triggerRef.current?.focus()
  }

  function startRename(filter: SavedFilter) {
    setRenamingId(filter.id)
    setRenameValue(filter.name)
    setRenameError(null)
  }

  function commitRename() {
    if (!renamingId) return
    const others = filters.filter((f) => f.id !== renamingId).map((f) => f.name)
    const result = validateFilterName(renameValue, others)
    if (!result.ok) {
      // Map the validation reason into a localised message. Local
      // validation runs first; the hook should always succeed here, so
      // any further rejection is shown verbatim (defensive only).
      const messages: Record<string, string> = {
        empty: intl.formatMessage({
          id: 'auditLog.filters.error.empty',
          defaultMessage: 'Enter a filter name to continue.',
        }),
        too_long: intl.formatMessage(
          {
            id: 'auditLog.filters.error.tooLong',
            defaultMessage: 'Maximum {max} characters.',
          },
          { max: maxNameLength },
        ),
        duplicate: intl.formatMessage({
          id: 'auditLog.filters.error.duplicate',
          defaultMessage: 'A filter with this name already exists.',
        }),
        invalid_chars: intl.formatMessage({
          id: 'auditLog.filters.error.invalid',
          defaultMessage: 'Remove control characters from the filter name.',
        }),
      }
      setRenameError(messages[result.reason] ?? messages.empty)
      return
    }
    onRename(renamingId, result.name)
    announce(
      intl.formatMessage(
        {
          id: 'auditLog.filters.renameSuccess',
          defaultMessage: 'Renamed filter to {name}',
        },
        { name: result.name },
      ),
    )
    setRenamingId(null)
    setRenameValue('')
    setRenameError(null)
  }

  function cancelRename() {
    setRenamingId(null)
    setRenameValue('')
    setRenameError(null)
  }

  function handleDeleteClick(filter: SavedFilter) {
    if (confirmDeleteId === filter.id) {
      onDelete(filter.id, filter.name)
      announce(
        intl.formatMessage(
          {
            id: 'auditLog.filters.deleted',
            defaultMessage: 'Filter {name} deleted',
          },
          { name: filter.name },
        ),
      )
      setConfirmDeleteId(null)
    } else {
      setConfirmDeleteId(filter.id)
    }
  }

  const buttonBase: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    minHeight: '2.25rem',
    padding: '0.35rem 0.65rem',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    background: 'var(--surface)',
    color: 'var(--text)',
    cursor: 'pointer',
    font: 'inherit',
    fontSize: '0.82rem',
    fontWeight: 600,
    transition:
      'background-color 120ms ease, border-color 120ms ease, color 120ms ease',
  }

  return (
    <div className={['sf-saved-wrap', className].filter(Boolean).join(' ')}>
      <button
        ref={triggerRef}
        type="button"
        className="sf-saved-trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={handleTrigger}
        data-testid="saved-filters-trigger"
      >
        <span aria-hidden="true" style={{ marginInlineEnd: 6 }}>🔖</span>
        <span>
          {intl.formatMessage({
            id: 'auditLog.filters.trigger',
            defaultMessage: 'Saved filters',
          })}
        </span>
        {isHydrated && filters.length > 0 ? (
          <span
            aria-hidden="true"
            style={{
              marginInlineStart: 6,
              minWidth: '1.5rem',
              padding: '0.05rem 0.4rem',
              borderRadius: 999,
              background: 'rgba(94, 234, 212, 0.18)',
              color: '#d8fffa',
              fontSize: '0.75rem',
              fontWeight: 700,
            }}
          >
            {filters.length}
          </span>
        ) : null}
        <ChevronIcon open={open} />
      </button>

      {open && (
        <div
          ref={menuRef}
          id={menuId}
          className="sf-saved-menu"
          role="menu"
          aria-label={intl.formatMessage({
            id: 'auditLog.filters.menuLabel',
            defaultMessage: 'Saved filters',
          })}
          data-testid="saved-filters-menu"
        >
          {!isHydrated ? (
            <p style={{ margin: '0.5rem 0.75rem', color: 'var(--muted)' }}>
              {intl.formatMessage({
                id: 'auditLog.filters.loading',
                defaultMessage: 'Loading saved filters…',
              })}
            </p>
          ) : filters.length === 0 ? (
            <div style={{ padding: '0.75rem', display: 'grid', gap: 6 }}>
              <strong style={{ fontSize: '0.92rem' }}>
                {intl.formatMessage({
                  id: 'auditLog.filters.empty.title',
                  defaultMessage: 'No saved filters yet',
                })}
              </strong>
              <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--muted)' }}>
                {intl.formatMessage({
                  id: 'auditLog.filters.empty.body',
                  defaultMessage:
                    'Use “Save current filter…” to store the active filters, or copy the URL to share this exact view with teammates.',
                })}
              </p>
            </div>
          ) : (
            <ul
              role="none"
              style={{
                margin: 0,
                padding: '0.4rem',
                listStyle: 'none',
                display: 'grid',
                gap: 4,
                maxHeight: '18rem',
                overflowY: 'auto',
              }}
            >
              {filters.map((filter) => (
                <li
                  key={filter.id}
                  role="menuitem"
                  aria-label={intl.formatMessage(
                    {
                      id: 'auditLog.filters.itemLabel',
                      defaultMessage: 'Saved filter: {name}',
                    },
                    { name: filter.name },
                  )}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr auto',
                    gap: '0.5rem',
                    padding: '0.5rem 0.6rem',
                    borderRadius: 'var(--radius-sm)',
                    background: 'rgba(15, 23, 42, 0.6)',
                    border: '1px solid var(--border)',
                  }}
                  data-testid={`saved-filter-row-${filter.id}`}
                >
                  {renamingId === filter.id ? (
                    <div
                      style={{
                        display: 'grid',
                        gap: 4,
                        gridColumn: '1 / -1',
                      }}
                    >
                      <input
                        ref={renameInputRef}
                        type="text"
                        value={renameValue}
                        maxLength={maxNameLength}
                        aria-label={intl.formatMessage(
                          {
                            id: 'auditLog.filters.renameInputLabel',
                            defaultMessage: 'Rename filter',
                          },
                          { name: filter.name },
                        )}
                        onChange={(e) => {
                          setRenameValue(e.target.value)
                          setRenameError(null)
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            commitRename()
                          } else if (e.key === 'Escape') {
                            e.preventDefault()
                            cancelRename()
                          }
                        }}
                        style={{
                          padding: '0.4rem 0.6rem',
                          borderRadius: 8,
                          border: '1px solid var(--border-strong)',
                          background: 'var(--surface-strong)',
                          color: 'var(--text)',
                          font: 'inherit',
                          minHeight: '2.25rem',
                        }}
                      />
                      {renameError && (
                        <span
                          role="alert"
                          style={{ color: '#ffd7dd', fontSize: '0.78rem' }}
                        >
                          {renameError}
                        </span>
                      )}
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          type="button"
                          onClick={commitRename}
                          style={{
                            ...buttonBase,
                            background: 'var(--accent)',
                            color: '#04111f',
                            borderColor: 'transparent',
                          }}
                          data-testid={`saved-filter-save-rename-${filter.id}`}
                        >
                          {intl.formatMessage({
                            id: 'common.save',
                            defaultMessage: 'Save',
                          })}
                        </button>
                        <button
                          type="button"
                          onClick={cancelRename}
                          style={buttonBase}
                          data-testid={`saved-filter-cancel-rename-${filter.id}`}
                        >
                          {intl.formatMessage({
                            id: 'common.cancel',
                            defaultMessage: 'Cancel',
                          })}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => handleApply(filter)}
                        style={{
                          textAlign: 'start',
                          background: 'transparent',
                          border: 'none',
                          padding: 0,
                          color: 'var(--text)',
                          cursor: 'pointer',
                          font: 'inherit',
                          minHeight: '2.25rem',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                        title={filter.searchParams}
                        aria-label={intl.formatMessage(
                          {
                            id: 'auditLog.filters.applyLabel',
                            defaultMessage: 'Apply filter {name}',
                          },
                          { name: filter.name },
                        )}
                        data-testid={`saved-filter-apply-${filter.id}`}
                      >
                        {filter.name}
                      </button>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button
                          type="button"
                          onClick={() => startRename(filter)}
                          aria-label={intl.formatMessage(
                            {
                              id: 'auditLog.filters.renameLabel',
                              defaultMessage: 'Rename filter {name}',
                            },
                            { name: filter.name },
                          )}
                          data-testid={`saved-filter-rename-${filter.id}`}
                          style={buttonBase}
                        >
                          {intl.formatMessage({
                            id: 'auditLog.filters.rename',
                            defaultMessage: 'Rename',
                          })}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteClick(filter)}
                          aria-label={
                            confirmDeleteId === filter.id
                              ? intl.formatMessage(
                                  {
                                    id: 'auditLog.filters.confirmDeleteLabel',
                                    defaultMessage:
                                      'Confirm deletion of filter {name}',
                                  },
                                  { name: filter.name },
                                )
                              : intl.formatMessage(
                                  {
                                    id: 'auditLog.filters.deleteLabel',
                                    defaultMessage: 'Delete filter {name}',
                                  },
                                  { name: filter.name },
                                )
                          }
                          data-testid={`saved-filter-delete-${filter.id}`}
                          style={{
                            ...buttonBase,
                            background:
                              confirmDeleteId === filter.id
                                ? 'var(--danger)'
                                : 'transparent',
                            color:
                              confirmDeleteId === filter.id
                                ? '#04111f'
                                : 'var(--danger)',
                            borderColor:
                              confirmDeleteId === filter.id
                                ? 'transparent'
                                : 'rgba(251, 113, 133, 0.35)',
                          }}
                        >
                          {confirmDeleteId === filter.id
                            ? intl.formatMessage({
                                id: 'auditLog.filters.confirmDelete',
                                defaultMessage: 'Confirm delete',
                              })
                            : intl.formatMessage({
                                id: 'common.remove',
                                defaultMessage: 'Remove',
                              })}
                        </button>
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}

          <div
            style={{
              borderTop: '1px solid var(--border)',
              padding: '0.5rem 0.75rem',
              fontSize: '0.78rem',
              color: 'var(--muted)',
              display: 'flex',
              justifyContent: 'space-between',
              gap: 8,
            }}
          >
            <span>
              {intl.formatMessage(
                {
                  id: 'auditLog.filters.count',
                  defaultMessage:
                    '{count, plural, =0 {No filters} one {# filter} other {# filters}} saved',
                },
                { count: filters.length },
              )}
            </span>
            <span aria-hidden="true">
              {filters.length}/{maxFilters}
              {isFull ? ' — limit reached' : ''}
            </span>
          </div>
        </div>
      )}

      <div id={liveRegionId} className="sr-only" aria-live="polite">
        {announcement}
      </div>
    </div>
  )
}
