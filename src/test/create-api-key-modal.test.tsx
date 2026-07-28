/**
 * Tests for CreateApiKeyModal with grouped scope selector (#265)
 *
 * Covers:
 *  - Modal rendering (open / closed)
 *  - Group tri-state checkboxes (all / some / none)
 *  - Individual scope toggling affects group state
 *  - Search/filter across scopes
 *  - Selected-count summary badge
 *  - Select all / Clear all quick actions
 *  - Form validation and submission
 *  - Keyboard and accessibility (roles, aria attributes)
 *  - Empty search state
 */

import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import CreateApiKeyModal from '../components/api-keys/CreateApiKeyModal'
import { ToastProvider } from '../components/ToastContext'

// ─── Helpers ───────────────────────────────────────────────────────────

function renderModal(open = true) {
  const onClose = vi.fn()
  const onMinted = vi.fn()
  const result = render(
    <ToastProvider>
      <CreateApiKeyModal open={open} onClose={onClose} onMinted={onMinted} />
    </ToastProvider>,
  )
  return { ...result, onClose, onMinted }
}

function getGroupCheckbox(groupLabel: string): HTMLInputElement {
  return screen.getByRole('checkbox', { name: new RegExp(`toggle all ${groupLabel}`, 'i') }) as HTMLInputElement
}

function getScopeCheckbox(scopeLabel: string): HTMLInputElement {
  return screen.getByRole('checkbox', { name: scopeLabel }) as HTMLInputElement
}

// ─── Rendering ─────────────────────────────────────────────────────────

