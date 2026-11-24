// ─── Scope definitions (shared between CreateApiKeyModal and EditScopesModal) ─────────────────────────────────────────────────

export interface ScopeItem {
  id: string
  label: string
  description: string
}

export interface ScopeGroup {
  id: string
  label: string
  description: string
  scopes: ScopeItem[]
}

export const SCOPE_GROUPS: ScopeGroup[] = [
  {
    id: 'attestations',
    label: 'Attestations',
    description: 'Create and manage revenue attestations',
    scopes: [
      { id: 'read:attestations', label: 'Read attestations', description: 'View attestation history and on-chain proof details.' },
      { id: 'write:attestations', label: 'Write attestations', description: 'Trigger attestations for revenue reports.' },
    ],
  },
  {
    id: 'sources',
    label: 'Revenue Sources',
    description: 'Manage connected revenue data sources',
    scopes: [
      { id: 'read:sources', label: 'Read revenue sources', description: 'View connected revenue source metadata.' },
      { id: 'write:sources', label: 'Write revenue sources', description: 'Connect and configure new revenue sources.' },
    ],
  },
  {
    id: 'webhooks',
    label: 'Webhooks',
    description: 'Manage webhook endpoints and deliveries',
    scopes: [
      { id: 'read:webhooks', label: 'Read webhooks', description: 'View webhook configurations and delivery history.' },
      { id: 'write:webhooks', label: 'Write webhooks', description: 'Create and modify webhook endpoints.' },
    ],
  },
  {
    id: 'keys',
    label: 'API Keys',
    description: 'Manage API key lifecycle',
    scopes: [
      { id: 'read:keys', label: 'Read API keys', description: 'View API key metadata (masked values only).' },
      { id: 'write:keys', label: 'Write API keys', description: 'Create, rotate, and revoke API keys.' },
    ],
  },
]

/** Flat map of every scope id for quick lookup. */
export const ALL_SCOPE_IDS: string[] = SCOPE_GROUPS.flatMap((g) => g.scopes.map((s) => s.id))

export type ScopeId = string

// ─── Scope diff helpers ───────────────────────────────────────────────────────────

/**
 * Permission hierarchy for detecting broadening.
 * Higher index = more privileged.
 */
export const SCOPE_PRIVILEGE_LEVEL: Record<string, number> = {
  'read:attestations': 1,
  'write:attestations': 2,
  'read:sources': 1,
  'write:sources': 2,
  'read:webhooks': 1,
  'write:webhooks': 2,
  'read:keys': 1,
  'write:keys': 2,
}

/**
 * Determine if a scope change is broadening, narrowing, or neutral.
 * @param originalScopes - Current scopes on the key
 * @param newScopes - Proposed new scopes
 * @returns 'broaden' | 'narrow' | 'neutral'
 */
export function getScopeChangeType(originalScopes: string[], newScopes: string[]): 'broaden' | 'narrow' | 'neutral' {
  const originalSet = new Set(originalScopes)
  const newSet = new Set(newScopes)

  // Find added and removed scopes
  const added = newScopes.filter((s) => !originalSet.has(s))
  const removed = originalScopes.filter((s) => !newSet.has(s))

  // No change
  if (added.length === 0 && removed.length === 0) return 'neutral'

  // Check if any added scope is more privileged than a removed scope
  for (const addedScope of added) {
    for (const removedScope of removed) {
      const addedLevel = SCOPE_PRIVILEGE_LEVEL[addedScope] ?? 0
      const removedLevel = SCOPE_PRIVILEGE_LEVEL[removedScope] ?? 0
      if (addedLevel > removedLevel) return 'broaden'
    }
  }

  // Check if any removed scope is more privileged than an added scope
  for (const removedScope of removed) {
    for (const addedScope of added) {
      const removedLevel = SCOPE_PRIVILEGE_LEVEL[removedScope] ?? 0
      const addedLevel = SCOPE_PRIVILEGE_LEVEL[addedScope] ?? 0
      if (removedLevel > addedLevel) return 'narrow'
    }
  }

  // If only adding scopes (no removals), it's broadening
  if (added.length > 0 && removed.length === 0) return 'broaden'

  // If only removing scopes (no additions), it's narrowing
  if (removed.length > 0 && added.length === 0) return 'narrow'

  // Mixed changes but no privilege level change - treat as neutral
  return 'neutral'
}

/**
 * Get human-readable labels for scope IDs.
 */
export function getScopeLabels(scopeIds: string[]): string[] {
  const flat = SCOPE_GROUPS.flatMap((g) => g.scopes)
  return scopeIds.map((id) => flat.find((s) => s.id === id)?.label ?? id).filter(Boolean)
}

/**
 * Returns the tri-state for a group: 'all' | 'some' | 'none'
 */
export function groupTriState(group: ScopeGroup, selected: ScopeId[]): 'all' | 'some' | 'none' {
  const ids = group.scopes.map((s) => s.id)
  const checked = ids.filter((id) => selected.includes(id)).length
  if (checked === 0) return 'none'
  if (checked === ids.length) return 'all'
  return 'some'
}
