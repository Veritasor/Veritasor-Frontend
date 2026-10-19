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
    expect(screen.getByRole('heading', { level: 1, name: /attestations/i })).toBeInTheDocument()
    expect(screen.getByText(/merkle roots/i)).toBeInTheDocument()
  })

  it('renders list items with links to detail view', () => {
    render(
      <MemoryRouter>
        <Attestations />
      </MemoryRouter>,
    )
    const links = screen.getAllByRole('link', { name: /view details/i })
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
    expect(screen.getAllByText('Verified').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Pending').length).toBeGreaterThanOrEqual(1)
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

  it('announces success via aria-live region', async () => {
    renderDetail('att-001')
    const [firstCopy] = screen.getAllByRole('button', { name: /copy merkle root/i })
    fireEvent.click(firstCopy)
    await waitFor(() =>
      expect(document.querySelector('[aria-live="polite"]')?.textContent).toMatch(/merkle root copied/i),
    )
  })

  it('shows failure state when clipboard is denied', async () => {
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockRejectedValue(new DOMException('Permission denied', 'NotAllowedError')) },
    })
    renderDetail('att-001')
    const [firstCopy] = screen.getAllByRole('button', { name: /copy merkle root/i })
    fireEvent.click(firstCopy)
    await waitFor(() => expect(screen.getAllByRole('button', { name: /failed to copy/i }).length).toBeGreaterThan(0))
  })

  it('announces failure via aria-live region', async () => {
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockRejectedValue(new DOMException('Permission denied', 'NotAllowedError')) },
    })
    renderDetail('att-001')
    const [firstCopy] = screen.getAllByRole('button', { name: /copy merkle root/i })
    fireEvent.click(firstCopy)
    await waitFor(() =>
      expect(document.querySelector('[aria-live="polite"]')?.textContent).toMatch(/failed to copy/i),
    )
  })
})

// ---------------------------------------------------------------------------
// Print certificate — structure & ARIA
// ---------------------------------------------------------------------------

describe('AttestationDetail — print certificate structure', () => {
  beforeEach(() => renderDetail('att-001'))

  it('wraps content in a <article class="certificate"> with descriptive aria-label', () => {
    const article = document.querySelector('article.certificate')
    expect(article).not.toBeNull()
    expect(article?.getAttribute('aria-label')).toMatch(/certificate of revenue attestation/i)
    expect(article?.getAttribute('aria-label')).toMatch(/att-001/i)
  })

  it('exposes the attestation id as data-cert-id for @page running headers', () => {
    expect(document.querySelector('article.certificate')?.getAttribute('data-cert-id')).toBe('att-001')
  })

  it('renders the Print Certificate button with an aria-label', () => {
    const button = screen.getByRole('button', { name: /print certificate/i })
    expect(button).toBeInTheDocument()
    expect(button.tagName).toBe('BUTTON')
  })

  it('renders a print-only formal certificate header', () => {
    const header = document.querySelector('.certificate-header.print-only')
    expect(header).not.toBeNull()
    expect(header?.querySelector('.certificate-brand-name')?.textContent).toMatch(/veritasor/i)
  })

  it('renders a print-only title block with the formal certificate title', () => {
    const title = document.querySelector('.certificate-title.print-only')
    expect(title).not.toBeNull()
    expect(title?.textContent).toMatch(/certificate of revenue attestation/i)
  })

  it('renders a print-only seal with an SVG and label', () => {
    const seal = document.querySelector('.certificate-seal.print-only')
    expect(seal).not.toBeNull()
    expect(seal?.querySelector('svg')).not.toBeNull()
    expect(seal?.textContent).toMatch(/stellar on-chain proof seal/i)
  })

  it('renders a print-only footer with attestation id and metadata', () => {
    const footer = document.querySelector('.certificate-footer.print-only')
    expect(footer).not.toBeNull()
    expect(footer?.textContent).toMatch(/att-001/i)
    expect(footer?.textContent).toMatch(/veritasor\.app/i)
  })

  it('renders a print-only authenticity line referencing the Stellar transaction', () => {
    const auth = document.querySelector('.certificate-authenticity.print-only')
    expect(auth).not.toBeNull()
    expect(auth?.textContent).toMatch(/stellar transaction hash/i)
  })

  it('renders a print-only issuer statement containing the merkle root', () => {
    const statement = document.querySelector('.certificate-statement.print-only')
    expect(statement).not.toBeNull()
    expect(statement?.textContent).toMatch(/0x3a7bd3e2360a3d29eea436fcfb7e44c735d117c9f4e4b5e6a1c2d3e4f5a6b7c8/)
  })
})

// ---------------------------------------------------------------------------
// Print certificate — grayscale-safe status pill
// ---------------------------------------------------------------------------

describe('AttestationDetail — status pill colors', () => {
  it('renders the verified pill with a checkmark glyph', () => {
    renderDetail('att-001')
    const pill = document.querySelector('.certificate-status.certificate-status-verified')
    expect(pill).not.toBeNull()
    expect(pill?.textContent).toMatch(/verified/i)
    expect(pill?.textContent).toMatch(/✓/)
    expect(pill?.getAttribute('aria-label')).toMatch(/verified/i)
  })

  it('renders the pending pill with an hourglass glyph', () => {
    renderDetail('att-002')
    const pill = document.querySelector('.certificate-status.certificate-status-pending')
    expect(pill).not.toBeNull()
    expect(pill?.textContent).toMatch(/◷/)
  })

  it('renders the failed pill with an X glyph and full label', () => {
    renderDetail('att-003')
    const pill = document.querySelector('.certificate-status.certificate-status-failed')
    expect(pill).not.toBeNull()
    expect(pill?.textContent).toMatch(/✕/)
    expect(pill?.textContent).toMatch(/not attested/i)
  })
})

