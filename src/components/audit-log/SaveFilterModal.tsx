/**
 * SaveFilterModal — Accessible dialog for naming and persisting the
 * currently active audit-log filter (issue #236).
 *
 * Accessibility:
 *   - role="dialog" + aria-modal=true + labelledby/describedby
 *   - Focus trap (Tab / Shift+Tab) — Tab cycles inside the dialog only
 *   - Escape closes
 *   - Focus is restored to the original trigger when the dialog closes
 *   - Inline validation announces via aria-describedby + role="alert"
 *
 * Validation:
 *   - Trims and collapses whitespace
 *   - Empty / too-long / duplicate / control-character names are
 *     rejected with a localised message
 *   - Submit is disabled while invalid
 */

import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { useIntl } from 'react-intl'
import {
  MAX_FILTER_NAME_LENGTH,
  validateFilterName,
} from '../../utils/auditLogFilters'
import { useDialogA11y } from '../../hooks/useDialogA11y'

export interface SaveFilterModalProps {
  isOpen: boolean
  initialName?: string
  existingNames: readonly string[]
  /** Called with the canonical (trimmed, whitespace-collapsed) name. */
  onSave: (name: string) => void
  onClose: () => void
}

function describeReason(
  reason: 'empty' | 'too_long' | 'duplicate' | 'invalid_chars',
): string {
  if (reason === 'empty') return 'Enter a filter name to continue.'
  if (reason === 'too_long')
    return `Filter name must be ${MAX_FILTER_NAME_LENGTH} characters or fewer.`
  if (reason === 'duplicate') return 'A saved filter with this name already exists.'
  return 'Filter name contains characters that are not allowed.'
}

export default function SaveFilterModal({
  isOpen,
  initialName = '',
  existingNames,
  onSave,
  onClose,
}: SaveFilterModalProps) {
  const intl = useIntl()
  const titleId = useId()
  const descId = useId()
  const inputId = useId()
  const errorId = useId()
  const dialogRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const [name, setName] = useState(initialName)

  // Reset whenever the dialog opens so callers can pass a fresh default.
  useEffect(() => {
    if (isOpen) setName(initialName)
  }, [isOpen, initialName])

  // Escape, focus trap and return focus
  useDialogA11y({ open: isOpen, containerRef: dialogRef, onClose, initialFocus: inputRef })

  const validation = useMemo(
    () => validateFilterName(name, existingNames),
    [name, existingNames],
  )

  if (!isOpen) return null

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validation.ok) return
    onSave(validation.name)
  }

  function handleBackdrop() {
    onClose()
  }

  const submitDisabled = !validation.ok
  const showError = name.length > 0 && !validation.ok

  return (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions -- backdrop click dismisses modal; Escape key is handled via keydown listener
    <div
      className="modal-backdrop"
      onClick={handleBackdrop}
      data-testid="save-filter-modal-backdrop"
    >
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions -- stops click propagation from dialog to backdrop */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        className="modal-dialog"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2 id={titleId} className="modal-title">
            {intl.formatMessage({
              id: 'auditLog.filters.modalTitle',
              defaultMessage: 'Save filter',
            })}
          </h2>
          <button
            type="button"
            className="modal-close"
            aria-label={intl.formatMessage({
              id: 'common.close',
              defaultMessage: 'Close',
            })}
            onClick={onClose}
          >
            <span aria-hidden="true">✕</span>
          </button>
        </div>

        <form
          id="save-filter-form"
          className="modal-body"
          onSubmit={handleSubmit}
          noValidate
        >
          <p id={descId} className="modal-description">
            {intl.formatMessage({
              id: 'auditLog.filters.modalDescription',
              defaultMessage:
                'Save the current filter combination so you can reapply or share it later. The filter is stored locally for this workspace.',
            })}
          </p>

          <div className="auth-input-group">
            <label htmlFor={inputId} className="auth-label">
              {intl.formatMessage({
                id: 'auditLog.filters.nameLabel',
                defaultMessage: 'Filter name',
              })}
            </label>
            <input
              ref={inputRef}
              id={inputId}
              type="text"
              className={`auth-input${showError ? ' auth-input-error' : ''}`}
              value={name}
              maxLength={MAX_FILTER_NAME_LENGTH}
              placeholder={intl.formatMessage({
                id: 'auditLog.filters.namePlaceholder',
                defaultMessage: 'e.g. Failed Attestations',
              })}
              aria-invalid={showError}
              aria-describedby={showError ? errorId : undefined}
              onChange={(e) => setName(e.target.value)}
              autoComplete="off"
              required
            />
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: '0.5rem',
                fontSize: '0.8rem',
                color: 'var(--muted)',
              }}
            >
              <span>
                {intl.formatMessage({
                  id: 'auditLog.filters.nameHelp',
                  defaultMessage:
                    'Use a name that helps teammates recognise this view.',
                })}
              </span>
              <span aria-live="polite">
                {name.length} / {MAX_FILTER_NAME_LENGTH}
              </span>
            </div>
            {showError && !validation.ok && (
              <p
                id={errorId}
                role="alert"
                className="modal-error"
                style={{ margin: 0 }}
              >
                {describeReason(validation.reason)}
              </p>
            )}
          </div>
        </form>

        <div className="modal-footer">
          <button
            type="button"
            className="modal-btn modal-btn-cancel"
            onClick={onClose}
            data-testid="save-filter-cancel"
          >
            {intl.formatMessage({ id: 'common.cancel', defaultMessage: 'Cancel' })}
          </button>
          <button
            type="submit"
            form="save-filter-form"
            className="modal-btn modal-btn-confirm"
            disabled={submitDisabled}
            aria-disabled={submitDisabled}
            data-testid="save-filter-confirm"
          >
            {intl.formatMessage({ id: 'common.save', defaultMessage: 'Save' })}
          </button>
        </div>
      </div>
    </div>
  )
}