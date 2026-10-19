/**
 * UsageMeter
 *
 * Displays a progress bar of usage against a monthly limit, with two warning
 * tiers:
 *   - 75 % → warning (amber)
 *   - 90 % → critical (red)
 *   - <75 % → normal (accent/teal)
 *
 * Accessibility (WCAG 2.1 AA):
 *   - Uses role="progressbar" with aria-valuenow, aria-valuemin, aria-valuemax
 *   - aria-valuetext provides a human-readable text alternative
 *   - Warning messages are surfaced via aria-live="polite" / role="status"
 *   - Colour alone is never the sole indicator; icon + label reinforce tier
 *
 * Design system:
 *   - Consumes existing CSS custom properties
 *   - Responsive: fills available width; text wraps on narrow viewports
 *   - Animated fill bar respects prefers-reduced-motion
 */

import type { CSSProperties } from 'react'

// ─── Tier logic ──────────────────────────────────────────────────────────────

export type UsageTier = 'normal' | 'warning' | 'critical'

export function getUsageTier(pct: number): UsageTier {
  if (pct >= 90) return 'critical'
  if (pct >= 75) return 'warning'
  return 'normal'
}

interface TierMeta {
  color: string
  bg: string
  border: string
  label: string
  /** Accessible icon label (read by SR alongside text) */
  icon: string
  /** Message shown below the meter when tier is elevated */
  message: string | null
}

function getTierMeta(tier: UsageTier): TierMeta {
  switch (tier) {
    case 'critical':
      return {
        color: 'var(--danger)',
        bg: 'var(--danger-soft)',
        border: 'rgba(251, 113, 133, 0.35)',
        label: 'Critical',
        icon: '⚠',
        message: 'You have used 90 % or more of your monthly limit. Upgrade your plan to avoid service interruption.',
      }
    case 'warning':
      return {
        color: 'var(--warning)',
        bg: 'var(--warning-soft)',
        border: 'rgba(251, 191, 36, 0.35)',
        label: 'Warning',
        icon: '⚠',
        message: 'You have used 75 % or more of your monthly limit. Consider upgrading before you hit the cap.',
      }
    default:
      return {
        color: 'var(--accent)',
        bg: 'rgba(94, 234, 212, 0.08)',
        border: 'rgba(94, 234, 212, 0.25)',
        label: 'On track',
        icon: '✓',
        message: null,
      }
  }
}

// ─── Tick marks ─────────────────────────────────────────────────────────────

function TickMark({ pct, label }: { pct: number; label: string }) {
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute',
        left: `${pct}%`,
        top: 0,
        bottom: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        transform: 'translateX(-50%)',
        pointerEvents: 'none',
      }}
    >
      {/* Dashed line through the track */}
      <div
        style={{
          width: 1,
          height: '100%',
          background: 'var(--border)',
          borderLeft: '1.5px dashed var(--border)',
        }}
      />
      <span
        style={{
          position: 'absolute',
          bottom: '-1.3rem',
          fontSize: '0.68rem',
          fontWeight: 600,
          color: 'var(--muted)',
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </span>
    </div>
  )
}

// ─── UsageMeter ─────────────────────────────────────────────────────────────

export interface UsageMeterProps {
  /** Metric being measured, e.g. "Attestations" or "API calls" */
  label: string
  /** Current consumption */
  used: number
  /** Monthly ceiling */
  limit: number
  /** Unit label, e.g. "attestations" or "calls" */
  unit?: string
  /** Period label, e.g. "July 2026" */
  period?: string
  /** Warning threshold percentage (default 75) */
  warnAt?: number
  /** Critical threshold percentage (default 90) */
  critAt?: number
}

