import { describe, expect, it } from 'vitest'
import { getRoleConflicts } from './PermissionConflictWarning'
import { isValidTeamEmail } from './InviteMemberModal'
import { formatExpiryCountdown } from './PendingInvitationsTable'

describe('team role conflicts', () => {
  it('returns conflicts for owner, admin, billing, and member transitions', () => {
    expect(getRoleConflicts('billing', 'admin')).not.toBeNull()
    expect(getRoleConflicts('admin', 'billing')).not.toBeNull()
    expect(getRoleConflicts('admin', 'member', ['sources.write'])).not.toBeNull()
    expect(getRoleConflicts('member', 'owner')).not.toBeNull()
  })

  it('does not report a conflict for compatible transitions', () => {
    expect(getRoleConflicts('member', 'admin')).toBeNull()
    expect(getRoleConflicts('owner', 'owner')).toBeNull()
  })
})

describe('team email and countdown helpers', () => {
  it('validates email addresses', () => {
    expect(isValidTeamEmail('person@company.com')).toBe(true)
    expect(isValidTeamEmail('not-an-email')).toBe(false)
    expect(isValidTeamEmail('person @company.com')).toBe(false)
  })

  it('formats expiry countdowns with injected clock values', () => {
    const now = Date.UTC(2026, 0, 1)
    expect(formatExpiryCountdown(new Date(now - 3600000).toISOString(), now).expired).toBe(true)
    expect(formatExpiryCountdown(new Date(now + 3600000).toISOString(), now).urgent).toBe(true)
  })
})
