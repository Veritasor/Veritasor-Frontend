import type { TeamRole } from '../../store/teamStore'

interface Props {
  selectedCount: number
  onClear: () => void
  onChangeRole: (role: TeamRole) => void
  onResendInvites: () => void
  onRemove: () => void
}

export function BulkActionToolbar({ selectedCount, onClear, onChangeRole, onResendInvites, onRemove }: Props) {
  const buttonStyle: React.CSSProperties = { minHeight: '2.75rem', padding: '.5rem .95rem', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', cursor: 'pointer', fontWeight: 700 }
  return (
    <div role="region" aria-label={`Bulk actions for ${selectedCount} selected member${selectedCount === 1 ? '' : 's'}`} className="bulk-action-toolbar" style={{ position: 'sticky', top: '3.5rem', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', padding: '.85rem 1.1rem', borderRadius: 'var(--radius-sm)', background: 'var(--surface-strong)', border: '1px solid rgba(94,234,212,.3)' }}>
      <strong>{selectedCount} {selectedCount === 1 ? 'member' : 'members'} selected</strong>
      <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', flexWrap: 'wrap' }}>
        <label htmlFor="bulk-role" className="sr-only">Change role</label>
        <select id="bulk-role" aria-label="Change role for selected members" defaultValue="" onChange={(event) => onChangeRole(event.target.value as TeamRole)} style={buttonStyle}>
          <option value="" disabled>Change role…</option>
          <option value="admin">Admin</option>
          <option value="billing">Billing</option>
          <option value="member">Member</option>
        </select>
        <button type="button" onClick={onResendInvites} aria-label={`Resend invitations to ${selectedCount} selected members`} style={buttonStyle}>Resend invite{selectedCount > 1 ? 's' : ''}</button>
        <button type="button" onClick={onRemove} aria-label={`Remove ${selectedCount} selected members`} style={{ ...buttonStyle, color: 'var(--danger)', borderColor: 'rgba(251,113,133,.35)' }}>Remove</button>
        <button type="button" onClick={onClear} aria-label="Clear selection" style={{ ...buttonStyle, minWidth: '2.75rem', padding: '.5rem' }}>✕</button>
      </div>
    </div>
  )
}
