import { beforeEach, describe, expect, it } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import {
  INITIAL_TEAM_MEMBERS,
  canChangeRole,
  canRemoveMember,
  teamStore,
  useTeamStore,
  type TeamMember,
} from './teamStore'

describe('teamStore', () => {
  beforeEach(() => {
    localStorage.clear()
    teamStore.reset()
  })

  it('blocks removal and demotion of the last owner', () => {
    const owner = INITIAL_TEAM_MEMBERS[0]
    expect(canRemoveMember(INITIAL_TEAM_MEMBERS, owner.id)).toBe(false)
    expect(canChangeRole(INITIAL_TEAM_MEMBERS, owner.id, 'admin')).toBe(false)
    expect(teamStore.removeMember(owner.id)).toBeNull()
    expect(teamStore.updateMemberRole(owner.id, 'admin')).toBe(false)
  })

  it('allows owner removal when another owner exists', () => {
    const members: TeamMember[] = [
      { ...INITIAL_TEAM_MEMBERS[0] },
      { ...INITIAL_TEAM_MEMBERS[1], id: 'u_owner_2', role: 'owner' },
    ]
    teamStore.setMembers(members)
    expect(canRemoveMember(teamStore.getMembers(), 'u_001')).toBe(true)
    expect(teamStore.removeMember('u_001')?.id).toBe('u_001')
  })

  it('persists bulk removal and restores it', () => {
    const removed = teamStore.removeMembers(['u_002', 'u_003'])
    expect(removed.map((member) => member.id)).toEqual(['u_002', 'u_003'])
    teamStore.restoreMembers(removed)
    expect(teamStore.getMembers().map((member) => member.id)).toEqual(INITIAL_TEAM_MEMBERS.map((member) => member.id))
  })

  it('updates and expires invitations', () => {
    const now = Date.now()
    teamStore.resendInvitation('inv_004', now)
    expect(teamStore.getInvitations().find((invitation) => invitation.id === 'inv_004')).toMatchObject({ status: 'pending' })
    teamStore.revokeInvitation('inv_001')
    expect(teamStore.getInvitations().some((invitation) => invitation.id === 'inv_001')).toBe(false)

    teamStore.refreshInvitations(now + 365 * 24 * 3600000)
    expect(teamStore.getInvitations().every((invitation) => invitation.status === 'expired')).toBe(true)
  })

  it('notifies subscribers', () => {
    const { result } = renderHook(() => useTeamStore())
    act(() => teamStore.updateMemberRole('u_002', 'billing'))
    expect(result.current.members.find((member) => member.id === 'u_002')?.role).toBe('billing')
  })
})
