import type { TeamRole } from '../../store/teamStore'

const permissions: Record<TeamRole, string[]> = {
  owner: ['*'], admin: ['team.manage','billing.manage','sources.read','sources.write','attestations.read','attestations.write','settings.read','settings.write','api_keys.manage'],
  billing: ['billing.manage','billing.read','invoices.read','payment_methods.manage'], member: ['sources.read','attestations.read','settings.read'],
}
export interface RoleConflict {
  redundant: string[]; supersededBy: string; resolutionPaths: { label: string; action: string }[]
}

export function getRoleConflicts(currentRole: TeamRole, targetRole: TeamRole, extraPermissions: string[] = []): RoleConflict | null {
  const current = new Set(permissions[currentRole])
  const target = new Set(permissions[targetRole])
  const extras = new Set(extraPermissions)
  if (targetRole === 'owner' && currentRole !== 'owner') {
    return { redundant: [...new Set([...current, ...extras])].filter((permission) => permission !== '*'), supersededBy: 'Owner', resolutionPaths: [
      { label: `Keep as Owner (supersedes ${currentRole})`, action: 'accept' }, { label: `Revert to ${currentRole}`, action: 'revert' },
    ]}
  }
  if (targetRole === 'admin' && currentRole === 'billing') return { redundant: ['billing.manage','billing.read','invoices.read','payment_methods.manage'], supersededBy: 'Admin', resolutionPaths: [{ label: 'Promote to Admin', action: 'accept' }, { label: 'Keep as Billing only', action: 'revert' }] }
  if (targetRole === 'billing' && currentRole === 'admin') return { redundant: ['team.manage','sources.write','attestations.write','settings.write','api_keys.manage'], supersededBy: 'Billing role downgrade', resolutionPaths: [{ label: 'Downgrade to Billing', action: 'accept' }, { label: 'Keep as Admin', action: 'revert' }] }
  if (targetRole === 'member') {
    const redundant = [...new Set([...extras, ...[...current].filter((permission) => !target.has(permission))])]
    if (redundant.length) return { redundant, supersededBy: 'Member role', resolutionPaths: [{ label: 'Demote to Member', action: 'accept' }, { label: `Keep as ${currentRole}`, action: 'revert' }, { label: 'Demote but preserve extra permissions', action: 'keep_extras' }] }
  }
  return null
}

export function PermissionConflictWarning({ conflict, memberName, onResolve, onDismiss, conflictId }: { conflict: RoleConflict; memberName: string; onResolve: (action: string) => void; onDismiss: () => void; conflictId: string }) {
  return <div role="alert" aria-live="assertive" id={conflictId} style={{ marginTop: '.75rem', padding: '.9rem 1rem', borderRadius: 'var(--radius-sm)', background: 'var(--warning-soft)', border: '1px solid rgba(251,191,36,.4)', display: 'grid', gap: '.75rem' }}>
    <strong>Permission conflict detected for {memberName}</strong>
    <p style={{ margin: 0, color: 'var(--muted)' }}>{conflict.supersededBy} supersedes or overlaps with existing grants.</p>
    <ul aria-label="Redundant permissions">{conflict.redundant.map((permission) => <li key={permission}>{permission}</li>)}</ul>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.5rem' }}>{conflict.resolutionPaths.map((path) => <button type="button" key={path.action} onClick={() => onResolve(path.action)} style={{ minHeight: '2.5rem', borderRadius: 8, border: '1px solid rgba(251,191,36,.35)', padding: '.45rem .9rem', fontWeight: 700, cursor: 'pointer' }}>{path.label}</button>)}</div>
    <button type="button" onClick={onDismiss} aria-label="Dismiss permission conflict warning">Dismiss</button>
  </div>
}
