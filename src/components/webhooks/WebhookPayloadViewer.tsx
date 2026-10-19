import { useState, useMemo, useCallback } from 'react'
import JsonTreeViewer from './JsonTreeViewer'

export interface WebhookEventSample {
  id: string
  event: string
  description: string
  payload: Record<string, unknown>
}

export const SAMPLE_WEBHOOK_EVENTS: WebhookEventSample[] = [
  {
    id: 'sample_01',
    event: 'attestation.completed',
    description: 'Emitted when a data attestation proof has been successfully verified on-chain.',
    payload: {
      id: 'evt_att_982347',
      event: 'attestation.completed',
      created_at: '2026-07-28T09:30:00Z',
      data: {
        attestation_id: 'att_01H9Z78X',
        provider: 'Stripe',
        merkle_root: '0x7f3a9b2c8d4e5f6a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4',
        revenue_snapshot: {
          gross_amount_usd: 12450.0,
          currency: 'USD',
          transactions_count: 142,
          period_start: '2026-07-01T00:00:00Z',
          period_end: '2026-07-27T23:59:59Z',
        },
        proof_verified: true,
        block_number: 19823412,
      },
      metadata: {
        environment: 'production',
        apiVersion: 'v1.2',
        retry_count: 0,
      },
    },
  },
  {
    id: 'sample_02',
    event: 'source.connected',
    description: 'Triggered when a new financial or revenue data source integration is linked.',
    payload: {
      id: 'evt_src_449102',
      event: 'source.connected',
      created_at: '2026-07-28T08:00:00Z',
      data: {
        source_id: 'src_stripe_live_01',
        integration_type: 'Stripe Connect',
        account_name: 'Acme Payments Inc.',
        status: 'active',
        scopes: ['read:charges', 'read:transfers', 'read:balance'],
        created_by: 'joel@example.com',
      },
      metadata: {
        environment: 'production',
        apiVersion: 'v1.2',
      },
    },
  },
  {
    id: 'sample_03',
    event: 'attestation.failed',
    description: 'Triggered when an attestation run encounters an error or verification timeout.',
    payload: {
      id: 'evt_att_err_11204',
      event: 'attestation.failed',
      created_at: '2026-07-27T18:45:00Z',
      data: {
        attestation_id: 'att_01H9Y41Z',
        provider: 'Shopify',
        error_code: 'PROOF_VERIFICATION_TIMEOUT',
        error_message: 'Verification node failed to reach quorum within 30000ms',
        attempts: 3,
        recoverable: true,
      },
      metadata: {
        environment: 'production',
        apiVersion: 'v1.2',
      },
    },
  },
]

