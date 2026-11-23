import { useState } from 'react'
import { useToast } from '../ToastContext'
import { teamStore, useTeamStore, type TeamMember, type TeamRole } from '../../store/teamStore'
import { BulkActionToolbar } from './BulkActionToolbar'
import { InviteMemberModal } from './InviteMemberModal'
import { PendingInvitationsTable } from './PendingInvitationsTable'
import { PermissionConflictWarning, getRoleConflicts, type RoleConflict } from './PermissionConflictWarning'
import { RoleChip } from './RoleChip'

const labels: Record<TeamRole, string> = { owner: 'Owner', admin: 'Admin', billing: 'Billing', member: 'Member' }

export function TeamPanel() {
  const { members } = useTeamStore()
  const { addToast } = useToast()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [showInvite, setShowInvite] = useState(false)
  const [conflicts, setConflicts] = useState<Map<string, RoleConflict & { originalRole: TeamRole }>>(new Map())
  const allSelected = members.length > 0 && selected.size === members.length
  const someSelected = selected.size > 0 && !allSelected

  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(members.map((member) => member.id)))
  const toggle = (id: string) => setSelected((current) => { const next = new Set(current); next.has(id) ? next.delete(id) : next.add(id); return next })

  const removeSelected = () => {
    const removed = teamStore.removeMembers([...selected])
    if (removed.length === 0) addToast('The last owner cannot be removed.', 'error', 6000)
    else addToast(`Removed ${removed.length} member${removed.length === 1 ? '' : 's'} from the workspace.`, 'success', 10000, () => teamStore.restoreMembers(removed), 'Undo')
    setSelected(new Set())
  }

  const changeBulkRole = (role: TeamRole) => {
    const affected = members.filter((member) => selected.has(member.id))
    const undoable: TeamMember[] = []
    affected.forEach((member) => { if (teamStore.updateMemberRole(member.id, role)) undoable.push(member) })
    if (undoable.length) addToast(`Changed ${undoable.length} member role${undoable.length === 1 ? '' : 's'} to ${labels[role]}.`, 'success', 10000, () => undoable.forEach((member) => teamStore.updateMemberRole(member.id, member.role)), 'Undo')
    else addToast('The last owner cannot be demoted.', 'error', 6000)
    setSelected(new Set())
  }

  const resendSelected = () => {
    const pending = members.filter((member) => selected.has(member.id) && member.status === 'pending')
    pending.forEach((member) => {
      teamStore.resendInvitation(`pending-${member.id}`)
      teamStore.addInvitations([member.email], member.role, 'You')
    })
    addToast(`Resent invitations for ${pending.length} member${pending.length === 1 ? '' : 's'}.`, 'success', 6000)
    setSelected(new Set())
  }

  return <div style={{ display: 'grid', gap: '1rem' }}>
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '.75rem' }}>
      <div><h2>Team</h2><p style={{ color: 'var(--muted)' }}>Manage workspace members, roles, and pending invitations.</p></div>
      <button type="button" aria-label="Invite new team members" onClick={() => setShowInvite(true)} style={{ minHeight: '2.75rem', borderRadius: 10, border: 0, background: 'var(--accent)', color: '#04111f', fontWeight: 700, padding: '.6rem 1.1rem', cursor: 'pointer' }}>Invite members</button>
    </div>
    {showInvite && <InviteMemberModal onClose={() => setShowInvite(false)} onInvite={(emails, role) => { teamStore.addInvitations(emails, role); addToast(`Invitation${emails.length === 1 ? '' : 's'} sent to ${emails.length} address${emails.length === 1 ? '' : 'es'}.`, 'success', 6000) }} />}
    {selected.size > 0 && <BulkActionToolbar selectedCount={selected.size} onClear={() => setSelected(new Set())} onChangeRole={changeBulkRole} onResendInvites={resendSelected} onRemove={removeSelected} />}
    <div style={{ overflowX: 'auto' }}>
      <table role="table" aria-label="Team members" style={{ width: '100%', minWidth: 640, borderCollapse: 'collapse', border: '1px solid var(--border)' }}>
        <thead><tr><th style={{ width: 48, padding: '.75rem' }}><input type="checkbox" checked={allSelected} ref={(element) => { if (element) element.indeterminate = someSelected }} onChange={toggleAll} aria-label={allSelected ? 'Deselect all members' : 'Select all members'} /></th><th style={{ textAlign: 'left', padding: '.75rem' }}>Member</th><th>Role</th><th>Status</th><th>Joined</th><th><span className="sr-only">Actions</span></th></tr></thead>
        <tbody>{members.map((member) => <tr key={member.id} className="team-member-row">
          <td style={{ padding: '.75rem' }}><input type="checkbox" checked={selected.has(member.id)} onChange={() => toggle(member.id)} aria-label={`${selected.has(member.id) ? 'Deselect' : 'Select'} ${member.name}`} /></td>
          <td style={{ padding: '.75rem' }}><strong>{member.name}</strong><div style={{ color: 'var(--muted)', fontSize: '.85rem' }}>{member.email}</div></td>
          <td style={{ padding: '.75rem' }}><RoleChip role={member.role} /></td>
          <td>{member.status}</td>
          <td>{new Date(member.joinedAt).toLocaleDateString()}</td>
          <td style={{ textAlign: 'right', padding: '.75rem' }}>
            <select aria-label={`Change role for ${member.name}`} value={member.role} onChange={(event) => {
              const target = event.target.value as TeamRole
              if (!teamStore.updateMemberRole(member.id, target)) { addToast('The last owner cannot be demoted.', 'error', 6000); return }
              const conflict = getRoleConflicts(member.role, target, member.extraPermissions)
              if (conflict) setConflicts((current) => { const next = new Map(current); next.set(member.id, { ...conflict, originalRole: member.role }); return next })
            }} style={{ minHeight: '2.25rem', marginRight: '.4rem' }}>
              {(['owner','admin','billing','member'] as TeamRole[]).map((role) => <option key={role} value={role}>{labels[role]}</option>)}
            </select>
            {member.status === 'pending' && <button type="button" aria-label={`Resend invitation to ${member.name}`} onClick={() => addToast(`Invitation resent to ${member.email}.`, 'success', 6000)}>Resend</button>}
            {member.role !== 'owner' && <button type="button" aria-label={`Remove ${member.name} from workspace`} onClick={() => { const removed = teamStore.removeMember(member.id); if (!removed) addToast('The last owner cannot be removed.', 'error', 6000); else addToast(`Removed ${member.name}.`, 'success', 10000, () => teamStore.restoreMembers([removed]), 'Undo') }} style={{ marginLeft: '.4rem', color: 'var(--danger)' }}>Remove</button>}
          </td>
        </tr>)}</tbody>
      </table>
    </div>
    {members.map((member) => conflicts.get(member.id) && <PermissionConflictWarning key={member.id} conflict={conflicts.get(member.id)!} memberName={member.name} conflictId={`conflict-${member.id}`} onResolve={(action) => {
      const conflict = conflicts.get(member.id)!
      if (action === 'revert') teamStore.updateMember(member.id, { role: conflict.originalRole })
      else if (action === 'keep_extras') teamStore.updateMember(member.id, { role: member.role })
      else if (action === 'strip_extras') teamStore.updateMember(member.id, { role: member.role, extraPermissions: [] })
      else teamStore.updateMember(member.id, { role: member.role, extraPermissions: [] })
      setConflicts((current) => { const next = new Map(current); next.delete(member.id); return next })
    }} onDismiss={() => { const conflict = conflicts.get(member.id); if (conflict) teamStore.updateMember(member.id, { role: conflict.originalRole }); setConflicts((current) => { const next = new Map(current); next.delete(member.id); return next }) }} />)}
    <hr style={{ border: 0, borderTop: '1px solid var(--border)' }} />
    <PendingInvitationsTable />
  </div>
}
