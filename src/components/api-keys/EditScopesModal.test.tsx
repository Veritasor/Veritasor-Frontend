/**
 * Test suite for EditScopesModal
 *
 * Primary focus: scope diff detection and confirmation dialog behavior
 * for broadening vs narrowing permission changes.
 *
 * Covers:
 *  - Rendering with current scopes pre-selected
 *  - Scope diff detection (broaden, narrow, neutral)
 *  - Confirmation dialog shows correct description with added/removed scopes
 *  - Confirmation dialog uses danger tone for broadening
 *  - onUpdated callback called with new scopes on confirm
 *  - Validation (at least one scope required)
 *  - No-op when no changes made
 */

import { render, screen, fireEvent, act } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import EditScopesModal from './EditScopesModal'

// ─── Mock ToastContext ───────────────────────────────────────────────────────

vi.mock('../ToastContext', () => ({
  useToast: () => ({
    addToast: vi.fn(),
  }),
}))

// ─── fixtures ────────────────────────────────────────────────────────────────

const mockOnUpdated = vi.fn()

function renderModal(props: Partial<React.ComponentProps<typeof EditScopesModal>> = {}) {
  return render(
    <EditScopesModal
      open={true}
      onClose={() => {}}
      keyId="key_test123"
      keyName="Test Key"
      currentScopes={['read:attestations']}
      onUpdated={mockOnUpdated}
      {...props}
    />
  )
}

// ─── Rendering ───────────────────────────────────────────────────────────────

