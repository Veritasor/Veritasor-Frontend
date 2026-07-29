/**
 * MotionDemo — design system documentation page for motion tokens.
 *
 * Shows every easing curve and duration token in use, with interactive
 * transition demos and accessibility notes.
 *
 * Accessibility compliance:
 *  - WCAG 2.1 AA: no motion without user action (no auto-play loops)
 *  - prefers-reduced-motion: interactive demos skip to final state
 *  - All interactive elements are keyboard-navigable (button / role="button")
 *  - Focus indicators visible via :focus-visible
 *  - Table headers use <th scope="col"> for screen-reader column association
 *  - Live region announces demo state changes
 */

import { useState, useEffect, useCallback } from 'react'

/* ─── Data ─────────────────────────────────────────────────────────────── */

interface DurationToken {
  name: string
  value: string
  use: string
}

interface EasingToken {
  name: string
  value: string
  use: string
}

const DURATION_TOKENS: DurationToken[] = [
  {
    name: '--motion-duration-none',
    value: '0ms',
    use: 'Instant update; reduced-motion baseline',
  },
  {
    name: '--motion-duration-xs',
    value: '80ms',
    use: 'Micro feedback: hover/focus ring, icon swap',
  },
  {
    name: '--motion-duration-sm',
    value: '140ms',
    use: 'Small element: chip, badge, inline status',
  },
  {
    name: '--motion-duration-md',
    value: '200ms',
    use: 'Panel/card content update',
  },
  {
    name: '--motion-duration-lg',
    value: '280ms',
    use: 'Toast enter, dashboard section transition',
  },
  {
    name: '--motion-duration-xl',
    value: '360ms',
    use: 'Layout-level transition — orientation support',
  },
]

const EASING_TOKENS: EasingToken[] = [
  {
    name: '--motion-easing-standard',
    value: 'cubic-bezier(0.2, 0, 0, 1)',
    use: 'Default for enter/update. Snappy start, smooth settle.',
  },
  {
    name: '--motion-easing-decelerate',
    value: 'cubic-bezier(0.0, 0, 0.2, 1)',
    use: 'Elements arriving on screen: drawers, modals, toasts sliding in.',
  },
  {
    name: '--motion-easing-accelerate',
    value: 'cubic-bezier(0.4, 0, 1, 1)',
    use: 'Elements leaving the screen. Fast exit.',
  },
  {
    name: '--motion-easing-exit',
    value: 'cubic-bezier(0.4, 0, 1, 1)',
    use: 'Alias for --motion-easing-accelerate (legacy consumers).',
  },
  {
    name: '--motion-easing-linear',
    value: 'linear',
    use: 'Indeterminate progress bars and value interpolation only.',
  },
  {
    name: '--motion-easing-spring',
    value: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
    use: 'Slight overshoot then settle. Toast enter only — not in data-dense panels.',
  },
]

/* Duration widths keyed by token name for bar preview */
const DURATION_BAR_WIDTHS: Record<string, number> = {
  '--motion-duration-none': 4,
  '--motion-duration-xs':   22,
  '--motion-duration-sm':   38,
  '--motion-duration-md':   55,
  '--motion-duration-lg':   77,
  '--motion-duration-xl':   100,
}

/* ─── Helpers ───────────────────────────────────────────────────────────── */

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/* ─── Sub-components ────────────────────────────────────────────────────── */

/** Visual width bar to represent a duration token proportionally */
function DurationBar({ tokenName }: { tokenName: string }) {
  const width = DURATION_BAR_WIDTHS[tokenName] ?? 8
  return (
    <div className="motion-duration-bar-wrap" aria-hidden="true">
      <div
        className="motion-duration-bar"
        style={{ width: `${width}px` }}
      />
    </div>
  )
}

/**
 * Interactive transition track — a ball that travels across a track when
 * activated. Each track uses a different easing+duration combination.
 * Pressing Enter or Space or clicking triggers the demo.
 */
interface TransitionTrackProps {
  label: string
  duration: string
  easing: string
  trackId: string
  onAnnounce: (msg: string) => void
}

