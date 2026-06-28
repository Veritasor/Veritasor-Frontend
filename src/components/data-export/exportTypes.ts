// ---------------------------------------------------------------------------
// Data export — shared types
// See docs/uiux/data-export-download-ux.md
// ---------------------------------------------------------------------------

export type ExportFormat = 'csv' | 'json' | 'pdf'

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
}

export const FORMAT_META: Record<
  ExportFormat,
  { label: string; extension: string; description: string }
> = {
  csv: {
    label: 'CSV',
    extension: '.csv',
    description: 'Spreadsheet-friendly rows. Best for Excel, Google Sheets.',
  },
  json: {
    label: 'JSON',
    extension: '.json',
    description: 'Structured records with full metadata. Best for developers.',
  },
  pdf: {
    label: 'PDF',
    extension: '.pdf',
    description: 'Formatted report for sharing and audits.',
  },
}

export const SCOPE_META: Record<ExportScope, { label: string }> = {
  all: { label: 'All attestations' },
  'current-filter': { label: 'Current filter' },
  'last-30-days': { label: 'Last 30 days' },
}
