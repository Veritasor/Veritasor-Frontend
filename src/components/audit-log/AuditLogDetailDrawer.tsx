/**
 * AuditLogDetailDrawer
 *
 * Right-side drawer that shows full detail for an audit log entry:
 *  - Event metadata (timestamp, actor, IP, user agent)
 *  - Request headers section (collapsible)
 *  - Request / Response payload with JSON pretty-print and copy action
 *
 * Accessibility:
 *  - role="dialog" aria-modal="true" with aria-labelledby
 *  - Focus is trapped inside the drawer while open
 *  - Escape key dismisses
 *  - Returns focus to the trigger element on close
 *  - Backdrop click dismisses
 *  - Reduced-motion: slide transition respects prefers-reduced-motion
 *
 * Design system:
 *  - Uses existing CSS custom properties (--bg, --surface, --border, etc.)
 *  - Consistent corner radius (--radius-sm / --radius-md)
 *  - Accent colour for action buttons, danger/success/warning tokens for status
 */

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import type { AuditLogEntry } from './AuditLogTimeline'

// ─── Extended entry type ────────────────────────────────────────────────────
// The base AuditLogEntry is minimal. The drawer can receive richer data via
// the extended type while remaining backwards-compatible.

export interface AuditLogEntryDetail extends AuditLogEntry {
  /** Who performed the action */
  actor?: string
  /** Originating IP address */
  ip?: string
  /** User-agent string */
  userAgent?: string
  /** HTTP method (GET, POST, …) */
  method?: string
  /** Request path */
  path?: string
  /** HTTP response status code */
  statusCode?: number
  /** Request headers as key→value map */
  requestHeaders?: Record<string, string>
  /** Raw request body (will be pretty-printed if valid JSON) */
  requestPayload?: unknown
  /** Raw response body (will be pretty-printed if valid JSON) */
  responsePayload?: unknown
}

// ─── Focus-trap helpers ─────────────────────────────────────────────────────

const FOCUSABLE_SELECTORS = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  'details>summary',
].join(',')

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS))
}

function useFocusTrap(containerRef: React.RefObject<HTMLElement | null>, isOpen: boolean) {
  useEffect(() => {
    if (!isOpen) return
    const container = containerRef.current
    if (!container) return

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Tab') return
      const focusable = getFocusableElements(container!)
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault()
          last.focus()
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, containerRef])
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function prettyJSON(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

function statusCodeLabel(code: number): string {
  if (code >= 500) return 'Server error'
  if (code >= 400) return 'Client error'
  if (code >= 300) return 'Redirect'
  if (code >= 200) return 'Success'
  return 'Info'
}

function statusCodeColor(code: number): string {
  if (code >= 500) return 'var(--danger)'
  if (code >= 400) return 'var(--warning)'
  if (code >= 300) return 'var(--muted)'
  return 'var(--success)'
}

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    dateStyle: 'long',
    timeStyle: 'medium',
  })
}

// ─── CopyButton ─────────────────────────────────────────────────────────────

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      // Clipboard API not available — silent fail
    }
  }, [text])

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={copied ? `${label} copied` : `Copy ${label}`}
      aria-live="polite"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.3rem',
        padding: '0.3rem 0.65rem',
        borderRadius: 6,
        border: '1px solid var(--border)',
        background: copied ? 'var(--success-soft)' : 'var(--surface-strong)',
        color: copied ? 'var(--success)' : 'var(--muted)',
        cursor: 'pointer',
        fontSize: '0.78rem',
        fontWeight: 600,
        transition: 'background 120ms ease, color 120ms ease',
        flexShrink: 0,
      }}
    >
      {copied ? (
        <>
          {/* Checkmark icon */}
          <svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          Copied
        </>
      ) : (
        <>
          {/* Copy icon */}
          <svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
          Copy
        </>
      )}
    </button>
  )
}

