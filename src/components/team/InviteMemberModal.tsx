import { useEffect, useRef, useState } from 'react'
import type { TeamRole } from '../../store/teamStore'

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
export function isValidTeamEmail(email: string): boolean { return EMAIL_REGEX.test(email.trim()) }

export function InviteMemberModal({ onClose, onInvite }: { onClose: () => void; onInvite: (emails: string[], role: TeamRole) => void }) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const [inputValue, setInputValue] = useState('')
  const [emails, setEmails] = useState<string[]>([])
  const [role, setRole] = useState<TeamRole>('member')

  useEffect(() => { dialogRef.current?.focus(); const previous = document.activeElement as HTMLElement | null; const key = (event: KeyboardEvent) => event.key === 'Escape' && onClose(); document.addEventListener('keydown', key); return () => { document.removeEventListener('keydown', key); previous?.focus() } }, [onClose])

  const commit = (raw: string) => {
    const email = raw.trim().replace(/,+$/, '').toLowerCase()
    if (!email) return
    setEmails((current) => current.includes(email) ? current : [...current, email])
    setInputValue('')
  }
  const valid = emails.filter(isValidTeamEmail)
  const pendingEmail = inputValue.trim()
  const canSend = valid.length > 0 || isValidTeamEmail(pendingEmail)

  const submit = () => {
    const result = pendingEmail ? [...emails, pendingEmail].map((email) => email.toLowerCase()).filter(isValidTeamEmail) : valid
    const unique = [...new Set(result)]
    if (unique.length) { onInvite(unique, role); onClose() }
  }

  return <div role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()} style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(2,6,23,.72)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
    <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="invite-modal-title" tabIndex={-1} style={{ width: '100%', maxWidth: 520, maxHeight: '92dvh', overflowY: 'auto', background: 'var(--surface-strong)', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-md)', padding: '1.1rem 1.25rem', display: 'grid', gap: '1rem' }}>
      <h2 id="invite-modal-title" style={{ margin: 0 }}>Invite team members</h2>
      <div>
        <label htmlFor="invite-email-input" style={{ display: 'block', fontWeight: 700, marginBottom: '.4rem' }}>Email addresses</label>
        <input id="invite-email-input" type="email" multiple value={inputValue} onChange={(event) => setInputValue(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ',') { event.preventDefault(); commit(inputValue) } }} onPaste={(event) => { const text = event.clipboardData.getData('text'); if (/[,\n\s]/.test(text)) { event.preventDefault(); text.split(/[,\n\s]+/).forEach(commit) } }} style={{ width: '100%', minHeight: '2.75rem', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', padding: '.65rem' }} placeholder="name@company.com" />
        {emails.length > 0 && <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.35rem', marginTop: '.5rem' }}>{emails.map((email) => <span key={email} style={{ border: '1px solid var(--border)', borderRadius: 999, padding: '.2rem .55rem', fontSize: '.83rem' }}>{email} <button type="button" aria-label={`Remove ${email}`} onClick={() => setEmails((current) => current.filter((item) => item !== email))} style={{ border: 0, background: 'transparent', cursor: 'pointer' }}>×</button></span>)}</div>}
        {(emails.some((email) => !isValidTeamEmail(email)) || (pendingEmail && !isValidTeamEmail(pendingEmail))) && <p role="alert" style={{ color: 'var(--danger)' }}>Enter a valid email address.</p>}
      </div>
      <fieldset style={{ border: 0, margin: 0, padding: 0 }}>
        <legend style={{ fontWeight: 700, marginBottom: '.5rem' }}>Role</legend>
        {(['admin','billing','member'] as TeamRole[]).map((option) => <label key={option} style={{ display: 'flex', gap: '.5rem', alignItems: 'center', marginBottom: '.35rem' }}><input type="radio" name="invite-role" value={option} checked={role === option} onChange={() => setRole(option)} />{option[0].toUpperCase() + option.slice(1)}</label>)}
      </fieldset>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '.6rem' }}>
        <button type="button" onClick={onClose} style={{ minHeight: '2.75rem', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text)', padding: '.55rem 1rem' }}>Cancel</button>
        <button type="button" disabled={!canSend} onClick={submit} style={{ minHeight: '2.75rem', borderRadius: 8, border: 0, background: 'var(--accent)', color: '#04111f', padding: '.55rem 1rem', fontWeight: 700 }}>Send invitation</button>
      </div>
    </div>
  </div>
}
