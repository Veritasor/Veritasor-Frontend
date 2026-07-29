import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import Breadcrumb from '../components/Breadcrumb'
import ProofShareModal from '../components/ProofShareModal'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type VerificationStatus = 'verified' | 'pending' | 'failed'

interface AttestationRecord {
  id: string
  merkleRoot: string
  stellarTxHash: string
  timestamp: string
  recordCount: number
  totalRevenue: string
  currency: string
  status: VerificationStatus
  failureReason?: string
  remediation?: string
}

// ---------------------------------------------------------------------------
// Mock data — replace with real API call
// ---------------------------------------------------------------------------

const MOCK: Record<string, AttestationRecord> = {
  'att-001': {
    id: 'att-001',
    merkleRoot: '0x3a7bd3e2360a3d29eea436fcfb7e44c735d117c9f4e4b5e6a1c2d3e4f5a6b7c8',
    stellarTxHash: 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2',
    timestamp: '2026-05-28T14:32:00Z',
    recordCount: 142,
    totalRevenue: '84,320.00',
    currency: 'USD',
    status: 'verified',
  },
  'att-002': {
    id: 'att-002',
    merkleRoot: '0x9f8e7d6c5b4a3928170605040302010f0e0d0c0b0a090807060504030201000f',
    stellarTxHash: 'f0e1d2c3b4a5968778695a4b3c2d1e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d',
    timestamp: '2026-05-15T09:10:00Z',
    recordCount: 98,
    totalRevenue: '61,450.00',
    currency: 'USD',
    status: 'pending',
  },
  'att-003': {
    id: 'att-003',
    merkleRoot: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    stellarTxHash: 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
    timestamp: '2026-05-20T11:45:00Z',
    recordCount: 56,
    totalRevenue: '12,300.00',
    currency: 'USD',
    status: 'failed',
    failureReason: 'Stellar network timeout during transaction submission.',
    remediation: 'Verify network connectivity and retry the attestation proof submission.',
  },
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STELLAR_EXPLORER = 'https://stellar.expert/explorer/public/tx/'

const STATUS_STYLES: Record<VerificationStatus, { bg: string; color: string; label: string }> = {
  verified: { bg: 'var(--success-soft)', color: 'var(--success)', label: 'Verified' },
  pending: { bg: 'var(--warning-soft)', color: 'var(--warning)', label: 'Pending' },
  failed: { bg: 'var(--danger-soft)', color: 'var(--danger)', label: 'Failed' },
}

function truncate(hash: string, chars = 12) {
  if (hash.length <= chars * 2 + 3) return hash
  return `${hash.slice(0, chars)}…${hash.slice(-chars)}`
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

// ---------------------------------------------------------------------------
// CopyButton
// ---------------------------------------------------------------------------

type CopyState = 'idle' | 'copied' | 'failed'

function CopyButton({ value, label }: { value: string; label: string }) {
  const [state, setState] = useState<CopyState>('idle')

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value)
      setState('copied')
    } catch {
      setState('failed')
    }
    setTimeout(() => setState('idle'), 2000)
  }

  const isCopied = state === 'copied'
  const isFailed = state === 'failed'

  return (
    <>
      {/* aria-live region announces outcome to screen readers without moving focus */}
      <span
        aria-live="polite"
        aria-atomic="true"
        style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap' }}
      >
        {isCopied ? `${label} copied` : isFailed ? `Failed to copy ${label}` : ''}
      </span>
      <button
        type="button"
        onClick={handleCopy}
        aria-label={isCopied ? `${label} copied` : isFailed ? `Failed to copy ${label}` : `Copy ${label}`}
        title={isCopied ? 'Copied!' : isFailed ? 'Copy failed' : 'Copy to clipboard'}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.3rem',
          padding: '0.25rem 0.6rem',
          fontSize: '0.78rem',
          fontWeight: 600,
          border: '1px solid var(--border)',
          borderRadius: '0.5rem',
          background: isCopied ? 'var(--success-soft)' : isFailed ? 'var(--danger-soft)' : 'rgba(148,163,184,0.08)',
          color: isCopied ? 'var(--success)' : isFailed ? 'var(--danger)' : 'var(--muted)',
          cursor: 'pointer',
          transition: 'background 160ms, color 160ms',
          flexShrink: 0,
        }}
      >
        {isCopied ? (
          <>
            <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="2,6 5,9 10,3" />
            </svg>
            Copied
          </>
        ) : isFailed ? (
          <>
            <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="2" y1="2" x2="10" y2="10" /><line x1="10" y1="2" x2="2" y2="10" />
            </svg>
            Failed
          </>
        ) : (
          <>
            <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="4" y="1" width="7" height="9" rx="1" />
              <path d="M4 3H2a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-1" />
            </svg>
            Copy
          </>
        )}
      </button>
    </>
  )
}

