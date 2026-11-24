/**
 * DesignGallery — living design-system reference page (DEV only).
 *
 * Lists core UI primitives (SubmitButton, ToastItem, SkeletonLoader /
 * CrossfadeReveal, EmptyStateIllustrations, ConfirmDialog) with interactive
 * variant and state toggles.
 *
 * Gated on `import.meta.env.DEV` and lazy-loaded only in development so it is
 * completely excluded from production bundles.
 */

import { useState, useCallback } from 'react'
import SubmitButton from '../components/SubmitButton'
import ToastItem from '../components/ToastItem'
import type { ToastType } from '../components/ToastContext'
import {
  CrossfadeReveal,
  MetricCardSkeleton,
  AttestationRowSkeleton,
} from '../components/SkeletonLoader'
import {
  EmptyStateIllustration,
  ILLUSTRATION_META,
  type IllustrationType,
} from '../components/EmptyStateIllustrations'
import ConfirmDialog from '../components/ConfirmDialog'

const TOAST_TYPES: ToastType[] = ['success', 'info', 'warning', 'error']

const ILLUSTRATION_TYPES: IllustrationType[] = [
  'attestations',
  'revenue-sources',
  'data-export',
]

type SkeletonVariant = 'metric-card' | 'attestation-list'

const sectionStyle: React.CSSProperties = {
  marginTop: '2rem',
  padding: '1.5rem',
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 8,
}

const controlsRowStyle: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '0.75rem',
  alignItems: 'center',
  marginBottom: '1.25rem',
}

const previewBoxStyle: React.CSSProperties = {
  padding: '1.25rem',
  background: 'var(--surface-strong, var(--bg))',
  border: '1px solid var(--border)',
  borderRadius: 6,
}

const toggleBtnBase: React.CSSProperties = {
  padding: '0.35rem 0.75rem',
  borderRadius: 6,
  border: '1px solid var(--border)',
  background: 'var(--surface)',
  color: 'var(--text)',
  cursor: 'pointer',
  fontSize: '0.85rem',
}

const toggleBtnActive: React.CSSProperties = {
  ...toggleBtnBase,
  borderColor: 'var(--accent)',
  fontWeight: 600,
}

export default function DesignGallery() {
  // Guard at component level in addition to route-level DEV gating.
  if (!import.meta.env.DEV) {
    return null
  }

  return <DesignGalleryContent />
}

