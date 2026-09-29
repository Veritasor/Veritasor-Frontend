import { useState } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import AttestationConfirmModal, {
  type AttestationDetails,
  type FeeBreakdownItem,
  type FeeInfo,
} from '../components/AttestationConfirmModal'
import Dashboard from '../pages/Dashboard'

function renderWithRouter(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>)
}

const DEMO_DETAILS = {
  source: 'Stripe (live)',
  period: 'May 2026',
  recordCount: 1247,
  merkleRoot: '0x4a2f8c3d1e6b9f0a2d5c8e1b4f7a0d3c6e9b2f5a8d1c4e7b0a3f6c9d2e5b8a1c4',
}

// ─── AttestationConfirmModal ───────────────────────────────────────────────────

describe('AttestationConfirmModal', () => {
  describe('when closed', () => {
    it('renders nothing when open=false', () => {
      renderWithRouter(
        <AttestationConfirmModal open={false} onClose={vi.fn()} onConfirm={vi.fn()} />,
      )
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('does not run backdrop behavior while closed', () => {
      const onClose = vi.fn()
      const { container } = renderWithRouter(
        <AttestationConfirmModal open={false} onClose={onClose} onConfirm={vi.fn()} />,
      )

      expect(container.querySelector('.modal-backdrop')).toBeNull()
      expect(onClose).not.toHaveBeenCalled()
    })

    it('does not render the title when closed', () => {
      renderWithRouter(
        <AttestationConfirmModal open={false} onClose={vi.fn()} onConfirm={vi.fn()} />,
      )
      expect(screen.queryByText(/confirm revenue attestation/i)).not.toBeInTheDocument()
    })
  })

  describe('when open — ARIA and structure', () => {
    it('renders a dialog element', () => {
      renderWithRouter(
        <AttestationConfirmModal open onClose={vi.fn()} onConfirm={vi.fn()} />,
      )
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    it('dialog has aria-modal="true"', () => {
      renderWithRouter(
        <AttestationConfirmModal open onClose={vi.fn()} onConfirm={vi.fn()} />,
      )
      expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true')
    })

    it('dialog has aria-labelledby pointing to the title', () => {
      renderWithRouter(
        <AttestationConfirmModal open onClose={vi.fn()} onConfirm={vi.fn()} />,
      )
      expect(screen.getByRole('dialog')).toHaveAttribute(
        'aria-labelledby',
        'attest-modal-title',
      )
      expect(document.getElementById('attest-modal-title')).toHaveTextContent(
        /confirm revenue attestation/i,
      )
    })

    it('dialog has aria-describedby pointing to the description', () => {
      renderWithRouter(
        <AttestationConfirmModal open onClose={vi.fn()} onConfirm={vi.fn()} />,
      )
      expect(screen.getByRole('dialog')).toHaveAttribute(
        'aria-describedby',
        'attest-modal-desc',
      )
      expect(document.getElementById('attest-modal-desc')).toBeInTheDocument()
    })

    it('renders the modal title', () => {
      renderWithRouter(
        <AttestationConfirmModal open onClose={vi.fn()} onConfirm={vi.fn()} />,
      )
      expect(
        screen.getByRole('heading', { name: /confirm revenue attestation/i }),
      ).toBeInTheDocument()
    })

    it('renders the description text', () => {
      renderWithRouter(
        <AttestationConfirmModal open onClose={vi.fn()} onConfirm={vi.fn()} />,
      )
      expect(screen.getByText(/immutable on-chain record/i)).toBeInTheDocument()
    })

    it('renders the warning about irreversibility', () => {
      renderWithRouter(
        <AttestationConfirmModal open onClose={vi.fn()} onConfirm={vi.fn()} />,
      )
      expect(screen.getByText(/cannot be undone/i)).toBeInTheDocument()
    })

    it('renders the close button with accessible label', () => {
      renderWithRouter(
        <AttestationConfirmModal open onClose={vi.fn()} onConfirm={vi.fn()} />,
      )
      expect(screen.getByRole('button', { name: /close dialog/i })).toBeInTheDocument()
    })

    it('renders Cancel button', () => {
      renderWithRouter(
        <AttestationConfirmModal open onClose={vi.fn()} onConfirm={vi.fn()} />,
      )
      expect(screen.getByRole('button', { name: /^cancel$/i })).toBeInTheDocument()
    })

    it('renders Confirm & Attest button', () => {
      renderWithRouter(
        <AttestationConfirmModal open onClose={vi.fn()} onConfirm={vi.fn()} />,
      )
      expect(screen.getByRole('button', { name: /confirm & attest/i })).toBeInTheDocument()
    })
  })

  describe('attestation details', () => {
    it('shows source when details are provided', () => {
      renderWithRouter(
        <AttestationConfirmModal open onClose={vi.fn()} onConfirm={vi.fn()} details={DEMO_DETAILS} />,
      )
      expect(screen.getByText('Stripe (live)')).toBeInTheDocument()
    })

    it('shows period when details are provided', () => {
      renderWithRouter(
        <AttestationConfirmModal open onClose={vi.fn()} onConfirm={vi.fn()} details={DEMO_DETAILS} />,
      )
      expect(screen.getByText('May 2026')).toBeInTheDocument()
    })

    it('shows formatted record count', () => {
      renderWithRouter(
        <AttestationConfirmModal open onClose={vi.fn()} onConfirm={vi.fn()} details={DEMO_DETAILS} />,
      )
      expect(screen.getByText(/1,247 transactions/i)).toBeInTheDocument()
    })

    it('shows truncated Merkle root', () => {
      renderWithRouter(
        <AttestationConfirmModal open onClose={vi.fn()} onConfirm={vi.fn()} details={DEMO_DETAILS} />,
      )
      expect(screen.getByText(/0x4a2f8c3d1e6b9f0a/)).toBeInTheDocument()
    })

    it('shows loading placeholder when details are null', () => {
      renderWithRouter(
        <AttestationConfirmModal open onClose={vi.fn()} onConfirm={vi.fn()} details={null} />,
      )
      expect(screen.getByText(/loading attestation details/i)).toBeInTheDocument()
    })

    it('loading placeholder has aria-busy="true"', () => {
      renderWithRouter(
        <AttestationConfirmModal open onClose={vi.fn()} onConfirm={vi.fn()} details={null} />,
      )
      expect(screen.getByText(/loading attestation details/i)).toHaveAttribute(
        'aria-busy',
        'true',
      )
    })

    it('does not show summary dl when details are null', () => {
      renderWithRouter(
        <AttestationConfirmModal open onClose={vi.fn()} onConfirm={vi.fn()} details={null} />,
      )
      expect(screen.queryByRole('term')).not.toBeInTheDocument()
    })
  })

  describe('error state', () => {
    it('shows error message with role="alert" when error is set', () => {
      renderWithRouter(
        <AttestationConfirmModal
          open
          onClose={vi.fn()}
          onConfirm={vi.fn()}
          error="Network timeout. Please retry."
        />,
      )
      expect(screen.getByRole('alert')).toHaveTextContent(/network timeout/i)
    })

    it('does not render alert when error is null', () => {
      renderWithRouter(
        <AttestationConfirmModal open onClose={vi.fn()} onConfirm={vi.fn()} error={null} />,
      )
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })

    it('does not render alert when error is undefined (default)', () => {
      renderWithRouter(
        <AttestationConfirmModal open onClose={vi.fn()} onConfirm={vi.fn()} />,
      )
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })
  })

  describe('loading state', () => {
    it('shows "Attesting…" on the confirm button when loading', () => {
      renderWithRouter(
        <AttestationConfirmModal open onClose={vi.fn()} onConfirm={vi.fn()} isLoading />,
      )
      expect(screen.getByRole('button', { name: /attesting/i })).toBeInTheDocument()
    })

    it('confirm button is disabled when loading', () => {
      renderWithRouter(
        <AttestationConfirmModal open onClose={vi.fn()} onConfirm={vi.fn()} isLoading />,
      )
      expect(screen.getByRole('button', { name: /attesting/i })).toBeDisabled()
    })

    it('confirm button has aria-busy="true" when loading', () => {
      renderWithRouter(
        <AttestationConfirmModal open onClose={vi.fn()} onConfirm={vi.fn()} isLoading />,
      )
      expect(screen.getByRole('button', { name: /attesting/i })).toHaveAttribute(
        'aria-busy',
        'true',
      )
    })

    it('cancel button is disabled when loading', () => {
      renderWithRouter(
        <AttestationConfirmModal open onClose={vi.fn()} onConfirm={vi.fn()} isLoading />,
      )
      expect(screen.getByRole('button', { name: /^cancel$/i })).toBeDisabled()
    })

    it('close button remains enabled during loading', () => {
      renderWithRouter(
        <AttestationConfirmModal open onClose={vi.fn()} onConfirm={vi.fn()} isLoading />,
      )
      expect(screen.getByRole('button', { name: /close dialog/i })).not.toBeDisabled()
    })

    it('confirm button has aria-busy="false" when not loading', () => {
      renderWithRouter(
        <AttestationConfirmModal open onClose={vi.fn()} onConfirm={vi.fn()} isLoading={false} />,
      )
      expect(
        screen.getByRole('button', { name: /confirm & attest/i }),
      ).toHaveAttribute('aria-busy', 'false')
    })
  })

  describe('dismissal actions', () => {
    it('calls onClose when close button is clicked', () => {
      const onClose = vi.fn()
      renderWithRouter(
        <AttestationConfirmModal open onClose={onClose} onConfirm={vi.fn()} />,
      )
      fireEvent.click(screen.getByRole('button', { name: /close dialog/i }))
      expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('calls onClose when Cancel is clicked', () => {
      const onClose = vi.fn()
      renderWithRouter(
        <AttestationConfirmModal open onClose={onClose} onConfirm={vi.fn()} />,
      )
      fireEvent.click(screen.getByRole('button', { name: /^cancel$/i }))
      expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('calls onClose when backdrop is clicked', () => {
      const onClose = vi.fn()
      const { container } = renderWithRouter(
        <AttestationConfirmModal open onClose={onClose} onConfirm={vi.fn()} />,
      )
      fireEvent.click(container.querySelector('.modal-backdrop')!)
      expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('does NOT call onClose when clicking inside the dialog', () => {
      const onClose = vi.fn()
      renderWithRouter(
        <AttestationConfirmModal open onClose={onClose} onConfirm={vi.fn()} />,
      )
      fireEvent.click(screen.getByRole('dialog'))
      expect(onClose).not.toHaveBeenCalled()
    })

    it('does NOT call onClose on backdrop click when loading', () => {
      const onClose = vi.fn()
      const { container } = renderWithRouter(
        <AttestationConfirmModal open onClose={onClose} onConfirm={vi.fn()} isLoading />,
      )
      fireEvent.click(container.querySelector('.modal-backdrop')!)
      expect(onClose).not.toHaveBeenCalled()
    })

    it('calls onConfirm when Confirm & Attest is clicked', () => {
      const onConfirm = vi.fn()
      renderWithRouter(
        <AttestationConfirmModal open onClose={vi.fn()} onConfirm={onConfirm} />,
      )
      fireEvent.click(screen.getByRole('button', { name: /confirm & attest/i }))
      expect(onConfirm).toHaveBeenCalledTimes(1)
    })
  })

  describe('handleBackdropClick branch (src/components/AttestationConfirmModal.tsx:89)', () => {
    function ControlledModalWrapper({ initialLoading = false }: { initialLoading?: boolean }) {
      const [open, setOpen] = useState(true)
      const [loading, setLoading] = useState(initialLoading)

      return (
        <div>
          <button type="button" onClick={() => setLoading(!loading)}>
            Toggle Loading
          </button>
          <AttestationConfirmModal
            open={open}
            onClose={() => setOpen(false)}
            onConfirm={vi.fn()}
            isLoading={loading}
            details={DEMO_DETAILS}
          />
        </div>
      )
    }

    it('does not dismiss modal or trigger onClose when backdrop is clicked while isLoading is true', () => {
      const onClose = vi.fn()
      const { container } = renderWithRouter(
        <AttestationConfirmModal open onClose={onClose} onConfirm={vi.fn()} isLoading={true} />,
      )

      const backdrop = container.querySelector('.modal-backdrop')
      expect(backdrop).toBeInTheDocument()

      fireEvent.click(backdrop!)

      // Assert non-invocation of callback (failure to dismiss branch)
      expect(onClose).not.toHaveBeenCalled()
      // Assert visible outcome: dialog remains visible and in loading state
      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /attesting/i })).toBeDisabled()
      expect(screen.getByRole('button', { name: /^cancel$/i })).toBeDisabled()
    })

    it('preserves visible modal state in controlled consumer when backdrop is clicked during loading', () => {
      const { container } = renderWithRouter(<ControlledModalWrapper initialLoading={true} />)

      expect(screen.getByRole('dialog')).toBeInTheDocument()
      const backdrop = container.querySelector('.modal-backdrop')
      fireEvent.click(backdrop!)

      // Modal must remain open and visible in DOM
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    it('triggers onClose and visibly dismisses modal when backdrop is clicked and isLoading is false', () => {
      const onClose = vi.fn()
      const { container } = renderWithRouter(
        <AttestationConfirmModal open onClose={onClose} onConfirm={vi.fn()} isLoading={false} />,
      )

      const backdrop = container.querySelector('.modal-backdrop')
      fireEvent.click(backdrop!)

      expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('visibly unmounts modal in controlled consumer when backdrop is clicked and not loading', () => {
      const { container } = renderWithRouter(<ControlledModalWrapper initialLoading={false} />)

      expect(screen.getByRole('dialog')).toBeInTheDocument()
      const backdrop = container.querySelector('.modal-backdrop')
      fireEvent.click(backdrop!)

      // Visible outcome: dialog is removed from the DOM
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('handles dynamic isLoading state transitions on backdrop click deterministically', () => {
      const { container } = renderWithRouter(<ControlledModalWrapper initialLoading={true} />)

      const backdrop = container.querySelector('.modal-backdrop')
      // While loading, backdrop click should not close modal
      fireEvent.click(backdrop!)
      expect(screen.getByRole('dialog')).toBeInTheDocument()

      // Toggle loading to false
      fireEvent.click(screen.getByRole('button', { name: /toggle loading/i }))

      // Now backdrop click should dismiss modal
      fireEvent.click(backdrop!)
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('does not trigger handleBackdropClick when clicking inside modal dialog content', () => {
      const onClose = vi.fn()
      renderWithRouter(
        <AttestationConfirmModal open onClose={onClose} onConfirm={vi.fn()} isLoading={false} />,
      )

      fireEvent.click(screen.getByRole('dialog'))
      expect(onClose).not.toHaveBeenCalled()
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })
  })

  describe('keyboard interactions', () => {
    it('Escape key calls onClose', () => {
      const onClose = vi.fn()
      renderWithRouter(
        <AttestationConfirmModal open onClose={onClose} onConfirm={vi.fn()} />,
      )
      fireEvent.keyDown(document, { key: 'Escape' })
      expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('Escape key does nothing when modal is closed (no listener)', () => {
      const onClose = vi.fn()
      renderWithRouter(
        <AttestationConfirmModal open={false} onClose={onClose} onConfirm={vi.fn()} />,
      )
      fireEvent.keyDown(document, { key: 'Escape' })
      expect(onClose).not.toHaveBeenCalled()
    })

    it('other keys do not call onClose', () => {
      const onClose = vi.fn()
      renderWithRouter(
        <AttestationConfirmModal open onClose={onClose} onConfirm={vi.fn()} />,
      )
      fireEvent.keyDown(document, { key: 'Enter' })
      fireEvent.keyDown(document, { key: 'ArrowDown' })
      expect(onClose).not.toHaveBeenCalled()
    })

    it('Tab from last focusable wraps to first (focus trap)', () => {
      renderWithRouter(
        <AttestationConfirmModal open onClose={vi.fn()} onConfirm={vi.fn()} details={DEMO_DETAILS} />,
      )
      const dialog = screen.getByRole('dialog')
      const focusable = Array.from(
        dialog.querySelectorAll<HTMLElement>('button:not([disabled])'),
      )
      const last = focusable[focusable.length - 1]
      const first = focusable[0]

      last.focus()
      expect(document.activeElement).toBe(last)

      fireEvent.keyDown(document, { key: 'Tab', shiftKey: false })
      expect(document.activeElement).toBe(first)
    })

    it('Shift+Tab from first focusable wraps to last (focus trap)', () => {
      renderWithRouter(
        <AttestationConfirmModal open onClose={vi.fn()} onConfirm={vi.fn()} details={DEMO_DETAILS} />,
      )
      const dialog = screen.getByRole('dialog')
      const focusable = Array.from(
        dialog.querySelectorAll<HTMLElement>('button:not([disabled])'),
      )
      const first = focusable[0]
      const last = focusable[focusable.length - 1]

      first.focus()
      expect(document.activeElement).toBe(first)

      fireEvent.keyDown(document, { key: 'Tab', shiftKey: true })
      expect(document.activeElement).toBe(last)
    })

    it('Tab from non-last element does not wrap (browser handles naturally)', () => {
      renderWithRouter(
        <AttestationConfirmModal open onClose={vi.fn()} onConfirm={vi.fn()} details={DEMO_DETAILS} />,
      )
      const dialog = screen.getByRole('dialog')
      const focusable = Array.from(
        dialog.querySelectorAll<HTMLElement>('button:not([disabled])'),
      )
      // Focus an element that is not the last
      if (focusable.length > 1) {
        focusable[0].focus()
        const before = document.activeElement
        fireEvent.keyDown(document, { key: 'Tab', shiftKey: false })
        // Focus should stay on the same element (no custom wrapping triggered)
        expect(document.activeElement).toBe(before)
      }
    })

    it('Shift+Tab from non-first element does not wrap', () => {
      renderWithRouter(
        <AttestationConfirmModal open onClose={vi.fn()} onConfirm={vi.fn()} details={DEMO_DETAILS} />,
      )
      const dialog = screen.getByRole('dialog')
      const focusable = Array.from(
        dialog.querySelectorAll<HTMLElement>('button:not([disabled])'),
      )
      if (focusable.length > 1) {
        focusable[focusable.length - 1].focus()
        const before = document.activeElement
        fireEvent.keyDown(document, { key: 'Tab', shiftKey: true })
        expect(document.activeElement).toBe(before)
      }
    })
  })

  describe('focus management', () => {
    it('moves focus to dialog when modal opens', () => {
      const { rerender } = renderWithRouter(
        <AttestationConfirmModal open={false} onClose={vi.fn()} onConfirm={vi.fn()} />,
      )
      rerender(
        <MemoryRouter>
          <AttestationConfirmModal open={true} onClose={vi.fn()} onConfirm={vi.fn()} />
        </MemoryRouter>,
      )
      expect(document.activeElement).toBe(screen.getByRole('dialog'))
    })

    it('restores focus to the trigger element when modal closes', () => {
      function Wrapper() {
        const [open, setOpen] = useState(false)
        return (
          <>
            <button type="button" onClick={() => setOpen(true)}>
              Open modal
            </button>
            <AttestationConfirmModal
              open={open}
              onClose={() => setOpen(false)}
              onConfirm={vi.fn()}
              details={DEMO_DETAILS}
            />
          </>
        )
      }
      renderWithRouter(<Wrapper />)
      const trigger = screen.getByRole('button', { name: /open modal/i })

      trigger.focus()
      fireEvent.click(trigger)
      expect(screen.getByRole('dialog')).toBeInTheDocument()

      fireEvent.keyDown(document, { key: 'Escape' })
      expect(document.activeElement).toBe(trigger)
    })
  })
})

// ─── FeeInfo / FeeBreakdownItem ───────────────────────────────────────────────

/** Typed fixtures that satisfy the exported interfaces. */
const SINGLE_ITEM_FEE: FeeInfo = {
  total: 0.025,
  breakdown: [{ label: 'Base fee', amount: 0.025 }],
}

const MULTI_ITEM_FEE: FeeInfo = {
  total: 1.075,
  breakdown: [
    { label: 'Base fee', amount: 0.025 },
    { label: 'Storage fee', amount: 0.05 },
    { label: 'Network fee', amount: 1.0 },
  ],
}

const ZERO_FEE: FeeInfo = {
  total: 0,
  breakdown: [{ label: 'Subsidised', amount: 0 }],
}

const LARGE_FEE: FeeInfo = {
  total: 1_000_000,
  breakdown: [{ label: 'Bulk processing', amount: 1_000_000 }],
}

describe('AttestationConfirmModal — FeeInfo display', () => {
  describe('when feeInfo is null (calculating)', () => {
    it('renders "Calculating fee…" placeholder', () => {
      renderWithRouter(
        <AttestationConfirmModal open onClose={vi.fn()} onConfirm={vi.fn()} feeInfo={null} />,
      )
      expect(screen.getByText(/calculating fee/i)).toBeInTheDocument()
    })

    it('calculating placeholder has aria-live="polite"', () => {
      renderWithRouter(
        <AttestationConfirmModal open onClose={vi.fn()} onConfirm={vi.fn()} feeInfo={null} />,
      )
      expect(screen.getByText(/calculating fee/i)).toHaveAttribute('aria-live', 'polite')
    })

    it('does not render the fee-toggle button when feeInfo is null', () => {
      renderWithRouter(
        <AttestationConfirmModal open onClose={vi.fn()} onConfirm={vi.fn()} feeInfo={null} />,
      )
      expect(
        screen.queryByRole('button', { name: /view breakdown|hide breakdown/i }),
      ).not.toBeInTheDocument()
    })

    it('does not render the breakdown list when feeInfo is null', () => {
      renderWithRouter(
        <AttestationConfirmModal open onClose={vi.fn()} onConfirm={vi.fn()} feeInfo={null} />,
      )
      expect(document.getElementById('fee-breakdown-list')).not.toBeInTheDocument()
    })
  })

  describe('when feeInfo is provided — compact total', () => {
    it('renders the total fee with "XLM" unit', () => {
      renderWithRouter(
        <AttestationConfirmModal
          open
          onClose={vi.fn()}
          onConfirm={vi.fn()}
          feeInfo={SINGLE_ITEM_FEE}
        />,
      )
      expect(screen.getByText(/0\.025 XLM/)).toBeInTheDocument()
    })

    it('formats a large total with locale thousands separator', () => {
      renderWithRouter(
        <AttestationConfirmModal
          open
          onClose={vi.fn()}
          onConfirm={vi.fn()}
          feeInfo={LARGE_FEE}
        />,
      )
      expect(screen.getByText(/1,000,000 XLM/)).toBeInTheDocument()
    })

    it('renders zero-fee total as "0 XLM"', () => {
      renderWithRouter(
        <AttestationConfirmModal
          open
          onClose={vi.fn()}
          onConfirm={vi.fn()}
          feeInfo={ZERO_FEE}
        />,
      )
      expect(screen.getByText(/0 XLM/)).toBeInTheDocument()
    })

    it('renders the fee section with an accessible heading', () => {
      renderWithRouter(
        <AttestationConfirmModal
          open
          onClose={vi.fn()}
          onConfirm={vi.fn()}
          feeInfo={SINGLE_ITEM_FEE}
        />,
      )
      expect(screen.getByRole('heading', { name: /estimated fee/i })).toBeInTheDocument()
    })
  })

  describe('when feeInfo is provided — breakdown toggle', () => {
    it('renders "View breakdown" toggle button when feeInfo is set', () => {
      renderWithRouter(
        <AttestationConfirmModal
          open
          onClose={vi.fn()}
          onConfirm={vi.fn()}
          feeInfo={SINGLE_ITEM_FEE}
        />,
      )
      expect(
        screen.getByRole('button', { name: /view breakdown/i }),
      ).toBeInTheDocument()
    })

    it('toggle button starts with aria-expanded="false"', () => {
      renderWithRouter(
        <AttestationConfirmModal
          open
          onClose={vi.fn()}
          onConfirm={vi.fn()}
          feeInfo={SINGLE_ITEM_FEE}
        />,
      )
      const toggle = screen.getByRole('button', { name: /view breakdown/i })
      expect(toggle).toHaveAttribute('aria-expanded', 'false')
    })

    it('clicking toggle reveals the breakdown list', () => {
      renderWithRouter(
        <AttestationConfirmModal
          open
          onClose={vi.fn()}
          onConfirm={vi.fn()}
          feeInfo={SINGLE_ITEM_FEE}
        />,
      )
      fireEvent.click(screen.getByRole('button', { name: /view breakdown/i }))
      expect(document.getElementById('fee-breakdown-list')).toBeInTheDocument()
    })

    it('clicking toggle changes button label to "Hide breakdown"', () => {
      renderWithRouter(
        <AttestationConfirmModal
          open
          onClose={vi.fn()}
          onConfirm={vi.fn()}
          feeInfo={SINGLE_ITEM_FEE}
        />,
      )
      fireEvent.click(screen.getByRole('button', { name: /view breakdown/i }))
      expect(screen.getByRole('button', { name: /hide breakdown/i })).toBeInTheDocument()
    })

    it('toggle button has aria-expanded="true" when breakdown is visible', () => {
      renderWithRouter(
        <AttestationConfirmModal
          open
          onClose={vi.fn()}
          onConfirm={vi.fn()}
          feeInfo={SINGLE_ITEM_FEE}
        />,
      )
      fireEvent.click(screen.getByRole('button', { name: /view breakdown/i }))
      expect(
        screen.getByRole('button', { name: /hide breakdown/i }),
      ).toHaveAttribute('aria-expanded', 'true')
    })

    it('toggle button has aria-controls="fee-breakdown-list"', () => {
      renderWithRouter(
        <AttestationConfirmModal
          open
          onClose={vi.fn()}
          onConfirm={vi.fn()}
          feeInfo={SINGLE_ITEM_FEE}
        />,
      )
      const toggle = screen.getByRole('button', { name: /view breakdown/i })
      expect(toggle).toHaveAttribute('aria-controls', 'fee-breakdown-list')
    })

    it('clicking "Hide breakdown" collapses the list again', () => {
      renderWithRouter(
        <AttestationConfirmModal
          open
          onClose={vi.fn()}
          onConfirm={vi.fn()}
          feeInfo={SINGLE_ITEM_FEE}
        />,
      )
      fireEvent.click(screen.getByRole('button', { name: /view breakdown/i }))
      fireEvent.click(screen.getByRole('button', { name: /hide breakdown/i }))
      expect(document.getElementById('fee-breakdown-list')).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: /view breakdown/i })).toBeInTheDocument()
    })

    it('breakdown list is not rendered initially (collapsed by default)', () => {
      renderWithRouter(
        <AttestationConfirmModal
          open
          onClose={vi.fn()}
          onConfirm={vi.fn()}
          feeInfo={MULTI_ITEM_FEE}
        />,
      )
      expect(document.getElementById('fee-breakdown-list')).not.toBeInTheDocument()
    })
  })

  describe('FeeBreakdownItem — breakdown list contents', () => {
    it('renders all FeeBreakdownItem entries after expanding', () => {
      renderWithRouter(
        <AttestationConfirmModal
          open
          onClose={vi.fn()}
          onConfirm={vi.fn()}
          feeInfo={MULTI_ITEM_FEE}
        />,
      )
      fireEvent.click(screen.getByRole('button', { name: /view breakdown/i }))
      expect(screen.getByText(/base fee/i)).toBeInTheDocument()
      expect(screen.getByText(/storage fee/i)).toBeInTheDocument()
      expect(screen.getByText(/network fee/i)).toBeInTheDocument()
    })

    it('each breakdown item shows its amount with "XLM" unit', () => {
      renderWithRouter(
        <AttestationConfirmModal
          open
          onClose={vi.fn()}
          onConfirm={vi.fn()}
          feeInfo={MULTI_ITEM_FEE}
        />,
      )
      fireEvent.click(screen.getByRole('button', { name: /view breakdown/i }))
      // The component renders each <li> with split text nodes: "Label: amount XLM"
      // Use a function matcher to match across the full textContent of each list item.
      const items = Array.from(
        document.getElementById('fee-breakdown-list')!.querySelectorAll('li'),
      ).map((li) => li.textContent ?? '')
      expect(items.some((t) => t.includes('Base fee') && t.includes('0.025') && t.includes('XLM'))).toBe(true)
      expect(items.some((t) => t.includes('Storage fee') && t.includes('0.05') && t.includes('XLM'))).toBe(true)
      expect(items.some((t) => t.includes('Network fee') && t.includes('1') && t.includes('XLM'))).toBe(true)
    })

    it('renders a single-item breakdown correctly', () => {
      renderWithRouter(
        <AttestationConfirmModal
          open
          onClose={vi.fn()}
          onConfirm={vi.fn()}
          feeInfo={SINGLE_ITEM_FEE}
        />,
      )
      fireEvent.click(screen.getByRole('button', { name: /view breakdown/i }))
      const list = document.getElementById('fee-breakdown-list')
      expect(list).toBeInTheDocument()
      expect(list!.querySelectorAll('li')).toHaveLength(1)
    })

    it('renders a zero-amount FeeBreakdownItem correctly', () => {
      renderWithRouter(
        <AttestationConfirmModal
          open
          onClose={vi.fn()}
          onConfirm={vi.fn()}
          feeInfo={ZERO_FEE}
        />,
      )
      fireEvent.click(screen.getByRole('button', { name: /view breakdown/i }))
      expect(screen.getByText(/subsidised.*0 XLM/i)).toBeInTheDocument()
    })

    it('formats large breakdown amounts with locale separators', () => {
      renderWithRouter(
        <AttestationConfirmModal
          open
          onClose={vi.fn()}
          onConfirm={vi.fn()}
          feeInfo={LARGE_FEE}
        />,
      )
      fireEvent.click(screen.getByRole('button', { name: /view breakdown/i }))
      // Text is split across multiple nodes: "Bulk processing", ":", "1,000,000", " XLM"
      const items = Array.from(
        document.getElementById('fee-breakdown-list')!.querySelectorAll('li'),
      ).map((li) => li.textContent ?? '')
      expect(
        items.some((t) => t.includes('Bulk processing') && t.includes('1,000,000') && t.includes('XLM')),
      ).toBe(true)
    })

    it('breakdown list has correct id for aria-controls reference', () => {
      renderWithRouter(
        <AttestationConfirmModal
          open
          onClose={vi.fn()}
          onConfirm={vi.fn()}
          feeInfo={MULTI_ITEM_FEE}
        />,
      )
      fireEvent.click(screen.getByRole('button', { name: /view breakdown/i }))
      expect(document.getElementById('fee-breakdown-list')).toBeInTheDocument()
    })
  })

  describe('FeeInfo — invalid / boundary inputs', () => {
    it('handles a FeeInfo with an empty breakdown array (no line items)', () => {
      const emptyBreakdown: FeeInfo = { total: 0.5, breakdown: [] }
      renderWithRouter(
        <AttestationConfirmModal
          open
          onClose={vi.fn()}
          onConfirm={vi.fn()}
          feeInfo={emptyBreakdown}
        />,
      )
      // Total is still shown
      expect(screen.getByText(/0\.5 XLM/)).toBeInTheDocument()
      // Toggle is rendered even with empty breakdown
      fireEvent.click(screen.getByRole('button', { name: /view breakdown/i }))
      const list = document.getElementById('fee-breakdown-list')
      expect(list).toBeInTheDocument()
      expect(list!.querySelectorAll('li')).toHaveLength(0)
    })

    it('handles a negative total fee without throwing', () => {
      // Negative values are not expected in production but the component
      // must not crash — it should render whatever the number serialises to.
      const negativeFee: FeeInfo = { total: -1, breakdown: [{ label: 'Refund', amount: -1 }] }
      expect(() =>
        renderWithRouter(
          <AttestationConfirmModal
            open
            onClose={vi.fn()}
            onConfirm={vi.fn()}
            feeInfo={negativeFee}
          />,
        ),
      ).not.toThrow()
      expect(screen.getByText(/-1 XLM/)).toBeInTheDocument()
    })

    it('handles a very long FeeBreakdownItem label without crashing', () => {
      const longLabel = 'A'.repeat(300)
      const longLabelFee: FeeInfo = { total: 0.1, breakdown: [{ label: longLabel, amount: 0.1 }] }
      expect(() =>
        renderWithRouter(
          <AttestationConfirmModal
            open
            onClose={vi.fn()}
            onConfirm={vi.fn()}
            feeInfo={longLabelFee}
          />,
        ),
      ).not.toThrow()
      fireEvent.click(screen.getByRole('button', { name: /view breakdown/i }))
      expect(screen.getByText(new RegExp(longLabel.slice(0, 20)))).toBeInTheDocument()
    })

    it('handles a FeeInfo with many breakdown items without crashing', () => {
      const items: FeeBreakdownItem[] = Array.from({ length: 50 }, (_, i) => ({
        label: `Fee item ${i + 1}`,
        amount: 0.001,
      }))
      const bigFee: FeeInfo = { total: 0.05, breakdown: items }
      expect(() =>
        renderWithRouter(
          <AttestationConfirmModal
            open
            onClose={vi.fn()}
            onConfirm={vi.fn()}
            feeInfo={bigFee}
          />,
        ),
      ).not.toThrow()
      fireEvent.click(screen.getByRole('button', { name: /view breakdown/i }))
      expect(document.getElementById('fee-breakdown-list')!.querySelectorAll('li')).toHaveLength(50)
    })
  })

  describe('AttestationDetails — invalid / boundary inputs', () => {
    it('handles recordCount of 0', () => {
      const zeroRecords: AttestationDetails = {
        ...DEMO_DETAILS,
        recordCount: 0,
      }
      renderWithRouter(
        <AttestationConfirmModal
          open
          onClose={vi.fn()}
          onConfirm={vi.fn()}
          details={zeroRecords}
        />,
      )
      expect(screen.getByText(/0 transactions/i)).toBeInTheDocument()
    })

    it('handles a very large recordCount with locale formatting', () => {
      const bigRecords: AttestationDetails = {
        ...DEMO_DETAILS,
        recordCount: 9_999_999,
      }
      renderWithRouter(
        <AttestationConfirmModal
          open
          onClose={vi.fn()}
          onConfirm={vi.fn()}
          details={bigRecords}
        />,
      )
      expect(screen.getByText(/9,999,999 transactions/i)).toBeInTheDocument()
    })

    it('truncates merkleRoot longer than 18 characters', () => {
      const longRoot: AttestationDetails = {
        ...DEMO_DETAILS,
        merkleRoot: '0x' + 'a'.repeat(80),
      }
      renderWithRouter(
        <AttestationConfirmModal
          open
          onClose={vi.fn()}
          onConfirm={vi.fn()}
          details={longRoot}
        />,
      )
      // Displayed value is the first 18 chars + ellipsis
      expect(screen.getByText(/0xaaaaaaaaaaaaaaaa…/)).toBeInTheDocument()
    })

    it('handles an empty string merkleRoot without crashing', () => {
      const emptyRoot: AttestationDetails = { ...DEMO_DETAILS, merkleRoot: '' }
      expect(() =>
        renderWithRouter(
          <AttestationConfirmModal
            open
            onClose={vi.fn()}
            onConfirm={vi.fn()}
            details={emptyRoot}
          />,
        ),
      ).not.toThrow()
    })

    it('handles a short merkleRoot (< 18 chars) without crashing', () => {
      const shortRoot: AttestationDetails = { ...DEMO_DETAILS, merkleRoot: '0x1234' }
      expect(() =>
        renderWithRouter(
          <AttestationConfirmModal
            open
            onClose={vi.fn()}
            onConfirm={vi.fn()}
            details={shortRoot}
          />,
        ),
      ).not.toThrow()
      // slice(0,18) of a short string is the string itself
      expect(screen.getByText(/0x1234…/)).toBeInTheDocument()
    })
  })

  describe('combined FeeInfo + AttestationDetails', () => {
    it('renders both details and fee sections together without conflict', () => {
      renderWithRouter(
        <AttestationConfirmModal
          open
          onClose={vi.fn()}
          onConfirm={vi.fn()}
          details={DEMO_DETAILS}
          feeInfo={MULTI_ITEM_FEE}
        />,
      )
      // Details section
      expect(screen.getByText('Stripe (live)')).toBeInTheDocument()
      expect(screen.getByText('May 2026')).toBeInTheDocument()
      // Fee section
      expect(screen.getByText(/1\.075 XLM/)).toBeInTheDocument()
    })

    it('fee breakdown toggle is independent of detail section', () => {
      renderWithRouter(
        <AttestationConfirmModal
          open
          onClose={vi.fn()}
          onConfirm={vi.fn()}
          details={DEMO_DETAILS}
          feeInfo={MULTI_ITEM_FEE}
        />,
      )
      // Details are visible regardless of breakdown state
      expect(screen.getByText('Stripe (live)')).toBeInTheDocument()
      fireEvent.click(screen.getByRole('button', { name: /view breakdown/i }))
      expect(screen.getByText('Stripe (live)')).toBeInTheDocument()
      expect(screen.getByText(/base fee/i)).toBeInTheDocument()
    })

    it('both null details and null feeInfo render appropriate placeholders', () => {
      renderWithRouter(
        <AttestationConfirmModal
          open
          onClose={vi.fn()}
          onConfirm={vi.fn()}
          details={null}
          feeInfo={null}
        />,
      )
      expect(screen.getByText(/loading attestation details/i)).toBeInTheDocument()
      expect(screen.getByText(/calculating fee/i)).toBeInTheDocument()
    })
  })
})

// ─── Dashboard ────────────────────────────────────────────────────────────────

describe('Dashboard', () => {
  it('renders the Dashboard heading', () => {
    renderWithRouter(<Dashboard />)
    expect(screen.getByRole('heading', { name: /^dashboard$/i })).toBeInTheDocument()
  })

  it('renders the quick actions section', () => {
    renderWithRouter(<Dashboard />)
    expect(screen.getByText(/quick actions/i)).toBeInTheDocument()
  })

  it('renders "Trigger monthly revenue report" as a button', () => {
    renderWithRouter(<Dashboard />)
    expect(
      screen.getByRole('button', { name: /trigger monthly revenue report/i }),
    ).toBeInTheDocument()
  })

  it('modal is not visible initially', () => {
    renderWithRouter(<Dashboard />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('opens the confirmation modal when trigger button is clicked', () => {
    renderWithRouter(<Dashboard />)
    fireEvent.click(
      screen.getByRole('button', { name: /trigger monthly revenue report/i }),
    )
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: /confirm revenue attestation/i }),
    ).toBeInTheDocument()
  })

  it('closes modal when Cancel is clicked', () => {
    renderWithRouter(<Dashboard />)
    fireEvent.click(
      screen.getByRole('button', { name: /trigger monthly revenue report/i }),
    )
    fireEvent.click(screen.getByRole('button', { name: /^cancel$/i }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('closes modal when close button is clicked', () => {
    renderWithRouter(<Dashboard />)
    fireEvent.click(
      screen.getByRole('button', { name: /trigger monthly revenue report/i }),
    )
    fireEvent.click(screen.getByRole('button', { name: /close dialog/i }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('shows attestation details in the modal', () => {
    renderWithRouter(<Dashboard />)
    fireEvent.click(
      screen.getByRole('button', { name: /trigger monthly revenue report/i }),
    )
    expect(screen.getByText('Stripe (live)')).toBeInTheDocument()
    expect(screen.getByText('May 2026')).toBeInTheDocument()
    expect(screen.getByText(/1,247 transactions/i)).toBeInTheDocument()
  })

  it('closes modal after successful confirm', async () => {
    renderWithRouter(<Dashboard />)
    fireEvent.click(
      screen.getByRole('button', { name: /trigger monthly revenue report/i }),
    )
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /confirm & attest/i }))
    })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('can reopen modal after closing', () => {
    renderWithRouter(<Dashboard />)
    const trigger = screen.getByRole('button', { name: /trigger monthly revenue report/i })

    fireEvent.click(trigger)
    fireEvent.click(screen.getByRole('button', { name: /^cancel$/i }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    fireEvent.click(trigger)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('closes modal when backdrop is clicked', () => {
    const { container } = renderWithRouter(<Dashboard />)
    const trigger = screen.getByRole('button', { name: /trigger monthly revenue report/i })

    fireEvent.click(trigger)
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    const backdrop = container.querySelector('.modal-backdrop')
    expect(backdrop).toBeInTheDocument()
    fireEvent.click(backdrop!)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})

// ─── AttestationConfirmModal: focus-trap forward-wrap branch ──────────────────

describe('AttestationConfirmModal — focus trap forward-wrap branch (line 78)', () => {
  // AttestationConfirmModal.tsx:78 is:
  //   } else if (!e.shiftKey && document.activeElement === last) {
  //     e.preventDefault()
  //     first.focus()
  //   }
  // The existing suite asserts the resulting focus move but never observes
  // e.preventDefault(), which is the branch's actual side effect and is
  // invisible in jsdom unless asserted directly. These cases pin the branch,
  // its !shiftKey guard, and the single-focusable (loading) boundary.

  function openModal(options: { isLoading?: boolean } = {}) {
    const onClose = vi.fn()
    renderWithRouter(
      <AttestationConfirmModal
        open
        onClose={onClose}
        onConfirm={vi.fn()}
        details={DEMO_DETAILS}
        isLoading={options.isLoading}
      />,
    )
    const dialog = screen.getByRole('dialog')
    const focusable = Array.from(
      dialog.querySelectorAll<HTMLElement>('button:not([disabled])'),
    )
    return {
      dialog,
      focusable,
      first: focusable[0],
      last: focusable[focusable.length - 1],
      onClose,
    }
  }

  function pressTab(shiftKey: boolean) {
    const event = new KeyboardEvent('keydown', {
      key: 'Tab',
      shiftKey,
      bubbles: true,
      cancelable: true,
    })
    document.dispatchEvent(event)
    return event
  }

  it('wraps from the last control to the first AND prevents the default Tab', () => {
    const { first, last } = openModal()
    expect(first).toBeDefined()
    expect(last).toBeDefined()
    last!.focus()
    expect(document.activeElement).toBe(last)

    const event = pressTab(false)

    expect(event.defaultPrevented).toBe(true)
    expect(document.activeElement).toBe(first)
  })

  it('does not hijack Shift+Tab from the last control (the !shiftKey guard)', () => {
    const { last } = openModal()
    last!.focus()

    const event = pressTab(true)

    expect(event.defaultPrevented).toBe(false)
    expect(document.activeElement).toBe(last)
  })

  it('keeps focus inside when loading leaves a single focusable control (first === last)', () => {
    const { focusable } = openModal({ isLoading: true })
    expect(focusable).toHaveLength(1)
    const only = focusable[0]!
    only.focus()

    const event = pressTab(false)

    expect(event.defaultPrevented).toBe(true)
    expect(document.activeElement).toBe(only)
  })

  it('leaves the default Tab untouched from a non-boundary control', () => {
    const { focusable } = openModal()
    expect(focusable.length).toBeGreaterThanOrEqual(3)
    const middle = focusable[1]!
    middle.focus()

    const event = pressTab(false)

    expect(event.defaultPrevented).toBe(false)
    expect(document.activeElement).toBe(middle)
  })
})
