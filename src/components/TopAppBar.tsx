import { useCallback, useEffect, useRef, useState } from 'react'

export interface TopAppBarProps {
  workspaces?: string[]
  initialWorkspace?: string
  initialEnvironment?: 'testnet' | 'mainnet'
  userName?: string
  userInitials?: string
  onSidebarToggle?: () => void
  sidebarOpen?: boolean
}

const DEFAULT_WORKSPACES = ['Acme Corp', 'My Workspace', 'Test Org']

export default function TopAppBar({
  workspaces = DEFAULT_WORKSPACES,
  initialWorkspace = DEFAULT_WORKSPACES[0],
  initialEnvironment = 'testnet',
  userName = 'Joel Agboola',
  userInitials = 'JA',
  onSidebarToggle,
  sidebarOpen = false,
}: TopAppBarProps) {
  const [workspace, setWorkspace] = useState(initialWorkspace)
  const [workspaceOpen, setWorkspaceOpen] = useState(false)
  const [environment, setEnvironment] = useState<'testnet' | 'mainnet'>(initialEnvironment)
  const [accountOpen, setAccountOpen] = useState(false)

  const workspaceBtnRef = useRef<HTMLButtonElement>(null)
  const workspaceMenuRef = useRef<HTMLUListElement>(null)
  const accountBtnRef = useRef<HTMLButtonElement>(null)
  const accountMenuRef = useRef<HTMLUListElement>(null)

  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      const target = e.target as Node
      // Refs are non-null while component is mounted
      if (
        workspaceOpen &&
        !workspaceBtnRef.current!.contains(target) &&
        !workspaceMenuRef.current!.contains(target)
      ) {
        setWorkspaceOpen(false)
      }
      if (
        accountOpen &&
        !accountBtnRef.current!.contains(target) &&
        !accountMenuRef.current!.contains(target)
      ) {
        setAccountOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [workspaceOpen, accountOpen])

  // Focus first option when workspace listbox opens
  useEffect(() => {
    if (workspaceOpen) {
      workspaceMenuRef.current!
        .querySelectorAll<HTMLElement>('[role="option"]')[0]
        ?.focus()
    }
  }, [workspaceOpen])

  // Focus first menuitem when account menu opens
  useEffect(() => {
    if (accountOpen) {
      accountMenuRef.current!
        .querySelectorAll<HTMLElement>('[role="menuitem"]')[0]
        ?.focus()
    }
  }, [accountOpen])

  const handleWorkspaceKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        setWorkspaceOpen(false)
        workspaceBtnRef.current!.focus()
      } else if (!workspaceOpen && e.key === 'ArrowDown') {
        e.preventDefault()
        setWorkspaceOpen(true)
      }
    },
    [workspaceOpen],
  )

  const handleWorkspaceMenuKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLUListElement>) => {
      const arr = Array.from(
        workspaceMenuRef.current!.querySelectorAll<HTMLElement>('[role="option"]'),
      )
      const idx = arr.indexOf(document.activeElement as HTMLElement)

      if (e.key === 'Escape') {
        e.preventDefault()
        setWorkspaceOpen(false)
        workspaceBtnRef.current!.focus()
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        arr[(idx + 1) % arr.length]?.focus()
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        arr[idx <= 0 ? arr.length - 1 : idx - 1]?.focus()
      } else if (e.key === 'Home') {
        e.preventDefault()
        arr[0]?.focus()
      } else if (e.key === 'End') {
        e.preventDefault()
        arr[arr.length - 1]?.focus()
      }
    },
    [],
  )

  const handleAccountKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        setAccountOpen(false)
        accountBtnRef.current!.focus()
      } else if (!accountOpen && e.key === 'ArrowDown') {
        e.preventDefault()
        setAccountOpen(true)
      }
    },
    [accountOpen],
  )

  const handleAccountMenuKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLUListElement>) => {
      const arr = Array.from(
        accountMenuRef.current!.querySelectorAll<HTMLElement>('[role="menuitem"]'),
      )
      const idx = arr.indexOf(document.activeElement as HTMLElement)

      if (e.key === 'Escape') {
        e.preventDefault()
        setAccountOpen(false)
        accountBtnRef.current!.focus()
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        arr[(idx + 1) % arr.length]?.focus()
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        arr[idx <= 0 ? arr.length - 1 : idx - 1]?.focus()
      } else if (e.key === 'Home') {
        e.preventDefault()
        arr[0]?.focus()
      } else if (e.key === 'End') {
        e.preventDefault()
        arr[arr.length - 1]?.focus()
      }
    },
    [],
  )

  function selectWorkspace(ws: string) {
    setWorkspace(ws)
    setWorkspaceOpen(false)
    workspaceBtnRef.current?.focus()
  }

  function closeAccountMenu() {
    setAccountOpen(false)
  }

  return (
    <header className="app-bar" role="banner">
      <div className="app-bar-inner">
        <button
          type="button"
          className="app-bar-hamburger"
          aria-label={sidebarOpen ? 'Close navigation' : 'Open navigation'}
          aria-expanded={sidebarOpen}
          aria-controls="app-sidebar"
          onClick={onSidebarToggle}
        >
          <span aria-hidden="true">{sidebarOpen ? '✕' : '☰'}</span>
        </button>

        <span className="app-bar-brand">Veritasor</span>

        <div className="app-bar-workspace" style={{ position: 'relative' }}>
          <button
            ref={workspaceBtnRef}
            type="button"
            className="workspace-trigger"
            aria-haspopup="listbox"
            aria-expanded={workspaceOpen}
            aria-label={`Workspace: ${workspace}. Change workspace`}
            onClick={() => setWorkspaceOpen((o) => !o)}
            onKeyDown={handleWorkspaceKeyDown}
          >
            <span className="workspace-name">{workspace}</span>
            <span aria-hidden="true" className="workspace-chevron">
              {workspaceOpen ? '▲' : '▼'}
            </span>
          </button>

          {workspaceOpen && (
            <ul
              ref={workspaceMenuRef}
              role="listbox"
              aria-label="Select workspace"
              className="disclosure-menu"
              onKeyDown={handleWorkspaceMenuKeyDown}
            >
              {workspaces.map((ws) => (
                <li
                  key={ws}
                  role="option"
                  aria-selected={ws === workspace}
                  tabIndex={0}
                  className={`disclosure-item${ws === workspace ? ' disclosure-item-active' : ''}`}
                  onClick={() => selectWorkspace(ws)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      selectWorkspace(ws)
                    }
                  }}
                >
                  {ws}
                  {ws === workspace && <span className="sr-only"> (current)</span>}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="app-bar-actions">
          <button
            type="button"
            className={`env-badge env-badge-${environment}`}
            aria-label={`Environment: ${environment}. Toggle environment`}
            onClick={() => setEnvironment((env) => (env === 'testnet' ? 'mainnet' : 'testnet'))}
          >
            <span aria-hidden="true" className="env-dot" />
            {environment}
          </button>

          <div style={{ position: 'relative' }}>
            <button
              ref={accountBtnRef}
              type="button"
              className="account-trigger"
              aria-haspopup="menu"
              aria-expanded={accountOpen}
              aria-label={`Account menu for ${userName}`}
              onClick={() => setAccountOpen((o) => !o)}
              onKeyDown={handleAccountKeyDown}
            >
              <span aria-hidden="true" className="account-avatar">
                {userInitials}
              </span>
              <span className="sr-only">{userName}</span>
              <span aria-hidden="true" className="workspace-chevron">
                {accountOpen ? '▲' : '▼'}
              </span>
            </button>

            {accountOpen && (
              <ul
                ref={accountMenuRef}
                role="menu"
                aria-label="Account options"
                className="disclosure-menu disclosure-menu-right"
                onKeyDown={handleAccountMenuKeyDown}
              >
                <li
                  role="menuitem"
                  tabIndex={0}
                  className="disclosure-item"
                  onClick={closeAccountMenu}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      closeAccountMenu()
                    }
                  }}
                >
                  Profile settings
                </li>
                <li
                  role="menuitem"
                  tabIndex={0}
                  className="disclosure-item"
                  onClick={closeAccountMenu}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      closeAccountMenu()
                    }
                  }}
                >
                  API keys
                </li>
                <li role="separator" aria-hidden="true" className="disclosure-separator" />
                <li
                  role="menuitem"
                  tabIndex={0}
                  className="disclosure-item disclosure-item-danger"
                  onClick={closeAccountMenu}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      closeAccountMenu()
                    }
                  }}
                >
                  Sign out
                </li>
              </ul>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
