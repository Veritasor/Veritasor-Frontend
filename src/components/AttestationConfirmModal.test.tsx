import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import AttestationConfirmModal, {
  type AttestationDetails,
  type FeeInfo,
} from './AttestationConfirmModal'

const details: AttestationDetails = {
  source: 'Stripe',
  period: '2026-08',
  recordCount: 1234,
  merkleRoot: 'abcdef0123456789abcdef0123456789',
}

const feeInfo: FeeInfo = {
  total: 12.5,
  breakdown: [
    { label: 'Base fee', amount: 10 },
    { label: 'Network fee', amount: 2.5 },
  ],
}

function noop() {}

// ─── conditional rendering (the `if (open)` / `if (!open) return null` branches) ──

describe('AttestationConfirmModal - open/close rendering', () => {
  it('renders nothing while closed', () => {
    render(<AttestationConfirmModal open={false} onClose={noop} onConfirm={noop} />)

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('renders an accessible dialog while open', () => {
    render(<AttestationConfirmModal open onClose={noop} onConfirm={noop} details={details} feeInfo={feeInfo} />)

    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).toHaveAttribute('aria-labelledby', 'attest-modal-title')
    expect(dialog).toHaveAttribute('aria-describedby', 'attest-modal-desc')
    expect(document.getElementById('attest-modal-title')).toHaveTextContent(
      'Confirm Revenue Attestation',
    )
    expect(document.getElementById('attest-modal-desc')).toBeInTheDocument()
  })

  it('closes when `open` flips back to false', () => {
    const { rerender } = render(
      <AttestationConfirmModal open onClose={noop} onConfirm={noop} details={details} feeInfo={feeInfo} />,
    )
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    rerender(<AttestationConfirmModal open={false} onClose={noop} onConfirm={noop} />)

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})

// ─── triggerRef: focus move on open, restore on close ──────────────────────

describe('AttestationConfirmModal - trigger focus management', () => {
  it('moves focus to the dialog when it opens', () => {
    const { rerender } = render(
      <AttestationConfirmModal open={false} onClose={noop} onConfirm={noop} />,
    )

    rerender(<AttestationConfirmModal open onClose={noop} onConfirm={noop} />)

    expect(document.activeElement).toBe(screen.getByRole('dialog'))
  })

  it('restores focus to the element that opened the modal', () => {
    function Harness({ open }: { open: boolean }) {
      return (
        <>
          <button type="button" data-testid="trigger">
            Open
          </button>
          <AttestationConfirmModal open={open} onClose={noop} onConfirm={noop} />
        </>
      )
    }

    const { rerender } = render(<Harness open={false} />)
    const trigger = screen.getByTestId('trigger')
    trigger.focus()
    expect(trigger).toHaveFocus()

    rerender(<Harness open />)
    expect(document.activeElement).toBe(screen.getByRole('dialog'))

    rerender(<Harness open={false} />)
    expect(trigger).toHaveFocus()
  })
})

// ─── Escape dismissal and focus trap ───────────────────────────────────────

describe('AttestationConfirmModal - keyboard behavior', () => {
  it('invokes onClose when Escape is pressed', () => {
    const onClose = vi.fn()
    render(<AttestationConfirmModal open onClose={onClose} onConfirm={noop} details={details} feeInfo={feeInfo} />)

    fireEvent.keyDown(document, { key: 'Escape' })

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('wraps focus from the last focusable element to the first on Tab', () => {
    render(<AttestationConfirmModal open onClose={noop} onConfirm={noop} details={details} feeInfo={feeInfo} />)

    const close = screen.getByRole('button', { name: 'Close dialog' })
    const confirm = screen.getByRole('button', { name: 'Confirm & Attest' })

    confirm.focus()
    fireEvent.keyDown(document, { key: 'Tab' })

    expect(close).toHaveFocus()
  })

  it('wraps focus from the first focusable element to the last on Shift+Tab', () => {
    render(<AttestationConfirmModal open onClose={noop} onConfirm={noop} details={details} feeInfo={feeInfo} />)

    const close = screen.getByRole('button', { name: 'Close dialog' })
    const confirm = screen.getByRole('button', { name: 'Confirm & Attest' })

    close.focus()
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true })

    expect(confirm).toHaveFocus()
  })

  it('removes the keydown listener when it closes', () => {
    const onClose = vi.fn()
    const { rerender } = render(
      <AttestationConfirmModal open onClose={onClose} onConfirm={noop} details={details} feeInfo={feeInfo} />,
    )

    rerender(<AttestationConfirmModal open={false} onClose={onClose} onConfirm={noop} />)
    fireEvent.keyDown(document, { key: 'Escape' })

    expect(onClose).not.toHaveBeenCalled()
  })
})

// ─── backdrop / loading interaction ────────────────────────────────────────

describe('AttestationConfirmModal - backdrop and loading', () => {
  it('closes on backdrop click but not on a click inside the dialog', () => {
    const onClose = vi.fn()
    const { container } = render(
      <AttestationConfirmModal open onClose={onClose} onConfirm={noop} details={details} feeInfo={feeInfo} />,
    )

    fireEvent.click(screen.getByRole('dialog'))
    expect(onClose).not.toHaveBeenCalled()

    fireEvent.click(container.querySelector('.modal-backdrop')!)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('ignores backdrop clicks while loading', () => {
    const onClose = vi.fn()
    const { container } = render(
      <AttestationConfirmModal open isLoading onClose={onClose} onConfirm={noop} details={details} feeInfo={feeInfo} />,
    )

    fireEvent.click(container.querySelector('.modal-backdrop')!)

    expect(onClose).not.toHaveBeenCalled()
  })
})

// ─── content: details, fees, errors, actions ───────────────────────────────

describe('AttestationConfirmModal - content and actions', () => {
  it('shows a loading placeholder until details arrive', () => {
    const { rerender } = render(
      <AttestationConfirmModal open onClose={noop} onConfirm={noop} details={null} feeInfo={null} />,
    )
    expect(screen.getByText(/Loading attestation details/i)).toBeInTheDocument()

    rerender(
      <AttestationConfirmModal open onClose={noop} onConfirm={noop} details={details} feeInfo={feeInfo} />,
    )
    expect(screen.queryByText(/Loading attestation details/i)).not.toBeInTheDocument()
    expect(screen.getByText('Stripe')).toBeInTheDocument()
    expect(screen.getByText('2026-08')).toBeInTheDocument()
  })

  it('toggles the fee breakdown list', () => {
    const { container } = render(
      <AttestationConfirmModal open onClose={noop} onConfirm={noop} details={details} feeInfo={feeInfo} />,
    )

    expect(container.querySelector('#fee-breakdown-list')).toBeNull()
    const toggle = screen.getByRole('button', { name: 'View breakdown' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')

    fireEvent.click(toggle)
    expect(screen.getByRole('button', { name: 'Hide breakdown' })).toHaveAttribute(
      'aria-expanded',
      'true',
    )
    expect(container.querySelector('#fee-breakdown-list')).toBeInTheDocument()
    expect(screen.getByText(/Base fee/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Hide breakdown' }))
    expect(screen.queryByText(/Base fee/)).not.toBeInTheDocument()
  })

  it('shows the error alert only when an error is present', () => {
    const { rerender } = render(
      <AttestationConfirmModal open onClose={noop} onConfirm={noop} details={details} feeInfo={feeInfo} />,
    )
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()

    rerender(
      <AttestationConfirmModal
        open
        onClose={noop}
        onConfirm={noop}
        details={details}
        feeInfo={feeInfo}
        error="Attestation failed: nonce already used"
      />,
    )
    expect(screen.getByRole('alert')).toHaveTextContent('Attestation failed: nonce already used')
  })

  it('wires the confirm and cancel actions', () => {
    const onClose = vi.fn()
    const onConfirm = vi.fn()
    render(
      <AttestationConfirmModal open onClose={onClose} onConfirm={onConfirm} details={details} feeInfo={feeInfo} />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Confirm & Attest' }))
    expect(onConfirm).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('disables both actions and marks the dialog busy while loading', () => {
    render(
      <AttestationConfirmModal open isLoading onClose={noop} onConfirm={noop} details={details} feeInfo={feeInfo} />,
    )

    const confirm = screen.getByRole('button', { name: 'Attesting…' })
    expect(confirm).toBeDisabled()
    expect(confirm).toHaveAttribute('aria-busy', 'true')
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Close dialog' })).toBeEnabled()
  })
})
