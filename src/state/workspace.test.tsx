import { describe, it, expect, beforeEach, vi } from 'vitest'
import { act, fireEvent, render, renderHook, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { type ReactNode } from 'react'
import {
  DEFAULT_WORKSPACES,
  WORKSPACE_STORAGE_KEY,
  WorkspaceProvider,
  useOptionalWorkspace,
  useWorkspace,
} from './workspace'
import { useSavedFilters } from '../hooks/useSavedFilters'
import { useTheme, getThemeStorageKey } from '../hooks/useTheme'
import { useDensityMode } from '../hooks/useDensityMode'
import { savedFilterStorageKey } from '../utils/auditLogFilters'
import TopAppBar from '../components/TopAppBar'
import { LocaleProvider } from '../i18n/provider'
import { EnvironmentProvider } from '../components/EnvironmentContext'

function createWrapper(initialWorkspaceId?: string) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <WorkspaceProvider initialWorkspaceId={initialWorkspaceId}>
        {children}
      </WorkspaceProvider>
    )
  }
}

describe('WorkspaceProvider and workspace isolation', () => {
  beforeEach(() => {
    window.localStorage.clear()
    vi.restoreAllMocks()
  })

  it('defaults to the first workspace and persists activeWorkspaceId', () => {
    const { result } = renderHook(() => useWorkspace(), {
      wrapper: createWrapper(),
    })

    expect(result.current.activeWorkspaceId).toBe(DEFAULT_WORKSPACES[0].id)
    expect(window.localStorage.getItem(WORKSPACE_STORAGE_KEY)).toBe(
      DEFAULT_WORKSPACES[0].id,
    )
  })

  it('switches workspace, increments switchVersion, and fires reset listeners', () => {
    const listener = vi.fn()
    const { result } = renderHook(() => useWorkspace(), {
      wrapper: createWrapper('acme-corp'),
    })

    const unsubscribe = result.current.onWorkspaceReset(listener)

    act(() => {
      result.current.switchWorkspace('my-workspace')
    })

    expect(result.current.activeWorkspaceId).toBe('my-workspace')
    expect(result.current.switchVersion).toBe(1)
    expect(listener).toHaveBeenCalledWith('my-workspace', 'acme-corp')
    expect(window.localStorage.getItem(WORKSPACE_STORAGE_KEY)).toBe('my-workspace')

    // Switching to unknown workspace is a no-op
    act(() => {
      result.current.switchWorkspace('does-not-exist')
    })
    expect(result.current.activeWorkspaceId).toBe('my-workspace')
    expect(result.current.switchVersion).toBe(1)

    unsubscribe()
  })

  it('throws from useWorkspace outside provider and returns undefined from useOptionalWorkspace', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      expect(() => renderHook(() => useWorkspace())).toThrow(
        'useWorkspace must be used within a WorkspaceProvider',
      )
      const { result } = renderHook(() => useOptionalWorkspace())
      expect(result.current).toBeUndefined()
    } finally {
      consoleError.mockRestore()
    }
  })

  it('isolates saved filters per workspace via WorkspaceProvider', () => {
    const { result } = renderHook(
      () => ({
        ws: useWorkspace(),
        saved: useSavedFilters(),
      }),
      { wrapper: createWrapper('acme-corp') },
    )

    act(() => {
      result.current.saved.save('Acme High Risk', '?status=failed')
    })

    expect(result.current.saved.filters).toHaveLength(1)
    expect(result.current.saved.filters[0].name).toBe('Acme High Risk')
    expect(
      window.localStorage.getItem(savedFilterStorageKey('acme-corp')),
    ).toContain('Acme High Risk')

    // Switch to another workspace — saved filters must be isolated
    act(() => {
      result.current.ws.switchWorkspace('my-workspace')
    })

    expect(result.current.saved.filters).toHaveLength(0)

    act(() => {
      result.current.saved.save('Personal Verified', '?status=verified')
    })

    expect(result.current.saved.filters).toHaveLength(1)
    expect(result.current.saved.filters[0].name).toBe('Personal Verified')

    // Switch back to acme-corp — original filters restored, no leakage
    act(() => {
      result.current.ws.switchWorkspace('acme-corp')
    })

    expect(result.current.saved.filters).toHaveLength(1)
    expect(result.current.saved.filters[0].name).toBe('Acme High Risk')
  })

  it('isolates theme preference per workspace via WorkspaceProvider', () => {
    const { result } = renderHook(
      () => ({
        ws: useWorkspace(),
        theme: useTheme(),
      }),
      { wrapper: createWrapper('acme-corp') },
    )

    expect(result.current.theme.theme).toBe('system')

    act(() => {
      result.current.theme.setTheme('high-contrast')
    })

    expect(result.current.theme.theme).toBe('high-contrast')
    expect(
      window.localStorage.getItem(getThemeStorageKey('acme-corp')),
    ).toBe('high-contrast')

    // Switch to another workspace — should not inherit acme-corp's theme
    act(() => {
      result.current.ws.switchWorkspace('my-workspace')
    })

    expect(result.current.theme.theme).toBe('system')

    // Switch back to acme-corp — high-contrast is restored
    act(() => {
      result.current.ws.switchWorkspace('acme-corp')
    })

    expect(result.current.theme.theme).toBe('high-contrast')
  })

  it('isolates density preference per workspace via WorkspaceProvider', () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({}), { status: 200 }),
    )

    const { result } = renderHook(
      () => ({
        ws: useWorkspace(),
        density: useDensityMode(),
      }),
      { wrapper: createWrapper('acme-corp') },
    )

    expect(result.current.density.density).toBe('comfortable')

    act(() => {
      result.current.density.setDensity('compact')
    })

    expect(result.current.density.density).toBe('compact')
    expect(window.localStorage.getItem('veritasor_density_acme-corp')).toBe(
      'compact',
    )

    // Switch to another workspace — defaults to comfortable
    act(() => {
      result.current.ws.switchWorkspace('my-workspace')
    })

    expect(result.current.density.density).toBe('comfortable')

    // Switch back to acme-corp — compact is restored
    act(() => {
      result.current.ws.switchWorkspace('acme-corp')
    })

    expect(result.current.density.density).toBe('compact')
  })

  it('switches active workspace from TopAppBar menu', () => {
    function ActiveWorkspaceProbe() {
      const { activeWorkspaceId } = useWorkspace()
      return <span data-testid="active-ws">{activeWorkspaceId}</span>
    }

    render(
      <MemoryRouter>
        <EnvironmentProvider>
          <LocaleProvider>
            <WorkspaceProvider initialWorkspaceId="acme-corp">
              <TopAppBar />
              <ActiveWorkspaceProbe />
            </WorkspaceProvider>
          </LocaleProvider>
        </EnvironmentProvider>
      </MemoryRouter>,
    )

    expect(screen.getByTestId('active-ws')).toHaveTextContent('acme-corp')

    fireEvent.click(
      screen.getByRole('button', { name: /workspace: acme corp/i }),
    )
    fireEvent.click(screen.getByText('My Workspace'))

    expect(screen.getByTestId('active-ws')).toHaveTextContent('my-workspace')
  })
})
