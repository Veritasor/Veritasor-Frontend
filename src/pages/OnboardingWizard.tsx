import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { useOnboardingDraft } from '../hooks/useOnboardingDraft'
import BusinessDetailsStep from './onboarding/BusinessDetailsStep'
import OwnerDetailsStep from './onboarding/OwnerDetailsStep'
import DocumentUploadStep from './onboarding/DocumentUploadStep'
import type { FileMap } from './onboarding/DocumentUploadStep'
import BankDetailsStep from './onboarding/BankDetailsStep'
import ReviewSubmitStep from './onboarding/ReviewSubmitStep'
import type { OnboardingDraft, BusinessDetails, OwnerDetails, DocumentUpload, BankDetails } from '../hooks/useOnboardingDraft'
import Breadcrumb from '../components/Breadcrumb'

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
  const [stepAnnouncement, setStepAnnouncement] = useState('')
  const titleRef = useRef<HTMLHeadingElement | null>(null)
  const cardRef = useRef<HTMLDivElement | null>(null)
  const [actionsEl, setActionsEl] = useState<HTMLElement | null>(null)
  const rafIdRef = useRef<number | null>(null)
  const pendingUpdaterRef = useRef<((prev: OnboardingDraft) => OnboardingDraft) | null>(null)

  const step = draft.step

  function scheduleDraftUpdate(updater: (prev: OnboardingDraft) => OnboardingDraft) {
    pendingUpdaterRef.current = updater
    if (rafIdRef.current != null) return
    rafIdRef.current = window.requestAnimationFrame(() => {
      const nextUpdater = pendingUpdaterRef.current
      pendingUpdaterRef.current = null
      rafIdRef.current = null
      if (nextUpdater) setDraft(nextUpdater)
    })
  }

  useEffect(() => {
    return () => {
      if (rafIdRef.current != null) window.cancelAnimationFrame(rafIdRef.current)
    }
  }, [])

  useEffect(() => {
    const meta = STEP_META[step - 1]
    setStepAnnouncement(`Step ${step} of ${TOTAL_STEPS}: ${meta?.title ?? ''}`)
    // Move focus to the step title so screen readers announce the context.
    titleRef.current?.focus()
  }, [step])

  useLayoutEffect(() => {
    const el = cardRef.current?.querySelector('.ob-actions')
    setActionsEl(el instanceof HTMLElement ? el : null)
  }, [step])

  function handleAutoPersist(e: React.SyntheticEvent) {
    const target = e.target as (HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement) | null
    if (!target || typeof target.id !== 'string') return

    const id = target.id

    const setNested = <K extends keyof OnboardingDraft, F extends string>(
      key: K,
      field: F,
      value: string,
    ) => {
      scheduleDraftUpdate(prev => {
        const current = (prev[key] as any)?.[field]
        if (current === value) return prev
        return { ...prev, [key]: { ...(prev as any)[key], [field]: value } }
      })
    }

    if (id === 'ob-legal-name') return setNested('business', 'legalName', target.value)
    if (id === 'ob-reg-number') return setNested('business', 'registrationNumber', target.value)
    if (id === 'ob-country') return setNested('business', 'country', target.value)
    if (id === 'ob-biz-type') return setNested('business', 'businessType', target.value)
    if (id === 'ob-website') return setNested('business', 'website', target.value)

    if (id === 'ob-full-name') return setNested('owner', 'fullName', target.value)
    if (id === 'ob-dob') return setNested('owner', 'dateOfBirth', target.value)
    if (id === 'ob-nationality') return setNested('owner', 'nationality', target.value)
    if (id === 'ob-addr1') return setNested('owner', 'addressLine1', target.value)
    if (id === 'ob-addr2') return setNested('owner', 'addressLine2', target.value)
    if (id === 'ob-city') return setNested('owner', 'city', target.value)
    if (id === 'ob-postal') return setNested('owner', 'postalCode', target.value)

    if (id === 'ob-bank-name') return setNested('bank', 'bankName', target.value)
    if (id === 'ob-account-number') return setNested('bank', 'accountNumber', target.value)
    if (id === 'ob-currency') return setNested('bank', 'currency', target.value)
    if (id === 'ob-iban-swift') return setNested('bank', 'ibanSwift', target.value)

    if (id.startsWith('ob-drop-') && target instanceof HTMLInputElement && target.type === 'file') {
      const docKey = id.replace('ob-drop-', '') as keyof OnboardingDraft['documents']
      const names = Array.from(target.files ?? []).map(f => f.name).filter(Boolean)
      if (names.length === 0) return
      scheduleDraftUpdate(prev => {
        const current = prev.documents?.[docKey] ?? []
        const merged = [...current, ...names].filter((v, i, arr) => arr.indexOf(v) === i)
        return { ...prev, documents: { ...prev.documents, [docKey]: merged } }
      })
    }
  }

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
        <style>
          {`
            @keyframes obStepIn {
              from { opacity: 0; transform: translateY(10px); }
              to { opacity: 1; transform: translateY(0); }
            }
            .ob-step-transition {
              animation: obStepIn 220ms ease-out;
              will-change: opacity, transform;
            }
            @media (prefers-reduced-motion: reduce) {
              .ob-step-transition { animation: none !important; }
            }
          `}
        </style>
        <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
          {stepAnnouncement}
        </p>
        {/* Breadcrumb */}
        <Breadcrumb
          items={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Onboarding' },
            { label: meta.title },
          ]}
        />

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
                    aria-current={isActive ? 'step' : undefined}
                    className={`ob-progress-step${isDone ? ' ob-progress-step-done' : isActive ? ' ob-progress-step-active' : ''}`}
                  />
                )
              })}
            </div>
          </div>
        </nav>

        {/* Card */}
        <div
          ref={cardRef}
          className="ob-card"
          onChangeCapture={handleAutoPersist}
          onInputCapture={handleAutoPersist}
        >
          <div className="ob-card-header">
            <p className="ob-card-eyebrow">{meta.eyebrow}</p>
            <h1 ref={titleRef} className="ob-card-title" tabIndex={-1}>{meta.title}</h1>
            <p className="ob-card-description">{meta.description}</p>
          </div>

          <div key={step} className="ob-step-transition">
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

          {actionsEl && createPortal(
            <Link
              to="/dashboard"
              onClick={() => setDraft(prev => ({ ...prev }))}
              className="ob-save-exit"
              style={{
                marginLeft: 'auto',
                alignSelf: 'center',
                fontSize: '0.95rem',
                textDecoration: 'underline',
                color: 'var(--muted)',
                pointerEvents: submitting ? 'none' : undefined,
                opacity: submitting ? 0.6 : 1,
              }}
              aria-label="Save your progress and exit onboarding"
              aria-disabled={submitting || undefined}
              tabIndex={submitting ? -1 : undefined}
            >
              Save and exit
            </Link>,
            actionsEl,
          )}
        </div>
      </div>
    </main>
  )
}