export default function WebhookPayloadViewer() {
  const [selectedEventId, setSelectedEventId] = useState<string>(SAMPLE_WEBHOOK_EVENTS[0].id)
  const [copiedAll, setCopiedAll] = useState<boolean>(false)
  const [expandedDepth, setExpandedDepth] = useState<number>(2)

  const activeSample = useMemo(() => {
    return SAMPLE_WEBHOOK_EVENTS.find((s) => s.id === selectedEventId) || SAMPLE_WEBHOOK_EVENTS[0]
  }, [selectedEventId])

  const handleCopyFullPayload = useCallback(() => {
    navigator.clipboard.writeText(JSON.stringify(activeSample.payload, null, 2))
    setCopiedAll(true)
    setTimeout(() => setCopiedAll(false), 2000)
  }, [activeSample])

  const downloadFilename = `${activeSample.event.replace(/\./g, '_')}_payload.json`
  const jsonBlobUrl = useMemo(() => {
    const jsonString = JSON.stringify(activeSample.payload, null, 2)
    return `data:application/json;charset=utf-8,${encodeURIComponent(jsonString)}`
  }, [activeSample.payload])

  return (
    <div
      className="webhook-payload-viewer-container"
      aria-label="Webhook payload sample viewer"
      style={{
        display: 'grid',
        gap: '1rem',
        padding: '1.25rem',
        borderRadius: 8,
        border: '1px solid var(--border)',
        background: 'var(--surface)',
      }}
    >
      {/* Header controls */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '1rem',
          flexWrap: 'wrap',
        }}
      >
        <div>
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>
            Webhook Payload Viewer
          </h3>
          <p style={{ margin: '0.25rem 0 0', color: 'var(--muted)', fontSize: '0.875rem' }}>
            Inspect event JSON samples, copy nodes, and download raw payload files.
          </p>
        </div>

        {/* Action affordances */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={handleCopyFullPayload}
            aria-label={`Copy full payload for ${activeSample.event}`}
            style={{
              padding: '0.45rem 0.85rem',
              borderRadius: 6,
              border: '1px solid var(--border)',
              background: 'var(--surface-soft)',
              color: copiedAll ? 'var(--success)' : 'var(--text)',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              minHeight: 38,
            }}
          >
            {copiedAll ? '✓ Copied full JSON' : '📋 Copy full JSON'}
          </button>

          <a
            href={jsonBlobUrl}
            download={downloadFilename}
            aria-label={`Download ${activeSample.event} payload as file`}
            style={{
              padding: '0.45rem 0.85rem',
              borderRadius: 6,
              border: '1px solid var(--accent)',
              background: 'var(--accent)',
              color: '#04111f',
              fontSize: '0.85rem',
              fontWeight: 700,
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              minHeight: 38,
            }}
          >
            ⬇ Download JSON
          </a>
        </div>
      </div>

      {/* Selector & depth toggle */}
      <div
        style={{
          display: 'flex',
          gap: '1rem',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          background: 'var(--surface-soft)',
          padding: '0.75rem 1rem',
          borderRadius: 6,
          border: '1px solid var(--border)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flex: 1, minWidth: 260 }}>
          <label
            htmlFor="webhook-event-select"
            style={{ fontSize: '0.875rem', fontWeight: 600, whiteSpace: 'nowrap' }}
          >
            Event type:
          </label>
          <select
            id="webhook-event-select"
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(e.target.value)}
            aria-label="Select webhook event sample"
            style={{
              width: '100%',
              padding: '0.4rem 0.6rem',
              borderRadius: 6,
              border: '1px solid var(--border)',
              background: 'var(--surface-strong)',
              color: 'var(--text)',
              fontSize: '0.875rem',
            }}
          >
            {SAMPLE_WEBHOOK_EVENTS.map((sample) => (
              <option key={sample.id} value={sample.id}>
                {sample.event}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Tree depth:</span>
          <button
            type="button"
            onClick={() => setExpandedDepth(1)}
            aria-label="Collapse tree to root level"
            style={{
              padding: '0.25rem 0.5rem',
              fontSize: '0.75rem',
              borderRadius: 4,
              border: '1px solid var(--border)',
              background: expandedDepth === 1 ? 'var(--accent-soft, rgba(56,189,248,0.2))' : 'transparent',
              color: 'var(--text)',
              cursor: 'pointer',
            }}
          >
            Collapse All
          </button>
          <button
            type="button"
            onClick={() => setExpandedDepth(10)}
            aria-label="Expand all tree levels"
            style={{
              padding: '0.25rem 0.5rem',
              fontSize: '0.75rem',
              borderRadius: 4,
              border: '1px solid var(--border)',
              background: expandedDepth === 10 ? 'var(--accent-soft, rgba(56,189,248,0.2))' : 'transparent',
              color: 'var(--text)',
              cursor: 'pointer',
            }}
          >
            Expand All
          </button>
        </div>
      </div>

      {/* Description banner */}
      <div style={{ fontSize: '0.85rem', color: 'var(--muted)', fontStyle: 'italic' }}>
        {activeSample.description}
      </div>

      {/* JSON Tree View */}
      <JsonTreeViewer
        key={`${activeSample.id}-${expandedDepth}`}
        data={activeSample.payload}
        title={`Payload tree for ${activeSample.event}`}
        defaultExpandedDepth={expandedDepth}
      />
    </div>
  )
}
