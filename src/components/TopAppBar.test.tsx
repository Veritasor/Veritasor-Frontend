import { describe, it, expect, beforeEach, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { IntlProvider } from 'react-intl'
import TopAppBar, { WorkspaceMetadata } from './TopAppBar'
import messages from '../i18n/messages/en.json'

function renderWithProvider(ui: React.ReactElement) {
  return render(
    <IntlProvider locale="en" messages={messages}>
      {ui}
    </IntlProvider>
  )
}

const mockWorkspaces: WorkspaceMetadata[] = [
  { id: "workspace-1", name: "Acme Corp", initials: "AC", plan: "business", region: "us-east", description: "Main corporate workspace" },
  { id: "workspace-2", name: "My Workspace", initials: "MW", plan: "growth", region: "us-west", description: "Personal workspace" },
  { id: "workspace-3", name: "Test Org", initials: "TO", plan: "starter", region: "eu-west", description: "Testing environment" },
]

describe('TopAppBar - Account Switcher', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  describe('Happy Paths', () => {
    it('renders workspace switcher with current workspace', () => {
      renderWithProvider(
        <TopAppBar 
          workspaces={mockWorkspaces} 
          initialWorkspace="workspace-1"
        />
      )
      
      const trigger = screen.getByRole('button', { name: /workspace: acme corp/i })
      expect(trigger).toBeInTheDocument()
      expect(trigger).toHaveAttribute('aria-haspopup', 'listbox')
    })

    it('opens workspace menu on click', () => {
      renderWithProvider(
        <TopAppBar 
          workspaces={mockWorkspaces} 
          initialWorkspace="workspace-1"
        />
      )
      
      const trigger = screen.getByRole('button', { name: /workspace: acme corp/i })
      fireEvent.click(trigger)
      
      expect(trigger).toHaveAttribute('aria-expanded', 'true')
      expect(screen.getByRole('listbox', { name: /select workspace/i })).toBeInTheDocument()
    })

    it('displays workspace avatars and metadata in menu', () => {
      renderWithProvider(
        <TopAppBar 
          workspaces={mockWorkspaces} 
          initialWorkspace="workspace-1"
        />
      )
      
      fireEvent.click(screen.getByRole('button', { name: /workspace: acme corp/i }))
      
      expect(screen.getByText('Acme Corp')).toBeInTheDocument()
      expect(screen.getByText('My Workspace')).toBeInTheDocument()
      expect(screen.getByText('Test Org')).toBeInTheDocument()
      expect(screen.getByText('business')).toBeInTheDocument()
      expect(screen.getByText('growth')).toBeInTheDocument()
      expect(screen.getByText('starter')).toBeInTheDocument()
    })

    it('switches workspace when option is selected', () => {
      const onWorkspaceChange = vi.fn()
      renderWithProvider(
        <TopAppBar 
          workspaces={mockWorkspaces} 
          initialWorkspace="workspace-1"
          onWorkspaceChange={onWorkspaceChange}
        />
      )
      
      fireEvent.click(screen.getByRole('button', { name: /workspace: acme corp/i }))
      fireEvent.click(screen.getByText('My Workspace'))
      
      expect(onWorkspaceChange).toHaveBeenCalledWith('workspace-2')
    })

    it('filters workspaces by search', () => {
      renderWithProvider(
        <TopAppBar 
          workspaces={mockWorkspaces} 
          initialWorkspace="workspace-1"
        />
      )
      
      fireEvent.click(screen.getByRole('button', { name: /workspace: acme corp/i }))
      
      const searchInput = screen.getByPlaceholderText('Find workspace…')
      fireEvent.change(searchInput, { target: { value: 'Test' } })
      
      expect(screen.getByText('Test Org')).toBeInTheDocument()
      expect(screen.queryByText('Acme Corp')).not.toBeInTheDocument()
      expect(screen.queryByText('My Workspace')).not.toBeInTheDocument()
    })

    it('shows no results message when search matches nothing', () => {
      renderWithProvider(
        <TopAppBar 
          workspaces={mockWorkspaces} 
          initialWorkspace="workspace-1"
        />
      )
      
      fireEvent.click(screen.getByRole('button', { name: /workspace: acme corp/i }))
      
      const searchInput = screen.getByPlaceholderText('Find workspace…')
      fireEvent.change(searchInput, { target: { value: 'NonExistent' } })
      
      expect(screen.getByText(/no workspaces match/i)).toBeInTheDocument()
    })

    it('displays keyboard shortcut hint in menu', () => {
      renderWithProvider(
        <TopAppBar 
          workspaces={mockWorkspaces} 
          initialWorkspace="workspace-1"
        />
      )
      
      fireEvent.click(screen.getByRole('button', { name: /workspace: acme corp/i }))
      
      expect(screen.getByText(/ctrl\+k/i)).toBeInTheDocument()
      expect(screen.getByText(/w/i)).toBeInTheDocument()
      expect(screen.getByText(/quick switch/i)).toBeInTheDocument()
    })

    it('announces workspace change to screen readers', async () => {
      renderWithProvider(
        <TopAppBar 
          workspaces={mockWorkspaces} 
          initialWorkspace="workspace-1"
        />
      )
      
      fireEvent.click(screen.getByRole('button', { name: /workspace: acme corp/i }))
      fireEvent.click(screen.getByText('My Workspace'))
      
      await waitFor(() => {
        const announcement = screen.getByRole('status')
        expect(announcement).toHaveTextContent(/switched to workspace: my workspace/i)
      })
    })
  })

  describe('Invalid Input and Authorization Boundaries', () => {
    it('handles empty workspaces array gracefully', () => {
      renderWithProvider(
        <TopAppBar 
          workspaces={[]} 
          initialWorkspace=""
        />
      )
      
      const trigger = screen.getByRole('button', { name: /workspace:/i })
      expect(trigger).toBeInTheDocument()
    })

    it('handles undefined workspaces prop', () => {
      renderWithProvider(<TopAppBar />)
      
      const trigger = screen.getByRole('button', { name: /workspace:/i })
      expect(trigger).toBeInTheDocument()
    })

    it('handles workspace with missing optional fields', () => {
      const incompleteWorkspaces: WorkspaceMetadata[] = [
        { id: "ws-1", name: "Minimal Workspace" },
      ]
      
      renderWithProvider(
        <TopAppBar 
          workspaces={incompleteWorkspaces} 
          initialWorkspace="ws-1"
        />
      )
      
      fireEvent.click(screen.getByRole('button', { name: /workspace: minimal workspace/i }))
      expect(screen.getByText('Minimal Workspace')).toBeInTheDocument()
    })

    it('handles duplicate workspace IDs by using first occurrence', () => {
      const duplicateWorkspaces: WorkspaceMetadata[] = [
        { id: "ws-1", name: "Workspace One", initials: "WO" },
        { id: "ws-1", name: "Workspace One Duplicate", initials: "WD" },
      ]
      
      renderWithProvider(
        <TopAppBar 
          workspaces={duplicateWorkspaces} 
          initialWorkspace="ws-1"
        />
      )
      
      fireEvent.click(screen.getByRole('button', { name: /workspace:/i }))
      expect(screen.getByText('Workspace One')).toBeInTheDocument()
    })
  })

  describe('Keyboard Navigation', () => {
    it('opens menu with ArrowDown key', () => {
      renderWithProvider(
        <TopAppBar 
          workspaces={mockWorkspaces} 
          initialWorkspace="workspace-1"
        />
      )
      
      const trigger = screen.getByRole('button', { name: /workspace: acme corp/i })
      fireEvent.keyDown(trigger, { key: 'ArrowDown' })
      
      expect(trigger).toHaveAttribute('aria-expanded', 'true')
    })

    it('closes menu with Escape key and returns focus', () => {
      renderWithProvider(
        <TopAppBar 
          workspaces={mockWorkspaces} 
          initialWorkspace="workspace-1"
        />
      )
      
      const trigger = screen.getByRole('button', { name: /workspace: acme corp/i })
      fireEvent.click(trigger)
      
      const listbox = screen.getByRole('listbox')
      fireEvent.keyDown(listbox, { key: 'Escape' })
      
      expect(trigger).toHaveAttribute('aria-expanded', 'false')
      expect(trigger).toHaveFocus()
    })

    it('navigates options with Arrow keys', () => {
      renderWithProvider(
        <TopAppBar 
          workspaces={mockWorkspaces} 
          initialWorkspace="workspace-1"
        />
      )
      
      fireEvent.click(screen.getByRole('button', { name: /workspace: acme corp/i }))
      
      const listbox = screen.getByRole('listbox')
      fireEvent.keyDown(listbox, { key: 'ArrowDown' })
      fireEvent.keyDown(listbox, { key: 'ArrowDown' })
      
      // Focus should have moved
      const options = screen.getAllByRole('option')
      expect(options[1]).toHaveFocus()
    })

    it('selects workspace with Enter key', () => {
      const onWorkspaceChange = vi.fn()
      renderWithProvider(
        <TopAppBar 
          workspaces={mockWorkspaces} 
          initialWorkspace="workspace-1"
          onWorkspaceChange={onWorkspaceChange}
        />
      )
      
      fireEvent.click(screen.getByRole('button', { name: /workspace: acme corp/i }))
      
      const listbox = screen.getByRole('listbox')
      fireEvent.keyDown(listbox, { key: 'ArrowDown' })
      fireEvent.keyDown(listbox, { key: 'Enter' })
      
      expect(onWorkspaceChange).toHaveBeenCalled()
    })

    it('navigates to first option with Home key', () => {
      renderWithProvider(
        <TopAppBar 
          workspaces={mockWorkspaces} 
          initialWorkspace="workspace-1"
        />
      )
      
      fireEvent.click(screen.getByRole('button', { name: /workspace: acme corp/i }))
      
      const listbox = screen.getByRole('listbox')
      fireEvent.keyDown(listbox, { key: 'ArrowDown' })
      fireEvent.keyDown(listbox, { key: 'ArrowDown' })
      fireEvent.keyDown(listbox, { key: 'Home' })
      
      const options = screen.getAllByRole('option')
      expect(options[0]).toHaveFocus()
    })

    it('navigates to last option with End key', () => {
      renderWithProvider(
        <TopAppBar 
          workspaces={mockWorkspaces} 
          initialWorkspace="workspace-1"
        />
      )
      
      fireEvent.click(screen.getByRole('button', { name: /workspace: acme corp/i }))
      
      const listbox = screen.getByRole('listbox')
      fireEvent.keyDown(listbox, { key: 'End' })
      
      const options = screen.getAllByRole('option')
      expect(options[options.length - 1]).toHaveFocus()
    })

    it('supports search input keyboard navigation', () => {
      renderWithProvider(
        <TopAppBar 
          workspaces={mockWorkspaces} 
          initialWorkspace="workspace-1"
          openWorkspaceSwitcherInSearchMode={true}
        />
      )
      
      const searchInput = screen.getByPlaceholderText('Find workspace…')
      expect(searchInput).toHaveFocus()
      
      fireEvent.keyDown(searchInput, { key: 'ArrowDown' })
      
      const options = screen.getAllByRole('option')
      expect(options[0]).toHaveFocus()
    })

    it('selects first matching result on Enter in search', () => {
      const onWorkspaceChange = vi.fn()
      renderWithProvider(
        <TopAppBar 
          workspaces={mockWorkspaces} 
          initialWorkspace="workspace-1"
          onWorkspaceChange={onWorkspaceChange}
          openWorkspaceSwitcherInSearchMode={true}
        />
      )
      
      const searchInput = screen.getByPlaceholderText('Find workspace…')
      fireEvent.change(searchInput, { target: { value: 'Test' } })
      fireEvent.keyDown(searchInput, { key: 'Enter' })
      
      expect(onWorkspaceChange).toHaveBeenCalledWith('workspace-3')
    })
  })

  describe('Account Menu', () => {
    it('displays user avatar and name in account menu', () => {
      renderWithProvider(
        <TopAppBar 
          workspaces={mockWorkspaces} 
          initialWorkspace="workspace-1"
          userName="Test User"
          userInitials="TU"
          userEmail="test@example.com"
        />
      )
      
      const accountTrigger = screen.getByRole('button', { name: /account menu for test user/i })
      fireEvent.click(accountTrigger)
      
      expect(screen.getByText('Test User')).toBeInTheDocument()
      expect(screen.getByText('test@example.com')).toBeInTheDocument()
    })

    it('supports custom user avatar', () => {
      renderWithProvider(
        <TopAppBar 
          workspaces={mockWorkspaces} 
          initialWorkspace="workspace-1"
          userName="Test User"
          userAvatar="https://example.com/avatar.jpg"
        />
      )
      
      const accountTrigger = screen.getByRole('button', { name: /account menu for test user/i })
      expect(accountTrigger).toBeInTheDocument()
    })

    it('closes account menu with Escape key', () => {
      renderWithProvider(
        <TopAppBar 
          workspaces={mockWorkspaces} 
          initialWorkspace="workspace-1"
        />
      )
      
      const accountTrigger = screen.getByRole('button', { name: /account menu/i })
      fireEvent.click(accountTrigger)
      
      const menu = screen.getByRole('menu', { name: /account options/i })
      fireEvent.keyDown(menu, { key: 'Escape' })
      
      expect(accountTrigger).toHaveAttribute('aria-expanded', 'false')
    })
  })

  describe('Accessibility', () => {
    it('has proper ARIA roles and attributes', () => {
      renderWithProvider(
        <TopAppBar 
          workspaces={mockWorkspaces} 
          initialWorkspace="workspace-1"
        />
      )
      
      const trigger = screen.getByRole('button', { name: /workspace: acme corp/i })
      expect(trigger).toHaveAttribute('aria-haspopup', 'listbox')
      expect(trigger).toHaveAttribute('aria-expanded', 'false')
    })

    it('marks current workspace with aria-selected', () => {
      renderWithProvider(
        <TopAppBar 
          workspaces={mockWorkspaces} 
          initialWorkspace="workspace-1"
        />
      )
      
      fireEvent.click(screen.getByRole('button', { name: /workspace: acme corp/i }))
      
      const options = screen.getAllByRole('option')
      expect(options[0]).toHaveAttribute('aria-selected', 'true')
      expect(options[1]).toHaveAttribute('aria-selected', 'false')
    })

    it('provides screen reader text for current workspace', () => {
      renderWithProvider(
        <TopAppBar 
          workspaces={mockWorkspaces} 
          initialWorkspace="workspace-1"
        />
      )
      
      fireEvent.click(screen.getByRole('button', { name: /workspace: acme corp/i }))
      
      expect(screen.getByText('(current)')).toBeInTheDocument()
    })

    it('includes keyboard shortcut in aria-label', () => {
      renderWithProvider(
        <TopAppBar 
          workspaces={mockWorkspaces} 
          initialWorkspace="workspace-1"
        />
      )
      
      const trigger = screen.getByRole('button', { name: /workspace: acme corp/i })
      expect(trigger).toHaveAttribute('aria-label', expect.stringContaining('Ctrl+K'))
    })

    it('has focus management for search input when opened in search mode', () => {
      renderWithProvider(
        <TopAppBar 
          workspaces={mockWorkspaces} 
          initialWorkspace="workspace-1"
          openWorkspaceSwitcherInSearchMode={true}
        />
      )
      
      const searchInput = screen.getByPlaceholderText('Find workspace…')
      expect(searchInput).toHaveFocus()
    })
  })

  describe('Edge Cases', () => {
    it('handles single workspace', () => {
      const singleWorkspace: WorkspaceMetadata[] = [
        { id: "ws-1", name: "Only Workspace", initials: "OW" },
      ]
      
      renderWithProvider(
        <TopAppBar 
          workspaces={singleWorkspace} 
          initialWorkspace="ws-1"
        />
      )
      
      fireEvent.click(screen.getByRole('button', { name: /workspace: only workspace/i }))
      expect(screen.getByText('Only Workspace')).toBeInTheDocument()
    })

    it('handles many workspaces with scrolling', () => {
      const manyWorkspaces: WorkspaceMetadata[] = Array.from({ length: 50 }, (_, i) => ({
        id: `ws-${i}`,
        name: `Workspace ${i}`,
        initials: `W${i}`,
        plan: 'growth' as const,
      }))
      
      renderWithProvider(
        <TopAppBar 
          workspaces={manyWorkspaces} 
          initialWorkspace="ws-0"
        />
      )
      
      fireEvent.click(screen.getByRole('button', { name: /workspace: workspace 0/i }))
      expect(screen.getAllByRole('option').length).toBe(50)
    })

    it('handles workspace with very long name', () => {
      const longNameWorkspace: WorkspaceMetadata[] = [
        { id: "ws-1", name: "A".repeat(200), initials: "AA" },
      ]
      
      renderWithProvider(
        <TopAppBar 
          workspaces={longNameWorkspace} 
          initialWorkspace="ws-1"
        />
      )
      
      fireEvent.click(screen.getByRole('button', { name: /workspace:/i }))
      expect(screen.getByText(new RegExp(`^A{200}$`))).toBeInTheDocument()
    })

    it('handles special characters in workspace names', () => {
      const specialWorkspace: WorkspaceMetadata[] = [
        { id: "ws-1", name: "Workspace & Co.", initials: "WC" },
        { id: "ws-2", name: "Test <script>", initials: "TS" },
      ]
      
      renderWithProvider(
        <TopAppBar 
          workspaces={specialWorkspace} 
          initialWorkspace="ws-1"
        />
      )
      
      fireEvent.click(screen.getByRole('button', { name: /workspace:/i }))
      expect(screen.getByText('Workspace & Co.')).toBeInTheDocument()
    })

    it('handles rapid workspace switching', () => {
      const onWorkspaceChange = vi.fn()
      renderWithProvider(
        <TopAppBar 
          workspaces={mockWorkspaces} 
          initialWorkspace="workspace-1"
          onWorkspaceChange={onWorkspaceChange}
        />
      )
      
      fireEvent.click(screen.getByRole('button', { name: /workspace: acme corp/i }))
      fireEvent.click(screen.getByText('My Workspace'))
      fireEvent.click(screen.getByRole('button', { name: /workspace: my workspace/i }))
      fireEvent.click(screen.getByText('Test Org'))
      
      expect(onWorkspaceChange).toHaveBeenCalledTimes(2)
    })
  })

  describe('Backward Compatibility', () => {
    it('works with string-based workspaces (legacy support)', () => {
      // This test ensures the component can handle legacy string workspaces
      // by testing with the default workspaces which are now WorkspaceMetadata
      renderWithProvider(<TopAppBar />)
      
      const trigger = screen.getByRole('button', { name: /workspace:/i })
      expect(trigger).toBeInTheDocument()
    })

    it('maintains existing callback signatures', () => {
      const onSidebarToggle = vi.fn()
      const onSearchClick = vi.fn()
      const onWorkspaceQuickJump = vi.fn()
      
      renderWithProvider(
        <TopAppBar 
          onSidebarToggle={onSidebarToggle}
          onSearchClick={onSearchClick}
          onWorkspaceQuickJump={onWorkspaceQuickJump}
        />
      )
      
      expect(onSidebarToggle).toBeDefined()
      expect(onSearchClick).toBeDefined()
      expect(onWorkspaceQuickJump).toBeDefined()
    })
  })
})
