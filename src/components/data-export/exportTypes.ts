// ---------------------------------------------------------------------------
// Data export — shared types
// See docs/uiux/data-export-download-ux.md
// ---------------------------------------------------------------------------

export type ExportFormat = 'csv' | 'json' | 'parquet' | 'pdf'

/** What slice of data the export covers. */
export type ExportScope = 'all' | 'current-filter' | 'last-30-days'

/**
 * Lifecycle of an export job.
 *  queued     -> accepted, not started
 *  processing -> running, has a progress value
 *  ready      -> file available to download (until expiresAt)
 *  failed     -> generation failed, can be retried
 *  expired    -> file no longer retained, must be regenerated
 */
export type ExportJobStatus =
  | 'queued'
  | 'processing'
  | 'ready'
  | 'failed'
  | 'expired'

export interface ExportJob {
  id: string
  format: ExportFormat
  scope: ExportScope
  status: ExportJobStatus
  /** 0–100, meaningful while status is "processing". */
  progress: number
  /** ISO timestamp the job was requested. */
  createdAt: string
  /** ISO timestamp the file stops being retained (set once "ready"). */
  expiresAt: string | null
  /** Human-readable size once "ready" (e.g. "2.4 MB"). */
  fileSize: string | null
  /** Short error reason when status is "failed". */
  error: string | null
  /** Optional email for async delivery notification. */
  notifyEmail?: string | null
}

export const FORMAT_META: Record<
  ExportFormat,
  { label: string; extension: string; description: string; bestFor: string }
> = {
  csv: {
    label: 'CSV',
    extension: '.csv',
    description: 'Spreadsheet-friendly rows. Best for Excel, Google Sheets.',
    bestFor: 'Excel, Google Sheets, and BI tools',
  },
  json: {
    label: 'JSON',
    extension: '.json',
    description: 'Structured records with full metadata. Best for developers.',
    bestFor: 'Developers and API integrations',
  },
  parquet: {
    label: 'Parquet',
    extension: '.parquet',
    description: 'Columnar storage. Best for analytics pipelines and data warehouses.',
    bestFor: 'Spark, BigQuery, and analytics pipelines',
  },
  pdf: {
    label: 'PDF',
    extension: '.pdf',
    description: 'Formatted report for sharing and audits.',
    bestFor: 'Audit reports and human review',
  },
}

export const FORMAT_SAMPLE: Record<ExportFormat, string> = {
  csv: `id,source,amount,currency,attested_at\n1,stripe,9500.00,USD,2026-07-28T12:00:00Z\n2,paypal,1200.00,EUR,2026-07-28T13:00:00Z`,
  json: `[\n  {\n    "id": 1,\n    "source": "stripe",\n    "amount": 9500.00,\n    "currency": "USD",\n    "attested_at": "2026-07-28T12:00:00Z"\n  }\n]`,
  parquet: `# Binary columnar format — not human-readable.\n# Schema: id INT64, source UTF8, amount DOUBLE,\n#         currency UTF8, attested_at TIMESTAMP`,
  pdf: `Veritasor Attestation Report\n━━━━━━━━━━━━━━━━━━━━━━━━━━━\nPeriod : 2026-07-01 – 2026-07-28\nSources: Stripe, PayPal\nTotal  : $10,700.00 USD`,
}

export const SCOPE_META: Record<ExportScope, { label: string }> = {
  all: { label: 'All attestations' },
  'current-filter': { label: 'Current filter' },
  'last-30-days': { label: 'Last 30 days' },
}