describe('CreateApiKeyModal — rendering', () => {
  it('renders nothing when open=false', () => {
    const { container } = renderModal(false)
    expect(container.firstChild).toBeNull()
  })

  it('renders the modal dialog when open=true', () => {
    renderModal(true)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('dialog has aria-modal=true and is labelled', () => {
    renderModal(true)
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).toHaveAttribute('aria-labelledby', 'create-title')
  })

  it('renders the title "Create API key"', () => {
    renderModal(true)
    expect(screen.getByRole('heading', { name: /create api key/i })).toBeInTheDocument()
  })

  it('renders the label, expiry, and scopes fields', () => {
    renderModal(true)
    expect(screen.getByLabelText('Label')).toBeInTheDocument()
    expect(screen.getByLabelText(/expiry/i)).toBeInTheDocument()
    expect(screen.getByRole('tree', { name: /scope groups/i })).toBeInTheDocument()
  })
})

// ─── Scope groups ──────────────────────────────────────────────────────

describe('CreateApiKeyModal — scope groups', () => {
  it('renders all 4 group headers (Attestations, Revenue Sources, Webhooks, API Keys)', () => {
    renderModal(true)
    expect(screen.getByText('Attestations')).toBeInTheDocument()
    expect(screen.getByText('Revenue Sources')).toBeInTheDocument()
    expect(screen.getByText('Webhooks')).toBeInTheDocument()
    expect(screen.getByText('API Keys')).toBeInTheDocument()
  })

  it('renders 8 individual scope checkboxes', () => {
    renderModal(true)
    const tree = screen.getByRole('tree')
    const checkboxes = tree.querySelectorAll('input[type="checkbox"]')
    // 4 group + 8 scope = 12 checkboxes
    expect(checkboxes.length).toBe(12)
  })

  it('each group has role="treeitem" with aria-expanded', () => {
    renderModal(true)
    const treeitems = screen.getAllByRole('treeitem')
    expect(treeitems.length).toBe(12) // 4 groups + 8 scopes
    // Groups have aria-expanded
    const groups = treeitems.filter((el) => el.hasAttribute('aria-expanded'))
    expect(groups.length).toBe(4)
    groups.forEach((g) => {
      expect(g.getAttribute('aria-expanded')).toBe('true')
    })
  })
})

// ─── Tri-state group checkboxes ────────────────────────────────────────

describe('CreateApiKeyModal — tri-state group checkboxes', () => {
  it('group checkbox is checked when all scopes in group are selected', () => {
    renderModal(true)
    // Initially "read:attestations" is selected, so Attestations group has 1/2
    const attestGroup = getGroupCheckbox('Attestations')
    expect(attestGroup).not.toBeChecked()
    expect(attestGroup.indeterminate).toBe(true)

    // Select "write:attestations" to make it all-checked
    fireEvent.click(getScopeCheckbox('Write attestations'))
    expect(attestGroup).toBeChecked()
    expect(attestGroup.indeterminate).toBe(false)
  })

  it('group checkbox is indeterminate when SOME scopes are selected', () => {
    renderModal(true)
    // Default: read:attestations is selected, write:attestations is not → indeterminate
    const attestGroup = getGroupCheckbox('Attestations')
    expect(attestGroup.indeterminate).toBe(true)

    // Revenue Sources group has 0 selected → not indeterminate
    const sourcesGroup = getGroupCheckbox('Revenue Sources')
    expect(sourcesGroup).not.toBeChecked()
    expect(sourcesGroup.indeterminate).toBe(false)
  })

  it('group checkbox is unchecked when NO scopes in group are selected', () => {
    renderModal(true)
    const sourcesGroup = getGroupCheckbox('Revenue Sources')
    expect(sourcesGroup).not.toBeChecked()
    expect(sourcesGroup.indeterminate).toBe(false)
  })

  it('clicking an all-checked group deselects all its scopes', () => {
    renderModal(true)
    const attestGroup = getGroupCheckbox('Attestations')

    // Select the remaining scope first so group is fully checked
    fireEvent.click(getScopeCheckbox('Write attestations'))
    expect(attestGroup).toBeChecked()

    // Click group → deselect all
    fireEvent.click(attestGroup)
    expect(attestGroup).not.toBeChecked()
    expect(attestGroup.indeterminate).toBe(false)
    expect(getScopeCheckbox('Read attestations')).not.toBeChecked()
    expect(getScopeCheckbox('Write attestations')).not.toBeChecked()
  })

  it('clicking a none/some-checked group selects all its scopes', () => {
    renderModal(true)
    // Revenue Sources has 0 selected
    const sourcesGroup = getGroupCheckbox('Revenue Sources')
    expect(sourcesGroup).not.toBeChecked()
    expect(sourcesGroup.indeterminate).toBe(false)

    fireEvent.click(sourcesGroup)
    expect(sourcesGroup).toBeChecked()
    expect(sourcesGroup.indeterminate).toBe(false)
    expect(getScopeCheckbox('Read revenue sources')).toBeChecked()
    expect(getScopeCheckbox('Write revenue sources')).toBeChecked()
  })

  it('deselecting one scope from a fully-checked group makes it indeterminate', () => {
    renderModal(true)
    // Select all in Attestations
    fireEvent.click(getScopeCheckbox('Write attestations'))
    const attestGroup = getGroupCheckbox('Attestations')
    expect(attestGroup).toBeChecked()

    // Deselect one
    fireEvent.click(getScopeCheckbox('Read attestations'))
    expect(attestGroup).not.toBeChecked()
    expect(attestGroup.indeterminate).toBe(true)
  })
})

// ─── Search / Filter ───────────────────────────────────────────────────

describe('CreateApiKeyModal — search filter', () => {
  it('search input filters scopes by label', () => {
    renderModal(true)
    const searchInput = screen.getByLabelText(/filter scopes/i)
    fireEvent.change(searchInput, { target: { value: 'webhook' } })

    // Only Webhooks group should be visible
    expect(screen.getByText('Webhooks')).toBeInTheDocument()
    expect(screen.queryByText('Attestations')).not.toBeInTheDocument()
    expect(screen.queryByText('Revenue Sources')).not.toBeInTheDocument()
    expect(screen.queryByText('API Keys')).not.toBeInTheDocument()
  })

  it('search input filters by description text', () => {
    renderModal(true)
    const searchInput = screen.getByLabelText(/filter scopes/i)
    fireEvent.change(searchInput, { target: { value: 'on-chain' } })

    // Only scope with "on-chain" in description
    expect(screen.getByText('Attestations')).toBeInTheDocument()
    expect(screen.getByText('Read attestations')).toBeInTheDocument()
    expect(screen.queryByText('Write attestations')).not.toBeInTheDocument()
  })

  it('shows empty state when no scopes match', () => {
    renderModal(true)
    const searchInput = screen.getByLabelText(/filter scopes/i)
    fireEvent.change(searchInput, { target: { value: 'zzzznonexistent' } })

    expect(screen.getByRole('status')).toHaveTextContent(/no scopes match/i)
    expect(screen.queryByRole('tree')).not.toBeInTheDocument()
  })

  it('clearing search restores all groups', () => {
    renderModal(true)
    const searchInput = screen.getByLabelText(/filter scopes/i)

    fireEvent.change(searchInput, { target: { value: 'webhook' } })
    expect(screen.queryByText('Attestations')).not.toBeInTheDocument()

    fireEvent.change(searchInput, { target: { value: '' } })
    expect(screen.getByText('Attestations')).toBeInTheDocument()
    expect(screen.getByText('Revenue Sources')).toBeInTheDocument()
    expect(screen.getByText('Webhooks')).toBeInTheDocument()
    expect(screen.getByText('API Keys')).toBeInTheDocument()
  })

  it('filters by group name and shows matching groups', () => {
    renderModal(true)
    const searchInput = screen.getByLabelText(/filter scopes/i)
    fireEvent.change(searchInput, { target: { value: 'revenue' } })

    // "revenue" appears in Revenue Sources label and Write attestations description
    // Both Attestations (with write:attestations) and Revenue Sources should show
    expect(screen.getByText('Revenue Sources')).toBeInTheDocument()
    expect(screen.getByText('Read revenue sources')).toBeInTheDocument()
    expect(screen.getByText('Write revenue sources')).toBeInTheDocument()
    // Attestations also appears because "revenue" in write:attestations description
    expect(screen.getByText('Attestations')).toBeInTheDocument()
    expect(screen.getByText('Write attestations')).toBeInTheDocument()
    // Groups without matching scopes are hidden
    expect(screen.queryByText('Read attestations')).not.toBeInTheDocument()
  })
})

// ─── Selected-count summary ────────────────────────────────────────────

describe('CreateApiKeyModal — selected-count summary', () => {
  it('shows "1/8 selected" by default', () => {
    renderModal(true)
    const summary = screen.getByText(/1.*\/.*8.*selected/i)
    expect(summary).toBeInTheDocument()
  })

  it('updates count when scopes are toggled', () => {
    renderModal(true)
    fireEvent.click(getScopeCheckbox('Write attestations'))
    expect(screen.getByText(/2.*\/.*8.*selected/i)).toBeInTheDocument()
  })

  it('shows "0/8 selected" when all are cleared', () => {
    renderModal(true)
    fireEvent.click(screen.getByRole('button', { name: /clear all/i }))
    expect(screen.getByText(/0.*\/.*8.*selected/i)).toBeInTheDocument()
  })

  it('shows "8/8 selected" when all are selected', () => {
    renderModal(true)
    fireEvent.click(screen.getByRole('button', { name: /select all/i }))
    expect(screen.getByText(/8.*\/.*8.*selected/i)).toBeInTheDocument()
  })

  it('summary has aria-live="polite" for screen reader announcements', () => {
    renderModal(true)
    const summary = screen.getByText(/selected/i)
    expect(summary).toHaveAttribute('aria-live', 'polite')
    expect(summary).toHaveAttribute('aria-atomic', 'true')
  })
})

// ─── Select all / Clear all ────────────────────────────────────────────

describe('CreateApiKeyModal — Select all / Clear all', () => {
  it('"Select all" selects every scope and all groups become checked', () => {
    renderModal(true)
    fireEvent.click(screen.getByRole('button', { name: /select all/i }))

    const attestGroup = getGroupCheckbox('Attestations')
    expect(attestGroup).toBeChecked()
    expect(attestGroup.indeterminate).toBe(false)

    const sourcesGroup = getGroupCheckbox('Revenue Sources')
    expect(sourcesGroup).toBeChecked()
    expect(sourcesGroup.indeterminate).toBe(false)
  })

  it('"Select all" button is disabled when all scopes are already selected', () => {
    renderModal(true)
    fireEvent.click(screen.getByRole('button', { name: /select all/i }))
    expect(screen.getByRole('button', { name: /select all/i })).toBeDisabled()
  })

  it('"Clear all" deselects every scope', () => {
    renderModal(true)
    fireEvent.click(screen.getByRole('button', { name: /clear all/i }))

    expect(getScopeCheckbox('Read attestations')).not.toBeChecked()
    expect(getGroupCheckbox('Attestations')).not.toBeChecked()
    expect(getGroupCheckbox('Attestations').indeterminate).toBe(false)
  })

  it('"Clear all" button is disabled when no scopes are selected', () => {
    renderModal(true)
    fireEvent.click(screen.getByRole('button', { name: /clear all/i }))
    expect(screen.getByRole('button', { name: /clear all/i })).toBeDisabled()
  })
})

// ─── Form validation ───────────────────────────────────────────────────

describe('CreateApiKeyModal — form validation', () => {
  it('shows error when label is too short', () => {
    renderModal(true)
    const labelInput = screen.getByLabelText('Label')
    fireEvent.change(labelInput, { target: { value: 'A' } })
    fireEvent.click(screen.getByRole('button', { name: /create/i }))
    expect(screen.getByRole('alert')).toHaveTextContent(/at least 2 characters/i)
  })

  it('shows error when expiry is out of range', () => {
    renderModal(true)
    const expiryInput = screen.getByLabelText(/expiry/i)
    fireEvent.change(expiryInput, { target: { value: '5' } })
    fireEvent.click(screen.getByRole('button', { name: /create/i }))
    expect(screen.getByRole('alert')).toHaveTextContent(/7 and 365 days/i)
  })

  it('shows error when no scopes are selected', () => {
    renderModal(true)
    fireEvent.click(screen.getByRole('button', { name: /clear all/i }))
    fireEvent.click(screen.getByRole('button', { name: /create/i }))
    expect(screen.getByRole('alert')).toHaveTextContent(/select at least one scope/i)
  })

  it('opens confirm dialog when form is valid', () => {
    renderModal(true)
    fireEvent.click(screen.getByRole('button', { name: /create/i }))
    // ConfirmDialog should open
    expect(screen.getByText(/confirm key creation/i)).toBeInTheDocument()
  })
})

// ─── Confirm dialog ────────────────────────────────────────────────────

describe('CreateApiKeyModal — confirm dialog', () => {
  it('shows the selected scopes in the confirm description', () => {
    renderModal(true)
    // Default: Read attestations
    fireEvent.click(screen.getByRole('button', { name: /create/i }))
    // The confirm dialog description should contain "Read attestations"
    const confirmDesc = document.getElementById('confirm-desc')
    expect(confirmDesc).toBeInTheDocument()
    expect(confirmDesc!.textContent).toMatch(/read attestations/i)
  })

  it('mints the key when confirmed', () => {
    const { onMinted } = renderModal(true)
    fireEvent.click(screen.getByRole('button', { name: /create/i }))
    // Now confirm
    fireEvent.click(screen.getByRole('button', { name: /create key/i }))
    expect(onMinted).toHaveBeenCalledOnce()
    const keyId = onMinted.mock.calls[0][0]
    const fullKey = onMinted.mock.calls[0][1]
    expect(keyId).toMatch(/^key_/)
    expect(fullKey).toMatch(/^vtsr_live_/)
  })
})

// ─── Close interactions ────────────────────────────────────────────────

describe('CreateApiKeyModal — close interactions', () => {
  it('calls onClose when Cancel button is clicked', () => {
    const { onClose } = renderModal(true)
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('calls onClose when close (X) button is clicked', () => {
    const { onClose } = renderModal(true)
    fireEvent.click(screen.getByRole('button', { name: /close dialog/i }))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('calls onClose when backdrop is clicked (no confirm open)', () => {
    const { onClose, container } = renderModal(true)
    const backdrop = container.querySelector('.modal-backdrop')
    fireEvent.click(backdrop!)
    expect(onClose).toHaveBeenCalledOnce()
  })
})
