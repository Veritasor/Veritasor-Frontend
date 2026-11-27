import type { TeamRole } from '../../store/teamStore'

const labels: Record<TeamRole, string> = { owner: 'Owner', admin: 'Admin', billing: 'Billing', member: 'Member' }

export function RoleChip({ role }: { role: TeamRole }) {
  const styles: Record<TeamRole, React.CSSProperties> = {
    owner: { background: 'rgba(139,92,246,.14)', border: '1px solid rgba(139,92,246,.35)', color: '#a78bfa' },
    admin: { background: 'rgba(96,165,250,.14)', border: '1px solid rgba(96,165,250,.35)', color: '#60a5fa' },
    billing: { background: 'rgba(251,191,36,.14)', border: '1px solid rgba(251,191,36,.35)', color: 'var(--warning)' },
    member: { background: 'var(--surface-soft)', border: '1px solid var(--border)', color: 'var(--muted)' },
  }
  return <span aria-label={`Role: ${labels[role]}`} style={{ display: 'inline-flex', alignItems: 'center', padding: '.22rem .6rem', borderRadius: 999, fontWeight: 700, fontSize: '.78rem', whiteSpace: 'nowrap', ...styles[role] }}>{labels[role]}</span>
}
