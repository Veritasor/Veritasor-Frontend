import { useCallback } from 'react'
import { useIntl } from 'react-intl'
import { type AuditLogEntry } from '../../components/audit-log/AuditLogTimeline'
import { auditLogApi } from '../../services/auditLogApi'

const MOCK_AUDIT_ENTRIES: AuditLogEntry[] = [
  {
    id: "1",
    timestamp: "2026-07-28T08:12:00Z",
    event: "Attestation completed",
    details: "Merkle root: 0x7f...3a",
  },
  {
    id: "2",
    timestamp: "2026-07-28T08:14:00Z",
    event: "Attestation completed",
    details: "Merkle root: 0x7f...3a",
  },
  {
    id: "3",
    timestamp: "2026-07-28T08:15:00Z",
    event: "Attestation completed",
    details: "Merkle root: 0x7f...3a",
  },
  {
    id: "4",
    timestamp: "2026-07-28T09:00:00Z",
    event: "Revenue source connected",
    details: "Provider: Stripe",
  },
  {
    id: "5",
    timestamp: "2026-07-27T14:30:00Z",
    event: "Attestation failed",
    details: "Timeout after 30s",
  },
  {
    id: "6",
    timestamp: "2026-07-27T14:31:00Z",
    event: "Attestation failed",
    details: "Timeout after 30s",
  },
  {
    id: "7",
    timestamp: "2026-07-27T14:32:00Z",
    event: "Attestation failed",
    details: "Timeout after 30s",
  },
  {
    id: "8",
    timestamp: "2026-07-27T14:33:00Z",
    event: "Attestation failed",
    details: "Timeout after 30s",
  },
  {
    id: "9",
    timestamp: "2026-07-26T10:00:00Z",
    event: "API key rotated",
  },
];

function AuditLogPanel() {
  const intl = useIntl();
  const handleFetchDetail = useCallback(async (id: string) => {
    return auditLogApi.getAuditEventDetail(id);
  }, []);
  return (
    <div>
      <h2>{intl.formatMessage({ id: 'auditLog.filters.title', defaultMessage: 'Audit Log' })}</h2>
      <p style={{ color: "var(--muted)" }}>
        Recent activity for this workspace. Click any event to view full
        request/response detail. In compact density mode, identical consecutive
        events are grouped by day and collapsed into summary badges.
      </p>
      <div style={{ marginTop: "1.5rem", maxWidth: 800 }}>
        <AuditLogTimeline
          entries={MOCK_AUDIT_ENTRIES}
          onFetchDetail={handleFetchDetail}
        />
      </div>
    </div>
  );
}

export default AuditLogPanel
