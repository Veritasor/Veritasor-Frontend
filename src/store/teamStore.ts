import { useSyncExternalStore } from 'react'
import { newId } from '../utils/secureRandom'

export type TeamRole = 'owner' | 'admin' | 'billing' | 'member'
export type MemberStatus = 'active' | 'pending' | 'disabled'
export type InviteStatus = 'pending' | 'expired'

export interface TeamMember {
  id: string
  name: string
  email: string
  role: TeamRole
  status: MemberStatus
  joinedAt: string
  avatarInitials: string
  extraPermissions?: string[]
}

export interface PendingInvitation {
  id: string
  email: string
  role: TeamRole
  invitedBy: string
  invitedAt: string
  expiresAt: string
  status: InviteStatus
}

export const INITIAL_TEAM_MEMBERS: TeamMember[] = [
  { id: 'u_001', name: 'Joel Agboola', email: 'joel@example.com', role: 'owner', status: 'active', joinedAt: '2025-09-12', avatarInitials: 'JA' },
  { id: 'u_002', name: 'Sarah Chen', email: 'sarah@example.com', role: 'admin', status: 'active', joinedAt: '2025-10-01', avatarInitials: 'SC' },
  { id: 'u_003', name: 'Marcus Johnson', email: 'marcus@example.com', role: 'billing', status: 'active', joinedAt: '2025-11-20', avatarInitials: 'MJ', extraPermissions: ['team.manage'] },
  { id: 'u_004', name: 'Priya Patel', email: 'priya@example.com', role: 'member', status: 'pending', joinedAt: '2026-07-25', avatarInitials: 'PP' },
  { id: 'u_005', name: 'Tomás Rivera', email: 'tomas@example.com', role: 'member', status: 'active', joinedAt: '2026-01-08', avatarInitials: 'TR', extraPermissions: ['attestations.write', 'sources.write'] },
  { id: 'u_006', name: 'Hannah Schmidt', email: 'hannah@example.com', role: 'member', status: 'disabled', joinedAt: '2025-12-03', avatarInitials: 'HS' },
  { id: 'u_007', name: 'David Okonkwo', email: 'david@example.com', role: 'member', status: 'active', joinedAt: '2026-03-14', avatarInitials: 'DO' },
]

export const INITIAL_INVITATIONS: PendingInvitation[] = (() => {
  const now = Date.now()
  const hour = 3600000
  const day = 24 * hour
  return [
    { id: 'inv_001', email: 'alex.wong@example.com', role: 'admin', invitedBy: 'Joel Agboola', invitedAt: new Date(now - 2 * day).toISOString(), expiresAt: new Date(now + 5 * day).toISOString(), status: 'pending' },
    { id: 'inv_002', email: 'emma.davis@example.com', role: 'member', invitedBy: 'Sarah Chen', invitedAt: new Date(now - 18 * hour).toISOString(), expiresAt: new Date(now + 2 * day).toISOString(), status: 'pending' },
    { id: 'inv_003', email: 'james.liu@example.com', role: 'billing', invitedBy: 'Joel Agboola', invitedAt: new Date(now - 6 * day).toISOString(), expiresAt: new Date(now + 18 * hour).toISOString(), status: 'pending' },
    { id: 'inv_004', email: 'sofia.rossi@example.com', role: 'member', invitedBy: 'Marcus Johnson', invitedAt: new Date(now - 10 * day).toISOString(), expiresAt: new Date(now - 2 * hour).toISOString(), status: 'expired' },
    { id: 'inv_005', email: 'daniel.kim@example.com', role: 'member', invitedBy: 'Sarah Chen', invitedAt: new Date(now - 14 * day).toISOString(), expiresAt: new Date(now - 5 * day).toISOString(), status: 'expired' },
  ]
})()

const MEMBERS_KEY = 'veritasor-team-members-v1'
const INVITES_KEY = 'veritasor-team-invitations-v1'

interface TeamState { members: TeamMember[]; invitations: PendingInvitation[] }

function readArray<T>(key: string, fallback: T[]): T[] {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed as T[] : fallback
  } catch {
    return fallback
  }
}

let state: TeamState = {
  members: readArray(MEMBERS_KEY, INITIAL_TEAM_MEMBERS),
  invitations: readArray(INVITES_KEY, INITIAL_INVITATIONS),
}
const listeners = new Set<() => void>()

