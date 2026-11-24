import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Context,
  type ReactNode,
} from 'react'

/**
 * Typed workspace descriptor aligned with `.kiro/specs/account-switcher-menu/requirements.md`.
 */
export interface Workspace {
  id: string
  name: string
  avatarUrl?: string
  plan: string
  role: string
  memberCount: number
  displayName?: string
  description?: string
  initials?: string
  region?: string
}

export const WORKSPACE_STORAGE_KEY = 'veritasor:active-workspace'

export const DEFAULT_WORKSPACES: Workspace[] = [
  {
    id: 'acme-corp',
    name: 'Acme Corp',
    initials: 'AC',
    plan: 'business',
    role: 'Owner',
    memberCount: 14,
    region: 'us-east',
  },
  {
    id: 'my-workspace',
    name: 'My Workspace',
    initials: 'MW',
    plan: 'growth',
    role: 'Admin',
    memberCount: 5,
    region: 'us-west',
  },
  {
    id: 'test-org',
    name: 'Test Org',
    initials: 'TO',
    plan: 'starter',
    role: 'Member',
    memberCount: 2,
    region: 'eu-west',
  },
]

export function readStoredWorkspaceId(
  workspaces: readonly Workspace[] = DEFAULT_WORKSPACES,
): string {
  const fallback = workspaces[0]?.id ?? DEFAULT_WORKSPACES[0].id
  if (typeof window === 'undefined') {
    return fallback
  }

  try {
    const stored = window.localStorage.getItem(WORKSPACE_STORAGE_KEY)
    if (stored && workspaces.some((ws) => ws.id === stored)) {
      return stored
    }
  } catch {
    // Ignore storage failures (e.g. private browsing or quota errors).
  }

  return fallback
}

export function persistWorkspaceId(workspaceId: string): void {
  if (typeof window === 'undefined') {
    return
  }

  try {
    window.localStorage.setItem(WORKSPACE_STORAGE_KEY, workspaceId)
  } catch {
    // Ignore storage failures.
  }
}

export type WorkspaceResetListener = (nextWorkspaceId: string, prevWorkspaceId: string) => void

export interface WorkspaceContextValue {
  workspaces: Workspace[]
  activeWorkspaceId: string
  activeWorkspace: Workspace
  /** Monotonically increasing counter incremented on every workspace switch to trigger state resets. */
  switchVersion: number
  switchWorkspace: (workspaceId: string) => void
  addWorkspace: (workspace: Workspace) => void
  /** Register a callback invoked whenever the active workspace changes. Returns an unsubscribe function. */
  onWorkspaceReset: (listener: WorkspaceResetListener) => () => void
}

export const WorkspaceContext: Context<WorkspaceContextValue | undefined> =
  createContext<WorkspaceContextValue | undefined>(undefined)

export interface WorkspaceProviderProps {
  children: ReactNode
  initialWorkspaces?: Workspace[]
  initialWorkspaceId?: string
  onWorkspaceChange?: (workspaceId: string) => void
}

export function WorkspaceProvider({
  children,
  initialWorkspaces = DEFAULT_WORKSPACES,
  initialWorkspaceId,
  onWorkspaceChange,
}: WorkspaceProviderProps) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>(initialWorkspaces)
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string>(() => {
    if (
      initialWorkspaceId &&
      initialWorkspaces.some((ws) => ws.id === initialWorkspaceId)
    ) {
      return initialWorkspaceId
    }
    return readStoredWorkspaceId(initialWorkspaces)
  })
  const [switchVersion, setSwitchVersion] = useState(0)

  const resetListenersRef = useRef<Set<WorkspaceResetListener>>(new Set())
  const onWorkspaceChangeRef = useRef(onWorkspaceChange)
  onWorkspaceChangeRef.current = onWorkspaceChange

  useEffect(() => {
    persistWorkspaceId(activeWorkspaceId)
  }, [activeWorkspaceId])

  const activeWorkspace = useMemo<Workspace>(
    () =>
      workspaces.find((ws) => ws.id === activeWorkspaceId) ??
      workspaces[0] ??
      DEFAULT_WORKSPACES[0],
    [workspaces, activeWorkspaceId],
  )

  const switchWorkspace = useCallback(
    (nextWorkspaceId: string) => {
      if (!workspaces.some((ws) => ws.id === nextWorkspaceId)) {
        return
      }
      setActiveWorkspaceId((prevId) => {
        if (prevId === nextWorkspaceId) {
          return prevId
        }
        setSwitchVersion((v) => v + 1)
        for (const listener of resetListenersRef.current) {
          listener(nextWorkspaceId, prevId)
        }
        onWorkspaceChangeRef.current?.(nextWorkspaceId)
        return nextWorkspaceId
      })
    },
    [workspaces],
  )

  const addWorkspace = useCallback((workspace: Workspace) => {
    setWorkspaces((prev) => {
      if (prev.some((ws) => ws.id === workspace.id)) {
        return prev
      }
      return [...prev, workspace]
    })
  }, [])

  const onWorkspaceReset = useCallback((listener: WorkspaceResetListener) => {
    resetListenersRef.current.add(listener)
    return () => {
      resetListenersRef.current.delete(listener)
    }
  }, [])

  const value = useMemo<WorkspaceContextValue>(
    () => ({
      workspaces,
      activeWorkspaceId,
      activeWorkspace,
      switchVersion,
      switchWorkspace,
      addWorkspace,
      onWorkspaceReset,
    }),
    [
      workspaces,
      activeWorkspaceId,
      activeWorkspace,
      switchVersion,
      switchWorkspace,
      addWorkspace,
      onWorkspaceReset,
    ],
  )

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  )
}

export function useWorkspace(): WorkspaceContextValue {
  const context = useContext(WorkspaceContext)

  if (!context) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider')
  }

  return context
}

export function useOptionalWorkspace(): WorkspaceContextValue | undefined {
  return useContext(WorkspaceContext)
}