// ─── CollapsibleSection ─────────────────────────────────────────────────────

function CollapsibleSection({
  id,
  title,
  defaultOpen = true,
  children,
}: {
  id: string
  title: string
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  const bodyId = `${id}-body`

  return (
    <section aria-labelledby={`${id}-title`} style={{ display: 'grid', gap: 0 }}>
      <button
        id={`${id}-title`}
        type="button"
        aria-expanded={open}
        aria-controls={bodyId}
        onClick={() => setOpen((v) => !v)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.5rem',
          width: '100%',
          padding: '0.65rem 0',
          background: 'none',
          border: 'none',
          borderBottom: '1px solid var(--border)',
          color: 'var(--text)',
          fontWeight: 700,
          fontSize: '0.88rem',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        {title}
        {/* Chevron */}
        <svg
          aria-hidden="true"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            transition: 'transform 150ms ease',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            flexShrink: 0,
            color: 'var(--muted)',
          }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      <div id={bodyId} hidden={!open}>
        <div style={{ paddingTop: '0.75rem' }}>{children}</div>
      </div>
    </section>
  )
}

// ─── PayloadViewer ───────────────────────────────────────────────────────────

function PayloadViewer({
  id,
  label,
  value,
}: {
  id: string
  label: string
  value: unknown
}) {
  const text = prettyJSON(value)
  return (
    <div style={{ display: 'grid', gap: '0.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
        <span id={`${id}-label`} style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {label}
        </span>
        <CopyButton text={text} label={label} />
      </div>
      <pre
        aria-labelledby={`${id}-label`}
        tabIndex={0}
        style={{
          margin: 0,
          padding: '0.85rem 1rem',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border)',
          background: 'var(--surface-strong)',
          color: 'var(--text)',
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
          fontSize: '0.8rem',
          lineHeight: 1.65,
          overflowX: 'auto',
          overflowY: 'auto',
          maxHeight: '18rem',
          whiteSpace: 'pre',
          // Custom scrollbar for readability
          scrollbarWidth: 'thin',
          scrollbarColor: 'var(--border) transparent',
        }}
      >
        {text}
      </pre>
    </div>
  )
}

// ─── HeadersTable ────────────────────────────────────────────────────────────

function HeadersTable({ headers }: { headers: Record<string, string> }) {
  const entries = Object.entries(headers)
  const allText = entries.map(([k, v]) => `${k}: ${v}`).join('\n')

  return (
    <div style={{ display: 'grid', gap: '0.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <CopyButton text={allText} label="request headers" />
      </div>
      <div
        role="table"
        aria-label="Request headers"
        style={{
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)',
          overflow: 'hidden',
          fontSize: '0.82rem',
        }}
      >
        <div role="rowgroup">
          <div
            role="row"
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 2fr',
              background: 'var(--surface-strong)',
              borderBottom: '1px solid var(--border)',
            }}
          >
            <div role="columnheader" style={{ padding: '0.45rem 0.75rem', fontWeight: 700, color: 'var(--muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Header
            </div>
            <div role="columnheader" style={{ padding: '0.45rem 0.75rem', fontWeight: 700, color: 'var(--muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Value
            </div>
          </div>
        </div>
        <div role="rowgroup">
          {entries.map(([key, val]) => (
            <div
              key={key}
              role="row"
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 2fr',
                borderTop: '1px solid var(--border)',
              }}
            >
              <div
                role="cell"
                style={{
                  padding: '0.45rem 0.75rem',
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                  fontWeight: 600,
                  color: 'var(--accent)',
                  wordBreak: 'break-all',
                }}
              >
                {key}
              </div>
              <div
                role="cell"
                style={{
                  padding: '0.45rem 0.75rem',
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                  color: 'var(--text)',
                  wordBreak: 'break-all',
                }}
              >
                {val}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── MetaRow ─────────────────────────────────────────────────────────────────

function MetaRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'contents' }}>
      <dt style={{ color: 'var(--muted)', fontSize: '0.85rem', paddingTop: '0.05rem' }}>{label}</dt>
      <dd style={{ margin: 0, fontSize: '0.88rem', wordBreak: 'break-all' }}>{children}</dd>
    </div>
  )
}

// ─── AuditLogDetailDrawer ────────────────────────────────────────────────────

export interface AuditLogDetailDrawerProps {
  entry: AuditLogEntryDetail | null
  onClose: () => void
  /** Element that triggered the drawer open — focus returns here on close */
  triggerRef?: React.RefObject<HTMLElement | null>
}

export default function AuditLogDetailDrawer({
  entry,
  onClose,
  triggerRef,
}: AuditLogDetailDrawerProps) {
  const isOpen = entry !== null
  const drawerRef = useRef<HTMLDivElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  // Trap focus inside the drawer
  useFocusTrap(drawerRef, isOpen)

  // Move focus into the drawer when it opens
  useLayoutEffect(() => {
    if (isOpen && closeButtonRef.current) {
      closeButtonRef.current.focus()
    }
  }, [isOpen])

  // Return focus to trigger on close
  useEffect(() => {
    if (!isOpen && triggerRef?.current) {
      triggerRef.current.focus()
    }
  }, [isOpen, triggerRef])

  // Dismiss on Escape
  useEffect(() => {
    if (!isOpen) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
      }
    }
    document.addEventListener('keydown', handleKey, true)
    return () => document.removeEventListener('keydown', handleKey, true)
  }, [isOpen, onClose])

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      const prev = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = prev }
    }
  }, [isOpen])

  if (!isOpen || !entry) return null

  return (
    <>
      {/* ── Backdrop ──────────────────────────────────────────────────────── */}
      <div
        aria-hidden="true"
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 200,
          background: 'rgba(2, 6, 23, 0.6)',
          backdropFilter: 'blur(2px)',
          // Respect prefers-reduced-motion
          animation: 'auditDrawerBackdropIn var(--motion-duration-md) var(--motion-easing-standard) forwards',
        }}
      />

      {/* ── Drawer panel ──────────────────────────────────────────────────── */}
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="audit-drawer-title"
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          zIndex: 201,
          width: 'min(560px, 95vw)',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--surface)',
          borderLeft: '1px solid var(--border)',
          boxShadow: 'var(--shadow-lg)',
          animation: 'auditDrawerIn var(--motion-duration-lg) var(--motion-easing-standard) forwards',
        }}
      >
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.75rem',
            padding: '1rem 1.25rem',
            borderBottom: '1px solid var(--border)',
            flexShrink: 0,
          }}
        >
          <div style={{ minWidth: 0 }}>
            <h2
              id="audit-drawer-title"
              style={{ margin: 0, fontSize: '1rem', fontWeight: 700, lineHeight: 1.3 }}
            >
              {entry.event}
            </h2>
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: 'var(--muted)', fontFamily: 'ui-monospace, monospace' }}>
              {entry.id}
            </p>
          </div>

          {entry.statusCode !== undefined && (
            <span
              aria-label={`HTTP status: ${entry.statusCode} ${statusCodeLabel(entry.statusCode)}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.25rem 0.65rem',
                borderRadius: 999,
                fontWeight: 700,
                fontSize: '0.82rem',
                color: statusCodeColor(entry.statusCode),
                border: `1px solid ${statusCodeColor(entry.statusCode)}44`,
                background: `${statusCodeColor(entry.statusCode)}18`,
                flexShrink: 0,
              }}
            >
              {entry.statusCode}
            </span>
          )}

          <button
            ref={closeButtonRef}
            type="button"
            aria-label="Close audit detail drawer"
            onClick={onClose}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '2.25rem',
              height: '2.25rem',
              borderRadius: 8,
              border: '1px solid var(--border)',
              background: 'var(--surface-strong)',
              color: 'var(--muted)',
              cursor: 'pointer',
              flexShrink: 0,
              transition: 'color 120ms ease, border-color 120ms ease',
            }}
          >
            {/* ✕ */}
            <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* ── Scrollable body ──────────────────────────────────────────────── */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '1.25rem',
            display: 'grid',
            gap: '1.5rem',
            alignContent: 'start',
            scrollbarWidth: 'thin',
            scrollbarColor: 'var(--border) transparent',
          }}
        >
          {/* Metadata */}
          <CollapsibleSection id="audit-drawer-meta" title="Event metadata">
            <dl
              style={{
                display: 'grid',
                gridTemplateColumns: 'max-content 1fr',
                gap: '0.5rem 1.25rem',
                margin: 0,
              }}
            >
              <MetaRow label="Timestamp">
                <time dateTime={entry.timestamp} style={{ fontFamily: 'ui-monospace, monospace' }}>
                  {formatTimestamp(entry.timestamp)}
                </time>
              </MetaRow>
              {entry.details && (
                <MetaRow label="Details">{entry.details}</MetaRow>
              )}
              {entry.actor && (
                <MetaRow label="Actor">{entry.actor}</MetaRow>
              )}
              {entry.ip && (
                <MetaRow label="IP address">
                  <code style={{ fontFamily: 'ui-monospace, monospace', fontSize: '0.85rem' }}>{entry.ip}</code>
                </MetaRow>
              )}
              {entry.userAgent && (
                <MetaRow label="User agent">
                  <span style={{ fontSize: '0.82rem', color: 'var(--muted)', wordBreak: 'break-all' }}>
                    {entry.userAgent}
                  </span>
                </MetaRow>
              )}
              {entry.method && (
                <MetaRow label="Method">
                  <code
                    style={{
                      fontFamily: 'ui-monospace, monospace',
                      fontSize: '0.82rem',
                      padding: '0.1rem 0.4rem',
                      borderRadius: 4,
                      background: 'var(--surface-strong)',
                      border: '1px solid var(--border)',
                    }}
                  >
                    {entry.method}
                  </code>
                </MetaRow>
              )}
              {entry.path && (
                <MetaRow label="Path">
                  <code style={{ fontFamily: 'ui-monospace, monospace', fontSize: '0.82rem', wordBreak: 'break-all' }}>
                    {entry.path}
                  </code>
                </MetaRow>
              )}
            </dl>
          </CollapsibleSection>

          {/* Request headers */}
          {entry.requestHeaders && Object.keys(entry.requestHeaders).length > 0 && (
            <CollapsibleSection id="audit-drawer-req-headers" title="Request headers" defaultOpen={false}>
              <HeadersTable headers={entry.requestHeaders} />
            </CollapsibleSection>
          )}

          {/* Request payload */}
          {entry.requestPayload !== undefined && (
            <CollapsibleSection id="audit-drawer-req-body" title="Request payload">
              <PayloadViewer id="req-payload" label="request payload" value={entry.requestPayload} />
            </CollapsibleSection>
          )}

          {/* Response payload */}
          {entry.responsePayload !== undefined && (
            <CollapsibleSection id="audit-drawer-res-body" title="Response payload">
              <PayloadViewer id="res-payload" label="response payload" value={entry.responsePayload} />
            </CollapsibleSection>
          )}
        </div>
      </div>

      {/* ── Keyframe animations (injected once) ─────────────────────────── */}
      <style>{`
        @keyframes auditDrawerIn {
          from { transform: translateX(100%); }
          to   { transform: translateX(0); }
        }
        @keyframes auditDrawerBackdropIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          @keyframes auditDrawerIn {
            from { opacity: 0; }
            to   { opacity: 1; }
          }
          @keyframes auditDrawerBackdropIn {
            from { opacity: 0; }
            to   { opacity: 1; }
          }
        }
      `}</style>
    </>
  )
}
