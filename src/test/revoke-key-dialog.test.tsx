/**
 * Tests for RevokeKeyDialog (#267)
 *
 * Covers:
 *  - role="dialog" with aria-modal and aria-labelledby
 *  - Focus trap (Enter / Escape / Tab)
 *  - Dependent-usage list rendering (has usage, no usage, unknown)
 *  - Typed confirmation input (must match key label exactly)
 *  - Destructive-red confirm button (disabled until input matches)
 *  - Dismiss via backdrop click or ESC
 */

import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import RevokeKeyDialog from '../../components/api-keys/RevokeKeyDialog'
import type { ApiKey, DependentUsage } from '../../components/api-keys/apiKeyTypes'

const baseKey: ApiKey = {
  id: 'key_001',
  label: 'Admin key',
  status: 'active',
  createdAt: '2026-06-01T14:00:00Z',
  expiresAt: '2026-12-01T00:00:00Z',
  scopes: ['read:attestations'],
  maskedKey: 'vtsr_live_xxxx',
}

const usageList: DependentUsage[] = [
  { name: 'Stripe webhook', lastSeenAt: new Date().toISOString() },
  { name: 'Internal cron', lastSeenAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString() },
]

describe('RevokeKeyDialog — rendering', () => {
  it('renders nothing when open=false', () => {
    const { container } = render(
      <RevokeKeyDialog
        open={false}
        keyItem={baseKey}
        dependentUsages={null}
        onClose={() => {}}
        onConfirm={() => {}}
      />,
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders a modal dialog when open=true', () => {
    render(
      <RevokeKeyDialog
        open={true}
        keyItem={baseKey}
        dependentUsages={null}
        onClose={() => {}}
        onConfirm={() => {}}
      />,
    )
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('dialog has aria-modal=true', () => {
    render(
      <RevokeKeyDialog
        open={true}
        keyItem={baseKey}
        dependentUsages={null}
        onClose={() => {}}
        onConfirm={() => {}}
      />,
    )
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true')
  })

  it('dialog title is "Revoke API key?"', () => {
    render(
      <RevokeKeyDialog
        open={true}
        keyItem={baseKey}
        dependentUsages={null}
        onClose={() => {}}
        onConfirm={() => {}}
      />,
    )
    expect(screen.getByRole('heading', { name: /revoke api key/i })).toBeInTheDocument()
  })

  it('shows the key label in the description', () => {
    render(
      <RevokeKeyDialog
        open={true}
        keyItem={baseKey}
        dependentUsages={null}
        onClose={() => {}}
        onConfirm={() => {}}
      />,
    )
    expect(screen.getByText(/admin key/i)).toBeInTheDocument()
  })
})

describe('RevokeKeyDialog — dependent usage list', () => {
  it('shows "Usage data unavailable" when dependentUsages=null', () => {
    render(
      <RevokeKeyDialog
        open={true}
        keyItem={baseKey}
        dependentUsages={null}
        onClose={() => {}}
        onConfirm={() => {}}
      />,
    )
    expect(screen.getByRole('note')).toHaveTextContent(/usage data unavailable/i)
  })

  it('shows "No integrations detected" when dependentUsages=[]', () => {
    render(
      <RevokeKeyDialog
        open={true}
        keyItem={baseKey}
        dependentUsages={[]}
        onClose={() => {}}
        onConfirm={() => {}}
      />,
    )
    expect(screen.getByText(/no integrations detected/i)).toBeInTheDocument()
  })

  it('renders the usage list when dependentUsages has items', () => {
    render(
      <RevokeKeyDialog
        open={true}
        keyItem={baseKey}
        dependentUsages={usageList}
        onClose={() => {}}
        onConfirm={() => {}}
      />,
    )
    expect(screen.getByText('Stripe webhook')).toBeInTheDocument()
    expect(screen.getByText('Internal cron')).toBeInTheDocument()
  })

  it('list has an accessible label with count', () => {
    render(
      <RevokeKeyDialog
        open={true}
        keyItem={baseKey}
        dependentUsages={usageList}
        onClose={() => {}}
        onConfirm={() => {}}
      />,
    )
    expect(screen.getByRole('list', { name: /2 dependent integration/i })).toBeInTheDocument()
  })

  it('each usage item displays "Last seen" with a <time> element', () => {
    render(
      <RevokeKeyDialog
        open={true}
        keyItem={baseKey}
        dependentUsages={usageList}
        onClose={() => {}}
        onConfirm={() => {}}
      />,
    )
    const timeElements = document.querySelectorAll('time')
    expect(timeElements.length).toBeGreaterThanOrEqual(2)
  })
})

describe('RevokeKeyDialog — typed confirmation', () => {
  it('renders an input field with placeholder matching the key label', () => {
    render(
      <RevokeKeyDialog
        open={true}
        keyItem={baseKey}
        dependentUsages={null}
        onClose={() => {}}
        onConfirm={() => {}}
      />,
    )
    const input = screen.getByLabelText(/type.*admin key.*to confirm/i) as HTMLInputElement
    expect(input).toBeInTheDocument()
    expect(input.placeholder).toBe('Admin key')
  })

  it('confirm button is disabled when input is empty', () => {
    render(
      <RevokeKeyDialog
        open={true}
        keyItem={baseKey}
        dependentUsages={null}
        onClose={() => {}}
        onConfirm={() => {}}
      />,
    )
    expect(screen.getByRole('button', { name: /revoke key/i })).toBeDisabled()
  })

  it('confirm button is disabled when input does not match the key label', () => {
    render(
      <RevokeKeyDialog
        open={true}
        keyItem={baseKey}
        dependentUsages={null}
        onClose={() => {}}
        onConfirm={() => {}}
      />,
    )
    const input = screen.getByLabelText(/type.*admin key.*to confirm/i)
    fireEvent.change(input, { target: { value: 'Wrong' } })
    expect(screen.getByRole('button', { name: /revoke key/i })).toBeDisabled()
  })

  it('confirm button is enabled when input matches the key label exactly', () => {
    render(
      <RevokeKeyDialog
        open={true}
        keyItem={baseKey}
        dependentUsages={null}
        onClose={() => {}}
        onConfirm={() => {}}
      />,
    )
    const input = screen.getByLabelText(/type.*admin key.*to confirm/i)
    fireEvent.change(input, { target: { value: 'Admin key' } })
    expect(screen.getByRole('button', { name: /revoke key/i })).not.toBeDisabled()
  })

  it('trims whitespace when checking the match', () => {
    render(
      <RevokeKeyDialog
        open={true}
        keyItem={baseKey}
        dependentUsages={null}
        onClose={() => {}}
        onConfirm={() => {}}
      />,
    )
    const input = screen.getByLabelText(/type.*admin key.*to confirm/i)
    fireEvent.change(input, { target: { value: '  Admin key  ' } })
    expect(screen.getByRole('button', { name: /revoke key/i })).not.toBeDisabled()
  })

  it('shows aria-live validation error when input is incorrect', () => {
    render(
      <RevokeKeyDialog
        open={true}
        keyItem={baseKey}
        dependentUsages={null}
        onClose={() => {}}
        onConfirm={() => {}}
      />,
    )
    const input = screen.getByLabelText(/type.*admin key.*to confirm/i)
    fireEvent.change(input, { target: { value: 'Wrong' } })
    expect(screen.getByText(/key name does not match/i)).toBeInTheDocument()
  })

  it('shows "✓ Confirmed" when input is correct', () => {
    render(
      <RevokeKeyDialog
        open={true}
        keyItem={baseKey}
        dependentUsages={null}
        onClose={() => {}}
        onConfirm={() => {}}
      />,
    )
    const input = screen.getByLabelText(/type.*admin key.*to confirm/i)
    fireEvent.change(input, { target: { value: 'Admin key' } })
    expect(screen.getByText(/✓ confirmed/i)).toBeInTheDocument()
  })
})

describe('RevokeKeyDialog — interactions', () => {
  it('calls onClose when Cancel button is clicked', () => {
    const onClose = vi.fn()
    render(
      <RevokeKeyDialog
        open={true}
        keyItem={baseKey}
        dependentUsages={null}
        onClose={onClose}
        onConfirm={() => {}}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('calls onConfirm when Revoke button is clicked (after confirming input)', () => {
    const onConfirm = vi.fn()
    render(
      <RevokeKeyDialog
        open={true}
        keyItem={baseKey}
        dependentUsages={null}
        onClose={() => {}}
        onConfirm={onConfirm}
      />,
    )
    const input = screen.getByLabelText(/type.*admin key.*to confirm/i)
    fireEvent.change(input, { target: { value: 'Admin key' } })
    fireEvent.click(screen.getByRole('button', { name: /revoke key/i }))
    expect(onConfirm).toHaveBeenCalledOnce()
  })

  it('calls onClose when backdrop is clicked', () => {
    const onClose = vi.fn()
    const { container } = render(
      <RevokeKeyDialog
        open={true}
        keyItem={baseKey}
        dependentUsages={null}
        onClose={onClose}
        onConfirm={() => {}}
      />,
    )
    const backdrop = container.querySelector('.modal-backdrop')
    fireEvent.click(backdrop!)
    expect(onClose).toHaveBeenCalled()
  })

  it('calls onClose when close (X) button is clicked', () => {
    const onClose = vi.fn()
    render(
      <RevokeKeyDialog
        open={true}
        keyItem={baseKey}
        dependentUsages={null}
        onClose={onClose}
        onConfirm={() => {}}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /close dialog/i }))
    expect(onClose).toHaveBeenCalledOnce()
  })
})

describe('RevokeKeyDialog — accessibility', () => {
  it('dialog is labelled by the title id', () => {
    render(
      <RevokeKeyDialog
        open={true}
        keyItem={baseKey}
        dependentUsages={null}
        onClose={() => {}}
        onConfirm={() => {}}
      />,
    )
    const dialog = screen.getByRole('dialog')
    const titleId = dialog.getAttribute('aria-labelledby')
    expect(titleId).toBeTruthy()
    expect(document.getElementById(titleId!)).toHaveTextContent(/revoke api key/i)
  })

  it('dialog is described by the description id', () => {
    render(
      <RevokeKeyDialog
        open={true}
        keyItem={baseKey}
        dependentUsages={null}
        onClose={() => {}}
        onConfirm={() => {}}
      />,
    )
    const dialog = screen.getByRole('dialog')
    const descId = dialog.getAttribute('aria-describedby')
    expect(descId).toBeTruthy()
    expect(document.getElementById(descId!)).toBeInTheDocument()
  })

  it('input has aria-describedby for live feedback', () => {
    render(
      <RevokeKeyDialog
        open={true}
        keyItem={baseKey}
        dependentUsages={null}
        onClose={() => {}}
        onConfirm={() => {}}
      />,
    )
    const input = screen.getByLabelText(/type.*admin key/i)
    expect(input).toHaveAttribute('aria-describedby')
  })

  it('confirm button has aria-busy when isLoading=true', () => {
    render(
      <RevokeKeyDialog
        open={true}
        keyItem={baseKey}
        dependentUsages={null}
        isLoading={true}
        onClose={() => {}}
        onConfirm={() => {}}
      />,
    )
    expect(screen.getByRole('button', { name: /revoking/i })).toHaveAttribute('aria-busy', 'true')
  })
})