function DesignGalleryContent() {
  const [announcement, setAnnouncement] = useState('')

  // SubmitButton controls
  const [submitBusy, setSubmitBusy] = useState(false)
  const [submitDisabled, setSubmitDisabled] = useState(false)

  // ToastItem controls
  const [toastType, setToastType] = useState<ToastType>('success')
  const [toastWithUndo, setToastWithUndo] = useState(false)
  const [toastWithCount, setToastWithCount] = useState(false)
  const [toastDismissed, setToastDismissed] = useState(false)

  // SkeletonLoader / CrossfadeReveal controls
  const [skeletonLoaded, setSkeletonLoaded] = useState(false)
  const [skeletonVariant, setSkeletonVariant] = useState<SkeletonVariant>('metric-card')

  // EmptyStateIllustrations controls
  const [illustrationType, setIllustrationType] = useState<IllustrationType>('attestations')

  // ConfirmDialog controls
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogTone, setDialogTone] = useState<'default' | 'danger'>('default')
  const [dialogLoading, setDialogLoading] = useState(false)

  const announce = useCallback((msg: string) => setAnnouncement(msg), [])

  const handleToastRemove = useCallback(() => {
    setToastDismissed(true)
    announce('Toast dismissed')
  }, [announce])

  return (
    <main
      id="main-content"
      aria-labelledby="design-gallery-title"
      className="design-gallery-page"
      style={{ maxWidth: 960, margin: '0 auto', padding: '2rem 1.5rem' }}
    >
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </div>

      <header>
        <p className="page-eyebrow" aria-hidden="true" style={{ marginBottom: '0.5rem' }}>
          Design system · DEV only
        </p>
        <h1
          id="design-gallery-title"
          style={{ margin: '0 0 0.5rem', fontSize: 'clamp(1.6rem, 3vw, 2.4rem)', lineHeight: 1.15 }}
        >
          Component Gallery
        </h1>
        <p style={{ margin: 0, color: 'var(--muted)', lineHeight: 1.6, maxWidth: '64ch' }}>
          Living reference for core Veritasor UI primitives with interactive variant and state
          controls. Excluded from production builds via <code>import.meta.env.DEV</code>.
        </p>
      </header>

      {/* ── 1. SubmitButton ─────────────────────────────────────────────── */}
      <section aria-labelledby="gallery-submit-button" style={sectionStyle}>
        <h2 id="gallery-submit-button" style={{ marginTop: 0 }}>
          SubmitButton
        </h2>
        <p style={{ color: 'var(--muted)', marginTop: 0 }}>
          Primary form submit control with idle, busy (spinner + <code>aria-busy</code>), and
          disabled states.
        </p>

        <div style={controlsRowStyle} role="group" aria-label="SubmitButton controls">
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
            <input
              type="checkbox"
              checked={submitBusy}
              onChange={(e) => {
                setSubmitBusy(e.target.checked)
                announce(`SubmitButton busy ${e.target.checked ? 'enabled' : 'disabled'}`)
              }}
            />
            Busy
          </label>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
            <input
              type="checkbox"
              checked={submitDisabled}
              onChange={(e) => {
                setSubmitDisabled(e.target.checked)
                announce(`SubmitButton disabled ${e.target.checked ? 'enabled' : 'disabled'}`)
              }}
            />
            Disabled
          </label>
        </div>

        <div style={previewBoxStyle}>
          <SubmitButton
            type="button"
            busy={submitBusy}
            disabled={submitDisabled}
            idleLabel="Sign in"
            busyLabel="Signing in…"
            onClick={() => announce('SubmitButton clicked')}
          />
        </div>
      </section>

      {/* ── 2. ToastItem ────────────────────────────────────────────────── */}
      <section aria-labelledby="gallery-toast-item" style={sectionStyle}>
        <h2 id="gallery-toast-item" style={{ marginTop: 0 }}>
          ToastItem
        </h2>
        <p style={{ color: 'var(--muted)', marginTop: 0 }}>
          Notification item supporting severity variants, optional undo action, and item counts.
        </p>

        <div style={controlsRowStyle} role="group" aria-label="ToastItem severity controls">
          {TOAST_TYPES.map((t) => (
            <button
              key={t}
              type="button"
              aria-pressed={toastType === t}
              style={toastType === t ? toggleBtnActive : toggleBtnBase}
              onClick={() => {
                setToastType(t)
                setToastDismissed(false)
                announce(`Toast type set to ${t}`)
              }}
            >
              {t}
            </button>
          ))}
        </div>

        <div style={controlsRowStyle} role="group" aria-label="ToastItem option controls">
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
            <input
              type="checkbox"
              checked={toastWithUndo}
              onChange={(e) => {
                setToastWithUndo(e.target.checked)
                setToastDismissed(false)
              }}
            />
            With Undo
          </label>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
            <input
              type="checkbox"
              checked={toastWithCount}
              onChange={(e) => {
                setToastWithCount(e.target.checked)
                setToastDismissed(false)
              }}
            />
            With Count
          </label>
          {toastDismissed && (
            <button
              type="button"
              style={toggleBtnBase}
              onClick={() => {
                setToastDismissed(false)
                announce('Toast restored')
              }}
            >
              Restore toast
            </button>
          )}
        </div>

        <div style={previewBoxStyle}>
          {!toastDismissed ? (
            <ToastItem
              key={`${toastType}-${String(toastWithUndo)}-${String(toastWithCount)}`}
              toast={{
                id: 'gallery-toast',
                type: toastType,
                message: `Sample ${toastType} notification message`,
                duration: 0,
                onUndo: toastWithUndo ? () => announce('Undo triggered') : undefined,
                count: toastWithCount ? 3 : undefined,
              }}
              onRemove={handleToastRemove}
              disableMotion
            />
          ) : (
            <p style={{ margin: 0, color: 'var(--muted)' }}>
              Toast dismissed. Use &ldquo;Restore toast&rdquo; to preview again.
            </p>
          )}
        </div>
      </section>

      {/* ── 3. SkeletonLoader / CrossfadeReveal ─────────────────────────── */}
      <section aria-labelledby="gallery-skeleton-loader" style={sectionStyle}>
        <h2 id="gallery-skeleton-loader" style={{ marginTop: 0 }}>
          SkeletonLoader &amp; CrossfadeReveal
        </h2>
        <p style={{ color: 'var(--muted)', marginTop: 0 }}>
          Accessible skeleton placeholders with CSS-driven crossfade to loaded content.
        </p>

        <div style={controlsRowStyle} role="group" aria-label="SkeletonLoader controls">
          <button
            type="button"
            aria-pressed={skeletonVariant === 'metric-card'}
            style={skeletonVariant === 'metric-card' ? toggleBtnActive : toggleBtnBase}
            onClick={() => setSkeletonVariant('metric-card')}
          >
            Metric card
          </button>
          <button
            type="button"
            aria-pressed={skeletonVariant === 'attestation-list'}
            style={skeletonVariant === 'attestation-list' ? toggleBtnActive : toggleBtnBase}
            onClick={() => setSkeletonVariant('attestation-list')}
          >
            Attestation rows
          </button>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
            <input
              type="checkbox"
              checked={skeletonLoaded}
              onChange={(e) => {
                setSkeletonLoaded(e.target.checked)
                announce(`Skeleton crossfade ${e.target.checked ? 'loaded' : 'loading'}`)
              }}
            />
            Loaded
          </label>
        </div>

        <div style={previewBoxStyle}>
          {skeletonVariant === 'metric-card' ? (
            <CrossfadeReveal loaded={skeletonLoaded} skeleton={<MetricCardSkeleton />}>
              <div style={{ padding: '0.5rem 0' }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>Verified Revenue</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>$128,450.00</div>
              </div>
            </CrossfadeReveal>
          ) : (
            <div style={{ display: 'grid', gap: '0.5rem' }}>
              {[
                { id: 'att_001', period: 'Q1 2026', amount: '$42,100' },
                { id: 'att_002', period: 'Q2 2026', amount: '$86,350' },
              ].map((row, idx) => (
                <CrossfadeReveal
                  key={row.id}
                  loaded={skeletonLoaded}
                  staggerIndex={idx}
                  skeleton={<AttestationRowSkeleton />}
                >
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr 1fr',
                      padding: '0.5rem 0',
                    }}
                  >
                    <span>{row.id}</span>
                    <span>{row.period}</span>
                    <span>{row.amount}</span>
                  </div>
                </CrossfadeReveal>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── 4. EmptyStateIllustrations ──────────────────────────────────── */}
      <section aria-labelledby="gallery-empty-illustrations" style={sectionStyle}>
        <h2 id="gallery-empty-illustrations" style={{ marginTop: 0 }}>
          EmptyStateIllustrations
        </h2>
        <p style={{ color: 'var(--muted)', marginTop: 0 }}>
          Token-driven SVG illustrations with screen-reader descriptions for empty states.
        </p>

        <div style={controlsRowStyle} role="group" aria-label="EmptyStateIllustrations controls">
          {ILLUSTRATION_TYPES.map((type) => (
            <button
              key={type}
              type="button"
              aria-pressed={illustrationType === type}
              style={illustrationType === type ? toggleBtnActive : toggleBtnBase}
              onClick={() => {
                setIllustrationType(type)
                announce(`Illustration set to ${type}`)
              }}
            >
              {type}
            </button>
          ))}
        </div>

        <div style={{ ...previewBoxStyle, textAlign: 'center' }}>
          <EmptyStateIllustration type={illustrationType} />
          <p style={{ margin: '0.5rem 0 0', color: 'var(--muted)', fontSize: '0.9rem' }}>
            {ILLUSTRATION_META[illustrationType].label}
          </p>
        </div>
      </section>

      {/* ── 5. ConfirmDialog ────────────────────────────────────────────── */}
      <section aria-labelledby="gallery-confirm-dialog" style={sectionStyle}>
        <h2 id="gallery-confirm-dialog" style={{ marginTop: 0 }}>
          ConfirmDialog
        </h2>
        <p style={{ color: 'var(--muted)', marginTop: 0 }}>
          Accessible modal confirmation dialog with focus trap, Escape key handling, and tone
          variants.
        </p>

        <div style={controlsRowStyle} role="group" aria-label="ConfirmDialog controls">
          <button
            type="button"
            aria-pressed={dialogTone === 'default'}
            style={dialogTone === 'default' ? toggleBtnActive : toggleBtnBase}
            onClick={() => setDialogTone('default')}
          >
            Default tone
          </button>
          <button
            type="button"
            aria-pressed={dialogTone === 'danger'}
            style={dialogTone === 'danger' ? toggleBtnActive : toggleBtnBase}
            onClick={() => setDialogTone('danger')}
          >
            Danger tone
          </button>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
            <input
              type="checkbox"
              checked={dialogLoading}
              onChange={(e) => setDialogLoading(e.target.checked)}
            />
            Loading
          </label>
        </div>

        <div style={previewBoxStyle}>
          <button
            type="button"
            className="modal-btn modal-btn-confirm"
            onClick={() => {
              setDialogOpen(true)
              announce('ConfirmDialog opened')
            }}
          >
            Open ConfirmDialog
          </button>
        </div>

        <ConfirmDialog
          open={dialogOpen}
          title={dialogTone === 'danger' ? 'Revoke API key?' : 'Publish attestation?'}
          description={
            dialogTone === 'danger'
              ? 'This action cannot be undone. Existing integrations using this key will fail.'
              : 'This will publish the verified revenue attestation to your public ledger.'
          }
          confirmText={dialogTone === 'danger' ? 'Revoke key' : 'Publish'}
          cancelText="Cancel"
          tone={dialogTone}
          isLoading={dialogLoading}
          onClose={() => {
            setDialogOpen(false)
            announce('ConfirmDialog closed')
          }}
          onConfirm={() => {
            setDialogOpen(false)
            announce('ConfirmDialog confirmed')
          }}
        />
      </section>
    </main>
  )
}