function TransitionTrack({ label, duration, easing, trackId, onAnnounce }: TransitionTrackProps) {
  const [running, setRunning] = useState(false)
  const reduced = prefersReducedMotion()

  const trigger = useCallback(() => {
    if (reduced) {
      // Respect prefers-reduced-motion: skip to end immediately
      setRunning((r) => {
        onAnnounce(`${label} demo: ${r ? 'reset' : 'complete'} (reduced motion)`)
        return !r
      })
      return
    }
    setRunning((r) => {
      onAnnounce(`${label} demo ${r ? 'reset' : 'started'}`)
      return !r
    })
  }, [label, reduced, onAnnounce])

  const cssDuration = reduced ? '0ms' : duration
  const cssEasing = reduced ? 'linear' : easing

  return (
    <div className="motion-demo-box-item" style={{ width: '100%' }}>
      <div style={{ width: '100%', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
        <code className="motion-token-name" style={{ flexShrink: 0, minWidth: 180 }}>
          {duration}
        </code>
        <div
          id={trackId}
          role="button"
          tabIndex={0}
          aria-label={`${label} — press to play`}
          aria-pressed={running}
          className="motion-transition-track"
          style={{ flex: 1 }}
          onClick={trigger}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              trigger()
            }
          }}
        >
          <div
            className="motion-transition-ball"
            data-running={running ? 'true' : 'false'}
            style={{
              transition: `left ${cssDuration} ${cssEasing}`,
            }}
          >
            ▶
          </div>
        </div>
      </div>
      <p className="motion-demo-box-label" style={{ alignSelf: 'flex-start' }}>
        {label}
      </p>
    </div>
  )
}

/* ─── Main page ─────────────────────────────────────────────────────────── */