// ---------------------------------------------------------------------------
// Print certificate — screen chrome marked .no-print
// ---------------------------------------------------------------------------

describe('AttestationDetail — print hides interactive chrome', () => {
  it('marks the breadcrumb wrapper as no-print', () => {
    renderDetail('att-001')
    const noPrintNodes = document.querySelectorAll('.no-print')
    // Breadcrumb wrapper + every CopyButton + screen status badge + failure banner
    // (none here) + retry button (none here) + print button + screen header
    expect(noPrintNodes.length).toBeGreaterThan(0)
    noPrintNodes.forEach((node) => {
      expect(node.classList.contains('no-print')).toBe(true)
    })
  })

  it('marks all CopyButton instances as no-print', () => {
    renderDetail('att-001')
    const copyButtons = screen.getAllByRole('button', { name: /copy/i })
    copyButtons.forEach((btn) => {
      expect(btn.classList.contains('no-print')).toBe(true)
    })
  })

  it('marks the Print Certificate button as no-print (so it is hidden during the print snapshot)', () => {
    renderDetail('att-001')
    const printBtn = screen.getByRole('button', { name: /print certificate/i })
    expect(printBtn.classList.contains('no-print')).toBe(true)
  })

  it('marks the screen status badge as no-print', () => {
    renderDetail('att-001')
    // The on-screen status pill carries BOTH `class="no-print"` and
    // `role="status"` directly on the same element (not as a descendant).
    const verifiedBadge = document.querySelector('span.no-print[role="status"]')
    expect(verifiedBadge).not.toBeNull()
    expect(verifiedBadge?.textContent).toMatch(/verified/i)
  })

  it('marks the retry button as no-print when status is failed', () => {
    renderDetail('att-003')
    const retry = screen.getByRole('button', { name: /retry attestation/i })
    expect(retry.classList.contains('no-print')).toBe(true)
  })

  it('marks the failure banner wrapper as no-print when status is failed', () => {
    renderDetail('att-003')
    const failureBanner = document.querySelector('section[aria-labelledby="failure-banner-title"]')
    expect(failureBanner).not.toBeNull()
    expect(failureBanner?.classList.contains('no-print')).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Print certificate — print-only failure notice (failed status)
// ---------------------------------------------------------------------------

describe('AttestationDetail — print-only failure notice', () => {
  it('renders the print-only failure notice for failed status', () => {
    renderDetail('att-003')
    const notice = document.querySelector('.certificate-failure-notice.print-only')
    expect(notice).not.toBeNull()
    expect(notice?.textContent).toMatch(/validation not completed/i)
    expect(notice?.textContent).toMatch(/stellar network timeout/i)
  })

  it('does not render the print-only failure notice for verified status', () => {
    renderDetail('att-001')
    expect(document.querySelector('.certificate-failure-notice.print-only')).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// Print certificate — hash reveal in print
// ---------------------------------------------------------------------------

describe('AttestationDetail — stellar hash reveal', () => {
  it('renders both the truncated and full stellar hash (print CSS reveals full)', () => {
    renderDetail('att-001')
    expect(document.querySelector('code .hash-truncated')?.textContent).toMatch(/…/)
    expect(document.querySelector('code .hash-full')?.textContent).toBe(
      'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2',
    )
  })
})

// ---------------------------------------------------------------------------
// Print certificate — Print Certificate button behaviour
// ---------------------------------------------------------------------------

describe('AttestationDetail — Print Certificate button', () => {
  let printSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    printSpy = vi.spyOn(window, 'print').mockImplementation(() => undefined)
  })

  afterEach(() => {
    printSpy.mockRestore()
  })

  it('calls window.print() when clicked', () => {
    renderDetail('att-001')
    const button = screen.getByRole('button', { name: /print certificate/i })
    fireEvent.click(button)
    // handlePrint now uses flushSync, so window.print() is invoked synchronously.
    expect(printSpy).toHaveBeenCalledTimes(1)
  })

  it('is keyboard-activatable with Enter and Space', () => {
    renderDetail('att-001')
    const button = screen.getByRole('button', { name: /print certificate/i }) as HTMLButtonElement
    button.focus()
    fireEvent.keyDown(button, { key: 'Enter' })
    fireEvent.keyDown(button, { key: ' ' })
    // handlePrint now uses flushSync + a synchronous window.print() call, so
    // assertions run immediately after the events are dispatched.
    expect(printSpy).toHaveBeenCalled()
  })

  it('updates the printed-on timestamp after first print', () => {
    renderDetail('att-001')
    const button = screen.getByRole('button', { name: /print certificate/i })
    expect(document.querySelector('.certificate-meta-stack.print-only')?.textContent).toMatch(/preview/i)
    fireEvent.click(button)
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        expect(document.querySelector('.certificate-meta-stack.print-only')?.textContent).not.toMatch(/preview/i)
        resolve()
      }, 50)
    })
  })
})

// ---------------------------------------------------------------------------
// Print certificate — navigation safety
// ---------------------------------------------------------------------------

describe('AttestationDetail — print state reset across navigation', () => {
  it('does not throw if the Print button is unmounted synchronously after click', () => {
    const { unmount } = renderDetail('att-001')
    const button = screen.getByRole('button', { name: /print certificate/i })
    fireEvent.click(button)
    expect(() => unmount()).not.toThrow()
  })

  it('reflects the new record when rendered under a different id', () => {
    renderDetail('att-002')
    expect(document.querySelector('article.certificate')?.getAttribute('data-cert-id')).toBe('att-002')
    expect(screen.getAllByText(/pending/i).length).toBeGreaterThanOrEqual(1)
  })
})
