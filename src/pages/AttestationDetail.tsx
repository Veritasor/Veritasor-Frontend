import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'

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

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    await navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={copied ? `${label} copied` : `Copy ${label}`}
      title={copied ? 'Copied!' : 'Copy to clipboard'}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.3rem',
        padding: '0.25rem 0.6rem',
        fontSize: '0.78rem',
        fontWeight: 600,
        border: '1px solid var(--border)',
        borderRadius: '0.5rem',
        background: copied ? 'var(--success-soft)' : 'rgba(148,163,184,0.08)',
        color: copied ? 'var(--success)' : 'var(--muted)',
        cursor: 'pointer',
        transition: 'background 160ms, color 160ms',
        flexShrink: 0,
      }}
    >
      {copied ? (
        <>
          {/* checkmark */}
          <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="2,6 5,9 10,3" />
          </svg>
          Copied
        </>
      ) : (
        <>
          {/* clipboard */}
          <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="4" y="1" width="7" height="9" rx="1" />
            <path d="M4 3H2a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-1" />
          </svg>
          Copy
        </>
      )}
    </button>
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
        <BackLink />
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
      <BackLink />

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
      </header>

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