export default function MotionDemo() {
  const [announcement, setAnnouncement] = useState('')
  const [reducedMotion, setReducedMotion] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReducedMotion(mq.matches)
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  const announce = useCallback((msg: string) => setAnnouncement(msg), [])

  return (
    <main
      id="main-content"
      aria-labelledby="motion-demo-title"
      className="motion-demo-page"
    >
      {/* Live region for demo announcements */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {announcement}
      </div>

      {/* Page header */}
      <header>
        <p
          className="page-eyebrow"
          aria-hidden="true"
          style={{ marginBottom: '0.5rem' }}
        >
          Design system
        </p>
        <h1 id="motion-demo-title" style={{ margin: '0 0 0.5rem', fontSize: 'clamp(1.6rem, 3vw, 2.4rem)', lineHeight: 1.1 }}>
          Motion tokens
        </h1>
        <p style={{ margin: 0, color: 'var(--muted)', lineHeight: 1.65, maxWidth: '64ch' }}>
          A constrained set of easing curves and duration values for consistent, accessible animation
          across the Veritasor dashboard. All tokens are defined as CSS custom properties in{' '}
          <code style={{ fontFamily: '"SF Mono","Fira Code",monospace', fontSize: '0.82rem' }}>
            src/index.css
          </code>{' '}
          and can be used in any component via <code style={{ fontFamily: '"SF Mono","Fira Code",monospace', fontSize: '0.82rem' }}>
            var(--motion-*)
          </code>.
        </p>
      </header>

      {/* Reduced-motion callout (live) */}
      {reducedMotion && (
        <div className="motion-reduced-callout" role="note" aria-label="Reduced motion active">
          <strong>prefers-reduced-motion is active</strong>
          Interactive demos skip to their final state. All component animations are replaced with
          instant or opacity-only transitions per WCAG 2.1 SC 2.3.3.
        </div>
      )}

      {/* ── Duration tokens ── */}
      <section
        aria-labelledby="duration-section-title"
        className="motion-demo-section"
      >
        <h2 id="duration-section-title">Duration tokens</h2>
        <p className="motion-demo-description">
          Use the smallest duration that clearly communicates the state change. Avoid values over{' '}
          <code style={{ fontFamily: '"SF Mono","Fira Code",monospace' }}>--motion-duration-xl</code>{' '}
          (360 ms) in core dashboard flows.
        </p>

        <div style={{ overflowX: 'auto' }}>
          <table
            className="motion-token-table"
            aria-label="Duration token values and usage"
          >
            <thead>
              <tr>
                <th scope="col">Token</th>
                <th scope="col">Value</th>
                <th scope="col">Visual scale</th>
                <th scope="col">When to use</th>
              </tr>
            </thead>
            <tbody>
              {DURATION_TOKENS.map((t) => (
                <tr key={t.name}>
                  <td>
                    <code className="motion-token-name">{t.name}</code>
                  </td>
                  <td>
                    <code className="motion-token-value">{t.value}</code>
                  </td>
                  <td>
                    <DurationBar tokenName={t.name} />
                  </td>
                  <td className="motion-token-usage">{t.use}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Easing tokens ── */}
      <section
        aria-labelledby="easing-section-title"
        className="motion-demo-section"
      >
        <h2 id="easing-section-title">Easing tokens</h2>
        <p className="motion-demo-description">
          All curves follow a Material Motion foundation. Avoid elastic or bounce easing in
          trust-critical views (attestation confirm, payment summary).
          <code style={{ fontFamily: '"SF Mono","Fira Code",monospace' }}>
            {' '}--motion-easing-spring
          </code>{' '}
          is permitted only for toasts.
        </p>

        <div style={{ overflowX: 'auto' }}>
          <table
            className="motion-token-table"
            aria-label="Easing token values and usage"
          >
            <thead>
              <tr>
                <th scope="col">Token</th>
                <th scope="col">Value</th>
                <th scope="col">When to use</th>
              </tr>
            </thead>
            <tbody>
              {EASING_TOKENS.map((t) => (
                <tr key={t.name}>
                  <td>
                    <code className="motion-token-name">{t.name}</code>
                  </td>
                  <td>
                    <code className="motion-token-value">{t.value}</code>
                  </td>
                  <td className="motion-token-usage">{t.use}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Interactive duration demo ── */}
      <section
        aria-labelledby="duration-demo-title"
        className="motion-demo-section"
      >
        <h2 id="duration-demo-title">Interactive: duration comparison</h2>
        <p className="motion-demo-description">
          Click or press{' '}
          <kbd
            style={{
              fontFamily: '"SF Mono","Fira Code",monospace',
              fontSize: '0.78rem',
              padding: '0.1rem 0.3rem',
              border: '1px solid var(--border)',
              borderRadius: 4,
            }}
          >
            Enter
          </kbd>{' '}
          or{' '}
          <kbd
            style={{
              fontFamily: '"SF Mono","Fira Code",monospace',
              fontSize: '0.78rem',
              padding: '0.1rem 0.3rem',
              border: '1px solid var(--border)',
              borderRadius: 4,
            }}
          >
            Space
          </kbd>{' '}
          on any track to play and reset the demo. Each track uses{' '}
          <code style={{ fontFamily: '"SF Mono","Fira Code",monospace' }}>--motion-easing-standard</code>.
        </p>

        <div style={{ display: 'grid', gap: '0.75rem' }}>
          <TransitionTrack
            trackId="track-xs"
            label="xs — hover/focus (80ms)"
            duration="var(--motion-duration-xs)"
            easing="var(--motion-easing-standard)"
            onAnnounce={announce}
          />
          <TransitionTrack
            trackId="track-sm"
            label="sm — chip/badge (140ms)"
            duration="var(--motion-duration-sm)"
            easing="var(--motion-easing-standard)"
            onAnnounce={announce}
          />
          <TransitionTrack
            trackId="track-md"
            label="md — card update (200ms)"
            duration="var(--motion-duration-md)"
            easing="var(--motion-easing-standard)"
            onAnnounce={announce}
          />
          <TransitionTrack
            trackId="track-lg"
            label="lg — section/toast (280ms)"
            duration="var(--motion-duration-lg)"
            easing="var(--motion-easing-standard)"
            onAnnounce={announce}
          />
          <TransitionTrack
            trackId="track-xl"
            label="xl — layout (360ms)"
            duration="var(--motion-duration-xl)"
            easing="var(--motion-easing-standard)"
            onAnnounce={announce}
          />
        </div>
      </section>

      {/* ── Interactive easing demo ── */}
      <section
        aria-labelledby="easing-demo-title"
        className="motion-demo-section"
      >
        <h2 id="easing-demo-title">Interactive: easing comparison</h2>
        <p className="motion-demo-description">
          All tracks use{' '}
          <code style={{ fontFamily: '"SF Mono","Fira Code",monospace' }}>--motion-duration-lg</code>{' '}
          (280 ms). The difference is the easing curve.
        </p>

        <div style={{ display: 'grid', gap: '0.75rem' }}>
          <TransitionTrack
            trackId="ease-standard"
            label="standard — enter/update"
            duration="var(--motion-duration-lg)"
            easing="cubic-bezier(0.2, 0, 0, 1)"
            onAnnounce={announce}
          />
          <TransitionTrack
            trackId="ease-decelerate"
            label="decelerate — slide in"
            duration="var(--motion-duration-lg)"
            easing="cubic-bezier(0.0, 0, 0.2, 1)"
            onAnnounce={announce}
          />
          <TransitionTrack
            trackId="ease-accelerate"
            label="accelerate — slide out"
            duration="var(--motion-duration-lg)"
            easing="cubic-bezier(0.4, 0, 1, 1)"
            onAnnounce={announce}
          />
          <TransitionTrack
            trackId="ease-linear"
            label="linear — progress bar"
            duration="var(--motion-duration-lg)"
            easing="linear"
            onAnnounce={announce}
          />
          <TransitionTrack
            trackId="ease-spring"
            label="spring — toast enter only"
            duration="var(--motion-duration-lg)"
            easing="cubic-bezier(0.34, 1.56, 0.64, 1)"
            onAnnounce={announce}
          />
        </div>
      </section>

      {/* ── Component usage ── */}
      <section
        aria-labelledby="usage-section-title"
        className="motion-demo-section"
      >
        <h2 id="usage-section-title">Component usage</h2>
        <p className="motion-demo-description">
          Reference tokens via CSS <code style={{ fontFamily: '"SF Mono","Fira Code",monospace' }}>var()</code>.
          Examples from real components in this codebase:
        </p>

        <div style={{ display: 'grid', gap: '1rem' }}>
          {/* ThemeSwitcher */}
          <div>
            <h3 style={{ margin: '0 0 0.35rem', fontSize: 'var(--text-md)', fontWeight: 700 }}>
              ThemeSwitcher (.theme-option)
            </h3>
            <pre
              style={{
                margin: 0,
                padding: '0.75rem 1rem',
                background: 'var(--surface-strong)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                fontFamily: '"SF Mono","Fira Code",monospace',
                fontSize: '0.82rem',
                lineHeight: 1.6,
                overflow: 'auto',
                color: 'var(--text)',
              }}
            >
              {`.theme-option {
  transition:
    background-color var(--motion-duration-xs)
                    var(--motion-easing-standard);
}
/* before: transition: background-color 120ms ease */`}
            </pre>
          </div>

          {/* Toast */}
          <div>
            <h3 style={{ margin: '0 0 0.35rem', fontSize: 'var(--text-md)', fontWeight: 700 }}>
              Toast (.toast-entering / .toast-exiting)
            </h3>
            <pre
              style={{
                margin: 0,
                padding: '0.75rem 1rem',
                background: 'var(--surface-strong)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                fontFamily: '"SF Mono","Fira Code",monospace',
                fontSize: '0.82rem',
                lineHeight: 1.6,
                overflow: 'auto',
                color: 'var(--text)',
              }}
            >
              {`.toast-entering {
  animation: toast-enter
    var(--motion-duration-lg)
    var(--motion-easing-spring) forwards;
}
.toast-exiting {
  animation: toast-exit
    var(--motion-duration-sm)
    var(--motion-easing-accelerate) forwards;
}`}
            </pre>
          </div>

          {/* Sidebar link */}
          <div>
            <h3 style={{ margin: '0 0 0.35rem', fontSize: 'var(--text-md)', fontWeight: 700 }}>
              Sidebar nav (.sidebar-link)
            </h3>
            <pre
              style={{
                margin: 0,
                padding: '0.75rem 1rem',
                background: 'var(--surface-strong)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                fontFamily: '"SF Mono","Fira Code",monospace',
                fontSize: '0.82rem',
                lineHeight: 1.6,
                overflow: 'auto',
                color: 'var(--text)',
              }}
            >
              {`.sidebar-link {
  transition:
    color var(--motion-duration-xs) var(--motion-easing-standard),
    background-color var(--motion-duration-xs) var(--motion-easing-standard);
  /* existing: 120ms ease */
}`}
            </pre>
          </div>
        </div>
      </section>

      {/* ── Accessibility notes ── */}
      <section
        aria-labelledby="a11y-section-title"
        className="motion-demo-section"
      >
        <h2 id="a11y-section-title">Accessibility</h2>

        <div className="motion-a11y-callout" role="note" aria-label="Accessibility compliance notes">
          <strong>WCAG 2.1 AA compliant</strong>
          All motion respects <code style={{ fontFamily: '"SF Mono","Fira Code",monospace', fontSize: '0.82rem' }}>
            prefers-reduced-motion
          </code>. When set, component animations collapse to fade-only or instant transitions.
        </div>

        <div style={{ display: 'grid', gap: '0.75rem', marginTop: '0.5rem' }}>
          <div>
            <h3 style={{ margin: '0 0 0.35rem', fontSize: 'var(--text-md)', fontWeight: 700 }}>
              prefers-reduced-motion: reduce
            </h3>
            <ul style={{ margin: 0, paddingLeft: '1.2rem', display: 'grid', gap: '0.4rem', color: 'var(--muted)', fontSize: 'var(--text-sm)', lineHeight: 1.6 }}>
              <li>Toast enter/exit: fade only with <code style={{ fontFamily: '"SF Mono","Fira Code",monospace', fontSize: '0.82rem' }}>--motion-duration-xs</code></li>
              <li>ThemeSwitcher: instant background swap (duration forced to 0 via prefers-reduced-motion media query)</li>
              <li>Skeleton shimmer: replaced with static opacity pulse</li>
              <li>Interactive demos on this page: jump directly to final state</li>
            </ul>
          </div>

          <div>
            <h3 style={{ margin: '0 0 0.35rem', fontSize: 'var(--text-md)', fontWeight: 700 }}>
              Keyboard navigation
            </h3>
            <ul style={{ margin: 0, paddingLeft: '1.2rem', display: 'grid', gap: '0.4rem', color: 'var(--muted)', fontSize: 'var(--text-sm)', lineHeight: 1.6 }}>
              <li>All interactive demo tracks are focusable via <kbd style={{ fontFamily: '"SF Mono","Fira Code",monospace', fontSize: '0.75rem', padding: '0.1rem 0.25rem', border: '1px solid var(--border)', borderRadius: 3 }}>Tab</kbd></li>
              <li>Activated with <kbd style={{ fontFamily: '"SF Mono","Fira Code",monospace', fontSize: '0.75rem', padding: '0.1rem 0.25rem', border: '1px solid var(--border)', borderRadius: 3 }}>Enter</kbd> or <kbd style={{ fontFamily: '"SF Mono","Fira Code",monospace', fontSize: '0.75rem', padding: '0.1rem 0.25rem', border: '1px solid var(--border)', borderRadius: 3 }}>Space</kbd></li>
              <li>State changes announced via a polite live region</li>
              <li><code style={{ fontFamily: '"SF Mono","Fira Code",monospace', fontSize: '0.82rem' }}>aria-pressed</code> reflects playing/reset state</li>
            </ul>
          </div>

          <div>
            <h3 style={{ margin: '0 0 0.35rem', fontSize: 'var(--text-md)', fontWeight: 700 }}>
              Contrast and focus
            </h3>
            <ul style={{ margin: 0, paddingLeft: '1.2rem', display: 'grid', gap: '0.4rem', color: 'var(--muted)', fontSize: 'var(--text-sm)', lineHeight: 1.6 }}>
              <li>Token names and values rendered in <code style={{ fontFamily: '"SF Mono","Fira Code",monospace', fontSize: '0.82rem' }}>var(--accent)</code> (verified ≥ 4.5 : 1 against <code style={{ fontFamily: '"SF Mono","Fira Code",monospace', fontSize: '0.82rem' }}>--surface</code>)</li>
              <li>Table headers use <code style={{ fontFamily: '"SF Mono","Fira Code",monospace', fontSize: '0.82rem' }}>scope="col"</code> for assistive tech column association</li>
              <li>Focus ring visible via <code style={{ fontFamily: '"SF Mono","Fira Code",monospace', fontSize: '0.82rem' }}>:focus-visible</code> on all interactive elements</li>
            </ul>
          </div>
        </div>
      </section>

      {/* ── Policy reference ── */}
      <section
        aria-labelledby="policy-section-title"
        className="motion-demo-section"
      >
        <h2 id="policy-section-title">Policy reference</h2>
        <p className="motion-demo-description">
          Full motion policy is documented at{' '}
          <code style={{ fontFamily: '"SF Mono","Fira Code",monospace', fontSize: '0.82rem' }}>
            docs/uiux/motion-reduced-motion-policy.md
          </code>.
          Key rules:
        </p>
        <ul style={{ margin: 0, paddingLeft: '1.2rem', display: 'grid', gap: '0.5rem', color: 'var(--muted)', fontSize: 'var(--text-sm)', lineHeight: 1.6 }}>
          <li>Avoid transitions longer than 360 ms in core dashboard workflows.</li>
          <li>For chained transitions, total perceived time must remain under 500 ms.</li>
          <li>No bounce, elastic, or overshoot easing in trust-critical views (attestation confirm, payment summary).</li>
          <li>Keep movement on one axis per transition. Do not exceed 16 px travel in data-dense panels.</li>
          <li>Pair opacity change with minimal position change (0–8 px) when orientation is needed.</li>
          <li>
            <code style={{ fontFamily: '"SF Mono","Fira Code",monospace', fontSize: '0.82rem' }}>--motion-easing-spring</code>{' '}
            is only permitted for toast enter animation.
          </li>
        </ul>
      </section>
    </main>
  )
}