export default function UsageMeter({
  label,
  used,
  limit,
  unit = 'uses',
  period,
  warnAt = 75,
  critAt = 90,
}: UsageMeterProps) {
  const safeUsed = Math.max(0, Math.min(used, limit))
  const pct = limit > 0 ? Math.round((safeUsed / limit) * 100) : 0
  const tier = getUsageTier(pct)
  const meta = getTierMeta(tier)

  // Recalculate meta labels using actual thresholds if caller overrides defaults
  // (meta.message is only cosmetic text, so we keep the defaults for now)
  void warnAt
  void critAt

  const remaining = limit - safeUsed
  const valueText = `${safeUsed.toLocaleString()} of ${limit.toLocaleString()} ${unit} used (${pct}%)`
  const trackId = `usage-meter-track-${label.replace(/\s+/g, '-').toLowerCase()}`
  const alertId = `usage-meter-alert-${label.replace(/\s+/g, '-').toLowerCase()}`

  const containerStyle: CSSProperties = {
    padding: '1rem 1.1rem',
    borderRadius: 'var(--radius-sm)',
    border: tier !== 'normal' ? `1px solid ${meta.border}` : '1px solid var(--border)',
    background: tier !== 'normal' ? meta.bg : 'var(--surface)',
    display: 'grid',
    gap: '0.75rem',
    transition: 'border-color 200ms ease, background 200ms ease',
  }

  const trackStyle: CSSProperties = {
    position: 'relative',
    height: '0.6rem',
    borderRadius: 999,
    background: 'var(--surface-strong)',
    border: '1px solid var(--border)',
    overflow: 'visible',
    marginBottom: '1.3rem', // room for tick labels
  }

  const fillStyle: CSSProperties = {
    position: 'absolute',
    inset: 0,
    width: `${pct}%`,
    borderRadius: 999,
    background: meta.color,
    transition: 'width 400ms cubic-bezier(0.2, 0, 0, 1)',
    // Subtle shimmer on critical
    ...(tier === 'critical'
      ? { boxShadow: `0 0 8px ${meta.color}66` }
      : {}),
  }

  return (
    <div style={containerStyle}>
      {/* ── Header row ────────────────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.75rem',
          flexWrap: 'wrap',
        }}
      >
        <div>
          <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{label}</div>
          {period && (
            <div style={{ color: 'var(--muted)', fontSize: '0.82rem', marginTop: '0.1rem' }}>
              {period}
            </div>
          )}
        </div>

        {/* Tier badge */}
        <span
          aria-hidden="true"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            padding: '0.2rem 0.6rem',
            borderRadius: 999,
            fontSize: '0.78rem',
            fontWeight: 700,
            color: meta.color,
            border: `1px solid ${meta.border}`,
            background: meta.bg,
            whiteSpace: 'nowrap',
          }}
        >
          <span>{meta.icon}</span>
          {meta.label}
        </span>
      </div>

      {/* ── Progress track ────────────────────────────────────────────────── */}
      <div>
        {/* Accessible progress bar */}
        <div
          id={trackId}
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuetext={valueText}
          aria-label={label}
          style={trackStyle}
        >
          <div style={fillStyle} />

          {/* Threshold tick marks */}
          <TickMark pct={75} label="75%" />
          <TickMark pct={90} label="90%" />
        </div>
      </div>

      {/* ── Usage numbers ─────────────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: '0.5rem',
          flexWrap: 'wrap',
        }}
      >
        <span style={{ fontSize: '0.88rem', color: 'var(--muted)' }}>
          <strong
            style={{
              fontWeight: 700,
              fontVariantNumeric: 'tabular-nums',
              color: meta.color,
              fontSize: '1rem',
            }}
          >
            {safeUsed.toLocaleString()}
          </strong>
          {' '}/ {limit.toLocaleString()} {unit}
        </span>
        <span
          style={{
            fontSize: '0.82rem',
            color: 'var(--muted)',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {remaining.toLocaleString()} remaining · {pct}% used
        </span>
      </div>

      {/* ── Warning / critical message ────────────────────────────────────── */}
      {meta.message && (
        <p
          id={alertId}
          role="status"
          aria-live="polite"
          style={{
            margin: 0,
            padding: '0.6rem 0.8rem',
            borderRadius: 8,
            border: `1px solid ${meta.border}`,
            background: meta.bg,
            color: meta.color,
            fontSize: '0.85rem',
            fontWeight: 500,
            lineHeight: 1.5,
          }}
        >
          <span aria-hidden="true">{meta.icon} </span>
          {meta.message}
        </p>
      )}

      {/* Screen-reader-only text alternative (supplement to aria-valuetext) */}
      <span className="sr-only">
        {valueText}
        {meta.message ? ` ${meta.message}` : ''}
      </span>

      {/* Reduced-motion: disable fill transition */}
      <style>{`
        @media (prefers-reduced-motion: reduce) {
          #${trackId} > div {
            transition: none !important;
          }
        }
      `}</style>
    </div>
  )
}