function persist(next: TeamState) {
  try {
    localStorage.setItem(MEMBERS_KEY, JSON.stringify(next.members))
    localStorage.setItem(INVITES_KEY, JSON.stringify(next.invitations))
  } catch {
    // Persistence is best-effort in restricted browser contexts.
  }
}

function setState(next: TeamState) {
  state = next
  persist(next)
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function canRemoveMember(members: TeamMember[], id: string): boolean {
  const member = members.find((item) => item.id === id)
  if (!member) return false
  if (member.role !== 'owner') return true
  return members.filter((item) => item.role === 'owner').length > 1
}

export function canChangeRole(members: TeamMember[], id: string, targetRole: TeamRole): boolean {
  const member = members.find((item) => item.id === id)
  if (!member || member.role !== 'owner' || targetRole === 'owner') return true
  return members.filter((item) => item.role === 'owner').length > 1
}

export const teamStore = {
  getSnapshot: () => state,
  getServerSnapshot: () => ({ members: INITIAL_TEAM_MEMBERS, invitations: INITIAL_INVITATIONS }),
  subscribe,
  getMembers: () => state.members,
  getInvitations: () => state.invitations,
  reset: () => setState({ members: INITIAL_TEAM_MEMBERS, invitations: INITIAL_INVITATIONS }),
  setMembers: (members: TeamMember[]) => setState({ ...state, members }),
  addInvitations: (emails: string[], role: TeamRole, invitedBy = 'You', now = Date.now()) => {
    const invites: PendingInvitation[] = emails.map((email) => ({
      id: newId('inv-'),
      email,
      role,
      invitedBy,
      invitedAt: new Date(now).toISOString(),
      expiresAt: new Date(now + 7 * 24 * 3600000).toISOString(),
      status: 'pending',
    }))
    setState({ ...state, invitations: [...invites, ...state.invitations] })
  },
  updateMemberRole: (id: string, role: TeamRole): boolean => {
    if (!canChangeRole(state.members, id, role)) return false
    setState({ ...state, members: state.members.map((member) => member.id === id ? { ...member, role } : member) })
    return true
  },
  updateMember: (id: string, patch: Partial<TeamMember>): boolean => {
    if (patch.role && !canChangeRole(state.members, id, patch.role)) return false
    setState({ ...state, members: state.members.map((member) => member.id === id ? { ...member, ...patch } : member) })
    return true
  },
  removeMember: (id: string): TeamMember | null => {
    const member = state.members.find((item) => item.id === id)
    if (!member || !canRemoveMember(state.members, id)) return null
    setState({ ...state, members: state.members.filter((item) => item.id !== id) })
    return member
  },
  removeMembers: (ids: string[]): TeamMember[] => {
    const removed = state.members.filter((member) => ids.includes(member.id) && canRemoveMember(state.members, member.id))
    setState({ ...state, members: state.members.filter((member) => !removed.some((item) => item.id === member.id)) })
    return removed
  },
  restoreMembers: (members: TeamMember[]) => {
    const ids = new Set(members.map((member) => member.id))
    setState({ ...state, members: [...state.members.filter((member) => !ids.has(member.id)), ...members] })
  },
  resendInvitation: (id: string, now = Date.now()) => {
    setState({
      ...state,
      invitations: state.invitations.map((invitation) => invitation.id === id
        ? { ...invitation, status: 'pending', invitedAt: new Date(now).toISOString(), expiresAt: new Date(now + 7 * 24 * 3600000).toISOString() }
        : invitation),
    })
  },
  revokeInvitation: (id: string) => {
    setState({ ...state, invitations: state.invitations.filter((invitation) => invitation.id !== id) })
  },
  refreshInvitations: (now = Date.now()) => {
    setState({
      ...state,
      invitations: state.invitations.map((invitation) =>
        invitation.status === 'pending' && new Date(invitation.expiresAt).getTime() <= now
          ? { ...invitation, status: 'expired' }
          : invitation),
    })
  },
}

export function useTeamStore(): TeamState {
  return useSyncExternalStore(teamStore.subscribe, teamStore.getSnapshot, teamStore.getServerSnapshot)
}
