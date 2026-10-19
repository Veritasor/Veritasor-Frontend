import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion'

/**
 * ResultAnimation — named, reusable outcome animation for terminal results
 * (issue #529).
 *
 * A Lottie-style SVG animation pair: a soft ring that pops in followed by a
 * stroke draw-in of a checkmark (success) or cross (failure). Deliberately
 * restrained — confident, not celebratory or alarming — per the design
 * guidelines, and token-driven (`--success` / `--danger`, motion duration
 * tokens) so it adapts to light/dark/high-contrast themes.
 *
 * Accessibility:
 *  - WCAG 2.1 AA: animation auto-disables under `prefers-reduced-motion`,
 *    leaving the static final frame (fully drawn stroke, no motion).
 *  - The SVG is decorative (`aria-hidden="true"`, `focusable="false"`); the
 *    accessible description is a companion `.sr-only` span, and the outcome
 *    is also announced by the surrounding live region (e.g. the attestation
 *    status area). Nothing inside the animation is focusable.
 *  - Respects `--motion-duration-*` tokens; playback is a single bounded
 *    sequence, so it never loops or auto-plays beyond one render.
 *
 * Usage:
 *   <ResultAnimation outcome="success" />
 *   <ResultAnimation outcome="failure" size={96} label="Attestation failed" />
 */

export type ResultOutcome = 'success' | 'failure'

export const RESULT_ANIMATION_LABELS: Record<ResultOutcome, string> = {
  success: 'Completed successfully',
  failure: 'Completed with an error',
}

interface ResultAnimationProps {
  outcome: ResultOutcome
  /** Diameter in px. Defaults to 72. */
  size?: number
  /** Accessible description (sr-only). Defaults to the outcome label. */
  label?: string
}

const VIEWBOX = 96

function strokePath(outcome: ResultOutcome): { d: string; dash: number; delay: string }[] {
  if (outcome === 'success') {
    // Checkmark: 30,50 → 43,63 → 66,38 (length ≈ 51 in the 96 viewBox)
    return [{ d: 'M30 50 L43 63 L66 38', dash: 60, delay: '0.14s' }]
  }
  // Cross: two diagonals (length ≈ 34 each in the 96 viewBox)
  return [
    { d: 'M36 36 L60 60', dash: 40, delay: '0.14s' },
    { d: 'M60 36 L36 60', dash: 40, delay: '0.26s' },
  ]
}

export default function ResultAnimation({
  outcome,
  size = 72,
  label,
}: ResultAnimationProps) {
  const reducedMotion = usePrefersReducedMotion()
  const accessibleLabel = label ?? RESULT_ANIMATION_LABELS[outcome]
  const strokeColor = outcome === 'success' ? 'var(--success)' : 'var(--danger)'
  const strokes = strokePath(outcome)

  return (
    <span
      className="va-result-animation"
      data-outcome={outcome}
      data-reduced-motion={reducedMotion ? 'true' : 'false'}
      style={{ display: 'inline-block', lineHeight: 0 }}
    >
      <svg
        aria-hidden="true"
        focusable="false"
        width={size}
        height={size}
        viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={reducedMotion ? undefined : 'va-result-animate'}
      >
        {/* Soft ring — pops in first, then the stroke draws in */}
        <circle
          className="va-result-ring"
          cx={VIEWBOX / 2}
          cy={VIEWBOX / 2}
          r="34"
          stroke={strokeColor}
          strokeOpacity="0.35"
          strokeWidth="3"
        />
        {strokes.map((s) => (
          <path
            key={s.d}
            className="va-result-stroke"
            d={s.d}
            stroke={strokeColor}
            strokeWidth="6"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={s.dash}
            style={{
              animationDelay: s.delay,
              // Drives the `from` frame of va-result-stroke-draw per path.
              ['--va-dash-start' as string]: s.dash,
            }}
          />
        ))}
      </svg>
      <span className="sr-only">{accessibleLabel}</span>
    </span>
  )
}
