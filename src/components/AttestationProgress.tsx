import { useEffect, useState } from 'react'

const ATTESTATION_STEPS = [
  {
    title: 'Collecting monthly revenue',
    detail: 'Pull monthly totals from connected payment sources and normalize values for proof generation.',
  },
  {
    title: 'Verifying input sources',
    detail: 'Confirm that Stripe, Razorpay, and Shopify sources are complete and consistent.',
  },
  {
    title: 'Building merkle root',
    detail: 'Construct the transaction proof and prepare the attestation record for Stellar.',
  },
  {
    title: 'Publishing attestation to Stellar',
    detail: 'Submit the final attestation and metadata to the blockchain for auditability.',
  },
]

type AttestationPhase = 'idle' | 'running' | 'complete' | 'canceled'

type StepStatus = 'completed' | 'active' | 'pending'

function getStepStatus(index: number, activeStep: number, phase: AttestationPhase): StepStatus {
  if (phase === 'complete') {
    return 'completed'
  }

  if (index + 1 < activeStep) {
    return 'completed'
  }

  if (index + 1 === activeStep && phase === 'running') {
    return 'active'
  }

  return 'pending'
}

function getStatusLabel(phase: AttestationPhase, activeStep: number) {
  if (phase === 'running') {
    return `Step ${activeStep} of ${ATTESTATION_STEPS.length}`
  }

  if (phase === 'complete') {
    return 'Attestation complete'
  }

  if (phase === 'canceled') {
    return 'Attestation canceled'
  }

  return 'Ready to begin attestation processing'
}

function getStatusTone(phase: AttestationPhase) {
  if (phase === 'complete') {
    return 'var(--success)'
  }

  if (phase === 'canceled') {
    return 'var(--danger)'
  }

  return 'var(--accent)'
}

interface AttestationProgressProps {
  stepDurationMs?: number
}

export default function AttestationProgress({ stepDurationMs = 1100 }: AttestationProgressProps) {
  const [phase, setPhase] = useState<AttestationPhase>('idle')
  const [activeStep, setActiveStep] = useState(0)
  const [message, setMessage] = useState('Ready to generate a new revenue attestation.')
  const [wasCanceled, setWasCanceled] = useState(false)

  useEffect(() => {
    if (phase !== 'running' || activeStep === 0) {
      return undefined
    }

    const currentStep = ATTESTATION_STEPS[activeStep - 1]
    setMessage(`${currentStep.title} is in progress.`)

    if (activeStep === ATTESTATION_STEPS.length) {
      const completionTimer = setTimeout(() => {
        setPhase('complete')
        setMessage('Attestation successfully published on Stellar. You can start another report when needed.')
      }, stepDurationMs)

      return () => clearTimeout(completionTimer)
    }

    const stepTimer = setTimeout(() => {
      if (wasCanceled) {
        return
      }

      setActiveStep((current) => Math.min(ATTESTATION_STEPS.length, current + 1))
    }, stepDurationMs)

    return () => clearTimeout(stepTimer)
  }, [activeStep, phase, wasCanceled])

  const startAttestation = () => {
    setWasCanceled(false)
    setPhase('running')
    setActiveStep(1)
    setMessage('Collecting monthly revenue to build a proof record.')
  }

  const cancelAttestation = () => {
    setPhase('canceled')
    setWasCanceled(true)
    setMessage('Attestation processing was canceled. Start again when you are ready.')
  }

  const resetAttestation = () => {
    setPhase('idle')
    setActiveStep(0)
    setWasCanceled(false)
    setMessage('Ready to generate a new revenue attestation.')
  }

  const actionLabel = phase === 'running' ? 'Cancel attestation' : phase === 'complete' ? 'Start another attestation' : 'Start attestation'
  const actionHandler = phase === 'running' ? cancelAttestation : startAttestation

  return (
    <section
      aria-labelledby="attestation-progress-label"
      style={{
        marginTop: '2rem',
        padding: '1.5rem',
        background: 'var(--surface)',
        borderRadius: 16,
        border: '1px solid var(--border)',
      }}
    >
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'space-between' }}>
        <div>
          <p
            id="attestation-progress-label"
            style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}
          >
            Attestation progress
          </p>
          <p style={{ margin: '0.5rem 0 0', color: 'var(--muted)' }}>{message}</p>
        </div>

        <div style={{ display: 'grid', gap: '0.75rem', alignItems: 'start' }}>
          <p style={{ margin: 0, color: getStatusTone(phase), fontWeight: 700 }}>
            {getStatusLabel(phase, activeStep)}
          </p>
          <button
            type="button"
            onClick={actionHandler}
            style={{
              minWidth: 190,
              padding: '0.95rem 1.1rem',
              borderRadius: 999,
              border: 'none',
              cursor: 'pointer',
              color: 'var(--bg)',
              background: 'var(--accent)',
              fontWeight: 700,
            }}
          >
            {actionLabel}
          </button>
          {phase === 'canceled' ? (
            <button
              type="button"
              onClick={resetAttestation}
              style={{
                minWidth: 190,
                padding: '0.95rem 1.1rem',
                borderRadius: 999,
                border: '1px solid var(--border)',
                cursor: 'pointer',
                color: 'var(--text)',
                background: 'transparent',
              }}
            >
              Reset progress
            </button>
          ) : null}
        </div>
      </div>

      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        style={{ marginTop: '1rem', padding: '1rem', borderRadius: 12, background: 'rgba(94, 234, 212, 0.08)' }}
      >
        <p style={{ margin: 0, color: 'var(--text)' }}>{message}</p>
      </div>

      <ol style={{ listStyle: 'none', margin: '1.5rem 0 0', padding: 0, display: 'grid', gap: '1rem' }}>
        {ATTESTATION_STEPS.map((step, index) => {
          const stepStatus = getStepStatus(index, activeStep, phase)
          const isCurrent = stepStatus === 'active'
          return (
            <li
              key={step.title}
              aria-current={isCurrent ? 'step' : undefined}
              style={{
                display: 'grid',
                gap: '0.5rem',
                padding: '1rem',
                borderRadius: 14,
                border: '1px solid var(--border)',
                background: stepStatus === 'completed' ? 'rgba(52, 211, 153, 0.14)' : 'transparent',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                <span style={{ fontWeight: 700, color: stepStatus === 'completed' ? 'var(--success)' : isCurrent ? 'var(--accent)' : 'var(--muted)' }}>
                  {step.title}
                </span>
                <span style={{ color: stepStatus === 'completed' ? 'var(--success)' : isCurrent ? 'var(--accent)' : 'var(--muted)' }}>
                  {stepStatus === 'completed' ? 'Done' : isCurrent ? 'In progress' : 'Pending'}
                </span>
              </div>
              <p style={{ margin: 0, color: 'var(--muted)' }}>{step.detail}</p>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