describe('EditScopesModal – rendering', () => {
  it('renders the modal when open', () => {
    renderModal()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('renders the modal title', () => {
    renderModal()
    expect(screen.getByText('Edit Scopes')).toBeInTheDocument()
  })

  it('displays the key name and ID', () => {
    renderModal({ keyName: 'Production Key', keyId: 'key_prod_abc' })
    expect(screen.getByText(/Production Key/)).toBeInTheDocument()
    expect(screen.getByText(/key_prod_abc/)).toBeInTheDocument()
  })

  it('pre-selects current scopes', () => {
    renderModal({ currentScopes: ['read:attestations', 'read:sources'] })
    expect(screen.getByLabelText('Read attestations')).toBeChecked()
    expect(screen.getByLabelText('Read revenue sources')).toBeChecked()
  })

  it('does not select scopes not in current scopes', () => {
    renderModal({ currentScopes: ['read:attestations'] })
    expect(screen.getByLabelText('Write attestations')).not.toBeChecked()
  })

  it('renders null when closed', () => {
    const { container } = render(
      <EditScopesModal
        open={false}
        onClose={() => {}}
        keyId="key_test"
        keyName="Test"
        currentScopes={[]}
        onUpdated={mockOnUpdated}
      />
    )
    expect(container.firstChild).toBeNull()
  })
})

// ─── Scope selection interactions ───────────────────────────────────────────

describe('EditScopesModal – scope selection', () => {
  it('toggles individual scope when clicked', () => {
    renderModal({ currentScopes: ['read:attestations'] })
    const checkbox = screen.getByLabelText('Write attestations')
    expect(checkbox).not.toBeChecked()
    fireEvent.click(checkbox)
    expect(checkbox).toBeChecked()
  })

  it('toggles group checkbox selects all scopes in group', () => {
    renderModal({ currentScopes: [] })
    const groupCheckbox = screen.getByLabelText(/Toggle all Attestations scopes/i)
    fireEvent.click(groupCheckbox)
    expect(screen.getByLabelText('Read attestations')).toBeChecked()
    expect(screen.getByLabelText('Write attestations')).toBeChecked()
  })

  it('select all button selects all scopes', () => {
    renderModal({ currentScopes: [] })
    fireEvent.click(screen.getByLabelText('Select all scopes'))
    expect(screen.getByLabelText('Read attestations')).toBeChecked()
    expect(screen.getByLabelText('Write attestations')).toBeChecked()
    expect(screen.getByLabelText('Read revenue sources')).toBeChecked()
    expect(screen.getByLabelText('Write revenue sources')).toBeChecked()
  })

  it('clear all button deselects all scopes', () => {
    renderModal({ currentScopes: ['read:attestations', 'write:attestations'] })
    fireEvent.click(screen.getByLabelText('Clear all scopes'))
    expect(screen.getByLabelText('Read attestations')).not.toBeChecked()
    expect(screen.getByLabelText('Write attestations')).not.toBeChecked()
  })

  it('search filter scopes by label', () => {
    renderModal({ currentScopes: [] })
    const searchInput = screen.getByPlaceholderText('Filter scopes…')
    fireEvent.change(searchInput, { target: { value: 'webhook' } })
    expect(screen.getByLabelText('Read webhooks')).toBeInTheDocument()
    expect(screen.queryByLabelText('Read attestations')).not.toBeInTheDocument()
  })
})

// ─── Scope diff detection ───────────────────────────────────────────────────

describe('EditScopesModal – scope diff detection', () => {
  it('detects broadening when adding write scope to read-only key', () => {
    renderModal({ currentScopes: ['read:attestations'] })
    // Add write:attestations
    fireEvent.click(screen.getByLabelText('Write attestations'))
    fireEvent.click(screen.getByText('Save Changes'))
    // Confirmation dialog should show broadening warning
    expect(screen.getByText(/Confirm scope broadening?/i)).toBeInTheDocument()
  })

  it('detects narrowing when removing write scope from read-write key', () => {
    renderModal({ currentScopes: ['read:attestations', 'write:attestations'] })
    // Remove write:attestations
    fireEvent.click(screen.getByLabelText('Write attestations'))
    fireEvent.click(screen.getByText('Save Changes'))
    // Confirmation dialog should show narrowing info
    expect(screen.getByText(/This change will narrow/i)).toBeInTheDocument()
  })

  it('detects neutral when swapping scopes of same privilege level', () => {
    renderModal({ currentScopes: ['read:attestations'] })
    // Remove read:attestations, add read:sources (same privilege level)
    fireEvent.click(screen.getByLabelText('Read attestations'))
    fireEvent.click(screen.getByLabelText('Read revenue sources'))
    fireEvent.click(screen.getByText('Save Changes'))
    // Should use default tone (not danger)
    expect(screen.queryByText(/Confirm scope broadening?/i)).not.toBeInTheDocument()
  })

  it('shows added scopes in confirmation description', () => {
    renderModal({ currentScopes: ['read:attestations'] })
    fireEvent.click(screen.getByLabelText('Write attestations'))
    fireEvent.click(screen.getByText('Save Changes'))
    expect(screen.getByText(/Adding: Write attestations/i)).toBeInTheDocument()
  })

  it('shows removed scopes in confirmation description', () => {
    renderModal({ currentScopes: ['read:attestations', 'write:attestations'] })
    fireEvent.click(screen.getByLabelText('Write attestations'))
    fireEvent.click(screen.getByText('Save Changes'))
    expect(screen.getByText(/Removing: Write attestations/i)).toBeInTheDocument()
  })

  it('uses danger tone for broadening changes', () => {
    renderModal({ currentScopes: ['read:attestations'] })
    fireEvent.click(screen.getByLabelText('Write attestations'))
    fireEvent.click(screen.getByText('Save Changes'))
    // The confirmation dialog title for broadening is different
    expect(screen.getByText(/Confirm scope broadening?/i)).toBeInTheDocument()
  })

  it('uses default tone for narrowing changes', () => {
    renderModal({ currentScopes: ['read:attestations', 'write:attestations'] })
    fireEvent.click(screen.getByLabelText('Write attestations'))
    fireEvent.click(screen.getByText('Save Changes'))
    // The confirmation dialog title for narrowing is generic
    expect(screen.getByText(/Confirm scope changes?/i)).toBeInTheDocument()
    expect(screen.queryByText(/Confirm scope broadening?/i)).not.toBeInTheDocument()
  })
})

// ─── Confirmation and callbacks ─────────────────────────────────────────────

describe('EditScopesModal – confirmation and callbacks', () => {
  beforeEach(() => {
    mockOnUpdated.mockClear()
  })

  it('calls onUpdated with new scopes when confirmed', () => {
    renderModal({ currentScopes: ['read:attestations'] })
    fireEvent.click(screen.getByLabelText('Write attestations'))
    fireEvent.click(screen.getByText('Save Changes'))
    fireEvent.click(screen.getByText('Confirm'))
    expect(mockOnUpdated).toHaveBeenCalledWith(['read:attestations', 'write:attestations'])
  })

  it('calls onClose when cancel is clicked', () => {
    const onClose = vi.fn()
    renderModal({ onClose })
    fireEvent.click(screen.getByText('Cancel'))
    expect(onClose).toHaveBeenCalled()
  })

  it('calls onClose when X button is clicked', () => {
    const onClose = vi.fn()
    renderModal({ onClose })
    fireEvent.click(screen.getByLabelText('Close dialog'))
    expect(onClose).toHaveBeenCalled()
  })

  it('does not call onUpdated when confirmation is cancelled', () => {
    renderModal({ currentScopes: ['read:attestations'] })
    fireEvent.click(screen.getByLabelText('Write attestations'))
    fireEvent.click(screen.getByText('Save Changes'))
    fireEvent.click(screen.getByText('Back'))
    expect(mockOnUpdated).not.toHaveBeenCalled()
  })
})

// ─── Validation ───────────────────────────────────────────────────────────────

describe('EditScopesModal – validation', () => {
  it('shows error when no scopes selected', () => {
    renderModal({ currentScopes: ['read:attestations'] })
    // Deselect all
    fireEvent.click(screen.getByLabelText('Clear all scopes'))
    fireEvent.click(screen.getByText('Save Changes'))
    expect(screen.getByText(/Select at least one scope/i)).toBeInTheDocument()
  })

  it('does not open confirmation when no changes made', () => {
    renderModal({ currentScopes: ['read:attestations'] })
    fireEvent.click(screen.getByText('Save Changes'))
    // Confirmation dialog should NOT appear
    expect(screen.queryByText(/Confirm scope changes?/i)).not.toBeInTheDocument()
  })
})

// ─── Group toggle tri-state ─────────────────────────────────────────────────

describe('EditScopesModal – group tri-state checkboxes', () => {
  it('shows indeterminate state when some scopes selected', () => {
    renderModal({ currentScopes: ['read:attestations'] })
    const groupCheckbox = screen.getByLabelText(/Toggle all Attestations scopes/i) as HTMLInputElement
    expect(groupCheckbox.indeterminate).toBe(true)
  })

  it('shows checked state when all scopes selected', () => {
    renderModal({ currentScopes: ['read:attestations', 'write:attestations'] })
    const groupCheckbox = screen.getByLabelText(/Toggle all Attestations scopes/i) as HTMLInputElement
    expect(groupCheckbox.checked).toBe(true)
    expect(groupCheckbox.indeterminate).toBe(false)
  })

  it('shows unchecked state when no scopes selected', () => {
    renderModal({ currentScopes: [] })
    const groupCheckbox = screen.getByLabelText(/Toggle all Attestations scopes/i) as HTMLInputElement
    expect(groupCheckbox.checked).toBe(false)
    expect(groupCheckbox.indeterminate).toBe(false)
  })
})

// ─── Complex scope change scenarios ─────────────────────────────────────────

describe('EditScopesModal – complex scope changes', () => {
  it('broadening when adding write:keys (admin scope)', () => {
    renderModal({ currentScopes: ['read:attestations'] })
    fireEvent.click(screen.getByLabelText('Write API keys'))
    fireEvent.click(screen.getByText('Save Changes'))
    expect(screen.getByText(/Confirm scope broadening?/i)).toBeInTheDocument()
    expect(screen.getByText(/Adding: Write API keys/i)).toBeInTheDocument()
  })

  it('narrowing when removing write:keys from admin key', () => {
    renderModal({ currentScopes: ['read:attestations', 'write:keys'] })
    fireEvent.click(screen.getByLabelText('Write API keys'))
    fireEvent.click(screen.getByText('Save Changes'))
    expect(screen.getByText(/This change will narrow/i)).toBeInTheDocument()
    expect(screen.getByText(/Removing: Write API keys/i)).toBeInTheDocument()
  })

  it('multiple added scopes shown in description', () => {
    renderModal({ currentScopes: ['read:attestations'] })
    fireEvent.click(screen.getByLabelText('Write attestations'))
    fireEvent.click(screen.getByLabelText('Read revenue sources'))
    fireEvent.click(screen.getByText('Save Changes'))
    expect(screen.getByText(/Adding:/i)).toBeInTheDocument()
    expect(screen.getByText(/Write attestations/i)).toBeInTheDocument()
    expect(screen.getByText(/Read revenue sources/i)).toBeInTheDocument()
  })

  it('multiple removed scopes shown in description', () => {
    renderModal({ currentScopes: ['read:attestations', 'write:attestations', 'read:sources'] })
    fireEvent.click(screen.getByLabelText('Write attestations'))
    fireEvent.click(screen.getByLabelText('Read revenue sources'))
    fireEvent.click(screen.getByText('Save Changes'))
    expect(screen.getByText(/Removing:/i)).toBeInTheDocument()
    expect(screen.getByText(/Write attestations/i)).toBeInTheDocument()
    expect(screen.getByText(/Read revenue sources/i)).toBeInTheDocument()
  })
})
