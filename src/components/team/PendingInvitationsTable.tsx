import { useEffect, useState } from 'react'
import { teamStore, useTeamStore } from '../../store/teamStore'
import { RoleChip } from './RoleChip'

const HOUR = 3600000
const DAY = 24 * HOUR

export function formatExpiryCountdown(expiresAt: string, nowTs: number) {
  const diff = new Date(expiresAt).getTime() - nowTs
  if (diff <= 0) {
    const daysAgo = Math.floor(Math.abs(diff) / DAY)
    const hoursAgo = Math.floor(Math.abs(diff) / HOUR)
    return { label: daysAgo > 0 ? `Expired ${daysAgo} day${daysAgo === 1 ? '' : 's'} ago` : hoursAgo > 0 ? `Expired ${hoursAgo} hr${hoursAgo === 1 ? '' : 's'} ago` : 'Expired moments ago', urgent: false, expired: true, icon: '⏱' }
  }
  const days = Math.floor(diff / DAY)
  const hours = Math.floor((diff % DAY) / HOUR)
  return { label: diff < DAY ? `Expires in ${hours} hr${hours === 1 ? '' : 's'}` : `Expires in ${days} day${days === 1 ? '' : 's'} ${hours} hr${hours === 1 ? '' : 's'}`, urgent: diff < 3 * DAY, expired: false, icon: diff < DAY ? '⏰' : '⏳' }
}

export function PendingInvitationsTable({ now = () => Date.now(), intervalMs = 60000 }: { now?: () => number; intervalMs?: number }) {
  const { invitations } = useTeamStore()
  const [expiredOnly, setExpiredOnly] = useState(false)
  const [nowTs, setNowTs] = useState(now())
  useEffect(() => { const id = setInterval(() => { const value = now(); setNowTs(value); teamStore.refreshInvitations(value) }, intervalMs); return () => clearInterval(id) }, [now, intervalMs])
  const visible = invitations.filter((invitation) => !expiredOnly || invitation.status === 'expired')
  return <section aria-labelledby="pending-invites-heading" style={{ display: 'grid', gap: '1rem' }}>
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
      <div><h3 id="pending-invites-heading" style={{ margin: 0 }}>Pending invitations</h3><p style={{ margin: '.25rem 0 0', color: 'var(--muted)' }}>Outstanding workspace invitations.</p></div>
      <label style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}><input type="checkbox" checked={expiredOnly} onChange={(event) => setExpiredOnly(event.target.checked)} aria-label="Filter to show expired invitations only" />Expired only</label>
    </div>
    <div role="region" aria-label="Pending invitations table" style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', minWidth: 640, borderCollapse: 'collapse', border: '1px solid var(--border)' }}>
        <thead><tr><th style={{ textAlign: 'left', padding: '.75rem' }}>Recipient</th><th>Role</th><th>Invited by</th><th>Expiry</th><th><span className="sr-only">Actions</span></th></tr></thead>
        <tbody>{visible.length === 0 ? <tr><td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--muted)' }}>No invitations.</td></tr> : visible.map((invitation) => {
          const countdown = formatExpiryCountdown(invitation.expiresAt, nowTs)
          const expired = invitation.status === 'expired'
          return <tr key={invitation.id}><td style={{ padding: '.75rem' }}>{invitation.email}</td><td><RoleChip role={invitation.role} /></td><td>{invitation.invitedBy}</td><td><span role="status">{expired ? countdown.label : countdown.label}</span></td><td style={{ textAlign: 'right', padding: '.75rem' }}>
            <button type="button" onClick={() => teamStore.resendInvitation(invitation.id, now())} aria-label={`Resend invitation to ${invitation.email}`}>Resend</button>{' '}
            <button type="button" onClick={() => teamStore.revokeInvitation(invitation.id)} aria-label={`Revoke invitation to ${invitation.email}`}>Revoke</button>
          </td></tr>
        })}</tbody>
      </table>
    </div>
  </section>
}