// ---------------------------------------------------------------------------
// MetaRow
// ---------------------------------------------------------------------------

function MetaRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.875rem 0',
        borderBottom: '1px solid var(--border)',
      }}
    >
      <dt
        style={{
          width: '10rem',
          flexShrink: 0,
          fontSize: '0.85rem',
          fontWeight: 600,
          color: 'var(--muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
        }}
      >
        {label}
      </dt>
      <dd style={{ margin: 0, flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
        {children}
      </dd>
    </div>
  )
}

// ---------------------------------------------------------------------------
// AttestationDetail
// ---------------------------------------------------------------------------

export default function AttestationDetail() {
  const { id } = useParams<{ id: string }>()
  const attestation = id ? MOCK[id] : undefined
  const [isShareModalOpen, setIsShareModalOpen] = useState(false)

  // ── Loading / not-found states ──────────────────────────────────────────
  if (!id) {
    return (
      <div role="alert" aria-live="polite" style={{ color: 'var(--muted)' }}>
        No attestation ID provided.
      </div>
    )
  }

  if (!attestation) {
    return (
      <div>
        <Breadcrumb items={[{ label: 'Attestations', href: '/attestations' }, { label: id }]} />
        <div
          role="alert"
          aria-live="polite"
          style={{
            marginTop: '2rem',
            padding: '1.5rem',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--muted)',
          }}
        >
          Attestation <strong style={{ color: 'var(--text)' }}>{id}</strong> was not found.
        </div>
      </div>
    )
  }

  const status = STATUS_STYLES[attestation.status]

  return (
    <div style={{ maxWidth: '52rem' }}>
      <Breadcrumb
        items={[
          { label: 'Attestations', href: '/attestations' },
          { label: `Attestation ${attestation.id}` },
        ]}
      />

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '1rem',
          marginTop: '1.5rem',
          marginBottom: '2rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
          <h1 style={{ margin: 0, fontSize: 'clamp(1.4rem, 3vw, 2rem)' }}>
            Attestation Proof
          </h1>
          <span
            role="status"
            aria-label={`Verification status: ${status.label}`}
            style={{
              padding: '0.3rem 0.85rem',
              borderRadius: '999px',
              fontSize: '0.82rem',
              fontWeight: 700,
              background: status.bg,
              color: status.color,
              letterSpacing: '0.04em',
            }}
          >
            {status.label}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setIsShareModalOpen(true)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: 'var(--primary)',
            color: '#fff',
            border: 'none',
            borderRadius: '0.375rem',
            padding: '0.5rem 1rem',
            fontSize: '0.9rem',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'opacity 0.2s',
          }}
          onMouseOver={(e) => (e.currentTarget.style.opacity = '0.9')}
          onMouseOut={(e) => (e.currentTarget.style.opacity = '1')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
            <polyline points="16 6 12 2 8 6" />
            <line x1="12" y1="2" x2="12" y2="15" />
          </svg>
          Share Proof
        </button>
      </header>

      {/* ── Failure Banner ─────────────────────────────────────────────── */}
      {attestation.status === 'failed' && (
        <section
          aria-labelledby="failure-banner-title"
          style={{
            background: 'var(--danger-soft)',
            border: '1px solid var(--danger)',
            borderRadius: 'var(--radius-sm)',
            padding: '1.25rem',
            marginBottom: '2rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
          }}
        >
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" strokeWidth="2" aria-hidden="true" style={{ marginTop: '0.1rem', flexShrink: 0 }}>
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <div>
              <h2 id="failure-banner-title" style={{ margin: '0 0 0.5rem 0', fontSize: '1.05rem', color: 'var(--danger)' }}>
                Attestation Failed
              </h2>
              <p style={{ margin: '0 0 0.25rem 0', color: 'var(--text)', fontSize: '0.95rem' }}>
                <strong>Reason:</strong> {attestation.failureReason || 'Unknown error occurred.'}
              </p>
              {attestation.remediation && (
                <p style={{ margin: 0, color: 'var(--text)', fontSize: '0.95rem' }}>
                  <strong>Suggested Remediation:</strong> {attestation.remediation}{' '}
                  <a href="/docs/troubleshooting" style={{ color: 'var(--danger)', textDecoration: 'underline', fontWeight: 600 }}>
                    Read docs
                  </a>
                </p>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={() => {
                if (window.confirm('Are you sure you want to retry this failed attestation?')) {
                  alert('Retry initiated.')
                }
              }}
              style={{
                background: 'var(--danger)',
                color: '#fff',
                border: 'none',
                borderRadius: '0.375rem',
                padding: '0.5rem 1rem',
                fontSize: '0.9rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'opacity 0.2s',
              }}
              onMouseOver={(e) => (e.currentTarget.style.opacity = '0.9')}
              onMouseOut={(e) => (e.currentTarget.style.opacity = '1')}
            >
              Retry Attestation
            </button>
          </div>
        </section>
      )}

      {/* ── Metadata card ──────────────────────────────────────────────── */}
      <section
        aria-label="Attestation metadata"
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)',
          padding: '0 1.25rem',
        }}
      >
        <dl style={{ margin: 0 }}>
          {/* Merkle Root */}
          <MetaRow label="Merkle Root">
            <code
              aria-label="Merkle root hash"
              style={{
                fontSize: '0.85rem',
                color: 'var(--accent)',
                wordBreak: 'break-all',
                fontFamily: 'monospace',
              }}
            >
              <span className="hash-full" aria-hidden="false">{attestation.merkleRoot}</span>
            </code>
            <CopyButton value={attestation.merkleRoot} label="Merkle root" />
          </MetaRow>

          {/* Stellar TX */}
          <MetaRow label="Stellar TX">
            <code
              aria-label="Stellar transaction hash"
              style={{
                fontSize: '0.85rem',
                color: 'var(--muted)',
                wordBreak: 'break-all',
                fontFamily: 'monospace',
              }}
            >
              {truncate(attestation.stellarTxHash, 10)}
            </code>
            <CopyButton value={attestation.stellarTxHash} label="Stellar transaction hash" />
            <a
              href={`${STELLAR_EXPLORER}${attestation.stellarTxHash}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="View transaction on Stellar Expert (opens in new tab)"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.3rem',
                fontSize: '0.82rem',
                fontWeight: 600,
                color: 'var(--accent)',
              }}
            >
              Explorer
              {/* external link icon */}
              <svg width="11" height="11" viewBox="0 0 11 11" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M4.5 2H2a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V6.5" />
                <path d="M7 1h3v3M10 1 5.5 5.5" />
              </svg>
            </a>
          </MetaRow>

          {/* Timestamp */}
          <MetaRow label="Timestamp">
            <time dateTime={attestation.timestamp} style={{ color: 'var(--text)' }}>
              {formatDate(attestation.timestamp)}
            </time>
          </MetaRow>

          {/* Records */}
          <MetaRow label="Records">
            <span style={{ color: 'var(--text)', fontWeight: 600 }}>
              {attestation.recordCount.toLocaleString()}
            </span>
            <span style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>included revenue entries</span>
          </MetaRow>

          {/* Revenue */}
          <MetaRow label="Total Revenue">
            <span style={{ color: 'var(--text)', fontWeight: 600 }}>
              {attestation.totalRevenue}
            </span>
            <span style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>{attestation.currency}</span>
          </MetaRow>

          {/* ID */}
          <MetaRow label="Attestation ID">
            <code style={{ fontSize: '0.85rem', color: 'var(--muted)', fontFamily: 'monospace' }}>
              {attestation.id}
            </code>
            <CopyButton value={attestation.id} label="Attestation ID" />
          </MetaRow>
        </dl>
      </section>

      {isShareModalOpen && (
        <ProofShareModal 
          isOpen={isShareModalOpen} 
          onClose={() => setIsShareModalOpen(false)} 
          attestationId={attestation.id} 
        />
      )}
    </div>
  )
}

function BackLink() {
  return (
    <Link
      to="/attestations"
      aria-label="Back to attestations list"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.4rem',
        fontSize: '0.9rem',
        color: 'var(--muted)',
      }}
    >
      {/* left arrow */}
      <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M9 2 4 7l5 5" />
      </svg>
      Attestations
    </Link>
  )
}
