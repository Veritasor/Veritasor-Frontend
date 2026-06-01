import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import AttestationDetail from '../pages/AttestationDetail'
import Attestations from '../pages/Attestations'

afterEach(() => cleanup())

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderDetail(id: string) {
  return render(
    <MemoryRouter initialEntries={[`/attestations/${id}`]}>
      <Routes>
        <Route path="/attestations/:id" element={<AttestationDetail />} />
      </Routes>
    </MemoryRouter>,
  )
}

// ---------------------------------------------------------------------------
// Attestations list
// ---------------------------------------------------------------------------

describe('Attestations list', () => {
  it('renders heading and description', () => {
    render(
      <MemoryRouter>
        <Attestations />
      </MemoryRouter>,
    )
    expect(screen.getByRole('heading', { name: /attestations/i })).toBeInTheDocument()
    expect(screen.getByText(/merkle roots/i)).toBeInTheDocument()
  })

  it('renders list items with links to detail view', () => {
    render(
      <MemoryRouter>
        <Attestations />
      </MemoryRouter>,
    )
    const links = screen.getAllByRole('link')
    expect(links.length).toBeGreaterThanOrEqual(2)
    expect(links[0]).toHaveAttribute('href', '/attestations/att-001')
    expect(links[1]).toHaveAttribute('href', '/attestations/att-002')
  })

  it('shows status badges', () => {
    render(
      <MemoryRouter>
        <Attestations />
      </MemoryRouter>,
    )
    expect(screen.getAllByText('verified').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('pending').length).toBeGreaterThanOrEqual(1)
  })
})

// ---------------------------------------------------------------------------
// AttestationDetail — known attestation
// ---------------------------------------------------------------------------

describe('AttestationDetail — att-001 (verified)', () => {
  beforeEach(() => renderDetail('att-001'))

  it('renders the page heading', () => {
    expect(screen.getByRole('heading', { name: /attestation proof/i })).toBeInTheDocument()
  })

  it('shows verified status badge', () => {
    expect(screen.getByRole('status')).toHaveTextContent(/verified/i)
  })

  it('displays the merkle root', () => {
    expect(screen.getByLabelText(/merkle root hash/i)).toBeInTheDocument()
  })

  it('displays the stellar transaction hash', () => {
    // The <code> element has the aria-label; the copy button also matches — use getAllBy
    expect(screen.getAllByLabelText(/stellar transaction hash/i).length).toBeGreaterThanOrEqual(1)
  })

  it('renders a link to Stellar Explorer', () => {
    const link = screen.getByRole('link', { name: /stellar expert/i })
    expect(link).toHaveAttribute('href', expect.stringContaining('stellar.expert'))
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('renders a timestamp <time> element', () => {
    const time = document.querySelector('time')
    expect(time).not.toBeNull()
    expect(time).toHaveAttribute('dateTime', '2026-05-28T14:32:00Z')
  })

  it('shows record count', () => {
    expect(screen.getAllByText('142').length).toBeGreaterThanOrEqual(1)
  })

  it('shows total revenue', () => {
    expect(screen.getAllByText('84,320.00').length).toBeGreaterThanOrEqual(1)
  })

  it('renders a back link to /attestations', () => {
    expect(screen.getByRole('link', { name: /back to attestations/i })).toHaveAttribute(
      'href',
      '/attestations',
    )
  })

  it('renders copy buttons for merkle root, stellar tx, and attestation id', () => {
    const copyButtons = screen.getAllByRole('button', { name: /copy/i })
    expect(copyButtons.length).toBeGreaterThanOrEqual(3)
  })
})

// ---------------------------------------------------------------------------
// AttestationDetail — pending status
// ---------------------------------------------------------------------------

describe('AttestationDetail — att-002 (pending)', () => {
  it('shows pending status badge', () => {
    renderDetail('att-002')
    expect(screen.getByRole('status')).toHaveTextContent(/pending/i)
  })
})

// ---------------------------------------------------------------------------
// AttestationDetail — not found
// ---------------------------------------------------------------------------

describe('AttestationDetail — not found', () => {
  it('shows a not-found alert', () => {
    renderDetail('att-999')
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText(/att-999/i)).toBeInTheDocument()
  })

  it('still renders the back link', () => {
    renderDetail('att-999')
    expect(screen.getByRole('link', { name: /back to attestations/i })).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// CopyButton interaction
// ---------------------------------------------------------------------------

describe('CopyButton', () => {
  beforeEach(() => {
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    })
  })

  it('copies value and shows confirmation feedback', async () => {
    renderDetail('att-001')
    const [firstCopy] = screen.getAllByRole('button', { name: /copy merkle root/i })
    fireEvent.click(firstCopy)
    await waitFor(() => expect(screen.getAllByRole('button', { name: /copied/i }).length).toBeGreaterThan(0))
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      '0x3a7bd3e2360a3d29eea436fcfb7e44c735d117c9f4e4b5e6a1c2d3e4f5a6b7c8',
    )
  })
})
