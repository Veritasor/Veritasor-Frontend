type WizardStep = {
  id: string
  label: string
  detail: string
}

type WizardProgressProps = {
  currentStepIndex: number
  steps: WizardStep[]
}

export default function WizardProgress({
  currentStepIndex,
  steps,
}: WizardProgressProps) {
  const currentStep = steps[currentStepIndex]

  return (
    <nav
      className="wizard-progress"
      aria-label="Connect source progress"
      aria-describedby="wizard-progress-announcement"
    >
      <div className="wizard-progress-header">
        <p className="wizard-progress-caption" aria-hidden="true">
          Step {currentStepIndex + 1} of {steps.length}
        </p>
        <p
          id="wizard-progress-announcement"
          className="sr-only"
          role="status"
          aria-live="polite"
        >
          Step {currentStepIndex + 1} of {steps.length}: {currentStep.label}
        </p>
      </div>

      <ol className="wizard-progress-list">
        {steps.map((step, index) => {
          const isComplete = index < currentStepIndex
          const isCurrent = index === currentStepIndex

          return (
            <li
              key={step.id}
              className={`wizard-progress-item ${isComplete ? 'is-complete' : ''} ${
                isCurrent ? 'is-current' : ''
              }`}
              aria-current={isCurrent ? 'step' : undefined}
            >
              <span className="wizard-progress-marker" aria-hidden="true">
                {isComplete ? '✓' : index + 1}
              </span>
              <span className="wizard-progress-copy">
                <span className="wizard-progress-title">{step.label}</span>
                <span className="wizard-progress-detail">{step.detail}</span>
              </span>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
