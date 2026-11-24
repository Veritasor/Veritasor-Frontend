import { useState } from 'react'
import type { OnboardingDraft } from '../../hooks/useOnboardingDraft'
import { formatFileSize, type UploadProgress } from '../../services/onboardingApi'

const FILE_FIELD_LABELS: Record<string, string> = {
  selfie: 'Selfie verification',
  registrationCert: 'Registration cert.',
  govIdFront: 'Gov. ID front',
  govIdBack: 'Gov. ID back',
  proofOfAddress: 'Proof of address',
}

type Props = {
  draft: OnboardingDraft
  onBack: () => void
  onSubmit: () => void
  submitting: boolean
  submitError?: string | null
  onRetry?: () => void
  onCancel?: () => void
  uploadProgress?: UploadProgress | null
  fileErrors?: Record<string, string>
  onRetryFile?: (fieldKey: string) => void
}

type ReviewRow = {
  label: string
  value: string
  action?: {
    label: string
    onClick: () => void
    ariaLabel?: string
  }
}

export function maskSensitiveValue(value: string): string {
  if (!value) return ''
  const trimmed = value.trim()
  if (trimmed.length <= 4) return trimmed
  const last4 = trimmed.slice(-4)
  return `•••• ${last4}`
}

function rows(entries: [string, string][]): ReviewRow[] {
  return entries.filter(([, v]) => v).map(([label, value]) => ({ label, value }))
}

