import {
  createContext,
  createElement,
  useContext,
  useMemo,
  type ReactNode,
} from 'react'
import type { SaveStatus } from '../../hooks/useDirtyForm'

export type TabId =
  | 'profile'
  | 'notifications'
  | 'appearance'
  | 'team'
  | 'integrations'
  | 'webhooks'
  | 'api-keys'
  | 'tokens'
  | 'billing'
  | 'security'
  | 'audit-log'
  | 'a11y-audit'

export type DirtyTabEntry = {
  isDirty: boolean
  saveStatus: SaveStatus
  lastSavedAt: Date | null
  save: () => Promise<void>
  reset: () => void
}

export interface DirtyRegistryCtx {
  entries: Map<TabId, DirtyTabEntry>
  register: (tab: TabId, entry: DirtyTabEntry) => void
  unregister: (tab: TabId) => void
}

const DirtyRegistryContext = createContext<DirtyRegistryCtx | null>(null)

export function DirtyRegistryProvider({
  value,
  children,
}: {
  value: DirtyRegistryCtx
  children: ReactNode
}) {
  return createElement(DirtyRegistryContext.Provider, { value }, children)
}

export function useDirtyRegistry() {
  const ctx = useContext(DirtyRegistryContext)
  if (!ctx) throw new Error('useDirtyRegistry must be used within Settings')
  return ctx
}

export function usePageDirtyState(registry: DirtyRegistryCtx): {
  anyDirty: boolean
  dirtyTabs: TabId[]
  aggregateStatus: SaveStatus
  lastSavedAt: Date | null
  saveAll: () => Promise<void>
  discardAll: () => void
} {
  const { entries } = registry
  return useMemo(() => {
    let anyDirty = false
    const dirtyTabs: TabId[] = []
    let aggregateStatus: SaveStatus = 'idle'
    let lastSavedAt: Date | null = null

    for (const [tab, entry] of entries) {
      if (entry.isDirty) {
        anyDirty = true
        dirtyTabs.push(tab)
      }
      if (
        entry.saveStatus === 'saving' ||
        (entry.saveStatus === 'dirty' && aggregateStatus !== 'saving') ||
        (entry.saveStatus === 'saved' && aggregateStatus === 'idle')
      ) {
        aggregateStatus = entry.saveStatus
      }
      if (
        entry.lastSavedAt &&
        (!lastSavedAt || entry.lastSavedAt > lastSavedAt)
      ) {
        lastSavedAt = entry.lastSavedAt
      }
    }

    return {
      anyDirty,
      dirtyTabs,
      aggregateStatus: anyDirty
        ? aggregateStatus === 'saving'
          ? 'saving'
          : 'dirty'
        : aggregateStatus,
      lastSavedAt,
      saveAll: async () => {
        const results = Array.from(entries.values())
          .filter((entry) => entry.isDirty)
          .map((entry) => entry.save())
        await Promise.all(results)
      },
      discardAll: () => {
        for (const entry of entries.values()) entry.reset()
      },
    }
  }, [entries])
}
