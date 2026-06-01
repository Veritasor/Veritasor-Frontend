import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useOnboardingDraft } from '../hooks/useOnboardingDraft'
import BusinessDetailsStep from './onboarding/BusinessDetailsStep'
import OwnerDetailsStep from './onboarding/OwnerDetailsStep'
import DocumentUploadStep from './onboarding/DocumentUploadStep'
import type { FileMap } from './onboarding/DocumentUploadStep'
import BankDetailsStep from './onboarding/BankDetailsStep'
import ReviewSubmitStep from './onboarding/ReviewSubmitStep'
import type { BusinessDetails, OwnerDetails, DocumentUpload, BankDetails } from '../hooks/useOnboardingDraft'

const TOTAL_STEPS = 5

const STEP_META = [
  { eyebrow: 'Step 1 of 5', title: 'Business details', description: 'Tell us about your registered business.' },
  { eyebrow: 'Step 2 of 5', title: 'Owner / Director', description: 'Provide details for the primary business owner or director.' },
  { eyebrow: 'Step 3 of 5', title: 'Document upload', description: 'Upload the required KYB/KYC documents. Accepted: PDF, JPG, PNG · max 10 MB each.' },
  { eyebrow: 'Step 4 of 5', title: 'Bank & payout details', description: 'Where should FluxaPay send your settlements?' },
  { eyebrow: 'Step 5 of 5', title: 'Review & submit', description: 'Check everything looks right before we send your application for review.' },
]

export default function OnboardingWizard() {
  const { draft, setDraft, clearDraft, savedAt } = useOnboardingDraft()
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const step = draft.step

  function goTo(s: number) {
    setDraft({ step: s })
  }

  // Step handlers
  function handleBusiness(data: BusinessDetails) {
    setDraft(prev => ({ ...prev, business: data, step: 2 }))
  }

  function handleOwner(data: OwnerDetails) {
    setDraft(prev => ({ ...prev, owner: data, step: 3 }))
  }

  function handleDocuments(data: DocumentUpload, _files: FileMap) {
    // File objects can't be serialised to localStorage; we store names only
    setDraft(prev => ({ ...prev, documents: data, step: 4 }))
  }

  function handleBank(data: BankDetails) {
    setDraft(prev => ({ ...prev, bank: data, step: 5 }))
  }

  async function handleSubmit() {
    setSubmitting(true)
    try {
      // POST to backend — replace with real endpoint
      await fetch('/api/onboarding/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...draft, status: 'pending_review' }),
      })
    } catch {
      // Proceed optimistically in dev; real app would show an error
    }
    clearDraft()
    setSubmitted(true)
    setSubmitting(false)
  }

  if (submitted) {
    return (
      <main className="ob-page">
        <div className="ob-shell">
          <div className="ob-card">
            <div className="ob-success">
              <span className="ob-success-icon" aria-hidden="true">✅</span>
              <h1 className="ob-success-title">Application submitted</h1>
              <p className="ob-success-body">
                Your KYB/KYC application is now <strong>pending review</strong>. Our compliance team will email you within 2 business days with an approval decision or any follow-up questions.
              </p>
              <Link to="/" className="ob-btn ob-btn-primary" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
                Go to dashboard
              </Link>
            </div>
          </div>
        </div>
      </main>
    )
  }

  const meta = STEP_META[step - 1]

  return (
    <main className="ob-page">
      <div className="ob-shell">
        {/* Top bar */}
        <div className="ob-topbar">
          <Link to="/" className="ob-brand">Veritasor</Link>
          {savedAt && (
            <span className="ob-draft-badge" aria-live="polite">
              <span className="ob-draft-dot" aria-hidden="true" />
              Draft saved
            </span>
          )}
        </div>

        {/* Progress */}
        <nav aria-label="Onboarding progress">
          <div className="ob-progress">
            <div className="ob-progress-header">
              <span className="ob-progress-label">KYB / KYC Onboarding</span>
              <span className="ob-progress-count">{step} / {TOTAL_STEPS}</span>
            </div>
            <div className="ob-progress-steps" role="list">
              {Array.from({ length: TOTAL_STEPS }, (_, i) => {
                const s = i + 1
                const isDone = s < step
                const isActive = s === step
                return (
                  <div
                    key={s}
                    role="listitem"
                    aria-label={`Step ${s}${isDone ? ' (completed)' : isActive ? ' (current)' : ''}`}
                    className={`ob-progress-step${isDone ? ' ob-progress-step-done' : isActive ? ' ob-progress-step-active' : ''}`}
                  />
                )
              })}
            </div>
          </div>
        </nav>

        {/* Card */}
        <div className="ob-card">
          <div className="ob-card-header">
            <p className="ob-card-eyebrow">{meta.eyebrow}</p>
            <h1 className="ob-card-title">{meta.title}</h1>
            <p className="ob-card-description">{meta.description}</p>
          </div>

          {step === 1 && (
            <BusinessDetailsStep
              data={draft.business}
              onNext={handleBusiness}
            />
          )}
          {step === 2 && (
            <OwnerDetailsStep
              data={draft.owner}
              onBack={() => goTo(1)}
              onNext={handleOwner}
            />
          )}
          {step === 3 && (
            <DocumentUploadStep
              data={draft.documents}
              onBack={() => goTo(2)}
              onNext={handleDocuments}
            />
          )}
          {step === 4 && (
            <BankDetailsStep
              data={draft.bank}
              onBack={() => goTo(3)}
              onNext={handleBank}
            />
          )}
          {step === 5 && (
            <ReviewSubmitStep
              draft={draft}
              onBack={() => goTo(4)}
              onSubmit={handleSubmit}
              submitting={submitting}
            />
          )}
        </div>
      </div>
    </main>
  )
}