export default function ReviewSubmitStep({
  draft,
  onBack,
  onSubmit,
  submitting,
  submitError,
  onRetry,
  onCancel,
  uploadProgress,
  fileErrors,
  onRetryFile,
}: Props) {
  const { business, owner, selfie, documents, bank } = draft
  const [showAccountNumber, setShowAccountNumber] = useState(false)
  const [showIbanSwift, setShowIbanSwift] = useState(false)

  const businessRows = rows([
    ['Legal name', business.legalName],
    ['Registration no.', business.registrationNumber],
    ['Country', business.country],
    ['Business type', business.businessType],
    ['Website', business.website],
  ])

  const ownerRows = rows([
    ['Full name', owner.fullName],
    ['Date of birth', owner.dateOfBirth],
    ['Nationality', owner.nationality],
    ['Address', [owner.addressLine1, owner.addressLine2, owner.city, owner.postalCode].filter(Boolean).join(', ')],
  ])

  const selfieRows = rows([
    ['Selfie verification', selfie.captured ? 'Captured' : 'Not provided'],
  ])

  const docRows = rows([
    ['Registration cert.', documents.registrationCert.join(', ')],
    ['Gov. ID front', documents.govIdFront.join(', ')],
    ['Gov. ID back', documents.govIdBack.join(', ')],
    ['Proof of address', documents.proofOfAddress.join(', ')],
  ])

  const bankRows: ReviewRow[] = []
  if (bank.bankName) {
    bankRows.push({ label: 'Bank name', value: bank.bankName })
  }
  if (bank.accountNumber) {
    bankRows.push({
      label: 'Account number',
      value: showAccountNumber ? bank.accountNumber : maskSensitiveValue(bank.accountNumber),
      action: {
        label: showAccountNumber ? 'Hide' : 'Show',
        onClick: () => setShowAccountNumber(prev => !prev),
        ariaLabel: showAccountNumber ? 'Hide account number' : 'Show account number',
      },
    })
  }
  if (bank.ibanSwift) {
    bankRows.push({
      label: 'IBAN / SWIFT',
      value: showIbanSwift ? bank.ibanSwift : maskSensitiveValue(bank.ibanSwift),
      action: {
        label: showIbanSwift ? 'Hide' : 'Show',
        onClick: () => setShowIbanSwift(prev => !prev),
        ariaLabel: showIbanSwift ? 'Hide IBAN or SWIFT code' : 'Show IBAN or SWIFT code',
      },
    })
  }
  if (bank.currency) {
    bankRows.push({ label: 'Currency', value: bank.currency })
  }

  return (
    <div className="ob-form">
      <p style={{ margin: 0, color: 'var(--muted)', fontSize: '0.95rem', lineHeight: 1.6 }}>
        Review your information before submitting. Once submitted, your application will be set to <strong style={{ color: 'var(--text)' }}>pending review</strong> and our compliance team will be in touch within 2 business days.
      </p>

      {submitting && (
        <div
          className="ob-upload-progress"
          style={{
            marginTop: '1rem',
            padding: '0.875rem 1rem',
            borderRadius: 'var(--radius-sm, 8px)',
            background: 'var(--surface-strong, rgba(255, 255, 255, 0.04))',
            border: '1px solid var(--border, rgba(255, 255, 255, 0.12))',
            display: 'grid',
            gap: '0.5rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.875rem' }}>
            <span>
              Uploading application…{' '}
              <strong>{uploadProgress ? `${uploadProgress.percent}%` : '0%'}</strong>
            </span>
            {uploadProgress && uploadProgress.total > 0 && (
              <span style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>
                {formatFileSize(uploadProgress.loaded)} / {formatFileSize(uploadProgress.total)}
              </span>
            )}
          </div>
          <div
            role="progressbar"
            aria-label="Upload progress"
            aria-valuenow={uploadProgress?.percent ?? 0}
            aria-valuemin={0}
            aria-valuemax={100}
            style={{
              height: '0.5rem',
              width: '100%',
              borderRadius: '999px',
              background: 'var(--border, rgba(255, 255, 255, 0.12))',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${uploadProgress?.percent ?? 0}%`,
                background: 'var(--accent, #5eead4)',
                transition: 'width 120ms ease-out',
              }}
            />
          </div>
        </div>
      )}

      {submitError && (
        <div
          className="wizard-inline-alert"
          role="alert"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            marginTop: '1rem',
          }}
        >
          <span>{submitError}</span>
          <button
            type="button"
            className="ob-btn ob-btn-secondary"
            onClick={onRetry ?? onSubmit}
            disabled={submitting}
            style={{ minHeight: '2.25rem', padding: '0.375rem 1rem', fontSize: '0.875rem' }}
          >
            Retry
          </button>
        </div>
      )}

      {fileErrors && Object.keys(fileErrors).length > 0 && (
        <div
          className="ob-file-errors"
          role="alert"
          aria-label="File upload errors"
          style={{
            marginTop: '0.75rem',
            padding: '0.875rem 1rem',
            borderRadius: 'var(--radius-sm, 8px)',
            background: 'var(--danger-soft, rgba(239, 68, 68, 0.1))',
            border: '1px solid var(--danger, #ef4444)',
            display: 'grid',
            gap: '0.5rem',
          }}
        >
          {Object.entries(fileErrors).map(([fieldKey, message]) => (
            <div
              key={fieldKey}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.75rem',
                fontSize: '0.875rem',
              }}
            >
              <span>
                <strong>{FILE_FIELD_LABELS[fieldKey] ?? fieldKey}:</strong> {message}
              </span>
              <button
                type="button"
                className="ob-btn ob-btn-secondary"
                onClick={() => (onRetryFile ? onRetryFile(fieldKey) : (onRetry ?? onSubmit)())}
                disabled={submitting}
                style={{ minHeight: '2rem', padding: '0.25rem 0.75rem', fontSize: '0.8rem', flexShrink: 0 }}
              >
                Retry {FILE_FIELD_LABELS[fieldKey] ?? fieldKey}
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="ob-review-sections">
        <ReviewSection title="Business details" rows={businessRows} />
        <ReviewSection title="Owner / Director" rows={ownerRows} />
        <ReviewSection title="Selfie verification" rows={selfieRows} />
        <ReviewSection title="Documents" rows={docRows} />
        <ReviewSection title="Bank & payout" rows={bankRows} />
      </div>

      <div className="ob-actions">
        <button type="button" className="ob-btn ob-btn-secondary" onClick={onBack} disabled={submitting}>← Back</button>
        {submitting && onCancel && (
          <button
            type="button"
            className="ob-btn ob-btn-secondary"
            onClick={onCancel}
          >
            Cancel
          </button>
        )}
        <button
          type="button"
          className="ob-btn ob-btn-primary"
          onClick={onSubmit}
          disabled={submitting}
          aria-busy={submitting}
        >
          {submitting ? 'Submitting…' : 'Submit application'}
        </button>
      </div>
    </div>
  )
}

function ReviewSection({ title, rows }: { title: string; rows: ReviewRow[] }) {
  if (rows.length === 0) return null
  return (
    <section className="ob-review-section" aria-label={title}>
      <h3 className="ob-review-section-title">{title}</h3>
      {rows.map(({ label, value, action }) => (
        <div key={label} className="ob-review-row">
          <span className="ob-review-key">{label}</span>
          <span className="ob-review-val" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>{value}</span>
            {action && (
              <button
                type="button"
                className="ob-btn ob-btn-secondary"
                onClick={action.onClick}
                aria-label={action.ariaLabel}
                style={{
                  minHeight: '1.75rem',
                  padding: '0.125rem 0.5rem',
                  fontSize: '0.75rem',
                  lineHeight: 1.2,
                }}
              >
                {action.label}
              </button>
            )}
          </span>
        </div>
      ))}
    </section>
  )
}
