import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import TermsOfServiceChangelogModal from './TermsOfServiceChangelogModal'

const baseProps = {
  currentVersion: 'v2.4.0',
  previousVersion: 'v2.3.0',
  effectiveDate: '2026-07-29',
  summary: 'We updated the terms to make policy changes easier to review.',
  changes: [
    {
      kind: 'Added' as const,
      title: 'Versioned changelog',
      detail: 'The modal now highlights policy diffs.',
    },
    {
      kind: 'Updated' as const,
      title: 'Retention language',
      detail: 'Retention timing is now stated directly.',
    },
    {
      kind: 'Removed' as const,
      title: 'Ambiguous wording',
      detail: 'Broad sharing language has been replaced with named disclosures.',
    },
  ],
  fullTextHref: '/legal/terms-of-service-v2-4-0.txt',
  pdfHref: '/legal/terms-of-service-v2-4-0.pdf',
}

describe('TermsOfServiceChangelogModal', () => {
  it('does not render when closed', () => {
    render(
      <TermsOfServiceChangelogModal
        open={false}
        onAcknowledge={vi.fn()}
        onClose={vi.fn()}
        {...baseProps}
      />,
    )

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('shows versioned diff content and requires acknowledgement', () => {
    const onAcknowledge = vi.fn()
    render(
      <TermsOfServiceChangelogModal
        open
        onAcknowledge={onAcknowledge}
        onClose={vi.fn()}
        {...baseProps}
      />,
    )

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText(/review the latest terms change log/i)).toBeInTheDocument()
    expect(screen.getByText('v2.4.0')).toBeInTheDocument()
    expect(screen.getByText('v2.3.0')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /download full text/i })).toHaveAttribute(
      'href',
      baseProps.fullTextHref,
    )
    expect(screen.getByRole('link', { name: /download pdf/i })).toHaveAttribute(
      'href',
      baseProps.pdfHref,
    )
    expect(screen.getByRole('button', { name: /acknowledge and continue/i })).toBeDisabled()

    fireEvent.click(screen.getByLabelText(/i have reviewed version v2\.4\.0/i))
    fireEvent.click(screen.getByRole('button', { name: /acknowledge and continue/i }))

    expect(onAcknowledge).toHaveBeenCalledWith('v2.4.0')
  })

  it('closes on Escape', () => {
    const onClose = vi.fn()
    render(
      <TermsOfServiceChangelogModal
        open
        onAcknowledge={vi.fn()}
        onClose={onClose}
        {...baseProps}
      />,
    )

    fireEvent.keyDown(window, { key: 'Escape' })

    expect(onClose).toHaveBeenCalled()
  })
})
